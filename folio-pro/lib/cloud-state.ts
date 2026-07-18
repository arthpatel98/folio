import { createClient } from "@/lib/supabase/client";

export const CLOUD_KEYS = [
  "folio-pro-portfolio",
  "folio-realized-positions-v4",
  "folio-active-portfolio",
  "folio-column-widths-stock",
  "folio-column-widths-option",
] as const;

export type CloudPayload = Record<string, string>;

const ROTH_RECOVERY_IDS = new Set([
  "trade-1783994932453-yencvh",
  "trade-1783805777721-y8parg",
]);

function repairKnownRothRecovery(serializedPortfolio: string): string {
  try {
    const parsed = JSON.parse(serializedPortfolio);
    const state = parsed?.state;
    const holdings = state?.holdingsByPortfolio?.["fidelity-401k"];
    const transactions = state?.transactionsByPortfolio?.["fidelity-401k"];
    if (!Array.isArray(holdings) || holdings.length > 0 || !Array.isArray(transactions)) return serializedPortfolio;

    const recovered = transactions
      .filter((transaction: any) => ROTH_RECOVERY_IDS.has(transaction?.id))
      .map((transaction: any) => {
        const symbol = String(transaction.symbol ?? "").toUpperCase();
        const optionType = transaction.optionType;
        const label = optionType === "sell-call" ? "Sell Call"
          : optionType === "buy-call" ? "Call"
          : optionType === "sell-put" ? "Sell Put"
          : "Put";
        let expiryLabel = transaction.optionExpiry ?? "";
        if (transaction.optionExpiry) {
          const expiry = new Date(`${transaction.optionExpiry}T12:00:00`);
          if (!Number.isNaN(expiry.getTime())) {
            expiryLabel = expiry.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          }
        }
        return {
          assetType: "option",
          symbol,
          company: `${symbol} ${label}${expiryLabel ? ` Exp ${expiryLabel}` : ""}`,
          shares: transaction.quantity ?? 0,
          averageCost: transaction.price ?? 0,
          currentPrice: transaction.price ?? 0,
          previousClose: transaction.price ?? 0,
          dividendYield: 0,
          sector: "Other",
          optionType,
          optionExpiry: transaction.optionExpiry,
          optionStrike: transaction.optionStrike,
          optionSymbol: transaction.optionSymbol,
          updatedAt: "Recovered From Transaction History",
        };
      })
      .filter((holding: any) => holding.symbol && holding.shares !== 0);

    if (recovered.length === 0) return serializedPortfolio;
    state.holdingsByPortfolio["fidelity-401k"] = recovered;
    return JSON.stringify(parsed);
  } catch {
    return serializedPortfolio;
  }
}

type PortfolioSnapshot = {
  holdingsByPortfolio?: Record<string, unknown[]>;
  transactionsByPortfolio?: Record<string, Array<{ id?: string }>>;
};

export function readLocalFolioState(): CloudPayload {
  const payload: CloudPayload = {};
  for (const key of CLOUD_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value !== null) payload[key] = value;
  }
  return payload;
}

export function writeLocalFolioState(payload: CloudPayload) {
  for (const key of CLOUD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      const value = key === "folio-pro-portfolio" ? repairKnownRothRecovery(payload[key]) : payload[key];
      window.localStorage.setItem(key, value);
    }
  }
}

function readPortfolioSnapshot(payload: CloudPayload | null): PortfolioSnapshot | null {
  if (!payload?.["folio-pro-portfolio"]) return null;
  try {
    const parsed = JSON.parse(payload["folio-pro-portfolio"]);
    return (parsed?.state ?? parsed) as PortfolioSnapshot;
  } catch {
    return null;
  }
}

/**
 * Prevent the exact failure mode that erased retirement holdings: a hydrated/non-empty cloud
 * portfolio being replaced by an empty browser fallback with no accompanying user transaction.
 * Legitimate removals made through Holdings create a new transaction and are allowed.
 */
export function findUnsafeEmptyPortfolioOverwrite(
  cloudPayload: CloudPayload | null,
  localPayload: CloudPayload,
): string | null {
  const cloud = readPortfolioSnapshot(cloudPayload);
  const local = readPortfolioSnapshot(localPayload);
  if (!cloud || !local) return null;

  const portfolioIds = ["robinhood", "fidelity-401k", "fidelity-roth"];
  for (const portfolioId of portfolioIds) {
    const cloudHoldings = cloud.holdingsByPortfolio?.[portfolioId];
    const localHoldings = local.holdingsByPortfolio?.[portfolioId];
    if (!Array.isArray(cloudHoldings) || cloudHoldings.length === 0 || !Array.isArray(localHoldings) || localHoldings.length !== 0) {
      continue;
    }

    const cloudIds = new Set((cloud.transactionsByPortfolio?.[portfolioId] ?? []).map((item) => item?.id).filter(Boolean));
    const localTransactions = local.transactionsByPortfolio?.[portfolioId] ?? [];
    const hasNewLocalTransaction = localTransactions.some((item) => item?.id && !cloudIds.has(item.id));

    if (!hasNewLocalTransaction) return portfolioId;
  }

  return null;
}

export async function getCloudState() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return { user: null, payload: null as CloudPayload | null, updatedAt: null as string | null };
  const { data, error } = await supabase
    .from("user_app_state")
    .select("payload,updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return { user, payload: (data?.payload as CloudPayload | null) ?? null, updatedAt: data?.updated_at ?? null };
}

export async function uploadLocalState(options?: { force?: boolean }) {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in before uploading portfolio data to the cloud.");

  const payload = readLocalFolioState();
  if (!options?.force) {
    const currentCloud = await getCloudState();
    const unsafePortfolio = findUnsafeEmptyPortfolioOverwrite(currentCloud.payload, payload);
    if (unsafePortfolio) {
      throw new Error(`Cloud sync blocked a suspicious empty overwrite for ${unsafePortfolio}. Your existing cloud holdings were preserved.`);
    }
  }

  const { error } = await supabase.from("user_app_state").upsert({
    user_id: user.id,
    payload,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
  return payload;
}

export async function downloadCloudState() {
  const state = await getCloudState();
  if (!state.user) throw new Error("Sign in before downloading cloud data.");
  if (!state.payload) throw new Error("No cloud portfolio backup exists yet.");
  writeLocalFolioState(state.payload);
  return state.payload;
}
