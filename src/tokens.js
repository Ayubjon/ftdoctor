// Lightweight, dependency-free token estimator.
//
// This is NOT a real BPE tokenizer — it is a heuristic that approximates the
// token counts produced by GPT/Claude tokenizers closely enough for budgeting
// and outlier detection. It splits text into word-runs and individual symbols,
// then charges long words multiple tokens (mirroring how BPE breaks rare/long
// words into sub-word pieces). Empirically within ~10-20% of tiktoken on English.

const TOKEN_RE = /[A-Za-z0-9]+|[^\sA-Za-z0-9]/g;

// Per-message framing overhead, mirroring OpenAI's chat token accounting
// (~3 tokens of role/delimiter scaffolding per message).
export const MESSAGE_OVERHEAD = 3;
// Tokens added once per example for the assistant reply primer.
export const REPLY_PRIMER = 3;

/** Estimate the number of tokens in a raw string. */
export function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  const matches = text.match(TOKEN_RE);
  if (!matches) return 0;
  let total = 0;
  for (const m of matches) {
    if (m.length === 1) {
      total += 1;
    } else {
      // Word-run: ~4 characters per token, minimum one token.
      total += Math.max(1, Math.round(m.length / 4));
    }
  }
  return total;
}

/** Coerce a message's content (string or content-parts array) to text. */
export function contentToText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part.text === 'string') return part.text;
        return '';
      })
      .join(' ');
  }
  return '';
}

/** Estimate tokens for a single chat message including framing overhead. */
export function estimateMessageTokens(message) {
  if (!message || typeof message !== 'object') return MESSAGE_OVERHEAD;
  const text = contentToText(message.content);
  return estimateTokens(text) + MESSAGE_OVERHEAD;
}

/** Estimate total tokens for one training example (an object with `messages`). */
export function estimateExampleTokens(example) {
  const messages = example && Array.isArray(example.messages) ? example.messages : [];
  let total = REPLY_PRIMER;
  for (const m of messages) total += estimateMessageTokens(m);
  return total;
}
