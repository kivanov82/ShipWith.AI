import { NextRequest, NextResponse } from 'next/server';
import {
  createProjectRepo,
  commitFiles,
  listFiles,
  listCommits,
  repoExists,
} from '@shipwithai/core/github-repo';
import { getFirestoreStore } from '@shipwithai/core/firestore-store';

/**
 * GET /api/repos?projectId=xxx
 * Returns repo info (files, commits) for a project.
 * Query params: path, branch
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ success: false, error: 'projectId required' }, { status: 400 });
  }

  const store = getFirestoreStore();
  const project = await store.getProject(projectId);
  if (!project) {
    return NextResponse.json({ success: false, error: 'project not found' }, { status: 404 });
  }

  const repoFullName = project.metadata?.repoFullName as string | undefined;
  if (!repoFullName) {
    return NextResponse.json({ success: true, repo: null, message: 'No repo created yet' });
  }

  const path = searchParams.get('path') || undefined;
  const branch = searchParams.get('branch') || undefined;
  const view = searchParams.get('view') || 'files'; // 'files' | 'commits'

  if (view === 'commits') {
    const commits = await listCommits(repoFullName, 20, branch);
    return NextResponse.json({ success: true, repoFullName, commits });
  }

  const files = await listFiles(repoFullName, path, branch);
  return NextResponse.json({ success: true, repoFullName, files });
}

/**
 * POST /api/repos
 * Actions: create, commit
 *
 * Create: { action: "create", projectId, projectName, description? }
 * Commit: { action: "commit", projectId, files: [{path, content}], message, authorName? }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, projectId } = body;

  if (!action || !projectId) {
    return NextResponse.json(
      { success: false, error: 'action and projectId required' },
      { status: 400 }
    );
  }

  const store = getFirestoreStore();

  if (action === 'create') {
    const { projectName, description } = body;
    if (!projectName) {
      return NextResponse.json(
        { success: false, error: 'projectName required' },
        { status: 400 }
      );
    }

    // Check if project already has a repo
    const project = await store.getProject(projectId);
    if (project?.metadata?.repoFullName) {
      const existing = project.metadata.repoFullName as string;
      const exists = await repoExists(existing);
      if (exists) {
        return NextResponse.json({
          success: true,
          repo: { fullName: existing, url: `https://github.com/${existing}` },
          message: 'Repo already exists',
        });
      }
    }

    const repo = await createProjectRepo(projectId, projectName, description);

    // Store repo info in project metadata
    await store.saveProject({
      id: projectId,
      name: project?.name || projectName,
      description: project?.description || description,
      status: project?.status || 'active',
      metadata: {
        ...(project?.metadata || {}),
        repoFullName: repo.fullName,
        repoUrl: repo.url,
        repoCloneUrl: repo.cloneUrl,
      },
    });

    return NextResponse.json({ success: true, repo });
  }

  if (action === 'commit') {
    const { files, message, authorName } = body;
    if (!files?.length || !message) {
      return NextResponse.json(
        { success: false, error: 'files and message required' },
        { status: 400 }
      );
    }

    const project = await store.getProject(projectId);
    const repoFullName = project?.metadata?.repoFullName as string | undefined;
    if (!repoFullName) {
      return NextResponse.json(
        { success: false, error: 'No repo for this project. Create one first.' },
        { status: 400 }
      );
    }

    const commit = await commitFiles(repoFullName, files, message, authorName);
    return NextResponse.json({ success: true, commit });
  }

  return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
}
