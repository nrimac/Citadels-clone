import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { applyAction, createGame, getActiveSeat, getView } from '../shared/engine/index.js';
import { chooseAction } from '../shared/bots/index.js';
import { GameHost } from '../shared/host/GameHost.js';

function playOut(n, levels, seed) {
  const s = createGame({ players: Array.from({ length: n }, (_, i) => ({ id: `b${i}`, name: `Bot ${i}` })), seed });
  let steps = 0;
  while (s.phase !== 'over') {
    const seat = getActiveSeat(s);
    const action = chooseAction(getView(s, seat), levels[seat % levels.length]);
    const res = applyAction(s, seat, action);
    assert.ok(res.ok, `bot made an illegal move: ${res.error} ${JSON.stringify(action)}`);
    assert.ok(++steps < 5000, 'game did not terminate');
  }
  return s;
}

describe('bots', () => {
  for (let n = 2; n <= 7; n++) {
    test(`${n} bots finish a game with only legal moves`, () => {
      for (let seed = 1; seed <= 6; seed++) {
        const s = playOut(n, ['easy', 'normal', 'hard'], seed * 97 + n);
        assert.equal(s.phase, 'over');
        assert.ok(s.result.scores[s.result.winner].total > 0);
      }
    });
  }
});

describe('GameHost', () => {
  test('runs an all-bot game to completion with instant pacing', async () => {
    const seats = Array.from({ length: 4 }, (_, i) => ({ id: `s${i}`, name: `S${i}`, kind: 'bot', level: 'normal' }));
    let changes = 0;
    await new Promise((resolve) => {
      const host = new GameHost({
        seats,
        pacing: 'instant',
        onChange: (h) => {
          changes++;
          if (h.over) {
            h.destroy();
            resolve();
          }
        },
      });
      host.start();
    });
    assert.ok(changes > 20);
  });

  test('humans act through submit; bots fill the remaining seats', async () => {
    const seats = [
      { id: 'h', name: 'Human', kind: 'human' },
      { id: 'b1', name: 'B1', kind: 'bot' },
      { id: 'b2', name: 'B2', kind: 'bot' },
    ];
    const host = new GameHost({ seats, pacing: 'instant' });
    host.start();
    // Let the bots act until it's the human's move.
    for (let i = 0; i < 200 && host.activeSeat() !== 0; i++) await new Promise((r) => setTimeout(r, 1));
    assert.equal(host.activeSeat(), 0);
    const view = host.view(0);
    assert.ok(view.legal.pick?.length);
    assert.equal(view.players[1].kind, 'bot');
    const bad = host.submit(1, { type: 'pick', character: view.legal.pick[0] });
    assert.equal(bad.ok, false);
    const res = host.submit(0, { type: 'pick', character: view.legal.pick[0] });
    assert.ok(res.ok);
    host.destroy();
  });

  test('an idle human is handed to the autopilot after the turn timeout', async () => {
    const seats = [
      { id: 'h', name: 'Human', kind: 'human' },
      { id: 'h2', name: 'Human 2', kind: 'human' },
    ];
    const host = new GameHost({ seats, pacing: 'instant', turnTimeout: 20 });
    host.start();
    await new Promise((r) => setTimeout(r, 120));
    assert.ok(host.seats.some((s) => s.autopilot));
    assert.ok(host.state.seq > 2, 'the autopilot made progress');
    host.destroy();
  });
});
