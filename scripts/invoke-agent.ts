#!/usr/bin/env tsx
/**
 * CLI script to invoke ShipWith.AI agents locally
 * Usage: pnpm invoke <agent-id> "<prompt>" [--project <project-id>]
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
ShipWith.AI Agent Invocation

Usage:
  pnpm invoke <agent-id> "<prompt>" [options]

Options:
  --project, -p <id>    Project context to use
  --output, -o <file>   Write output to file
  --json                Output as JSON
  --help, -h            Show this help

Available Agents:
  pm                    Project Manager
  ux-analyst            UX Analyst
  ui-designer           UI Designer
  ui-developer          Frontend Developer
  backend-developer     Backend Developer
  solidity-developer    Solidity Developer
  solidity-auditor      Solidity Auditor
  infrastructure        Infrastructure/DevOps
  qa-tester             QA Tester
  unit-tester           Unit Tester
  tech-writer           Technical Writer
  marketing             Marketing Specialist

Examples:
  pnpm invoke pm "Plan a token launchpad project"
  pnpm invoke ui-developer "Build a wallet connect button" -p proj_abc123
  pnpm invoke solidity-developer "Write an ERC-20 token contract" --json
`);
}

async function main() {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const agentId = args[0];
  const prompt = args[1];

  if (!prompt) {
    console.error('Error: Prompt is required');
    printUsage();
    process.exit(1);
  }

  // Parse options
  let projectId: string | undefined;
  let outputFile: string | undefined;
  let jsonOutput = false;

  for (let i = 2; i < args.length; i++) {
    if ((args[i] === '--project' || args[i] === '-p') && args[i + 1]) {
      projectId = args[++i];
    } else if ((args[i] === '--output' || args[i] === '-o') && args[i + 1]) {
      outputFile = args[++i];
    } else if (args[i] === '--json') {
      jsonOutput = true;
    }
  }

  // Validate agent exists
  const agentDir = path.join(process.cwd(), 'agents', agentId);
  const configPath = path.join(agentDir, 'config.json');

  if (!fs.existsSync(configPath)) {
    console.error(`Error: Agent "${agentId}" not found`);
    console.error(`Available agents: pm, ux-analyst, ui-designer, ui-developer, backend-developer, solidity-developer, solidity-auditor, infrastructure, qa-tester, unit-tester, tech-writer, marketing`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  console.log(`\n🤖 Invoking ${config.name}...`);
  console.log(`📝 Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
  if (projectId) console.log(`📁 Project: ${projectId}`);
  console.log('');

  // Determine working directory
  const workDir = projectId
    ? path.join(process.cwd(), 'projects', projectId)
    : agentDir;

  // Ensure directory exists
  if (projectId && !fs.existsSync(workDir)) {
    fs.mkdirSync(workDir, { recursive: true });
  }

  // Build the full prompt with context
  const contextParts: string[] = [];

  // Add agent system prompt
  const claudeMdPath = path.join(agentDir, 'CLAUDE.md');
  if (fs.existsSync(claudeMdPath)) {
    // Claude will pick this up from the directory
  }

  // Add project context if available
  if (projectId) {
    const projectContextPath = path.join(process.cwd(), 'memory', 'projects', projectId, 'context.md');
    if (fs.existsSync(projectContextPath)) {
      contextParts.push(`Project Context:\n${fs.readFileSync(projectContextPath, 'utf-8')}`);
    }
  }

  // Add global context
  const globalContextPath = path.join(process.cwd(), 'memory', 'global', 'context.md');
  if (fs.existsSync(globalContextPath)) {
    contextParts.push(`Global Context:\n${fs.readFileSync(globalContextPath, 'utf-8')}`);
  }

  const fullPrompt = contextParts.length > 0
    ? `${contextParts.join('\n\n---\n\n')}\n\n---\n\nTask:\n${prompt}`
    : prompt;

  // Invoke Claude
  return new Promise<void>((resolve, reject) => {
    const proc = spawn('claude', ['--print', fullPrompt], {
      cwd: agentDir,
      stdio: ['inherit', 'pipe', 'pipe'],
      env: process.env,
    });

    let output = '';
    let error = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      if (!jsonOutput) {
        process.stdout.write(text);
      }
    });

    proc.stderr.on('data', (data) => {
      error += data.toString();
      if (!jsonOutput) {
        process.stderr.write(data);
      }
    });

    proc.on('close', (code) => {
      if (jsonOutput) {
        console.log(JSON.stringify({
          success: code === 0,
          agentId,
          output,
          error: error || undefined,
        }, null, 2));
      }

      if (outputFile) {
        fs.writeFileSync(outputFile, output);
        console.log(`\n📄 Output written to ${outputFile}`);
      }

      if (code === 0) {
        console.log(`\n✅ ${config.name} completed successfully`);
        resolve();
      } else {
        console.error(`\n❌ ${config.name} failed with code ${code}`);
        reject(new Error(`Agent failed with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      console.error('Failed to spawn Claude:', err);
      reject(err);
    });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
