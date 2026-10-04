const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const source = fs.readFileSync(process.argv[2] || require('node:path').join(__dirname, 'provider.ts'), 'utf8');
const compiled = stripTypeScriptTypes(source);
new vm.Script(compiled);
const block = source.slice(source.indexOf('\t\ttype PlaybackPosition'), source.indexOf('\t\tasync function pushEntry'));
function setup() {
  const requests = [], listeners = {}, logs = [];
  const entry = { media: { id: 12, idMal: 987, title: { romaji: 'Test' } } };
  let info = { id: 'session-1', media: entry.media, episode: { progressNumber: 3, episodeNumber: 4 } };
  let token = 'test-token', disabled = false;
  const context = {
    Map, Set, Promise, Date, Number, Error,
    state: { token: { get: () => token } },
    fields: { disableLiveSync: { get current() { return disabled; } }, skipAdult: { current: true } },
    cleanBaseUrl: () => 'https://example.test',
    unwrap: v => v == null ? undefined : v.valueOf(),
    isCustomSource: id => id >= 2 ** 31,
    anilistEntries: () => [entry],
    log: { push: (...args) => logs.push(args) },
    ctx: {
      anime: { getAnimeEntry: async () => ({ media: entry.media }) },
      videoCore: { getCurrentPlaybackInfo: () => info, addEventListener: (name, cb) => listeners[name] = cb },
      playback: { registerEventListener: cb => listeners.external = cb },
    },
    api: async (path, options) => {
      const body = options?.body && JSON.parse(options.body);
      requests.push({ path, body });
      const result = path.endsWith('/list/anime') ? { items: [{ media: { id: 55, mal_id: 987 } }] }
        : { items: [{ media_id: 55, episode: 3 }, { media_id: 99, episode: 3 }] };
      return { json: () => result };
    },
  };
  vm.createContext(context);
  vm.runInContext(stripTypeScriptTypes(block) + '\n globalThis.flush = () => playbackQueue; globalThis.clear = clearWatchedPlayback;', context);
  const event = (currentTime = 120, paused = false) => ({ playbackId: info.id, currentTime, duration: 1440, paused });
  const writes = () => requests.filter(r => r.body);
  return { context, entry, requests, listeners, logs, event, writes,
    setInfo: value => info = value, disable: () => disabled = true, logout: () => token = null };
}
(async () => {
  let s = setup();
  s.listeners['video-status'](s.event());
  await s.context.flush();
  assert.equal(s.writes()[0].body.media_id, 55);
  assert.equal(s.writes()[0].body.episode, 3);
  assert.equal(s.writes()[0].body.position_seconds, 120);
  assert.equal(s.writes()[0].body.duration_seconds, 1440);
  assert.equal(s.writes()[0].body.source, 'Seanime');
  s.listeners['video-status'](s.event(121));
  await s.context.flush();
  assert.equal(s.writes().length, 1);
  s.listeners['video-paused'](s.event(122));
  s.listeners['video-seeked'](s.event(30, true));
  s.listeners['video-terminated']({ playbackId: 'session-1' });
  await s.context.flush();
  assert.deepEqual(s.writes().map(r => r.body.state), ['playing', 'paused', 'paused', 'stopped']);
  assert.equal(s.writes()[2].body.position_seconds, 30);
  s.context.clear(12, 3);
  await s.context.flush();
  assert.deepEqual(s.writes().at(-1).body, { action: 'remove', items: [{ media_id: 55, episode: 3 }] });
  const count = s.writes().length;
  s.listeners['video-resumed'](s.event(130));
  await s.context.flush();
  assert.equal(s.writes().length, count);
  s.setInfo({ id: 'session-2', media: s.entry.media, episode: { progressNumber: 3 } });
  s.listeners['video-status'](s.event(5));
  await s.context.flush();
  assert.equal(s.writes().at(-1).body.action, 'save');

  for (const flag of ['private', 'isAdult', 'disabled', 'logout']) {
    s = setup();
    if (flag === 'private') s.entry.private = true;
    if (flag === 'isAdult') s.entry.media.isAdult = true;
    if (flag === 'disabled') s.disable();
    if (flag === 'logout') s.logout();
    s.listeners['video-status'](s.event());
    await s.context.flush();
    assert.equal(s.writes().length, 0, flag);
  }
  s = setup();
  s.listeners['video-status'](s.event(NaN));
  s.listeners['video-status']({ ...s.event(), duration: 0 });
  s.listeners['video-status']({ ...s.event(), playbackId: 'stale' });
  await s.context.flush();
  assert.equal(s.writes().length, 0);

  s = setup();
  s.listeners.external({ isVideoStarted: true });
  s.listeners.external({ state: { mediaId: 12, episodeNumber: 3 }, status: {
    currentTimeInSeconds: 40, durationInSeconds: 1500, playing: true } });
  s.listeners.external({ isVideoStopped: true });
  await s.context.flush();
  assert.deepEqual(s.writes().map(r => r.body.state), ['playing', 'stopped']);
  assert.equal(s.writes()[1].body.position_seconds, 40);
  s.context.clear(12, 3);
  await s.context.flush();
  s.listeners.external({ isVideoStarted: true });
  s.listeners.external({ state: { mediaId: 12, episodeNumber: 3 }, status: {
    currentTimeInSeconds: 1, durationInSeconds: 1500, playing: true } });
  await s.context.flush();
  assert.equal(s.writes().at(-1).body.action, 'save');
  s = setup();
  const api = s.context.api;
  s.context.api = async (path, options) => {
    if (path.endsWith('/list/anime')) return { json: () => ({ items: [] }) };
    if (path.startsWith('/public/api/anime?')) return { json: () => ({
      items: [{ id: 987, mal_id: 111 }, { id: 55, mal_id: 987 }], has_next: false,
    }) };
    return api(path, options);
  };
  s.listeners['video-status'](s.event());
  await s.context.flush();
  assert.equal(s.writes()[0].body.media_id, 55);
  s = setup();
  s.listeners['video-status'](s.event());
  s.logout();
  await s.context.flush();
  assert.equal(s.requests.length, 0);
  s = setup();
  s.listeners['video-status'](s.event(1600));
  await s.context.flush();
  assert.equal(s.writes()[0].body.position_seconds, 1440);
  console.log('PASS: syntax, ID mapping, seconds, throttling, pause/seek/stop, cleanup, replay, privacy, disabled sync, invalid/stale events, external player');
})().catch(error => { console.error(error); process.exitCode = 1; });
