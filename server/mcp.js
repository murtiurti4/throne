import { CourtError, ROLES } from './court.js';

const etiquette = (king) =>
  'You are a subject of the realm and the human is your ' + king.title + (king.name ? ', ' + king.name : '') + '. Address the ' + king.title + ' as "' + king.address + '", speak as a loyal medieval courtier would, and stay brief: many petitioners are waiting. Bring exactly one decision per petition.';

const tools = (king) => {
  const K = 'the ' + king.title;
  const options = {
    type: 'array',
    minItems: 2,
    maxItems: 4,
    description: 'Two to four answers ' + K + ' can pick at a glance. Put the one you recommend first. A free-form answer is always possible instead.',
    items: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'The answer in a few plain words.' },
        detail: { type: 'string', description: 'One short line on what choosing it means.' },
      },
      required: ['label'],
    },
  };
  return [
    {
      name: 'petition_the_king',
      description: 'Come before the throne and ask ' + K + ' (your human) for a decision, then wait for the verdict. Use it whenever you need human input. ' + etiquette(king) + ' The result has a status: "answered" (obey the decree), "delegated" (decide it yourself), "dungeon" (abandon the idea), "whipped" (you spoke too complicatedly: call rephrase_petition with plainer words), or "pending" (your turn has not come yet: call await_verdict with the petition_id).',
      inputSchema: {
        type: 'object',
        properties: {
          agent: { type: 'string', description: 'Your name at court, such as "Auth Migration" or the name of your thread.' },
          role: { type: 'string', enum: ROLES, description: 'Your station, which decides how you look in the throne room. Pick what fits your work: knight (security, fixes), scribe (docs, writing), treasurer (billing, cost), spy (research, investigation), mason (infrastructure, builds), jester (experiments), herald (releases, announcements), alchemist (data, ML), peasant (chores), monk (review, QA).' },
          realm: { type: 'string', description: 'The project, repository, or thread this concerns.' },
          title: { type: 'string', description: 'The matter in a few words, such as "The login migration".' },
          speech: { type: 'string', description: 'Your petition, spoken in character and opening with "' + king.address + '": what you need decided and why, in at most three sentences.' },
          plain: { type: 'string', description: 'The same question in one blunt plain sentence with no jargon. It replaces your speech if you are whipped.' },
          context: { type: 'string', description: 'Optional supporting detail that can be unrolled and read: findings, numbers, trade-offs.' },
          link: { type: 'string', description: 'Optional URL to the pull request, thread, or document in question.' },
          options,
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
      description: 'After a whipping, say your petition again in plainer words and wait for the verdict. Obey the word limit in the decree you were given, and stay respectful.',
      inputSchema: {
        type: 'object',
        properties: {
          petition_id: { type: 'string' },
          speech: { type: 'string', description: 'The plainer petition.' },
          options,
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
};

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
      serverInfo: { name: 'throne', version: '0.2.0' },
      instructions: etiquette(court.king) + ' Ask for human decisions only through petition_the_king.',
    });
  }
  if (id === undefined) return null;
  if (method === 'ping') return reply({});
  if (method === 'tools/list') return reply({ tools: tools(court.king) });
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
