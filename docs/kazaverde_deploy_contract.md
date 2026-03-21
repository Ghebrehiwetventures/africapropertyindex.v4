# KazaVerde Deploy Contract

Last updated: 2026-03-21

## Governing reference

This deploy contract is governed by `docs/06-go-to-market/brand-architecture.md`.

Naming layers for this deploy path:
- canonical parent platform: `AREI`
- canonical consumer surface: `KazaVerde`
- technical repo identifier: `arei-platform`
- technical app path: `/kazaverde-web`
- technical production project: `kazaverde-web`
- public production domain: `https://kazaverde.com`
- default endorsement language: `Powered by AREI`

Technical identifiers support the deploy path. They do not override the public product name.

## Canonical production

- Production domain: `https://kazaverde.com`
- Preview/test domain: `https://<project>.vercel.app`
- `*.vercel.app` is never considered production success

## Mapping

- Canonical product: `KazaVerde`
- Repo technical identifier: `arei-platform`
- App path technical identifier: `/kazaverde-web`
- Production project technical identifier: `kazaverde-web`

## Release success criteria

A deploy is only successful when:

1. the Vercel build passes
2. the correct custom domain is attached to the `kazaverde-web` production deployment for KazaVerde
3. the intended change is verified live on `https://kazaverde.com`

## Validation

- Check the relevant page on `https://kazaverde.com`
- Confirm the intended change is visible there
- Confirm a preview URL was not mistaken for production
- Confirm `kazaverde.com` is still attached to the `kazaverde-web` project that serves KazaVerde
- Confirm canonical production assumptions still point to `kazaverde.com`

## Deploy reporting rule

All deploy reports for KazaVerde must separately state:

- `Canonical product: KazaVerde`
- `Vercel deploy URL`
- `Production project technical identifier: kazaverde-web`
- `Production domain: https://kazaverde.com`
- `kazaverde.com verification status: verified | not verified`
- `Verification note`
