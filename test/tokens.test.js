import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateTokens, estimateMessageTokens, estimateExampleTokens } from '../src/tokens.js';

test('estimateTokens returns 0 for empty input', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens(null), 0);
  assert.equal(estimateTokens(undefined), 0);
});

test('estimateTokens counts words and punctuation separately', () => {
  // "Hello, world!" -> Hello , world ! => ~4 tokens
  const n = estimateTokens('Hello, world!');
  assert.ok(n >= 3 && n <= 5, `expected 3-5, got ${n}`);
});

test('estimateTokens scales with length', () => {
  const short = estimateTokens('one two three');
  const long = estimateTokens('one two three four five six seven eight');
  assert.ok(long > short);
});

test('estimateTokens splits long words into sub-token chunks', () => {
  // A 20-char word should cost more than 1 token (BPE splits long words).
  const n = estimateTokens('supercalifragilisticexpialidocious');
  assert.ok(n >= 4, `expected >=4 for a long word, got ${n}`);
});

test('estimateMessageTokens adds per-message overhead', () => {
  const msg = { role: 'user', content: 'hi' };
  const n = estimateMessageTokens(msg);
  // content ~1-2 tokens + overhead (>=3 for role/formatting framing)
  assert.ok(n >= 4, `expected overhead applied, got ${n}`);
});

test('estimateExampleTokens sums messages plus reply primer', () => {
  const example = {
    messages: [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hello there friend' },
      { role: 'assistant', content: 'Hi! How can I help?' },
    ],
  };
  const total = estimateExampleTokens(example);
  const sum =
    estimateMessageTokens(example.messages[0]) +
    estimateMessageTokens(example.messages[1]) +
    estimateMessageTokens(example.messages[2]);
  assert.ok(total >= sum, 'total should be at least the sum of messages');
});
