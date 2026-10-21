// Table chat for online games: message list, quick phrases and an input box.

import { h } from '../core/dom.js';
import { seatColor } from '../art/icons.js';
import { icon } from '../ui/components.js';
import { play } from '../audio/index.js';

const QUICK = ['Well played!', 'Curses!', 'Hmm…', 'Long live the King!', 'Good game'];

export function chatPanel({ onSend }) {
  const list = h('div', { class: 'chat-list', role: 'log', 'aria-live': 'polite' });
  const input = h('input', { class: 'input chat-input', maxlength: '200', placeholder: 'Say something…', 'aria-label': 'Chat message' });
  const send = (text) => {
    const clean = String(text ?? '').trim();
    if (!clean) return;
    onSend(clean);
    play('click');
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      send(input.value);
      input.value = '';
    }
    e.stopPropagation();
  });
  const sendBtn = h(
    'button',
    {
      class: 'icon-btn',
      type: 'button',
      title: 'Send',
      onclick: () => {
        send(input.value);
        input.value = '';
      },
    },
    icon('chat'),
  );
  const quick = h(
    'div',
    { class: 'chat-quick' },
    QUICK.map((q) => h('button', { type: 'button', onclick: () => send(q) }, q)),
  );
  const el = h('div', { class: 'chat' }, list, quick, h('div', { class: 'chat-compose' }, input, sendBtn));

  let rendered = 0;
  function update(messages, room) {
    if (messages.length < rendered) {
      list.replaceChildren();
      rendered = 0;
    }
    const seatIndex = new Map((room?.seats ?? []).map((s, i) => [s.id, i]));
    for (const m of messages.slice(rendered)) {
      const idx = seatIndex.get(m.seatId) ?? 0;
      const mine = room && m.seatId === room.you;
      list.append(
        h(
          'div',
          { class: `chat-msg ${mine ? 'mine' : ''}` },
          h('span', { class: 'chat-name', style: { color: seatColor(idx).light } }, m.name),
          h('span', { class: 'chat-text' }, m.text),
        ),
      );
    }
    rendered = messages.length;
    list.scrollTop = list.scrollHeight;
  }

  return { el, update, focus: () => input.focus() };
}
