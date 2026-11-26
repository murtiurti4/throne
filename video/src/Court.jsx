import React from 'react';
import { AbsoluteFill } from 'remotion';
import { makeSpec } from '../../public/js/sprites.js';
import { Bubble, Hall, KING } from './Hall.jsx';
import { HALL } from './timeline.js';

const OFFSET = 56;
const FLOOR = 456;
const SORCERY = /idempoten|synerg|leverag|paradigm|orchestrat|microservice|middleware|refactor|kubernetes|holistic|declarative|reconcil|semantic|scalab|architect|projection|consisten|deprecat|endpoint|proxy|event-driven|gitops|\b[A-Z]{3,}\b/g;

const ACTORS = [
  { agent: 'Auth Migration', role: 'knight', track: [[0, -40], [2.5, 516], [13.4, 516], [15.6, -70]], kneel: 2.5, leave: 13.4 },
  { agent: 'Experiment 7', role: 'jester', track: [[0, -110], [2.6, 448], [13.4, 448], [13.9, 516], [17.2, 516], [18.7, -90]], kneel: 13.9, leave: 17.2 },
  { agent: 'Billing Ledger', role: 'treasurer', track: [[0, -180], [2.7, 390], [13.4, 390], [13.9, 448], [17.2, 448], [17.7, 516], [20.8, 516], [23.2, -70]], kneel: 17.7, leave: 20.8 },
  { agent: 'Flaky Test Hunt', role: 'spy', track: [[0, -250], [2.8, 332], [13.4, 332], [13.9, 390], [17.2, 390], [17.7, 448], [20.8, 448], [21.3, 516]], kneel: 21.3, leave: 99 },
  { agent: 'Release Notes', role: 'herald', track: [[0, -320], [2.9, 274], [13.4, 274], [13.9, 332], [17.2, 332], [17.7, 390], [20.8, 390], [21.3, 448]], kneel: 99, leave: 99 },
].map((a) => ({ ...a, spec: makeSpec(a.agent, a.role) }));

const BUBBLES = [
  { who: 0, text: 'Your Grace!', from: 2.6, to: 3.5 },
  { who: 'king', text: '...', from: 6.6, to: 8.2 },
  { who: 'king', text: 'Speak plainly!', from: 8.35, to: 9.9 },
  { who: 0, text: 'Ow! Forgive me, Your Grace!', from: HALL.impact, to: 10.7 },
  { who: 'king', text: 'Delete it now.', from: HALL.verdict, to: 14.1 },
  { who: 0, text: 'At once, Your Grace!', from: 13.0, to: 14.7 },
  { who: 'king', text: 'To the dungeon with this idea!', from: HALL.dungeon, to: 18.2 },
  { who: 1, text: 'Not the dungeon again!', from: 17.0, to: 18.6 },
  { who: 'king', text: 'Decide it yourself. I trust you.', from: HALL.yourCall, to: 21.7 },
  { who: 2, text: 'You honour me, Your Grace!', from: 20.4, to: 22.3 },
];

const PANELS = [
  {
    from: 3.6,
    to: 10.2,
    who: 0,
    cps: 62,
    speech: 'Your Grace, upon refactoring the authentication middleware I discovered that the idempotency of the token refresh endpoint cannot be guaranteed while the legacy session-cookie flow coexists behind the same reverse-proxy route, and I humbly seek your leave on the deprecation strategy.',
    deed: ['Whip', 8.45],
  },
  { from: 10.2, to: 13.7, who: 0, cps: 40, lashes: 1, speech: 'Your Grace, two logins. May I delete the old one?', options: ['Delete it now', 'Keep both for 30 days', 'Keep both forever'], optionsAt: 11.7, chosen: [0, HALL.verdict] },
  { from: 14.2, to: 17.5, who: 1, cps: 46, speech: 'Your Grace! I rewrote the Save button as five microservices. May I ship it?', options: ['Ship it, fool', 'Keep the old button', 'Show me a demo first'], optionsAt: 15.8, deed: ['Dungeon', HALL.dungeon] },
  { from: 18.0, to: 21.1, who: 2, cps: 58, speech: 'Your Grace, shall I spend $40 a month so tests take 6 minutes instead of 19?', options: ['Spend the gold', 'Not a single coin', 'Try it for one month'], optionsAt: 19.4, deed: ['Your call', HALL.yourCall] },
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
  const panel = PANELS.find((p) => t >= p.from && t < p.to);
  const typing = panel && (t - panel.from) * panel.cps < panel.speech.length;
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
        talking: typing && panel.who === i,
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
    panel,
    shake: t >= HALL.impact && t < HALL.impact + 0.2 ? [Math.sin(t * 190) * 10, Math.cos(t * 160) * 8] : [0, 0],
  };
}

const kbd = { display: 'inline-block', minWidth: 34, padding: '0 8px 2px', background: '#0d0a0f', border: '3px solid #4a4052', color: '#e3bd4a', fontFamily: 'VT323', fontSize: 28, textAlign: 'center' };

