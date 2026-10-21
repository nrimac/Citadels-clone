import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { applyAction, createGame, getActiveSeat, getView } from '../shared/engine/index.js';
import { getEdition } from '../shared/content/index.js';
import { giveCity, giveHand, lastEvent, newGame, startPlay } from './helpers.js';

const ok = (res) => assert.equal(res.error, undefined, res.error) || assert.ok(res.ok);
const rejects = (res, pattern) => {
  assert.equal(res.ok, false);
  if (pattern) assert.match(res.error, pattern);
};

describe('setup', () => {
  test('deals 2 gold and 4 cards to everyone from a 66-card deck', () => {
    for (let n = 2; n <= 7; n++) {
      const s = newGame(n);
      assert.equal(s.players.length, n);
      for (const p of s.players) {
        assert.equal(p.gold, 2);
        assert.equal(p.hand.length, 4);
      }
      assert.equal(s.deck.length + n * 4, 66);
    }
  });

  test('rejects unsupported player counts', () => {
    assert.throws(() => newGame(1));
    assert.throws(() => newGame(8));
  });

  test('city goal option is honored and clamped', () => {
    assert.equal(newGame(4, { cityGoal: 7 }).options.cityGoal, 7);
    assert.equal(newGame(4, { cityGoal: 99 }).options.cityGoal, 12);
    assert.equal(newGame(4).options.cityGoal, getEdition('classic').cityGoal);
  });
});

describe('draft', () => {
  test('face-up discards follow the player count and never include the King', () => {
    const expected = { 4: 2, 5: 1, 6: 0, 7: 0 };
    for (let seed = 1; seed < 200; seed++) {
      for (const [n, faceUp] of Object.entries(expected)) {
        const s = newGame(Number(n), {}, seed);
        assert.equal(s.draft.faceUp.length, faceUp);
        assert.ok(!s.draft.faceUp.includes('king'));
        assert.equal(s.draft.faceDown.length, 1);
      }
    }
  });

  test('crown holder picks first, then clockwise', () => {
    const s = newGame(5);
    const order = [];
    while (s.phase === 'draft') {
      const seat = getActiveSeat(s);
      order.push(seat);
      ok(applyAction(s, seat, { type: 'pick', character: s.draft.pool[0] }));
    }
    assert.deepEqual(
      order,
      [0, 1, 2, 3, 4].map((i) => (s.log.find((e) => e.type === 'round-start').crown + i) % 5),
    );
  });

  test('only the picker may pick, and only from the pool', () => {
    const s = newGame(4);
    const seat = getActiveSeat(s);
    const other = (seat + 1) % 4;
    rejects(applyAction(s, other, { type: 'pick', character: s.draft.pool[0] }), /not your turn/);
    rejects(applyAction(s, seat, { type: 'pick', character: 'dragon' }), /not available/);
    if (s.draft.faceUp.length) rejects(applyAction(s, seat, { type: 'pick', character: s.draft.faceUp[0] }));
  });

  test('two players each take two characters and discard face down', () => {
    const s = newGame(2);
    const kinds = [];
    while (s.phase === 'draft') {
      const seat = getActiveSeat(s);
      const step = s.draft.steps[s.draft.step];
      kinds.push(step.kind);
      const type = step.kind === 'pick' ? 'pick' : 'discardCharacter';
      ok(applyAction(s, seat, { type, character: s.draft.pool[0] }));
    }
    assert.deepEqual(kinds, ['pick', 'pick', 'discard', 'pick', 'discard', 'pick', 'discard']);
    const counts = [0, 0];
    Object.values(s.owners).forEach((seat) => counts[seat]++);
    assert.deepEqual(counts, [2, 2]);
  });

  test('three players each take two characters', () => {
    const s = newGame(3);
    while (s.phase === 'draft') {
      ok(applyAction(s, getActiveSeat(s), { type: 'pick', character: s.draft.pool[0] }));
    }
    const counts = [0, 0, 0];
    Object.values(s.owners).forEach((seat) => counts[seat]++);
    assert.deepEqual(counts, [2, 2, 2]);
  });

  test('with seven players the last player may take the face-down card', () => {
    const s = newGame(7);
    const hidden = s.draft.faceDown[0];
    for (let i = 0; i < 6; i++) ok(applyAction(s, getActiveSeat(s), { type: 'pick', character: s.draft.pool[0] }));
    assert.equal(s.draft.pool.length, 2);
    assert.ok(s.draft.pool.includes(hidden));
    const last = getActiveSeat(s);
    ok(applyAction(s, last, { type: 'pick', character: hidden }));
    assert.equal(s.owners[hidden], last);
  });

  test('other players cannot see the pool or your picks', () => {
    const s = newGame(4);
    const picker = getActiveSeat(s);
    const other = (picker + 1) % 4;
    assert.ok(getView(s, picker).draft.pool.length > 0);
    assert.equal(getView(s, other).draft.pool, null);
    ok(applyAction(s, picker, { type: 'pick', character: s.draft.pool[0] }));
    assert.equal(getView(s, picker).players[picker].characters.length, 1);
    assert.equal(getView(s, other).players[picker].characters.length, 0);
    const pickEvent = getView(s, other).log.find((e) => e.type === 'pick');
    assert.equal(pickEvent.private, undefined);
  });
});

