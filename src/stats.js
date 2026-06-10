// Token-distribution statistics across a dataset, plus outlier detection.
// Outliers are examples whose estimated token count exceeds `maxTokens`
// (a hard ceiling, e.g. the target model's context window for training).

import { estimateExampleTokens } from './tokens.js';

// Default training context ceiling; examples longer than this are truncated or
// rejected by most providers, so they are worth flagging.
export const DEFAULT_MAX_TOKENS = 16384;

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

/**
 * @param {Array<{line:number, value:object}>} records
 * @param {{maxTokens?:number}} [options]
 */
export function computeTokenStats(records, options = {}) {
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

  const perExample = records.map((rec) => ({
    line: rec.line,
    tokens: estimateExampleTokens(rec.value),
  }));

  if (perExample.length === 0) {
    return { count: 0, total: 0, min: 0, max: 0, mean: 0, median: 0, p95: 0, perExample: [], outliers: [], maxTokens };
  }

  const counts = perExample.map((e) => e.tokens);
  const sorted = [...counts].sort((a, b) => a - b);
  const total = counts.reduce((a, b) => a + b, 0);

  const outliers = perExample.filter((e) => e.tokens > maxTokens);

  return {
    count: perExample.length,
    total,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(total / perExample.length),
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    perExample,
    outliers,
    maxTokens,
  };
}
