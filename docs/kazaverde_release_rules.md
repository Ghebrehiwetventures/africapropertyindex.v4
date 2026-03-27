# KazaVerde Release Rules

Last updated: 2026-03-27

These rules are non-negotiable for KazaVerde production changes.

1. Production changes must merge to `main`.
2. Do not treat random side branches as production deploy sources.
3. Do not treat local uncommitted changes as production source of truth.
4. Verify the preview deployment before merge.
5. Verify production on `https://www.kazaverde.com` after merge.
6. If preview and production disagree, production truth is only what is visible on `kazaverde.com`.
