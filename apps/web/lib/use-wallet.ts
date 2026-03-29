'use client';

import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, type Address } from 'viem';
import { useState } from 'react';

// USDC contract addresses on Base
export const USDC_ADDRESS: Record<number, Address> = {
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',   // Base mainnet
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',  // Base Sepolia
};

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

export function useWallet() {
  const { address, isConnected, chain } = useAccount();
  const { data: ethBalance } = useBalance({ address });

  const usdcAddress = chain?.id ? USDC_ADDRESS[chain.id] : undefined;

  const { data: usdcRaw } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!usdcAddress },
  });

  const usdcBalance = usdcRaw !== undefined
    ? Number(usdcRaw) / 1e6
    : undefined;

  return {
    address,
    isConnected,
    chain,
    ethBalance: ethBalance?.formatted,
    usdcBalance,
    usdcAddress,
  };
}

export function useUsdcTransfer() {
  const { chain } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

  const transfer = async (to: Address, amount: string): Promise<`0x${string}`> => {
    const usdcAddress = chain?.id ? USDC_ADDRESS[chain.id] : undefined;
    if (!usdcAddress) throw new Error('USDC not available on this chain');

    const amountInUnits = parseUnits(amount, 6); // USDC has 6 decimals

    const hash = await writeContractAsync({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to, amountInUnits],
    });

    setPendingTxHash(hash);
    return hash;
  };

  const getExplorerUrl = (txHash: string) => {
    const baseUrl = chain?.id === 8453
      ? 'https://basescan.org'
      : 'https://sepolia.basescan.org';
    return `${baseUrl}/tx/${txHash}`;
  };

  return {
    transfer,
    pendingTxHash,
    isConfirming,
    isConfirmed,
    getExplorerUrl,
  };
}
