# Local Git Credentials Setup

**TL;DR — push to this repo from `ghebrehiwetventures` (the GitHub account that owns the Vercel team), not from any other saved GitHub credential on this Mac.**

## Why this matters

Vercel attributes each deploy to the GitHub user who pushed the commit.
If `git push` runs as `storamusikhuset` (or any account that isn't a member
of the `ghebrehiwetventures` Vercel team), every deploy lands with a
"Vercel user not found" warning. The deploy still goes to the right project
and the right team — only the *author attribution* is wrong, but it's
visible noise in Vercel's UI and it confuses anyone reviewing deploy
history.

This is purely a local-credential thing. Nothing in the repo or in Vercel
needs to change to fix it; the fix is on each contributor's machine.

## One-time setup (per Mac)

### 1. Make a Personal Access Token on `ghebrehiwetventures`

1. Sign in to GitHub as `ghebrehiwetventures`.
2. Settings → Developer settings → Personal access tokens → **Fine-grained
   tokens** → Generate new token.
3. Repository access: *only* `Ghebrehiwetventures/arei-platform` (least
   privilege).
4. Permissions: **Contents: Read and write**, **Metadata: Read-only**.
5. Expiration: 90 days is fine; longer if you'd rather not redo this often.
6. Save the token somewhere safe (1Password etc.) — GitHub won't show it
   again.

### 2. Remove any wrong-account credentials from macOS Keychain

Open **Keychain Access** (or the modern *Passwords* app on Sequoia+).
Search `github.com`. Delete any entry whose account is **not**
`ghebrehiwetventures` — typically `storamusikhuset`, personal accounts,
etc.

If you prefer terminal:

```sh
printf "host=github.com\nprotocol=https\n\n" | git credential-osxkeychain erase
```

### 3. Trigger a credential prompt

From any worktree:

```sh
git push
```

Git will prompt:

- **Username for github.com:** `ghebrehiwetventures`
- **Password for github.com:** *paste the PAT* (input is hidden — that's
  normal, just press Enter)

macOS Keychain stores the credential. From now on every `git push` from
any worktree on this Mac uses the right account.

## Verifying it worked

After the next push, open the deploy in Vercel and hover the "Created by"
avatar. You should see:

- Commit Author: `mikaelghebrehiwet@gmail.com` (or whatever your local
  `git config user.email` is)
- GitHub User: **`ghebrehiwetventures`**
- Vercel Account: **Linked** (no warning triangle)

## Notes for new worktrees

`.claude/` is gitignored, so per-worktree state doesn't carry over — but
git credentials live in macOS Keychain, *not* per-worktree. So once
step 2–3 is done on a Mac, every existing and future worktree on that Mac
inherits the right credential automatically. No setup needed per worktree.

## Notes for new Macs / new contributors

Repeat the full setup. The PAT itself is per-user; don't share it.
