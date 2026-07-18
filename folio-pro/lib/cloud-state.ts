import { createClient } from "@/lib/supabase/client";
import type { Holding, Transaction } from "@/types/portfolio";
import {
  mergeKnownRothRecovery,
  mergeKnownRothTransactions,
  RECOVERY_VERSION,
  restoreKnownRobinhoodIfEmpty,
} from "@/lib/recovery-data";

export const CLOUD_KEYS = [
  "folio-pro-portfolio",
  "folio-realized-positions-v4",
  "folio-active-portfolio",
  "folio-column-widths-stock",
  "folio-column-widths-option",
] as const;

export type CloudPayload = Record<string, string>;
const PORTFOLIO_IDS = ["robinhood", "fidelity-401k", "fidelity-roth"] as const;

type PortfolioId = (typeof PORTFOLIO_IDS)[number];
type PortfolioState = {
  holdingsByPortfolio?: Record<string, Holding[]>;
  transactionsByPortfolio?: Record<string, Transaction[]>;
  cashByPortfolio?: Record<string, number>;
  [key: string]: unknown;
};

function parsePortfolio(serialized?: string): { root: any; state: PortfolioState } | null {
  if (!serialized) return null;
  try {
    const root = JSON.parse(serialized);
    const state = (root?.state ?? root) as PortfolioState;
    if (!state || typeof state !== "object") return null;
    return { root, state };
  } catch {
    return null;
  }
}

function serializePortfolio(parsed: { root: any; state: PortfolioState }) {
  if (parsed.root?.state) parsed.root.state = parsed.state;
  else parsed.root = parsed.state;
  return JSON.stringify(parsed.root);
}

