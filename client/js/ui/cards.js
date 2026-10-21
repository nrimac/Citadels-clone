// DOM builders for every kind of card shown on the table.

import { getCharacter, getDistrict, SUITS } from '../../../shared/content/index.js';
import { h, fromHTML } from '../core/dom.js';
import { portraitSVG } from '../art/characters.js';
import { districtSVG } from '../art/districts.js';
import { cardBackSVG, coinSVG, suitGemSVG } from '../art/icons.js';

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const gem = (suit) => {
  const s = SUITS[suit];
  return s ? fromHTML(suitGemSVG(suit, s.color, s.dark)) : null;
};

/** A full district card. `card` is { uid, id } or just an id string. */
export function districtCard(card, { text = 'auto', classes = '' } = {}) {
  const id = typeof card === 'string' ? card : card.id;
  const def = getDistrict(id);
  const el = h(
    'div',
    {
      class: `card district suit-${def.suit} ${def.name.length > 11 ? 'long-name' : ''} ${classes}`,
      dataset: { preview: 'district', previewId: id, ...(card.uid != null ? { uid: card.uid } : {}) },
      tabindex: '-1',
    },
    h('div', { class: 'card-art', html: districtSVG(id) }),
    h('div', { class: 'card-frame' }),
    h('div', { class: 'card-cost', html: coinSVG(def.cost) }),
    h('div', { class: 'card-gem' }, gem(def.suit)),
    h('div', { class: 'card-name' }, h('span', null, def.name)),
  );
  if (def.points && def.points !== def.cost)
    el.append(h('div', { class: 'card-points', title: `Worth ${def.points} points` }, `★${def.points}`));
  if (def.text && text !== 'none') el.append(h('div', { class: 'card-text' }, def.text));
  return el;
}

/** A compact district tile for other players' cities. */
export function districtMini(card) {
  const def = getDistrict(card.id);
  return h(
    'div',
    { class: `mini-district suit-${def.suit}`, dataset: { preview: 'district', previewId: card.id, uid: card.uid }, title: def.name },
    h('div', { class: 'mini-art', html: districtSVG(card.id) }),
    h('div', { class: 'mini-cost' }, String(def.points ?? def.cost)),
  );
}

export function characterCard(id, { classes = '', text = false } = {}) {
  const def = getCharacter(id);
  return h(
    'div',
    { class: `card character char-${id} ${classes}`, dataset: { preview: 'character', previewId: id, character: id }, tabindex: '-1' },
    h('div', { class: 'card-art', html: portraitSVG(id) }),
    h('div', { class: 'card-frame' }),
    h('div', { class: 'card-rank' }, ROMAN[def.rank] ?? def.rank),
    def.income ? h('div', { class: 'card-gem' }, gem(def.income)) : null,
    h('div', { class: 'card-name' }, h('span', null, def.name)),
    text ? h('div', { class: 'card-text' }, def.text) : null,
  );
}

/** Round character token used on the character track and seats. */
export function characterMedallion(id, { classes = '', title } = {}) {
  const def = getCharacter(id);
  return h(
    'div',
    { class: `medallion char-${id} ${classes}`, dataset: { preview: 'character', previewId: id, character: id }, title: title ?? def.name },
    h('div', { class: 'medallion-art', html: portraitSVG(id) }),
    h('div', { class: 'medallion-rank' }, ROMAN[def.rank]),
  );
}

export function hiddenMedallion(classes = '') {
  return h(
    'div',
    { class: `medallion hidden ${classes}`, title: 'Not yet revealed' },
    h('div', { class: 'medallion-art' }, h('span', { class: 'medallion-q' }, '?')),
  );
}

export function cardBack(classes = '') {
  return h('div', { class: `card back ${classes}`, html: cardBackSVG() });
}

export function coin(value = null, classes = '') {
  const el = fromHTML(coinSVG(value));
  if (classes) el.classList.add(...classes.split(' '));
  return el;
}

export function characterName(id) {
  return getCharacter(id).name;
}

export function districtName(id) {
  return getDistrict(id).name;
}
