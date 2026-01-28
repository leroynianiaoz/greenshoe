#!/usr/bin/env node

/**
 * Simple HTTP server to serve the GreenShoe Progress Dashboard
 *
 * Usage:
 *   node dashboard-server.js
 *   npm run dashboard
 *
 * Then open: http://localhost:3333
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3333;

const mimeTypes = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  // Remove query string for file lookup
  let filePath = req.url.split('?')[0];

  if (filePath === '/') {
    filePath = '/dashboard.html';
  }

  const fullPath = path.join(__dirname, filePath);
  const ext = path.extname(fullPath);
  const contentType = mimeTypes[ext] || 'text/plain';

  // Security: prevent directory traversal
  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache' // Always get fresh data
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('\n🟢 GreenShoe Progress Dashboard');
  console.log('================================');
  console.log(`\n📊 Dashboard running at: http://localhost:${PORT}`);
  console.log(`\n💡 Tip: Keep this terminal open and the dashboard will auto-refresh\n`);
});
