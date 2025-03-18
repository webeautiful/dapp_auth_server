import http from 'node:http';
import { getNonce, login } from './dapp.mjs';

const server = http.createServer(async function (req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL and method
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Route handling
  if (url.pathname === '/getNonce' && req.method === 'GET') {
    await getNonce(req, res);
  } else if (url.pathname === '/login' && req.method === 'POST') {
    await login(req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(8000);
