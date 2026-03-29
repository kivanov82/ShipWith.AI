'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const hasWalletProvider = !!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Dynamically import wallet components only when provider is configured
const ConnectButtonWrapper = dynamic(
  () => import('./WalletButtonInner').then(mod => ({ default: mod.FullButton })),
  { ssr: false, loading: () => <WalletPlaceholder /> },
);

const CompactButtonWrapper = dynamic(
  () => import('./WalletButtonInner').then(mod => ({ default: mod.CompactButton })),
  { ssr: false, loading: () => <WalletPlaceholder compact /> },
);

const MobileButtonWrapper = dynamic(
  () => import('./WalletButtonInner').then(mod => ({ default: mod.MobileButton })),
  { ssr: false, loading: () => null },
);

function WalletPlaceholder({ compact = false }: { compact?: boolean }) {
  return (
    <button
      className={`flex items-center gap-2 ${compact ? 'w-full' : ''} px-3 py-2 rounded-lg text-xs font-medium transition-colors border bg-zinc-800/50 border-zinc-700 text-zinc-500`}
      disabled
    >
      <div className="w-2 h-2 rounded-full bg-zinc-600" />
      <span>Connect Wallet</span>
    </button>
  );
}

export function WalletButton({ compact = false }: { compact?: boolean }) {
  if (!hasWalletProvider) return <WalletPlaceholder compact={compact} />;
  return compact ? <CompactButtonWrapper /> : <ConnectButtonWrapper />;
}

export function MobileWalletButton() {
  if (!hasWalletProvider) return null;
  return <MobileButtonWrapper />;
}
