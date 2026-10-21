// Opponent seat panels: crest, name, purse, hand, characters and city.

import { h, fromHTML, reconcile, setChildren } from '../core/dom.js';
import { crestSVG, crownSVG, seatColor } from '../art/icons.js';
import { characterMedallion, districtMini, hiddenMedallion, coin } from '../ui/cards.js';
import { icon } from '../ui/components.js';

export function statAnchor(seat, kind, content, title) {
  return h('span', { class: `stat stat-${kind} seat-anchor`, dataset: { seat, anchor: kind }, title }, content);
}

/** The characters a seat is known to hold this round (revealed ones, or hidden placeholders). */
export function seatCharacterTokens(view, p) {
  const tokens = [];
  const expected = view.phase === 'draft' ? 0 : view.players.length <= 3 ? 2 : 1;
  for (const c of p.characters) {
    const murdered = view.murdered === c.id && (c.revealed || p.seat === view.you);
    tokens.push(
      characterMedallion(c.id, {
        classes: [murdered ? 'murdered' : '', view.robbed === c.id ? 'robbed' : '', view.turn?.character === c.id ? 'current' : ''].join(
          ' ',
        ),
      }),
    );
  }
  if (view.phase === 'play') for (let i = p.characters.length; i < expected; i++) tokens.push(hiddenMedallion());
  return tokens;
}

function buildSeat(seat) {
  const color = seatColor(seat);
  const el = h(
    'div',
    { class: 'seat', dataset: { seat }, style: { '--seat-color': color.main, '--seat-light': color.light, '--seat-dark': color.dark } },
    h('div', { class: 'seat-glow' }),
    h(
      'div',
      { class: 'seat-head' },
      fromHTML(crestSVG(seat)),
      h('div', { class: 'seat-title' }, h('div', { class: 'seat-name' }), h('div', { class: 'seat-tags' })),
      h('div', { class: 'seat-crown seat-anchor', dataset: { seat, anchor: 'crown' }, html: crownSVG() }),
    ),
    h('div', { class: 'seat-stats' }),
    h('div', { class: 'seat-chars' }),
    h('div', { class: 'seat-city seat-anchor', dataset: { seat, anchor: 'city' } }),
  );
  return el;
}

export function updateSeat(el, view, p) {
  const active =
    (view.phase === 'draft' && view.draft?.seat === p.seat) ||
    (view.phase === 'play' && (view.prompt ? view.prompt.seat === p.seat : view.turn?.seat === p.seat));
  el.classList.toggle('active', !!active);
  el.classList.toggle('has-crown', view.crown === p.seat);
  el.classList.toggle('complete', p.complete);
  el.classList.toggle('offline', p.kind === 'human' && !p.connected);
  el.classList.toggle('winner', view.result?.winner === p.seat);

  el.querySelector('.seat-name').textContent = p.name;
  const tags = el.querySelector('.seat-tags');
  setChildren(
    tags,
    p.kind === 'bot'
      ? h('span', { class: 'tag', title: 'Bot' }, icon('bot'), { easy: 'Squire', normal: 'Knight', hard: 'Lord' }[p.level] ?? 'Bot')
      : null,
    p.autopilot ? h('span', { class: 'tag warn', title: 'A bot is playing for this player' }, icon('bot'), 'Autopilot') : null,
    p.kind === 'human' && !p.connected ? h('span', { class: 'tag warn' }, icon('wifi'), 'Away') : null,
  );

  const goal = view.options.cityGoal;
  setChildren(
    el.querySelector('.seat-stats'),
    statAnchor(p.seat, 'gold', [coin(), h('b', null, String(p.gold))], 'Gold'),
    statAnchor(p.seat, 'hand', [icon('cards'), h('b', null, String(p.handCount))], 'Cards in hand'),
    h(
      'span',
      { class: `stat stat-city ${p.complete ? 'done' : ''}`, title: 'Districts built' },
      icon('flag'),
      h('b', null, `${p.city.length}/${goal}`),
    ),
  );

  setChildren(el.querySelector('.seat-chars'), ...seatCharacterTokens(view, p));

  reconcile(el.querySelector('.seat-city'), p.city, {
    key: (c) => c.uid,
    create: (c) => districtMini(c),
  });
}

export class SeatsView {
  constructor(root) {
    this.root = root;
  }

  update(view) {
    const others = view.players.filter((p) => p.seat !== view.you);
    this.root.dataset.count = String(others.length);
    reconcile(this.root, others, {
      key: (p) => p.seat,
      create: (p) => buildSeat(p.seat),
      update: () => {},
    });
    for (const p of others) {
      const el = this.root.querySelector(`.seat[data-seat="${p.seat}"]`);
      if (el) updateSeat(el, view, p);
    }
  }
}
