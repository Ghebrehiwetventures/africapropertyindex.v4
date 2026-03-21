# arei-sdk

Internal shared query SDK for AREI-powered consumer surfaces.

This package is a technical component, not a public-facing brand.

## What it does

Provides typed functions for reading from `v1_feed_*` views in Supabase. Consumer sites (KazaVerde, etc.) import this package instead of writing queries directly.

## Install

```bash
npm install arei-sdk @supabase/supabase-js
```

Or link locally during development:

```bash
cd arei-sdk && npm link
cd kazaverde && npm link arei-sdk
```

## Usage

```typescript
import { AREIClient } from "arei-sdk";

const arei = new AREIClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
});

// Or pass an existing Supabase client:
// const arei = new AREIClient(supabase);

// Paginated listings
const { data, total, totalPages } = await arei.getListings({
  page: 1,
  pageSize: 12,
  island: "Sal",
  priceBucket: "100k_250k",
});

// Single listing for detail page
const listing = await arei.getListing("some-uuid");

// Island options for filter dropdown
const islands = await arei.getIslandOptions();
// [{ island: "Sal", count: 126 }, { island: "Santiago", count: 107 }, ...]

// Market stats (per-island median price)
const { total: inventory, islands: stats } = await arei.getMarketStats();
// stats: [{ island: "Sal", n_price: 126, median_price: 99500 }, ...]
// median_price is null when n_price < 5
```

## Architecture

```
monorepo (current repo)   arei-sdk (this package)      kazaverde-web (consumer app)
├── migrations/           ├── src/                     ├── src/
├── core/                 │   ├── types.ts             │   ├── pages/
├── markets/              │   ├── transforms.ts        │   ├── lib/
├── scripts/              │   ├── client.ts            │   └── ...
└── ...                   │   └── index.ts             └── uses arei-sdk
                          └── package.json
```

## v1 Scope (Cape Verde)

- **Feed:** `v1_feed_cv` (377 listings, buy only)
- **Filters:** Island, Price buckets
- **Stats:** Per-island median price (min sample 5)
- **Not in v1:** Size specs, property type filter, bedrooms filter, city filter, map, rent

## Types

| Type | Usage |
|------|-------|
| `ListingCard` | Grid/list views — minimal fields |
| `ListingDetail` | Detail page — full fields |
| `IslandOption` | Filter dropdown: `{ island, count }` |
| `IslandMedianStat` | Market page: `{ island, n_price, median_price }` |
| `PriceBucket` | `"under_100k" | "100k_250k" | "250k_500k" | "over_500k"` |

## Rules

- Never import `@supabase/supabase-js` in consumer sites for data queries — use this SDK
- Never read `public.listings` directly — always go through `v1_feed_*` views
- No service role key — SDK uses anon key only
- Stats are computed client-side (fine for <1000 rows, move to RPC for larger feeds)
