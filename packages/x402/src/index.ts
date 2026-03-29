// x402 Payment Integration for ShipWith.AI
// Uses Base testnet for development

import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  formatUnits,
  parseUnits,
  type Address,
  type Hash,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import type { AgentId, Payment } from '@shipwithai/core';
import { nanoid } from 'nanoid';

// Configuration
const NETWORK = process.env.SHIPWITHAI_NETWORK === 'mainnet' ? base : baseSepolia;
const RPC_URL = process.env.SHIPWITHAI_RPC_URL || 'https://sepolia.base.org';

// USDC addresses
const USDC_ADDRESS: Record<number, Address> = {
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base mainnet
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
};

// ERC-20 ABI for USDC
const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

export interface AgentWallet {
  address: Address;
  privateKey: `0x${string}`;
}

export class X402Client {
  private publicClient;
  private wallets: Map<AgentId, AgentWallet> = new Map();
  private chain;

  constructor() {
    this.chain = NETWORK;
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(RPC_URL),
    });
  }

  // Load wallet from environment variable
  loadAgentWallet(agentId: AgentId): AgentWallet | null {
    const envKey = `AGENT_WALLET_${agentId.toUpperCase().replace(/-/g, '_')}`;
    const privateKey = process.env[envKey] as `0x${string}` | undefined;

    if (!privateKey) {
      console.warn(`No wallet found for agent ${agentId} (env: ${envKey})`);
      return null;
    }

    const account = privateKeyToAccount(privateKey);
    const wallet: AgentWallet = {
      address: account.address,
      privateKey,
    };

    this.wallets.set(agentId, wallet);
    return wallet;
  }

  // Get USDC balance for an agent
  async getBalance(agentId: AgentId): Promise<string> {
    const wallet = this.wallets.get(agentId);
    if (!wallet) {
      throw new Error(`Wallet not loaded for agent ${agentId}`);
    }

    const usdcAddress = USDC_ADDRESS[this.chain.id];
    const balance = await this.publicClient.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [wallet.address],
    });

    return formatUnits(balance, 6); // USDC has 6 decimals
  }

  // Send payment from one agent to another
  async sendPayment(
    fromAgentId: AgentId | 'user',
    toAgentId: AgentId,
    amount: string,
    taskId: string
  ): Promise<Payment> {
    const fromWallet = fromAgentId === 'user'
      ? this.getUserWallet()
      : this.wallets.get(fromAgentId);

    const toWallet = this.wallets.get(toAgentId);

    if (!fromWallet) {
      throw new Error(`Wallet not loaded for ${fromAgentId}`);
    }
    if (!toWallet) {
      throw new Error(`Wallet not loaded for ${toAgentId}`);
    }

    const account = privateKeyToAccount(fromWallet.privateKey);
    const walletClient = createWalletClient({
      account,
      chain: this.chain,
      transport: http(RPC_URL),
    });

    const usdcAddress = USDC_ADDRESS[this.chain.id];
    const amountInUnits = parseUnits(amount, 6);

    let txHash: Hash | undefined;

    try {
      txHash = await walletClient.writeContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [toWallet.address, amountInUnits],
      });

      // Wait for confirmation
      await this.publicClient.waitForTransactionReceipt({ hash: txHash });

      return {
        id: nanoid(),
        from: fromAgentId,
        to: toAgentId,
        amount,
        currency: 'USDC',
        status: 'completed',
        txHash,
        taskId,
        createdAt: Date.now(),
      };
    } catch (error) {
      return {
        id: nanoid(),
        from: fromAgentId,
        to: toAgentId,
        amount,
        currency: 'USDC',
        status: 'failed',
        txHash,
        taskId,
        createdAt: Date.now(),
      };
    }
  }

  private getUserWallet(): AgentWallet | null {
    const privateKey = process.env.USER_WALLET_PRIVATE_KEY as `0x${string}` | undefined;
    if (!privateKey) return null;

    const account = privateKeyToAccount(privateKey);
    return {
      address: account.address,
      privateKey,
    };
  }

  // Get chain explorer URL for transaction
  getExplorerUrl(txHash: string): string {
    const baseUrl = this.chain.id === 8453
      ? 'https://basescan.org'
      : 'https://sepolia.basescan.org';
    return `${baseUrl}/tx/${txHash}`;
  }

  // Get all loaded wallets info (without private keys)
  getLoadedWallets(): Array<{ agentId: AgentId; address: Address }> {
    return Array.from(this.wallets.entries()).map(([agentId, wallet]) => ({
      agentId,
      address: wallet.address,
    }));
  }
}

// Mock client for development/testing
export class MockX402Client {
  private balances: Map<string, number> = new Map();
  private payments: Payment[] = [];

  constructor() {
    // Initialize with mock balances
    const agents: AgentId[] = [
      'pm', 'ux-analyst', 'ui-designer', 'ui-developer',
      'backend-developer', 'solidity-developer', 'solidity-auditor',
      'infrastructure', 'qa-tester', 'unit-tester', 'tech-writer', 'marketing'
    ];

    agents.forEach((agent) => {
      this.balances.set(agent, 100); // 100 USDC each
    });
    this.balances.set('user', 1000); // User has 1000 USDC
  }

  async getBalance(agentId: AgentId | 'user'): Promise<string> {
    return (this.balances.get(agentId) || 0).toFixed(2);
  }

  async sendPayment(
    fromAgentId: AgentId | 'user',
    toAgentId: AgentId,
    amount: string,
    taskId: string
  ): Promise<Payment> {
    const fromBalance = this.balances.get(fromAgentId) || 0;
    const toBalance = this.balances.get(toAgentId) || 0;
    const amountNum = parseFloat(amount);

    if (fromBalance < amountNum) {
      return {
        id: nanoid(),
        from: fromAgentId,
        to: toAgentId,
        amount,
        currency: 'USDC',
        status: 'failed',
        taskId,
        createdAt: Date.now(),
      };
    }

    this.balances.set(fromAgentId, fromBalance - amountNum);
    this.balances.set(toAgentId, toBalance + amountNum);

    const payment: Payment = {
      id: nanoid(),
      from: fromAgentId,
      to: toAgentId,
      amount,
      currency: 'USDC',
      status: 'completed',
      txHash: `0xmock_${nanoid()}`,
      taskId,
      createdAt: Date.now(),
    };

    this.payments.push(payment);
    return payment;
  }

  getPayments(): Payment[] {
    return this.payments;
  }

  getExplorerUrl(txHash: string): string {
    return `https://sepolia.basescan.org/tx/${txHash}`;
  }
}

// Factory function
export function createPaymentClient(useMock: boolean = process.env.NODE_ENV === 'development') {
  return useMock ? new MockX402Client() : new X402Client();
}
