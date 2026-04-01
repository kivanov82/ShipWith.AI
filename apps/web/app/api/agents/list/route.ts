import { NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs';

/**
 * GET /api/agents/list
 * Returns all agent configs with full details (tools, outputTool, model, etc.)
 * Used by the Agent Observatory page.
 */
export async function GET() {
  try {
    const agentsDir = path.join(process.cwd(), '..', '..', 'agents');
    const entries = fs.readdirSync(agentsDir, { withFileTypes: true });

    const agents = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === '_template') continue;

      const configPath = path.join(agentsDir, entry.name, 'config.json');
      const claudeMdPath = path.join(agentsDir, entry.name, 'CLAUDE.md');
      const examplesDir = path.join(agentsDir, entry.name, 'examples');

      if (!fs.existsSync(configPath)) continue;

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      // Check for CLAUDE.md
      const hasSystemPrompt = fs.existsSync(claudeMdPath);
      const systemPromptLines = hasSystemPrompt
        ? fs.readFileSync(claudeMdPath, 'utf-8').split('\n').length
        : 0;

      // Check for examples
      let examples: string[] = [];
      if (fs.existsSync(examplesDir)) {
        examples = fs.readdirSync(examplesDir).filter((f) => f.endsWith('.md'));
      }

      agents.push({
        ...config,
        _meta: {
          hasSystemPrompt,
          systemPromptLines,
          examples,
          toolCount: config.tools?.length || 0,
          hasOutputTool: !!config.outputTool,
        },
      });
    }

    // Sort: PM first, then alphabetically
    agents.sort((a, b) => {
      if (a.id === 'pm') return -1;
      if (b.id === 'pm') return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ success: true, agents, count: agents.length });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list agents', details: String(error) },
      { status: 500 }
    );
  }
}
