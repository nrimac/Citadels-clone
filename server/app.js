// HTTP + WebSocket server factory. Serves the static client, the shared
// (isomorphic) game code, a health check, and the realtime room service.

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { RoomManager } from './rooms.js';
import { attachSockets } from './sockets.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLIENT_DIR = path.join(ROOT, 'client');
const SHARED_DIR = path.join(ROOT, 'shared');

export function createServer(options = {}) {
  const manager = new RoomManager(options);
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);

  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'same-origin');
    res.set('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  app.get('/healthz', (req, res) => res.json({ ok: true, ...manager.stats() }));

  const staticOptions = { etag: true, maxAge: 0, index: 'index.html' };
  app.use('/shared', express.static(SHARED_DIR, staticOptions));
  app.use(express.static(CLIENT_DIR, staticOptions));

  // Friendly invite links: /join/ABCDE opens the app with the code pre-filled.
  app.get('/join/:code', (req, res) => res.sendFile(path.join(CLIENT_DIR, 'index.html')));
  app.use((req, res) => res.status(404).sendFile(path.join(CLIENT_DIR, 'index.html')));

  const server = http.createServer(app);
  const wss = attachSockets(server, manager, { rate: options.rate });

  function close() {
    manager.shutdown();
    for (const ws of wss.clients) ws.terminate();
    wss.close();
    return new Promise((resolve) => server.close(() => resolve()));
  }

  return { app, server, manager, wss, close };
}
