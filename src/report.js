// Render a lint report as human-readable terminal text. Colors are applied with
// raw ANSI codes (no dependency) and can be disabled with { color: false }.

const C = {
  reset: '[0m',
  bold: '[1m',
  dim: '[2m',
  red: '[31m',
  green: '[32m',
  yellow: '[33m',
  cyan: '[36m',
};

function paint(enabled, code, text) {
  return enabled ? code + text + C.reset : text;
}

function fmtUsd(n) {
  return '$' + n.toFixed(n < 1 ? 4 : 2);
}

/**
 * @param {object} report output of lintDataset()
 * @param {{color?:boolean}} [options]
 */
export function formatReport(report, options = {}) {
  const color = options.color !== false;
  const lines = [];
  const c = (code, text) => paint(color, code, text);

  lines.push(c(C.bold, 'ftdoctor — fine-tuning dataset report'));
  lines.push('');

  // Parse errors
  if (report.parseErrors.length > 0) {
    lines.push(c(C.red, `✖ ${report.parseErrors.length} line(s) could not be parsed:`));
    for (const e of report.parseErrors) {
      lines.push(`  ${c(C.dim, `line ${e.line}`)}  ${e.message}`);
    }
    lines.push('');
  }

  // Per-example issues
  const flagged = report.examples.filter((ex) => ex.issues.length > 0);
  if (flagged.length > 0) {
    lines.push(c(C.bold, 'Issues by example:'));
    for (const ex of flagged) {
      for (const issue of ex.issues) {
        const tag =
          issue.severity === 'error'
            ? c(C.red, 'error')
            : c(C.yellow, 'warn ');
        const where = c(C.dim, `line ${ex.line}`);
        lines.push(`  ${tag} ${where}  ${c(C.cyan, issue.code)}  ${issue.message}`);
      }
    }
    lines.push('');
  }

  // Duplicates
  if (report.duplicates.length > 0) {
    const dupLines = report.duplicates.reduce((a, g) => a + (g.count - 1), 0);
    lines.push(c(C.yellow, `⚠ ${report.duplicates.length} duplicate group(s), ${dupLines} redundant example(s):`));
    for (const g of report.duplicates.slice(0, 10)) {
      lines.push(`  ${c(C.dim, 'lines')} ${g.lines.join(', ')}`);
    }
    if (report.duplicates.length > 10) lines.push(c(C.dim, `  …and ${report.duplicates.length - 10} more`));
    lines.push('');
  }

  // Token stats
  const s = report.stats;
  lines.push(c(C.bold, 'Token statistics (estimated):'));
  lines.push(`  examples: ${report.parsed}`);
  lines.push(`  total: ${s.total}   min: ${s.min}   median: ${s.median}   mean: ${s.mean}   p95: ${s.p95}   max: ${s.max}`);
  if (s.outliers.length > 0) {
    lines.push(c(C.yellow, `  ⚠ ${s.outliers.length} example(s) exceed maxTokens=${s.maxTokens}: lines ${s.outliers.map((o) => o.line).slice(0, 10).join(', ')}`));
  }
  lines.push('');

  // Cost
  const cost = report.cost;
  const modelLabel = cost.model ? cost.model : 'default rate';
  const known = cost.known ? '' : c(C.dim, ' (rate is an estimate — model not in price table)');
  lines.push(c(C.bold, 'Estimated training cost:'));
  lines.push(`  ${fmtUsd(cost.usd)} for ${cost.billedTokens} billed tokens @ ${fmtUsd(cost.pricePerMTok)}/1M (${modelLabel})${known}`);
  lines.push('');

  // Summary
  if (report.ok) {
    const warn = report.warningCount > 0 ? c(C.yellow, ` (${report.warningCount} warning(s))`) : '';
    lines.push(c(C.green, `✔ PASS — ${report.parsed} examples, 0 errors${warn}`));
  } else {
    lines.push(
      c(C.red, `✖ FAIL — ${report.errorCount} error(s) across ${report.invalidExamples} example(s), ${report.parseErrors.length} parse error(s), ${report.warningCount} warning(s)`)
    );
  }

  return lines.join('\n');
}
