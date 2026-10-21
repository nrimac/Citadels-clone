import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';

import { createServer } from '../server/app.js';
import { C, S } from '../shared/protocol.js';
import { chooseAction } from '../shared/bots/index.js';

let srv;
let url;

before(async () => {
  srv = createServer({ forcePacing: 'instant', rate: { capacity: 1000, refillPerSecond: 1000 } });
  await new Promise((resolve) => srv.server.listen(0, '127.0.0.1', resolve));
  url = `ws://127.0.0.1:${srv.server.address().port}/ws`;
});

after(async () => {
  await srv.close();
});

/** Minimal test client that records messages and lets tests await them. */
function connect(token) {
  const ws = new WebSocket(url);
  const inbox = [];
  const waiters = [];
  const client = {
    ws,
    inbox,
    room: null,
    view: null,
    token: null,
    send: (msg) => ws.send(JSON.stringify(msg)),
    next(type, predicate = () => true, timeout = 4000) {
      const idx = inbox.findIndex((m) => m.t === type && predicate(m));
      if (idx >= 0) return Promise.resolve(inbox.splice(idx, 1)[0]);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timeout waiting for ${type}`)), timeout);
        waiters.push({ type, predicate, resolve, timer });
      });
    },
    close: () => ws.close(),
  };
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.t === S.ROOM) client.room = msg.room;
    if (msg.t === S.VIEW) client.view = msg.view;
    if (msg.t === S.WELCOME) client.token = msg.token;
    const w = waiters.findIndex((x) => x.type === msg.t && x.predicate(msg));
    if (w >= 0) {
      const [waiter] = waiters.splice(w, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(msg);
    } else inbox.push(msg);
  });
  return new Promise((resolve) => {
    ws.on('open', () => {
      client.send({ t: C.HELLO, token });
      resolve(client);
    });
  });
}

describe('online rooms', () => {
  test('health check responds', async () => {
    const port = srv.server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/healthz`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
  });

  test('serves the client and shared modules', async () => {
    const port = srv.server.address().port;
    const page = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(page.status, 200);
    const mod = await fetch(`http://127.0.0.1:${port}/shared/engine/index.js`);
    assert.equal(mod.status, 200);
    assert.match(mod.headers.get('content-type'), /javascript/);
  });

  test('unknown codes are rejected', async () => {
    const a = await connect();
    await a.next(S.WELCOME);
    a.send({ t: C.JOIN, code: 'ZZZZZ', name: 'Lost' });
    const err = await a.next(S.ERROR);
    assert.equal(err.code, 'not-found');
    a.close();
  });

  test('host creates, friend joins by code, bots fill in, game is played to the end', async () => {
    const host = await connect();
    await host.next(S.WELCOME);
    host.send({ t: C.CREATE, name: 'Alice', settings: { cityGoal: 6, pacing: 'fast', turnTimeout: 0 } });
    const created = await host.next(S.ROOM, (m) => m.room);
    const code = created.room.code;
    assert.match(code, /^[A-Z2-9]{5}$/);

    const friend = await connect();
    await friend.next(S.WELCOME);
    friend.send({ t: C.JOIN, code: code.toLowerCase(), name: 'Bob' });
    const joined = await friend.next(S.ROOM, (m) => m.room?.seats.length === 2);
    assert.equal(joined.room.seats[1].name, 'Bob');

    // Only the host may add bots or start.
    friend.send({ t: C.START });
    assert.equal((await friend.next(S.ERROR)).code, 'not-host');
    host.send({ t: C.ADD_BOT, level: 'easy' });
    await host.next(S.ROOM, (m) => m.room?.seats.length === 3);

    host.send({ t: C.START });
    await host.next(S.ROOM, (m) => m.room?.status === 'playing');

    // Play both humans with the bot brain until the game ends.
    const players = [host, friend];
    const deadline = Date.now() + 60_000;
    for (;;) {
      assert.ok(Date.now() < deadline, 'game took too long');
      await new Promise((r) => setTimeout(r, 5));
      const over = players.some((p) => p.view?.phase === 'over');
      if (over) break;
      for (const p of players) {
        const v = p.view;
        if (!v || !v.legal) continue;
        const mine = v.legal.pick || v.legal.discard || v.legal.turn || v.legal.prompt;
        if (!mine || p.lastSeq === v.seq) continue;
        p.lastSeq = v.seq;
        p.send({ t: C.ACTION, action: chooseAction(v, 'normal') });
      }
    }
    const final = host.view;
    assert.equal(final.phase, 'over');
    assert.ok(final.result.scores.length === 3);
    await host.next(S.ROOM, (m) => m.room?.status === 'over');

    // Hidden information never leaks: Bob cannot see Alice's hand.
    assert.equal(friend.view.hand.length, friend.view.players[1].handCount);

    host.send({ t: C.REMATCH });
    await friend.next(S.ROOM, (m) => m.room?.status === 'lobby');
    host.close();
    friend.close();
  });

  test('a player can reconnect to their seat with their token', async () => {
    const a = await connect();
    const { token } = await a.next(S.WELCOME);
    a.send({ t: C.CREATE, name: 'Carol' });
    const { room } = await a.next(S.ROOM, (m) => m.room);
    a.close();
    await new Promise((r) => setTimeout(r, 50));

    const again = await connect(token);
    await again.next(S.WELCOME);
    const resumed = await again.next(S.ROOM, (m) => m.room);
    assert.equal(resumed.room.code, room.code);
    assert.equal(resumed.room.seats[0].connected, true);
    again.send({ t: C.LEAVE });
    await again.next(S.LEFT);
    again.close();
  });

  test('chat messages are broadcast and sanitized', async () => {
    const a = await connect();
    await a.next(S.WELCOME);
    a.send({ t: C.CREATE, name: 'Dora' });
    const { room } = await a.next(S.ROOM, (m) => m.room);
    const b = await connect();
    await b.next(S.WELCOME);
    b.send({ t: C.JOIN, code: room.code, name: 'Dora' });
    const joined = await b.next(S.ROOM, (m) => m.room?.seats.length === 2);
    assert.equal(joined.room.seats[1].name, 'Dora 2', 'duplicate names are disambiguated');
    b.send({ t: C.CHAT, text: '  hello\u0007 there  ' });
    const msg = await a.next(S.CHAT, (m) => m.message);
    assert.equal(msg.message.text, 'hello there');
    a.close();
    b.close();
  });
});
