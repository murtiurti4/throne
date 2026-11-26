let ctx = null;
let muted = localStorage.getItem('throne.muted') === '1';

export const isMuted = () => muted;
export function setMuted(value) {
  muted = value;
  localStorage.setItem('throne.muted', value ? '1' : '0');
}

function audio() {
  if (muted) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

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
