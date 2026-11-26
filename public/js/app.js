import { Scene } from './scene.js';
import { makeSpec } from './sprites.js';
import * as sfx from './audio.js';

const $ = (id) => document.getElementById(id);
const DEFAULT_KING = { name: '', title: 'King', address: 'Your Grace', skin: '#e0aa86', hair: '#5a3a22', robe: '#3b4f86', cape: '#8f2a2a', metal: '#e3bd4a', crown: 'crown', beard: true, longHair: false };
let king = DEFAULT_KING;
const c = (line) => line.replace(/Your Grace|\bsire\b|my King|King/g, (m) => (m === 'Your Grace' ? king.address : m === 'King' ? king.title : 'my ' + king.title));
const pick = (list) => c(list[Math.floor(Math.random() * list.length)]);

const query = new URLSearchParams(location.search);
if (query.get('token')) localStorage.setItem('throne.token', query.get('token'));
const token = localStorage.getItem('throne.token');
const withToken = (path) => (token ? path + (path.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token) : path);

const COURTESY = /your (grace|majesty|highness)|\bsire\b|my (king|liege|lord)/i;
const SORCERY = /idempoten|synerg|leverag|paradigm|orchestrat|microservice|middleware|refactor|kubernetes|holistic|declarative|reconcil|semantic|scalab|architect|projection|consisten|deprecat|endpoint|proxy|event-driven|gitops|\b[A-Z]{3,}\b/g;
const OUCH = ['Ow! Forgive me, Your Grace!', 'Mercy, sire! Plainly, then!', 'Aah! I shall mind my tongue!', 'Yeowch! Simple words, yes, yes!'];
const SLINK = ['I... I shall find simpler words, sire.', 'Grant me a moment to think, Your Grace.', 'Smaller words. At once, Your Grace.'];
const FAREWELL = {
  answered: ['At once, Your Grace!', 'Your wisdom is boundless, sire.', 'It shall be done, Your Grace.', 'As you command, my King.', 'Long may you reign!'],
  delegated: ['You honour me, Your Grace!', 'I shall not fail you, sire.', 'Your trust is my command.'],
  dungeon: ['Mercy, Your Grace! Mercy!', 'It was only a thought, sire!', 'Not the dungeon again!'],
  withdrawn: ['Never mind, Your Grace.', 'Forgive the intrusion, sire.'],
};
const WHIP_CRY = ['Speak plainly!', 'Fewer words, fool!', 'Plainly, I said!', 'Do I look like a scholar?'];

let state = { queue: [], ledger: [] };
let shown = null;
let typing = null;
let busy = false;
let scene;

const displayName = (p) => {
  const spec = makeSpec(p.agent, p.role);
  return { name: spec.title + ' ' + p.agent, station: spec.station };
};
const courtly = (speech) => (COURTESY.test(speech) || speech.toLowerCase().includes(king.address.toLowerCase()) ? speech : king.address + ', ' + speech);
const current = () => state.queue.find((p) => p.id === scene.present && p.status === 'waiting') ?? null;

