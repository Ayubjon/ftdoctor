import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTokenStats } from '../src/stats.js';

function mk(line, content) {
  return { line, value: { messages: [
    { role: 'user', content: 'q' },
    { role: 'assistant', content },
  ] } };
}

test('returns zeroed stats for empty input', () => {
  const s = computeTokenStats([]);
  assert.equal(s.count, 0);
  assert.equal(s.total, 0);
  assert.deepEqual(s.outliers, []);
});

test('computes count, total, min, max, mean, median', () => {
  const records = [mk(1, 'a'), mk(2, 'a a a a a a a a a a'), mk(3, 'a a a')];
  const s = computeTokenStats(records);
  assert.equal(s.count, 3);
  assert.ok(s.total > 0);
  assert.ok(s.max >= s.median);
  assert.ok(s.median >= s.min);
  assert.equal(s.perExample.length, 3);
  assert.equal(s.perExample[0].line, 1);
});

test('flags examples above maxTokens as outliers', () => {
  const records = [mk(1, 'short'), mk(2, 'word '.repeat(200))];
  const s = computeTokenStats(records, { maxTokens: 50 });
  assert.equal(s.outliers.length, 1);
  assert.equal(s.outliers[0].line, 2);
  assert.ok(s.outliers[0].tokens > 50);
});

test('no outliers when all under the threshold', () => {
  const records = [mk(1, 'a'), mk(2, 'b')];
  const s = computeTokenStats(records, { maxTokens: 10000 });
  assert.deepEqual(s.outliers, []);
});
