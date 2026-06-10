// Orchestrator: run the full diagnostic pipeline over a JSONL dataset string
// and return a single structured report that the CLI (or any consumer) can
// render or act on.

import { parseJsonl } from './parse.js';
import { validateExample } from './validate.js';
import { findDuplicates } from './duplicates.js';
import { computeTokenStats } from './stats.js';
import { estimateTrainingCost } from './pricing.js';
import { estimateExampleTokens } from './tokens.js';

/**
 * @param {string} text raw JSONL contents
 * @param {{maxTokens?:number, model?:string, epochs?:number, pricePerMTok?:number}} [options]
 */
export function lintDataset(text, options = {}) {
  const { records, errors: parseErrors } = parseJsonl(text);

  let errorCount = 0;
  let warningCount = 0;
  let invalidExamples = 0;

  const examples = records.map((rec) => {
    const issues = validateExample(rec.value);
    const errs = issues.filter((i) => i.severity === 'error').length;
    const warns = issues.filter((i) => i.severity === 'warning').length;
    errorCount += errs;
    warningCount += warns;
    if (errs > 0) invalidExamples += 1;
    return { line: rec.line, issues, tokens: estimateExampleTokens(rec.value) };
  });

  const duplicates = findDuplicates(records);
  const stats = computeTokenStats(records, { maxTokens: options.maxTokens });
  const cost = estimateTrainingCost(stats.total, {
    model: options.model,
    epochs: options.epochs ?? 1,
    pricePerMTok: options.pricePerMTok,
  });

  const ok = parseErrors.length === 0 && errorCount === 0;

  return {
    ok,
    parsed: records.length,
    parseErrors,
    examples,
    errorCount,
    warningCount,
    invalidExamples,
    duplicates,
    stats,
    cost,
  };
}
