import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

const chains = process.env.NEXT_PUBLIC_CHAIN === 'base'
  ? [base] as const
  : [baseSepolia, base] as const;

// Module-scoped singleton — survives HMR and re-imports
const globalKey = '__shipwithai_wagmi_config__' as const;
const g = globalThis as unknown as Record<string, ReturnType<typeof getDefaultConfig>>;

export function getWagmiConfig() {
  if (!g[globalKey]) {
    g[globalKey] = getDefaultConfig({
      appName: 'ShipWith.AI',
      projectId,
      chains,
      ssr: true,
    });
  }
  return g[globalKey];
}

export const wagmiConfig = projectId ? getWagmiConfig() : null;
