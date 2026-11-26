import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const ROLES = ['knight', 'scribe', 'treasurer', 'spy', 'mason', 'jester', 'herald', 'alchemist', 'peasant', 'monk'];
export const ACTIVE = new Set(['waiting', 'rephrasing']);

export const CROWNS = ['crown', 'circlet', 'turban', 'none'];
export const DEFAULT_KING = { name: '', title: 'King', address: 'Your Grace', skin: '#e0aa86', hair: '#5a3a22', robe: '#3b4f86', cape: '#8f2a2a', metal: '#e3bd4a', crown: 'crown', beard: true, longHair: false };

const whipCommand = (king, lashes) =>
  [
    'The ' + king.title + ' has whipped you for speaking in riddles. Ask again in plain words: one or two short sentences, no jargon, no acronyms, and options a tired monarch can choose between at a glance.',
    'A second lash. Twenty words at most, the ' + king.title + ' has decreed. Say what you need decided and nothing else.',
    'The whip cracks a third time. Ten words. One question. Options of three words or fewer.',
  ][Math.min(lashes, 3) - 1];

export class CourtError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const text = (value, name, max, required = false) => {
  if (value === undefined || value === null || value === '') {
    if (required) throw new CourtError(400, name + ' is required');
    return undefined;
  }
  if (typeof value !== 'string') throw new CourtError(400, name + ' must be a string');
  const trimmed = value.trim();
  if (!trimmed && required) throw new CourtError(400, name + ' is required');
  if (trimmed.length > max) throw new CourtError(400, name + ' must be at most ' + max + ' characters');
  return trimmed || undefined;
};

const parseOptions = (value) => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new CourtError(400, 'options must be an array');
  if (value.length > 6) throw new CourtError(400, 'options holds at most 6 entries; a king chooses between few things');
  return value.map((option, i) => {
    const raw = typeof option === 'string' ? { label: option } : option;
    if (!raw || typeof raw !== 'object') throw new CourtError(400, 'options[' + i + '] must be a string or { label, detail }');
    return { label: text(raw.label, 'options[' + i + '].label', 200, true), detail: text(raw.detail, 'options[' + i + '].detail', 600) };
  });
};

export class Court {
  constructor({ file } = {}) {
    this.file = file;
    this.petitions = new Map();
    this.listeners = new Set();
    this.waiters = new Map();
    this.seq = 0;
    this.king = { ...DEFAULT_KING };
    if (file && existsSync(file)) {
      const saved = JSON.parse(readFileSync(file, 'utf8'));
      this.seq = saved.seq ?? 0;
      this.king = { ...DEFAULT_KING, ...saved.king };
      for (const p of saved.petitions ?? []) this.petitions.set(p.id, p);
    }
  }

