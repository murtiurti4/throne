import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import { GUARD, drawChar, drawKing, drawWhip } from '../../public/js/sprites.js';
import { findFlames } from '../../public/js/scene.js';

export const LOOK = { skin: '#e0aa86', hair: '#5a3a22', robe: '#3b4f86', cape: '#8f2a2a', metal: '#e3bd4a', crown: 'crown', beard: true, longHair: false };
export const KING = { x: 722, y: 346 };
const BLUE_GUARD = { ...GUARD, seed: 11, tabardColor: '#2f5a8f' };
const MOTES = Array.from({ length: 46 }, (_, i) => ({ x: (i * 197) % 960, y: 60 + ((i * 89) % 330), s: 4 + (i % 5) * 2, p: i * 1.7 }));

const fontHandle = delayRender('fonts');
Promise.all([
  new FontFace('Pixelify', 'url(' + staticFile('pixelify.woff2') + ')', { weight: '400 700' }).load(),
  new FontFace('VT323', 'url(' + staticFile('vt323.woff2') + ')').load(),
]).then((fonts) => {
  for (const font of fonts) document.fonts.add(font);
  continueRender(fontHandle);
});

function draw(ctx, { image, flames }, state) {
  const t = state.t;
  ctx.drawImage(image, 0, 0, 960, 540);
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
  ctx.fillStyle = '#7a2a2a';
  ctx.fillRect(650, 394, 36, 4);
  ctx.fillStyle = '#5a2020';
  ctx.fillRect(650, 398, 36, 6);
  drawKing(ctx, KING.x, KING.y, { t, ...state.king }, LOOK);
  for (const a of [...state.actors].sort((a, b) => a.y - b.y)) drawChar(ctx, a.x, a.y, a.facing, a.spec, { t, ...a.pose });
  if (state.whip) drawWhip(ctx, { x: KING.x - 8, y: KING.y - 40 }, { x: state.whip.x + 6, y: state.whip.y - 70 }, state.whip.phase);
  drawChar(ctx, 884, 486, -1, BLUE_GUARD, { t: t * 0.5 + 3 });
  ctx.drawImage(image, 0, 0, 30, 270, 0, 0, 60, 540);
  ctx.drawImage(image, 30, 216, 14, 54, 60, 432, 28, 108);
  ctx.globalCompositeOperation = 'lighter';
  for (const f of flames) {
    const r = 34 * (0.75 + 0.25 * Math.sin(t * 9 + f.x) * Math.sin(t * 5.3 + f.y));
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
    g.addColorStop(0, 'rgba(255,190,90,0.20)');
    g.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(f.x - r, f.y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const f of flames) {
    const j = Math.floor(t * 8 + f.x) % 3;
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(f.x - 2, f.y - 2 - j * 2, 2, 4);
    ctx.fillStyle = '#ffc45a';
    ctx.fillRect(f.x - 2, f.y - 4 - j * 2, 2, 2);
  }
  for (const m of MOTES) {
    ctx.fillStyle = 'rgba(255,240,205,' + (0.16 + 0.14 * Math.sin(t * 0.9 + m.p)).toFixed(3) + ')';
    ctx.fillRect(Math.round(((m.x + t * m.s) % 960) / 2) * 2, Math.round((m.y + Math.sin(t * 0.4 + m.p) * 14) / 2) * 2, 2, 2);
  }
}

export const Hall = ({ state, width, height, offsetY = 0, style }) => {
  const ref = useRef(null);
  const [assets, setAssets] = useState(null);
  const [handle] = useState(() => delayRender('hall'));
  useEffect(() => {
    const image = new Image();
    image.onload = () => setAssets({ image, flames: findFlames(image) });
    image.src = staticFile('hall.png');
  }, []);
  useLayoutEffect(() => {
    if (!assets) return;
    const ctx = ref.current.getContext('2d');
    const scale = width / 960;
    ctx.setTransform(scale, 0, 0, scale, 0, -offsetY * scale);
    ctx.imageSmoothingEnabled = false;
    draw(ctx, assets, state);
    continueRender(handle);
  }, [assets, state, width, offsetY, handle]);
  return <canvas ref={ref} width={width} height={height} style={{ position: 'absolute', left: 0, top: 0, ...style }} />;
};

export const Bubble = ({ x, y, royal, children, size = 44 }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: 'translate(-50%, -100%)',
      width: 'max-content',
      maxWidth: 760,
      padding: '8px 22px 12px',
      background: '#1a1a1e',
      color: royal ? '#fff3c4' : '#f4f1e6',
      border: '4px solid ' + (royal ? '#e3bd4a' : '#f4f1e6'),
      boxShadow: '0 0 0 4px #1a1a1e',
      fontFamily: 'VT323',
      fontSize: size,
      lineHeight: 1.05,
      textAlign: 'center',
    }}
  >
    {children}
    <div style={{ position: 'absolute', left: '50%', bottom: -18, marginLeft: -12, border: '12px solid transparent', borderTopColor: royal ? '#e3bd4a' : '#f4f1e6', borderBottom: 0 }} />
  </div>
);
