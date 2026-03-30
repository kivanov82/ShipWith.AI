'use client';

import { CompactButton, MobileButton } from './WalletButtonInner';

export function WalletButton({ compact = false }: { compact?: boolean }) {
  return compact ? <CompactButton /> : <CompactButton />;
}

export function MobileWalletButton() {
  return <MobileButton />;
}
