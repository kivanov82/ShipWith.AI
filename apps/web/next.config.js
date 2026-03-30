/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@shipwithai/core', '@shipwithai/x402'],
  output: 'standalone',
  webpack: (config, { isServer }) => {
    // Stub out React Native modules pulled in by MetaMask SDK
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'react-native': false,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };
    // Suppress optional pino-pretty resolution warning
    config.externals = [...(config.externals || []), 'pino-pretty'];

    // Prevent WalletConnect / idb-keyval from being bundled into SSR
    // (indexedDB is browser-only)
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'idb-keyval': false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
