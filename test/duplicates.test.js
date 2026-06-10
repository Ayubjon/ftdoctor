import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exampleFingerprint, findDuplicates } from '../src/duplicates.js';

const a = { messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }] };
const aCopy = { messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }] };
const b = { messages: [{ role: 'user', content: 'bye' }, { role: 'assistant', content: 'later' }] };

test('identical examples share a fingerprint', () => {
  assert.equal(exampleFingerprint(a), exampleFingerprint(aCopy));
});

test('different examples have different fingerprints', () => {
  assert.notEqual(exampleFingerprint(a), exampleFingerprint(b));
});

test('fingerprint ignores key ordering', () => {
  const x = { messages: [{ role: 'user', content: 'hi' }] };
  const y = { messages: [{ content: 'hi', role: 'user' }] };
  assert.equal(exampleFingerprint(x), exampleFingerprint(y));
});

test('findDuplicates groups repeated examples with line numbers', () => {
  const records = [
    { line: 1, value: a },
    { line: 2, value: b },
    { line: 3, value: aCopy },
  ];
  const groups = findDuplicates(records);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].lines, [1, 3]);
  assert.equal(groups[0].count, 2);
});

test('findDuplicates returns empty array when all unique', () => {
  const records = [
    { line: 1, value: a },
    { line: 2, value: b },
  ];
  assert.deepEqual(findDuplicates(records), []);
});
