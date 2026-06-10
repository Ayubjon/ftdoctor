import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateExample, ALLOWED_ROLES } from '../src/validate.js';

function codes(issues) {
  return issues.map((i) => i.code);
}

const good = {
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is 2+2?' },
    { role: 'assistant', content: '4' },
  ],
};

test('a well-formed example has no issues', () => {
  assert.deepEqual(validateExample(good), []);
});

test('missing messages array is an error', () => {
  const issues = validateExample({});
  assert.ok(codes(issues).includes('NO_MESSAGES'));
  assert.ok(issues.every((i) => i.severity === 'error'));
});

test('empty messages array is an error', () => {
  const issues = validateExample({ messages: [] });
  assert.ok(codes(issues).includes('EMPTY_MESSAGES'));
});

test('unknown role is an error', () => {
  const issues = validateExample({
    messages: [{ role: 'wizard', content: 'hi' }, { role: 'assistant', content: 'yo' }],
  });
  assert.ok(codes(issues).includes('BAD_ROLE'));
  assert.ok(ALLOWED_ROLES.includes('assistant'));
});

test('missing content field is an error', () => {
  const issues = validateExample({
    messages: [{ role: 'user' }, { role: 'assistant', content: 'ok' }],
  });
  assert.ok(codes(issues).includes('MISSING_CONTENT'));
});

test('empty assistant content is an error', () => {
  const issues = validateExample({
    messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: '   ' }],
  });
  assert.ok(codes(issues).includes('EMPTY_ASSISTANT'));
});

test('empty non-assistant content is a warning', () => {
  const issues = validateExample({
    messages: [{ role: 'user', content: '' }, { role: 'assistant', content: 'hi' }],
  });
  const empty = issues.find((i) => i.code === 'EMPTY_CONTENT');
  assert.ok(empty);
  assert.equal(empty.severity, 'warning');
});

test('no assistant message is an error', () => {
  const issues = validateExample({
    messages: [{ role: 'user', content: 'hi' }],
  });
  assert.ok(codes(issues).includes('NO_ASSISTANT'));
});

test('system message not first is an error', () => {
  const issues = validateExample({
    messages: [
      { role: 'user', content: 'hi' },
      { role: 'system', content: 'be nice' },
      { role: 'assistant', content: 'ok' },
    ],
  });
  assert.ok(codes(issues).includes('SYSTEM_NOT_FIRST'));
});

test('consecutive same-role messages produce a warning', () => {
  const issues = validateExample({
    messages: [
      { role: 'user', content: 'hi' },
      { role: 'user', content: 'still me' },
      { role: 'assistant', content: 'ok' },
    ],
  });
  const w = issues.find((i) => i.code === 'CONSECUTIVE_ROLE');
  assert.ok(w);
  assert.equal(w.severity, 'warning');
});

test('issues carry the offending message index when applicable', () => {
  const issues = validateExample({
    messages: [{ role: 'user', content: 'hi' }, { role: 'bad', content: 'x' }],
  });
  const bad = issues.find((i) => i.code === 'BAD_ROLE');
  assert.equal(bad.messageIndex, 1);
});

test('array (content-parts) content is accepted', () => {
  const issues = validateExample({
    messages: [
      { role: 'user', content: [{ type: 'text', text: 'hello' }] },
      { role: 'assistant', content: 'hi' },
    ],
  });
  assert.deepEqual(issues, []);
});
