// User preferences, persisted locally and observable.

import { Emitter } from './emitter.js';
import { load, save } from './storage.js';

const DEFAULTS = {
  name: '',
  master: 0.8,
  music: 0.45,
  sfx: 0.8,
  muted: false,
  pacing: 'normal',
  reduceMotion: false,
  showHints: true,
};

class Settings extends Emitter {
  constructor() {
    super();
    this.values = { ...DEFAULTS, ...load('settings', {}) };
  }

  get(key) {
    return this.values[key];
  }

  set(patch) {
    Object.assign(this.values, patch);
    save('settings', this.values);
    this.emit('change', this.values, patch);
  }
}

export const settings = new Settings();