const Panel = ({ t, panel }) => {
  const base = { position: 'absolute', left: 0, right: 0, bottom: 0, height: 250, background: 'linear-gradient(#1b1620, #120f16)', borderTop: '6px solid #000', fontFamily: 'VT323', color: '#efe6cc', padding: '14px 70px' };
  if (!panel) {
    const next = ACTORS.find((a) => t < a.kneel);
    return (
      <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50 }}>
        {t < 2.5 ? '5 subjects await your judgment, Your Grace.' : next ? next.spec.title + ' ' + next.agent + ' approaches the throne…' : ''}
      </div>
    );
  }
  const actor = ACTORS[panel.who];
  const shown = panel.speech.slice(0, Math.floor((t - panel.from) * panel.cps));
  const words = shown.trim() ? shown.trim().split(/\s+/).length : 0;
  const spells = (shown.match(SORCERY) ?? []).length;
  const score = Math.min(5, Math.floor(words / 16) + Math.ceil(spells / 2));
  const verdict = ['Plainly spoken', 'Plainly spoken', 'A little wordy', 'Long-winded', 'A windbag', 'Insufferable'][score];
  const pressed = panel.deed && t >= panel.deed[1] ? panel.deed[0] : null;
  const itching = score >= 4 && !pressed && Math.floor(t * 4) % 2 === 0;
  return (
    <div style={base}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 22 }}>
          <span style={{ fontFamily: 'Pixelify', fontWeight: 600, fontSize: 40, color: '#e3bd4a' }}>{actor.spec.title + ' ' + actor.agent}</span>
          <span style={{ fontSize: 32, color: '#a89c8a' }}>{actor.spec.station}</span>
          <span style={{ fontSize: 34, color: '#b23a34', letterSpacing: 4 }}>{'/'.repeat(panel.lashes ?? 0)}</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[['W', 'Whip'], ['Y', 'Your call'], ['B', 'Later'], ['X', 'Dungeon']].map(([key, name]) => {
            const on = pressed === name;
            const red = name === 'Whip';
            return (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 16px 6px 6px', border: '3px solid ' + (on ? '#fff3c4' : red ? (itching ? '#ff6a60' : '#7a2a26') : '#4a4052'), background: on ? '#e3bd4a' : red && itching ? '#3a1616' : 'transparent', color: on ? '#20160a' : red ? '#e0605a' : '#a89c8a', fontFamily: 'Pixelify', fontSize: 26, transform: on ? 'scale(1.12)' : 'none' }}>
                <span style={kbd}>{key}</span>
                {name}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 40, marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 38, lineHeight: 1.05, minHeight: 80 }}>{shown}</div>
          <div style={{ fontSize: 28, color: '#a89c8a', marginTop: 4 }}>
            <span style={{ color: '#e3bd4a', letterSpacing: 2 }}>{'▮'.repeat(score) + '▯'.repeat(5 - score)}</span>
            {' ' + verdict + ' · ' + words + ' words'}
            {spells > 0 && <span style={{ color: '#e0605a' }}>{' · ' + spells + ' words of sorcery'}</span>}
          </div>
        </div>
        {panel.options && t >= panel.optionsAt && (
          <div style={{ width: 520, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {panel.options.map((label, i) => {
              const on = panel.chosen && panel.chosen[0] === i && t >= panel.chosen[1];
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '3px 14px 5px', background: on ? '#e3bd4a' : '#2a2330', border: '3px solid ' + (on ? '#fff3c4' : '#4a4052'), color: on ? '#20160a' : '#efe6cc', fontSize: 32, lineHeight: 1 }}>
                  <span style={kbd}>{i + 1}</span>
                  {label}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const Court = ({ t }) => {
  const state = courtState(t);
  return (
    <AbsoluteFill style={{ background: '#0d0a0f', transform: 'translate(' + state.shake[0] + 'px,' + state.shake[1] + 'px)' }}>
      <Hall state={state} width={1920} height={1080} offsetY={OFFSET} />
      {state.bubbles.map((b) => {
        const a = b.who === 'king' ? null : state.actors[b.who];
        return (
          <Bubble key={b.text} royal={!a} x={(a ? a.x : KING.x - 14) * 2} y={((a ? a.y - 132 : KING.y - 144) - OFFSET) * 2}>
            {b.text}
          </Bubble>
        );
      })}
      <Panel t={t} panel={state.panel} />
    </AbsoluteFill>
  );
};

export const bannerState = () => {
  const state = courtState(HALL.impact + 0.05);
  const actors = state.actors.map((a, i) => (i === 0 ? { ...a, pose: { ...a.pose, flinch: 0.5 } } : a));
  return { ...state, actors, t: 2.2, king: { ...state.king, whip: 0.68 }, whip: { ...state.whip, phase: 0.68 } };
};
