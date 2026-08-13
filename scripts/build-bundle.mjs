#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const PUSH = args.includes('--push');

function log(msg) {
  console.log(`[build-bundle] ${msg}`);
}

function run(cmd, options = {}) {
  try {
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...options });
    return output.trim();
  } catch (error) {
    log(`Command failed: ${cmd}`);
    log(error.message);
    throw error;
  }
}

function ensureDir(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function copyDir(src, dst) {
  ensureDir(dst);
  const items = readdirSync(src);
  items.forEach(item => {
    const srcPath = join(src, item);
    const dstPath = join(dst, item);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      copyFileSync(srcPath, dstPath);
    }
  });
}

try {
  log('Updating submodules to branch tips...');
  run('git submodule update --init --remote backend frontend cli');

  log('Building frontend...');
  run('cd frontend && npm install', { stdio: 'inherit' });
  run('cd frontend && npx ng build', { stdio: 'inherit' });

  // Verify build output exists
  const buildPath = 'frontend/dist/snip-frontend/browser/index.html';
  if (!existsSync(buildPath)) {
    throw new Error(`Frontend build failed: ${buildPath} not found`);
  }
  log('Frontend build succeeded');

  log('Assembling bundle...');
  ensureDir('bundle/public');

  // Copy backend server
  log('Copying backend server...');
  copyFileSync('backend/server.js', 'bundle/server.js');

  // Copy CLI
  log('Copying CLI...');
  copyFileSync('cli/cli.js', 'bundle/cli.js');
  copyFileSync('cli/snip', 'bundle/snip');
  copyFileSync('cli/snip.cmd', 'bundle/snip.cmd');
  copyFileSync('cli/snip.ps1', 'bundle/snip.ps1');

  // Copy built frontend
  log('Copying built frontend...');
  copyDir('frontend/dist/snip-frontend/browser', 'bundle/public');

  // Write .env
  log('Writing .env...');
  writeFileSync('bundle/.env', 'PUBLIC_DIR=./public\n');

  // Write package.json (no "type" field — CommonJS for cli.js compatibility)
  log('Writing package.json...');
  writeFileSync('bundle/package.json', JSON.stringify({
    name: 'snip-bundle',
    version: '1.0.0',
    description: 'Snip - unified release bundle',
    scripts: {
      start: 'bun server.js'
    }
  }, null, 2) + '\n');

  // Write Dockerfile
  log('Writing Dockerfile...');
  writeFileSync('bundle/Dockerfile', `FROM oven/bun:1-alpine
WORKDIR /app
COPY . .
ENV PORT=3000
EXPOSE 3000
CMD bun server.js
`);

  // Write .dockerignore
  log('Writing .dockerignore...');
  writeFileSync('bundle/.dockerignore', `node_modules
.git
.gitignore
README.md
`);

  // Write railway.json
  log('Writing railway.json...');
  writeFileSync('bundle/railway.json', JSON.stringify({
    $schema: 'https://railway.app/railway.schema.json',
    build: {
      builder: 'DOCKERFILE'
    },
    deploy: {
      startCommand: 'bun server.js',
      restartPolicyMaxRetries: 5
    }
  }, null, 2) + '\n');

  // Check if there are changes to commit
  log('Checking for changes...');
  const status = run('cd bundle && git status --porcelain');
  
  if (!status) {
    log('No changes to commit — bundle is up to date');
    process.exit(0);
  }

  log('Staging changes in bundle...');
  run('cd bundle && git add -A');
  
  log('Committing to bundle branch...');
  run('cd bundle && git commit -m "Build: assemble release bundle from backend, frontend, and CLI"');

  // Go back to main and update the bundle pointer
  log('Updating main with new bundle pointer...');
  run('git add bundle');
  
  const mainStatus = run('git status --porcelain');
  if (!mainStatus) {
    log('Bundle pointer unchanged on main');
    process.exit(0);
  }

  run('git commit -m "Bump bundle submodule"');

  if (PUSH) {
    log('Pushing bundle and main...');
    run('cd bundle && git push', { stdio: 'inherit' });
    run('git push', { stdio: 'inherit' });
    log('Done! Bundle and main pushed to origin');
  } else {
    log('--push not specified; bundle assembled but not pushed');
    log('To push: run again with --push flag');
  }

} catch (error) {
  log(`Error: ${error.message}`);
  process.exit(1);
}
