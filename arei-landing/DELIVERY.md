# `arei-landing` Delivery Contract

This document is binding. Any change to `arei-landing/` must satisfy every rule below.

## Canonical project

- Vercel project: `arei-landing` (`prj_4B9hTVACdIa9IdlstS9xzjTdxXow`)
- Team: `ghebrehiwetventures` (`team_92s3lfOnOc8khQBJngloED1z`)
- Repo path: `arei-landing/` (root directory set in Vercel project settings)

## Canonical deploy target

**Merge does not change production. Production changes only after explicit `vercel --prod --yes` from monorepo root.**

- No Vercel git auto-deploy. No push triggers.
- `.vercel/project.json` must live at monorepo root and point to `prj_4B9hTVACdIa9IdlstS9xzjTdxXow`.

## Canonical public URL

- The canonical public URL is exactly **`https://www.africarealestateindex.com/`** (with `www`).
- The apex `africarealestateindex.com` is an alias only. It must never appear in `<link rel="canonical">`, `og:url`, `twitter:*` URL refs, sitemap entries, share links, or docs.
- All `<link rel="canonical">`, `og:url`, sitemap entries, and share image references must use the canonical host consistently.

## Valid preview verification (required before merge)

1. From monorepo root: `vercel --yes` (no `--prod`).
2. **PR may not be merged unless the Vercel CLI preview URL is attached in the PR body or a top-level PR comment.** Localhost preview does not count.
3. Open preview URL; confirm the specific change being shipped is visible.
4. Confirm no console errors; confirm Supabase listings load (KazaVerde carousel).
5. Confirm form `action` still points to Formspree `/f/mvzbknjb`.
6. Commit author email must be a real address (`name@domain.tld`) — Vercel rejects `*@*.local`.

## Pre-merge checklist (binding)

- [ ] Vercel CLI preview URL attached to PR body or top-level comment
- [ ] Preview tested at mobile (375px) and desktop (≥1280px)
- [ ] Meta: `<title>`, `description`, `og:title`, `og:description` match the new copy
- [ ] If copy changed: `arei-og.png` regenerated and looks right at 1200×630
- [ ] Canonical host is consistent across canonical tag, `og:url`, and share image references
- [ ] `.vercel/project.json` not accidentally removed or altered
- [ ] Meta/OG drift is a release blocker — even if the UI change looks correct, stale metadata fails the checklist

## Production rollout (after merge)

1. `git fetch origin main && git checkout <merged-sha> -- arei-landing/`
2. From monorepo root: `vercel --prod --yes`
3. Confirm `target: production` and aliases include `www.africarealestateindex.com`
4. Hard-refresh the canonical URL (`Cmd+Shift+R`) and verify.
5. Re-scrape OG caches if social preview needs to refresh: Facebook Sharing Debugger, Twitter Card Validator, LinkedIn Post Inspector.

---

## Structure audit

**Current**: single `arei-landing/index.html`, ~48 KB, ~1,030 lines. Embedded CSS (~800 lines) and JS (~200 lines). Build step is `cp index.html arei-og.png dist/`.

**Recommendation: keep as a single file.**

Reasons:
- At this size it's still scannable. Section comments (`/* ─── HERO ─── */` etc.) make navigation cheap.
- No framework, no bundler, no build cache. Deploys are instant. That's a feature, not a limitation.
- JS (carousel auto-scroll, Supabase fetch, form submit) is tightly coupled to the DOM — splitting it doesn't buy modularity, it just adds a file to keep in sync.
- Single editor. Splitting to help concurrent contributors solves a problem that doesn't exist yet.

**Split only when one of these becomes true:**
- Total file size exceeds ~1,500 lines **or** ~70 KB.
- A second contributor lands changes regularly.
- A third JS-heavy feature is added (e.g., interactive map, chart, search widget).

**If splitting, minimum viable layout (no more):**

```
arei-landing/
  index.html       ← markup + <link>/<script> tags only
  styles.css       ← current CSS block verbatim
  app.js           ← current JS block verbatim
  arei-og.png
  package.json     ← `cp *.html *.css *.js *.png dist/`
  vercel.json
```

No framework. No TypeScript. No bundler. The build stays a `cp`.
