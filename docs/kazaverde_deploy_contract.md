# KazaVerde Deploy Contract

Last updated: 2026-03-27

## Canonical production

- Canonical production branch: `main`
- Canonical Vercel project: `kazaverde-web`
- Canonical production domain: `https://kazaverde.com`

## Preview vs production

- Preview deployments are expected on branch and pull request builds.
- Preview deployments normally use `*.vercel.app` URLs.
- Preview success does not mean production is updated.
- Production is only updated when the intended change is on `main` and Vercel creates a production deployment for `kazaverde-web`.
- `kazaverde.com` must resolve to the production deployment for `kazaverde-web`.

## Production verification

A KazaVerde deploy is only considered complete when all of the following are true:

1. the change is merged to `main`
2. Vercel shows a production deployment for `kazaverde-web`
3. `kazaverde.com` is attached to that project
4. the intended change is verified live on `https://www.kazaverde.com`
