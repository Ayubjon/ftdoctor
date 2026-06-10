#!/usr/bin/env node
// ftdoctor CLI — diagnose and (optionally) auto-fix chat-format JSONL
// fine-tuning datasets.
//
// Usage:
//   ftdoctor <dataset.jsonl> [options]
//   ftdoctor <dataset.jsonl> --fix [-o cleaned.jsonl]
//   cat data.jsonl | ftdoctor -
//
// Options:
//   --fix                 write a cleaned dataset (drops invalid/duplicate lines)
//   -o, --out <file>      output path for --fix (default: <input>.clean.jsonl)
//   --drop-warnings       with --fix, also drop examples that only have warnings
//   --max-tokens <n>      per-example token ceiling for outlier flagging (default 16384)
//   --model <name>        model for cost estimate (e.g. gpt-4o-mini)
//   --epochs <n>          training epochs for cost estimate (default 1)
//   --price <usd>         override price per 1M training tokens
//   --json                print the full report as JSON instead of text
//   --no-color            disable ANSI colors
//   -h, --help            show this help
//
// Exit codes: 0 = clean, 1 = errors found, 2 = usage error.

import { readFileSync, writeFileSync } from 'node:fs';
import { lintDataset } from '../src/lint.js';
import { fixDataset } from '../src/fix.js';
import { formatReport } from '../src/report.js';

const HELP = `ftdoctor — diagnose & fix chat-format JSONL fine-tuning datasets

Usage:
  ftdoctor <dataset.jsonl> [options]
  ftdoctor <dataset.jsonl> --fix [-o cleaned.jsonl]
  cat data.jsonl | ftdoctor -

Options:
  --fix                 write a cleaned dataset (drops invalid/duplicate lines)
  -o, --out <file>      output path for --fix (default: <input>.clean.jsonl)
  --drop-warnings       with --fix, also drop examples that only have warnings
  --max-tokens <n>      per-example token ceiling for outliers (default 16384)
  --model <name>        model for cost estimate (e.g. gpt-4o-mini)
  --epochs <n>          training epochs for cost estimate (default 1)
  --price <usd>         override price per 1M training tokens
  --json                print the full report as JSON
  --no-color            disable ANSI colors
  -h, --help            show this help
`;

function parseArgs(argv) {
  const opts = { color: true, json: false, fix: false, dropWarnings: false, epochs: 1 };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-h':
      case '--help':
        opts.help = true;
        break;
      case '--fix':
        opts.fix = true;
        break;
      case '--drop-warnings':
        opts.dropWarnings = true;
        break;
      case '--json':
        opts.json = true;
        break;
      case '--no-color':
        opts.color = false;
        break;
      case '-o':
      case '--out':
        opts.out = argv[++i];
        break;
      case '--max-tokens':
        opts.maxTokens = Number(argv[++i]);
        break;
      case '--model':
        opts.model = argv[++i];
        break;
      case '--epochs':
        opts.epochs = Number(argv[++i]);
        break;
      case '--price':
        opts.pricePerMTok = Number(argv[++i]);
        break;
      default:
        positional.push(a);
    }
  }
  opts.input = positional[0];
  return opts;
}

function readInput(input) {
  if (!input || input === '-') {
    return readFileSync(0, 'utf8'); // stdin
  }
  return readFileSync(input, 'utf8');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    process.stdout.write(HELP);
    process.exit(0);
  }

  if (!opts.input && process.stdin.isTTY) {
    process.stderr.write('error: no input file given\n\n' + HELP);
    process.exit(2);
  }

  let text;
  try {
    text = readInput(opts.input);
  } catch (err) {
    process.stderr.write(`error: cannot read input: ${err.message}\n`);
    process.exit(2);
  }

  const lintOptions = {
    maxTokens: opts.maxTokens,
    model: opts.model,
    epochs: opts.epochs,
    pricePerMTok: opts.pricePerMTok,
  };
  const report = lintDataset(text, lintOptions);

  if (opts.fix) {
    const result = fixDataset(text, { dropWarnings: opts.dropWarnings });
    const outPath = opts.out || (opts.input && opts.input !== '-' ? `${opts.input}.clean.jsonl` : null);
    if (outPath) {
      writeFileSync(outPath, result.cleaned);
      process.stderr.write(
        `ftdoctor: kept ${result.kept} example(s), removed ${result.removed.length} → ${outPath}\n`
      );
    } else {
      process.stdout.write(result.cleaned);
      process.stderr.write(
        `ftdoctor: kept ${result.kept} example(s), removed ${result.removed.length}\n`
      );
    }
    process.exit(0);
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write(formatReport(report, { color: opts.color }) + '\n');
  }

  process.exit(report.ok ? 0 : 1);
}

main();
