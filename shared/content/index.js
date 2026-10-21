// Loading this module registers all bundled content.
// To add an expansion: create character / district files that call the
// register* functions, add an edition in editions.js, and import them here.
import './characters/classic.js';
import './districts/classic.js';
import './editions.js';

export * from './registry.js';
export * from './suits.js';
