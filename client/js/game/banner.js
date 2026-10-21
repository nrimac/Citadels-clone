// Queued announcement banners ("The King is called", "Round 3", ...).

import { h, fromHTML } from '../core/dom.js';
import { characterMedallion } from '../ui/cards.js';
import { crownSVG } from '../art/icons.js';

export class Banners {
  constructor(root) {
    this.root = root;
    this.queue = [];
    this.active = null;
    this.timer = null;
    this.speed = 1; // < 1 shortens banners for brisk games
  }

  push(banner) {
    this.queue.push(banner);
    // Never fall far behind the game: drop low-priority banners when backed up.
    while (this.queue.length > 4) {
      const idx = this.queue.findIndex((b) => b.minor);
      this.queue.splice(idx >= 0 ? idx : 0, 1);
    }
    if (!this.active) this._next();
  }

  clear() {
    this.queue = [];
    clearTimeout(this.timer);
    this.active?.remove();
    this.active = null;
  }

  _next() {
    const b = this.queue.shift();
    if (!b) {
      this.active = null;
      return;
    }
    const art = b.character
      ? characterMedallion(b.character, { classes: 'banner-medallion' })
      : b.crown
        ? h('div', { class: 'banner-emblem' }, fromHTML(crownSVG()))
        : null;
    const el = h(
      'div',
      { class: `banner tone-${b.tone ?? 'info'} ${b.big ? 'big' : ''}` },
      art,
      h(
        'div',
        { class: 'banner-text' },
        h('div', { class: 'banner-title' }, b.title),
        b.subtitle ? h('div', { class: 'banner-sub' }, b.subtitle) : null,
      ),
    );
    this.root.append(el);
    this.active = el;
    const backlog = this.queue.length;
    const duration = (b.duration ?? 1500) * this.speed * (backlog > 2 ? 0.55 : backlog > 0 ? 0.8 : 1);
    this.timer = setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => {
        el.remove();
        this._next();
      }, 260);
    }, duration);
  }
}
