// Rough training-cost estimation. Prices are approximate published fine-tuning
// rates in USD per million training tokens and may change — always confirm with
// your provider. Pass `pricePerMTok` to override with a current/exact rate.

export const PRICES = {
  'gpt-4o-mini': 3.0,
  'gpt-4o': 25.0,
  'gpt-4.1-mini': 5.0,
  'gpt-4.1': 25.0,
  'gpt-3.5-turbo': 8.0,
};

const DEFAULT_PRICE = 5.0; // conservative fallback for unknown models

/**
 * @param {number} totalTokens estimated tokens across the whole dataset
 * @param {{model?:string, epochs?:number, pricePerMTok?:number}} [options]
 * @returns {{usd:number, billedTokens:number, pricePerMTok:number, known:boolean, model:string|null}}
 */
export function estimateTrainingCost(totalTokens, options = {}) {
  const epochs = options.epochs ?? 1;
  const billedTokens = Math.round(totalTokens * epochs);

  let pricePerMTok;
  let known;
  let model = options.model ?? null;

  if (typeof options.pricePerMTok === 'number') {
    pricePerMTok = options.pricePerMTok;
    known = true;
  } else if (model && model in PRICES) {
    pricePerMTok = PRICES[model];
    known = true;
  } else {
    pricePerMTok = DEFAULT_PRICE;
    known = false;
  }

  const usd = (billedTokens / 1_000_000) * pricePerMTok;
  return { usd, billedTokens, pricePerMTok, known, model };
}
