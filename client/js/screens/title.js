import { h, fromHTML } from '../core/dom.js';
import { registerScreen } from '../core/router.js';
import { skylineLayers } from '../art/scenery.js';
import { crownSVG } from '../art/icons.js';
import { music } from '../audio/index.js';
import { button } from '../ui/components.js';
import { settings } from '../core/settings.js';
import { openRules } from '../ui/rules.js';
import { openSettings } from '../ui/settingsModal.js';
import { quickGameSeats } from './localSetup.js';
import { LocalSession } from '../sessions/LocalSession.js';

export function sceneBackdrop() {
  const layers = skylineLayers();
  const el = h(
    'div',
    { class: 'scene' },
    h('div', { class: 'scene-sky' }),
    h('div', { class: 'scene-layer depth-0', html: layers.sky }),
    h('div', { class: 'scene-layer depth-1', html: layers.far }),
    h('div', { class: 'fog fog-back' }),
    h('div', { class: 'scene-layer depth-2', html: layers.mid }),
    h('div', { class: 'fog fog-front' }),
    h('div', { class: 'scene-layer depth-3', html: layers.near }),
    h('div', { class: 'embers' }, Array.from({ length: 18 }, (_, i) => h('span', { style: { '--drift': `${((i * 7) % 9 - 4) * 30}px`, left: `${(i * 37) % 100}%`, animationDelay: `${(i * 1.7) % 12}s` } }))),
  );
  const onMove = (e) => {
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;
    el.style.setProperty('--px', x.toFixed(3));
    el.style.setProperty('--py', y.toFixed(3));
  };
  window.addEventListener('pointermove', onMove);
  el.destroy = () => window.removeEventListener('pointermove', onMove);
  return el;
}

registerScreen('title', (app) => {
  music.play('menu');
  const backdrop = sceneBackdrop();

  const quickGame = () => {
    const session = new LocalSession({ seats: quickGameSeats(settings.get('name')), options: { cityGoal: 8 }, pacing: settings.get('pacing') });
    app.go('game', { session });
  };

  const menu = h(
    'nav',
    { class: 'title-menu' },
    button('Quick Game', { variant: 'primary', size: 'large', icon: 'play', onClick: quickGame }),
    button('Gather at the Table', { size: 'large', icon: 'users', onClick: () => app.go('localSetup') }),
    button('Play Online', { size: 'large', icon: 'globe', onClick: () => app.go('online') }),
    h(
      'div',
      { class: 'title-menu-row' },
      button('How to Play', { variant: 'ghost', icon: 'book', onClick: () => openRules() }),
      button('Settings', { variant: 'ghost', icon: 'gear', onClick: () => openSettings() }),
    ),
  );

  const el = h(
    'div',
    { class: 'title-screen' },
    backdrop,
    h(
      'main',
      { class: 'title-content' },
      h('div', { class: 'title-crown' }, fromHTML(crownSVG())),
      h('h1', { class: 'title-logo' }, h('span', { class: 'gold-text' }, 'Citadels')),
      h('p', { class: 'title-tagline' }, 'Scheme in shadow · Build in gold · Rule the realm'),
      menu,
    ),
    h(
      'footer',
      { class: 'title-footer' },
      'A fan-made tribute to the card game by Bruno Faidutti. Every illustration and note of music is created live in your browser.',
    ),
  );

  return {
    el,
    destroy() {
      backdrop.destroy();
    },
  };
});
