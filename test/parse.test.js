import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonl } from '../src/parse.js';

test('parses one record per non-empty line', () => {
  const text = '{"a":1}\n{"b":2}\n';
  const { records, errors } = parseJsonl(text);
  assert.equal(records.length, 2);
  assert.equal(errors.length, 0);
  assert.deepEqual(records[0].value, { a: 1 });
  assert.equal(records[0].line, 1);
  assert.equal(records[1].line, 2);
});

test('skips blank and whitespace-only lines without error', () => {
  const text = '{"a":1}\n\n   \n{"b":2}\n';
  const { records, errors } = parseJsonl(text);
  assert.equal(records.length, 2);
  assert.equal(errors.length, 0);
  // line numbers reflect original file positions
  assert.equal(records[1].line, 4);
});

test('reports invalid JSON with line number and keeps going', () => {
  const text = '{"a":1}\nnot json\n{"b":2}\n';
  const { records, errors } = parseJsonl(text);
  assert.equal(records.length, 2);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].line, 2);
  assert.match(errors[0].message, /JSON/i);
});

test('flags top-level non-objects as errors', () => {
  const text = '{"a":1}\n[1,2,3]\n42\n';
  const { records, errors } = parseJsonl(text);
  assert.equal(records.length, 1);
  assert.equal(errors.length, 2);
});

test('handles CRLF line endings', () => {
  const text = '{"a":1}\r\n{"b":2}\r\n';
  const { records } = parseJsonl(text);
  assert.equal(records.length, 2);
});

test('handles missing trailing newline', () => {
  const text = '{"a":1}\n{"b":2}';
  const { records } = parseJsonl(text);
  assert.equal(records.length, 2);
});
