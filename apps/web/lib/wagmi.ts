import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

const chains = process.env.NEXT_PUBLIC_CHAIN === 'base'
  ? [base] as const
  : [baseSepolia, base] as const;

// Lazy initialization to avoid errors during SSR/build when projectId is missing
let _config: ReturnType<typeof getDefaultConfig> | null = null;

export function getWagmiConfig() {
  if (!_config) {
    _config = getDefaultConfig({
      appName: 'ShipWith.AI',
      projectId,
      chains,
      ssr: true,
    });
  }
  return _config;
}

export const wagmiConfig = projectId ? getWagmiConfig() : null;
