import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintDataset } from '../src/lint.js';
import { formatReport } from '../src/report.js';

const valid =
  JSON.stringify({ messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }] }) + '\n';

test('formats a passing report mentioning the example count', () => {
  const out = formatReport(lintDataset(valid), { color: false });
  assert.match(out, /example/i);
  assert.match(out, /token/i);
});

test('renders errors with line numbers', () => {
  const text = JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }) + '\n';
  const out = formatReport(lintDataset(text), { color: false });
  assert.match(out, /line 1/i);
  assert.match(out, /NO_ASSISTANT/);
});

test('reports duplicates when present', () => {
  const dup = valid + valid;
  const out = formatReport(lintDataset(dup), { color: false });
  assert.match(out, /duplicate/i);
});

test('includes an estimated cost line', () => {
  const out = formatReport(lintDataset(valid, { model: 'gpt-4o-mini' }), { color: false });
  assert.match(out, /\$/);
});

test('color=false output contains no ANSI escape codes', () => {
  const out = formatReport(lintDataset(valid), { color: false });
  const ESC = String.fromCharCode(27);
  assert.ok(!out.includes(ESC), 'should contain no ANSI escape character');
});