describe('turns', () => {
  test('characters are called in rank order and absent ones are skipped', () => {
    const s = startPlay(newGame(4), { thief: 0, king: 1, merchant: 2, warlord: 3 });
    assert.equal(s.turn.character, 'thief');
    const called = s.log.filter((e) => e.type === 'call').map((e) => e.character);
    assert.deepEqual(called, ['assassin', 'thief']);
  });

  test('take gold, merchant bonus, then income at end of turn', () => {
    const s = newGame(4);
    giveCity(s, 2, ['tavern', 'market']);
    startPlay(s, { merchant: 2, king: 0 });
    // King plays first.
    ok(applyAction(s, 0, { type: 'takeGold' }));
    ok(applyAction(s, 0, { type: 'endTurn' }));
    assert.equal(s.turn.character, 'merchant');
    const before = s.players[2].gold;
    ok(applyAction(s, 2, { type: 'takeGold' }));
    assert.equal(s.players[2].gold, before + 3);
    ok(applyAction(s, 2, { type: 'endTurn' }));
    assert.equal(s.players[2].gold, before + 5);
  });

  test('cannot end the turn or build before taking an action', () => {
    const s = newGame(4);
    const [uid] = giveHand(s, 0, ['temple']);
    startPlay(s, { king: 0 });
    rejects(applyAction(s, 0, { type: 'endTurn' }), /before ending/);
    rejects(applyAction(s, 0, { type: 'build', card: uid }), /before building/);
  });

  test('drawing cards: keep one, return the other to the bottom of the deck', () => {
    const s = startPlay(newGame(4), { king: 0 });
    const handBefore = s.players[0].hand.length;
    ok(applyAction(s, 0, { type: 'drawCards' }));
    assert.equal(s.turn.drawn.length, 2);
    rejects(applyAction(s, 0, { type: 'endTurn' }), /keep/);
    rejects(applyAction(s, 0, { type: 'keep', cards: s.turn.drawn }), /exactly 1/);
    const [keep, toss] = s.turn.drawn;
    ok(applyAction(s, 0, { type: 'keep', cards: [keep] }));
    assert.equal(s.players[0].hand.length, handBefore + 1);
    assert.equal(s.deck[s.deck.length - 1], toss);
  });

  test('Observatory draws three; Library keeps the extra card', () => {
    const s = newGame(4);
    giveCity(s, 0, ['observatory', 'library']);
    startPlay(s, { king: 0 });
    ok(applyAction(s, 0, { type: 'drawCards' }));
    assert.equal(s.turn.drawn.length, 3);
    assert.equal(s.turn.keep, 2);

    const s2 = newGame(4);
    giveCity(s2, 0, ['library']);
    startPlay(s2, { king: 0 });
    const before = s2.players[0].hand.length;
    ok(applyAction(s2, 0, { type: 'drawCards' }));
    assert.equal(s2.turn.drawn, null);
    assert.equal(s2.players[0].hand.length, before + 2);
  });

  test('build rules: cost, duplicates, one per turn', () => {
    const s = newGame(4);
    s.players[0].hand = [];
    const [palace, temple, tavern, temple2] = giveHand(s, 0, ['palace', 'temple', 'tavern', 'temple']);
    giveCity(s, 0, ['church']);
    startPlay(s, { king: 0 });
    s.players[0].gold = 4;
    ok(applyAction(s, 0, { type: 'takeGold' }));
    ok(applyAction(s, 0, { type: 'build', card: temple }));
    assert.equal(s.players[0].gold, 5);
    rejects(applyAction(s, 0, { type: 'build', card: tavern }), /any more/);
    // A second temple would be a duplicate next turn.
    s.turn.builds = 0;
    rejects(applyAction(s, 0, { type: 'build', card: temple2 }), /already have/);
    s.players[0].gold = 4;
    rejects(applyAction(s, 0, { type: 'build', card: palace }), /afford/);
  });

  test('the Architect draws two extra cards and may build three districts', () => {
    const s = newGame(4);
    s.players[1].hand = [];
    const cards = giveHand(s, 1, ['temple', 'tavern', 'watchtower', 'church']);
    startPlay(s, { architect: 1 });
    s.players[1].gold = 10;
    ok(applyAction(s, 1, { type: 'takeGold' }));
    assert.equal(s.players[1].hand.length, 6);
    ok(applyAction(s, 1, { type: 'build', card: cards[0] }));
    ok(applyAction(s, 1, { type: 'build', card: cards[1] }));
    ok(applyAction(s, 1, { type: 'build', card: cards[2] }));
    rejects(applyAction(s, 1, { type: 'build', card: cards[3] }), /any more/);
  });

  test('the King takes the crown when called', () => {
    const s = newGame(4);
    s.crown = 0;
    startPlay(s, { king: 2 });
    assert.equal(s.crown, 2);
  });
});

