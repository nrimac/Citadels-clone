// Builds a complete engine state that is consistent with one player's view,
// filling in everything that player cannot see (opponents' hands, the deck
// order, unrevealed characters) at random. Bots use these "possible worlds"
// to look ahead without ever peeking at the real hidden information.

import { getCharacter, getEdition } from '../content/index.js';
import { draftSteps, PHASE } from '../engine/game.js';

function shuffle(arr, random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function determinize(view, random = Math.random) {
  const edition = getEdition(view.edition);
  const me = view.you;
  const n = view.players.length;

  // ---------------------------------------------------------------- cards
  const cards = {};
  const seen = [];
  const note = (c) => {
    cards[c.uid] = c.id;
    seen.push(c.id);
  };
  view.players.forEach((p) => p.city.forEach(note));
  view.hand.forEach(note);
  view.turn?.drawn?.forEach(note);
  if (view.prompt?.card) note(view.prompt.card);

  const remaining = new Map(edition.districts.map((d) => [d.id, d.count]));
  for (const id of seen) remaining.set(id, (remaining.get(id) ?? 0) - 1);
  const unseen = [];
  for (const [id, count] of remaining) for (let k = 0; k < count; k++) unseen.push(id);
  shuffle(unseen, random);

  let nextUid = 100000;
  const fresh = () => {
    const uid = nextUid++;
    cards[uid] = unseen.pop();
    return uid;
  };

  const players = view.players.map((p) => ({
    id: p.id,
    name: p.name,
    gold: p.gold,
    hand: p.seat === me ? view.hand.map((c) => c.uid) : Array.from({ length: Math.min(p.handCount, unseen.length) }, fresh),
    city: p.city.map((c) => ({ uid: c.uid, builtRound: c.builtRound })),
  }));
  const deck = [];
  while (unseen.length) deck.push(fresh());

  // ---------------------------------------------------------------- characters
  const owners = {};
  for (const p of view.players) for (const c of p.characters) owners[c.id] = p.seat;
  const faceUp = [...(view.draft?.faceUp ?? [])];
  const pool = view.phase === PHASE.DRAFT && view.draft?.pool ? [...view.draft.pool] : [];

  // Characters that were called while nobody answered cannot be held by anyone.
  const absent = new Set(
    view.log.filter((e) => e.type === 'call' && e.round === view.round && e.seat == null && !e.murdered).map((e) => e.character),
  );
  let unknown = shuffle(
    view.characters.filter((id) => owners[id] == null && !faceUp.includes(id) && !pool.includes(id) && !absent.has(id)),
    random,
  );

  let draft;
  if (view.phase === PHASE.DRAFT) {
    const rules = edition.draft(n);
    const steps = draftSteps(n, view.crown, rules);
    const step = view.draft.step;
    // Earlier picks by other seats: give each one an unknown character.
    for (const s of steps.slice(0, step)) {
      if (s.kind !== 'pick' || s.seat === me) continue;
      const id = unknown.pop();
      if (id) owners[id] = s.seat;
    }
    // If we are not the one choosing, the remaining pool is unknown too.
    const draftPool = pool.length ? pool : unknown.splice(0, view.draft.poolCount);
    draft = {
      steps,
      step,
      pool: draftPool,
      faceUp,
      faceDown: [...unknown, ...[...absent]],
      mergeFaceDownOnLastPick: !!rules.mergeFaceDownOnLastPick,
    };
  } else {
    const expected = n <= 3 ? 2 : 1;
    // Uncalled characters are the only candidates for hidden hands.
    const calledRank = view.callIndex >= 0 ? getCharacter(view.characters[view.callIndex]).rank : 0;
    for (const p of view.players) {
      if (p.seat === me) continue;
      const held = view.characters.filter((id) => owners[id] === p.seat).length;
      for (let k = held; k < expected; k++) {
        // Prefer characters that can still be called; the murdered one was held by someone.
        let idx = unknown.findIndex((id) => getCharacter(id).rank > calledRank || id === view.murdered);
        if (idx < 0) idx = unknown.length - 1;
        if (idx < 0) break;
        const [id] = unknown.splice(idx, 1);
        owners[id] = p.seat;
      }
    }
    draft = { steps: [], step: 0, pool: [], faceUp, faceDown: [...unknown, ...absent], mergeFaceDownOnLastPick: false };
  }

  const turn = view.turn
    ? {
        seat: view.turn.seat,
        character: view.turn.character,
        actionTaken: view.turn.actionTaken,
        drawn: view.turn.drawn ? view.turn.drawn.map((c) => c.uid) : null,
        keep: view.turn.keep,
        builds: view.turn.builds,
        buildLimit: view.turn.buildLimit,
        incomeTaken: view.turn.incomeTaken,
        used: { ...view.turn.used },
      }
    : null;

  return {
    v: 1,
    edition: view.edition,
    options: { ...view.options },
    rng: Math.floor(random() * 0xffffffff) >>> 0,
    seq: 0,
    round: view.round,
    phase: view.phase,
    players,
    cards,
    deck,
    characters: [...view.characters],
    crown: view.crown,
    owners,
    revealed: { ...view.revealed },
    draft,
    callIndex: view.callIndex,
    murdered: view.murdered,
    robbed: view.robbed,
    robbedBy: view.robbed ? (owners.thief ?? null) : null,
    turn,
    prompt: view.prompt ? { type: view.prompt.type, seat: view.prompt.seat, card: view.prompt.card.uid, cost: view.prompt.cost } : null,
    firstComplete: view.firstComplete,
    lastRanks: {},
    log: [],
    result: null,
  };
}
