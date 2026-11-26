import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Court, CourtError } from '../server/court.js';
import { handleMcp } from '../server/mcp.js';

const ask = (court, extra = {}) => court.petition({ agent: 'Auth', speech: 'Your Grace, a long and winding question.', options: ['Yes', { label: 'No', detail: 'Leave it' }], ...extra });

test('a verdict reaches the waiting agent with the chosen option and message', async () => {
  const court = new Court();
  const p = ask(court);
  const waiting = court.waitFor(p.id, 5000);
  court.rule(p.id, { option: 1, message: 'And be quick.' });
  const outcome = await waiting;
  assert.equal(outcome.status, 'answered');
  assert.deepEqual(outcome.choice, { index: 1, label: 'No' });
  assert.equal(outcome.message, 'And be quick.');
  assert.match(outcome.decree, /The King chose: "No"/);
  assert.deepEqual(court.snapshot().queue, []);
});

test('waiting times out as pending and a verdict needs an option or a message', async () => {
  const court = new Court();
  const p = ask(court);
  assert.equal((await court.waitFor(p.id, 10)).status, 'pending');
  assert.throws(() => court.rule(p.id, {}), CourtError);
  assert.throws(() => court.rule(p.id, { option: 7 }), CourtError);
  assert.equal(court.rule(p.id, { message: 'Do neither.' }).verdict.choice, null);
  assert.throws(() => court.rule(p.id, { option: 0 }), /already settled/);
});

test('the first whip swaps in the plain speech and the second sends the agent to rephrase', async () => {
  const court = new Court();
  const p = ask(court, { plain: 'Yes or no?' });
  const waiting = court.waitFor(p.id, 5000);
  court.whip(p.id);
  assert.equal(p.speech, 'Yes or no?');
  assert.equal(p.status, 'waiting');
  court.whip(p.id);
  const outcome = await waiting;
  assert.equal(outcome.status, 'whipped');
  assert.equal(outcome.lashes, 2);
  assert.match(outcome.decree, /Twenty words/);
  assert.throws(() => court.rule(p.id, { option: 0 }), /being reworded/);
});

test('a rephrased petition returns to the front of the line', () => {
  const court = new Court();
  const first = ask(court);
  const second = ask(court, { agent: 'Billing' });
  court.whip(first.id);
  assert.deepEqual(court.snapshot().queue.map((p) => [p.agent, p.status]), [['Auth', 'rephrasing'], ['Billing', 'waiting']]);
  court.rephrase(first.id, { speech: 'Remove it?', options: ['Yes', 'No'] });
  assert.deepEqual(court.snapshot().queue.map((p) => p.agent), ['Auth', 'Billing']);
  assert.equal(first.speech, 'Remove it?');
  court.sendBack(first.id);
  assert.deepEqual(court.snapshot().queue.map((p) => p.agent), ['Billing', 'Auth']);
});

test('delegating and the dungeon tell the agent what to do', () => {
  const court = new Court();
  assert.match(court.outcome(court.delegate(ask(court).id)).decree, /Decide this yourself/);
  const doomed = court.outcome(court.dungeon(ask(court).id, { message: 'Never again.' }));
  assert.equal(doomed.status, 'dungeon');
  assert.match(doomed.decree, /Abandon.*Never again\./);
});

test('petitions are validated', () => {
  const court = new Court();
  assert.throws(() => court.petition({ speech: 'x' }), /agent is required/);
  assert.throws(() => court.petition({ agent: 'a' }), /speech is required/);
  assert.throws(() => court.petition({ agent: 'a', speech: 'x', options: [1] }), /options\[0\]/);
  assert.throws(() => court.petition({ agent: 'a', speech: 'x', link: 'javascript:alert(1)' }), /http/);
  assert.equal(court.petition({ agent: 'a', speech: 'x', role: 'wizard' }).role, undefined);
});

test('the MCP endpoint lists tools and carries a petition through to its verdict', async () => {
  const court = new Court();
  const init = await handleMcp(court, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } });
  assert.equal(init.result.protocolVersion, '2025-06-18');
  assert.equal(await handleMcp(court, { jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  const list = await handleMcp(court, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
  assert.deepEqual(list.result.tools.map((t) => t.name), ['petition_the_king', 'await_verdict', 'rephrase_petition', 'withdraw_petition']);

  const call = (name, args) => handleMcp(court, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name, arguments: args } });
  const pending = await call('petition_the_king', { agent: 'Auth', speech: 'Your Grace?', plain: 'Yes or no?', options: [{ label: 'Yes' }, { label: 'No' }], wait_seconds: 0 });
  const { petition_id, status } = pending.result.structuredContent;
  assert.equal(status, 'pending');
  const verdict = call('await_verdict', { petition_id, wait_seconds: 5 });
  court.rule(petition_id, { option: 0 });
  assert.equal((await verdict).result.structuredContent.choice.label, 'Yes');
  assert.equal((await call('await_verdict', { petition_id: 'nope' })).result.isError, true);
});
