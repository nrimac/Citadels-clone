// Heuristic bot. `chooseAction(view, level)` returns the next action for the
// seat the view belongs to. It is called repeatedly (one action at a time)
// until the bot's turn is over, so every decision is re-evaluated on fresh
// information.

import { getCharacter } from '../content/index.js';
import { cardValue, characterValue, cityIds, defOf, threat } from './evaluate.js';

export const BOT_LEVELS = {
  easy: { label: 'Squire', noise: 3.0, inference: false, destroyBias: -1.5 },
  normal: { label: 'Knight', noise: 1.0, inference: true, destroyBias: 0 },
  hard: { label: 'Lord', noise: 0.25, inference: true, destroyBias: 0.5 },
};

const best = (items, score) => {
  let top = null;
  let topScore = -Infinity;
  for (const item of items) {
    const s = score(item);
    if (s > topScore) {
      top = item;
      topScore = s;
    }
  }
  return { item: top, score: topScore };
};

function makeCtx(view, level, random) {
  const cfg = BOT_LEVELS[level] ?? BOT_LEVELS.normal;
  const me = view.players[view.you];
  const built = cityIds(me);
  const playable = view.hand.filter((c) => !built.has(c.id));
  return {
    view,
    cfg,
    me,
    random,
    built,
    playable,
    noisy: (v) => v + (random() - 0.5) * 2 * cfg.noise,
  };
}

// ------------------------------------------------------------------ inference

/**
 * Estimate, for each opponent, which characters they might hold this round.
 * Returns Map(charId -> Array<{ seat, p }>).
 */
function guessHolders(ctx) {
  const { view, me, cfg } = ctx;
  const mine = new Set(me.characters.map((c) => c.id));
  const faceUp = new Set(view.draft?.faceUp ?? []);
  const opponents = view.players.filter((p) => p.seat !== me.seat);
  const unknown = view.characters.filter((id) => !mine.has(id) && !faceUp.has(id) && view.revealed[id] == null);

  const holders = new Map(unknown.map((id) => [id, []]));
  const revealedSeats = new Set(Object.values(view.revealed));
  const hiddenOpponents = opponents.filter((p) => !revealedSeats.has(p.seat) || view.players.length <= 3);

  const roundStart = [...view.log].reverse().find((e) => e.type === 'round-start' && e.round === view.round);
  const myPicks = view.log.filter((e) => e.type === 'pick' && e.round === view.round && e.private);
  const singlePick = view.players.length >= 4 && myPicks.length === 1 && roundStart;

  if (cfg.inference && singlePick) {
    const seen = new Set(myPicks[0].private.seen);
    const n = view.players.length;
    const order = Array.from({ length: n }, (_, i) => (roundStart.crown + i) % n);
    const myPos = order.indexOf(me.seat);
    const afterMe = unknown.filter((id) => seen.has(id));
    const beforeMe = unknown.filter((id) => !seen.has(id));
    for (const p of hiddenOpponents) {
      const pos = order.indexOf(p.seat);
      const pool = pos > myPos ? afterMe : beforeMe;
      for (const id of pool) holders.get(id).push({ seat: p.seat, p: 1 / Math.max(1, pool.length) });
    }
  } else {
    for (const id of unknown) {
      for (const p of hiddenOpponents) holders.get(id).push({ seat: p.seat, p: 1 / Math.max(1, unknown.length) });
    }
  }
  return holders;
}

// ------------------------------------------------------------------ abilities

function chooseCharacterTarget(ctx, options, weigh) {
  const holders = guessHolders(ctx);
  const { item, score } = best(options, (id) => {
    const list = holders.get(id) ?? [];
    const expected = list.reduce((s, h) => s + h.p * weigh(ctx.view.players[h.seat], id), 0);
    return ctx.noisy(expected * 3) + (list.length ? 0 : -50);
  });
  return score > -40 ? item : options[Math.floor(ctx.random() * options.length)];
}