async function deed(id, action, body) {
  const res = await fetch(withToken('/api/petitions/' + id + '/' + action), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

function typeSpeech(text) {
  clearInterval(typing);
  const el = $('speech');
  let n = 0;
  scene.speaking = true;
  const paint = () => {
    el.replaceChildren(text.slice(0, n), Object.assign(document.createElement('span'), { className: 'ghost', textContent: text.slice(n) }));
  };
  const finish = () => {
    clearInterval(typing);
    n = text.length;
    paint();
    scene.speaking = false;
  };
  el.onclick = finish;
  typing = setInterval(() => {
    n += 2;
    if (n % 6 === 0) sfx.blip();
    if (n >= text.length) finish();
    else paint();
  }, 16);
  paint();
}

function windiness(speech) {
  const words = speech.trim().split(/\s+/).length;
  const spells = (speech.match(SORCERY) ?? []).length;
  const score = Math.min(5, Math.floor(words / 16) + Math.ceil(spells / 2));
  const verdict = ['Plainly spoken', 'Plainly spoken', 'A little wordy', 'Long-winded', 'A windbag', 'Insufferable'][score];
  const el = $('windbag');
  el.replaceChildren();
  const meter = Object.assign(document.createElement('span'), { className: 'meter', textContent: '▮'.repeat(score) + '▯'.repeat(5 - score) });
  el.append(meter, ' ' + verdict + ' · ' + words + ' words');
  if (spells) el.append(' · ', Object.assign(document.createElement('b'), { textContent: spells + (spells === 1 ? ' word' : ' words') + ' of sorcery' }));
  $('whip').classList.toggle('itching', score >= 4);
}

function render() {
  const p = current();
  const waiting = state.queue.filter((q) => q.status === 'waiting').length;
  const thinking = state.queue.length - waiting;
  $('count').textContent = waiting ? waiting + (waiting === 1 ? ' subject awaits' : ' subjects await') + ' your judgment' : king.name ? 'The court of ' + king.title + ' ' + king.name : 'The court is quiet';
  document.title = (waiting ? '(' + waiting + ') ' : '') + 'Throne';
  $('audience').hidden = !p;
  $('idle').hidden = !!p;
  if (!p) {
    shown = null;
    clearInterval(typing);
    scene.speaking = false;
    const next = state.queue.find((q) => q.status === 'waiting');
    $('idle-text').textContent = next ? displayName(next).name + ' approaches the throne…' : c(thinking ? 'Your subjects are searching for simpler words, Your Grace.' : 'No one awaits your judgment, Your Grace.');
    $('demo').hidden = state.queue.length > 0;
    $('idle-hint').replaceChildren(...(next || thinking ? [] : ['Point your agents at ', Object.assign(document.createElement('code'), { textContent: location.origin + '/mcp' }), ' and they will come before you here.']));
    return;
  }
  const key = p.id + '|' + p.speech;
  if (shown === key) return;
  const fresh = !shown || !shown.startsWith(p.id + '|');
  shown = key;
  const { name, station } = displayName(p);
  $('who').textContent = name;
  $('station').textContent = station;
  $('realm').textContent = p.realm ?? '';
  $('lashes').textContent = '/'.repeat(p.lashes);
  $('lashes').title = p.lashes + (p.lashes === 1 ? ' lash' : ' lashes') + ' received';
  $('title').textContent = p.title ?? '';
  const speech = courtly(p.speech);
  typeSpeech(speech);
  windiness(speech);
  $('scroll').hidden = !p.context && !p.link;
  $('scroll').open = false;
  $('context').textContent = p.context ?? '';
  $('context').hidden = !p.context;
  $('link').hidden = !p.link;
  if (p.link) $('link').href = p.link;
  $('options').replaceChildren(
    ...p.options.map((option, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'option';
      b.append(Object.assign(document.createElement('kbd'), { textContent: i + 1 }), Object.assign(document.createElement('span'), { textContent: option.label }));
      if (option.detail) b.append(Object.assign(document.createElement('small'), { textContent: option.detail }));
      b.onclick = () => rule(i);
      return b;
    }),
  );
  if (fresh) {
    $('words').value = '';
    sfx.fanfare();
    scene.say(p.id, c(p.lashes ? 'Your Grace... if I may try again.' : 'Your Grace!'), 1.6);
  }
}

async function act(run) {
  const p = current();
  if (!p || busy) return;
  busy = true;
  try {
    await run(p);
  } catch (error) {
    scene.say('king', error.message, 3);
  } finally {
    busy = false;
  }
}

const rule = (option) =>
  act(async (p) => {
    const message = $('words').value.trim();
    if (option === null && !message) return $('words').focus();
    await deed(p.id, 'verdict', { option, message: message || undefined });
    sfx.stamp();
    scene.outcome(p.id, 'answered');
    scene.say('king', option === null ? message : p.options[option].label + (message ? ' ' + message : ''), 2.8);
    setTimeout(() => scene.say(p.id, pick(FAREWELL.answered), 2.2), 600);
    $('words').value = '';
    $('words').blur();
  });

const whip = () =>
  act(async (p) => {
    scene.whip(p.id);
    scene.say('king', pick(WHIP_CRY), 1.4);
    const after = await deed(p.id, 'whip');
    scene.whipCry = after.status === 'rephrasing' ? pick(SLINK) : pick(OUCH);
  });

const delegate = () =>
  act(async (p) => {
    await deed(p.id, 'delegate');
    sfx.stamp();
    scene.outcome(p.id, 'delegated');
    scene.say('king', 'Decide it yourself. I trust you.', 2.4);
    setTimeout(() => scene.say(p.id, pick(FAREWELL.delegated), 2.2), 600);
  });

const dungeon = () =>
  act(async (p) => {
    await deed(p.id, 'dungeon', { message: $('words').value.trim() || undefined });
    sfx.doom();
    scene.outcome(p.id, 'dungeon');
    scene.say('king', 'To the dungeon with this idea!', 2.4);
    setTimeout(() => scene.say(p.id, pick(FAREWELL.dungeon), 2.2), 500);
    $('words').value = '';
  });

const back = () =>
  act(async (p) => {
    if (state.queue.filter((q) => q.status === 'waiting').length < 2) return scene.say('king', 'There is no one else to hear.', 2);
    await deed(p.id, 'back');
    scene.say('king', 'Later. Next!', 1.8);
  });

function renderLedger() {
  const items = state.ledger.map((p) => {
    const li = document.createElement('li');
    const ruling = { answered: [p.verdict?.choice?.label, p.verdict?.message && '“' + p.verdict.message + '”'].filter(Boolean).join(' — '), delegated: 'Left to their own judgment', dungeon: 'Thrown in the dungeon' + (p.verdict?.message ? ' — “' + p.verdict.message + '”' : ''), withdrawn: 'Withdrew the petition' }[p.status];
    li.append(
      Object.assign(document.createElement('div'), { className: 'when', textContent: new Date(p.settled_at).toLocaleString() + (p.lashes ? ' · ' + p.lashes + (p.lashes === 1 ? ' lash' : ' lashes') : '') }),
      Object.assign(document.createElement('div'), { textContent: displayName(p).name + (p.title ? ': ' + p.title : '') }),
      Object.assign(document.createElement('div'), { className: 'ruling', textContent: ruling }),
    );
    return li;
  });
  $('ledger-list').replaceChildren(...(items.length ? items : [Object.assign(document.createElement('li'), { className: 'empty', textContent: 'No decrees have been recorded yet.' })]));
}

function setKing(next) {
  king = next;
  scene.look = next;
  $('words').placeholder = c('Or speak your own decree, Your Grace… (press / to write)');
  for (const el of document.querySelectorAll('[data-king]')) {
    if (el === document.activeElement) continue;
    if (el.type === 'checkbox') el.checked = next[el.dataset.king];
    else el.value = next[el.dataset.king];
  }
}

let kingTimer;
function crown(next) {
  setKing(next);
  render();
  clearTimeout(kingTimer);
  kingTimer = setTimeout(() => fetch(withToken('/api/king'), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) }), 300);
}

