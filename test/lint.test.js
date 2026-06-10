import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintDataset } from '../src/lint.js';

const valid =
  JSON.stringify({ messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }] }) +
  '\n' +
  JSON.stringify({ messages: [{ role: 'user', content: 'bye' }, { role: 'assistant', content: 'later' }] }) +
  '\n';

test('clean dataset reports ok with no errors', () => {
  const r = lintDataset(valid);
  assert.equal(r.ok, true);
  assert.equal(r.errorCount, 0);
  assert.equal(r.parsed, 2);
  assert.ok(r.stats.total > 0);
  assert.ok(r.cost.usd >= 0);
});

test('parse errors make the dataset not ok', () => {
  const r = lintDataset('{"messages":[]}\nNOT JSON\n');
  assert.equal(r.ok, false);
  assert.equal(r.parseErrors.length, 1);
});

test('aggregates per-example errors and warnings', () => {
  const text = JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }) + '\n'; // no assistant
  const r = lintDataset(text);
  assert.ok(r.errorCount >= 1);
  assert.equal(r.ok, false);
  const ex = r.examples[0];
  assert.ok(ex.issues.some((i) => i.code === 'NO_ASSISTANT'));
});

test('detects duplicates across the dataset', () => {
  const dup = valid + JSON.stringify({ messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }] }) + '\n';
  const r = lintDataset(dup);
  assert.equal(r.duplicates.length, 1);
  assert.deepEqual(r.duplicates[0].lines, [1, 3]);
});

test('passes maxTokens through to stats', () => {
  const r = lintDataset(valid, { maxTokens: 1 });
  assert.equal(r.stats.outliers.length, 2);
});

test('counts invalid examples (those with at least one error)', () => {
  const text =
    JSON.stringify({ messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'ok' }] }) + '\n' +
    JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }) + '\n';
  const r = lintDataset(text);
  assert.equal(r.invalidExamples, 1);
});
