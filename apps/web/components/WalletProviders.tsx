'use client';

import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { type ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';

import { getWagmiConfig } from '@/lib/wagmi';

const config = getWagmiConfig();

export function WalletProviders({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider theme={darkTheme({
        accentColor: '#22c55e',
        accentColorForeground: 'white',
        borderRadius: 'medium',
        overlayBlur: 'small',
      })}>
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
