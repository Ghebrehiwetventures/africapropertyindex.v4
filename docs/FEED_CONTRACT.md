# Public Feed Contract (Cape Verde)

Date: 2026-03-07  
Canonical object: `public.v1_feed_cv`  
Canonical migration: `migrations/009_canonical_v1_feed_cv.sql`

## Launch decision

- **Option A**: `price` is optional at feed level.
- Price-based filtering is done at query/stat layers, not feed eligibility.

## Inclusion rules

A row is included in `v1_feed_cv` only if:

1. `source_id ILIKE 'cv_%'`
2. `approved = true`
3. `COALESCE(is_superseded, false) = false`
4. `source_url IS NOT NULL`
5. `image_urls` is non-null and non-empty
6. `island` is one of:
   - `Boa Vista`
   - `Brava`
   - `Fogo`
   - `Maio`
   - `Sal`
   - `Santiago`
   - `Santo Antão`
   - `São Nicolau`
   - `São Vicente`
7. `source_id` is not a stub/test source:
   - `cv_source_1`
   - `cv_source_2`

## Reporting language

- **Raw visible CV rows**: `listings` rows with `cv_%`, `approved = true`, `is_superseded != true`.
- **Public feed CV rows**: rows in `v1_feed_cv`.
- KPI output must report:
  - raw visible
  - public feed
  - excluded no-image
  - excluded invalid-island
  - excluded stub/test
  - price coverage over public feed

