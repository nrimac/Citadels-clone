// In-game choice overlays. One overlay is shown at a time inside the game
// screen; each can be minimised ("peek at the table") without losing state.

import { h, fromHTML, append } from '../core/dom.js';
import { play } from '../audio/index.js';
import { button, icon } from '../ui/components.js';
import { crestSVG } from '../art/icons.js';

export class Overlays {
  constructor(root) {
    this.root = root;
    this.current = null;
  }

  get open() {
    return !!this.current;
  }

  close(key) {
    if (!this.current || (key && this.current.key !== key)) return;
    const { el } = this.current;
    this.current = null;
    el.classList.add('closing');
    setTimeout(() => el.remove(), 220);
  }

  /** Show an overlay unless one with the same key is already open. */
  show(key, build) {
    if (this.current?.key === key) return this.current;
    this.close();
    const panel = h('div', { class: 'overlay-panel' });
    const peek = h(
      'button',
      { class: 'overlay-peek btn btn-ghost btn-small', type: 'button' },
      icon('eye'),
      h('span', null, 'Peek at the table'),
    );
    const restore = h(
      'button',
      { class: 'overlay-restore btn btn-gold', type: 'button' },
      icon('cards'),
      h('span', null, 'Back to your choice'),
    );
    const el = h('div', { class: 'overlay' }, h('div', { class: 'overlay-dim' }), panel, peek, restore);
    peek.addEventListener('click', () => {
      play('close');
      el.classList.add('peeking');
    });
    restore.addEventListener('click', () => {
      play('open');
      el.classList.remove('peeking');
    });
    this.root.append(el);
    play('open');
    const handle = { key, el, panel, close: () => this.close(key) };
    this.current = handle;
    build(panel, handle);
    return handle;
  }

  /**
   * Generic card chooser.
   * options: [{ value, el, disabled, note }]
   */
  chooser(key, { title, subtitle, options, min = 1, max = 1, confirmLabel, onConfirm, cancellable = true, onCancel, extra }) {
    return this.show(key, (panel, handle) => {
      if (cancellable) {
        handle.cancel = () => {
          handle.close();
          onCancel?.();
        };
      }
      const selected = new Set();
      const confirmBtn = button(typeof confirmLabel === 'function' ? confirmLabel(selected) : (confirmLabel ?? 'Confirm'), {
        variant: 'primary',
        sound: null,
        onClick: () => {
          if (selected.size < min || selected.size > max) return;
          play('cardSelect');
          handle.close();
          onConfirm([...selected]);
        },
      });
      const refresh = () => {
        confirmBtn.disabled = selected.size < min || selected.size > max;
        const label = typeof confirmLabel === 'function' ? confirmLabel(selected) : (confirmLabel ?? 'Confirm');
        confirmBtn.querySelector('span').textContent = label;
        options.forEach((o) => {
          o.el.classList.toggle('selected', selected.has(o.value));
          if (!o.disabled) o.el.setAttribute('aria-pressed', String(selected.has(o.value)));
        });
      };
      const row = h(
        'div',
        { class: `chooser-row count-${options.length}` },
        options.map((o) => {
          const wrap = h(
            'div',
            { class: `chooser-item ${o.disabled ? 'disabled' : ''}` },
            o.el,
            o.note ? h('div', { class: 'chooser-note' }, o.note) : null,
          );
          o.el.classList.add(o.disabled ? 'dimmed' : 'playable', 'no-preview');
          if (!o.disabled) {
            o.el.tabIndex = 0;
            o.el.setAttribute('role', 'button');
            o.el.addEventListener('click', () => {
              if (selected.has(o.value)) selected.delete(o.value);
              else {
                if (max === 1) selected.clear();
                if (selected.size >= max) return play('error');
                selected.add(o.value);
              }
              play('cardSelect');
              refresh();
            });
            o.el.addEventListener('keydown', (e) => {
              if (e.key === ' ') {
                e.preventDefault();
                o.el.click();
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (!selected.has(o.value)) o.el.click();
                if (!confirmBtn.disabled) confirmBtn.click();
              }
            });
            o.el.addEventListener('dblclick', () => {
              if (max === 1) {
                selected.clear();
                selected.add(o.value);
                refresh();
                confirmBtn.click();
              }
            });
          }
          return wrap;
        }),
      );
      append(panel, [
        h('h2', { class: 'overlay-title gold-text' }, title),
        subtitle ? h('p', { class: 'overlay-sub' }, subtitle) : null,
        row,
        extra ?? null,
        h(
          'div',
          { class: 'overlay-actions' },
          cancellable ? button('Cancel', { variant: 'ghost', onClick: () => handle.cancel() }) : null,
          confirmBtn,
        ),
      ]);
      refresh();
      setTimeout(() => panel.querySelector('.chooser-item [tabindex="0"]')?.focus({ preventScroll: true }), 80);
    });
  }

  handoff({ seat, name, onReady }) {
    return this.show(`handoff:${seat}`, (panel, handle) => {
      handle.el.classList.add('handoff');
      panel.append(
        h('div', { class: 'handoff-crest' }, fromHTML(crestSVG(seat))),
        h('p', { class: 'overlay-sub' }, 'Pass the device to'),
        h('h2', { class: 'overlay-title gold-text handoff-name' }, name),
        h('p', { class: 'handoff-note' }, 'Everyone else, avert your eyes — private cards are about to be revealed.'),
        h(
          'div',
          { class: 'overlay-actions' },
          button(`I am ${name}`, {
            variant: 'primary',
            size: 'large',
            icon: 'eye',
            onClick: () => {
              handle.close();
              onReady();
            },
          }),
        ),
      );
    });
  }
}
