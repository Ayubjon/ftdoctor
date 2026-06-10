// Auto-fix: produce a cleaned JSONL string by dropping lines that cannot be
// salvaged automatically — JSON parse errors, examples with structural errors,
// and duplicate copies (the first occurrence is kept). Optionally also drop
// examples that carry only warnings. Lines that survive are re-serialized one
// per line so the output is guaranteed valid JSONL.

import { parseJsonl } from './parse.js';
import { validateExample } from './validate.js';
import { exampleFingerprint } from './duplicates.js';

/**
 * @param {string} text raw JSONL
 * @param {{dropWarnings?:boolean}} [options]
 * @returns {{cleaned:string, kept:number, removed:Array<{line:number, reason:string}>}}
 */
export function fixDataset(text, options = {}) {
  const dropWarnings = options.dropWarnings === true;
  const { records, errors } = parseJsonl(text);

  const removed = errors.map((e) => ({ line: e.line, reason: 'parse-error' }));
  const seen = new Set();
  const kept = [];

  for (const rec of records) {
    const issues = validateExample(rec.value);
    const hasError = issues.some((i) => i.severity === 'error');
    const hasWarning = issues.some((i) => i.severity === 'warning');

    if (hasError) {
      removed.push({ line: rec.line, reason: 'invalid' });
      continue;
    }
    if (dropWarnings && hasWarning) {
      removed.push({ line: rec.line, reason: 'warning' });
      continue;
    }

    const fp = exampleFingerprint(rec.value);
    if (seen.has(fp)) {
      removed.push({ line: rec.line, reason: 'duplicate' });
      continue;
    }
    seen.add(fp);
    kept.push(rec.value);
  }

  removed.sort((a, b) => a.line - b.line);
  const cleaned = kept.map((v) => JSON.stringify(v)).join('\n') + (kept.length ? '\n' : '');

  return { cleaned, kept: kept.length, removed };
}
