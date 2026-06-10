import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixDataset } from '../src/fix.js';
import { parseJsonl } from '../src/parse.js';

const good1 = JSON.stringify({ messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }] });
const good2 = JSON.stringify({ messages: [{ role: 'user', content: 'bye' }, { role: 'assistant', content: 'later' }] });
const bad = JSON.stringify({ messages: [{ role: 'user', content: 'no reply' }] }); // NO_ASSISTANT

test('keeps valid examples and drops invalid ones', () => {
  const text = [good1, bad, good2].join('\n') + '\n';
  const res = fixDataset(text);
  const { records } = parseJsonl(res.cleaned);
  assert.equal(records.length, 2);
  assert.equal(res.kept, 2);
  assert.equal(res.removed.length, 1);
  assert.equal(res.removed[0].reason, 'invalid');
});

test('drops parse-error lines', () => {
  const text = [good1, 'not json', good2].join('\n') + '\n';
  const res = fixDataset(text);
  assert.equal(res.kept, 2);
  assert.ok(res.removed.some((r) => r.reason === 'parse-error'));
});

test('removes duplicate copies but keeps the first occurrence', () => {
  const text = [good1, good2, good1].join('\n') + '\n';
  const res = fixDataset(text);
  assert.equal(res.kept, 2);
  assert.ok(res.removed.some((r) => r.reason === 'duplicate'));
  const { records } = parseJsonl(res.cleaned);
  assert.equal(records.length, 2);
});

test('cleaned output is valid JSONL ending in a newline', () => {
  const text = [good1, good2].join('\n') + '\n';
  const res = fixDataset(text);
  assert.ok(res.cleaned.endsWith('\n'));
  const { errors } = parseJsonl(res.cleaned);
  assert.equal(errors.length, 0);
});

test('keepWarnings=false also drops examples that only have warnings when requested', () => {
  const warnOnly = JSON.stringify({ messages: [
    { role: 'user', content: 'a' },
    { role: 'user', content: 'b' },
    { role: 'assistant', content: 'ok' },
  ] });
  const text = [good1, warnOnly].join('\n') + '\n';
  const strict = fixDataset(text, { dropWarnings: true });
  assert.equal(strict.kept, 1);
  const lenient = fixDataset(text);
  assert.equal(lenient.kept, 2);
});
