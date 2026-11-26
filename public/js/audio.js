let ctx = null;
let muted = localStorage.getItem('throne.muted') === '1';
let musicEnabled = localStorage.getItem('throne.music') !== '0';
let volume = Number(localStorage.getItem('throne.volume') ?? 0.5);
let bus = null;
let timer = null;
let nextBar = 0;
let bar = 0;

export const isMuted = () => muted;
export function setMuted(value) {
  muted = value;
  localStorage.setItem('throne.muted', value ? '1' : '0');
}

function context() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const audio = () => (muted ? null : context());

function tone(freq, start, length, type = 'square', gain = 0.05) {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + length);
  osc.connect(g).connect(a.destination);
  osc.start(a.currentTime + start);
  osc.stop(a.currentTime + start + length);
}

export const blip = () => tone(520 + Math.random() * 60, 0, 0.03, 'square', 0.012);
export const fanfare = () => [392, 523, 659].forEach((f, i) => tone(f, i * 0.11, 0.16, 'square', 0.04));
export const stamp = () => {
  tone(110, 0, 0.12, 'triangle', 0.2);
  tone(70, 0.02, 0.18, 'sine', 0.2);
};
export const doom = () => [196, 156, 110].forEach((f, i) => tone(f, i * 0.16, 0.24, 'sawtooth', 0.04));

export function crack() {
  const a = audio();
  if (!a) return;
  const length = 0.22;
  const buffer = a.createBuffer(1, a.sampleRate * length, a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 6);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1800;
  const g = a.createGain();
  g.gain.value = 0.7;
  src.connect(filter).connect(g).connect(a.destination);
  src.start();
  tone(900, 0.02, 0.08, 'square', 0.03);
}

const BEAT = 60 / 104;
const BAR = BEAT * 3;
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const DM = [50, 57, 65];
const C = [48, 55, 64];
const AM = [45, 52, 60];
const F = [53, 60, 69];
const G = [43, 50, 59];
const CHORDS = [DM, C, DM, AM, F, C, G, DM, DM, C, F, AM, DM, C, AM, DM];
const MELODY = [
  [[74, 1], [77, 0.5], [76, 0.5], [74, 1]],
  [[76, 1], [72, 1], [67, 1]],
  [[69, 1], [74, 0.5], [76, 0.5], [77, 1]],
  [[76, 3]],
  [[77, 1], [81, 0.5], [79, 0.5], [77, 1]],
  [[76, 1], [79, 1], [76, 1]],
  [[74, 1], [71, 0.5], [72, 0.5], [74, 1]],
  [[69, 1], [74, 2]],
  [[69, 1], [74, 1], [69, 1]],
  [[67, 1], [72, 1], [76, 1]],
  [[77, 1.5], [76, 0.5], [74, 0.5], [72, 0.5]],
  [[76, 1], [69, 2]],
  [[74, 0.5], [76, 0.5], [77, 0.5], [79, 0.5], [81, 1]],
  [[79, 1], [76, 1], [72, 1]],
  [[69, 0.5], [72, 0.5], [76, 1], [74, 0.5], [72, 0.5]],
  [[74, 3]],
];

function pluck(a, midi, t, decay, vol) {
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = 'triangle';
  osc.frequency.value = hz(midi);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + decay);
}

function flute(a, midi, t, length, vol) {
  const osc = a.createOscillator();
  const lfo = a.createOscillator();
  const depth = a.createGain();
  const g = a.createGain();
  osc.type = 'triangle';
  osc.frequency.value = hz(midi);
  lfo.frequency.value = 5.2;
  depth.gain.value = hz(midi) * 0.004;
  lfo.connect(depth).connect(osc.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.05);
  g.gain.setValueAtTime(vol, t + length - 0.08);
  g.gain.linearRampToValueAtTime(0.0001, t + length);
  osc.connect(g).connect(bus);
  for (const node of [osc, lfo]) {
    node.start(t);
    node.stop(t + length);
  }
}

function drum(a, t, vol) {
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.frequency.setValueAtTime(95, t);
  osc.frequency.exponentialRampToValueAtTime(48, t + 0.16);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + 0.2);
}

function scheduleBar(a, index, t) {
  const i = index % 24;
  const [root, fifth, third] = CHORDS[i % 16];
  pluck(a, root - 12, t, 2.4, 0.16);
  drum(a, t, 0.12);
  drum(a, t + BEAT * 2, 0.05);
  if (i >= 16) {
    [root, fifth, third, fifth, third + 12, fifth].forEach((note, n) => pluck(a, note + 12, t + n * BEAT * 0.5, 0.7, 0.1));
    return;
  }
  [root, fifth, third].forEach((note, n) => pluck(a, note, t + n * BEAT, 1.0, 0.11));
  let at = t;
  for (const [note, beats] of MELODY[i]) {
    flute(a, note, at, beats * BEAT * 0.95, 0.075);
    at += beats * BEAT;
  }
}

export const musicOn = () => musicEnabled;
export const musicVolume = () => volume;

export function setMusicVolume(value) {
  volume = value;
  localStorage.setItem('throne.volume', String(value));
  if (bus) bus.gain.value = value;
}

export function wakeMusic() {
  if (!musicEnabled || timer) return;
  const a = context();
  bus = a.createGain();
  bus.gain.value = volume;
  const soften = a.createBiquadFilter();
  soften.type = 'lowpass';
  soften.frequency.value = 3200;
  bus.connect(soften).connect(a.destination);
  nextBar = 0;
  const pump = () => {
    if (nextBar < a.currentTime) nextBar = a.currentTime + 0.12;
    while (nextBar < a.currentTime + 1.6) {
      scheduleBar(a, bar++, nextBar);
      nextBar += BAR;
    }
  };
  pump();
  timer = setInterval(pump, 250);
}

export function setMusic(on) {
  musicEnabled = on;
  localStorage.setItem('throne.music', on ? '1' : '0');
  if (on) return wakeMusic();
  clearInterval(timer);
  timer = null;
  bus?.disconnect();
  bus = null;
}
