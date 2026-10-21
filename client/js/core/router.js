// Screen router. A screen is a function `(app, params) => { el, destroy?, onShow? }`.
// Screens are registered by name so new ones (e.g. a card gallery, a
// campaign mode) can be added without touching the router.

const registry = new Map();

export function registerScreen(name, factory) {
  registry.set(name, factory);
}

export class Router {
  constructor(root, app) {
    this.root = root;
    this.app = app;
    this.current = null;
    this.currentName = null;
  }

  go(name, params = {}) {
    // A screen may navigate while it is being built (e.g. the online lobby
    // discovering a game already in progress): finish the current mount first.
    if (this.navigating) {
      this.pending = [name, params];
      return null;
    }
    this.navigating = true;
    try {
      this._mount(name, params);
    } finally {
      this.navigating = false;
    }
    if (this.pending) {
      const [next, nextParams] = this.pending;
      this.pending = null;
      this.go(next, nextParams);
    }
    return this.current;
  }

  _mount(name, params) {
    const factory = registry.get(name);
    if (!factory) throw new Error(`Unknown screen: ${name}`);
    const prev = this.current;
    if (prev) {
      try {
        prev.destroy?.();
      } catch (err) {
        console.error('[router] destroy failed', err);
      }
      prev.el.classList.add('leaving');
      setTimeout(() => prev.el.remove(), 320);
    } else {
      this.root.replaceChildren();
    }
    const screen = factory(this.app, params);
    screen.el.classList.add('screen');
    this.root.append(screen.el);
    this.current = screen;
    this.currentName = name;
    screen.onShow?.();
  }
}
