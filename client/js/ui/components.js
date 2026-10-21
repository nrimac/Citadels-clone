// Reusable UI building blocks: buttons with sound, modals, toasts, and the
// floating card preview shown when hovering any card.

import { h, fromHTML, setChildren } from '../core/dom.js';
import { ICONS } from '../art/icons.js';
import { play } from '../audio/index.js';
import { districtCard, characterCard } from './cards.js';

export function icon(name) {
  return fromHTML(ICONS[name] ?? ICONS.info);
}

export function button(label, { icon: iconName, variant = '', onClick, sound = 'click', title, disabled, size = '', type = 'button' } = {}) {
  const el = h(
    'button',
    { class: `btn ${variant ? `btn-${variant}` : ''} ${size ? `btn-${size}` : ''}`, type, title, disabled },
    iconName ? icon(iconName) : null,
    label != null ? h('span', null, label) : null,
  );
  el.addEventListener('click', (e) => {
    if (sound) play(sound);
    onClick?.(e);
  });
  el.addEventListener('pointerenter', () => !el.disabled && play('hover'));
  return el;
}

export function iconButton(name, { title, onClick, sound = 'click', classes = '' } = {}) {
  const el = h('button', { class: `icon-btn ${classes}`, type: 'button', title, 'aria-label': title }, icon(name));
  el.addEventListener('click', (e) => {
    if (sound) play(sound);
    onClick?.(e);
  });
  el.addEventListener('pointerenter', () => play('hover'));
  return el;
}

export function segmented(options, value, onChange) {
  const el = h('div', { class: 'segmented', role: 'radiogroup' });
  const render = (current) => {
    setChildren(el,
      ...options.map((opt) => {
        const b = h('button', { type: 'button', class: opt.value === current ? 'on' : '', role: 'radio', 'aria-checked': String(opt.value === current) }, opt.label);
        b.addEventListener('click', () => {
          if (opt.value === current) return;
          play('toggle');
          render(opt.value);
          onChange(opt.value);
        });
        return b;
      }),
    );
  };
  render(value);
  el.setValue = render;
  return el;
}

export function slider(value, onInput) {
  const el = h('input', { type: 'range', class: 'slider', min: '0', max: '100', value: String(Math.round(value * 100)) });
  const paint = () => el.style.setProperty('--fill', `${el.value}%`);
  paint();
  el.addEventListener('input', () => {
    paint();
    onInput(Number(el.value) / 100);
  });
  return el;
}

export function toggle(label, checked, onChange) {
  const input = h('input', { type: 'checkbox' });
  input.checked = !!checked;
  input.addEventListener('change', () => {
    play('toggle');
    onChange(input.checked);
  });
  return h('label', { class: 'toggle' }, input, h('span', { class: 'track' }), h('span', null, label));
}

// ------------------------------------------------------------------ modals

const openModals = [];

export function openModal({ title, content, actions = [], className = '', dismissible = true, onClose, surface = 'parchment' }) {
  const close = (reason) => {
    const idx = openModals.indexOf(api);
    if (idx < 0) return;
    openModals.splice(idx, 1);
    backdrop.classList.add('closing');
    play('close');
    setTimeout(() => backdrop.remove(), 180);
    onClose?.(reason);
  };
  const header = title
    ? h(
        'div',
        { class: 'modal-header' },
        h('h2', null, title),
        dismissible ? h('button', { class: 'modal-close', type: 'button', 'aria-label': 'Close', onclick: () => close('dismiss') }, icon('close')) : null,
      )
    : null;
  const modal = h(
    'div',
    { class: `modal ${surface} ${className}`, role: 'dialog', 'aria-modal': 'true' },
    header,
    content,
    actions.length ? h('div', { class: 'modal-actions' }, actions) : null,
  );
  const backdrop = h('div', { class: 'modal-backdrop' }, modal);
  backdrop.addEventListener('pointerdown', (e) => {
    if (e.target === backdrop && dismissible) close('dismiss');
  });
  document.body.append(backdrop);
  play('open');
  const api = { close, el: modal, backdrop, dismissible };
  openModals.push(api);
  return api;
}

window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !openModals.length) return;
  const top = openModals[openModals.length - 1];
  if (top.dismissible) top.close('escape');
});

export function confirmDialog({ title, message, confirm = 'Confirm', cancel = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      m.close();
      resolve(v);
    };
    const m = openModal({
      title,
      content: h('p', { class: 'modal-text' }, message),
      actions: [button(cancel, { variant: 'ghost', onClick: () => finish(false) }), button(confirm, { variant: danger ? 'primary' : 'gold', onClick: () => finish(true) })],
      onClose: () => {
        if (!done) {
          done = true;
          resolve(false);
        }
      },
    });
  });
}

// ------------------------------------------------------------------ toasts

let toastRoot = null;

export function toast(message, { type = 'info', duration = 2800 } = {}) {
  if (!toastRoot) {
    toastRoot = h('div', { class: 'toasts', 'aria-live': 'polite' });
    document.body.append(toastRoot);
  }
  const el = h('div', { class: `toast ${type}` }, message);
  toastRoot.append(el);
  if (type === 'error') play('error');
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ------------------------------------------------------------------ card preview

export function installCardPreview() {
  let tip = null;
  let current = null;
  const hide = () => {
    tip?.remove();
    tip = null;
    current = null;
  };
  const show = (target, x, y) => {
    const type = target.dataset.preview;
    const id = target.dataset.previewId;
    if (current === `${type}:${id}`) return position(x, y);
    hide();
    current = `${type}:${id}`;
    const card = type === 'character' ? characterCard(id, { text: true, classes: 'show-text' }) : districtCard(id, { classes: 'show-text' });
    tip = h('div', { class: 'preview-tip' }, card);
    document.body.append(tip);
    position(x, y);
  };
  const position = (x, y) => {
    if (!tip) return;
    const w = 190;
    const hgt = 266;
    const left = x + 24 + w > window.innerWidth ? x - w - 24 : x + 24;
    const top = Math.min(window.innerHeight - hgt - 8, Math.max(8, y - hgt / 2));
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${top}px`;
  };
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const target = e.target.closest?.('[data-preview]');
    // Don't preview cards that are already shown at full size with their text.
    if (!target || target.closest('.preview-tip') || target.classList.contains('no-preview') || target.closest('.no-preview')) return hide();
    show(target, e.clientX, e.clientY);
  });
  document.addEventListener('pointerdown', hide);
  window.addEventListener('blur', hide);
  return hide;
}
