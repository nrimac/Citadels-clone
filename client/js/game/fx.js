// Visual effects layer: elements that fly between places on the table
// (coins, cards, the crown) and particle bursts. Everything is purely
// decorative — game state is already rendered underneath.

import { h, fromHTML } from '../core/dom.js';
import { coinSVG, crownSVG, cardBackSVG } from '../art/icons.js';
import { settings } from '../core/settings.js';

const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

function bezierFrames(from, to, { arc = 80, scaleFrom = 1, scaleTo = 1, rotate = 0, steps = 14, fade = false }) {
  const a = center(from);
  const b = center(to);
  const ctrl = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - arc };
  const frames = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * ctrl.x + t * t * b.x;
    const y = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * ctrl.y + t * t * b.y;
    const s = scaleFrom + (scaleTo - scaleFrom) * t;
    frames.push({
      transform: `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${rotate * t}deg) scale(${s})`,
      opacity: fade && t > 0.85 ? (1 - t) / 0.15 : 1,
      offset: t,
    });
  }
  return frames;
}

export class FX {
  constructor(layer) {
    this.layer = layer;
  }

  get enabled() {
    return !settings.get('reduceMotion') && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  _spawn(el) {
    el.classList.add('fx-item');
    this.layer.append(el);
    return el;
  }

  async fly(el, from, to, { duration = 650, delay = 0, easing = 'cubic-bezier(.45,.05,.35,1)', ...path } = {}) {
    if (!this.enabled || !from || !to) return;
    this._spawn(el);
    el.style.opacity = '0';
    const anim = el.animate(bezierFrames(from, to, path), { duration, delay, easing, fill: 'both' });
    el.style.opacity = '';
    try {
      await anim.finished;
    } catch {
      /* cancelled */
    }
    el.remove();
  }

  coins(from, to, count = 1, { delay = 0 } = {}) {
    const n = Math.min(Math.max(1, count), 10);
    const jobs = [];
    for (let i = 0; i < n; i++) {
      const el = h('div', { class: 'fx-coin', html: coinSVG() });
      jobs.push(this.fly(el, from, to, { duration: 620 + i * 25, delay: delay + i * 85, arc: 70 + Math.random() * 50, rotate: 360, scaleFrom: 0.9, scaleTo: 0.75 }));
    }
    return Promise.all(jobs);
  }

  cards(from, to, count = 1, { delay = 0, width = 64 } = {}) {
    const n = Math.min(Math.max(1, count), 6);
    const jobs = [];
    for (let i = 0; i < n; i++) {
      const el = h('div', { class: 'fx-card', style: { width: `${width}px`, height: `${width * 1.4}px` }, html: cardBackSVG() });
      jobs.push(this.fly(el, from, to, { duration: 560, delay: delay + i * 110, arc: 50, rotate: -12 + Math.random() * 24, scaleFrom: 1, scaleTo: 0.6 }));
    }
    return Promise.all(jobs);
  }

  element(node, from, to, opts = {}) {
    const wrap = h('div', { class: 'fx-element', style: { width: `${from.width}px`, height: `${from.height}px` } }, node);
    return this.fly(wrap, from, to, { duration: 720, arc: 60, ...opts });
  }

  crown(from, to) {
    const el = h('div', { class: 'fx-crown', html: crownSVG() });
    return this.fly(el, from, to, { duration: 1000, arc: 140, scaleFrom: 2.2, scaleTo: 0.9 });
  }

  burst(rect, { color = '#ffd36b', count = 14, spread = 70, size = 6 } = {}) {
    if (!this.enabled || !rect) return;
    const c = center(rect);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = spread * (0.5 + Math.random() * 0.6);
      const p = this._spawn(h('div', { class: 'fx-spark', style: { background: color, width: `${size}px`, height: `${size}px`, left: `${c.x}px`, top: `${c.y}px` } }));
      p.animate(
        [
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(0.2)`, opacity: 0 },
        ],
        { duration: 600 + Math.random() * 400, easing: 'cubic-bezier(.2,.8,.3,1)' },
      ).finished.then(() => p.remove(), () => p.remove());
    }
  }

  dust(rect) {
    if (!this.enabled || !rect) return;
    for (let i = 0; i < 10; i++) {
      const x = rect.left + Math.random() * rect.width;
      const y = rect.bottom - 4;
      const p = this._spawn(h('div', { class: 'fx-dust', style: { left: `${x}px`, top: `${y}px` } }));
      const dx = (Math.random() - 0.5) * 60;
      p.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0.8 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% - ${20 + Math.random() * 30}px)) scale(1.6)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 400, easing: 'ease-out' },
      ).finished.then(() => p.remove(), () => p.remove());
    }
  }

  crumble(rect, color = '#8a7a66') {
    if (!this.enabled || !rect) return;
    const cols = 4;
    const rows = 5;
    const w = rect.width / cols;
    const hgt = rect.height / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const piece = this._spawn(
          h('div', {
            class: 'fx-rubble',
            style: { left: `${rect.left + c * w}px`, top: `${rect.top + r * hgt}px`, width: `${w + 1}px`, height: `${hgt + 1}px`, background: color },
          }),
        );
        const dx = (c - cols / 2 + Math.random()) * 18;
        piece.animate(
          [
            { transform: 'translate(0,0) rotate(0)', opacity: 1 },
            { transform: `translate(${dx}px, ${120 + Math.random() * 80}px) rotate(${(Math.random() - 0.5) * 180}deg)`, opacity: 0 },
          ],
          { duration: 900 + Math.random() * 500, delay: (rows - r) * 40, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'both' },
        ).finished.then(() => piece.remove(), () => piece.remove());
      }
    }
    this.dust(rect);
  }

  shake(el) {
    if (!this.enabled || !el) return;
    el.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
      { duration: 380, easing: 'ease-in-out' },
    );
  }

  pulse(el, className = 'fx-pulse') {
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), 1200);
  }

  confetti(count = 80) {
    if (!this.enabled) return;
    const colors = ['#f2c94c', '#fff1b8', '#c2423a', '#4a7fc8', '#4f9a5a', '#8d5cc4'];
    for (let i = 0; i < count; i++) {
      const el = this._spawn(
        h('div', {
          class: i % 3 ? 'fx-confetti' : 'fx-confetti coin-confetti',
          style: { left: `${Math.random() * 100}vw`, background: i % 3 ? colors[i % colors.length] : '' },
          html: i % 3 ? '' : coinSVG(),
        }),
      );
      el.animate(
        [
          { transform: `translate(0, -10vh) rotate(0deg)`, opacity: 1 },
          { transform: `translate(${(Math.random() - 0.5) * 30}vw, 110vh) rotate(${(Math.random() - 0.5) * 1080}deg)`, opacity: 0.9 },
        ],
        { duration: 2600 + Math.random() * 2200, delay: Math.random() * 1200, easing: 'cubic-bezier(.25,.4,.6,1)', fill: 'both' },
      ).finished.then(() => el.remove(), () => el.remove());
    }
  }

  static cloneRect(rect) {
    return rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom } : null;
  }

  static fromNode(node) {
    return node ? FX.cloneRect(node.getBoundingClientRect()) : null;
  }

  static svgNode(markup) {
    return fromHTML(markup);
  }
}
