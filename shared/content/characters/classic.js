// The eight characters of the classic edition.
//
// Character definition shape:
//   id, rank, name, epithet, text   – identity and rules text
//   income      – suit id: collects 1 gold per district of that suit
//   buildLimit  – districts buildable per turn (default 1)
//   cannotBeFaceUp – may never be a face-up discard during the draft
//   protectsCity   – owner's districts cannot be destroyed (unless murdered)
//   onCalled(ctx), afterAction(ctx), onRoundEnd(ctx, info) – lifecycle hooks
//   abilities: [{ id, label, input, group?, options(ctx), apply(ctx, payload) }]
//     input: 'character' | 'player' | 'district' | 'cards' | 'none'

import { registerCharacter } from '../registry.js';

const ASSASSIN = {
  id: 'assassin',
  rank: 1,
  name: 'Assassin',
  epithet: 'Shadow of the Court',
  text: 'Name a character to murder. The murdered character loses their entire turn.',
  abilities: [
    {
      id: 'murder',
      label: 'Murder',
      prompt: 'Choose a character to murder',
      input: 'character',
      options: (ctx) =>
        ctx.characterIds().filter((id) => ctx.character(id).rank > 1 && !ctx.isFaceUp(id) && !ctx.ownsCharacter(ctx.seat, id)),
      apply(ctx, { target }) {
        ctx.state.murdered = target;
        ctx.log('murder', { seat: ctx.seat, target });
      },
    },
  ],
};

const THIEF = {
  id: 'thief',
  rank: 2,
  name: 'Thief',
  epithet: 'Prince of Pockets',
  text: 'Name a character to rob. When they are revealed, you take all of their gold. You cannot rob the Assassin or the murdered character.',
  abilities: [
    {
      id: 'rob',
      label: 'Rob',
      prompt: 'Choose a character to rob',
      input: 'character',
      options: (ctx) =>
        ctx
          .characterIds()
          .filter((id) => ctx.character(id).rank > 2 && id !== ctx.state.murdered && !ctx.isFaceUp(id) && !ctx.ownsCharacter(ctx.seat, id)),
      apply(ctx, { target }) {
        ctx.state.robbed = target;
        ctx.state.robbedBy = ctx.seat;
        ctx.log('rob', { seat: ctx.seat, target });
      },
    },
  ],
};

const MAGICIAN = {
  id: 'magician',
  rank: 3,
  name: 'Magician',
  epithet: 'Weaver of Illusions',
  text: 'Either exchange your whole hand with another player, or discard any number of cards and draw that many.',
  abilities: [
    {
      id: 'exchange',
      label: 'Exchange hands',
      prompt: 'Choose a player to exchange hands with',
      input: 'player',
      group: 'magic',
      options: (ctx) => ctx.state.players.map((_, i) => i).filter((i) => i !== ctx.seat),
      apply(ctx, { target }) {
        const me = ctx.state.players[ctx.seat];
        const them = ctx.state.players[target];
        const mine = me.hand;
        me.hand = them.hand;
        them.hand = mine;
        ctx.log('exchange', { seat: ctx.seat, target, gave: mine.length, got: me.hand.length });
      },
    },
    {
      id: 'redraw',
      label: 'Discard & redraw',
      prompt: 'Choose cards to discard; you will draw as many',
      input: 'cards',
      group: 'magic',
      options: (ctx) => [...ctx.state.players[ctx.seat].hand],
      apply(ctx, { cards }) {
        cards.forEach((uid) => ctx.removeFromHand(ctx.seat, uid));
        ctx.discardCards(cards);
        const drawn = ctx.drawCards(ctx.seat, cards.length);
        ctx.log('redraw', { seat: ctx.seat, count: cards.length }, { [ctx.seat]: { discarded: cards, drawn } });
      },
    },
  ],
};

const KING = {
  id: 'king',
  rank: 4,
  name: 'King',
  epithet: 'Wearer of the Crown',
  text: 'Take the crown: you choose first next round. Gain 1 gold for each noble (yellow) district in your city.',
  income: 'noble',
  cannotBeFaceUp: true,
  onCalled(ctx) {
    ctx.giveCrown(ctx.seat);
  },
  onRoundEnd(ctx, { owner, murdered }) {
    // A murdered King's heir still claims the crown once the round is over.
    if (murdered && owner != null) ctx.giveCrown(owner);
  },
};

const BISHOP = {
  id: 'bishop',
  rank: 5,
  name: 'Bishop',
  epithet: 'Voice of the Cathedral',
  text: 'The Warlord cannot destroy your districts (unless you were murdered). Gain 1 gold for each religious (blue) district.',
  income: 'religious',
  protectsCity: true,
};

const MERCHANT = {
  id: 'merchant',
  rank: 6,
  name: 'Merchant',
  epithet: 'Master of Coin',
  text: 'Gain 1 extra gold after taking an action. Gain 1 gold for each trade (green) district.',
  income: 'trade',
  afterAction(ctx) {
    ctx.gainGold(ctx.seat, 1, 'merchant');
  },
};

const ARCHITECT = {
  id: 'architect',
  rank: 7,
  name: 'Architect',
  epithet: 'Raiser of Spires',
  text: 'Draw 2 extra district cards after taking an action. You may build up to 3 districts this turn.',
  buildLimit: 3,
  afterAction(ctx) {
    const drawn = ctx.drawCards(ctx.seat, 2);
    ctx.log('bonus-cards', { seat: ctx.seat, count: drawn.length, source: 'architect' }, { [ctx.seat]: { cards: drawn } });
  },
};

const WARLORD = {
  id: 'warlord',
  rank: 8,
  name: 'Warlord',
  epithet: 'Iron Fist of the Realm',
  text: 'Destroy one district by paying 1 gold less than its cost. Completed cities are immune. Gain 1 gold for each military (red) district.',
  income: 'military',
  abilities: [
    {
      id: 'destroy',
      label: 'Destroy a district',
      prompt: 'Choose a district to destroy',
      input: 'district',
      options(ctx) {
        const opts = [];
        const gold = ctx.state.players[ctx.seat].gold;
        ctx.state.players.forEach((p, seat) => {
          if (ctx.isComplete(seat) || ctx.isProtected(seat)) return;
          p.city.forEach((entry) => {
            const def = ctx.district(entry.uid);
            if (def.indestructible) return;
            const cost = ctx.destroyCost(seat, entry.uid);
            if (cost <= gold) opts.push({ seat, uid: entry.uid, cost });
          });
        });
        return opts;
      },
      apply(ctx, { target }) {
        ctx.destroyDistrict(target.seat, target.uid, target.cost);
      },
    },
  ],
};

export const CLASSIC_CHARACTERS = [ASSASSIN, THIEF, MAGICIAN, KING, BISHOP, MERCHANT, ARCHITECT, WARLORD];

CLASSIC_CHARACTERS.forEach(registerCharacter);