function unionTransactions(primary: Transaction[] = [], secondary: Transaction[] = []) {
  const seen = new Set<string>();
  return [...primary, ...secondary].filter((transaction) => {
    const id = transaction?.id;
    if (!id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Applies only explicit recovery data supplied by the user. It never replaces a non-empty
 * Robinhood bucket. Roth recovery is additive by exact transaction IDs, so future holdings
 * are preserved and duplicate recovered positions are not added.
 */
function applyKnownRecovery(serialized: string): string {
  const parsed = parsePortfolio(serialized);
  if (!parsed) return serialized;

  if (parsed.state.recoveryVersion === RECOVERY_VERSION) return serialized;

  const holdings = parsed.state.holdingsByPortfolio ?? {};
  const transactions = parsed.state.transactionsByPortfolio ?? {};

  const robinhood = Array.isArray(holdings.robinhood) ? holdings.robinhood : [];
  holdings.robinhood = restoreKnownRobinhoodIfEmpty(robinhood);

  const rothTransactions = mergeKnownRothTransactions(
    Array.isArray(transactions["fidelity-401k"]) ? transactions["fidelity-401k"] : [],
  );
  transactions["fidelity-401k"] = rothTransactions;
  holdings["fidelity-401k"] = mergeKnownRothRecovery(
    Array.isArray(holdings["fidelity-401k"]) ? holdings["fidelity-401k"] : [],
    rothTransactions,
  );

  if (!Array.isArray(holdings["fidelity-roth"])) holdings["fidelity-roth"] = [];
  if (!Array.isArray(transactions.robinhood)) transactions.robinhood = [];
  if (!Array.isArray(transactions["fidelity-roth"])) transactions["fidelity-roth"] = [];

  parsed.state.holdingsByPortfolio = holdings;
  parsed.state.transactionsByPortfolio = transactions;
  parsed.state.recoveryVersion = RECOVERY_VERSION;
  return serializePortfolio(parsed);
}

/**
 * Safe startup merge. Cloud remains the source of truth when it contains holdings, but an
 * empty cloud bucket is never allowed to erase a non-empty local bucket. Transactions are
 * unioned by ID per portfolio so one account cannot overwrite another account's history.
 */
export function mergeCloudIntoLocalPayload(cloudPayload: CloudPayload, localPayload: CloudPayload): CloudPayload {
  const merged: CloudPayload = { ...localPayload, ...cloudPayload };
  const cloudPortfolio = parsePortfolio(cloudPayload["folio-pro-portfolio"]);
  const localPortfolio = parsePortfolio(localPayload["folio-pro-portfolio"]);

  if (!cloudPortfolio && !localPortfolio) return merged;
  if (!cloudPortfolio && localPortfolio) {
    merged["folio-pro-portfolio"] = applyKnownRecovery(localPayload["folio-pro-portfolio"]);
    return merged;
  }
  if (cloudPortfolio && !localPortfolio) {
    merged["folio-pro-portfolio"] = applyKnownRecovery(cloudPayload["folio-pro-portfolio"]);
    return merged;
  }

  const result = cloudPortfolio!;
  result.state.holdingsByPortfolio = { ...(cloudPortfolio!.state.holdingsByPortfolio ?? {}) };
  result.state.transactionsByPortfolio = { ...(cloudPortfolio!.state.transactionsByPortfolio ?? {}) };
  result.state.cashByPortfolio = { ...(cloudPortfolio!.state.cashByPortfolio ?? {}) };

  for (const portfolioId of PORTFOLIO_IDS) {
    const cloudHoldings = cloudPortfolio!.state.holdingsByPortfolio?.[portfolioId];
    const localHoldings = localPortfolio!.state.holdingsByPortfolio?.[portfolioId];
    result.state.holdingsByPortfolio[portfolioId] = Array.isArray(cloudHoldings) && cloudHoldings.length > 0
      ? cloudHoldings
      : Array.isArray(localHoldings)
        ? localHoldings
        : [];

    result.state.transactionsByPortfolio[portfolioId] = unionTransactions(
      cloudPortfolio!.state.transactionsByPortfolio?.[portfolioId],
      localPortfolio!.state.transactionsByPortfolio?.[portfolioId],
    );

    const cloudCash = cloudPortfolio!.state.cashByPortfolio?.[portfolioId];
    const localCash = localPortfolio!.state.cashByPortfolio?.[portfolioId];
    result.state.cashByPortfolio[portfolioId] = typeof cloudCash === "number"
      ? cloudCash
      : typeof localCash === "number"
        ? localCash
        : 0;
  }

  merged["folio-pro-portfolio"] = applyKnownRecovery(serializePortfolio(result));
  return merged;
}

/**
 * Safe upload merge. Local edits win per portfolio, except an unexplained empty local bucket
 * cannot wipe a non-empty cloud bucket. A genuinely intentional final removal is recognized by
 * a new local transaction in that same portfolio. Other portfolios are merged independently.
 */
export function mergeLocalIntoCloudPayload(cloudPayload: CloudPayload | null, localPayload: CloudPayload): CloudPayload {
  if (!cloudPayload) {
    return {
      ...localPayload,
      ...(localPayload["folio-pro-portfolio"]
        ? { "folio-pro-portfolio": applyKnownRecovery(localPayload["folio-pro-portfolio"]) }
        : {}),
    };
  }

  const merged: CloudPayload = { ...cloudPayload, ...localPayload };
  const cloudPortfolio = parsePortfolio(cloudPayload["folio-pro-portfolio"]);
  const localPortfolio = parsePortfolio(localPayload["folio-pro-portfolio"]);
  if (!cloudPortfolio || !localPortfolio) {
    if (localPayload["folio-pro-portfolio"]) {
      merged["folio-pro-portfolio"] = applyKnownRecovery(localPayload["folio-pro-portfolio"]);
    }
    return merged;
  }

  const result = localPortfolio;
  result.state.holdingsByPortfolio = { ...(localPortfolio.state.holdingsByPortfolio ?? {}) };
  result.state.transactionsByPortfolio = { ...(localPortfolio.state.transactionsByPortfolio ?? {}) };
  result.state.cashByPortfolio = { ...(localPortfolio.state.cashByPortfolio ?? {}) };

  for (const portfolioId of PORTFOLIO_IDS) {
    const cloudHoldings = cloudPortfolio.state.holdingsByPortfolio?.[portfolioId];
    const localHoldings = localPortfolio.state.holdingsByPortfolio?.[portfolioId];
    const cloudTransactions = cloudPortfolio.state.transactionsByPortfolio?.[portfolioId] ?? [];
    const localTransactions = localPortfolio.state.transactionsByPortfolio?.[portfolioId] ?? [];
    const cloudIds = new Set(cloudTransactions.map((transaction) => transaction.id).filter(Boolean));
    const hasNewLocalTransaction = localTransactions.some((transaction) => transaction.id && !cloudIds.has(transaction.id));

    if (Array.isArray(localHoldings) && localHoldings.length > 0) {
      result.state.holdingsByPortfolio[portfolioId] = localHoldings;
    } else if (Array.isArray(cloudHoldings) && cloudHoldings.length > 0 && !hasNewLocalTransaction) {
      result.state.holdingsByPortfolio[portfolioId] = cloudHoldings;
    } else {
      result.state.holdingsByPortfolio[portfolioId] = Array.isArray(localHoldings) ? localHoldings : (cloudHoldings ?? []);
    }

    result.state.transactionsByPortfolio[portfolioId] = unionTransactions(localTransactions, cloudTransactions);

    const localCash = localPortfolio.state.cashByPortfolio?.[portfolioId];
    const cloudCash = cloudPortfolio.state.cashByPortfolio?.[portfolioId];
    result.state.cashByPortfolio[portfolioId] = typeof localCash === "number"
      ? localCash
      : typeof cloudCash === "number"
        ? cloudCash
        : 0;
  }

  merged["folio-pro-portfolio"] = applyKnownRecovery(serializePortfolio(result));
  return merged;
}

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
      const value = key === "folio-pro-portfolio" ? applyKnownRecovery(payload[key]) : payload[key];
      window.localStorage.setItem(key, value);
    }
  }
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

  const localPayload = readLocalFolioState();
  const currentCloud = await getCloudState();
  const payload = options?.force
    ? localPayload
    : mergeLocalIntoCloudPayload(currentCloud.payload, localPayload);

  const { error } = await supabase.from("user_app_state").upsert({
    user_id: user.id,
    payload,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;

  // Keep browser state aligned with any cloud holdings that were protected from an accidental wipe.
  if (!options?.force) writeLocalFolioState(payload);
  return payload;
}

export async function downloadCloudState() {
  const state = await getCloudState();
  if (!state.user) throw new Error("Sign in before downloading cloud data.");
  if (!state.payload) throw new Error("No cloud portfolio backup exists yet.");
  const merged = mergeCloudIntoLocalPayload(state.payload, readLocalFolioState());
  writeLocalFolioState(merged);
  return merged;
}
