// The game table screen. It renders views coming from a session (local or
// online), turns player intent into actions, and drives presentation.

import { h, fromHTML, setChildren } from '../core/dom.js';
import { registerScreen } from '../core/router.js';
import { settings } from '../core/settings.js';
import { getCharacter, getDistrict } from '../../../shared/content/index.js';
import { music, play } from '../audio/index.js';
import { characterCard, districtCard } from '../ui/cards.js';
import { button, confirmDialog, icon, iconButton, toast } from '../ui/components.js';
import { openRules } from '../ui/rules.js';
import { openSettings } from '../ui/settingsModal.js';
import { crestSVG } from '../art/icons.js';
import { ActionPanel } from './actions.js';
import { Banners } from './banner.js';
import { Chronicle } from './chronicle.js';
import { FX } from './fx.js';
import { Overlays } from './overlays.js';
import { PlayerArea } from './player.js';
import { Presenter } from './presenter.js';
import { buildResults } from './results.js';
import { SeatsView } from './seats.js';
import { TableView } from './table.js';
import { CharacterTrack } from './track.js';
import { makeNamer } from './narrate.js';

const PHASE_LABEL = { draft: 'Choosing characters', play: 'Characters are called', over: 'Game over' };

class GameScreen {
  constructor(app, session) {
    this.app = app;
    this.session = session;
    this.view = null;
    this.lastSeq = -1;
    this.resultsShown = false;
    this.decisionKey = null;
    this.offs = [];

    this._layout();
    this._wire();
  }

  // ------------------------------------------------------------ layout

  _layout() {
    this.roundInfo = h('div', { class: 'round-info' });
    this.timer = h('div', { class: 'turn-timer', hidden: true });
    this.conn = h('div', { class: 'conn-pill', hidden: true }, icon('wifi'), h('span', null, 'Reconnecting…'));
    this.logBtn = iconButton('scroll', { title: 'Chronicle (L)', onClick: () => this.chronicle.toggle() });
    this.logBadge = h('span', { class: 'badge', hidden: true });
    this.logBtn.append(this.logBadge);
    this.muteBtn = iconButton(settings.get('muted') ? 'mute' : 'sound', {
      title: 'Sound on/off',
      onClick: () => settings.set({ muted: !settings.get('muted') }),
    });

    const trackEl = h('div', { class: 'char-track' });
    this.top = h(
      'header',
      { class: 'game-top' },
      h('div', { class: 'top-left' }, iconButton('exit', { title: 'Leave game', onClick: () => this.leave() }), this.roundInfo),
      trackEl,
      h(
        'div',
        { class: 'top-right' },
        this.conn,
        this.timer,
        this.logBtn,
        iconButton('book', { title: 'How to play', onClick: () => openRules() }),
        this.muteBtn,
        iconButton('gear', { title: 'Settings', onClick: () => openSettings({ onPacing: (p) => this.session.setPacing?.(p) }) }),
      ),
    );

    const seatsEl = h('section', { class: 'opponents' });
    const tableEl = h('section', { class: 'table' });
    this.bannerRoot = h('div', { class: 'banner-root' });
    const meEl = h('section', { class: 'me' });
    const actionsEl = h('div', { class: 'me-actions leather' });
    const chronEl = h('aside', { class: 'chronicle leather' });
    this.overlayRoot = h('div', { class: 'overlay-root' });
    this.fxLayer = h('div', { class: 'fx-layer' });

    this.el = h(
      'div',
      { class: 'game-screen' },
      h('div', { class: 'table-backdrop' }),
      this.top,
      seatsEl,
      tableEl,
      h('div', { class: 'me-row' }, meEl, actionsEl),
      chronEl,
      this.overlayRoot,
      this.fxLayer,
    );

    this.track = new CharacterTrack(trackEl);
    this.seats = new SeatsView(seatsEl);
    this.table = new TableView(tableEl);
    tableEl.append(this.bannerRoot);
    this.player = new PlayerArea(meEl, { onBuild: (uid) => this.submit({ type: 'build', card: uid }) });
    this.actions = new ActionPanel(actionsEl, this);
    this.chronicle = new Chronicle(chronEl, {
      canChat: this.session.canChat,
      onSendChat: (text) => this.session.sendChat?.(text),
      onToggle: () => this._badge(),
    });
    this.overlays = new Overlays(this.overlayRoot);
    this.banners = new Banners(this.bannerRoot);
    this.fx = new FX(this.fxLayer);
    this.presenter = new Presenter({ root: this.el, fx: this.fx, banners: this.banners });
  }

