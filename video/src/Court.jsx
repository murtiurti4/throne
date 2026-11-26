import React, { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile } from 'remotion';
import { makeSpec } from '../../public/js/sprites.js';
import { DEMO_PETITIONS } from '../../server/demo.js';
import { Hall, KING } from './Hall.jsx';
import { HALL } from './timeline.js';

const FLOOR = 456;
const SORCERY = /idempoten|synerg|leverag|paradigm|orchestrat|microservice|middleware|refactor|kubernetes|holistic|declarative|reconcil|semantic|scalab|architect|projection|consisten|deprecat|endpoint|proxy|event-driven|gitops|\b[A-Z]{3,}\b/g;
const demo = (agent) => DEMO_PETITIONS.find((p) => p.agent === agent);

const ACTORS = [
  { agent: 'Auth Migration', track: [[0, -40], [2.5, 516], [13.6, 516], [15.8, -70]], kneel: HALL.arrive, leave: 13.6 },
  { agent: 'Experiment 7', track: [[0, -110], [2.6, 448], [13.6, 448], [14.1, 516], [17.6, 516], [18.9, -90]], kneel: HALL.jester, leave: 17.6 },
  { agent: 'Billing Ledger', track: [[0, -180], [2.7, 390], [13.6, 390], [14.1, 448], [17.6, 448], [18.1, 516], [22.0, 516], [24.2, -70]], kneel: HALL.treasurer, leave: 22.0 },
  { agent: 'Flaky Test Hunt', track: [[0, -250], [2.8, 332], [13.6, 332], [14.1, 390], [17.6, 390], [18.1, 448], [22.0, 448], [22.5, 516]], kneel: 22.5, leave: 99 },
  { agent: 'Release Notes', track: [[0, -320], [2.9, 274], [13.6, 274], [14.1, 332], [17.6, 332], [18.1, 390], [22.0, 390], [22.5, 448]], kneel: 99, leave: 99 },
].map((a) => {
  const petition = demo(a.agent);
  const spec = makeSpec(a.agent, petition.role);
  return { ...a, petition, spec, name: spec.title + ' ' + a.agent };
});

const BUBBLES = [
  { who: 0, text: 'Your Grace!', from: HALL.arrive, to: 3.4 },
  { who: 'king', text: 'Speak plainly!', from: 8.45, to: 9.9 },
  { who: 0, text: 'Ow! Forgive me, Your Grace!', from: HALL.impact, to: 10.7 },
  { who: 'king', text: 'Remove the old gate now', from: HALL.verdict, to: 14.1 },
  { who: 0, text: 'At once, Your Grace!', from: 13.0, to: 14.6 },
  { who: 1, text: 'Your Grace!', from: HALL.jester, to: 15.0 },
  { who: 'king', text: 'To the dungeon with this idea!', from: HALL.dungeon, to: 18.2 },
  { who: 1, text: 'Not the dungeon again!', from: 17.0, to: 18.6 },
  { who: 2, text: 'Your Grace!', from: HALL.treasurer, to: 19.0 },
  { who: 'king', text: 'Decide it yourself. I trust you.', from: HALL.yourCall, to: 22.7 },
  { who: 2, text: 'You honour me, Your Grace!', from: 21.4, to: 23.3 },
];

const AUDIENCES = [
  { from: HALL.arrive, to: HALL.impact, who: 0, start: 3.0, cps: 90, speech: ACTORS[0].petition.speech, hot: { deed: 'whip', from: 8.1 } },
  { from: HALL.impact, to: HALL.verdict, who: 0, start: HALL.impact, cps: 60, speech: ACTORS[0].petition.plain, lashes: 1, hot: { option: 0, from: 12.2 } },
  { from: HALL.jester, to: HALL.dungeon, who: 1, start: HALL.jester + 0.1, cps: 90, speech: ACTORS[1].petition.speech, hot: { deed: 'dungeon', from: 16.3 } },
  { from: HALL.treasurer, to: HALL.yourCall, who: 2, start: HALL.treasurer + 0.1, cps: 90, speech: ACTORS[2].petition.speech, hot: { deed: 'delegate', from: 20.7 } },
];

const KEYS = [
  [8.5, 'W', 'whip'],
  [HALL.verdict, '1', 'answer'],
  [HALL.dungeon, 'X', 'dungeon'],
  [HALL.yourCall, 'Y', 'your call'],
];

