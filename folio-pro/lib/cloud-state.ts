import { createClient } from "@/lib/supabase/client";
import type { Holding, Transaction } from "@/types/portfolio";
import {
  mergeKnownRothRecovery,
  mergeKnownRothTransactions,
  RECOVERY_VERSION,
  restoreKnownRobinhoodIfEmpty,
} from "@/lib/recovery-data";
import { migrateLegacyBucketJson, migrateLegacyPortfolioState, PORTFOLIO_ID_SCHEMA_VERSION, swapLegacyFidelityId } from "@/lib/portfolio-id-migration";

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
    const rawState = (root?.state ?? root) as PortfolioState;
    const state = migrateLegacyPortfolioState(rawState as Record<string, any>) as PortfolioState;
    if (root?.state) root.state = state;
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
// RECOVERY_VERSION gates this repair so a Robinhood bucket accidentally persisted empty by
// the historical quote-refresh bug is restored once, without resurrecting positions after a
// legitimate future user removal.
function applyKnownRecovery(serialized: string): string {
  const parsed = parsePortfolio(serialized);
  if (!parsed) return serialized;

  if (parsed.state.recoveryVersion === RECOVERY_VERSION) return serializePortfolio(parsed);

  const holdings = parsed.state.holdingsByPortfolio ?? {};
  const transactions = parsed.state.transactionsByPortfolio ?? {};

  const robinhood = Array.isArray(holdings.robinhood) ? holdings.robinhood : [];
  holdings.robinhood = restoreKnownRobinhoodIfEmpty(robinhood);

  const rothTransactions = mergeKnownRothTransactions(
    Array.isArray(transactions["fidelity-roth"]) ? transactions["fidelity-roth"] : [],
  );
  transactions["fidelity-roth"] = rothTransactions;
  holdings["fidelity-roth"] = mergeKnownRothRecovery(
    Array.isArray(holdings["fidelity-roth"]) ? holdings["fidelity-roth"] : [],
    rothTransactions,
  );

  if (!Array.isArray(holdings["fidelity-401k"])) holdings["fidelity-401k"] = [];
  if (!Array.isArray(transactions.robinhood)) transactions.robinhood = [];
  if (!Array.isArray(transactions["fidelity-401k"])) transactions["fidelity-401k"] = [];

  parsed.state.holdingsByPortfolio = holdings;
  parsed.state.transactionsByPortfolio = transactions;
  parsed.state.recoveryVersion = RECOVERY_VERSION;
  return serializePortfolio(parsed);
}

function migratePayloadPortfolioIds(payload: CloudPayload): CloudPayload {
  const next = { ...payload };
  const raw = payload["folio-pro-portfolio"];
  if (!raw) return next;
  try {
    const root = JSON.parse(raw);
    const state = root?.state ?? root;
    const needsMigration = state?.portfolioIdSchemaVersion !== PORTFOLIO_ID_SCHEMA_VERSION;
    if (!needsMigration) return next;
    const migratedState = migrateLegacyPortfolioState(state);
    if (root?.state) root.state = migratedState;
    else Object.assign(root, migratedState);
    next["folio-pro-portfolio"] = JSON.stringify(root);
    if (next["folio-active-portfolio"]) {
      next["folio-active-portfolio"] = swapLegacyFidelityId(next["folio-active-portfolio"]) ?? next["folio-active-portfolio"];
    }
    if (next["folio-realized-positions-v4"]) {
      next["folio-realized-positions-v4"] = migrateLegacyBucketJson(next["folio-realized-positions-v4"]) ?? next["folio-realized-positions-v4"];
    }
  } catch {}
  return next;
}

/**
 * Safe startup merge. Cloud remains the source of truth when it contains holdings, but an
 * empty cloud bucket is never allowed to erase a non-empty local bucket. Transactions are
 * unioned by ID per portfolio so one account cannot overwrite another account's history.
 */
export function mergeCloudIntoLocalPayload(cloudPayload: CloudPayload, localPayload: CloudPayload): CloudPayload {
  cloudPayload = migratePayloadPortfolioIds(cloudPayload);
  localPayload = migratePayloadPortfolioIds(localPayload);
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
  localPayload = migratePayloadPortfolioIds(localPayload);
  cloudPayload = cloudPayload ? migratePayloadPortfolioIds(cloudPayload) : null;
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
  const canonicalPayload = migratePayloadPortfolioIds(payload);
  for (const key of CLOUD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(canonicalPayload, key)) {
      const value = key === "folio-pro-portfolio" ? applyKnownRecovery(canonicalPayload[key]) : canonicalPayload[key];
      window.localStorage.setItem(key, value);
    }
  }
  // These markers prevent client pages from applying the same legacy ID swap a second time
  // after cloud hydration has already canonicalized the payload.
  if (canonicalPayload["folio-active-portfolio"]) {
    window.localStorage.setItem("folio-portfolio-id-schema-version", String(PORTFOLIO_ID_SCHEMA_VERSION));
  }
  if (canonicalPayload["folio-realized-positions-v4"]) {
    window.localStorage.setItem("folio-realized-portfolio-id-schema-version", String(PORTFOLIO_ID_SCHEMA_VERSION));
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
