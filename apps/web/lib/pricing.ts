// Claude API pricing and markup calculation

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': {
    input: 3.0 / 1_000_000,     // $3 per 1M input tokens
    output: 15.0 / 1_000_000,   // $15 per 1M output tokens
  },
  'claude-opus-4-20250514': {
    input: 15.0 / 1_000_000,    // $15 per 1M input tokens
    output: 75.0 / 1_000_000,   // $75 per 1M output tokens
  },
  'claude-haiku-4-20250514': {
    input: 0.25 / 1_000_000,    // $0.25 per 1M input tokens
    output: 1.25 / 1_000_000,   // $1.25 per 1M output tokens
  },
};

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const MARKUP_MULTIPLIER = 10;

export function calculateCost(inputTokens: number, outputTokens: number, model?: string) {
  const rates = MODEL_PRICING[model ?? DEFAULT_MODEL] ?? MODEL_PRICING[DEFAULT_MODEL];
  const inputCost = inputTokens * rates.input;
  const outputCost = outputTokens * rates.output;
  const apiCost = inputCost + outputCost;
  const userCharge = apiCost * MARKUP_MULTIPLIER;

  return {
    apiCost: Number(apiCost.toFixed(6)),
    userCharge: Number(userCharge.toFixed(6)),
    breakdown: {
      inputTokens,
      outputTokens,
      inputCost: Number(inputCost.toFixed(6)),
      outputCost: Number(outputCost.toFixed(6)),
    },
    currency: 'USDC' as const,
  };
}

export function formatUsdcAmount(amount: number): string {
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}
