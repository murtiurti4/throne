const shades = new Map();
export function shade(hex, f) {
  const key = hex + f;
  let out = shades.get(key);
  if (!out) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    out = 'rgb(' + c(n >> 16) + ',' + c((n >> 8) & 255) + ',' + c(n & 255) + ')';
    shades.set(key, out);
  }
  return out;
}

const SKINS = ['#e8b796', '#d9a07a', '#c68a62', '#a86f4c', '#f0c8a8'];
const HAIRS = ['#3a2a1e', '#6b4a2b', '#1f1a18', '#a8763a', '#8a8580', '#7a3520'];
const TABARDS = ['#8f2f2a', '#2f5a8f', '#3f7a4a', '#8a6a2a', '#6a3f8a'];

const BASE = {
  knight: { title: 'Ser', station: 'Knight of the Realm', hat: 'helmet', top: '#8d949c', bottom: '#4a4f58', boots: '#33363d', prop: 'sword', tabard: true },
  scribe: { title: 'Scribe', station: 'Keeper of Scrolls', hat: 'cap', top: '#6a5038', bottom: '#6a5038', boots: '#3a2a1e', robe: true, prop: 'scroll', hatColor: '#3d2f5a' },
  treasurer: { title: 'Master', station: 'Keeper of the Coffers', hat: 'feather', top: '#2f6a4a', bottom: '#3a2f28', boots: '#2a1f18', prop: 'purse', fat: true, hatColor: '#7a2a2a', trim: '#d9b24a' },
  spy: { title: 'Whisperer', station: 'Master of Whispers', hat: 'hood', top: '#34323f', bottom: '#26252e', boots: '#1a191f', robe: true, hatColor: '#34323f' },
  mason: { title: 'Mason', station: 'Builder of Walls', hat: 'cap', top: '#b9a27a', bottom: '#5a4a3a', boots: '#3a2a1e', prop: 'hammer', apron: '#7a5a3a', hatColor: '#7a5a3a' },
  jester: { title: 'Fool', station: 'Court Jester', hat: 'jester', top: '#c23a34', bottom: '#d9b24a', boots: '#7a2a2a', split: '#d9b24a', prop: 'bauble' },
  herald: { title: 'Herald', station: 'Voice of the Realm', hat: 'feather', top: '#2f5a9f', bottom: '#e0d8c4', boots: '#3a2a1e', prop: 'trumpet', hatColor: '#2f5a9f', trim: '#e8d27a' },
  alchemist: { title: 'Magister', station: 'Royal Alchemist', hat: 'wizard', top: '#5a3f8a', bottom: '#5a3f8a', boots: '#2a1f18', robe: true, prop: 'flask', hatColor: '#5a3f8a', beard: true },
  peasant: { title: 'Goodman', station: 'Humble Subject', hat: 'straw', top: '#9a8a6a', bottom: '#6a5a44', boots: '#4a3a2a', prop: 'pitchfork' },
  monk: { title: 'Brother', station: 'Of the Quiet Order', hat: 'tonsure', top: '#7a6248', bottom: '#7a6248', boots: '#4a3a2a', robe: true, prop: 'book', belt: '#d8d0b8' },
};
export const ROLE_NAMES = Object.keys(BASE);

export function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function makeSpec(agent, role) {
  const h = hash(agent);
  const name = role && BASE[role] ? role : ROLE_NAMES[h % ROLE_NAMES.length];
  return {
    ...BASE[name],
    role: name,
    seed: h % 97,
    skin: SKINS[(h >>> 3) % SKINS.length],
    hair: HAIRS[(h >>> 6) % HAIRS.length],
    tabardColor: TABARDS[(h >>> 9) % TABARDS.length],
    beard: BASE[name].beard ?? (h >>> 12) % 4 === 0,
  };
}

export const GUARD = { ...BASE.knight, role: 'guard', seed: 5, skin: SKINS[1], hair: HAIRS[0], tabardColor: '#8f2f2a', prop: 'spear', beard: false };

const INK = '#1c1512';

