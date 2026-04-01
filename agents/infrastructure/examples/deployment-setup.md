# Example: Vercel Deployment Setup

## Input
Task: "Set up deployment for the coffee shop Next.js app"

## Expected Output

```json
{
  "status": "completed",
  "summary": "Configured Vercel deployment with preview environments and production safeguards",
  "artifacts": [
    {
      "path": "vercel.json",
      "type": "config",
      "description": "Vercel configuration with build settings and redirects"
    },
    {
      "path": "docs/deployment-guide.md",
      "type": "document",
      "description": "Deployment runbook with setup steps and troubleshooting"
    }
  ]
}
```

### Config: `vercel.json`

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ]
}
```

## Why This Approach

- **Vercel, not Docker/AWS** — this is a Next.js app with no custom backend. Vercel is the simplest path.
- **NOT setting up Kubernetes** — overkill for a small e-commerce site
- **Preview environments included** — every PR gets a preview URL for QA
- **API routes are no-cache** — prevents stale product data in the catalog
- **Single region** — no need for multi-region at this scale. Can add later.
