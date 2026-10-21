// Valuation helpers used by the bot strategy. Everything here works from a
// player *view*, i.e. only public information plus the bot's own secrets.

import { getCharacter, getDistrict, SUIT_ORDER } from '../content/index.js';

export const defOf = (card) => getDistrict(card.id);

export function cityIds(player) {
  return new Set(player.city.map((c) => c.id));
}

export function suitCount(player, suit) {
  return player.city.filter((c) => {
    const d = defOf(c);
    return d.suit === suit || d.wildIncome;
  }).length;
}

export function cityPoints(player) {
  return player.city.reduce((s, c) => s + (defOf(c).points ?? defOf(c).cost), 0);
}

/** Rough public "threat" estimate of a player: how close they are to winning. */
export function threat(view, player) {
  const goal = view.options.cityGoal;
  const progress = player.city.length / goal;
  return cityPoints(player) + player.city.length * 2 + player.gold * 0.5 + player.handCount * 0.4 + progress * progress * 12;
}

export function missingSuits(player) {
  const have = new Set(player.city.map((c) => defOf(c).suit));
  return SUIT_ORDER.filter((s) => !have.has(s));
}

/** How much a district card in hand is worth keeping / building for `player`. */
export function cardValue(view, player, card, { hand = [] } = {}) {
  const d = defOf(card);
  const built = cityIds(player);
  if (built.has(d.id)) return -5;
  let v = (d.points ?? d.cost) * 1.0;
  if (d.suit === 'unique') v += 1.5;
  if (missingSuits(player).includes(d.suit)) v += 1.6;
  // Duplicates within the hand are less valuable (only one can be built).
  const dupesInHand = hand.filter((c) => c.id === d.id && c.uid !== card.uid).length;
  v -= dupesInHand * 1.5;
  // Ongoing benefits from abilities.
  if (d.drawBonus || d.keepBonus) v += 1.2;
  if (d.wildIncome) v += 1.0;
  if (d.indestructible) v += 0.5;
  // Cards we cannot hope to afford soon are worth less.
  const turnsToAfford = Math.max(0, d.cost - player.gold) / 2.5;
  v -= turnsToAfford * 0.9;
  return v;
}

/** Desirability of taking a character this round, from `player`'s perspective. */
export function characterValue(view, player, charId, ctx = {}) {
  const def = getCharacter(charId);
  const opponents = view.players.filter((p) => p.seat !== player.seat);
  const richest = Math.max(0, ...opponents.map((p) => p.gold));
  const biggestHand = Math.max(0, ...opponents.map((p) => p.handCount));
  const goal = view.options.cityGoal;
  const nearlyDone = opponents.some((p) => p.city.length >= goal - 2);
  const handCount = ctx.handCount ?? player.handCount ?? 0;
  const handPlayable = ctx.handPlayable ?? handCount;
  let v = 2;
  if (def.income) v += suitCount(player, def.income) * 1.4;
  switch (charId) {
    case 'assassin':
      v += 1.5 + (nearlyDone ? 1.5 : 0);
      break;
    case 'thief':
      v += Math.min(4, richest / 2);
      break;
    case 'magician':
      v += handCount <= 1 && biggestHand >= handCount + 3 ? 3.5 : 0.5;
      v += Math.max(0, handCount - handPlayable) * 0.7;
      break;
    case 'king':
      v += view.crown === player.seat ? 0.5 : 1.5;
      break;
    case 'bishop':
      v += player.city.length >= goal - 3 ? 2 : 0;
      v += cityPoints(player) / 12;
      break;
    case 'merchant':
      v += 1.5;
      break;
    case 'architect':
      v += handPlayable >= 2 && player.gold >= 4 ? 3.5 : handCount <= 1 ? 1.5 : 0.5;
      break;
    case 'warlord':
      v += nearlyDone ? 2 : 0.5;
      break;
    default:
      break;
  }
  if (player.city.length === goal - 1) v += def.protectsCity ? 3 : 0;

  if (ctx.aware) {
    // Endgame awareness: stop a rival who is about to finish, protect yourself.
    const closing = opponents.filter((p) => !p.complete && p.city.length >= goal - 1);
    if (closing.length) {
      if (charId === 'assassin') v += 2;
      if (charId === 'warlord') v += 2.5;
    }
    if (player.city.length >= goal - 2 && def.protectsCity) v += 1.5;
    // Being far ahead makes you the obvious target: prefer quieter characters.
    const lead = cityPoints(player) - Math.max(0, ...opponents.map(cityPoints));
    if (lead > 6 && (charId === 'king' || charId === 'merchant')) v -= 1;
  }
  return v;
}
