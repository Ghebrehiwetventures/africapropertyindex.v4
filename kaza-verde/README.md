# Cape Verde Homes — Public POC

Public real estate listings for Cape Verde. Approved listings only, from Supabase (`listings` with `source_id` like `cv_%`).

## Run locally

```bash
cd public-cv
cp ../diagnostics/.env.local .env  # or set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

Open http://localhost:3080/cv (or http://localhost:3080 — redirects to /cv).

## Routes

- `/cv` — Grid of listings (12 per page), filters: island, price min/max, bedrooms
- `/cv/:id` — Listing detail, image carousel, “View original” link

## Build

```bash
npm run build
```

Output in `dist/`. For deployment on a subpath (e.g. `/cv`), set `base: '/cv/'` in `vite.config.ts` and build.
