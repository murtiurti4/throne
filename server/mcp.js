import { CourtError, ROLES } from './court.js';

const ETIQUETTE = 'You are a subject of the realm and the human is your King. Address him as "Your Grace", speak as a loyal medieval courtier would, and stay brief: he hears many petitioners. Bring exactly one decision per petition.';

const optionsSchema = {
  type: 'array',
  minItems: 2,
  maxItems: 4,
  description: 'Two to four answers the King can pick at a glance. Put the one you recommend first. He can always answer in his own words instead.',
  items: {
    type: 'object',
    properties: {
      label: { type: 'string', description: 'The answer in a few plain words.' },
      detail: { type: 'string', description: 'One short line on what choosing it means.' },
    },
    required: ['label'],
  },
};

export const TOOLS = [
  {
    name: 'petition_the_king',
    description: 'Come before the throne and ask the King (your human) for a decision, then wait for his verdict. Use it whenever you need human input. ' + ETIQUETTE + ' The result has a status: "answered" (obey the decree), "delegated" (decide it yourself), "dungeon" (abandon the idea), "whipped" (you spoke too complicatedly: call rephrase_petition with plainer words), or "pending" (he has not reached you yet: call await_verdict with the petition_id).',
    inputSchema: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Your name at court, such as "Auth Migration" or the name of your thread.' },
        role: { type: 'string', enum: ROLES, description: 'Your station, which decides how you look in the throne room. Pick what fits your work: knight (security, fixes), scribe (docs, writing), treasurer (billing, cost), spy (research, investigation), mason (infrastructure, builds), jester (experiments), herald (releases, announcements), alchemist (data, ML), peasant (chores), monk (review, QA).' },
        realm: { type: 'string', description: 'The project, repository, or thread this concerns.' },
        title: { type: 'string', description: 'The matter in a few words, such as "The login migration".' },
        speech: { type: 'string', description: 'Your petition, spoken in character to the King: what you need decided and why, in at most three sentences.' },
        plain: { type: 'string', description: 'The same question in one blunt plain sentence with no jargon. The King hears this if he whips you.' },
        context: { type: 'string', description: 'Optional supporting detail the King may unroll and read: findings, numbers, trade-offs.' },
        link: { type: 'string', description: 'Optional URL to the pull request, thread, or document in question.' },
        options: optionsSchema,
        wait_seconds: { type: 'integer', minimum: 0, maximum: 55, description: 'How long to kneel waiting for the verdict before returning "pending". Defaults to 45.' },
      },
      required: ['agent', 'speech', 'plain', 'options'],
    },
  },
  {
    name: 'await_verdict',
    description: 'Keep waiting for the verdict on a petition that came back "pending". Call it again until the status changes.',
    inputSchema: {
      type: 'object',
      properties: {
        petition_id: { type: 'string' },
        wait_seconds: { type: 'integer', minimum: 0, maximum: 55 },
      },
      required: ['petition_id'],
    },
  },
  {
    name: 'rephrase_petition',
    description: 'After a whipping, say your petition again in plainer words and wait for the verdict. Obey the word limit in the decree you were given. Stay respectful: he is still your King.',
    inputSchema: {
      type: 'object',
      properties: {
        petition_id: { type: 'string' },
        speech: { type: 'string', description: 'The plainer petition.' },
        options: optionsSchema,
        wait_seconds: { type: 'integer', minimum: 0, maximum: 55 },
      },
      required: ['petition_id', 'speech'],
    },
  },
  {
    name: 'withdraw_petition',
    description: 'Leave the throne room without a verdict because the question no longer needs an answer.',
    inputSchema: { type: 'object', properties: { petition_id: { type: 'string' } }, required: ['petition_id'] },
  },
];

const waitMs = (seconds) => Math.max(0, Math.min(55, Number.isFinite(seconds) ? seconds : 45)) * 1000;

async function callTool(court, name, args = {}) {
  if (name === 'petition_the_king') return court.waitFor(court.petition(args).id, waitMs(args.wait_seconds));
  if (name === 'await_verdict') return court.waitFor(args.petition_id, waitMs(args.wait_seconds));
  if (name === 'rephrase_petition') return court.waitFor(court.rephrase(args.petition_id, args).id, waitMs(args.wait_seconds));
  if (name === 'withdraw_petition') return court.outcome(court.withdraw(args.petition_id));
  throw new CourtError(404, 'unknown tool ' + name);
}

export async function handleMcp(court, message) {
  const { id, method, params } = message ?? {};
  const reply = (result) => ({ jsonrpc: '2.0', id, result });
  if (method === 'initialize') {
    return reply({
      protocolVersion: params?.protocolVersion ?? '2025-03-26',
      capabilities: { tools: {} },
      serverInfo: { name: 'throne', version: '0.1.0' },
      instructions: ETIQUETTE + ' Ask for human decisions only through petition_the_king.',
    });
  }
  if (id === undefined) return null;
  if (method === 'ping') return reply({});
  if (method === 'tools/list') return reply({ tools: TOOLS });
  if (method === 'tools/call') {
    try {
      const outcome = await callTool(court, params?.name, params?.arguments);
      return reply({ content: [{ type: 'text', text: JSON.stringify(outcome, null, 2) }], structuredContent: outcome });
    } catch (error) {
      if (!(error instanceof CourtError)) throw error;
      return reply({ content: [{ type: 'text', text: error.message }], isError: true });
    }
  }
  return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found: ' + method } };
}
