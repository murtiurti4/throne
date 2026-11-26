#!/usr/bin/env node
import { parseArgs } from 'node:util';

const USAGE = [
  'Usage:',
  '  throne ask --agent <name> [--role knight] [--realm repo] [--title text] [--plain text]',
  '             [--context text] [--link url] --option "Label" --option "Label::detail" "<speech>"',
  '  throne rephrase <petition_id> [--option ...] "<plainer speech>"',
  '  throne withdraw <petition_id>',
  '',
  'Waits for the verdict and prints it as JSON. THRONE_URL (default http://localhost:4747) and',
  'THRONE_TOKEN select the court. Exit code: 0 answered or delegated, 2 dungeon, 3 whipped.',
].join('\n');

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    agent: { type: 'string' },
    role: { type: 'string' },
    realm: { type: 'string' },
    title: { type: 'string' },
    plain: { type: 'string' },
    context: { type: 'string' },
    link: { type: 'string' },
    option: { type: 'string', multiple: true },
    help: { type: 'boolean', short: 'h' },
  },
});
const [command, ...rest] = positionals;
const base = (process.env.THRONE_URL ?? 'http://localhost:4747').replace(/\/$/, '');
const headers = { 'content-type': 'application/json', ...(process.env.THRONE_TOKEN ? { authorization: 'Bearer ' + process.env.THRONE_TOKEN } : {}) };

async function call(method, path, body) {
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? res.statusText);
  return json;
}

const options = values.option?.map((raw) => {
  const [label, detail] = raw.split('::');
  return { label, detail };
});

if (values.help || !['ask', 'rephrase', 'withdraw'].includes(command)) {
  console.log(USAGE);
  process.exit(values.help ? 0 : 1);
}

try {
  let outcome;
  if (command === 'ask') {
    outcome = await call('POST', '/api/petitions?wait=50', { agent: values.agent, role: values.role, realm: values.realm, title: values.title, plain: values.plain, context: values.context, link: values.link, options, speech: rest.join(' ') });
  } else if (command === 'rephrase') {
    outcome = await call('POST', '/api/petitions/' + rest[0] + '/rephrase?wait=50', { speech: rest.slice(1).join(' '), options });
  } else {
    outcome = await call('DELETE', '/api/petitions/' + rest[0]);
  }
  while (outcome.status === 'pending') outcome = await call('GET', '/api/petitions/' + outcome.petition_id + '?wait=50');
  console.log(JSON.stringify(outcome, null, 2));
  process.exit({ dungeon: 2, whipped: 3 }[outcome.status] ?? 0);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