const ABILITY_STRATEGIES = {
  murder: {
    when: 'pre',
    decide(ctx, ability) {
      const target = chooseCharacterTarget(ctx, ability.options, (victim, id) => {
        const t = threat(ctx.view, victim);
        return (t / 10) * characterValue(ctx.view, victim, id, { handCount: victim.handCount });
      });
      return target ? { type: 'ability', ability: 'murder', target } : null;
    },
  },
  rob: {
    when: 'pre',
    decide(ctx, ability) {
      const target = chooseCharacterTarget(ctx, ability.options, (victim, id) => {
        const income = getCharacter(id).income ? 1 : 0;
        return victim.gold + income + 1;
      });
      return target ? { type: 'ability', ability: 'rob', target } : null;
    },
  },
  exchange: {
    when: 'pre',
    decide(ctx, ability) {
      const { view } = ctx;
      const myHand = view.hand.length;
      const { item } = best(ability.options, (seat) => view.players[seat].handCount * 10 + threat(view, view.players[seat]));
      if (item == null) return null;
      const theirs = view.players[item].handCount;
      const myJunk = view.hand.length - ctx.playable.length;
      if (theirs >= myHand + 2 || (theirs > myHand && myJunk >= 2)) {
        return { type: 'ability', ability: 'exchange', target: item };
      }
      return null;
    },
  },
  redraw: {
    when: 'pre',
    decide(ctx) {
      const { view, me } = ctx;
      const junk = view.hand.filter((c) => cardValue(view, me, c, { hand: view.hand }) < 0.5);
      if (!junk.length) return null;
      return { type: 'ability', ability: 'redraw', cards: junk.map((c) => c.uid) };
    },
  },
  destroy: {
    when: 'post',
    decide(ctx, ability) {
      const { view, me, cfg } = ctx;
      const goal = view.options.cityGoal;
      const myThreat = threat(view, me);
      const { item, score } = best(
        ability.options.filter((o) => o.seat !== me.seat),
        (o) => {
          const victim = view.players[o.seat];
          const card = victim.city.find((c) => c.uid === o.uid);
          const d = defOf(card);
          const relative = threat(view, victim) - myThreat * 0.8;
          const urgency = victim.city.length >= goal - 1 ? 4 : victim.city.length >= goal - 2 ? 1.5 : 0;
          return ctx.noisy(relative / 8 + (d.points ?? d.cost) * 0.5 + urgency - o.cost * 1.1 + cfg.destroyBias);
        },
      );
      if (!item || score < 1) return null;
      return { type: 'ability', ability: 'destroy', target: { seat: item.seat, uid: item.uid } };
    },
  },
};

// ------------------------------------------------------------------ turn

function chooseKeep(ctx) {
  const { view, me } = ctx;
  const drawn = view.turn.drawn ?? [];
  const pool = [...view.hand, ...drawn];
  const ranked = [...drawn].sort(
    (a, b) => ctx.noisy(cardValue(view, me, b, { hand: pool })) - ctx.noisy(cardValue(view, me, a, { hand: pool })),
  );
  return { type: 'keep', cards: ranked.slice(0, view.legal.turn.keep).map((c) => c.uid) };
}

function chooseResourceAction(ctx) {
  const { view, me } = ctx;
  const t = view.legal.turn;
  if (!t.drawCards) return { type: 'takeGold' };
  if (!t.takeGold) return { type: 'drawCards' };
  const character = view.turn.character;
  const playable = ctx.playable;
  if (!playable.length) return { type: 'drawCards' };
  const cheapest = Math.min(...playable.map((c) => defOf(c).cost));
  let gold = 2;
  let cards = 1;
  if (cheapest > me.gold) gold += 2;
  if (playable.length >= 2) gold += 1;
  if (playable.length <= 1) cards += 2;
  if (me.gold >= 6) cards += 2;
  if (t.keepCount > 1) cards += 1.5;
  if (character === 'architect') gold += 2;
  if (character === 'merchant') gold += 0.5;
  return ctx.noisy(gold) >= ctx.noisy(cards) ? { type: 'takeGold' } : { type: 'drawCards' };
}

function chooseBuild(ctx) {
  const { view, me } = ctx;
  const t = view.legal.turn;
  if (!t.build.length) return null;
  const options = view.hand.filter((c) => t.build.includes(c.uid));
  const { item } = best(options, (c) => ctx.noisy(cardValue(view, me, c, { hand: view.hand })) + defOf(c).cost * 0.6);
  return item ? { type: 'build', card: item.uid } : null;
}

