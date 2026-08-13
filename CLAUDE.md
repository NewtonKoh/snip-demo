# Snip Repository Rules

## What This Repo Is

A **single-repo, multi-layer architecture** demonstrating git submodules. One backend, two clients (web + CLI), each on its own orphan branch with independent history. The `main` branch superproject mounts all layers as submodules + a generated `bundle` branch for releases.

## Architecture & Tech Stack

| Layer | Type | Tech | Location | Branch |
|-------|------|------|----------|--------|
| Backend | API server | Bun (zero deps) | `backend/server.js` | `backend` |
| Frontend | Web UI | Angular 19 + signals | `frontend/src/**` | `frontend` |
| CLI | Terminal tool | Node (zero deps, CommonJS) | `cli/cli.js` | `cli` |
| Bundle | Release (generated) | Docker + Bun | `bundle/` (submodule) | `bundle` |
| Superproject | Orchestration | Git submodules | `.gitmodules, scripts/` | `main` |

## API Contract

This is **load-bearing**. Change it everywhere or nowhere:

```
POST /api/links { "url": "https://..." }
  → 201 { code, url, shortUrl, hits, createdAt }
  → 400 on invalid JSON or non-http(s) URL

GET /api/links
  → 200 array of link objects

GET /:code
  → 302 redirect to original URL (hits++)
  → 404 if unknown
```

## Key Commands

**Working on a layer:**
```bash
cd backend    # Full checkout of that branch
git add -A && git commit -m "..." && git push
cd ..
git submodule update --remote backend    # Move the pointer
git add backend && git commit -m "Bump backend" && git push
```

**Building a release:**
```bash
node scripts/build-bundle.mjs          # Assemble without pushing
node scripts/build-bundle.mjs --push   # Assemble and push
```

**Running locally:**
```bash
# Terminal 1
cd backend && bun start

# Terminal 2
cd frontend && npm install && npx ng serve

# Terminal 3
cd cli && node cli.js ls
```

## Do's

- ✓ Edit any layer's source freely (backend/server.js, frontend/src/**, cli/cli.js)
- ✓ Push from inside a layer, then bump the pointer on main (two commits)
- ✓ Run the bundle script to generate a release (idempotent, safe)
- ✓ Keep .gitmodules in sync with actual submodule paths
- ✓ Test API changes in all three clients before pushing
- ✓ Make bundle/ hand-edit-free — only the build script writes there

## Don'ts

- ✗ **Never hand-edit `bundle/`** — it's generated. Always use `scripts/build-bundle.mjs`
- ✗ **Never add `"type": "module"`** to `cli/package.json` — cli.js stays CommonJS for bundle compatibility
- ✗ **Never change the Angular build output path** — it must land in `dist/snip-frontend/browser/` (hardcoded in build script)
- ✗ **Never edit storage** (the in-memory Map) to persist — it's by design (restarts clear all links)
- ✗ **Don't push to `bundle` manually** — only the build script and CI should touch it
- ✗ **Don't break the submodule tracking** — each must track its branch (not a commit)

## Non-Obvious Traps

1. **bundle/ is generated output** — never hand-edit, never commit there directly; use the build script
2. **cli.js must stay CommonJS** — the bundle copies it as-is; `"type": "module"` breaks it
3. **Angular build output path is load-bearing** — the script assumes `frontend/dist/snip-frontend/browser/index.html`
4. **Storage is in-memory by design** — Snip clears all links on restart; don't try to add persistence without updating all three clients
5. **Bundle branch is schedule-only on purpose** — CI runs on a cron, not on code pushes, to avoid race conditions; the pointer bump on main triggers docker CI
6. **Docker CI watches the gitlink, not files** — the `paths:` filter includes `bundle` (the entry), not `bundle/**` (the contents)
7. **Submodule updates are manual** — after editing a layer, run `git submodule update --remote <path>` on main; plain `git pull` won't fetch submodule updates

## Verify Before Pushing

```bash
# Backend
cd backend && bun start
# Test in another terminal: curl -X POST http://localhost:3000/api/links -H "Content-Type: application/json" -d '{"url":"https://example.com"}'

# Frontend
cd frontend && npm install && npx ng build
# Check dist/snip-frontend/browser/index.html exists

# CLI
cd cli && node cli.js help
# Should print usage without error

# Bundle (from main)
node scripts/build-bundle.mjs
# Should succeed and bundle/ should have server.js, public/, cli.js, Dockerfile, .env
```
