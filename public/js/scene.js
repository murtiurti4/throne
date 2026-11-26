import { CHAR_HEIGHT, GUARD, drawChar, drawKing, drawWhip, makeSpec } from './sprites.js';

export const W = 960;
export const H = 540;
const FLOOR = 456;
const AUD_X = 516;
const KING = { x: 722, y: 346 };
const WHIP_TIME = 0.75;
const IMPACT = 0.35 + 0.65 * 0.42;

export class Scene {
  constructor(canvas, bubbleLayer, hall) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.bubbleLayer = bubbleLayer;
    this.hall = hall;
    this.actors = new Map();
    this.bubbles = new Map();
    this.present = null;
    this.speaking = false;
    this.onPresent = () => {};
    this.onImpact = () => {};
    this.whipState = null;
    this.shakeUntil = 0;
    this.now = 0;
    this.lastBusy = 0;
    this.synced = false;
    this.flames = findFlames(hall);
    this.motes = Array.from({ length: 46 }, (_, i) => ({ x: (i * 197) % W, y: 60 + ((i * 89) % 330), s: 4 + (i % 5) * 2, p: i * 1.7 }));
  }

  sync(queue) {
    const waiting = queue.filter((p) => p.status === 'waiting');
    const sulking = queue.filter((p) => p.status === 'rephrasing');
    const seen = new Set();
    let fresh = 0;
    for (const p of queue) {
      seen.add(p.id);
      let a = this.actors.get(p.id);
      const slot = p.status === 'waiting' ? waiting.indexOf(p) : sulking.indexOf(p);
      if (!a) {
        a = { id: p.id, spec: makeSpec(p.agent, p.role), x: 0, y: FLOOR, mode: 'queue', slot, arrivedAt: null, flinchUntil: 0, leaveAt: 0, facing: 1 };
        a.mode = p.status === 'waiting' ? 'queue' : 'sulk';
        a.x = this.synced ? -50 - 46 * fresh++ : this.targetFor(a).x;
        this.actors.set(p.id, a);
      }
      a.p = p;
      a.slot = slot;
      a.nextMode = p.status === 'waiting' ? 'queue' : 'sulk';
    }
    for (const a of this.actors.values()) {
      if (!seen.has(a.id) && a.nextMode !== 'leave') {
        a.nextMode = 'leave';
        a.leaveAt = this.now + 1.1;
      }
    }
    this.synced = true;
  }

  outcome(id, status) {
    const a = this.actors.get(id);
    if (a) a.outcome = status;
  }

  targetFor(a) {
    if (a.mode === 'leave') return { x: -80, y: FLOOR };
    if (a.mode === 'sulk') return { x: 100 + a.slot * 44, y: FLOOR - 22 };
    if (a.slot === 0) return { x: AUD_X, y: FLOOR };
    return { x: a.slot > 7 ? -60 : 448 - (a.slot - 1) * 58, y: FLOOR + ((a.spec.seed % 3) - 1) * 5 };
  }

  whip(id) {
    this.whipState = { id, start: this.now, hit: false };
  }

  whipBusyFor() {
    return this.whipState ? Math.max(0, this.whipState.start + WHIP_TIME + 0.25 - this.now) : 0;
  }

  say(key, text, seconds = 2.6) {
    let b = this.bubbles.get(key);
    if (!b) {
      b = { el: document.createElement('div') };
      b.el.className = 'bubble' + (key === 'king' ? ' royal' : '');
      this.bubbleLayer.append(b.el);
      this.bubbles.set(key, b);
    }
    b.el.textContent = text;
    b.until = this.now + seconds;
  }

  frame(seconds) {
    const dt = Math.min(0.05, seconds - this.now || 0);
    this.now = seconds;
    const ctx = this.ctx;
    const t = seconds;

    const whipping = this.whipState;
    let whipPhase = null;
    if (whipping) {
      whipPhase = (t - whipping.start) / WHIP_TIME;
      if (whipPhase >= IMPACT && !whipping.hit) {
        whipping.hit = true;
        this.shakeUntil = t + 0.18;
        const victim = this.actors.get(whipping.id);
        if (victim) victim.flinchUntil = t + 0.7;
        this.onImpact(whipping.id);
      }
      if (whipPhase >= 1) {
        this.whipState = null;
        whipPhase = null;
      }
    }

    let present = null;
    for (const a of this.actors.values()) {
      const held = (whipping && whipping.id === a.id) || t < a.flinchUntil || (a.nextMode === 'leave' && t < a.leaveAt);
      if (!held && a.mode !== a.nextMode) {
        a.mode = a.nextMode;
        a.arrivedAt = null;
      }
      const target = this.targetFor(a);
      const speed = a.mode === 'leave' ? (a.outcome === 'dungeon' ? 300 : 170) : 120;
      const dx = target.x - a.x;
      const step = speed * dt;
      a.walking = Math.abs(dx) > 1 && t >= a.flinchUntil;
      if (a.walking) {
        a.x += Math.sign(dx) * Math.min(step, Math.abs(dx));
        a.facing = Math.sign(dx);
      } else if (Math.abs(dx) <= 1) {
        a.x = target.x;
        a.facing = a.mode === 'sulk' ? -1 : 1;
      }
      a.y += Math.max(-step, Math.min(step, target.y - a.y)) * 0.5;
      if (a.mode === 'leave' && a.x < -70) {
        this.actors.delete(a.id);
        this.dropBubble(a.id);
        continue;
      }
      if (a.mode === 'queue' && a.slot === 0 && !a.walking && a.x === AUD_X) {
        a.arrivedAt ??= t;
        present = a.id;
      } else if (a.mode === 'queue') {
        a.arrivedAt = null;
      }
    }
    if (present !== this.present) {
      this.present = present;
      this.onPresent(present);
    }
    if (this.actors.size) this.lastBusy = t;

    ctx.save();
    if (t < this.shakeUntil) ctx.translate(Math.round(Math.sin(t * 190) * 4), Math.round(Math.cos(t * 160) * 3));
    ctx.drawImage(this.hall, 0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,236,190,0.045)';
    for (const [x0, x1] of [[312, 388], [558, 634]]) {
      ctx.beginPath();
      ctx.moveTo(x0, 96);
      ctx.lineTo(x1, 96);
      ctx.lineTo(x1 - 150, 500);
      ctx.lineTo(x0 - 250, 500);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    drawChar(ctx, 150, 436, 1, GUARD, { t: t * 0.5 });

    const king = { t, whip: whipPhase, talking: this.bubbles.has('king') && this.bubbles.get('king').until > t, asleep: t - this.lastBusy > 6 };
    ctx.fillStyle = '#7a2a2a';
    ctx.fillRect(650, 394, 36, 4);
    ctx.fillStyle = '#5a2020';
    ctx.fillRect(650, 398, 36, 6);
    drawKing(ctx, KING.x, KING.y, king, this.look);

    const order = [...this.actors.values()].sort((a, b) => a.y - b.y);
    for (const a of order) {
      const arrived = a.arrivedAt !== null && a.mode === 'queue' && a.slot === 0;
      drawChar(ctx, a.x, a.y, a.facing, a.spec, {
        t,
        walking: a.walking,
        kneel: arrived && t - a.arrivedAt < 1.0,
        talking: arrived && this.speaking && this.present === a.id,
        flinch: t < a.flinchUntil ? (a.flinchUntil - t) / 0.7 : 0,
        sulk: a.mode === 'sulk' && !a.walking,
      });
    }
    if (whipPhase !== null) {
      const victim = this.actors.get(whipping.id);
      if (victim) drawWhip(ctx, { x: KING.x - 8, y: KING.y - 40 }, { x: victim.x + 6, y: victim.y - 70 }, whipPhase);
    }
    drawChar(ctx, 884, 486, -1, { ...GUARD, seed: 11, tabardColor: '#2f5a8f' }, { t: t * 0.5 + 3 });

    ctx.drawImage(this.hall, 0, 0, 30, 270, 0, 0, 60, 540);
    ctx.drawImage(this.hall, 30, 216, 14, 54, 60, 432, 28, 108);

    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.flames) {
      const flick = 0.75 + 0.25 * Math.sin(t * 9 + f.x) * Math.sin(t * 5.3 + f.y);
      const r = 34 * flick;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      g.addColorStop(0, 'rgba(255,190,90,0.20)');
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(f.x - r, f.y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const f of this.flames) {
      const j = Math.floor(t * 8 + f.x) % 3;
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(f.x - 2, f.y - 2 - j * 2, 2, 4);
      ctx.fillStyle = '#ffc45a';
      ctx.fillRect(f.x - 2, f.y - 4 - j * 2, 2, 2);
    }
    for (const m of this.motes) {
      const x = (m.x + t * m.s) % W;
      const y = m.y + Math.sin(t * 0.4 + m.p) * 14;
      ctx.fillStyle = 'rgba(255,240,205,' + (0.16 + 0.14 * Math.sin(t * 0.9 + m.p)).toFixed(3) + ')';
      ctx.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, 2, 2);
    }
    ctx.restore();

    for (const [key, b] of this.bubbles) {
      if (b.until < t) {
        this.dropBubble(key);
        continue;
      }
      const a = key === 'king' ? null : this.actors.get(key);
      if (key !== 'king' && !a) {
        this.dropBubble(key);
        continue;
      }
      const x = a ? a.x : KING.x - 14;
      const y = a ? a.y - (CHAR_HEIGHT + 8) * 3 : KING.y - 36 * 4;
      b.el.style.left = (x / W) * 100 + '%';
      b.el.style.top = (y / H) * 100 + '%';
    }
  }

  dropBubble(key) {
    const b = this.bubbles.get(key);
    if (!b) return;
    b.el.remove();
    this.bubbles.delete(key);
  }
}

function findFlames(image) {
  const c = document.createElement('canvas');
  c.width = image.width;
  c.height = image.height;
  const g = c.getContext('2d');
  g.drawImage(image, 0, 0);
  const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
  const found = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [r, gr, b] = [data[i], data[i + 1], data[i + 2]];
      if (r < 232 || gr < 200 || b < 150 || r - b < 18) continue;
      const near = found.find((f) => Math.abs(f.x - x) < 5 && Math.abs(f.y - y) < 9);
      if (!near) found.push({ x, y });
    }
  }
  return found.map((f) => ({ x: f.x * 2 + 1, y: f.y * 2 }));
}
