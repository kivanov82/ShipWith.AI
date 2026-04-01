import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { readFileSync } from 'fs';

export interface RepoInfo {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
}

export interface RepoFile {
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha: string;
}

export interface CommitResult {
  sha: string;
  url: string;
  message: string;
}

interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  installationId: string;
  repoOwner: string;
}

function getConfig(): GitHubAppConfig {
  const appId = process.env.GITHUB_APP_ID;
  // Support private key as direct value or file path
  const keyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY
    || (keyPath ? readFileSync(keyPath, 'utf-8') : undefined);
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
  const repoOwner = process.env.GITHUB_REPO_OWNER || 'kivanov82';

  if (!appId || !privateKey || !installationId) {
    throw new Error(
      'Missing GitHub App config. Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY (or GITHUB_APP_PRIVATE_KEY_PATH), and GITHUB_APP_INSTALLATION_ID'
    );
  }

  return { appId, privateKey, installationId, repoOwner };
}

export function getOctokit(): Octokit {
  const config = getConfig();
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: config.appId,
      privateKey: config.privateKey,
      installationId: config.installationId,
    },
  });
}

/**
 * Create a new repo for a project under the configured owner account.
 * Returns the repo info including URL and clone URL.
 */
export async function createProjectRepo(
  projectId: string,
  projectName: string,
  description?: string
): Promise<RepoInfo> {
  const octokit = getOctokit();
  const config = getConfig();

  // Slugify project name for repo name
  const repoName = `shipwithai-${slugify(projectName || projectId)}`;

  // GitHub App installations use the installation endpoint for repo creation
  // Falls back to createForAuthenticatedUser for PAT-based auth
  let data;
  try {
    const response = await octokit.request('POST /repos', {
      name: repoName,
      description: description || `ShipWith.AI project: ${projectName}`,
      private: true,
      auto_init: true,
    });
    data = response.data;
  } catch {
    // Fallback: try creating under the configured owner as an org repo
    try {
      const response = await octokit.repos.createInOrg({
        org: config.repoOwner,
        name: repoName,
        description: description || `ShipWith.AI project: ${projectName}`,
        private: true,
        auto_init: true,
      });
      data = response.data;
    } catch {
      // Last resort: createForAuthenticatedUser (works with PAT)
      const response = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: description || `ShipWith.AI project: ${projectName}`,
        private: true,
        auto_init: true,
      });
      data = response.data;
    }
  }

  const repoInfo: RepoInfo = {
    owner: data.owner.login,
    name: data.name,
    fullName: data.full_name,
    url: data.html_url,
    cloneUrl: data.clone_url,
    defaultBranch: data.default_branch,
  };

  // Scaffold CLAUDE.md hierarchy in the new repo
  try {
    await scaffoldClaudeMd(repoInfo.fullName, projectName, description);
  } catch (err) {
    console.error('Failed to scaffold CLAUDE.md (non-fatal):', err);
  }

  return repoInfo;
}

/**
 * Commit one or more files to a repo in a single commit.
 * Uses the Git tree API for atomic multi-file commits.
 */
export async function commitFiles(
  repoFullName: string,
  files: Array<{ path: string; content: string }>,
  message: string,
  authorName?: string,
  branch?: string
): Promise<CommitResult> {
  const octokit = getOctokit();
  const [owner, repo] = repoFullName.split('/');
  const targetBranch = branch || 'main';

  // Get the latest commit SHA on the branch
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${targetBranch}`,
  });
  const latestCommitSha = ref.object.sha;

  // Get the tree SHA of the latest commit
  const { data: commit } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: latestCommitSha,
  });
  const baseTreeSha = commit.tree.sha;

  // Create blobs for each file
  const tree = await Promise.all(
    files.map(async (file) => {
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64',
      });
      return {
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      };
    })
  );

  // Create new tree
  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    tree,
    base_tree: baseTreeSha,
  });

  // Create commit
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: newTree.sha,
    parents: [latestCommitSha],
    author: {
      name: authorName || 'ShipWith.AI Agent',
      email: 'agents@shipwith.ai',
      date: new Date().toISOString(),
    },
  });

  // Update branch ref
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${targetBranch}`,
    sha: newCommit.sha,
  });

  return {
    sha: newCommit.sha,
    url: newCommit.html_url,
    message: newCommit.message,
  };
}

/**
 * List files in a repo directory (or root).
 */
