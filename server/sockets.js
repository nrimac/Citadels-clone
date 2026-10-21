// WebSocket transport: parses and rate-limits client messages and routes them
// to the RoomManager.

import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';
import { C, S, PROTOCOL_VERSION, normalizeCode } from '../shared/protocol.js';
import { RoomError } from './rooms.js';

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;
const HEARTBEAT_MS = 30_000;
const DEFAULT_RATE = { capacity: 40, refillPerSecond: 8 };

function allow(client, rate) {
  const now = Date.now();
  const b = client.bucket;
  b.tokens = Math.min(rate.capacity, b.tokens + ((now - b.last) / 1000) * rate.refillPerSecond);
  b.last = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}

function requireRoom(client) {
  if (!client.room) throw new RoomError('no-room', 'You are not at a table.');
  return client.room;
}

function requireHost(client) {
  const room = requireRoom(client);
  if (!room.isHost(client.seatId)) throw new RoomError('not-host', 'Only the host can do that.');
  return room;
}

function handle(manager, client, msg) {
  if (msg.t !== C.HELLO && !client.token) throw new RoomError('hello', 'Say hello first.');
  switch (msg.t) {
    case C.HELLO: {
      client.token = typeof msg.token === 'string' && TOKEN_RE.test(msg.token) ? msg.token : crypto.randomBytes(18).toString('base64url');
      client.send({ t: S.WELCOME, token: client.token, version: PROTOCOL_VERSION });
      if (!manager.resume(client)) client.send({ t: S.ROOM, room: null });
      return;
    }
    case C.CREATE:
      manager.createRoom(client, msg.name, msg.settings);
      return;
    case C.JOIN:
      manager.joinRoom(client, normalizeCode(msg.code), msg.name);
      return;
    case C.LEAVE:
      manager.leave(client);
      client.send({ t: S.LEFT, reason: 'left' });
      client.send({ t: S.ROOM, room: null });
      return;
    case C.SETTINGS:
      requireHost(client).updateSettings(msg.settings ?? {});
      return;
    case C.ADD_BOT:
      requireHost(client).addBot(msg.level);
      return;
    case C.REMOVE_SEAT: {
      const room = requireHost(client);
      if (msg.seatId === client.seatId) throw new RoomError('self', 'Use "leave" to leave the table.');
      room.removeSeat(String(msg.seatId), 'kicked');
      return;
    }
    case C.START:
      requireHost(client).start();
      return;
    case C.ACTION: {
      const result = requireRoom(client).handleAction(client.seatId, msg.action);
      if (!result.ok) client.send({ t: S.ACTION_ERROR, error: result.error });
      return;
    }
    case C.CHAT:
      requireRoom(client).addChat(client.seatId, msg.text);
      return;
    case C.REMATCH:
      requireHost(client).rematch();
      return;
    case C.PING:
      client.send({ t: S.PONG, at: Date.now() });
      return;
    default:
      throw new RoomError('unknown', 'Unknown message.');
  }
}

export function attachSockets(server, manager, { rate = DEFAULT_RATE } = {}) {
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });

  wss.on('connection', (ws) => {
    const client = {
      ws,
      token: null,
      room: null,
      seatId: null,
      bucket: { tokens: rate.capacity, last: Date.now() },
      send(message) {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
      },
    };

    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    ws.on('message', (data) => {
      if (!allow(client, rate)) {
        client.send({ t: S.ERROR, code: 'rate', message: 'Easy there — too many messages.' });
        return;
      }
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return;
      try {
        handle(manager, client, msg);
      } catch (err) {
        if (err instanceof RoomError) client.send({ t: S.ERROR, code: err.code, message: err.message });
        else {
          console.error('[ws] handler error', err);
          client.send({ t: S.ERROR, code: 'server', message: 'Something went wrong on the server.' });
        }
      }
    });
    ws.on('close', () => manager.onClose(client));
    ws.on('error', () => {});
  });

  // Drop connections that stop answering pings (e.g. a closed laptop lid).
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_MS);
  heartbeat.unref?.();
  wss.on('close', () => clearInterval(heartbeat));
  return wss;
}
