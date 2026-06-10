import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, '..', 'bin', 'ftdoctor.js');
const SAMPLE = join(__dirname, '..', 'examples', 'sample.jsonl');

function run(args, opts = {}) {
  try {
    const stdout = execFileSync('node', [BIN, ...args], { encoding: 'utf8', ...opts });
    return { code: 0, stdout };
  } catch (err) {
    return { code: err.status, stdout: err.stdout || '', stderr: err.stderr || '' };
  }
}

test('--help prints usage and exits 0', () => {
  const r = run(['--help']);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /Usage:/);
});

test('linting the messy sample exits 1 and reports errors', () => {
  const r = run([SAMPLE, '--no-color']);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /FAIL/);
  assert.match(r.stdout, /NO_ASSISTANT/);
  assert.match(r.stdout, /duplicate/i);
});

test('--json emits parseable JSON', () => {
  const r = run([SAMPLE, '--json']);
  const parsed = JSON.parse(r.stdout);
  assert.equal(typeof parsed.errorCount, 'number');
  assert.ok(parsed.parseErrors.length >= 1);
});

test('--fix on stdout yields a clean dataset that lints OK', () => {
  const fixed = run([SAMPLE, '--fix']);
  // re-lint the cleaned output via stdin
  const relint = run(['-', '--json'], { input: fixed.stdout });
  const parsed = JSON.parse(relint.stdout);
  assert.equal(parsed.errorCount, 0);
  assert.equal(parsed.duplicates.length, 0);
});
