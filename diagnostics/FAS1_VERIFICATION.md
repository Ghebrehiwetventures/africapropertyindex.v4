# FAS 1 – Verification checks

Run migration `003_canonical_identity_columns.sql` in Supabase, then run one CV ingest (`npm run ingest:cv`). Use the queries below in Supabase SQL Editor.

---

## Check 1 – canonical_id and source_url_normalized

```sql
SELECT id, source_id, source_url, source_url_normalized, canonical_id
FROM listings
ORDER BY updated_at DESC
LIMIT 20;
```

**Verify:**

- `source_url_normalized`: https, no query/fragment, no www, lowercase host, no trailing slash.
- `canonical_id` format: `source_id` + `:` + 16 hex chars (e.g. `cv_terracaboverde:a1b2c3d4e5f67890`).
- No row has empty `canonical_id`.
- Same listing in two ingest runs must get the same `canonical_id`; if the hash changes between runs, the bug is in `normalizeUrl` or in non-deterministic input (e.g. varying URL).

---

## Check 2 – last_seen_at updated

```sql
SELECT COUNT(*)
FROM listings
WHERE last_seen_at > now() - interval '1 hour';
```

**Verify:** After a full ingest, this count should be roughly the number of upserted rows (e.g. 100–150 for CV). If 0, the writer is not setting `last_seen_at`.

---

## Check 3 – first_seen_at not overwritten

1. Before ingest, note `first_seen_at` for some old rows:

```sql
SELECT id, created_at, first_seen_at
FROM listings
ORDER BY created_at ASC
LIMIT 10;
```

2. Run ingest: `npm run ingest:cv`

3. Run the same query again.

**Verify:** `first_seen_at` is unchanged for those rows. The writer does not send `first_seen_at` in the payload, so UPDATE must not touch it.

---

## Check 4 – canonical_id deterministic (one row per URL)

1. Pick a listing with a stable URL, e.g. copy one `source_url` from Check 1.
2. Run ingest twice (two full runs).
3. Run (replace the URL pattern with your chosen URL segment):

```sql
SELECT canonical_id, COUNT(*)
FROM listings
WHERE source_url LIKE '%terracaboverde.com/properties/%'
GROUP BY canonical_id;
```

**Verify:** Exactly one row per `canonical_id` (each count = 1). If you see the same URL with two different `canonical_id` values, either the fallback is firing incorrectly or the URL varies between runs.

---

## Code confirmation (Check 3)

- In `core/supabaseWriter.ts`, only these identity fields are set before upsert: `canonical_id`, `source_url_normalized`, `last_seen_at`, `is_superseded`.
- `first_seen_at` is never assigned; it is not sent to Supabase, so existing values are not overwritten on UPDATE.