function drawHat(R, spec, hy) {
  const c = spec.hatColor ?? '#555555';
  switch (spec.hat) {
    case 'helmet':
      R(-4, hy - 2, 9, 6, '#a9b0b8');
      R(-4, hy - 2, 2, 8, '#7d848c');
      R(-3, hy - 3, 7, 1, '#c4cad0');
      R(4, hy + 2, 1, 5, '#7d848c');
      R(-2, hy - 6, 3, 4, spec.tabardColor);
      R(-4, hy - 5, 3, 3, shade(spec.tabardColor, 0.8));
      break;
    case 'hood':
      R(-5, hy - 2, 10, 4, c);
      R(-5, hy - 2, 4, 12, shade(c, 0.85));
      R(-1, hy + 1, 6, 1, shade(c, 0.6));
      R(4, hy - 1, 1, 3, c);
      break;
    case 'feather':
      R(-4, hy - 2, 10, 3, c);
      R(-5, hy, 3, 2, shade(c, 0.8));
      R(-3, hy - 5, 1, 3, '#e8e2d0');
      R(-4, hy - 7, 1, 3, '#e8e2d0');
      break;
    case 'cap':
      R(-4, hy - 2, 9, 3, c);
      R(-4, hy - 2, 3, 5, shade(c, 0.8));
      break;
    case 'jester':
      R(-4, hy - 2, 5, 3, '#c23a34');
      R(1, hy - 2, 4, 3, '#d9b24a');
      R(-6, hy - 4, 3, 3, '#c23a34');
      R(-7, hy - 2, 2, 3, '#c23a34');
      R(4, hy - 4, 3, 3, '#d9b24a');
      R(6, hy - 2, 2, 3, '#d9b24a');
      R(-8, hy + 1, 2, 2, '#f2dc7a');
      R(7, hy + 1, 2, 2, '#f2dc7a');
      break;
    case 'wizard':
      R(-6, hy - 1, 13, 2, shade(c, 0.8));
      R(-3, hy - 4, 7, 3, c);
      R(-2, hy - 7, 5, 3, c);
      R(-2, hy - 10, 3, 3, c);
      R(-3, hy - 11, 2, 2, shade(c, 0.8));
      R(0, hy - 4, 1, 1, '#f2dc7a');
      R(-1, hy - 8, 1, 1, '#f2dc7a');
      break;
    case 'straw':
      R(-7, hy - 1, 15, 2, '#d9b86a');
      R(-3, hy - 4, 7, 3, '#e3c57a');
      R(-3, hy - 2, 7, 1, '#8a6a2a');
      break;
    case 'tonsure':
      R(-3, hy - 1, 6, 1, spec.skin);
      break;
    default:
  }
}

function drawProp(R, spec, hx, hy, t) {
  switch (spec.prop) {
    case 'sword':
      R(-7, hy - 2, 2, 2, '#d9b24a');
      R(-8, hy, 2, 9, '#5a4a3a');
      R(-9, hy - 1, 4, 1, '#d9b24a');
      break;
    case 'scroll':
      R(hx - 1, hy - 4, 3, 8, '#efe6cc');
      R(hx - 1, hy - 5, 3, 1, '#b9a27a');
      R(hx - 1, hy + 4, 3, 1, '#b9a27a');
      break;
    case 'purse':
      R(hx - 1, hy + 2, 4, 4, '#8a5a2a');
      R(hx, hy + 1, 2, 1, '#d9b24a');
      break;
    case 'hammer':
      R(hx, hy - 6, 1, 9, '#6b4a2b');
      R(hx - 2, hy - 8, 5, 3, '#8d949c');
      break;
    case 'bauble':
      R(hx, hy - 5, 1, 8, '#6b4a2b');
      R(hx - 1, hy - 8, 3, 3, '#d9b24a');
      R(hx - 1, hy - 9, 1, 1, '#c23a34');
      R(hx + 1, hy - 9, 1, 1, '#c23a34');
      break;
    case 'trumpet':
      R(hx, hy - 1, 7, 1, '#e8c85a');
      R(hx + 6, hy - 2, 2, 3, '#e8c85a');
      R(hx + 2, hy, 3, 5, spec.top);
      R(hx + 2, hy + 5, 3, 1, '#e8d27a');
      break;
    case 'flask':
      R(hx, hy - 3, 2, 2, '#cfe0e0');
      R(hx - 1, hy - 1, 4, 4, Math.floor(t * 3) % 2 ? '#6fd08a' : '#8fe0a0');
      R(hx + (Math.floor(t * 2) % 3), hy - 6 - (Math.floor(t * 4) % 3), 1, 1, '#8fe0a0');
      break;
    case 'pitchfork':
      R(hx, hy - 16, 1, 21, '#6b4a2b');
      R(hx - 2, hy - 19, 1, 4, '#8d949c');
      R(hx + 2, hy - 19, 1, 4, '#8d949c');
      R(hx - 2, hy - 16, 5, 1, '#8d949c');
      R(hx, hy - 19, 1, 3, '#8d949c');
      break;
    case 'book':
      R(hx - 1, hy - 1, 4, 5, '#7a2a2a');
      R(hx, hy, 2, 3, '#d9b24a');
      break;
    case 'spear':
      R(hx + 1, hy - 26, 1, 37, '#6b4a2b');
      R(hx, hy - 30, 3, 4, '#c4cad0');
      R(hx + 1, hy - 32, 1, 2, '#c4cad0');
      break;
    default:
  }
}