function apply(next) {
  const hold = scene.whipBusyFor();
  if (hold > 0) return setTimeout(() => apply(next), hold * 1000 + 30);
  for (const p of next.ledger) if (state.queue.some((q) => q.id === p.id)) scene.outcome(p.id, p.status);
  for (const p of next.ledger) {
    if (p.status === 'withdrawn' && state.queue.some((q) => q.id === p.id)) scene.say(p.id, pick(FAREWELL.withdrawn), 2);
  }
  state = next;
  if (!kingTimer || !$('wardrobe').contains(document.activeElement)) setKing(next.king);
  scene.sync(state.queue);
  render();
  if (!$('ledger').hidden) renderLedger();
}

function layout() {
  const stage = $('stage');
  const world = $('world');
  const width = window.innerWidth;
  const stageH = Math.round(Math.min((width * 9) / 16, window.innerHeight * 0.54));
  const worldW = Math.min(width, ((stageH / 0.74) * 16) / 9);
  const worldH = (worldW * 9) / 16;
  stage.style.height = stageH + 'px';
  world.style.width = worldW + 'px';
  world.style.height = worldH + 'px';
  world.style.marginLeft = -worldW / 2 + 'px';
  world.style.top = -(worldH - stageH) * 0.7 + 'px';
}

function connect() {
  const events = new EventSource(withToken('/api/events'));
  events.onmessage = (event) => apply(JSON.parse(event.data));
}