  petition(input) {
    if (!input || typeof input !== 'object') throw new CourtError(400, 'a petition must be a JSON object');
    const role = text(input.role, 'role', 40);
    const p = {
      id: randomUUID().slice(0, 8),
      agent: text(input.agent, 'agent', 80, true),
      role: role && ROLES.includes(role.toLowerCase()) ? role.toLowerCase() : undefined,
      realm: text(input.realm, 'realm', 120),
      title: text(input.title, 'title', 140),
      speech: text(input.speech, 'speech', 4000, true),
      plain: text(input.plain, 'plain', 1000),
      context: text(input.context, 'context', 20000),
      link: text(input.link, 'link', 2000),
      options: parseOptions(input.options),
      status: 'waiting',
      lashes: 0,
      order: ++this.seq,
      created_at: new Date().toISOString(),
      demo_terse: text(input.demo_terse, 'demo_terse', 400),
    };
    if (p.link && !/^https?:\/\//i.test(p.link)) throw new CourtError(400, 'link must be an http(s) URL');
    this.petitions.set(p.id, p);
    this.changed(p);
    return p;
  }

  crown(input) {
    if (!input || typeof input !== 'object') throw new CourtError(400, 'the monarch must be a JSON object');
    const king = { ...this.king };
    if (input.name !== undefined) king.name = text(input.name, 'name', 40) ?? '';
    if (input.title !== undefined) king.title = text(input.title, 'title', 30, true);
    if (input.address !== undefined) king.address = text(input.address, 'address', 30, true);
    for (const key of ['skin', 'hair', 'robe', 'cape', 'metal']) {
      if (input[key] === undefined) continue;
      if (typeof input[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(input[key])) throw new CourtError(400, key + ' must be a colour like #3b4f86');
      king[key] = input[key].toLowerCase();
    }
    if (input.crown !== undefined) {
      if (!CROWNS.includes(input.crown)) throw new CourtError(400, 'crown must be one of ' + CROWNS.join(', '));
      king.crown = input.crown;
    }
    for (const key of ['beard', 'longHair']) {
      if (input[key] === undefined) continue;
      if (typeof input[key] !== 'boolean') throw new CourtError(400, key + ' must be true or false');
      king[key] = input[key];
    }
    this.king = king;
    this.changed();
    return king;
  }

  get(id) {
    const p = this.petitions.get(id);
    if (!p) throw new CourtError(404, 'no petition ' + id + ' stands before this court');
    return p;
  }

  active(id) {
    const p = this.get(id);
    if (!ACTIVE.has(p.status)) throw new CourtError(409, 'petition ' + id + ' was already settled: ' + p.status);
    return p;
  }

  waitingOne(id) {
    const p = this.active(id);
    if (p.status !== 'waiting') throw new CourtError(409, 'petition ' + id + ' is being reworded after a whipping');
    return p;
  }

  rule(id, { option, message } = {}) {
    const p = this.waitingOne(id);
    const note = text(message, 'message', 4000);
    let choice = null;
    if (option !== undefined && option !== null) {
      if (!Number.isInteger(option) || !p.options[option]) throw new CourtError(400, 'option must be the index of one of the petition options');
      choice = { index: option, label: p.options[option].label };
    }
    if (!choice && !note) throw new CourtError(400, 'a verdict needs an option, a message, or both');
    return this.settle(p, 'answered', { choice, message: note ?? null });
  }

  delegate(id) {
    return this.settle(this.waitingOne(id), 'delegated', { choice: null, message: null });
  }

  dungeon(id, { message } = {}) {
    return this.settle(this.waitingOne(id), 'dungeon', { choice: null, message: text(message, 'message', 4000) ?? null });
  }

  withdraw(id) {
    return this.settle(this.active(id), 'withdrawn', null);
  }

  settle(p, status, verdict) {
    p.status = status;
    p.verdict = verdict;
    p.settled_at = new Date().toISOString();
    this.changed(p);
    return p;
  }

  whip(id) {
    const p = this.waitingOne(id);
    p.lashes += 1;
    if (p.plain && p.plain !== p.speech) {
      p.speech = p.plain;
      p.plain = undefined;
    } else {
      p.status = 'rephrasing';
    }
    this.changed(p);
    return p;
  }

  rephrase(id, input = {}) {
    const p = this.active(id);
    p.speech = text(input.speech, 'speech', 4000, true);
    if (input.options !== undefined) p.options = parseOptions(input.options);
    if (input.title !== undefined) p.title = text(input.title, 'title', 140);
    p.plain = undefined;
    p.status = 'waiting';
    p.order = Math.min(0, ...[...this.petitions.values()].filter((q) => q.status === 'waiting').map((q) => q.order)) - 1;
    this.changed(p);
    return p;
  }

  sendBack(id) {
    const p = this.waitingOne(id);
    p.order = ++this.seq;
    this.changed(p);
    return p;
  }

  outcome(p) {
    const base = { petition_id: p.id, status: p.status, lashes: p.lashes };
    if (p.status === 'waiting') return { ...base, status: 'pending', decree: 'The ' + this.king.title + ' has not yet heard you. Wait your turn and ask for the verdict again.' };
    if (p.status === 'rephrasing') {
      return { ...base, status: 'whipped', decree: whipCommand(this.king, p.lashes), next: 'Call rephrase with a plainer speech (and plainer options), then await the verdict again.' };
    }
    if (p.status === 'answered') {
      const parts = [];
      if (p.verdict.choice) parts.push('The ' + this.king.title + ' chose: "' + p.verdict.choice.label + '".');
      if (p.verdict.message) parts.push('The ' + this.king.title + ' said: "' + p.verdict.message + '"');
      return { ...base, choice: p.verdict.choice, message: p.verdict.message, decree: parts.join(' ') };
    }
    if (p.status === 'delegated') return { ...base, decree: 'The ' + this.king.title + ' trusts your judgment. Decide this yourself, choose the option you would recommend, and do not ask again.' };
    if (p.status === 'dungeon') {
      return { ...base, message: p.verdict.message, decree: 'To the dungeon with this idea. Abandon the thing you asked about and do not proceed with any of its options.' + (p.verdict.message ? ' The ' + this.king.title + ' said: "' + p.verdict.message + '"' : '') };
    }
    return { ...base, decree: 'The petition was withdrawn.' };
  }

  waitFor(id, ms) {
    const p = this.get(id);
    if (p.status !== 'waiting') return Promise.resolve(this.outcome(p));
    return new Promise((resolve) => {
      const waiters = this.waiters.get(id) ?? new Set();
      this.waiters.set(id, waiters);
      const done = () => {
        clearTimeout(timer);
        waiters.delete(done);
        resolve(this.outcome(this.get(id)));
      };
      const timer = setTimeout(done, ms);
      waiters.add(done);
    });
  }

  snapshot() {
    const all = [...this.petitions.values()];
    return {
      king: this.king,
      queue: all.filter((p) => ACTIVE.has(p.status)).sort((a, b) => a.order - b.order),
      ledger: all.filter((p) => !ACTIVE.has(p.status)).sort((a, b) => b.settled_at.localeCompare(a.settled_at)).slice(0, 60),
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  changed(p) {
    if (p && p.status !== 'waiting') for (const done of [...(this.waiters.get(p.id) ?? [])]) done();
    if (this.file) {
      const settled = [...this.petitions.values()].filter((q) => !ACTIVE.has(q.status)).sort((a, b) => b.settled_at.localeCompare(a.settled_at));
      for (const old of settled.slice(200)) this.petitions.delete(old.id);
      mkdirSync(dirname(this.file), { recursive: true });
      writeFileSync(this.file + '.tmp', JSON.stringify({ seq: this.seq, king: this.king, petitions: [...this.petitions.values()] }));
      renameSync(this.file + '.tmp', this.file);
    }
    for (const listener of this.listeners) listener(p);
  }
}