export const CHAR_HEIGHT = 36;

export function drawChar(ctx, x, y, facing, spec, pose) {
  const S = 3;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(facing < 0 ? -S : S, S);
  const R = (rx, ry, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(rx, ry, w, h);
  };
  const t = pose.t ?? 0;
  const flinch = pose.flinch ?? 0;
  const ph = pose.walking ? Math.floor(t * 7 + spec.seed) % 4 : -1;
  const legA = ph < 0 ? 0 : [2, 0, -2, 0][ph];
  const bob = ph === 1 || ph === 3 ? -1 : 0;
  const breath = !pose.walking && !pose.kneel && Math.floor(t * 0.8 + spec.seed * 0.37) % 3 === 0 ? 1 : 0;
  const drop = pose.kneel ? 6 : 0;
  const lean = flinch ? -1 : pose.sulk ? 1 : 0;
  const half = spec.fat ? 6 : 5;
  const hip = -12 + drop;
  const top = hip - 13 + bob + breath;
  const headY = top - 9 + (pose.sulk ? 2 : 0) + (flinch ? 1 : 0);
  const headX = lean + (pose.sulk ? 1 : 0);

  R(-6, -1, 13, 2, 'rgba(0,0,0,0.28)');

  if (pose.walking && !flinch) {
    R(2 - legA, top + 1, 3, 9, shade(spec.top, 0.7));
  }

  if (spec.robe) {
    R(-half, hip - 1, half * 2, 13 - drop, spec.bottom);
    R(-half - 1, -4, half * 2 + 2, 4, spec.bottom);
    R(-half, hip - 1, 2, 13 - drop, shade(spec.bottom, 0.78));
    R(-half - 1, -1, half * 2 + 2, 1, shade(spec.bottom, 0.6));
    if (!pose.kneel) {
      R(-3 - legA, -1, 3, 1, spec.boots);
      R(1 + legA, -1, 3, 1, spec.boots);
    }
  } else if (pose.kneel) {
    R(-8, -3, 8, 3, shade(spec.bottom, 0.8));
    R(-9, -3, 2, 3, spec.boots);
    R(0, hip, 7, 3, spec.bottom);
    R(4, hip + 3, 3, 4, spec.bottom);
    R(4, -3, 4, 3, spec.boots);
  } else {
    const liftB = ph === 1 ? 1 : 0;
    const liftA = ph === 3 ? 1 : 0;
    R(-3 - legA, hip, 3, 9 - liftB, shade(spec.split ?? spec.bottom, 0.8));
    R(-3 - legA, -3 - liftB, 4, 3, shade(spec.boots, 0.8));
    R(legA, hip, 3, 9 - liftA, spec.bottom);
    R(legA, -3 - liftA, 4, 3, spec.boots);
  }

  R(-half + lean, top, half * 2, 13, spec.top);
  R(-half + lean, top, 2, 13, shade(spec.top, 0.78));
  if (spec.split) R(lean, top, half, 13, spec.split);
  if (spec.tabard) {
    R(-2 + lean, top + 1, 6, 13, spec.tabardColor);
    R(0 + lean, top + 4, 2, 5, '#e8e2d0');
    R(-1 + lean, top + 5, 4, 2, '#e8e2d0');
  }
  if (spec.apron) R(-1 + lean, top + 4, half + 1, 12, spec.apron);
  if (spec.trim) {
    R(-half + lean, top, half * 2, 1, spec.trim);
    R(1 + lean, top + 1, 1, 11, spec.trim);
  }
  if (!spec.tabard && !spec.apron) R(-half + lean, hip - 2, half * 2, 2, spec.belt ?? shade(spec.top, 0.55));

  R(-3 + headX, headY, 8, 9, spec.skin);
  R(-3 + headX, headY + 8, 8, 1, shade(spec.skin, 0.82));
  if (spec.hat !== 'hood' && spec.hat !== 'helmet') {
    R(-4 + headX, headY, 3, 6, spec.hair);
    if (spec.hat !== 'tonsure') R(-4 + headX, headY - 1, 8, 3, spec.hair);
    else R(-4 + headX, headY, 9, 2, spec.hair);
  }
  if (spec.beard) {
    R(0 + headX, headY + 6, 5, 4, spec.hair);
    if (spec.role === 'alchemist') R(1 + headX, headY + 10, 3, 4, spec.hair);
  }
  if (flinch) {
    R(2 + headX, headY + 4, 2, 1, INK);
    R(2 + headX, headY + 7, 2, 2, '#5a2a22');
  } else {
    const blink = Math.floor(t * 10 + spec.seed * 3) % 37 === 0;
    R(3 + headX, headY + 4, 1, blink ? 1 : 2, INK);
    if (pose.talking && Math.floor(t * 7) % 2) R(3 + headX, headY + 7, 2, 1, '#5a2a22');
  }
  R(5 + headX, headY + 5, 1, 2, shade(spec.skin, 0.88));
  ctx.save();
  ctx.translate(headX, 0);
  drawHat(R, spec, headY);
  ctx.restore();

  const sleeve = shade(spec.top, 1.12);
  let hx = 0;
  let hy = top + 12;
  if (flinch) {
    R(-1 + lean, top - 5, 3, 8, sleeve);
    R(-1 + lean, top - 7, 3, 2, spec.skin);
    R(-6 + lean, top - 4, 3, 7, shade(spec.top, 0.7));
    hx = -99;
  } else if (pose.talking && Math.floor(t * 1.4) % 3 !== 0) {
    R(0, top + 1, 3, 5, sleeve);
    R(1, top + 4, 6, 3, sleeve);
    R(7, top + 3, 2, 3, spec.skin);
    hx = 8;
    hy = top + 3;
  } else {
    const swing = pose.walking ? legA : 0;
    R(-1 + swing, top + 1, 3, 10, sleeve);
    R(-1 + swing, top + 11, 3, 2, spec.skin);
    hx = swing;
  }
  if (hx > -50) drawProp(R, spec, hx, hy, t);
  if (flinch > 0.6) {
    ctx.globalAlpha = 0.55;
    R(-half - 1, headY - 2, half * 2 + 3, -headY + 2, '#ffffff');
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function drawKing(ctx, x, y, state) {
  const S = 4;
  const t = state.t;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(-S, S);
  const R = (rx, ry, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(rx, ry, w, h);
  };
  const breath = Math.floor(t * 0.7) % 2;
  const asleep = state.asleep;
  const head = -26 + breath + (asleep ? 2 : 0);
  const hxo = asleep ? 2 : 0;
  const blue = '#3b4f86';
  const red = '#8f2a2a';
  const gold = '#e3bd4a';
  const fur = '#ece6d6';

  R(-7, -16 + breath, 4, 17, red);
  R(-8, -8, 3, 9, shade(red, 0.8));
  R(-4, -15 + breath, 10, 15 - breath, blue);
  R(-4, -15 + breath, 2, 15 - breath, shade(blue, 0.78));
  R(0, -10, 3, 6, '#dfe3ea');
  R(-1, -8, 5, 2, '#dfe3ea');
  R(-4, -2, 10, 2, gold);
  R(1, -5, 13, 5, shade(blue, 0.82));
  R(1, -5, 13, 1, blue);
  R(11, 0, 4, 9, shade(blue, 0.7));
  R(11, 9, 6, 3, '#4a3020');
  R(11, 9, 6, 1, '#6b4a2b');
  R(-5, -16 + breath, 12, 3, fur);
  R(-3, -15 + breath, 1, 1, INK);
  R(1, -15 + breath, 1, 1, INK);
  R(4, -14 + breath, 1, 1, INK);

  R(-2 + hxo, head, 8, 9, '#e0aa86');
  R(-3 + hxo, head, 3, 7, '#5a3a22');
  R(-3 + hxo, head - 1, 8, 2, '#5a3a22');
  R(0 + hxo, head + 5, 6, 5, '#5a3a22');
  R(2 + hxo, head + 10, 3, 2, '#5a3a22');
  R(6 + hxo, head + 4, 1, 2, '#c98f6c');
  const blink = asleep || Math.floor(t * 10) % 43 === 0;
  R(4 + hxo, head + 3, 1, blink ? 1 : 2, INK);
  if (state.talking && Math.floor(t * 7) % 2) R(4 + hxo, head + 7, 2, 1, '#2a1410');
  R(-2 + hxo, head - 4, 8, 3, gold);
  R(-2 + hxo, head - 6, 2, 2, gold);
  R(1 + hxo, head - 6, 2, 2, gold);
  R(4 + hxo, head - 6, 2, 2, gold);
  R(-2 + hxo, head - 2, 8, 1, shade(gold, 0.75));
  R(1 + hxo, head - 4, 2, 1, '#c23a34');

  const w = state.whip;
  if (w !== null && w !== undefined) {
    const up = w < 0.35;
    if (up) {
      R(0, -21, 3, 9, shade(blue, 1.15));
      R(0, -23, 3, 2, '#e0aa86');
    } else {
      R(0, -13, 4, 3, shade(blue, 1.15));
      R(3, -12, 7, 3, shade(blue, 1.15));
      R(10, -12, 2, 3, '#e0aa86');
    }
  } else {
    R(0, -12 + breath, 3, 6, shade(blue, 1.15));
    R(1, -7, 7, 3, shade(blue, 1.15));
    R(8, -7, 2, 3, '#e0aa86');
  }
  if (asleep) {
    const z = Math.floor(t * 1.5) % 3;
    ctx.fillStyle = '#f4efe0';
    ctx.fillRect(9 + z * 3, head - 4 - z * 4, 3, 1);
    ctx.fillRect(10 + z * 3, head - 3 - z * 4, 1, 1);
    ctx.fillRect(9 + z * 3, head - 2 - z * 4, 3, 1);
  }
  ctx.restore();
}

export function drawWhip(ctx, hand, target, w) {
  const up = w < 0.35;
  const k = up ? w / 0.35 : (w - 0.35) / 0.65;
  const from = up ? { x: hand.x + 4, y: hand.y - 34 } : { x: hand.x - 34, y: hand.y - 2 };
  let tip;
  let mid;
  if (up) {
    tip = { x: from.x + 60 * k, y: from.y - 50 * k };
    mid = { x: from.x + 20, y: from.y - 60 * k };
  } else {
    const reach = Math.min(1, k * 2.4);
    const recoil = k > 0.42 ? (k - 0.42) / 0.58 : 0;
    tip = { x: from.x + (target.x - from.x) * (reach - recoil * 0.5), y: from.y + (target.y - from.y) * reach - recoil * 40 };
    mid = { x: (from.x + tip.x) / 2, y: Math.min(from.y, tip.y) - 70 * (1 - reach) + recoil * 30 };
  }
  ctx.fillStyle = '#2a1a10';
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const px = (1 - u) * (1 - u) * from.x + 2 * (1 - u) * u * mid.x + u * u * tip.x;
    const py = (1 - u) * (1 - u) * from.y + 2 * (1 - u) * u * mid.y + u * u * tip.y;
    ctx.fillRect(Math.round(px / 3) * 3, Math.round(py / 3) * 3, 3, 3);
  }
  if (!up && k > 0.38 && k < 0.62) {
    ctx.fillStyle = '#fff6d0';
    const cx = Math.round(target.x / 3) * 3;
    const cy = Math.round(target.y / 3) * 3;
    for (const [dx, dy] of [[0, 0], [-6, 0], [6, 0], [0, -6], [0, 6], [-9, -9], [9, -9], [-9, 9], [9, 9], [-12, 0], [12, 0], [0, -12]]) ctx.fillRect(cx + dx, cy + dy, 3, 3);
  }
}
