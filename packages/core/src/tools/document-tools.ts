/**
 * Document Tools — Write documents and search the web.
 *
 * Tools: write_document, web_search
 */

import type { ToolRegistry } from './index';

export function registerDocumentTools(registry: ToolRegistry): void {
  // --- write_document ---
  registry.register(
    {
      name: 'write_document',
      description:
        'Create or update a document deliverable (requirements, specs, reports, guides). ' +
        'The document is stored as a project deliverable and can be read by other agents.',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Document title' },
          content: { type: 'string', description: 'Full document content in Markdown format' },
          type: {
            type: 'string',
            enum: ['requirements', 'design-spec', 'audit-report', 'test-report', 'user-guide', 'api-docs', 'other'],
            description: 'Document type',
          },
        },
        required: ['title', 'content', 'type'],
      },
    },
    async (input, context) => {
      const { events } = await import('../events');
      const { nanoid } = await import('nanoid');

      const title = input.title as string;
      const content = input.content as string;
      const type = input.type as string;
      const id = nanoid();

      const docPath = `docs/${type}/${title.toLowerCase().replace(/\s+/g, '-')}.md`;

      // Emit artifact.produced event
      events.artifactProduced(context.agentId, context.projectId || 'unknown', {
        type: 'document',
        path: docPath,
        description: title,
      });

      return {
        content: `Document created: "${title}" (${type})\nID: ${id}\nLength: ${content.length} chars`,
      };
    }
  );

  // --- web_search ---
  registry.register(
    {
      name: 'web_search',
      description:
        'Search the web for information. Use for market research, competitor analysis, ' +
        'technology documentation, or finding best practices. Returns summarized results.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          maxResults: {
            type: 'number',
            description: 'Maximum results to return. Defaults to 5.',
          },
        },
        required: ['query'],
      },
    },
    async (input, _context) => {
      const query = input.query as string;
      const maxResults = (input.maxResults as number) || 5;
      const apiKey = process.env.BRAVE_SEARCH_API_KEY;

      if (!apiKey) {
        return {
          content: `Web search not configured. Set BRAVE_SEARCH_API_KEY to enable. Provide your analysis based on training knowledge and note results should be verified.`,
          isError: false,
        };
      }

      try {
        const params = new URLSearchParams({
          q: query,
          count: String(maxResults),
        });

        const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': apiKey,
          },
        });

        if (!response.ok) {
          const error = await response.text();
          return {
            content: `Search failed (${response.status}): ${error}`,
            isError: true,
          };
        }

        const data = await response.json() as {
          web?: { results?: Array<{ title: string; url: string; description: string }> };
        };

        const results = data.web?.results || [];
        if (results.length === 0) {
          return { content: `No results found for "${query}".` };
        }

        const formatted = results
          .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description}`)
          .join('\n\n');

        return {
          content: `Search results for "${query}" (${results.length} results):\n\n${formatted}`,
        };
      } catch (error) {
        return {
          content: `Search error: ${error instanceof Error ? error.message : String(error)}`,
          isError: true,
        };
      }
    }
  );
}
