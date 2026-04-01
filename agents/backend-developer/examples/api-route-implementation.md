# Example: API Route Implementation

## Input
Task: "Build a product catalog API that fetches coffee products with filtering by roast level and price range"

## Expected Output

```json
{
  "status": "completed",
  "summary": "Built product catalog API with roast level and price filtering using Next.js App Router",
  "artifacts": [
    {
      "path": "src/app/api/products/route.ts",
      "type": "code",
      "description": "GET endpoint with query params for roast, minPrice, maxPrice"
    },
    {
      "path": "src/types/product.ts",
      "type": "code",
      "description": "Product type definition with roast level enum"
    }
  ]
}
```

### Code: `src/app/api/products/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import type { Product, RoastLevel } from '@/types/product';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roast = searchParams.get('roast') as RoastLevel | null;
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');

  // Validate inputs
  const validRoasts: RoastLevel[] = ['light', 'medium', 'dark', 'espresso'];
  if (roast && !validRoasts.includes(roast)) {
    return NextResponse.json(
      { success: false, error: `Invalid roast. Must be one of: ${validRoasts.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    let products = await fetchProducts(); // From CMS or database

    if (roast) {
      products = products.filter((p) => p.roastLevel === roast);
    }
    if (minPrice) {
      products = products.filter((p) => p.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      products = products.filter((p) => p.price <= parseFloat(maxPrice));
    }

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load products' },
      { status: 500 }
    );
  }
}
```

## Why This Approach

- **Validates inputs before processing** — returns 400 for invalid roast, not a silent empty result
- **Consistent response shape** — `{ success, data?, error? }` matches project conventions
- **Server-side filtering** — not fetching everything and filtering client-side
- **NOT using a database directly** — scope is frontend-first, uses a fetchProducts abstraction
- **NOT over-engineering** — no pagination, cursor, or caching for a small catalog. Add when needed.
