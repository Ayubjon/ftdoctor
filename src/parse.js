// Parse a JSONL (JSON Lines) string into records, tolerating blank lines,
// CRLF endings, and a missing trailing newline. Each successfully parsed line
// must be a JSON object; anything else is collected as a structured error so
// the caller can keep processing the rest of the file.

/**
 * @param {string} text raw file contents
 * @returns {{ records: Array<{line:number, value:object}>, errors: Array<{line:number, message:string, raw:string}> }}
 */
export function parseJsonl(text) {
  const records = [];
  const errors = [];
  if (typeof text !== 'string' || text.length === 0) {
    return { records, errors };
  }

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = i + 1;
    if (raw.trim() === '') continue; // ignore blank / whitespace-only lines

    let value;
    try {
      value = JSON.parse(raw);
    } catch (err) {
      errors.push({ line, message: `Invalid JSON: ${err.message}`, raw });
      continue;
    }

    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      errors.push({
        line,
        message: 'Each line must be a JSON object',
        raw,
      });
      continue;
    }

    records.push({ line, value });
  }

  return { records, errors };
}
