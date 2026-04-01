/**
 * Deployment Tools — Vercel integration for preview and production deploys.
 *
 * Tools: vercel_deploy_preview, vercel_deploy, vercel_configure, vercel_get_preview
 *
 * STUB: These tools will be implemented when Vercel API integration is added.
 */

import type { ToolRegistry } from './index';

export function registerDeploymentTools(registry: ToolRegistry): void {
  // --- vercel_deploy_preview ---
  registry.register(
    {
      name: 'vercel_deploy_preview',
      description:
        'Trigger a preview deployment on Vercel for the current branch. ' +
        'Returns a preview URL that can be used for testing.',
      input_schema: {
        type: 'object',
        properties: {
          branch: { type: 'string', description: 'Branch to deploy from' },
        },
        required: ['branch'],
      },
    },
    async (input, _context) => {
      return {
        content: `Vercel preview deployment not yet configured. Branch: ${input.branch}. Configure VERCEL_TOKEN and VERCEL_PROJECT_ID to enable.`,
        isError: true,
      };
    }
  );

  // --- vercel_deploy ---
  registry.register(
    {
      name: 'vercel_deploy',
      description:
        'Deploy to production on Vercel. Only use after QA review is complete.',
      input_schema: {
        type: 'object',
        properties: {
          branch: { type: 'string', description: 'Branch to deploy. Defaults to "main".' },
        },
      },
    },
    async (input, _context) => {
      return {
        content: `Vercel production deployment not yet configured. Branch: ${input.branch || 'main'}. Configure VERCEL_TOKEN and VERCEL_PROJECT_ID to enable.`,
        isError: true,
      };
    }
  );

  // --- vercel_configure ---
  registry.register(
    {
      name: 'vercel_configure',
      description:
        'Configure Vercel project settings: environment variables, custom domains, build settings.',
      input_schema: {
        type: 'object',
        properties: {
          envVars: {
            type: 'object',
            description: 'Environment variables to set (key-value pairs)',
          },
          domain: { type: 'string', description: 'Custom domain to add' },
          buildCommand: { type: 'string', description: 'Custom build command' },
        },
      },
    },
    async (_input, _context) => {
      return {
        content: 'Vercel configuration not yet implemented. Configure VERCEL_TOKEN and VERCEL_PROJECT_ID to enable.',
        isError: true,
      };
    }
  );

  // --- vercel_get_preview ---
  registry.register(
    {
      name: 'vercel_get_preview',
      description:
        'Get the preview deployment URL and status. Use to check if a preview deployment is ready for testing.',
      input_schema: {
        type: 'object',
        properties: {
          branch: { type: 'string', description: 'Branch to check preview for' },
        },
        required: ['branch'],
      },
    },
    async (input, _context) => {
      return {
        content: `Vercel preview status not yet configured for branch: ${input.branch}. Configure VERCEL_TOKEN and VERCEL_PROJECT_ID to enable.`,
        isError: true,
      };
    }
  );
}
