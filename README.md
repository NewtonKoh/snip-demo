# Snip

A tiny URL shortener demonstrating **git submodules** architecture. One backend, two clients (web + CLI), all layers in one repo with independent histories.

## Architecture

| Layer | Type | Tech | Location |
|-------|------|------|----------|
| **backend** | API server | Bun, zero deps | [backend/](backend/) branch |
| **frontend** | Web UI | Angular 19, signals | [frontend/](frontend/) branch |
| **cli** | Terminal tool | Node, zero deps | [cli/](cli/) branch |
| **main** | Superproject | Git submodules | This branch |

## The Contract

All clients consume the same API:

```
POST /api/links  { "url": "https://…" }
  → 201 { code, url, shortUrl, hits, createdAt }
  → 400 on invalid JSON or non-http(s) URL

GET /api/links
  → 200 array of { code, url, shortUrl, hits, createdAt }

GET /:code
  → 302 to original URL (incrementing hits)
  → 404 if unknown
```

## Cloning

Each folder is a **gitlink** — a commit pointer to another branch. Clone with submodules:

```bash
git clone --recurse-submodules https://github.com/NewtonKoh/snip-demo.git
cd snip-demo
```

## Running All Three

Three terminal windows from the repo root:

```bash
# Terminal 1: Backend (port 3000)
cd backend
bun start

# Terminal 2: Frontend (port 4200)
cd frontend
npm install
npx ng serve

# Terminal 3: CLI (against running backend)
cd cli
node cli.js ls
```

Then visit http://localhost:4200 and use the CLI to create and list short links.

## Updating a Layer

After editing a layer (e.g., `backend/server.js`):

```bash
cd backend
git add -A && git commit -m "..." && git push
cd ..
git submodule update --remote backend
git add backend && git commit -m "Bump backend submodule" && git push
```

Two commits: one inside the layer, one bumping the pointer on `main`. This keeps the superproject history clean and reproducible.

## Key Ideas

- **Orphan branches** give each layer independent history (no shared commits)
- **Gitlinks** are commit pointers; `git ls-tree main` shows them as `160000 commit` entries
- **Submodules track branches**, not commits—`git submodule update --remote` fetches the latest
- Plain clones leave submodules empty—always use `--recurse-submodules`
- The superproject is a pinned snapshot; update it deliberately, never accidentally

## Next Steps

- See [docs/railway-deployment.md](docs/railway-deployment.md) to ship Snip online
- Build a release branch (`bundle`) that combines backend + built frontend + CLI
- Add GitHub Actions CI to rebuild the bundle on a schedule or on frontend/backend pushes
