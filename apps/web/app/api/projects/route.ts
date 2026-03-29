import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs';
import { nanoid } from 'nanoid';

// Create a new project and trigger the PM agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, budget, timeline } = body;

    // Generate project ID
    const projectId = `proj_${nanoid(10)}`;
    const projectDir = path.join(process.cwd(), '..', '..', 'projects', projectId);

    // Create project directory
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, '.shipwithai'), { recursive: true });

    // Create project metadata
    const projectMeta = {
      id: projectId,
      name: prompt.substring(0, 50),
      description: prompt,
      status: 'planning',
      tasks: [],
      budget: budget || null,
      timeline: timeline || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    fs.writeFileSync(
      path.join(projectDir, '.shipwithai', 'project.json'),
      JSON.stringify(projectMeta, null, 2)
    );

    // Create project memory directory
    const memoryDir = path.join(process.cwd(), '..', '..', 'memory', 'projects', projectId);
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(
      path.join(memoryDir, 'context.md'),
      `# Project: ${projectMeta.name}\n\n## Requirements\n\n${prompt}\n`
    );

    // Trigger PM agent to plan the project
    const pmResponse = await fetch(
      `${request.nextUrl.origin}/api/agents/pm/invoke`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `New project request:\n\n${prompt}\n\nBudget: ${budget || 'Not specified'}\nTimeline: ${timeline || 'Not specified'}\n\nPlease analyze this request and create a project plan with tasks for the appropriate agents.`,
          projectId,
        }),
      }
    );

    const pmResult = await pmResponse.json();

    return NextResponse.json({
      projectId,
      status: 'planning',
      pmResponse: pmResult,
    });
  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create project', details: String(error) },
      { status: 500 }
    );
  }
}

// List all projects
export async function GET() {
  try {
    const projectsDir = path.join(process.cwd(), '..', '..', 'projects');

    if (!fs.existsSync(projectsDir)) {
      return NextResponse.json({ projects: [] });
    }

    const projectIds = fs.readdirSync(projectsDir).filter((name) => {
      const metaPath = path.join(projectsDir, name, '.shipwithai', 'project.json');
      return fs.existsSync(metaPath);
    });

    const projects = projectIds.map((id) => {
      const metaPath = path.join(projectsDir, id, '.shipwithai', 'project.json');
      return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    });

    return NextResponse.json({
      projects: projects.sort((a, b) => b.createdAt - a.createdAt),
    });
  } catch (error) {
    console.error('Project list error:', error);
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    );
  }
}
