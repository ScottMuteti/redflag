// Internal sample generator. Pure functions, no network, no external AI.
// Assembles complete lure drafts by picking one fragment per slot from banks.js.
// Runs client-side in the portal (instant, offline); because it is pure it can
// also be imported server-side later for per-recipient variant selection.

import { banks, greetings, CATEGORIES, DIFFICULTIES } from './banks.js';

// Deterministic PRNG (mulberry32) so a given seed reproduces a batch — useful
// for tests and for "regenerate the same set". Omit the seed for a fresh batch.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function channelsFor(category) {
  return Object.keys(banks[category] || {}).filter((k) => k === 'sms' || k === 'email');
}

export function difficultiesFor(category, channel) {
  return DIFFICULTIES.filter((d) => banks[category]?.[channel]?.[d]);
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function titleCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Builds one draft for a concrete (category, channel, difficulty).
function buildOne(rng, category, channel, difficulty) {
  const b = banks[category][channel][difficulty];
  const label = banks[category].label;
  const name = `${label} · ${channel.toUpperCase()} · ${difficulty}`;

  if (channel === 'sms') {
    const body = `${pick(rng, b.sender)}: ${pick(rng, b.hook)} ${pick(rng, b.urgency)} ${pick(rng, b.cta)}: {{link}}`;
    return { category, channel, type: 'sms', difficulty, name, subject: null, body };
  }

  const subject = pick(rng, b.subject);
  const body =
    `<p>${pick(rng, greetings[difficulty])}</p>` +
    `<p>${pick(rng, b.hook)} ${pick(rng, b.urgency)}</p>` +
    `<p><a href="{{.URL}}">${pick(rng, b.cta)}</a></p>` +
    `<p>${pick(rng, b.signoff)}</p>`;
  return { category, channel, type: 'email', difficulty, name, subject, body };
}

/**
 * Generate a renewable pool of editable drafts.
 * @param category one of CATEGORIES
 * @param channel  'sms' | 'email' | 'any'  (any = mix channels the category has)
 * @param difficulty 'easy' | 'medium' | 'hard' | 'any' (any = mix levels)
 * @param count    how many drafts to return (default 5)
 * @param seed     optional integer for a reproducible batch
 * @returns array of { id, category, channel, type, difficulty, name, subject, body }
 */
export function generate({ category, channel = 'any', difficulty = 'any', count = 5, seed } = {}) {
  if (!banks[category]) throw new Error(`Unknown category: ${category}`);
  const rng = mulberry32(seed ?? (Date.now() ^ Math.floor(Math.random() * 1e9)));

  const channelOptions = channel === 'any' ? channelsFor(category) : [channel];
  if (channelOptions.some((c) => !banks[category][c])) {
    throw new Error(`Category ${category} has no ${channel} templates`);
  }

  const drafts = [];
  const seen = new Set();
  // Cap attempts so an exhausted combination space cannot loop forever.
  for (let attempt = 0; drafts.length < count && attempt < count * 40; attempt += 1) {
    const ch = channelOptions.length === 1 ? channelOptions[0] : pick(rng, channelOptions);
    const levels = difficulty === 'any' ? difficultiesFor(category, ch) : [difficulty];
    const lv = levels.length === 1 ? levels[0] : pick(rng, levels);
    if (!banks[category][ch]?.[lv]) continue;
    const draft = buildOne(rng, category, ch, lv);
    const key = `${draft.channel}|${draft.subject || ''}|${draft.body}`;
    if (seen.has(key)) continue;
    seen.add(key);
    drafts.push({ id: `${category}-${drafts.length}-${attempt}`, ...draft });
  }
  return drafts;
}

// Turns a draft into the payload the template-create API expects.
export function draftToTemplatePayload(draft, nameOverride) {
  return {
    type: draft.type,
    name: nameOverride || `${banks[draft.category].label} ${titleCase(draft.difficulty)}`,
    subject: draft.type === 'email' ? draft.subject : undefined,
    body: draft.body,
    category: draft.category,
    difficultyLevel: draft.difficulty,
  };
}

export { CATEGORIES, DIFFICULTIES };
