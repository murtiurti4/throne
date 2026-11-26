import { mkdirSync, writeFileSync } from 'node:fs';
import { BEATS, T, TYPING } from '../src/timeline.js';

const SR = 44100;
const music = new Float32Array(SR * T.end);
const sfx = new Float32Array(SR * T.end);
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const tri = (phase) => 2 * Math.abs(2 * (phase - Math.floor(phase + 0.5))) - 1;
const WAVES = { sine: (p) => Math.sin(2 * Math.PI * p), triangle: tri, square: (p) => (p % 1 < 0.5 ? 1 : -1), sawtooth: (p) => 2 * (p % 1) - 1 };
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function add(buffer, t, length, sample) {
  const start = Math.floor(t * SR);
  const n = Math.floor(length * SR);
  for (let i = 0; i < n && start + i < buffer.length; i++) buffer[start + i] += sample(i / SR, i / n);
}
const decay = (vol, u) => vol * Math.pow(0.0001 / vol, u);

const tone = (buffer, freq, t, length, type, vol) => add(buffer, t, length, (s, u) => WAVES[type](freq * s) * decay(vol, u));
const pluck = (midi, t, length, vol) => tone(music, hz(midi), t, length, 'triangle', vol);
function flute(midi, t, length, vol) {
  let phase = 0;
  add(music, t, length, (s) => {
    phase += (hz(midi) * (1 + 0.004 * Math.sin(2 * Math.PI * 5.2 * s))) / SR;
    return tri(phase) * vol * Math.min(1, s / 0.05, (length - s) / 0.08);
  });
}
function drum(buffer, t, vol, from = 95, to = 48, length = 0.2) {
  let phase = 0;
  add(buffer, t, length, (s, u) => {
    phase += (from * Math.pow(to / from, Math.min(1, s / (length * 0.8)))) / SR;
    return Math.sin(2 * Math.PI * phase) * decay(vol, u);
  });
}

const BEAT = 60 / 104;
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

for (let bar = 0, t = 0.05; t < T.end - 0.5; bar++, t += BEAT * 3) {
  const i = bar % 16;
  const [root, fifth, third] = CHORDS[i];
  pluck(root - 12, t, 2.4, 0.16);
  drum(music, t, 0.12);
  drum(music, t + BEAT * 2, 0.05);
  [root, fifth, third].forEach((note, n) => pluck(note, t + n * BEAT, 1.0, 0.11));
  let at = t;
  for (const [note, beats] of MELODY[i]) {
    flute(note, at, beats * BEAT * 0.95, 0.075);
    at += beats * BEAT;
  }
}

const fanfare = (t, vol) => [392, 523, 659].forEach((f, i) => tone(sfx, f, t + i * 0.11, 0.16, 'square', vol));
fanfare(BEATS.jester, 0.03);
fanfare(BEATS.treasurer, 0.03);
[392, 523, 659, 784].forEach((f, i) => tone(sfx, f, T.card + 0.1 + i * 0.13, i === 3 ? 0.7 : 0.2, 'square', 0.05));
let last = 0;
add(sfx, BEATS.impact, 0.22, (s, u) => {
  const noise = rand() * 2 - 1;
  const high = noise - last;
  last = noise;
  return high * 0.45 * Math.pow(1 - u, 6);
});
tone(sfx, 900, BEATS.impact + 0.02, 0.08, 'square', 0.03);
for (const t of [BEATS.pickKey, BEATS.yourCallKey]) {
  tone(sfx, 110, t, 0.12, 'triangle', 0.3);
  tone(sfx, 70, t + 0.02, 0.18, 'sine', 0.3);
}
[196, 156, 110].forEach((f, i) => tone(sfx, f, BEATS.dungeonKey + i * 0.16, 0.24, 'sawtooth', 0.06));
for (const [from, to] of TYPING) for (let t = from; t < to; t += 0.05) tone(sfx, 520 + rand() * 60, t, 0.03, 'square', 0.012);

const pcm = Buffer.alloc(44 + music.length * 2);
pcm.write('RIFF', 0);
pcm.writeUInt32LE(36 + music.length * 2, 4);
pcm.write('WAVEfmt ', 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(SR, 24);
pcm.writeUInt32LE(SR * 2, 28);
pcm.writeUInt16LE(2, 32);
pcm.writeUInt16LE(16, 34);
pcm.write('data', 36);
pcm.writeUInt32LE(music.length * 2, 40);
let soft = 0;
for (let i = 0; i < music.length; i++) {
  const t = i / SR;
  soft += 0.366 * (music[i] - soft);
  const sample = soft * 0.55 * Math.min(1, (T.end - t) / 2.5) + sfx[i];
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + i * 2);
}
mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/soundtrack.wav', import.meta.url), pcm);
