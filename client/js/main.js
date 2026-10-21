// Application bootstrap: art definitions, audio, settings, and screens.

import { injectDefs } from './art/defs.js';
import './art/characters.js';
import './art/districts.js';
import './art/icons.js';
import { installUnlock, setLevels, play } from './audio/index.js';
import { settings } from './core/settings.js';
import { Router } from './core/router.js';
import { installCardPreview, toast } from './ui/components.js';
import { getClient } from './net/socket.js';
import { load } from './core/storage.js';
import { normalizeCode, S } from '../../shared/protocol.js';

// Screens register themselves on import.
import './screens/title.js';
import './screens/localSetup.js';
import './screens/online.js';
import './game/GameScreen.js';

function applySettings(values) {
  setLevels({ master: values.master, music: values.music, sfx: values.sfx, muted: values.muted });
  document.body.classList.toggle('reduce-motion', !!values.reduceMotion);
}

function inviteCode() {
  const m = /^\/join\/([A-Za-z0-9]{3,8})\/?$/.exec(location.pathname);
  const code = m?.[1] ?? new URLSearchParams(location.search).get('join');
  return code ? normalizeCode(code) : null;
}

function boot() {
  injectDefs();
  installUnlock();
  installCardPreview();
  applySettings(settings.values);
  settings.on('change', applySettings);

  const app = {
    router: null,
    go: (name, params) => app.router.go(name, params),
  };
  app.router = new Router(document.getElementById('app'), app);

  const code = inviteCode();
  if (code) {
    history.replaceState(null, '', '/');
    app.go('online', { code });
    return;
  }
  app.go('title');

  // If this browser was seated at an online table, offer to return to it.
  if (load('token', null)) {
    const client = getClient();
    const off = client.on(S.ROOM, ({ room }) => {
      off();
      if (room && app.router.currentName === 'title') {
        toast(`Returning you to table ${room.code}…`);
        play('join');
        app.go('online');
      } else if (!room) client.disconnect();
    });
    client.connect();
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
