# Snip CLI

A zero-dependency Node.js CLI for the Snip URL shortener.

## Installation

With npm:
```bash
npm install -g snip-cli
```

Or use directly:
```bash
node cli.js <command> [args]
```

## Commands

### `snip add <url>`

Create a short link for the given URL.

```bash
snip add https://example.com/very/long/path
# Output: http://localhost:3000/aBcDeF
```

### `snip ls`

List all created short links with hit counts.

```bash
snip ls
# Output:
# Code  Hits  URL
# ------  ----  -----
# aBcDeF  2     https://example.com/very/long/path
# xYzAbC  0     https://google.com
```

### `snip open <code>`

Open a short link in your default web browser.

```bash
snip open aBcDeF
```

### `snip help`

Show usage information.

## Environment Variables

- `SNIP_API` — Backend API URL (default: `http://localhost:3000`)

Example:
```bash
SNIP_API=https://api.example.com snip ls
```

## Exit Codes

- `0` — Success
- `1` — Error (invalid input, unreachable backend, unknown code)