function place(track, t) {
  if (t <= track[0][0]) return { x: track[0][1], walking: false, facing: 1 };
  for (let i = 0; i < track.length - 1; i++) {
    const [t0, x0] = track[i];
    const [t1, x1] = track[i + 1];
    if (t < t1) return { x: x0 + ((x1 - x0) * (t - t0)) / (t1 - t0), walking: x1 !== x0, facing: x1 < x0 ? -1 : 1 };
  }
  return { x: track[track.length - 1][1], walking: false, facing: 1 };
}

export function courtState(t) {
  const audience = AUDIENCES.find((a) => t >= a.from && t < a.to);
  const typing = audience && (t - audience.start) * audience.cps < audience.speech.length;
  const actors = ACTORS.map((a, i) => {
    const at = place(a.track, t);
    return {
      spec: a.spec,
      x: at.x,
      y: t >= a.leave ? FLOOR + 8 : at.x >= 516 ? FLOOR : FLOOR + ((a.spec.seed % 3) - 1) * 5,
      facing: at.facing,
      pose: {
        walking: at.walking,
        kneel: t >= a.kneel && t < a.kneel + 0.9,
        talking: typing && audience.who === i,
        flinch: i === 0 && t >= HALL.impact && t < HALL.impact + 0.7 ? (HALL.impact + 0.7 - t) / 0.7 : 0,
      },
    };
  });
  const phase = (t - HALL.whip) / 0.75;
  const bubbles = BUBBLES.filter((b) => t >= b.from && t < b.to);
  return {
    t,
    actors,
    king: { whip: phase >= 0 && phase < 1 ? phase : null, talking: bubbles.some((b) => b.who === 'king'), asleep: false },
    whip: phase >= 0 && phase < 1 ? { phase, x: actors[0].x, y: actors[0].y } : null,
    bubbles,
    audience,
    shake: t >= HALL.impact && t < HALL.impact + 0.18 ? [Math.sin(t * 190) * 5, Math.cos(t * 160) * 4] : [0, 0],
  };
}

const DEEDS = [['whip', 'W', 'Whip'], ['delegate', 'Y', 'Your call'], ['back', 'B', 'Later'], ['dungeon', 'X', 'Dungeon']];
const HOVER = { background: '#2a2330', color: '#efe6cc' };

const Audience = ({ t, audience }) => {
  const actor = ACTORS[audience.who];
  const p = actor.petition;
  const shown = Math.max(0, Math.floor((t - audience.start) * audience.cps));
  const words = audience.speech.trim().split(/\s+/).length;
  const spells = (audience.speech.match(SORCERY) ?? []).length;
  const score = Math.min(5, Math.floor(words / 16) + Math.ceil(spells / 2));
  const hot = audience.hot && t >= audience.hot.from ? audience.hot : {};
  const itch = score >= 4 && Math.floor(t / 0.45) % 2 === 1;
  return (
    <section id="audience">
      <header>
        <div className="who">
          <h1 id="who">{actor.name}</h1>
          <span id="station">{actor.spec.station}</span>
          <span id="realm">{p.realm}</span>
          <span id="lashes">{'/'.repeat(audience.lashes ?? 0)}</span>
        </div>
        <div className="deeds">
          {DEEDS.map(([id, key, label]) => (
            <button key={id} id={id} type="button" style={hot.deed === id ? HOVER : id === 'whip' && itch ? { borderColor: '#ff6a60', background: '#3a1616' } : undefined}>
              <kbd>{key}</kbd>
              {label}
            </button>
          ))}
        </div>
      </header>
      <h2 id="title">{p.title}</h2>
      <p id="speech">
        {audience.speech.slice(0, shown)}
        <span className="ghost">{audience.speech.slice(shown)}</span>
      </p>
      <div className="windbag" id="windbag">
        <span className="meter">{'▮'.repeat(score) + '▯'.repeat(5 - score)}</span>
        {' ' + ['Plainly spoken', 'Plainly spoken', 'A little wordy', 'Long-winded', 'A windbag', 'Insufferable'][score] + ' · ' + words + ' words'}
        {spells > 0 && (
          <>
            {' · '}
            <b>{spells + (spells === 1 ? ' word' : ' words') + ' of sorcery'}</b>
          </>
        )}
      </div>
      {p.context && (
        <details id="scroll">
          <summary>Unroll the scroll</summary>
        </details>
      )}
      <div id="options">
        {p.options.map((option, i) => (
          <button key={option.label} type="button" className="option" style={hot.option === i ? { borderColor: '#e3bd4a', background: '#352c3c' } : undefined}>
            <kbd>{i + 1}</kbd>
            <span>{option.label}</span>
            {option.detail && <small>{option.detail}</small>}
          </button>
        ))}
      </div>
      <form id="decree">
        <input id="words" type="text" readOnly placeholder="Or speak your own decree, Your Grace… (press / to write)" />
        <button type="button">Decree</button>
      </form>
    </section>
  );
};

