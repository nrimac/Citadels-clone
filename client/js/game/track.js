// The character track: all characters in calling order with their status
// this round (set aside, called, current, murdered, robbed, yours).

import { h, fromHTML, setChildren } from '../core/dom.js';
import { characterMedallion } from '../ui/cards.js';
import { crestSVG } from '../art/icons.js';
import { icon } from '../ui/components.js';

export class CharacterTrack {
  constructor(root) {
    this.root = root;
    this.slots = new Map();
  }

  _ensure(view) {
    const ids = view.characters.join(',');
    if (this.ids === ids) return;
    this.ids = ids;
    this.slots.clear();
    setChildren(
      this.root,
      ...view.characters.map((id) => {
        const owner = h('div', { class: 'track-owner' });
        const marks = h('div', { class: 'track-marks' });
        const el = h('div', { class: 'track-slot', dataset: { character: id } }, characterMedallion(id), owner, marks);
        this.slots.set(id, { el, owner, marks });
        return el;
      }),
    );
  }

  update(view) {
    this._ensure(view);
    const me = view.you != null ? view.players[view.you] : null;
    const mine = new Set(me?.characters.map((c) => c.id) ?? []);
    const faceUp = new Set(view.draft?.faceUp ?? []);
    view.characters.forEach((id, i) => {
      const slot = this.slots.get(id);
      const ownerSeat = view.revealed[id];
      const called = view.phase === 'play' && i < view.callIndex;
      const current = view.phase === 'play' && i === view.callIndex;
      slot.el.className = [
        'track-slot',
        faceUp.has(id) ? 'faceup' : '',
        called ? 'called' : '',
        current ? 'current' : '',
        view.murdered === id ? 'murdered' : '',
        view.robbed === id ? 'robbed' : '',
        mine.has(id) ? 'mine' : '',
        called && ownerSeat == null && view.murdered !== id ? 'absent' : '',
      ]
        .filter(Boolean)
        .join(' ');
      slot.el.title = faceUp.has(id) ? 'Set aside face up this round' : mine.has(id) ? 'Your character' : '';
      setChildren(slot.owner, ownerSeat != null ? fromHTML(crestSVG(ownerSeat)) : '');
      setChildren(
        slot.marks,
        view.murdered === id ? h('span', { class: 'mark mark-murder', title: 'Murdered' }, icon('skull')) : '',
        view.robbed === id ? h('span', { class: 'mark mark-rob', title: 'Robbed' }, icon('bag')) : '',
      );
    });
  }
}