export async function listFiles(
  repoFullName: string,
  path?: string,
  branch?: string
): Promise<RepoFile[]> {
  const octokit = getOctokit();
  const [owner, repo] = repoFullName.split('/');

  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path: path || '',
    ref: branch,
  });

  if (!Array.isArray(data)) {
    // Single file, not a directory
    return [
      {
        path: data.path,
        type: 'file',
        size: data.size,
        sha: data.sha,
      },
    ];
  }

  return data.map((item) => ({
    path: item.path,
    type: item.type === 'dir' ? 'dir' : 'file',
    size: item.size,
    sha: item.sha,
  }));
}

/**
 * Get the contents of a single file from the repo.
 */
export async function getFileContent(
  repoFullName: string,
  path: string,
  branch?: string
): Promise<string> {
  const octokit = getOctokit();
  const [owner, repo] = repoFullName.split('/');

  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref: branch,
  });

  if (Array.isArray(data) || data.type !== 'file') {
    throw new Error(`Path ${path} is not a file`);
  }

  return Buffer.from((data as any).content, 'base64').toString('utf-8');
}

/**
 * List recent commits on a repo.
 */
export async function listCommits(
  repoFullName: string,
  limit: number = 20,
  branch?: string
): Promise<Array<{ sha: string; message: string; author: string; date: string }>> {
  const octokit = getOctokit();
  const [owner, repo] = repoFullName.split('/');

  const { data } = await octokit.repos.listCommits({
    owner,
    repo,
    sha: branch,
    per_page: limit,
  });

  return data.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    author: c.commit.author?.name || 'unknown',
    date: c.commit.author?.date || '',
  }));
}

/**
 * Check if a repo exists.
 */
export async function repoExists(repoFullName: string): Promise<boolean> {
  const octokit = getOctokit();
  const [owner, repo] = repoFullName.split('/');

  try {
    await octokit.repos.get({ owner, repo });
    return true;
  } catch {
    return false;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

/**
 * Scaffold CLAUDE.md hierarchy in a newly created repo.
 * Makes the project AI-ready with conventions, rules, and structure docs.
 */
async function scaffoldClaudeMd(
  repoFullName: string,
  projectName: string,
  description?: string
): Promise<void> {
  const rootClaudeMd = `# ${projectName}

${description || 'A project built by ShipWith.AI agents.'}

## Tech Stack

<!-- Updated by agents as technology decisions are made -->
- **Framework**: TBD
- **Language**: TypeScript
- **Styling**: TBD
- **Deployment**: TBD

## Conventions

### Code Style
- Use TypeScript strict mode
- Prefer named exports over default exports
- Use \`interface\` for object shapes, \`type\` for unions
- Keep files under 300 lines — split when larger

### Git Workflow
- Never commit directly to main
- Use feature branches: \`feature/<agent-or-author>/<description>\`
- All PRs are automatically reviewed before merge

### File Structure
\`\`\`
src/
  components/    # React components
  lib/           # Utilities and helpers
  app/           # Next.js app router pages
  api/           # API routes
  types/         # Shared type definitions
\`\`\`

## API Conventions

- All API routes return \`{ success: boolean, data?: T, error?: string }\`
- Use proper HTTP status codes (400 for validation, 404 for not found, 500 for server errors)
- Validate all inputs at the route handler level
`;

  const rulesTestMd = `---
globs: "**/*.test.ts,**/*.test.tsx,**/*.spec.ts"
---

# Test File Rules

- Use Vitest as the test runner
- Follow Arrange-Act-Assert pattern
- Mock external dependencies, not internal logic
- Test file lives next to the file it tests
- Name: \`ComponentName.test.tsx\` or \`utils.test.ts\`
`;

  const rulesApiMd = `---
globs: "src/app/api/**/*.ts,src/api/**/*.ts"
---

# API Route Rules

- Return consistent response shape: \`{ success, data?, error? }\`
- Validate request body before processing
- Handle errors with try/catch — never let unhandled errors crash
- Log errors server-side, return safe messages to client
`;

  await commitFiles(
    repoFullName,
    [
      { path: 'CLAUDE.md', content: rootClaudeMd },
      { path: '.claude/rules/tests.md', content: rulesTestMd },
      { path: '.claude/rules/api-routes.md', content: rulesApiMd },
    ],
    'Scaffold CLAUDE.md hierarchy for AI-ready development',
    'ShipWith.AI',
    'main'
  );
}
