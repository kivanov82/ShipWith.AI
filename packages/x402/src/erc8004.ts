// ERC-8004 Agent Identity Registration
// https://eips.ethereum.org/EIPS/eip-8004

import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Address,
  type Hash,
} from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import type { AgentId, AgentConfig } from '@agentverse/core';

// ERC-8004 Contract on Ethereum Mainnet
const ERC8004_ADDRESS: Address = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';

const ERC8004_ABI = parseAbi([
  'function register(string agentURI) returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
]);

// Metadata format for ERC-8004 registration
export interface ERC8004Metadata {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';
  name: string;
  description: string;
  image: string;
  active: boolean;
  x402Support: boolean;
  services?: ERC8004Service[];
}

export interface ERC8004Service {
  type: 'web' | 'ENS' | 'A2A' | 'MCP' | 'email' | 'DID';
  value: string;
}

export class ERC8004Registry {
  private publicClient;
  private rpcUrl: string;

  constructor(rpcUrl?: string) {
    this.rpcUrl = rpcUrl || process.env.ETH_RPC_URL || 'https://eth.drpc.org';
    this.publicClient = createPublicClient({
      chain: mainnet,
      transport: http(this.rpcUrl),
    });
  }

  // Generate metadata for an Agentverse agent
  generateMetadata(config: AgentConfig, baseUrl?: string): ERC8004Metadata {
    const services: ERC8004Service[] = [];

    // Add API endpoint as A2A service
    if (baseUrl) {
      services.push({
        type: 'A2A',
        value: `${baseUrl}/api/agents/${config.id}/agent-card.json`,
      });
      services.push({
        type: 'web',
        value: `${baseUrl}/agents/${config.id}`,
      });
    }

    return {
      type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
      name: config.name,
      description: config.description,
      image: '', // Could add agent avatar
      active: true,
      x402Support: true,
      services,
    };
  }

  // Encode metadata as base64 data URI
  encodeMetadataURI(metadata: ERC8004Metadata): string {
    const json = JSON.stringify(metadata);
    const base64 = Buffer.from(json).toString('base64');
    return `data:application/json;base64,${base64}`;
  }

  // Register an agent with ERC-8004
  async registerAgent(
    config: AgentConfig,
    privateKey: `0x${string}`,
    baseUrl?: string
  ): Promise<{ tokenId: bigint; txHash: Hash }> {
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain: mainnet,
      transport: http(this.rpcUrl),
    });

    const metadata = this.generateMetadata(config, baseUrl);
    const agentURI = this.encodeMetadataURI(metadata);

    console.log(`Registering ${config.name}...`);
    console.log(`Metadata URI: ${agentURI.substring(0, 100)}...`);

    const txHash = await walletClient.writeContract({
      address: ERC8004_ADDRESS,
      abi: ERC8004_ABI,
      functionName: 'register',
      args: [agentURI],
    });

    console.log(`Transaction submitted: ${txHash}`);

    // Wait for transaction and get token ID from logs
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    // Token ID is typically in the Transfer event logs
    // For simplicity, we'll query the balance to get the latest token
    const balance = await this.publicClient.readContract({
      address: ERC8004_ADDRESS,
      abi: ERC8004_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });

    // This is a simplification - in production, parse the Transfer event
    const tokenId = balance;

    console.log(`Registered with Token ID: ${tokenId}`);
    console.log(`View on Etherscan: https://etherscan.io/tx/${txHash}`);

    return { tokenId, txHash };
  }

  // Check if an address has registered agents
  async getAgentCount(address: Address): Promise<bigint> {
    return await this.publicClient.readContract({
      address: ERC8004_ADDRESS,
      abi: ERC8004_ABI,
      functionName: 'balanceOf',
      args: [address],
    });
  }

  // Get token URI for a registered agent
  async getAgentURI(tokenId: bigint): Promise<string> {
    return await this.publicClient.readContract({
      address: ERC8004_ADDRESS,
      abi: ERC8004_ABI,
      functionName: 'tokenURI',
      args: [tokenId],
    });
  }

  // Decode metadata from token URI
  decodeMetadataURI(uri: string): ERC8004Metadata | null {
    try {
      if (uri.startsWith('data:application/json;base64,')) {
        const base64 = uri.replace('data:application/json;base64,', '');
        const json = Buffer.from(base64, 'base64').toString('utf-8');
        return JSON.parse(json);
      }
      return null;
    } catch {
      return null;
    }
  }
}

// Batch registration helper
export async function registerAllAgents(
  configs: AgentConfig[],
  privateKey: `0x${string}`,
  baseUrl: string
): Promise<Map<AgentId, { tokenId: bigint; txHash: Hash }>> {
  const registry = new ERC8004Registry();
  const results = new Map<AgentId, { tokenId: bigint; txHash: Hash }>();

  for (const config of configs) {
    try {
      const result = await registry.registerAgent(config, privateKey, baseUrl);
      results.set(config.id, result);
      console.log(`✓ ${config.name} registered`);
    } catch (error) {
      console.error(`✗ Failed to register ${config.name}:`, error);
    }
  }

  return results;
}

// Export singleton
let registryInstance: ERC8004Registry | null = null;

export function getERC8004Registry(): ERC8004Registry {
  if (!registryInstance) {
    registryInstance = new ERC8004Registry();
  }
  return registryInstance;
}