describe('character abilities', () => {
  test('a murdered character loses their turn and is revealed at round end', () => {
    const s = startPlay(newGame(4), { assassin: 0, merchant: 1, warlord: 2 });
    ok(applyAction(s, 0, { type: 'ability', ability: 'murder', target: 'merchant' }));
    rejects(applyAction(s, 0, { type: 'ability', ability: 'murder', target: 'warlord' }), /already used/);
    ok(applyAction(s, 0, { type: 'takeGold' }));
    ok(applyAction(s, 0, { type: 'endTurn' }));
    assert.equal(s.turn.character, 'warlord');
    const call = s.log.find((e) => e.type === 'call' && e.character === 'merchant');
    assert.equal(call.murdered, true);
    assert.equal(call.seat, null);
  });

  test('the Assassin cannot target themselves or face-up characters', () => {
    const s = startPlay(newGame(4), { assassin: 0, king: 1 }, { faceUp: ['bishop', 'thief'] });
    const options = getView(s, 0).legal.turn.abilities.find((a) => a.id === 'murder').options;
    assert.ok(!options.includes('assassin'));
    assert.ok(!options.includes('bishop'));
    assert.ok(options.includes('king'));
  });

  test('a murdered King still claims the crown at the end of the round', () => {
    const s = newGame(4);
    s.crown = 3;
    startPlay(s, { assassin: 0, king: 1 });
    ok(applyAction(s, 0, { type: 'ability', ability: 'murder', target: 'king' }));
    ok(applyAction(s, 0, { type: 'takeGold' }));
    ok(applyAction(s, 0, { type: 'endTurn' }));
    assert.equal(s.round, 2);
    assert.equal(s.crown, 1);
    assert.ok(lastEvent(s, 'murder-revealed'));
  });

  test('the Thief takes all gold when the robbed character is revealed', () => {
    const s = startPlay(newGame(4), { thief: 0, merchant: 1 });
    s.players[1].gold = 7;
    rejects(applyAction(s, 0, { type: 'ability', ability: 'rob', target: 'assassin' }));
    ok(applyAction(s, 0, { type: 'ability', ability: 'rob', target: 'merchant' }));
    const before = s.players[0].gold;
    ok(applyAction(s, 0, { type: 'takeGold' }));
    ok(applyAction(s, 0, { type: 'endTurn' }));
    assert.equal(s.players[1].gold, 0);
    assert.equal(s.players[0].gold, before + 2 + 7);
  });

  test('the Thief cannot rob the murdered character', () => {
    const s = startPlay(newGame(4), { assassin: 0, thief: 1, king: 2 });
    ok(applyAction(s, 0, { type: 'ability', ability: 'murder', target: 'king' }));
    ok(applyAction(s, 0, { type: 'takeGold' }));
    ok(applyAction(s, 0, { type: 'endTurn' }));
    rejects(applyAction(s, 1, { type: 'ability', ability: 'rob', target: 'king' }), /Invalid target/);
  });

  test('the Magician exchanges hands or redraws', () => {
    const s = startPlay(newGame(4), { magician: 0 });
    const mine = [...s.players[0].hand];
    const theirs = [...s.players[2].hand];
    ok(applyAction(s, 0, { type: 'ability', ability: 'exchange', target: 2 }));
    assert.deepEqual(s.players[0].hand, theirs);
    assert.deepEqual(s.players[2].hand, mine);
    rejects(applyAction(s, 0, { type: 'ability', ability: 'redraw', cards: [s.players[0].hand[0]] }), /already used/);

    const s2 = startPlay(newGame(4), { magician: 0 });
    const discard = s2.players[0].hand.slice(0, 2);
    ok(applyAction(s2, 0, { type: 'ability', ability: 'redraw', cards: discard }));
    assert.equal(s2.players[0].hand.length, 4);
    assert.ok(discard.every((uid) => !s2.players[0].hand.includes(uid)));
  });

  test('the Warlord destroys for cost - 1, respecting Bishop, Keep, Great Wall and complete cities', () => {
    const s = newGame(4, { cityGoal: 8 });
    const [bTemple] = giveCity(s, 1, ['temple']);
    const [castle, keep] = giveCity(s, 2, ['castle', 'keep']);
    giveCity(s, 3, ['great-wall']);
    const [walledManor] = giveCity(s, 3, ['manor']);
    startPlay(s, { bishop: 1, warlord: 0 });
    // Bishop's turn.
    ok(applyAction(s, 1, { type: 'takeGold' }));
    ok(applyAction(s, 1, { type: 'endTurn' }));
    assert.equal(s.turn.character, 'warlord');
    s.players[0].gold = 10;
    const options = getView(s, 0).legal.turn.abilities.find((a) => a.id === 'destroy').options;
    assert.ok(!options.some((o) => o.uid === bTemple), 'bishop is protected');
    assert.ok(!options.some((o) => o.uid === keep), 'keep is indestructible');
    assert.equal(options.find((o) => o.uid === walledManor).cost, 3, 'great wall adds 1');
    ok(applyAction(s, 0, { type: 'ability', ability: 'destroy', target: { seat: 2, uid: castle } }));
    assert.equal(s.players[0].gold, 7);
    assert.ok(!s.players[2].city.some((e) => e.uid === castle));
    assert.equal(s.deck[s.deck.length - 1], castle);
  });

  test('a murdered Bishop offers no protection', () => {
    const s = newGame(4);
    const [temple] = giveCity(s, 1, ['temple']);
    startPlay(s, { assassin: 2, bishop: 1, warlord: 0 });
    ok(applyAction(s, 2, { type: 'ability', ability: 'murder', target: 'bishop' }));
    ok(applyAction(s, 2, { type: 'takeGold' }));
    ok(applyAction(s, 2, { type: 'endTurn' }));
    assert.equal(s.turn.character, 'warlord');
    ok(applyAction(s, 0, { type: 'ability', ability: 'destroy', target: { seat: 1, uid: temple } }));
  });

  test('completed cities cannot be targeted by the Warlord', () => {
    const s = newGame(4, { cityGoal: 4 });
    const [manor] = giveCity(s, 1, ['manor', 'temple', 'tavern', 'prison']);
    startPlay(s, { warlord: 0 });
    s.players[0].gold = 10;
    rejects(applyAction(s, 0, { type: 'ability', ability: 'destroy', target: { seat: 1, uid: manor } }));
  });

  test('a Graveyard owner may buy back a destroyed district', () => {
    const s = newGame(4);
    const [castle] = giveCity(s, 2, ['castle']);
    giveCity(s, 3, ['graveyard']);
    startPlay(s, { warlord: 0 });
    s.players[0].gold = 5;
    s.players[3].gold = 3;
    ok(applyAction(s, 0, { type: 'ability', ability: 'destroy', target: { seat: 2, uid: castle } }));
    assert.equal(getActiveSeat(s), 3);
    rejects(applyAction(s, 0, { type: 'takeGold' }), /another player/);
    ok(applyAction(s, 3, { type: 'graveyard', accept: true }));
    assert.equal(s.players[3].gold, 2);
    assert.ok(s.players[3].hand.includes(castle));
    assert.equal(getActiveSeat(s), 0);
  });
});

