const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const root = path.resolve(__dirname);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2'
};

function send(res, status, data, headers = {}) {
  res.writeHead(status, headers);
  res.end(data);
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = mime[ext] || 'application/octet-stream';
  try {
    const data = fs.readFileSync(filePath);
    send(res, 200, data, { 'Content-Type': type, 'Content-Length': data.length });
  } catch (e) {
    if (e.code === 'ENOENT') {
      send(res, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
    } else {
      send(res, 500, 'Internal Server Error', { 'Content-Type': 'text/plain; charset=utf-8' });
    }
  }
}

function safeJoin(base, target) {
  const targetPath = path.posix.normalize(target).replace(/^\/+/, '');
  return path.join(base, targetPath);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = url.pathname;

  // Simple API stub for local preview
  if (pathname.startsWith('/api/')) {
    if (pathname === '/api/public-env') {
      const env = {
        supabaseUrl: (global.__PUBLIC_ENV__ && global.__PUBLIC_ENV__.supabaseUrl) || 'https://vsjdinqfxazedrjigssx.supabase.co',
        supabaseAnonKey: (global.__PUBLIC_ENV__ && global.__PUBLIC_ENV__.supabaseAnonKey) || 'anon-key'
      };
      return send(res, 200, JSON.stringify(env), { 'Content-Type': 'application/json; charset=utf-8' });
    }
    return send(res, 404, JSON.stringify({ error: 'Not Found' }), { 'Content-Type': 'application/json; charset=utf-8' });
  }

  // Clean URLs: redirect /file.html -> /file
  if (pathname.endsWith('.html') && pathname !== '/index.html') {
    const clean = pathname.slice(0, -5);
    res.statusCode = 301;
    res.setHeader('Location', clean);
    return res.end();
  }

  // Rewrites (mimic vercel.json)
  if (pathname === '/login') pathname = '/login.html';
  if (pathname === '/signup') pathname = '/signup.html';

  // Static file resolution
  let filePath = safeJoin(root, pathname);

  // If path is directory, try index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return serveFile(res, filePath);
  }

  // SPA fallback for other routes to index.html
  return serveFile(res, path.join(root, 'index.html'));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Preview server running at http://0.0.0.0:${port}`);
});