const STAGE_H = 456;
const WORLD_W = (STAGE_H / 0.74) * (16 / 9);
const WORLD_H = (WORLD_W * 9) / 16;

export const Court = ({ t }) => {
  const [css, setCss] = useState(null);
  const [handle] = useState(() => delayRender('stylesheet'));
  useEffect(() => {
    fetch(staticFile('style.css'))
      .then((res) => res.text())
      .then((text) => {
        setCss(
          text
            .replace(/html,\s*body \{/, '.app {')
            .replace(/\nbody \{/, '\n.app {')
            .replaceAll('/assets/hall.png', staticFile('hall.png'))
            .replaceAll('/fonts/pixelify.woff2', staticFile('pixelify.woff2'))
            .replaceAll('/fonts/vt323.woff2', staticFile('vt323.woff2')) + '\n.app * { animation: none !important; }',
        );
        continueRender(handle);
      });
  }, [handle]);
  if (!css) return null;
  const state = courtState(t);
  const waiting = ACTORS.filter((a) => t < a.leave - 1.1).length;
  const next = ACTORS.find((a) => t < a.kneel);
  const key = KEYS.find(([at]) => t >= at - 0.05 && t < at + 0.8);
  return (
    <AbsoluteFill style={{ background: '#0d0a0f' }}>
      <style>{css}</style>
      <div className="app" style={{ position: 'absolute', left: 0, top: 0, width: 1500, height: 844, transform: 'scale(1.28)', transformOrigin: '0 0' }}>
        <div className="stage" id="stage" style={{ height: STAGE_H }}>
          <div className="world" id="world" style={{ width: WORLD_W, height: WORLD_H, marginLeft: -WORLD_W / 2, top: -(WORLD_H - STAGE_H) * 0.7, transform: 'translate(' + state.shake[0] + 'px,' + state.shake[1] + 'px)' }}>
            <Hall state={state} width={1920} height={1080} style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} />
            <div className="bubbles" id="bubbles">
              {state.bubbles.map((b) => {
                const a = b.who === 'king' ? null : state.actors[b.who];
                return (
                  <div key={b.text + b.from} className={a ? 'bubble' : 'bubble royal'} style={{ left: ((a ? a.x : KING.x - 14) / 960) * 100 + '%', top: ((a ? a.y - 132 : KING.y - 144) / 540) * 100 + '%' }}>
                    {b.text}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="hud">
            <div className="plaque" id="count">
              {waiting + ' subjects await your judgment'}
            </div>
            <div className="hud-buttons">
              <button type="button">Chambers</button>
              <button type="button">Ledger</button>
              <button type="button">Music: on</button>
              <button type="button">Sound: on</button>
            </div>
          </div>
        </div>
        <main className="panel">
          {state.audience ? (
            <Audience t={t} audience={state.audience} />
          ) : (
            <section id="idle">
              <p id="idle-text">{next ? next.name + ' approaches the throne…' : ''}</p>
            </section>
          )}
        </main>
      </div>
      {key && (
        <div style={{ position: 'absolute', right: 70, bottom: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0a0f', border: '8px solid #e3bd4a', boxShadow: t < key[0] + 0.15 ? '0 4px 0 #7a5f1a' : '0 14px 0 #7a5f1a', transform: 'translateY(' + (t < key[0] + 0.15 ? 10 : 0) + 'px)', fontFamily: 'VT323', fontSize: 130, color: '#e3bd4a' }}>{key[1]}</div>
          <div style={{ padding: '0 14px 4px', background: '#0d0a0f', fontFamily: 'Pixelify', fontSize: 36, color: '#f4f1e6' }}>{key[2]}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

export const bannerState = () => {
  const state = courtState(HALL.impact + 0.05);
  const actors = state.actors.map((a, i) => (i === 0 ? { ...a, pose: { ...a.pose, flinch: 0.5 } } : a));
  return { ...state, actors, t: 2.2, king: { ...state.king, whip: 0.68 }, whip: { ...state.whip, phase: 0.68 } };
};
