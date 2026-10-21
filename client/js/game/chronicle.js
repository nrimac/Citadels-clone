// The chronicle drawer: a running, narrated log of the game (and the table
// chat in online games).

import { h, fromHTML, append } from '../core/dom.js';
import { crestSVG } from '../art/icons.js';
import { icon, iconButton } from '../ui/components.js';
import { narrate } from './narrate.js';
import { chatPanel } from './chat.js';

export class Chronicle {
  constructor(root, { canChat, onSendChat, onToggle }) {
    this.root = root;
    this.onToggle = onToggle;
    this.seen = new Set();
    this.list = h('div', { class: 'chronicle-list' });
    this.unread = 0;
    this.unreadChat = 0;
    this.tab = 'log';
    this.chat = canChat ? chatPanel({ onSend: onSendChat }) : null;
    this.tabs = h(
      'div',
      { class: 'chronicle-tabs segmented' },
      h('button', { type: 'button', class: 'on', onclick: () => this.setTab('log') }, 'Chronicle'),
      this.chat ? h('button', { type: 'button', onclick: () => this.setTab('chat') }, 'Table talk') : null,
    );
    this.body = h('div', { class: 'chronicle-body' }, this.list, this.chat?.el ?? null);
    append(this.root, [
      h(
        'div',
        { class: 'chronicle-head' },
        h('h3', { class: 'gold-text' }, 'The Chronicle'),
        iconButton('close', { title: 'Close', onClick: () => this.toggle(false) }),
      ),
      this.tabs,
      this.body,
    ]);
    this.setTab('log');
  }

  get isOpen() {
    return this.root.classList.contains('open');
  }

  toggle(open = !this.isOpen) {
    this.root.classList.toggle('open', open);
    if (open) {
      if (this.tab === 'log') this.unread = 0;
      else this.unreadChat = 0;
      this.list.scrollTop = this.list.scrollHeight;
    }
    this.onToggle?.(open);
  }

  setTab(tab) {
    this.tab = tab;
    [...this.tabs.children].forEach((b, i) => b.classList.toggle('on', (i === 0 && tab === 'log') || (i === 1 && tab === 'chat')));
    this.list.hidden = tab !== 'log';
    if (this.chat) this.chat.el.hidden = tab !== 'chat';
    if (tab === 'chat') {
      this.unreadChat = 0;
      this.chat?.focus();
    } else this.unread = 0;
    this.onToggle?.(this.isOpen);
  }

  reset() {
    this.seen.clear();
    this.list.replaceChildren();
    this.unread = 0;
  }

  update(view) {
    let added = 0;
    for (const e of view.log) {
      if (this.seen.has(e.seq)) continue;
      this.seen.add(e.seq);
      const n = narrate(e, view);
      if (!n) continue;
      const seat = e.seat ?? null;
      this.list.append(
        h(
          'div',
          { class: `chron-entry tone-${n.tone} ${n.heading ? 'heading' : ''}` },
          seat != null && !n.heading
            ? h('span', { class: 'chron-crest' }, fromHTML(crestSVG(seat)))
            : h('span', { class: 'chron-crest' }, icon('scroll')),
          h('span', { class: 'chron-text' }, n.text),
        ),
      );
      added++;
    }
    while (this.list.children.length > 300) this.list.firstElementChild.remove();
    if (added) {
      if (this.isOpen && this.tab === 'log') this.list.scrollTop = this.list.scrollHeight;
      else this.unread += added;
    }
  }

  updateChat(messages, room, incoming) {
    if (!this.chat) return;
    this.chat.update(messages, room);
    if (incoming && !(this.isOpen && this.tab === 'chat') && incoming.seatId !== room?.you) this.unreadChat++;
  }
}
