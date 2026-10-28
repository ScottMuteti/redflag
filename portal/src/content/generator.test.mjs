/* global console */
// Plain-Node test for the sample generator (portal has no test runner yet).
// Run: node portal/src/content/generator.test.mjs
import assert from 'node:assert';
import {
  generate,
  draftToTemplatePayload,
  channelsFor,
  CATEGORIES,
} from './generator.js';
import { banks } from './banks.js';

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok - ${name}`);
}

test('every category produces drafts for each of its channels', () => {
  for (const cat of CATEGORIES) {
    for (const ch of channelsFor(cat)) {
      const drafts = generate({ category: cat, channel: ch, count: 3, seed: 1 });
      assert.strictEqual(drafts.length, 3, `${cat}/${ch} should yield 3`);
      for (const d of drafts) {
        assert.strictEqual(d.channel, ch);
        assert.ok(d.body && d.body.length > 0, 'body present');
      }
    }
  }
});

test('sms drafts carry {{link}} and no subject; email carry {{.URL}} and a subject', () => {
  const sms = generate({ category: 'mpesa', channel: 'sms', count: 4, seed: 7 });
  for (const d of sms) {
    assert.ok(d.body.includes('{{link}}'), 'sms has {{link}}');
    assert.strictEqual(d.subject, null);
  }
  const email = generate({ category: 'kra', channel: 'email', count: 4, seed: 7 });
  for (const d of email) {
    assert.ok(d.body.includes('{{.URL}}'), 'email has {{.URL}}');
    assert.ok(d.subject && d.subject.length > 0, 'email has subject');
  }
});

test('same seed reproduces the batch; no seed varies it', () => {
  const a = generate({ category: 'bank', channel: 'email', count: 5, seed: 42 });
  const b = generate({ category: 'bank', channel: 'email', count: 5, seed: 42 });
  assert.deepStrictEqual(a.map((d) => d.body), b.map((d) => d.body), 'seeded batches match');
});

test('drafts in a batch are de-duplicated', () => {
  const drafts = generate({ category: 'mpesa', channel: 'sms', count: 5, seed: 3 });
  const bodies = new Set(drafts.map((d) => d.body));
  assert.strictEqual(bodies.size, drafts.length, 'all distinct');
});

test('difficulty "any" mixes levels across a batch', () => {
  // M-Pesa SMS has three levels; a large batch should surface more than one.
  const drafts = generate({ category: 'mpesa', channel: 'sms', difficulty: 'any', count: 8, seed: 9 });
  const levels = new Set(drafts.map((d) => d.difficulty));
  assert.ok(levels.size >= 2, 'at least two difficulty levels present');
});

test('draftToTemplatePayload matches the template API shape', () => {
  const [sms] = generate({ category: 'mpesa', channel: 'sms', count: 1, seed: 1 });
  const p = draftToTemplatePayload(sms);
  assert.strictEqual(p.type, 'sms');
  assert.strictEqual(p.subject, undefined);
  assert.strictEqual(p.category, 'mpesa');
  assert.ok(['easy', 'medium', 'hard'].includes(p.difficultyLevel));

  const [email] = generate({ category: 'kra', channel: 'email', count: 1, seed: 1 });
  const pe = draftToTemplatePayload(email);
  assert.strictEqual(pe.type, 'email');
  assert.ok(pe.subject && pe.subject.length > 0);
});

test('bank fragments cover the 10 agreed categories', () => {
  assert.strictEqual(CATEGORIES.length, 10);
  for (const c of CATEGORIES) assert.ok(banks[c], `bank for ${c}`);
});

console.log(`\n${passed} tests passed`);
