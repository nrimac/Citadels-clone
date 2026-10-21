export class Emitter {
  constructor() {
    this._handlers = new Map();
  }

  on(event, fn) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event).add(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    this._handlers.get(event)?.delete(fn);
  }

  emit(event, ...args) {
    for (const fn of [...(this._handlers.get(event) ?? [])]) {
      try {
        fn(...args);
      } catch (err) {
        console.error(`[emitter] ${event} handler failed`, err);
      }
    }
  }

  removeAll() {
    this._handlers.clear();
  }
}
