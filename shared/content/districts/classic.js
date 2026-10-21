// The district deck of the classic edition (66 cards).
//
// District definition shape:
//   id, name, cost, suit, count, text?
//   points          – score value if different from cost (Dragon Gate, University)
//   drawBonus       – extra cards drawn when taking the "draw cards" action
//   keepBonus       – extra cards kept when taking the "draw cards" action
//   indestructible  – cannot be destroyed by the Warlord
//   wallBonus       – extra cost to destroy *other* districts in this city
//   graveyard       – owner may pay 1 gold to recover a destroyed district
//   wildIncome      – counts as every suit when collecting taxes
//   wildScoring(state, entry) – counts as any one suit for the 5-suit bonus
//   action: { id, label, input: 'card' | 'none', cost?, available(ctx), apply(ctx, payload) }

import { registerDistrict } from '../registry.js';

const COMMON = [
  // Noble
  { id: 'manor', name: 'Manor', cost: 3, suit: 'noble', count: 5 },
  { id: 'castle', name: 'Castle', cost: 4, suit: 'noble', count: 4 },
  { id: 'palace', name: 'Palace', cost: 5, suit: 'noble', count: 3 },
  // Religious
  { id: 'temple', name: 'Temple', cost: 1, suit: 'religious', count: 3 },
  { id: 'church', name: 'Church', cost: 2, suit: 'religious', count: 3 },
  { id: 'monastery', name: 'Monastery', cost: 3, suit: 'religious', count: 3 },
  { id: 'cathedral', name: 'Cathedral', cost: 5, suit: 'religious', count: 2 },
  // Trade
  { id: 'tavern', name: 'Tavern', cost: 1, suit: 'trade', count: 5 },
  { id: 'market', name: 'Market', cost: 2, suit: 'trade', count: 4 },
  { id: 'trading-post', name: 'Trading Post', cost: 2, suit: 'trade', count: 3 },
  { id: 'docks', name: 'Docks', cost: 3, suit: 'trade', count: 3 },
  { id: 'harbor', name: 'Harbor', cost: 4, suit: 'trade', count: 3 },
  { id: 'town-hall', name: 'Town Hall', cost: 5, suit: 'trade', count: 2 },
  // Military
  { id: 'watchtower', name: 'Watchtower', cost: 1, suit: 'military', count: 3 },
  { id: 'prison', name: 'Prison', cost: 2, suit: 'military', count: 3 },
  { id: 'battlefield', name: 'Battlefield', cost: 3, suit: 'military', count: 3 },
  { id: 'fortress', name: 'Fortress', cost: 5, suit: 'military', count: 2 },
];

const UNIQUE = [
  {
    id: 'haunted-city',
    name: 'Haunted City',
    cost: 2,
    text: 'Counts as any one suit for the five-suit bonus, unless built in the final round.',
    wildScoring: (state, entry) => entry.builtRound < state.round,
  },
  {
    id: 'keep',
    name: 'Keep',
    cost: 3,
    count: 2,
    text: 'The Warlord cannot destroy the Keep.',
    indestructible: true,
  },
  {
    id: 'laboratory',
    name: 'Laboratory',
    cost: 5,
    text: 'Once per turn, you may discard a card from your hand to gain 1 gold.',
    action: {
      id: 'laboratory',
      label: 'Transmute a card into 1 gold',
      input: 'card',
      available: (ctx) => ctx.state.players[ctx.seat].hand.length > 0,
      apply(ctx, { card }) {
        ctx.removeFromHand(ctx.seat, card);
        ctx.discardCards([card]);
        ctx.gainGold(ctx.seat, 1, 'laboratory');
        ctx.log('laboratory', { seat: ctx.seat }, { [ctx.seat]: { card } });
      },
    },
  },
  {
    id: 'smithy',
    name: 'Smithy',
    cost: 5,
    text: 'Once per turn, you may pay 2 gold to draw 3 cards.',
    action: {
      id: 'smithy',
      label: 'Pay 2 gold to draw 3 cards',
      input: 'none',
      available: (ctx) => ctx.state.players[ctx.seat].gold >= 2 && ctx.deckSize() > 0,
      apply(ctx) {
        ctx.spendGold(ctx.seat, 2);
        const drawn = ctx.drawCards(ctx.seat, 3);
        ctx.log('smithy', { seat: ctx.seat, count: drawn.length }, { [ctx.seat]: { cards: drawn } });
      },
    },
  },
  {
    id: 'graveyard',
    name: 'Graveyard',
    cost: 5,
    text: 'When the Warlord destroys a district, you may pay 1 gold to take it into your hand (unless you are the Warlord).',
    graveyard: true,
  },
  {
    id: 'observatory',
    name: 'Observatory',
    cost: 5,
    text: 'When you draw cards as your action, draw 3 instead of 2.',
    drawBonus: 1,
  },
  {
    id: 'school-of-magic',
    name: 'School of Magic',
    cost: 6,
    text: 'Counts as every suit when your character collects taxes.',
    wildIncome: true,
  },
  {
    id: 'library',
    name: 'Library',
    cost: 6,
    text: 'When you draw cards as your action, keep one more card.',
    keepBonus: 1,
  },
  {
    id: 'great-wall',
    name: 'Great Wall',
    cost: 6,
    text: 'The Warlord must pay 1 more gold to destroy any of your other districts.',
    wallBonus: 1,
  },
  {
    id: 'university',
    name: 'University',
    cost: 6,
    points: 8,
    text: 'Worth 8 points at the end of the game.',
  },
  {
    id: 'dragon-gate',
    name: 'Dragon Gate',
    cost: 6,
    points: 8,
    text: 'Worth 8 points at the end of the game.',
  },
].map((d) => ({ suit: 'unique', ...d }));

export const CLASSIC_DISTRICTS = [...COMMON, ...UNIQUE];

CLASSIC_DISTRICTS.forEach(registerDistrict);
