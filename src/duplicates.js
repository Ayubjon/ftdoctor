// Exact-duplicate detection. Two examples are considered duplicates when their
// canonical (key-sorted) JSON representations are identical, so duplicates are
// found regardless of key ordering or whitespace in the source file.

import { createHash } from 'node:crypto';

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = canonicalize(value[key]);
    }
    return out;
  }
  return value;
}

/** Stable content fingerprint for an example, independent of key order. */
export function exampleFingerprint(example) {
  const canonical = JSON.stringify(canonicalize(example));
  return createHash('sha1').update(canonical).digest('hex');
}

/**
 * Find groups of duplicate records.
 * @param {Array<{line:number, value:object}>} records
 * @returns {Array<{fingerprint:string, lines:number[], count:number}>}
 */
export function findDuplicates(records) {
  const map = new Map();
  for (const rec of records) {
    const fp = exampleFingerprint(rec.value);
    if (!map.has(fp)) map.set(fp, []);
    map.get(fp).push(rec.line);
  }

  const groups = [];
  for (const [fingerprint, lines] of map) {
    if (lines.length > 1) {
      groups.push({ fingerprint, lines, count: lines.length });
    }
  }
  return groups;
}
