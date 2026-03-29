'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

const hasWalletProvider = !!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Only import wallet providers when configured
function WalletProviders({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  // Dynamic import at module level won't work — use require for conditional loading
  const { WagmiProvider } = require('wagmi');
  const { RainbowKitProvider, darkTheme } = require('@rainbow-me/rainbowkit');
  const { getWagmiConfig } = require('@/lib/wagmi');
  require('@rainbow-me/rainbowkit/styles.css');

  const config = getWagmiConfig();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#22c55e',
          accentColorForeground: 'white',
          borderRadius: 'medium',
          overlayBlur: 'small',
        })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  if (!hasWalletProvider) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <WalletProviders queryClient={queryClient}>
      {children}
    </WalletProviders>
  );
}
