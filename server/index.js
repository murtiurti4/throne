import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Court, CourtError } from './court.js';
import { handleMcp } from './mcp.js';
import { DEMO_PETITIONS } from './demo.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const publicDir = join(root, 'public');
const port = Number(process.env.PORT ?? 4747);
const token = process.env.THRONE_TOKEN;
const court = new Court({ file: process.env.THRONE_DATA ?? join(root, 'data', 'court.json') });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml' };

court.subscribe((p) => {
  if (p.status !== 'rephrasing' || !p.demo_terse) return;
  setTimeout(() => {
    if (court.petitions.get(p.id)?.status === 'rephrasing') court.rephrase(p.id, { speech: p.demo_terse });
  }, 3500);
});

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
};

const readJson = async (req) => {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 200_000) throw new CourtError(413, 'the scroll is too long');
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new CourtError(400, 'the body must be JSON');
  }
};

const waitMs = (url) => Math.max(0, Math.min(55, Number(url.searchParams.get('wait') ?? 0) || 0)) * 1000;

async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1);
  const [resource, id, action] = parts;
  const method = req.method;

  if (resource === 'events' && method === 'GET') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    const push = () => res.write('data: ' + JSON.stringify(court.snapshot()) + '\n\n');
    push();
    const unsubscribe = court.subscribe(push);
    const beat = setInterval(() => res.write(': the court endures\n\n'), 20000);
    req.on('close', () => {
      clearInterval(beat);
      unsubscribe();
    });
    return;
  }
  if (resource === 'state' && method === 'GET') return send(res, 200, court.snapshot());
  if (resource === 'demo' && method === 'POST') return send(res, 201, DEMO_PETITIONS.map((p) => court.petition(p).id));

  if (resource !== 'petitions') throw new CourtError(404, 'no such chamber in this castle');
  if (!id) {
    if (method !== 'POST') throw new CourtError(405, 'POST a petition here');
    const p = court.petition(await readJson(req));
    return send(res, 201, await court.waitFor(p.id, waitMs(url)));
  }
  if (!action) {
    if (method === 'GET') return send(res, 200, await court.waitFor(id, waitMs(url)));
    if (method === 'DELETE') return send(res, 200, court.outcome(court.withdraw(id)));
    throw new CourtError(405, 'GET or DELETE a petition');
  }
  if (method !== 'POST') throw new CourtError(405, 'POST to act on a petition');
  const body = await readJson(req);
  if (action === 'rephrase') return send(res, 200, await court.waitFor(court.rephrase(id, body).id, waitMs(url)));
  if (action === 'verdict') return send(res, 200, court.rule(id, body));
  if (action === 'whip') return send(res, 200, court.whip(id));
  if (action === 'delegate') return send(res, 200, court.delegate(id));
  if (action === 'dungeon') return send(res, 200, court.dungeon(id, body));
  if (action === 'back') return send(res, 200, court.sendBack(id));
  throw new CourtError(404, 'the court knows no such deed: ' + action);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://throne');
  try {
    const guarded = url.pathname.startsWith('/api/') || url.pathname === '/mcp';
    if (guarded && token && req.headers.authorization !== 'Bearer ' + token && url.searchParams.get('token') !== token) {
      throw new CourtError(401, 'the guards do not know you: send the THRONE_TOKEN as a Bearer token');
    }
    if (url.pathname === '/mcp') {
      if (req.method !== 'POST') throw new CourtError(405, 'POST JSON-RPC here');
      const reply = await handleMcp(court, await readJson(req));
      if (!reply) return res.writeHead(202).end();
      return send(res, 200, reply);
    }
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);

    const file = normalize(join(publicDir, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname)));
    if (!file.startsWith(publicDir) || !existsSync(file) || !statSync(file).isFile()) throw new CourtError(404, 'nothing here but cobwebs');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    createReadStream(file).pipe(res);
  } catch (error) {
    if (!(error instanceof CourtError)) console.error(error);
    if (res.headersSent) return res.end();
    send(res, error instanceof CourtError ? error.status : 500, { error: error instanceof CourtError ? error.message : 'the castle is on fire' });
  }
});

server.listen(port, () => console.log('The throne room is open on http://localhost:' + port));