const hall = new Image();
hall.src = '/assets/hall.png';
await Promise.all([hall.decode(), document.fonts.ready]);
scene = new Scene($('canvas'), $('bubbles'), hall);
scene.look = king;
scene.onPresent = render;
scene.onImpact = (id) => {
  sfx.crack();
  scene.say(id, scene.whipCry ?? pick(OUCH), 2);
};
layout();
window.addEventListener('resize', layout);
const loop = (ms) => {
  scene.frame(ms / 1000);
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
connect();

$('decree').onsubmit = (event) => {
  event.preventDefault();
  rule(null);
};
$('whip').onclick = whip;
$('delegate').onclick = delegate;
$('back').onclick = back;
$('dungeon').onclick = dungeon;
$('demo').onclick = () => fetch(withToken('/api/demo'), { method: 'POST' });
$('ledger-open').onclick = () => {
  renderLedger();
  $('ledger').hidden = false;
};
$('ledger-close').onclick = () => ($('ledger').hidden = true);
$('chambers-open').onclick = () => ($('chambers').hidden = !$('chambers').hidden);
$('chambers-close').onclick = () => ($('chambers').hidden = true);
$('wardrobe').onsubmit = (event) => event.preventDefault();
$('wardrobe').oninput = (event) => {
  if (!event.target.dataset.king) return;
  const next = { ...king };
  for (const el of document.querySelectorAll('[data-king]')) next[el.dataset.king] = el.type === 'checkbox' ? el.checked : el.value.trim();
  next.title ||= DEFAULT_KING.title;
  next.address ||= DEFAULT_KING.address;
  crown(next);
};
$('king-reset').onclick = () => crown(DEFAULT_KING);
$('volume').value = sfx.musicVolume() * 100;
$('volume').oninput = () => sfx.setMusicVolume($('volume').value / 100);
const toggleMusic = () => {
  sfx.setMusic(!sfx.musicOn());
  paintSound();
};
$('music').onclick = toggleMusic;
for (const gesture of ['pointerdown', 'keydown']) window.addEventListener(gesture, sfx.wakeMusic, { once: true });
const paintSound = () => {
  $('sound').textContent = 'Sound: ' + (sfx.isMuted() ? 'off' : 'on');
  $('music').textContent = 'Music: ' + (sfx.musicOn() ? 'on' : 'off');
};
$('sound').onclick = () => {
  sfx.setMuted(!sfx.isMuted());
  paintSound();
};
paintSound();

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    $('ledger').hidden = true;
    $('chambers').hidden = true;
    return document.activeElement.blur();
  }
  if (event.target.matches('input, select, textarea') || event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === '/' || key === 't') {
    event.preventDefault();
    return $('words').focus();
  }
  if (key === 'm') return toggleMusic();
  const p = current();
  if (!p) return;
  if (/^[1-6]$/.test(key) && p.options[key - 1]) return rule(key - 1);
  if (key === 'w') return whip();
  if (key === 'y') return delegate();
  if (key === 'b') return back();
  if (key === 'x') return dungeon();
});
