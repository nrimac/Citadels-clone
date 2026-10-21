// The centre of the table: the district deck, the bank, and the spotlight
// showing whose move it is (or the draft in progress).

import { h, fromHTML, setChildren } from '../core/dom.js';
import { cardBack, characterCard } from '../ui/cards.js';
import { crestSVG, coinSVG } from '../art/icons.js';
import { getCharacter } from '../../../shared/content/index.js';
import { makeNamer } from './narrate.js';

function bankPile() {
  const coins = [];
  const spots = [
    [0, 0], [26, 4], [52, 0], [12, -14], [40, -12], [26, -28], [6, 14], [46, 14], [64, 10],
  ];
  spots.forEach(([x, y], i) => coins.push(h('div', { class: 'bank-coin', style: { left: `${x}px`, top: `${y + 34}px`, zIndex: String(40 - i) }, html: coinSVG() })));
  return coins;
}

export class TableView {
  constructor(root) {
    this.root = root;
    this.deckCount = h('div', { class: 'deck-count' });
    this.deck = h(
      'div',
      { class: 'table-deck seat-anchor', dataset: { anchor: 'deck' }, title: 'District deck' },
      h('div', { class: 'deck-stack' }, cardBack('d1'), cardBack('d2'), cardBack('d3')),
      this.deckCount,
      h('div', { class: 'table-label' }, 'Districts'),
    );
    this.bank = h(
      'div',
      { class: 'table-bank seat-anchor', dataset: { anchor: 'bank' }, title: 'The bank' },
      h('div', { class: 'bank-pile' }, bankPile()),
      h('div', { class: 'table-label' }, 'Bank'),
    );
    this.spot = h('div', { class: 'spotlight' });
    this.root.append(this.deck, this.spot, this.bank);
    this.spotKey = null;
  }

  update(view) {
    this.deckCount.textContent = String(view.deckCount);
    this.deck.classList.toggle('empty', view.deckCount === 0);

    const key = [view.phase, view.round, view.callIndex, view.draft?.step, view.turn?.seat, view.you, view.result ? 1 : 0, view.murdered, view.robbed].join('|');
    if (key === this.spotKey) {
      this._status(view);
      return;
    }
    this.spotKey = key;
    const name = makeNamer(view);

    if (view.phase === 'draft' && view.draft) {
      const d = view.draft;
      const mine = d.seat === view.you;
      this.spot.className = 'spotlight drafting';
      setChildren(this.spot,
        h('div', { class: 'spot-eyebrow' }, `Round ${view.round}`),
        h('h2', { class: 'spot-title' }, 'Choosing Characters'),
        h(
          'div',
          { class: 'draft-fan' },
          Array.from({ length: Math.min(8, d.poolCount) }, (_, i) => cardBack(`fan fan-${i}`)),
        ),
        d.faceUp.length
          ? h(
              'div',
              { class: 'spot-faceup' },
              h('span', { class: 'label' }, 'Set aside face up'),
              h('div', { class: 'faceup-row' }, d.faceUp.map((id) => characterCard(id, { classes: 'discarded tiny' }))),
            )
          : null,
        h(
          'div',
          { class: 'spot-who' },
          d.seat != null ? fromHTML(crestSVG(d.seat)) : null,
          h('span', null, mine ? (d.kind === 'discard' ? 'Set a character aside' : 'Your choice…') : `${name(d.seat)} is choosing${d.kind === 'discard' ? ' a discard' : ''}…`),
        ),
      );
    } else if (view.phase === 'play' && view.calling) {
      const id = view.calling;
      const owner = view.turn?.seat;
      const def = getCharacter(id);
      this.spot.className = `spotlight playing char-${id} ${owner === view.you ? 'mine' : ''}`;
      setChildren(this.spot,
        h('div', { class: 'spot-eyebrow' }, `Round ${view.round} · ${def.rank} of ${view.characters.length}`),
        h('div', { class: 'spot-card' }, h('div', { class: 'spot-rays' }), characterCard(id, { classes: 'spot' })),
        h('div', { class: 'spot-who' }, owner != null ? fromHTML(crestSVG(owner)) : null, h('span', null, owner === view.you ? 'Your turn' : owner != null ? name(owner) : '')),
        h('div', { class: 'spot-status' }),
      );
    } else if (view.phase === 'over' && view.result) {
      this.spot.className = 'spotlight over';
      setChildren(this.spot, h('h2', { class: 'spot-title gold-text' }, 'The Realm Has a Ruler'), h('div', { class: 'spot-who' }, fromHTML(crestSVG(view.result.winner)), h('span', null, name(view.result.winner))));
    } else {
      this.spot.className = 'spotlight';
      this.spot.replaceChildren();
    }
    this._status(view);
  }

  _status(view) {
    const el = this.spot.querySelector('.spot-status');
    if (!el) return;
    const name = makeNamer(view);
    let text = '';
    if (view.prompt) text = `${name(view.prompt.seat)} ${view.prompt.seat === view.you ? 'decide' : 'decides'} whether to use the Graveyard…`;
    else if (view.turn) {
      const t = view.turn;
      if (t.seat === view.you) text = t.choosing ? 'Choose which cards to keep' : !t.actionTaken ? 'Gather resources: gold or cards' : 'Build, use abilities, or end your turn';
      else text = t.choosing ? 'Choosing cards…' : !t.actionTaken ? 'Gathering resources…' : t.builds ? `Built ${t.builds} district${t.builds > 1 ? 's' : ''}` : 'Considering their options…';
    }
    el.textContent = text;
  }
}

