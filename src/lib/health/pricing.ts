/**
 * Medical Billing Advocate pricing. Like the rest of the consumer-advocate
 * tools, the fee is deliberately small — just enough to cover compute plus a
 * small platform fee. The real revenue comes from attorney advertising (Herald),
 * which is why we can keep the consumer price this low. The itemized-bill audit
 * is free: the more people who catch billing errors, the better.
 */
export const ANALYSIS_FEE = 9; // USD per document analyzed
export const FIRST_ANALYSIS_FREE = true;
export const AUDIT_FREE = true; // the line-item bill auditor is always free

export const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
