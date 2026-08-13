# Snip Backend

A tiny URL shortener backend built with Bun.

## Features

- Single-file Bun server with zero npm dependencies
- In-memory link storage
- RESTful API for creating and redirecting short links
- CORS support for browser-based clients
- Optional static file serving
- Environment-based configuration

## API

### Create a short link

```
POST /api/links
Content-Type: application/json

{ "url": "https://example.com/very/long/path" }
```

Response (201 Created):
```json
{
  "code": "aBcDeF",
  "url": "https://example.com/very/long/path",
  "shortUrl": "http://localhost:3000/aBcDeF",
  "hits": 0,
  "createdAt": "2026-08-13T12:00:00.000Z"
}
```

### List all links

```
GET /api/links
```

Response (200 OK): Array of link objects

### Redirect to original URL

```
GET /:code
```

Response: 302 redirect to the original URL, incrementing hit count

## Configuration

Set these environment variables to customize behavior:

- `PORT` (default: 3000) — server port
- `BASE_URL` (default: http://localhost:3000) — origin for shortUrl values; falls back to https://$RAILWAY_PUBLIC_DOMAIN if set
- `PUBLIC_DIR` (optional) — path to static files folder; serves index.html at "/" and prioritizes files over short codes

## Running

```bash
bun start
```

Then test:

```bash
# Create a link
curl -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# List all links
curl http://localhost:3000/api/links

# Redirect (follows the Location header)
curl -i http://localhost:3000/aBcDeF
```
