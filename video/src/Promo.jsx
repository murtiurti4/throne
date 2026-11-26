import React from 'react';
import { AbsoluteFill, Audio, Composition, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Bubble, Hall, KING } from './Hall.jsx';
import { Court, bannerState } from './Court.jsx';
import { BEATS, FPS, T } from './timeline.js';

const f = (seconds) => Math.round(seconds * FPS);
const pixel = { fontFamily: 'Pixelify', fontWeight: 700, color: '#e3bd4a', textShadow: '8px 8px 0 #5a1c18, 0 0 60px rgba(0,0,0,0.9)' };
const PANEL = [50, 88];
const THRONE = [60, 22];
const shots = [
  [0, PANEL, 1],
  [0.4, PANEL, 1.42, 2.0],
  [4.3, THRONE, 1.5],
  [6.8, PANEL, 1.42],
  [8.62, THRONE, 1.4],
  [10.6, PANEL, 1.38],
  [12.42, THRONE, 1.4],
  [14.35, PANEL, 1.38],
  [16.52, THRONE, 1.4],
];
const CAMERA = shots.flatMap(([at, origin, zoom, ease = 0.28], i) => {
  const until = (shots[i + 1]?.[0] ?? T.card + 1) - 0.2;
  return i === 0 ? [[at, 1, origin], [until + 0.2, 1, origin]] : [[at, 1, origin], [at + ease, zoom, origin], [until, zoom, origin], [until + 0.2, 1, origin]];
});

const CAPTIONS = [
  [0.1, 4.2, 'my AI agent, reporting a bug:'],
  [5.2, 6.75, 'so I built a whip.'],
  [7.0, 8.55, 'same agent. one lash later.'],
  [10.7, 12.35, 'they queue up. one question each.'],
  [14.4, 16.45, 'any agent that speaks MCP can petition.'],
];

const KEYS = [
  [BEATS.whipKey, 'W', 'whip'],
  [BEATS.pickKey, '1', 'answer'],
  [BEATS.dungeonKey, 'X', 'dungeon'],
  [BEATS.yourCallKey, 'Y', 'your call'],
];

