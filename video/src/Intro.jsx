import React from 'react';
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { PINGS, T } from './timeline.js';

const AGENTS = [
  ['agent-auth', '#e0605a'],
  ['agent-billing', '#5f9a5a'],
  ['agent-docs', '#5a8fd9'],
  ['agent-deploy', '#d9a23a'],
  ['agent-infra', '#9a6ad9'],
  ['agent-tests', '#3ab5a8'],
  ['agent-7', '#d95a9a'],
];
const LINES = [
  'Quick question before I proceed…',
  "I've identified 3 possible approaches. Which do you prefer?",
  'Could you clarify what you meant by "make it better"?',
  'Still waiting on your approval from 2 hours ago.',
  'Should I use idempotent upserts or an event-sourced CQRS projection?',
  'Following up on my question above.',
  'I rewrote the Save button. Thoughts?',
  'Blocked. Need a human decision.',
  'Sorry, one more thing:',
  'Is now a good time?',
  'Bumping this.',
  'Do you want option A, B, C, or a hybrid of B and C?',
];

export const Chaos = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const panic = interpolate(t, [3.2, T.kneel], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: '#11131a', fontFamily: 'Inter, Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: 'translate(' + Math.sin(t * 70) * 9 * panic + 'px,' + Math.cos(t * 55) * 7 * panic + 'px)' }}>
        {PINGS.map((at, i) => {
          if (t < at) return null;
          const [name, color] = AGENTS[i % AGENTS.length];
          const pop = spring({ frame: frame - at * fps, fps, config: { damping: 12, stiffness: 220 } });
          const x = i === 0 ? 560 : 60 + random('x' + i) * 1040;
          const y = i === 0 ? 420 : 250 + random('y' + i) * 640;
          return (
            <div key={i} style={{ position: 'absolute', left: x, top: y, width: 780, padding: '22px 26px', background: '#1f2430', border: '1px solid #343b4d', borderRadius: 18, boxShadow: '0 18px 50px rgba(0,0,0,0.55)', transform: 'scale(' + pop + ') rotate(' + (i === 0 ? 0 : (random('r' + i) - 0.5) * 9) + 'deg)', display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: color, flex: 'none' }} />
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 30 }}>
                  {name} <span style={{ color: '#6f7890', fontWeight: 400, fontSize: 24 }}>now</span>
                </div>
                <div style={{ color: '#c5cbdb', fontSize: 30, marginTop: 4 }}>{LINES[i % LINES.length]}</div>
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
      <div style={{ position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 84, fontWeight: 800, letterSpacing: -2, textShadow: '0 6px 40px #11131a, 0 0 12px #11131a' }}>
        {t < 3.3 ? 'my AI agents had a few questions' : 'all of them. at the same time.'}
      </div>
    </AbsoluteFill>
  );
};
