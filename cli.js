#!/usr/bin/env node

const API_BASE = process.env.SNIP_API || 'http://localhost:3000';

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  
  return response.json();
}

async function addLink(url) {
  try {
    const result = await fetchJson(`${API_BASE}/api/links`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    
    if (result.error) {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
    
    console.log(result.shortUrl);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function listLinks() {
  try {
    const links = await fetchJson(`${API_BASE}/api/links`);
    
    if (links.length === 0) {
      console.log('No links yet.');
      return;
    }
    
    // Calculate column widths
    let maxCodeWidth = 4; // "Code"
    let maxUrlWidth = 3;  // "URL"
    let maxHitsWidth = 4; // "Hits"
    
    links.forEach(link => {
      maxCodeWidth = Math.max(maxCodeWidth, link.code.length);
      maxUrlWidth = Math.max(maxUrlWidth, link.url.length);
      maxHitsWidth = Math.max(maxHitsWidth, String(link.hits).length);
    });
    
    // Print header
    console.log(
      'Code'.padEnd(maxCodeWidth) + '  ' +
      'Hits'.padEnd(maxHitsWidth) + '  ' +
      'URL'
    );
    console.log('-'.repeat(maxCodeWidth + maxHitsWidth + maxUrlWidth + 6));
    
    // Print rows
    links.forEach(link => {
      console.log(
        link.code.padEnd(maxCodeWidth) + '  ' +
        String(link.hits).padEnd(maxHitsWidth) + '  ' +
        link.url
      );
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function openLink(code) {
  try {
    const response = await fetch(`${API_BASE}/${code}`, {
      redirect: 'manual',
    });
    
    if (response.status === 302) {
      const location = response.headers.get('Location');
      if (location) {
        // Open in browser
        const { exec } = require('child_process');
        const command = process.platform === 'win32' 
          ? `start ${location}`
          : process.platform === 'darwin'
          ? `open ${location}`
          : `xdg-open ${location}`;
        
        exec(command, (err) => {
          if (err) {
            console.error(`Failed to open browser: ${err.message}`);
            process.exit(1);
          }
        });
      }
    } else if (response.status === 404) {
      console.error('Error: Unknown code');
      process.exit(1);
    } else {
      console.error(`Error: HTTP ${response.status}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

function printUsage() {
  console.log(`Snip - tiny URL shortener CLI

Usage:
  snip add <url>     Create a short link
  snip ls            List all links
  snip open <code>   Open a link in the browser
  snip help          Show this help message

Environment:
  SNIP_API           Backend API URL (default: http://localhost:3000)

Examples:
  snip add https://example.com/very/long/path
  snip ls
  snip open aBcDeF
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    return;
  }
  
  const cmd = args[0];
  
  if (cmd === 'add') {
    if (!args[1]) {
      console.error('Error: URL required');
      process.exit(1);
    }
    await addLink(args[1]);
  } else if (cmd === 'ls') {
    await listLinks();
  } else if (cmd === 'open') {
    if (!args[1]) {
      console.error('Error: Code required');
      process.exit(1);
    }
    await openLink(args[1]);
  } else {
    console.error(`Error: Unknown command "${cmd}"`);
    process.exit(1);
  }
}

main();
