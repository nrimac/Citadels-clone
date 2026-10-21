// "How to play" reference, built from the same content registry the engine
// uses, so new characters or districts automatically appear here.

import { getEdition, getCharacter, getDistrict, SUITS, SUIT_ORDER } from '../../../shared/content/index.js';
import { h, setChildren } from '../core/dom.js';
import { characterCard, districtCard } from './cards.js';
import { openModal, button } from './components.js';
import { play } from '../audio/index.js';

const p = (...children) => h('p', null, ...children);
const strong = (t) => h('strong', null, t);

function overview() {
  return h(
    'div',
    { class: 'rules-section' },
    p(
      'Every player is building a city of districts. When someone completes their city (8 districts by default), the round is finished and the grandest city wins.',
    ),
    h('h3', null, 'Each round'),
    h(
      'ol',
      null,
      h(
        'li',
        null,
        strong('Choose a character. '),
        'Starting with the player who holds the crown, everyone secretly picks one of the eight characters. Some characters are set aside face up or face down, so nobody knows exactly who took what.',
      ),
      h(
        'li',
        null,
        strong('Characters are called in order. '),
        'From the Assassin (I) to the Warlord (VIII), each character is called and its owner takes a turn.',
      ),
    ),
    h('h3', null, 'On your turn'),
    h(
      'ol',
      null,
      h('li', null, strong('Gather resources: '), 'take 2 gold from the bank, or draw 2 district cards and keep 1.'),
      h(
        'li',
        null,
        strong('Build: '),
        'you may build one district from your hand by paying its cost. You may not build two identical districts.',
      ),
      h(
        'li',
        null,
        strong('Use your character’s ability '),
        '— at any time during your turn. Characters with a suit gem collect 1 gold for each district of that suit in your city.',
      ),
    ),
    h('h3', null, 'Sharing a device'),
    p(
      'In a local game with several people, the table hides private cards between turns and asks you to pass the device along. Bots play their turns on their own.',
    ),
  );
}

function characters() {
  const ids = getEdition('classic').characters;
  return h(
    'div',
    { class: 'rules-grid' },
    ids.map((id) =>
      h(
        'div',
        { class: 'rules-entry' },
        characterCard(id, { classes: 'no-preview' }),
        h(
          'div',
          null,
          h('h4', null, `${getCharacter(id).rank}. ${getCharacter(id).name}`),
          h('em', { class: 'epithet' }, getCharacter(id).epithet),
          p(getCharacter(id).text),
        ),
      ),
    ),
  );
}

function districts() {
  const edition = getEdition('classic');
  const uniques = edition.districts.map((d) => getDistrict(d.id)).filter((d) => d.suit === 'unique');
  return h(
    'div',
    { class: 'rules-section' },
    p(
      'Districts come in five suits. Noble, religious, trade and military districts feed the taxes of the King, Bishop, Merchant and Warlord. Unique districts (purple) bend the rules:',
    ),
    h(
      'div',
      { class: 'suit-legend' },
      SUIT_ORDER.map((s) => h('span', { class: `suit-chip suit-${s}` }, SUITS[s].name)),
    ),
    h(
      'div',
      { class: 'rules-uniques' },
      uniques.map((d) => h('div', { class: 'rules-unique' }, districtCard(d.id, { classes: 'show-text no-preview' }))),
    ),
  );
}

function scoring() {
  const s = getEdition('classic').scoring;
  return h(
    'div',
    { class: 'rules-section' },
    p('When a player completes their city, the game ends after the current round. Then everyone scores:'),
    h(
      'ul',
      null,
      h('li', null, 'The total cost of the districts in your city (Dragon Gate and University are worth 8).'),
      h('li', null, `+${s.allSuitsBonus} if your city has all five suits.`),
      h('li', null, `+${s.firstCompleteBonus} for the first player to complete their city.`),
      h('li', null, `+${s.completeBonus} for every other player who completed their city.`),
    ),
    p('Ties go to the player who revealed the highest-ranked character in the final round.'),
    h('h3', null, 'Tips'),
    h(
      'ul',
      null,
      h('li', null, 'Watch which characters are discarded face up — they cannot be targeted.'),
      h('li', null, 'The Bishop protects a nearly finished city from the Warlord; a completed city is safe forever.'),
      h('li', null, 'Hoarding gold makes you a juicy target for the Thief.'),
    ),
  );
}

const TABS = [
  ['Overview', overview],
  ['Characters', characters],
  ['Districts', districts],
  ['Scoring', scoring],
];

export function openRules(initial = 0) {
  const body = h('div', { class: 'rules-body' });
  const tabs = h('div', { class: 'rules-tabs segmented' });
  const show = (i) => {
    [...tabs.children].forEach((b, j) => b.classList.toggle('on', i === j));
    setChildren(body, TABS[i][1]());
    body.scrollTop = 0;
  };
  TABS.forEach(([label], i) =>
    tabs.append(
      h(
        'button',
        {
          type: 'button',
          onclick: () => {
            play('cardFlip');
            show(i);
          },
        },
        label,
      ),
    ),
  );
  show(initial);
  const modal = openModal({
    title: 'How to Play',
    className: 'wide rules-modal',
    content: h('div', null, tabs, body),
    actions: [button('Close', { variant: 'gold', onClick: () => modal.close() })],
  });
  return modal;
}
