// Minimal DOM helpers. `h` builds elements declaratively; `reconcile` keeps
// keyed lists of elements stable across renders so CSS transitions and
// entrance animations work without a framework.

export function h(tag, props = null, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (key === 'class' || key === 'className') el.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : value;
      else if (key === 'style' && typeof value === 'object') {
        for (const [prop, v] of Object.entries(value)) {
          if (prop.startsWith('--')) el.style.setProperty(prop, v);
          else el.style[prop] = v;
        }
      }
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key === 'html') el.innerHTML = value;
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value === true) el.setAttribute(key, '');
      else el.setAttribute(key, value);
    }
  }
  append(el, children);
  return el;
}

/** Replace an element's children, skipping null/false entries and flattening arrays. */
export function setChildren(el, ...children) {
  el.replaceChildren();
  return append(el, children);
}

export function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

/** Create an element from an HTML/SVG string. */
export function fromHTML(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

/**
 * Reconcile `container`'s children with `items`, keyed by `key(item)`.
 * New elements come from `create(item)` and get an `is-entering` class for one
 * frame; existing ones are passed to `update(el, item)`. Removed elements can
 * animate out via `exit(el)` returning a promise.
 */
export function reconcile(container, items, { key, create, update, exit } = {}) {
  const existing = new Map();
  for (const el of container.children) {
    if (el.dataset.key != null && !el.classList.contains('is-leaving')) existing.set(el.dataset.key, el);
  }
  let cursor = container.firstElementChild;
  const created = [];
  items.forEach((item, i) => {
    const k = String(key(item, i));
    let el = existing.get(k);
    if (el) {
      existing.delete(k);
      update?.(el, item, i);
    } else {
      el = create(item, i);
      el.dataset.key = k;
      created.push(el);
    }
    while (cursor && cursor.classList.contains('is-leaving')) cursor = cursor.nextElementSibling;
    if (el !== cursor) container.insertBefore(el, cursor);
    else cursor = cursor.nextElementSibling;
  });
  for (const el of existing.values()) {
    if (exit) {
      el.classList.add('is-leaving');
      Promise.resolve(exit(el)).then(() => el.remove());
    } else el.remove();
  }
  if (created.length) {
    created.forEach((el) => el.classList.add('is-entering'));
    requestAnimationFrame(() => requestAnimationFrame(() => created.forEach((el) => el.classList.remove('is-entering'))));
  }
  return created;
}

export function onKey(handler) {
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
