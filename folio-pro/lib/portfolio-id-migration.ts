export const PORTFOLIO_ID_SCHEMA_VERSION = 2;

export type CanonicalPortfolioId = "robinhood" | "fidelity-401k" | "fidelity-roth";

export function swapLegacyFidelityId<T extends string | null | undefined>(value: T): T {
  if (value === "fidelity-401k") return "fidelity-roth" as T;
  if (value === "fidelity-roth") return "fidelity-401k" as T;
  return value;
}

export function swapLegacyFidelityBuckets<T>(value: Record<string, T> | undefined): Record<string, T> | undefined {
  if (!value || typeof value !== "object") return value;
  return {
    ...value,
    "fidelity-401k": value["fidelity-roth"],
    "fidelity-roth": value["fidelity-401k"],
  };
}

/**
 * Converts persisted portfolio state from the historical reversed mapping
 * (fidelity-401k = Roth, fidelity-roth = 401(k)) to the canonical mapping.
 * The migration is idempotent because it writes portfolioIdSchemaVersion=2.
 */
export function migrateLegacyPortfolioState<T extends Record<string, any>>(state: T): T {
  if (!state || typeof state !== "object" || state.portfolioIdSchemaVersion === PORTFOLIO_ID_SCHEMA_VERSION) return state;

  const migrated: Record<string, any> = {
    ...state,
    holdingsByPortfolio: swapLegacyFidelityBuckets(state.holdingsByPortfolio),
    transactionsByPortfolio: swapLegacyFidelityBuckets(state.transactionsByPortfolio),
    cashByPortfolio: swapLegacyFidelityBuckets(state.cashByPortfolio),
    portfolioIdSchemaVersion: PORTFOLIO_ID_SCHEMA_VERSION,
  };

  if (typeof state.activePortfolioId === "string") {
    migrated.activePortfolioId = swapLegacyFidelityId(state.activePortfolioId);
  }
  return migrated as T;
}

export function migrateLegacyBucketJson(serialized: string | null): string | null {
  if (!serialized) return serialized;
  try {
    const parsed = JSON.parse(serialized);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return serialized;
    return JSON.stringify(swapLegacyFidelityBuckets(parsed));
  } catch {
    return serialized;
  }
}
