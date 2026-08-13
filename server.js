import { readFileSync, statSync } from 'fs';
import { join } from 'path';

const PORT = parseInt(process.env.PORT || '3000');
const RAILWAY_PUBLIC_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN;
const BASE_URL = process.env.BASE_URL || 
  (RAILWAY_PUBLIC_DOMAIN ? `https://${RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:3000');
const PUBLIC_DIR = process.env.PUBLIC_DIR;

// In-memory storage
const links = new Map();

// Base62 alphabet for generating codes
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// Generate a random 6-character base62 code
function generateCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += BASE62_CHARS[Math.floor(Math.random() * 62)];
  }
  return code;
}

// Validate URL
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Parse JSON body
async function parseBody(req) {
  const buffer = await req.arrayBuffer();
  const text = new TextDecoder().decode(buffer);
  return text ? JSON.parse(text) : null;
}

// Try to serve a static file from PUBLIC_DIR
async function tryServeStaticFile(pathname) {
  if (!PUBLIC_DIR) return null;
  
  try {
    let filePath = pathname === '/' ? '/index.html' : pathname;
    const fullPath = join(PUBLIC_DIR, filePath);
    
    // Security: prevent directory traversal
    if (!fullPath.startsWith(PUBLIC_DIR)) return null;
    
    const stats = statSync(fullPath);
    if (!stats.isFile()) return null;
    
    const content = readFileSync(fullPath);
    const ext = filePath.split('.').pop();
    const mimeTypes = {
      html: 'text/html',
      js: 'application/javascript',
      css: 'text/css',
      json: 'application/json',
      png: 'image/png',
      jpg: 'image/jpeg',
      svg: 'image/svg+xml',
      woff: 'font/woff',
      woff2: 'font/woff2',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    return new Response(content, {
      headers: { 'Content-Type': contentType }
    });
  } catch {
    return null;
  }
}

// Main request handler
async function handleRequest(req) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  // POST /api/links - create a short link
  if (method === 'POST' && pathname === '/api/links') {
    try {
      const body = await parseBody(req);
      
      if (!body || typeof body.url !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON: url is required' }),
          { 
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }

      if (!isValidUrl(body.url)) {
        return new Response(
          JSON.stringify({ error: 'Invalid URL: must be http(s)' }),
          { 
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }

      const code = generateCode();
      const linkData = {
        code,
        url: body.url,
        shortUrl: `${BASE_URL}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString()
      };

      links.set(code, linkData);

      return new Response(JSON.stringify(linkData), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }
  }

  // GET /api/links - list all links
  if (method === 'GET' && pathname === '/api/links') {
    const allLinks = Array.from(links.values());
    return new Response(JSON.stringify(allLinks), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }

  // GET /:code - redirect to original URL
  if (method === 'GET' && pathname.length > 1) {
    const code = pathname.slice(1);
    
    if (links.has(code)) {
      const linkData = links.get(code);
      linkData.hits++;

      return new Response(null, {
        status: 302,
        headers: {
          'Location': linkData.url,
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  }

  // Try serving static files if PUBLIC_DIR is set
  if (method === 'GET') {
    const staticResponse = await tryServeStaticFile(pathname);
    if (staticResponse) return staticResponse;
  }

  // 404 for unknown routes
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}

// Start server
const server = Bun.serve({
  port: PORT,
  fetch: handleRequest,
});

console.log(`Snip backend running on ${BASE_URL}`);
