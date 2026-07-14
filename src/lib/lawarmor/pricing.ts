/**
 * Law & Armor pricing. The analysis fee is deliberately small — just enough to
 * cover compute plus a small platform fee. The real revenue comes from attorney
 * advertising (Envoy), which is why we can keep the consumer price this low.
 */
export const ANALYSIS_FEE = 9; // USD per document analyzed
export const FIRST_ANALYSIS_FREE = true; // first document free, so people can try it

export const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
