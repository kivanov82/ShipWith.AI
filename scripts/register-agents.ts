#!/usr/bin/env tsx
/**
 * Register all Agentverse agents with ERC-8004
 * Usage: pnpm register-agents [--dry-run] [--agent <id>]
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AgentConfig } from '@agentverse/core';

// ERC-8004 Metadata format
interface ERC8004Metadata {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';
  name: string;
  description: string;
  image: string;
  active: boolean;
  x402Support: boolean;
  services?: Array<{
    type: 'web' | 'ENS' | 'A2A' | 'MCP' | 'email' | 'DID';
    value: string;
  }>;
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const specificAgent = args.includes('--agent')
  ? args[args.indexOf('--agent') + 1]
  : null;

const BASE_URL = process.env.AGENTVERSE_BASE_URL || 'https://agentverse.example.com';
const PRIVATE_KEY = process.env.REGISTRATION_PRIVATE_KEY as `0x${string}` | undefined;

async function main() {
  console.log('🔐 Agentverse ERC-8004 Registration\n');

  if (!PRIVATE_KEY && !dryRun) {
    console.error('Error: REGISTRATION_PRIVATE_KEY environment variable required');
    console.log('Set it in your .env file or run with --dry-run to preview');
    process.exit(1);
  }

  // Load all agent configs
  const agentsDir = path.join(process.cwd(), 'agents');
  const agentIds = fs.readdirSync(agentsDir).filter((name) => {
    if (name.startsWith('_')) return false; // Skip templates
    const configPath = path.join(agentsDir, name, 'config.json');
    return fs.existsSync(configPath);
  });

  if (specificAgent && !agentIds.includes(specificAgent)) {
    console.error(`Error: Agent "${specificAgent}" not found`);
    process.exit(1);
  }

  const agentsToRegister = specificAgent ? [specificAgent] : agentIds;

  console.log(`Found ${agentsToRegister.length} agents to register:\n`);

  for (const agentId of agentsToRegister) {
    const configPath = path.join(agentsDir, agentId, 'config.json');
    const config: AgentConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Generate ERC-8004 metadata
    const metadata: ERC8004Metadata = {
      type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
      name: config.name,
      description: config.description,
      image: '', // Could add agent avatar
      active: true,
      x402Support: true,
      services: [
        {
          type: 'A2A',
          value: `${BASE_URL}/api/agents/${config.id}/agent-card.json`,
        },
        {
          type: 'web',
          value: `${BASE_URL}/agents/${config.id}`,
        },
      ],
    };

    // Encode as base64 data URI
    const json = JSON.stringify(metadata);
    const base64 = Buffer.from(json).toString('base64');
    const agentURI = `data:application/json;base64,${base64}`;

    console.log(`📦 ${config.name}`);
    console.log(`   ID: ${config.id}`);
    console.log(`   Capabilities: ${config.capabilities.slice(0, 3).join(', ')}${config.capabilities.length > 3 ? '...' : ''}`);
    console.log(`   Pricing: ${config.pricing.baseRate} ${config.pricing.currency}/${config.pricing.perUnit}`);
    console.log(`   URI Length: ${agentURI.length} chars`);

    if (dryRun) {
      console.log(`   [DRY RUN] Would register with URI:\n   ${agentURI.substring(0, 100)}...`);
    } else {
      try {
        // Import viem dynamically
        const { createPublicClient, createWalletClient, http, parseAbi } = await import('viem');
        const { mainnet } = await import('viem/chains');
        const { privateKeyToAccount } = await import('viem/accounts');

        const account = privateKeyToAccount(PRIVATE_KEY!);
        const publicClient = createPublicClient({
          chain: mainnet,
          transport: http(process.env.ETH_RPC_URL || 'https://eth.drpc.org'),
        });
        const walletClient = createWalletClient({
          account,
          chain: mainnet,
          transport: http(process.env.ETH_RPC_URL || 'https://eth.drpc.org'),
        });

        const ERC8004_ADDRESS = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
        const ERC8004_ABI = parseAbi([
          'function register(string agentURI) returns (uint256)',
        ]);

        console.log(`   Submitting transaction...`);

        const txHash = await walletClient.writeContract({
          address: ERC8004_ADDRESS,
          abi: ERC8004_ABI,
          functionName: 'register',
          args: [agentURI],
        });

        console.log(`   ✅ Transaction: ${txHash}`);
        console.log(`   View: https://etherscan.io/tx/${txHash}`);

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        console.log(`   Confirmed in block ${receipt.blockNumber}`);

        // Update config with registration info
        config.walletAddress = account.address;
        // Note: Would need to parse logs to get exact tokenId
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      } catch (error) {
        console.log(`   ❌ Failed: ${error}`);
      }
    }

    console.log('');
  }

  if (dryRun) {
    console.log('---');
    console.log('This was a dry run. To actually register, run without --dry-run');
    console.log('Make sure REGISTRATION_PRIVATE_KEY is set with enough ETH for gas (~0.005 ETH)');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