describe('districts with actions', () => {
  test('Laboratory turns a card into gold once per turn', () => {
    const s = newGame(4);
    giveCity(s, 0, ['laboratory']);
    startPlay(s, { king: 0 });
    const card = s.players[0].hand[0];
    const gold = s.players[0].gold;
    ok(applyAction(s, 0, { type: 'district', district: 'laboratory', card }));
    assert.equal(s.players[0].gold, gold + 1);
    rejects(applyAction(s, 0, { type: 'district', district: 'laboratory', card: s.players[0].hand[0] }), /already used/);
  });

  test('Smithy: pay 2 gold, draw 3 cards', () => {
    const s = newGame(4);
    giveCity(s, 0, ['smithy']);
    startPlay(s, { king: 0 });
    s.players[0].gold = 2;
    const hand = s.players[0].hand.length;
    ok(applyAction(s, 0, { type: 'district', district: 'smithy' }));
    assert.equal(s.players[0].gold, 0);
    assert.equal(s.players[0].hand.length, hand + 3);
  });

  test('School of Magic counts for income', () => {
    const s = newGame(4);
    giveCity(s, 0, ['school-of-magic', 'manor']);
    startPlay(s, { king: 0 });
    const gold = s.players[0].gold;
    ok(applyAction(s, 0, { type: 'income' }));
    assert.equal(s.players[0].gold, gold + 2);
    rejects(applyAction(s, 0, { type: 'income' }), /already collected/);
  });
});