function districtActions(ctx) {
  const { view, me } = ctx;
  const t = view.legal.turn;
  for (const d of t.districts) {
    if (!d.available) continue;
    if (d.id === 'laboratory') {
      const junk = view.hand
        .map((c) => ({ c, v: cardValue(view, me, c, { hand: view.hand }) }))
        .filter((x) => x.v < 0)
        .sort((a, b) => a.v - b.v)[0];
      if (junk) return { type: 'district', district: d.id, card: junk.c.uid };
    } else if (d.id === 'smithy') {
      if (me.gold >= 4 && view.hand.length <= 2) return { type: 'district', district: d.id };
    }
  }
  return null;
}

function turnAction(ctx) {
  const { view } = ctx;
  const t = view.legal.turn;
  if (t.choosing) return chooseKeep(ctx);

  const abilities = t.abilities.filter((a) => !a.used && a.options.length && ABILITY_STRATEGIES[a.id]);
  for (const a of abilities) {
    if (ABILITY_STRATEGIES[a.id].when !== 'pre') continue;
    const action = ABILITY_STRATEGIES[a.id].decide(ctx, a);
    if (action) return action;
  }

  if (!view.turn.actionTaken) return chooseResourceAction(ctx);

  if (t.income) {
    const incomeSuitBuildable = view.hand.some(
      (c) => t.build.includes(c.uid) && (defOf(c).suit === t.income.suit || defOf(c).wildIncome),
    );
    if (!incomeSuitBuildable) return { type: 'income' };
  }

  const build = chooseBuild(ctx);
  if (build) return build;
  if (t.income) return { type: 'income' };

  const district = districtActions(ctx);
  if (district) return district;

  for (const a of abilities) {
    if (ABILITY_STRATEGIES[a.id].when !== 'post') continue;
    const action = ABILITY_STRATEGIES[a.id].decide(ctx, a);
    if (action) return action;
  }
  return { type: 'endTurn' };
}

// ------------------------------------------------------------------ entry point

export function chooseAction(view, level = 'normal', random = Math.random) {
  const legal = view?.legal;
  if (!legal) return null;
  const ctx = makeCtx(view, level, random);
  const { me } = ctx;

  if (legal.prompt) {
    if (legal.prompt.type === 'graveyard') {
      const d = defOf(view.prompt.card);
      const accept = legal.prompt.canAccept && !ctx.built.has(d.id) && (d.cost >= 3 || me.gold >= 4);
      return { type: 'graveyard', accept };
    }
    return null;
  }

  const handCtx = { handCount: view.hand.length, handPlayable: ctx.playable.length };
  if (legal.pick) {
    const { item } = best(legal.pick, (id) => ctx.noisy(characterValue(view, me, id, handCtx)));
    return { type: 'pick', character: item };
  }
  if (legal.discard) {
    // Deny the character the opponent(s) would like most.
    const opponents = view.players.filter((p) => p.seat !== me.seat);
    const { item } = best(legal.discard, (id) => {
      const theirs = Math.max(...opponents.map((p) => characterValue(view, p, id, { handCount: p.handCount })));
      const ours = characterValue(view, me, id, handCtx);
      return ctx.noisy(theirs - ours * 0.6);
    });
    return { type: 'discardCharacter', character: item };
  }
  if (legal.turn) return turnAction(ctx);
  return null;
}

/** A guaranteed-legal action used when a decision fails or times out. */
export function fallbackAction(view) {
  const legal = view?.legal;
  if (!legal) return null;
  if (legal.prompt) return { type: 'graveyard', accept: false };
  if (legal.pick) return { type: 'pick', character: legal.pick[0] };
  if (legal.discard) return { type: 'discardCharacter', character: legal.discard[0] };
  const t = legal.turn;
  if (!t) return null;
  if (t.choosing) return { type: 'keep', cards: view.turn.drawn.slice(0, t.keep).map((c) => c.uid) };
  if (t.takeGold) return { type: 'takeGold' };
  if (t.drawCards) return { type: 'drawCards' };
  return { type: 'endTurn' };
}