  _wire() {
    const s = this.session;
    this.offs.push(
      s.on('view', (view) => this.onView(view)),
      s.on('handoff', ({ seat, name }) => {
        this.banners.clear();
        this.overlays.handoff({ seat, name, onReady: () => s.confirmHandoff() });
      }),
      s.on('actionError', (msg) => toast(msg, { type: 'error' })),
      s.on('restart', () => this.reset()),
      s.on('chat', (messages, incoming) => {
        this.chronicle.updateChat(messages, s.room, incoming);
        if (incoming && incoming.seatId !== s.room?.you) {
          play('chat');
          if (!this.chronicle.isOpen) toast(`${incoming.name}: ${incoming.text}`, { duration: 3500 });
        }
        this._badge();
      }),
      s.on('room', (room) => {
        if (room.status === 'lobby') this.app.go('online');
      }),
      s.on('closed', (reason) => {
        if (reason === 'kicked') toast('You were removed from the table.', { type: 'error' });
        else if (reason === 'closed') toast('The table was closed.', { type: 'error' });
        else if (reason === 'replaced') toast('This table was opened in another tab.', { type: 'error' });
        this.app.go('title');
      }),
      s.on('connection', (status) => {
        this.conn.hidden = status === 'open';
      }),
      settings.on('change', (values, patch) => {
        if ('muted' in patch) setChildren(this.muteBtn, icon(values.muted ? 'mute' : 'sound'));
        if ('reduceMotion' in patch) document.body.classList.toggle('reduce-motion', values.reduceMotion);
      }),
    );
    if (s.chat?.length) this.chronicle.updateChat(s.chat, s.room, null);

    this.keyHandler = (e) => {
      if (e.target.closest?.('input, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'l') return this.chronicle.toggle();
      // Turn shortcuts only apply when no dialog or choice is on screen.
      if (this.overlays.open || document.querySelector('.modal-backdrop')) return;
      const t = this.view?.legal?.turn;
      if (!t) return;
      if (key === 'g' && t.takeGold) this.submit({ type: 'takeGold' });
      else if (key === 'd' && t.drawCards) this.submit({ type: 'drawCards' });
      else if (key === 'e' && t.endTurn) this.endTurn();
    };
    window.addEventListener('keydown', this.keyHandler);
    this.tick = setInterval(() => this._timer(), 500);
    this.visibility = () => {
      if (!document.hidden) document.title = 'Citadels';
    };
    document.addEventListener('visibilitychange', this.visibility);
  }

  reset() {
    this.lastSeq = -1;
    this.resultsShown = false;
    this.decisionKey = null;
    this.chronicle.reset();
    this.banners.clear();
    this.overlays.close();
    this.view = null;
  }

  // ------------------------------------------------------------ rendering

  onView(view) {
    const pacing = this.session.kind === 'online' ? this.session.room?.settings?.pacing : settings.get('pacing');
    this.banners.speed = { slow: 1.15, normal: 1, fast: 0.65 }[pacing] ?? 1;
    const first = this.lastSeq < 0;
    // A different person now holds the device: don't show them stale banners.
    if (this.view && this.view.you !== view.you) this.banners.clear();
    const events = first ? [] : view.log.filter((e) => e.seq > this.lastSeq);
    this.lastSeq = view.seq;
    const before = first ? new Map() : this.presenter.snapshot();
    this.view = view;

    setChildren(
      this.roundInfo,
      h('div', { class: 'round-num' }, h('small', null, 'Round'), h('b', null, String(view.round))),
      h('div', { class: 'round-phase' }, PHASE_LABEL[view.phase] ?? ''),
    );
    this.track.update(view);
    this.seats.update(view);
    this.table.update(view);
    this.player.update(view);
    this.actions.update(view);
    this.chronicle.update(view);
    this._badge();
    this.el.dataset.phase = view.phase;
    this.el.classList.toggle('spectator', view.you == null);

    if (first && view.phase !== 'over') {
      this.banners.push({
        title: `Round ${view.round}`,
        subtitle: view.phase === 'draft' ? 'Choose your characters' : 'The characters are called',
        tone: 'gold',
        duration: 1400,
      });
    }
    this.presenter.present(view, events, before);
    this._decisions(view);

    if (view.phase === 'over' && !this.resultsShown) {
      this.resultsShown = true;
      setTimeout(() => this.showResults(), first ? 200 : 2400);
    }
  }

  _badge() {
    if (!this.chronicle) return;
    const n = this.chronicle.unreadChat;
    this.logBadge.hidden = !n;
    this.logBadge.textContent = String(n);
  }

  _timer() {
    const v = this.view;
    const mine = v?.legal && (v.legal.pick || v.legal.discard || v.legal.turn || v.legal.prompt);
    if (!v?.deadline || !mine) {
      this.timer.hidden = true;
      return;
    }
    const left = Math.max(0, Math.ceil((v.deadline - Date.now()) / 1000));
    this.timer.hidden = false;
    this.timer.classList.toggle('urgent', left <= 15);
    setChildren(
      this.timer,
      icon('hourglass'),
      h('span', null, left >= 60 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : `${left}s`),
    );
    if (left <= 10 && left > 0 && left !== this.lastTick) play('countdown');
    this.lastTick = left;
  }

  /** Open the right overlay when the local player must decide something. */
  _decisions(view) {
    const L = view.legal;
    let key = null;
    if (L?.pick || L?.discard) key = `draft:${view.round}:${view.draft.step}`;
    else if (L?.turn?.choosing) key = `keep:${view.seq}`;
    else if (L?.prompt) key = `prompt:${view.prompt?.card?.uid}`;
    else if (L?.turn) key = `turn:${view.round}:${view.callIndex}`;

    for (const k of ['draft', 'keep', 'prompt']) {
      if (this.overlays.current?.key === k && !key?.startsWith(k)) this.overlays.close(k);
    }
    if (key && key !== this.decisionKey) {
      const isNew = !this.decisionKey || key.split(':')[0] !== this.decisionKey.split(':')[0] || key.startsWith('draft');
      this.decisionKey = key;
      if (isNew && !key.startsWith('keep') && document.hidden) document.title = '⚜ Your move — Citadels';
      if (key.startsWith('draft')) setTimeout(() => this.openDraft(), 450);
      else if (key.startsWith('keep')) this.openKeep();
      else if (key.startsWith('prompt')) this.openPrompt();
    }
    if (!key) this.decisionKey = null;
  }

  // ------------------------------------------------------------ controller API (used by panels)

  submit(action) {
    const res = this.session.submit(action);
    if (res && res.ok === false) return res;
    return res;
  }

  async endTurn() {
    const v = this.view;
    const t = v?.legal?.turn;
    if (t && v.turn.builds === 0 && t.build.length && settings.get('showHints')) {
      const ok = await confirmDialog({
        title: 'End your turn?',
        message: 'You could still build a district this turn.',
        confirm: 'End turn',
        cancel: 'Keep playing',
      });
      if (!ok) return;
    }
    this.submit({ type: 'endTurn' });
  }

  openDraft() {
    const v = this.view;
    const L = v?.legal;
    if (!L?.pick && !L?.discard) return;
    const pool = L.pick ?? L.discard;
    const picking = !!L.pick;
    const faceUp = v.draft.faceUp;
    const extra = h(
      'div',
      { class: 'draft-extra' },
      faceUp.length
        ? h(
            'div',
            { class: 'draft-aside' },
            h('span', { class: 'label' }, 'Set aside face up'),
            h(
              'div',
              { class: 'faceup-row' },
              faceUp.map((id) => characterCard(id, { classes: 'discarded tiny' })),
            ),
          )
        : null,
      v.draft.faceDownCount
        ? h('div', { class: 'draft-aside' }, h('span', { class: 'label' }, `${v.draft.faceDownCount} face down`))
        : null,
    );
    const chars = [...pool].sort((a, b) => getCharacter(a).rank - getCharacter(b).rank);
    this.overlays.chooser('draft', {
      title: picking ? 'Choose Your Character' : 'Set a Character Aside',
      subtitle: picking
        ? v.crown === v.you && v.draft.step === 0
          ? 'You hold the crown, so you choose first.'
          : 'Your rivals cannot see what you take.'
        : 'This character is discarded face down — no one may play it this round.',
      options: chars.map((id) => ({ value: id, el: characterCard(id, { classes: 'choice' }), note: getCharacter(id).text })),
      confirmLabel: (sel) => {
        const id = [...sel][0];
        return id
          ? `${picking ? 'Take' : 'Discard'} the ${getCharacter(id).name}`
          : picking
            ? 'Choose a character'
            : 'Choose one to discard';
      },
      cancellable: false,
      extra,
      onConfirm: ([id]) => this.submit({ type: picking ? 'pick' : 'discardCharacter', character: id }),
    });
  }

  openKeep() {
    const v = this.view;
    const t = v?.legal?.turn;
    if (!t?.choosing || !v.turn.drawn) return;
    const keep = t.keep;
    const mine = new Set(v.players[v.you].city.map((c) => c.id));
    this.overlays.chooser('keep', {
      title: keep === 1 ? 'Keep One Card' : `Keep ${keep} Cards`,
      subtitle: 'The rest go to the bottom of the deck.',
      options: v.turn.drawn.map((c) => ({
        value: c.uid,
        el: districtCard(c, { classes: 'show-text choice' }),
        note: mine.has(c.id) ? 'Already in your city' : null,
      })),
      min: keep,
      max: keep,
      confirmLabel: (sel) => (sel.size === keep ? 'Keep' : `Select ${keep - sel.size} more`),
      cancellable: false,
      onConfirm: (cards) => this.submit({ type: 'keep', cards }),
    });
  }

  openPrompt() {
    const v = this.view;
    if (!v?.legal?.prompt || v.prompt?.type !== 'graveyard') return;
    const card = v.prompt.card;
    this.overlays.show('prompt', (panel, handle) => {
      panel.append(
        h('h2', { class: 'overlay-title gold-text' }, 'The Graveyard'),
        h(
          'p',
          { class: 'overlay-sub' },
          `The ${getDistrict(card.id).name} was destroyed. Pay ${v.prompt.cost} gold to take it into your hand?`,
        ),
        h(
          'div',
          { class: 'chooser-row' },
          h('div', { class: 'chooser-item' }, districtCard(card, { classes: 'show-text choice no-preview' })),
        ),
        h(
          'div',
          { class: 'overlay-actions' },
          button('Let it rest', {
            variant: 'ghost',
            onClick: () => {
              handle.close();
              this.submit({ type: 'graveyard', accept: false });
            },
          }),
          button(`Pay ${v.prompt.cost} gold`, {
            variant: 'primary',
            icon: 'coins',
            disabled: !v.legal.prompt.canAccept,
            onClick: () => {
              handle.close();
              this.submit({ type: 'graveyard', accept: true });
            },
          }),
        ),
      );
    });
  }

  startAbility(ability) {
    const v = this.view;
    const name = makeNamer(v);
    const submit = (payload) => this.submit({ type: 'ability', ability: ability.id, ...payload });
    switch (ability.input) {
      case 'character': {
        const options = new Set(ability.options);
        const mine = new Set(v.players[v.you].characters.map((c) => c.id));
        const faceUp = new Set(v.draft?.faceUp ?? []);
        const verb = ability.id === 'murder' ? 'Murder' : ability.id === 'rob' ? 'Rob' : ability.label;
        this.overlays.chooser(`ability:${ability.id}`, {
          title: ability.prompt ?? ability.label,
          subtitle:
            ability.id === 'murder'
              ? 'The murdered character skips their whole turn.'
              : ability.id === 'rob'
                ? 'When they are called, all their gold becomes yours.'
                : '',
          options: v.characters.map((id) => ({
            value: id,
            el: characterCard(id, { classes: 'choice' }),
            disabled: !options.has(id),
            note: mine.has(id)
              ? 'Yours'
              : faceUp.has(id)
                ? 'Set aside'
                : id === v.murdered
                  ? 'Murdered'
                  : !options.has(id)
                    ? 'Not allowed'
                    : null,
          })),
          confirmLabel: (sel) => ([...sel][0] ? `${verb} the ${getCharacter([...sel][0]).name}` : 'Choose a character'),
          onConfirm: ([id]) => submit({ target: id }),
        });
        break;
      }
      case 'player': {
        this.overlays.chooser(`ability:${ability.id}`, {
          title: ability.prompt ?? ability.label,
          subtitle: `You hold ${v.hand.length} card${v.hand.length === 1 ? '' : 's'}.`,
          options: ability.options.map((seat) => {
            const p = v.players[seat];
            return {
              value: seat,
              el: h(
                'div',
                { class: 'player-choice' },
                fromHTML(crestSVG(seat)),
                h('div', { class: 'pc-name' }, p.name),
                h(
                  'div',
                  { class: 'pc-cards' },
                  icon('cards'),
                  h('b', null, String(p.handCount)),
                  h('span', null, p.handCount === 1 ? 'card' : 'cards'),
                ),
              ),
            };
          }),
          confirmLabel: (sel) => (sel.size ? `Exchange with ${name([...sel][0])}` : 'Choose a player'),
          onConfirm: ([seat]) => submit({ target: seat }),
        });
        break;
      }
      case 'district': {
        const opts = ability.options.filter((o) => o.seat !== v.you).concat(ability.options.filter((o) => o.seat === v.you));
        if (!opts.length) return toast('There is nothing you can afford to destroy.', { type: 'error' });
        this.overlays.chooser(`ability:${ability.id}`, {
          title: 'Destroy a District',
          subtitle: `You have ${v.players[v.you].gold} gold. Completed cities and the Bishop’s districts are protected.`,
          options: opts.map((o) => {
            const card = v.players[o.seat].city.find((c) => c.uid === o.uid);
            return {
              value: `${o.seat}:${o.uid}`,
              el: districtCard(card, { classes: 'choice' }),
              note: `${o.seat === v.you ? 'Your city' : v.players[o.seat].name} · ${o.cost === 0 ? 'free' : `${o.cost} gold`}`,
            };
          }),
          confirmLabel: (sel) => {
            const key = [...sel][0];
            if (!key) return 'Choose a district';
            const [seat, uid] = key.split(':').map(Number);
            const o = opts.find((x) => x.seat === seat && x.uid === uid);
            return `Destroy for ${o.cost} gold`;
          },
          onConfirm: ([key]) => {
            const [seat, uid] = key.split(':').map(Number);
            play('warcry');
            submit({ target: { seat, uid } });
          },
        });
        break;
      }
      case 'cards': {
        this.overlays.chooser(`ability:${ability.id}`, {
          title: 'Discard and Redraw',
          subtitle: 'Choose any number of cards to discard. You will draw the same number.',
          options: v.hand.map((c) => ({ value: c.uid, el: districtCard(c, { classes: 'choice' }) })),
          min: 1,
          max: v.hand.length,
          confirmLabel: (sel) => (sel.size ? `Discard ${sel.size} and draw ${sel.size}` : 'Choose cards'),
          onConfirm: (cards) => submit({ cards }),
        });
        break;
      }
      default:
        submit({});
    }
  }

  useDistrict(d) {
    const v = this.view;
    if (d.input === 'card') {
      this.overlays.chooser(`district:${d.id}`, {
        title: getDistrict(d.id).name,
        subtitle: d.label,
        options: v.hand.map((c) => ({ value: c.uid, el: districtCard(c, { classes: 'choice' }) })),
        confirmLabel: (sel) => (sel.size ? 'Discard for 1 gold' : 'Choose a card'),
        onConfirm: ([card]) => this.submit({ type: 'district', district: d.id, card }),
      });
    } else {
      this.submit({ type: 'district', district: d.id });
    }
  }

  showResults() {
    const v = this.view;
    if (!v?.result) return;
    const canRematch = this.session.kind === 'local' || this.session.isHost;
    this.overlays.show('results', (panel, handle) => {
      handle.el.classList.add('results-overlay');
      panel.append(
        buildResults(v, {
          canRematch,
          onRematch: () => {
            handle.close();
            this.session.rematch();
          },
          onLeave: () => this.leave(true),
          onClose: () => handle.close(),
        }),
      );
    });
  }

  async leave(skipConfirm = false) {
    if (!skipConfirm && this.view && this.view.phase !== 'over') {
      const ok = await confirmDialog({
        title: 'Leave the game?',
        message:
          this.session.kind === 'online' ? 'A bot will take over your seat for the rest of the game.' : 'This game will be abandoned.',
        confirm: 'Leave',
        cancel: 'Stay',
        danger: true,
      });
      if (!ok) return;
    }
    this.session.leave();
    this.app.go('title');
  }

  destroy() {
    this.offs.forEach((off) => off());
    window.removeEventListener('keydown', this.keyHandler);
    document.removeEventListener('visibilitychange', this.visibility);
    clearInterval(this.tick);
    this.banners.clear();
    document.title = 'Citadels';
    if (this.session.kind === 'local') this.session.leave();
    else this.session.dispose?.();
  }
}

registerScreen('game', (app, { session }) => {
  music.play('game');
  const screen = new GameScreen(app, session);
  app.session = session;
  return {
    el: screen.el,
    onShow: () => session.start(),
    destroy: () => {
      if (app.session === session) app.session = null;
      screen.destroy();
    },
  };
});