describe('end of game and scoring', () => {
  test('completing a city ends the game at the end of the round with bonuses', () => {
    const s = newGame(4, { cityGoal: 4 });
    giveCity(s, 0, ['manor', 'temple', 'tavern']);
    giveCity(s, 1, ['castle', 'church', 'market']);
    s.players[0].hand = [];
    s.players[1].hand = [];
    const [w0] = giveHand(s, 0, ['watchtower']);
    const [w1] = giveHand(s, 1, ['prison']);
    startPlay(s, { king: 0, merchant: 1 });
    s.players[0].gold = 5;
    s.players[1].gold = 5;
    ok(applyAction(s, 0, { type: 'takeGold' }));
    ok(applyAction(s, 0, { type: 'build', card: w0 }));
    assert.equal(s.firstComplete, 0);
    ok(applyAction(s, 0, { type: 'endTurn' }));
    assert.equal(s.phase, 'play', 'the round continues');
    ok(applyAction(s, 1, { type: 'takeGold' }));
    ok(applyAction(s, 1, { type: 'build', card: w1 }));
    ok(applyAction(s, 1, { type: 'endTurn' }));
    assert.equal(s.phase, 'over');
    const [a, b] = s.result.scores;
    assert.equal(a.districts, 3 + 1 + 1 + 1);
    assert.equal(a.complete, 4);
    assert.equal(b.districts, 4 + 2 + 2 + 2);
    assert.equal(b.complete, 2);
    assert.equal(s.result.winner, 1);
  });

  test('five suits earn the bonus; one wild Haunted City cannot fill two gaps', async () => {
    const { __internals } = await import('../shared/engine/game.js');
    const s = newGame(4);
    s.round = 5;
    giveCity(s, 0, ['manor', 'temple', 'tavern', 'prison', 'dragon-gate'], 1);
    giveCity(s, 1, ['manor', 'temple', 'tavern'], 1);
    giveCity(s, 1, ['haunted-city'], 2);
    s.phase = 'play';
    s.owners = {};
    s.firstComplete = 3;
    s.callIndex = s.characters.length - 1;
    __internals.advance(s);
    assert.equal(s.phase, 'over');
    const [p0, p1] = s.result.scores;
    assert.equal(p0.districts, 3 + 1 + 1 + 2 + 8, 'dragon gate is worth 8');
    assert.equal(p0.allSuits, 3);
    assert.equal(p1.allSuits, 0, 'military and unique are both missing');
  });

  test('a single Haunted City can stand in for the missing suit, unless built in the final round', async () => {
    const { __internals } = await import('../shared/engine/game.js');
    const finish = (builtRound) => {
      const s = newGame(4);
      s.round = 4;
      giveCity(s, 0, ['manor', 'temple', 'tavern', 'library'], 1);
      giveCity(s, 0, ['haunted-city'], builtRound);
      s.phase = 'play';
      s.owners = {};
      s.firstComplete = 2;
      s.callIndex = s.characters.length - 1;
      __internals.advance(s);
      return s.result.scores[0].allSuits;
    };
    assert.equal(finish(2), 3, 'haunted city counts as military');
    assert.equal(finish(4), 0, 'built in the final round');
  });
});

describe('robustness', () => {
  test('invalid input never corrupts state', () => {
    const s = startPlay(newGame(4), { king: 0 });
    const snapshot = JSON.stringify(s);
    for (const bad of [
      null,
      {},
      { type: 'build', card: 'abc' },
      { type: 'keep', cards: 'x' },
      { type: 'ability', ability: 'murder', target: 'king' },
      { type: 'district', district: 'smithy' },
      { type: 'pick', character: 'king' },
      { type: '__proto__' },
    ]) {
      const res = applyAction(s, 0, bad);
      assert.equal(res.ok, false);
    }
    assert.equal(JSON.stringify(s), snapshot);
  });

  test('state is JSON serializable and survives a round-trip', () => {
    const s = createGame({
      players: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
        { id: 'c', name: 'C' },
      ],
      seed: 7,
    });
    const copy = JSON.parse(JSON.stringify(s));
    assert.deepEqual(getView(copy, 0), getView(s, 0));
  });
});
