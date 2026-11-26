import React from 'react';
import { AbsoluteFill, Audio, Composition, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Chaos } from './Intro.jsx';
import { Bubble, Hall, KING } from './Hall.jsx';
import { Court, bannerState } from './Court.jsx';
import { FPS, T } from './timeline.js';

const f = (seconds) => Math.round(seconds * FPS);
const EMPTY = { actors: [], whip: null };
const pixel = { fontFamily: 'Pixelify', fontWeight: 700, color: '#e3bd4a', textShadow: '8px 8px 0 #5a1c18, 0 0 60px rgba(0,0,0,0.9)' };

const Kneel = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#000', alignItems: 'center', justifyContent: 'center', fontFamily: 'Pixelify', color: '#f4f1e6', fontSize: 110, opacity: frame < 6 ? 0 : 1 }}>
      So I made them kneel.
    </AbsoluteFill>
  );
};

const Title = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: '#0d0a0f' }}>
      <Hall state={{ ...EMPTY, t: frame / fps, king: { whip: null, talking: false, asleep: false } }} width={1920} height={1080} style={{ filter: 'brightness(0.32)' }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex' }}>
          {'THRONE'.split('').map((letter, i) => (
            <span key={i} style={{ ...pixel, fontSize: 300, lineHeight: 1, transform: 'translateY(' + (1 - spring({ frame: frame - i * 2, fps, config: { damping: 11, stiffness: 180 } })) * -700 + 'px)' }}>
              {letter}
            </span>
          ))}
        </div>
        <div style={{ fontFamily: 'VT323', fontSize: 64, color: '#efe6cc', marginTop: 10, opacity: interpolate(frame, [18, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>a throne room for the questions your AI agents keep asking</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const CourtScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity: interpolate(frame, [0, 8, durationInFrames - 8, durationInFrames], [0, 1, 1, 0]) }}>
      <Court t={frame / fps} />
    </AbsoluteFill>
  );
};

const FEATURES = [
  ['One question at a time.', 'No pings. No context switching.'],
  ['Any agent. One tool.', 'petition_the_king, over MCP'],
  ['Windbags get the whip.', 'They come back with fewer words.'],
];

const Features = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const each = f((T.outro - T.features) / FEATURES.length);
  const [head, sub] = FEATURES[Math.min(FEATURES.length - 1, Math.floor(frame / each))];
  const local = frame % each;
  return (
    <AbsoluteFill style={{ background: '#0d0a0f' }}>
      <Hall state={{ ...EMPTY, t: frame / fps, king: { whip: null, talking: false, asleep: false } }} width={1920} height={1080} style={{ filter: 'brightness(0.3)' }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: 'scale(' + spring({ frame: local, fps, config: { damping: 14, stiffness: 200 } }) + ')' }}>
        <div style={{ ...pixel, fontSize: 130 }}>{head}</div>
        <div style={{ fontFamily: 'VT323', fontSize: 68, color: '#efe6cc', marginTop: 16 }}>{sub}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Outro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: '#0d0a0f', opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' }) }}>
      <Hall state={{ ...EMPTY, t: frame / fps, king: { whip: null, talking: false, asleep: true } }} width={1920} height={1080} />
      <AbsoluteFill style={{ background: 'linear-gradient(rgba(13,10,15,0.75), rgba(13,10,15,0) 45%)' }} />
      <div style={{ position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ ...pixel, fontSize: 120 }}>The court is quiet.</div>
        <div style={{ display: 'inline-block', marginTop: 28, padding: '6px 30px 12px', background: 'rgba(16,12,18,0.9)', border: '4px solid #e3bd4a', fontFamily: 'VT323', fontSize: 68, color: '#f4f1e6', opacity: interpolate(frame, [30, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>github.com/murtiurti4/throne</div>
      </div>
    </AbsoluteFill>
  );
};

const Promo = () => (
  <AbsoluteFill style={{ background: '#000' }}>
    <Audio src={staticFile('soundtrack.wav')} />
    <Sequence durationInFrames={f(T.kneel)}>
      <Chaos />
    </Sequence>
    <Sequence from={f(T.kneel)} durationInFrames={f(T.title - T.kneel)}>
      <Kneel />
    </Sequence>
    <Sequence from={f(T.title)} durationInFrames={f(T.hall - T.title)}>
      <Title />
    </Sequence>
    <Sequence from={f(T.hall)} durationInFrames={f(T.features - T.hall)}>
      <CourtScene />
    </Sequence>
    <Sequence from={f(T.features)} durationInFrames={f(T.outro - T.features)}>
      <Features />
    </Sequence>
    <Sequence from={f(T.outro)} durationInFrames={f(T.end - T.outro)}>
      <Outro />
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
