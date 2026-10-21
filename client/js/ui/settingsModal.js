import { h } from '../core/dom.js';
import { settings } from '../core/settings.js';
import { sanitizeName } from '../../../shared/protocol.js';
import { button, openModal, segmented, slider, toggle } from './components.js';
import { play } from '../audio/index.js';

export function openSettings({ onPacing } = {}) {
  const nameInput = h('input', { class: 'input', maxlength: '20', placeholder: 'Your name', value: settings.get('name') || '' });
  nameInput.addEventListener('change', () => settings.set({ name: sanitizeName(nameInput.value, '') }));

  const volumeRow = (label, key, test) =>
    h(
      'div',
      { class: 'settings-row' },
      h('span', { class: 'label' }, label),
      slider(settings.get(key), (v) => {
        settings.set({ [key]: v });
        if (test) play(test);
      }),
    );

  const content = h(
    'div',
    { class: 'settings' },
    h('div', { class: 'field' }, h('label', null, 'Your name'), nameInput),
    h('div', { class: 'ornament' }, 'Sound'),
    volumeRow('Master', 'master', 'coin'),
    volumeRow('Music', 'music'),
    volumeRow('Effects', 'sfx', 'cardFlip'),
    h('div', { class: 'settings-row' }, toggle('Mute everything', settings.get('muted'), (v) => settings.set({ muted: v }))),
    h('div', { class: 'ornament' }, 'Table'),
    h(
      'div',
      { class: 'settings-row' },
      h('span', { class: 'label' }, 'Bot speed'),
      segmented(
        [
          { value: 'slow', label: 'Leisurely' },
          { value: 'normal', label: 'Steady' },
          { value: 'fast', label: 'Brisk' },
        ],
        settings.get('pacing'),
        (v) => {
          settings.set({ pacing: v });
          onPacing?.(v);
        },
      ),
    ),
    h('div', { class: 'settings-row' }, toggle('Reduce motion', settings.get('reduceMotion'), (v) => settings.set({ reduceMotion: v }))),
    h('div', { class: 'settings-row' }, toggle('Show hints', settings.get('showHints'), (v) => settings.set({ showHints: v }))),
  );

  const modal = openModal({
    title: 'Settings',
    content,
    actions: [button('Done', { variant: 'gold', onClick: () => modal.close() })],
    onClose: () => settings.set({ name: sanitizeName(nameInput.value, '') }),
  });
  return modal;
}
