'use client';

import { Wallet, MessageSquare } from 'lucide-react';

interface PaywallOverlayProps {
  tier: 'anonymous' | 'connected' | 'funded';
  remaining: number;
  limit: number;
}

export function PaywallOverlay({ tier, remaining, limit }: PaywallOverlayProps) {
  if (remaining > 0) return null;

  return (
    <div className="absolute inset-0 bg-zinc-900/95 flex flex-col items-center justify-center rounded-b-xl z-10 p-6">
      <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center mb-3">
        {tier === 'anonymous' ? (
          <Wallet className="w-5 h-5 text-yellow-500" />
        ) : (
          <MessageSquare className="w-5 h-5 text-yellow-500" />
        )}
      </div>

      <p className="text-sm font-medium text-white mb-1 text-center">
        {tier === 'anonymous' ? 'Free messages used up' : 'Chat limit reached'}
      </p>

      <p className="text-xs text-zinc-400 mb-4 text-center max-w-[200px]">
        {tier === 'anonymous'
          ? `You've used all ${limit} free messages. Connect a wallet to get more.`
          : `You've used all ${limit} messages. Fund your wallet with USDC for unlimited access.`
        }
      </p>

      {tier === 'anonymous' ? (
        <p className="text-[10px] text-zinc-500">
          Connect wallet for {25} more free messages
        </p>
      ) : (
        <p className="text-[10px] text-zinc-500">
          Any USDC balance unlocks unlimited chat
        </p>
      )}
    </div>
  );
}