function camera(t) {
  let i = 0;
  while (i < CAMERA.length - 2 && t >= CAMERA[i + 1][0]) i++;
  const [t0, z0, origin] = CAMERA[i];
  const [t1, z1] = CAMERA[i + 1];
  const zoom = interpolate(t, [t0, t1], [z0, z1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  return { transform: 'scale(' + zoom + ')', transformOrigin: origin[0] + '% ' + origin[1] + '%' };
}

const Game = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const caption = CAPTIONS.find(([from, to]) => t >= from && t < to);
  const key = KEYS.find(([at]) => t >= at - 0.05 && t < at + 0.75);
  return (
    <AbsoluteFill style={{ background: '#0d0a0f', opacity: interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], { extrapolateLeft: 'clamp' }) }}>
      <AbsoluteFill style={camera(t)}>
        <Court t={t} />
      </AbsoluteFill>
      {caption && (
        <div style={{ position: 'absolute', top: 78, left: 0, right: 0, textAlign: 'center', transform: 'scale(' + spring({ frame: frame - caption[0] * fps, fps, config: { damping: 15, stiffness: 240 } }) + ')' }}>
          <span style={{ display: 'inline-block', padding: '8px 34px 16px', background: '#0d0a0f', border: '5px solid #f4f1e6', boxShadow: '0 0 0 5px #0d0a0f', fontFamily: 'Pixelify', fontWeight: 600, fontSize: 68, color: '#f4f1e6' }}>{caption[2]}</span>
        </div>
      )}
      {key && (
        <div style={{ position: 'absolute', right: 110, bottom: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transform: 'scale(' + spring({ frame: frame - (key[0] - 0.05) * fps, fps, config: { damping: 10, stiffness: 300 } }) + ')' }}>
          <div style={{ width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0a0f', border: '8px solid #e3bd4a', boxShadow: t < key[0] + 0.15 ? '0 4px 0 #7a5f1a' : '0 16px 0 #7a5f1a', transform: 'translateY(' + (t < key[0] + 0.15 ? 12 : 0) + 'px)', fontFamily: 'VT323', fontSize: 150, color: '#e3bd4a' }}>{key[1]}</div>
          <div style={{ padding: '0 14px 4px', background: '#0d0a0f', fontFamily: 'Pixelify', fontSize: 40, color: '#f4f1e6' }}>{key[2]}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

const Card = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = (from) => interpolate(frame, [from, from + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: '#0d0a0f' }}>
      <Hall state={{ actors: [], whip: null, t: frame / fps, king: { whip: null, talking: false, asleep: true } }} width={1920} height={1080} style={{ filter: 'brightness(0.3)' }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex' }}>
          {'THRONE'.split('').map((letter, i) => (
            <span key={i} style={{ ...pixel, fontSize: 300, lineHeight: 1, transform: 'translateY(' + (1 - spring({ frame: frame - i * 2, fps, config: { damping: 11, stiffness: 180 } })) * -800 + 'px)' }}>
              {letter}
            </span>
          ))}
        </div>
        <div style={{ fontFamily: 'VT323', fontSize: 70, color: '#efe6cc', marginTop: 10, opacity: fade(16) }}>a throne room for your AI agents</div>
        <div style={{ marginTop: 44, padding: '6px 34px 14px', background: 'rgba(16,12,18,0.9)', border: '5px solid #e3bd4a', fontFamily: 'VT323', fontSize: 72, color: '#f4f1e6', opacity: fade(34) }}>github.com/murtiurti4/throne</div>
        <div style={{ fontFamily: 'VT323', fontSize: 46, color: '#d8cdb6', marginTop: 22, opacity: fade(46) }}>open source · no agents were harmed</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Promo = () => (
  <AbsoluteFill style={{ background: '#000' }}>
    <Audio src={staticFile('soundtrack.wav')} />
    <Sequence durationInFrames={f(T.card)}>
      <Game />
    </Sequence>
    <Sequence from={f(T.card)} durationInFrames={f(T.end - T.card)}>
      <Card />
    </Sequence>
  </AbsoluteFill>
);

const Banner = () => {
  const state = bannerState();
  const knight = state.actors[0];
  return (
    <AbsoluteFill style={{ background: '#0d0a0f' }}>
      <Hall state={state} width={1920} height={960} offsetY={50} />
      <AbsoluteFill style={{ background: 'linear-gradient(100deg, rgba(13,10,15,0.88) 0%, rgba(13,10,15,0.6) 34%, rgba(13,10,15,0) 58%)' }} />
      <Bubble royal x={(KING.x - 30) * 2} y={(KING.y - 150 - 50) * 2}>
        Speak plainly!
      </Bubble>
      <Bubble x={(knight.x - 50) * 2} y={(knight.y - 136 - 50) * 2}>
        Ow! Forgive me, Your Grace!
      </Bubble>
      <div style={{ position: 'absolute', left: 90, top: 70 }}>
        <div style={{ ...pixel, fontSize: 230, lineHeight: 1 }}>THRONE</div>
        <div style={{ fontFamily: 'VT323', fontSize: 58, lineHeight: 1.05, color: '#f4f1e6', marginTop: 22, width: 900, textShadow: '4px 4px 0 #000' }}>Your AI agents line up, kneel, and ask you one question at a time.</div>
      </div>
    </AbsoluteFill>
  );
};

export const Root = () => (
  <>
    <Composition id="Promo" component={Promo} durationInFrames={f(T.end)} fps={FPS} width={1920} height={1080} />
    <Composition id="Banner" component={Banner} durationInFrames={1} fps={FPS} width={1920} height={960} />
  </>
);
