import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateTrainingCost, PRICES } from '../src/pricing.js';

test('PRICES table exposes known models in USD per million tokens', () => {
  assert.ok(typeof PRICES['gpt-4o-mini'] === 'number');
  assert.ok(PRICES['gpt-4o-mini'] > 0);
});

test('cost scales linearly with tokens and epochs', () => {
  const one = estimateTrainingCost(1_000_000, { model: 'gpt-4o-mini', epochs: 1 });
  const three = estimateTrainingCost(1_000_000, { model: 'gpt-4o-mini', epochs: 3 });
  assert.ok(Math.abs(three.usd - one.usd * 3) < 1e-6);
});

test('uses an explicit pricePerMTok override when provided', () => {
  const r = estimateTrainingCost(2_000_000, { pricePerMTok: 10, epochs: 1 });
  assert.equal(r.usd, 20);
});

test('unknown model falls back gracefully and flags it', () => {
  const r = estimateTrainingCost(1_000_000, { model: 'made-up-model' });
  assert.equal(r.known, false);
  assert.ok(r.usd >= 0);
});

test('result reports billed tokens (tokens * epochs)', () => {
  const r = estimateTrainingCost(500_000, { model: 'gpt-4o-mini', epochs: 4 });
  assert.equal(r.billedTokens, 2_000_000);
});
