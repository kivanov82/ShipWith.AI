'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export function FullButton() {
  return <ConnectButton />;
}

export function CompactButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
        const ready = mounted && account && chain;
        return (
          <button
            onClick={ready ? openAccountModal : openConnectModal}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
              ready
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:text-zinc-300 hover:border-zinc-600'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${ready ? 'bg-green-500' : 'bg-zinc-600'}`} />
            {ready ? (
              <span className="truncate">{account.displayName}</span>
            ) : (
              <span>Connect Wallet</span>
            )}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

export function MobileButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
        const ready = mounted && account && chain;
        return (
          <button
            onClick={ready ? openAccountModal : openConnectModal}
            className={`px-2 py-1.5 rounded-lg text-[10px] font-medium border ${
              ready
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            {ready ? account.displayName : 'Connect'}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
