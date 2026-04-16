# Postmortem — PR #75: `arei-landing` brutalist redesign

## What changed

Full redesign of `arei-landing/index.html`:

- Brutalist monospace system, new green color rhythm.
- Hero copy swapped to "Africa's property data is everywhere. We bring it together."
- Market Status panel with Cape Verde → KazaVerde link.
- Twitter handle updated to `arei_data`.
- Engine visualization built then removed after iteration.
- Meta/OG tags and `arei-og.png` **not updated in the PR**; fixed post-merge via separate CLI deploy.

## What was actually verified before merge

- Local `preview_start` on `localhost:3456`, mobile screenshots, DOM inspection for desktop layout.
- Console: no errors. Supabase: 392 listings, 8 sources loading.
- Functional: `Visit KazaVerde` link, carousel auto-scroll, form target.

## What was ambiguous or wrong

- **Assumed Vercel git auto-deploy covered `arei-landing`.** It doesn't. Merging #75 changed `main` but did not update production.
- **First CLI deploy attempt ran from the wrong directory** (`arei-landing/` instead of monorepo root). Error was "`arei-landing/arei-landing` does not exist" — misleading.
- **Second CLI deploy failed silently.** Actual cause (`mikaelghebrehiwet@Mikaels-Laptop.local` is not a valid email) was only surfaced in the Vercel dashboard UI, not the CLI output.
- **No Vercel preview URL attached to PR #75 before merge.** The user merged on faith in the localhost preview.
- **OG image + meta description still showed old "data layer" copy at merge time.** Only caught when the user shared the URL on WhatsApp and saw a stale preview.

## Rules to prevent recurrence

All codified in [`DELIVERY.md`](../../DELIVERY.md):

1. **No PR for `arei-landing/` without a Vercel CLI preview URL in the PR body or a top-level comment.** Localhost preview does not count.
2. **Meta/OG drift is a release blocker.** Any PR that edits hero copy must also update `<title>`, meta description, `og:*`, `twitter:*`, and regenerate `arei-og.png`. Gated in the pre-merge checklist.
3. **Commit author email must be valid** (`name@domain.tld`). `*.local` hostnames will be rejected by Vercel. Fix locally before the first commit.
4. **Production rollout is an explicit step.** Merge does not change production. `vercel --prod --yes` must run from monorepo root after merge, then the canonical URL hard-refreshed.
5. **Canonical host is `www.africarealestateindex.com`.** Apex is an alias only; must never appear in canonical/OG/share refs.
