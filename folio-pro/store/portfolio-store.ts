"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AssetType, Holding, Transaction } from "@/types/portfolio";
import { holdings as robinhoodHoldings, transactions as robinhoodTransactions } from "@/lib/data/mock";
import { buildOptionSymbol } from "@/lib/options";
import { consumeStockLots, recordStockTrade, removeDcaPosition } from "@/lib/dca-storage";
import { mergeKnownRothRecovery, mergeKnownRothTransactions, RECOVERY_VERSION, restoreKnownRobinhoodIfEmpty } from "@/lib/recovery-data";
import { migrateLegacyPortfolioState, PORTFOLIO_ID_SCHEMA_VERSION } from "@/lib/portfolio-id-migration";

export type DataPortfolioId = "robinhood" | "fidelity-401k" | "fidelity-roth";
export type ActivePortfolioId = DataPortfolioId | "all";

const dataPortfolioIds: DataPortfolioId[] = ["robinhood", "fidelity-401k", "fidelity-roth"];

function normalizeHoldingsByPortfolio(value?: Partial<Record<DataPortfolioId, Holding[]>>): Record<DataPortfolioId, Holding[]> {
  return {
    robinhood: Array.isArray(value?.robinhood) ? value.robinhood : cloneHoldings(initialHoldingsByPortfolio.robinhood),
    "fidelity-401k": Array.isArray(value?.["fidelity-401k"]) ? value["fidelity-401k"] : cloneHoldings(initialHoldingsByPortfolio["fidelity-401k"]),
    "fidelity-roth": Array.isArray(value?.["fidelity-roth"]) ? value["fidelity-roth"] : cloneHoldings(initialHoldingsByPortfolio["fidelity-roth"]),
  };
}

function normalizeTransactionsByPortfolio(value?: Partial<Record<DataPortfolioId, Transaction[]>>): Record<DataPortfolioId, Transaction[]> {
  return {
    robinhood: Array.isArray(value?.robinhood) ? value.robinhood : [...initialTransactionsByPortfolio.robinhood],
    "fidelity-401k": Array.isArray(value?.["fidelity-401k"]) ? value["fidelity-401k"] : [...initialTransactionsByPortfolio["fidelity-401k"]],
    "fidelity-roth": Array.isArray(value?.["fidelity-roth"]) ? value["fidelity-roth"] : [...initialTransactionsByPortfolio["fidelity-roth"]],
  };
}

function normalizeCashByPortfolio(value?: Partial<Record<DataPortfolioId, number>>): Record<DataPortfolioId, number> {
  return {
    robinhood: typeof value?.robinhood === "number" && Number.isFinite(value.robinhood) ? value.robinhood : initialCashByPortfolio.robinhood,
    // Fidelity 401(k) intentionally displays/persists zero cash.
    "fidelity-401k": 0,
    "fidelity-roth": typeof value?.["fidelity-roth"] === "number" && Number.isFinite(value["fidelity-roth"]) ? value["fidelity-roth"] : initialCashByPortfolio["fidelity-roth"],
  };
}

const holdingKey = (holding: Pick<Holding, "symbol" | "assetType" | "optionType" | "optionExpiry" | "optionStrike" | "optionSymbol" | "company">) => {
  const assetType = holding.assetType ?? "stock";
  const symbol = holding.symbol.trim().toUpperCase();
  if (assetType !== "option") return `stock:${symbol}`;
  const contract = holding.optionSymbol || buildOptionSymbol(holding) || [
    symbol,
    holding.optionType ?? "option",
    holding.optionExpiry ?? "no-expiry",
    holding.optionStrike ?? "no-strike",
    holding.company.trim().toUpperCase(),
  ].join(":");
  return `option:${holding.optionType ?? "option"}:${contract}`;
};

const cloneHoldings = (items: Holding[]) => items.map((holding) => ({ ...holding }));
const sampleHoldings = cloneHoldings(robinhoodHoldings.slice(0, 5));

const initialHoldingsByPortfolio: Record<DataPortfolioId, Holding[]> = {
  robinhood: cloneHoldings(robinhoodHoldings),
  "fidelity-401k": [],
  "fidelity-roth": [],
};

const initialTransactionsByPortfolio: Record<DataPortfolioId, Transaction[]> = {
  robinhood: robinhoodTransactions.map((transaction) => ({ ...transaction })),
  "fidelity-401k": [],
  "fidelity-roth": [],
};

const initialCashByPortfolio: Record<DataPortfolioId, number> = {
  robinhood: 12116.6,
  "fidelity-401k": 0,
  "fidelity-roth": 0,
};

function aggregateHoldings(groups: Holding[][]): Holding[] {
  const result = new Map<string, Holding>();

  groups.flat().forEach((holding) => {
    const assetType = holding.assetType ?? "stock";
    const key = holdingKey({ ...holding, assetType });
    const existing = result.get(key);

    if (!existing) {
      result.set(key, { ...holding, assetType });
      return;
    }

    const shares = existing.shares + holding.shares;
    const totalCost = existing.averageCost * existing.shares + holding.averageCost * holding.shares;
    result.set(key, {
      ...existing,
      shares,
      averageCost: shares > 0 ? totalCost / shares : 0,
      currentPrice: holding.currentPrice,
      previousClose: holding.previousClose,
      updatedAt: holding.updatedAt,
    });
  });

  return Array.from(result.values());
}

export function visibleState(
  activePortfolioId: ActivePortfolioId,
  holdingsByPortfolio: Record<DataPortfolioId, Holding[]>,
  transactionsByPortfolio: Record<DataPortfolioId, Transaction[]>,
  cashByPortfolio: Record<DataPortfolioId, number>,
) {
  const safeHoldings = normalizeHoldingsByPortfolio(holdingsByPortfolio);
  const safeTransactions = normalizeTransactionsByPortfolio(transactionsByPortfolio);
  const safeCash = normalizeCashByPortfolio(cashByPortfolio);

  if (activePortfolioId === "all") {
    return {
      holdings: aggregateHoldings(dataPortfolioIds.map((id) => safeHoldings[id])),
      transactions: dataPortfolioIds.flatMap((id) => safeTransactions[id]),
      cash: dataPortfolioIds.reduce((sum, id) => sum + safeCash[id], 0),
    };
  }

  return {
    holdings: safeHoldings[activePortfolioId],
    transactions: safeTransactions[activePortfolioId],
    cash: safeCash[activePortfolioId],
  };
}

type State = {
  activePortfolioId: ActivePortfolioId;
  holdingsByPortfolio: Record<DataPortfolioId, Holding[]>;
  transactionsByPortfolio: Record<DataPortfolioId, Transaction[]>;
  cashByPortfolio: Record<DataPortfolioId, number>;
  holdings: Holding[];
  transactions: Transaction[];
  cash: number;
  range: string;
  recoveryVersion: string;
  portfolioIdSchemaVersion: number;
  hasHydrated: boolean;
  cloudReady: boolean;
  setHasHydrated: (value: boolean) => void;
  setCloudReady: (value: boolean) => void;
  setActivePortfolio: (portfolioId: ActivePortfolioId) => void;
  setRange: (range: string) => void;
  setCash: (cash: number) => void;
  addHolding: (holding: Holding) => void;
  replaceHoldings: (holdings: Holding[], portfolioId?: DataPortfolioId) => void;
  updateHolding: (originalHolding: Holding, holding: Holding) => void;
  removeHolding: (holding: Holding) => void;
  addTransaction: (transaction: Transaction) => void;
  addCashTransaction: (entry: { type: "dividend" | "interest" | "deposit" | "withdrawal" | "transfer" | "cash-adjustment"; amount: number; date?: string; symbol?: string; notes?: string }) => void;
  executeTrade: (trade: { action: "buy" | "sell"; holding: Holding; quantity: number; price: number; tradeDate?: string; fees?: number }) => { ok: boolean; message?: string };
  updateStockQuotes: (quotes: Record<string, { currentPrice: number; previousClose: number }>, portfolioId?: DataPortfolioId) => void;
  updateOptionQuotes: (quotes: Record<string, { currentPrice: number; previousClose: number }>, portfolioId?: DataPortfolioId) => void;
};

export const usePortfolioStore = create<State>()(
  persist(
    (set, get) => ({
      activePortfolioId: "robinhood",
      holdingsByPortfolio: initialHoldingsByPortfolio,
      transactionsByPortfolio: initialTransactionsByPortfolio,
      cashByPortfolio: initialCashByPortfolio,
      holdings: initialHoldingsByPortfolio.robinhood,
      transactions: initialTransactionsByPortfolio.robinhood,
      cash: initialCashByPortfolio.robinhood,
      range: "1Y",
      recoveryVersion: "",
      portfolioIdSchemaVersion: PORTFOLIO_ID_SCHEMA_VERSION,
      hasHydrated: false,
      cloudReady: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setCloudReady: (cloudReady) => set({ cloudReady }),
      setActivePortfolio: (activePortfolioId) =>
        set((state) => ({
          activePortfolioId,
          ...visibleState(
            activePortfolioId,
            state.holdingsByPortfolio,
            state.transactionsByPortfolio,
            state.cashByPortfolio,
          ),
        })),
      setRange: (range) => set({ range }),
      setCash: (cash) =>
        set((state) => {
          const target = state.activePortfolioId === "all" ? "robinhood" : state.activePortfolioId;
          const cashByPortfolio = { ...state.cashByPortfolio, [target]: target === "fidelity-401k" ? 0 : cash };
          return {
            cashByPortfolio,
            ...visibleState(state.activePortfolioId, state.holdingsByPortfolio, state.transactionsByPortfolio, cashByPortfolio),
          };
        }),
      replaceHoldings: (holdings, portfolioId) =>
        set((state) => {
          const target = portfolioId ?? (state.activePortfolioId === "all" ? "robinhood" : state.activePortfolioId);
          const normalized = holdings.map((holding) => ({ ...holding, assetType: holding.assetType ?? "stock" }));
          const holdingsByPortfolio = { ...state.holdingsByPortfolio, [target]: normalized };
          return {
            holdingsByPortfolio,
            ...visibleState(state.activePortfolioId, holdingsByPortfolio, state.transactionsByPortfolio, state.cashByPortfolio),
          };
        }),
      addHolding: (holding) =>
        set((state) => {
          const target = state.activePortfolioId === "all" ? "robinhood" : state.activePortfolioId;
          const normalized = { ...holding, assetType: holding.assetType ?? "stock" };
          const newKey = holdingKey(normalized);
          const updated = [
            normalized,
            ...state.holdingsByPortfolio[target].filter(
              (item) => holdingKey(item) !== newKey,
            ),
          ];
          const holdingsByPortfolio = { ...state.holdingsByPortfolio, [target]: updated };
          const transaction: Transaction = {
            id: `position-added-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            symbol: normalized.symbol,
            type: "position-added",
            quantity: Math.abs(normalized.shares),
            price: normalized.averageCost,
            amount: Math.abs(normalized.shares) * normalized.averageCost * (normalized.assetType === "option" ? 100 : 1),
            date: new Date().toISOString().slice(0, 10),
            fees: 0,
            assetType: normalized.assetType,
            optionType: normalized.optionType,
            optionExpiry: normalized.optionExpiry,
            optionStrike: normalized.optionStrike,
            optionSymbol: normalized.optionSymbol,
            notes: "Position added to Holdings",
            source: "Holdings",
            cashImpact: 0,
          };
          const transactionsByPortfolio = {
            ...state.transactionsByPortfolio,
            [target]: [transaction, ...state.transactionsByPortfolio[target]],
          };
          return {
            holdingsByPortfolio,
            transactionsByPortfolio,
            ...visibleState(state.activePortfolioId, holdingsByPortfolio, transactionsByPortfolio, state.cashByPortfolio),
          };
        }),
      updateHolding: (originalHolding, holding) =>
        set((state) => {
          const target = state.activePortfolioId === "all" ? "robinhood" : state.activePortfolioId;
          const normalized = { ...holding, assetType: holding.assetType ?? "stock" };
          const originalKey = holdingKey(originalHolding);
          const newKey = holdingKey(normalized);
          const updated = [
            normalized,
            ...state.holdingsByPortfolio[target].filter((item) => {
              const key = holdingKey(item);
              return key !== originalKey && key !== newKey;
            }),
          ];
          const holdingsByPortfolio = { ...state.holdingsByPortfolio, [target]: updated };
          const transaction: Transaction = {
            id: `correction-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            symbol: normalized.symbol,
            type: "correction",
            quantity: Math.abs(normalized.shares),
            price: normalized.averageCost,
            amount: 0,
            date: new Date().toISOString().slice(0, 10),
            fees: 0,
            assetType: normalized.assetType,
            optionType: normalized.optionType,
            optionExpiry: normalized.optionExpiry,
            optionStrike: normalized.optionStrike,
            optionSymbol: normalized.optionSymbol,
            notes: "Position details edited in Holdings",
            source: "Holdings",
            cashImpact: 0,
          };
          const transactionsByPortfolio = {
            ...state.transactionsByPortfolio,
            [target]: [transaction, ...state.transactionsByPortfolio[target]],
          };
          return {
            holdingsByPortfolio,
            transactionsByPortfolio,
            ...visibleState(state.activePortfolioId, holdingsByPortfolio, transactionsByPortfolio, state.cashByPortfolio),
          };
        }),
      removeHolding: (holding) =>
        set((state) => {
          const target = state.activePortfolioId === "all" ? "robinhood" : state.activePortfolioId;
          const assetType = holding.assetType ?? "stock";
          removeDcaPosition(target, holding.symbol, assetType);
          const removedKey = holdingKey(holding);
          const removedHolding = state.holdingsByPortfolio[target].find((item) => holdingKey(item) === removedKey);
          const updated = state.holdingsByPortfolio[target].filter((item) => holdingKey(item) !== removedKey);
          const holdingsByPortfolio = { ...state.holdingsByPortfolio, [target]: updated };
          // Closing a short option through the Holdings remove action always pays the
          // close cost from cash: contracts × current/sell price (no 100x multiplier, per
          // the requested cash rule). Sell-put collateral is derived from open positions,
          // so removing contracts automatically releases strike × contracts × 100 into the
          // displayed available Cash without adding it to stored cash a second time.
          const contracts = Math.abs(removedHolding?.shares ?? 0);
          const closePrice = Math.max(0, removedHolding?.currentPrice ?? 0);
          const closeCost = contracts * closePrice;
          const isShortOption = removedHolding?.assetType === "option"
            && (removedHolding.optionType === "sell-call" || removedHolding.optionType === "sell-put");
          const cashDelta = isShortOption ? -closeCost : 0;
          const cashByPortfolio = {
            ...state.cashByPortfolio,
            [target]: target === "fidelity-401k" ? 0 : state.cashByPortfolio[target] + cashDelta,
          };
          const transaction: Transaction = {
            id: `position-removed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            symbol: removedHolding?.symbol ?? holding.symbol,
            type: "position-removed",
            quantity: contracts,
            price: closePrice,
            amount: contracts * closePrice * (assetType === "option" ? 100 : 1),
            date: new Date().toISOString().slice(0, 10),
            fees: 0,
            assetType,
            optionType: removedHolding?.optionType,
            optionExpiry: removedHolding?.optionExpiry,
            optionStrike: removedHolding?.optionStrike,
            optionSymbol: removedHolding?.optionSymbol,
            notes: isShortOption ? "Position removed from Holdings; short-option close cost applied" : "Position removed from Holdings",
            source: "Holdings",
            cashImpact: cashDelta,
          };
          const transactionsByPortfolio = {
            ...state.transactionsByPortfolio,
            [target]: [transaction, ...state.transactionsByPortfolio[target]],
          };
          return {
            holdingsByPortfolio,
            cashByPortfolio,
            transactionsByPortfolio,
            ...visibleState(state.activePortfolioId, holdingsByPortfolio, transactionsByPortfolio, cashByPortfolio),
          };
        }),
      addTransaction: (transaction) =>
        set((state) => {
          const target = state.activePortfolioId === "all" ? "robinhood" : state.activePortfolioId;
          const updated = [transaction, ...state.transactionsByPortfolio[target]];
          const transactionsByPortfolio = { ...state.transactionsByPortfolio, [target]: updated };
          return {
            transactionsByPortfolio,
            ...visibleState(state.activePortfolioId, state.holdingsByPortfolio, transactionsByPortfolio, state.cashByPortfolio),
          };
        }),
      addCashTransaction: (entry) =>
        set((state) => {
          const target = state.activePortfolioId === "all" ? "robinhood" : state.activePortfolioId;
          const rawAmount = Number.isFinite(entry.amount) ? entry.amount : 0;
          const amount = Math.abs(rawAmount);
          const positiveTypes = new Set(["dividend", "interest", "deposit"]);
          const negativeTypes = new Set(["withdrawal"]);
          const signedCashImpact = positiveTypes.has(entry.type)
            ? amount
            : negativeTypes.has(entry.type)
              ? -amount
              : entry.type === "cash-adjustment"
                ? rawAmount
                : 0;
          const cashImpact = target === "fidelity-401k" ? 0 : signedCashImpact;
          const transaction: Transaction = {
            id: `cash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            symbol: entry.symbol?.trim().toUpperCase() || undefined,
            type: entry.type,
            amount,
            date: entry.date || new Date().toISOString().slice(0, 10),
            fees: 0,
            notes: entry.notes?.trim() || undefined,
            source: "Transactions",
            cashImpact,
          };
          const transactionsByPortfolio = {
            ...state.transactionsByPortfolio,
            [target]: [transaction, ...state.transactionsByPortfolio[target]],
          };
          const cashByPortfolio = {
            ...state.cashByPortfolio,
            [target]: target === "fidelity-401k" ? 0 : state.cashByPortfolio[target] + cashImpact,
          };
          return {
            transactionsByPortfolio,
            cashByPortfolio,
            ...visibleState(state.activePortfolioId, state.holdingsByPortfolio, transactionsByPortfolio, cashByPortfolio),
          };
        }),
      updateStockQuotes: (quotes, portfolioId) =>
        set((state) => {
          const portfolioIds: DataPortfolioId[] = portfolioId ? [portfolioId] : ["robinhood", "fidelity-401k", "fidelity-roth"];
          // Always preserve untouched portfolio buckets. Previously this reducer started from
          // an empty object when refreshing a single account, which dropped the other accounts
          // from live state and made switching appear random/cross-contaminated.
          const holdingsByPortfolio = portfolioIds.reduce<Record<DataPortfolioId, Holding[]>>((result, portfolioId) => {
            result[portfolioId] = state.holdingsByPortfolio[portfolioId].map((holding) => {
              if ((holding.assetType ?? "stock") !== "stock") return holding;
              const quote = quotes[holding.symbol.trim().toUpperCase()];
              if (!quote || !Number.isFinite(quote.currentPrice) || quote.currentPrice <= 0) return holding;
              return {
                ...holding,
                currentPrice: quote.currentPrice,
                previousClose: Number.isFinite(quote.previousClose) && quote.previousClose > 0 ? quote.previousClose : holding.previousClose,
                updatedAt: new Date().toISOString(),
              };
            });
            return result;
          }, { ...state.holdingsByPortfolio });

          return {
            holdingsByPortfolio,
            ...visibleState(state.activePortfolioId, holdingsByPortfolio, state.transactionsByPortfolio, state.cashByPortfolio),
          };
        }),
      updateOptionQuotes: (quotes, portfolioId) =>
        set((state) => {
          const portfolioIds: DataPortfolioId[] = portfolioId ? [portfolioId] : ["robinhood", "fidelity-401k", "fidelity-roth"];
          const holdingsByPortfolio = portfolioIds.reduce<Record<DataPortfolioId, Holding[]>>((result, portfolioId) => {
            result[portfolioId] = state.holdingsByPortfolio[portfolioId].map((holding) => {
              if (holding.assetType !== "option") return holding;
              const contract = buildOptionSymbol(holding);
              const quote = contract ? quotes[contract] : undefined;
              if (!quote || !Number.isFinite(quote.currentPrice) || quote.currentPrice <= 0) return holding;
              return {
                ...holding,
                currentPrice: quote.currentPrice,
                previousClose: Number.isFinite(quote.previousClose) && quote.previousClose > 0 ? quote.previousClose : holding.previousClose,
                updatedAt: new Date().toISOString(),
              };
            });
            return result;
          }, { ...state.holdingsByPortfolio });
          return { holdingsByPortfolio, ...visibleState(state.activePortfolioId, holdingsByPortfolio, state.transactionsByPortfolio, state.cashByPortfolio) };
        }),
      executeTrade: ({ action, holding, quantity, price, tradeDate, fees = 0 }) => {
        const state = get();
        const target = state.activePortfolioId === "all" ? "robinhood" : state.activePortfolioId;
        const assetType = holding.assetType ?? "stock";
        const key = holdingKey({ ...holding, assetType });
        const current = state.holdingsByPortfolio[target].find((item) => holdingKey(item) === key);
        const multiplier = assetType === "option" ? 100 : 1;
        const signedDelta = assetType === "option" ? quantity : (action === "buy" ? quantity : -quantity);
        const tradeValue = Math.abs(quantity) * price * multiplier;
        const safeFees = Number.isFinite(fees) ? Math.max(0, fees) : 0;
        const isRemovingShortOption = assetType === "option" && action === "sell" &&
          (holding.optionType === "sell-call" || holding.optionType === "sell-put");
        const shortOptionCloseCost = Math.abs(quantity) * price;
        const baseCashChange = isRemovingShortOption
          // Sell-put collateral is not stored as a cash debit; it is subtracted from
          // available cash while the position is open. Reducing/removing the position
          // therefore releases collateral automatically, while this pays only close cost.
          ? -shortOptionCloseCost
          : assetType === "option"
            ? -signedDelta * price * multiplier
            : (action === "sell" ? tradeValue : -tradeValue);
        // Platform fees always reduce cash, regardless of asset type or trade direction.
        const cashChange = baseCashChange - safeFees;

        if (assetType === "stock" && action === "sell" && (!current || quantity > current.shares)) {
          return { ok: false, message: current ? `Only ${current.shares} shares are available.` : "No matching open position was found." };
        }
        // Fidelity 401(k) displays $0 cash, but uses a temporary hidden $25,000
        // purchase-capacity check so buys are not blocked by the displayed zero balance.
        const availableTradeCash = target === "fidelity-401k" ? 25000 : state.cashByPortfolio[target];
        if (cashChange < 0 && availableTradeCash < Math.abs(cashChange)) {
          return { ok: false, message: `Insufficient cash. This purchase requires $${Math.abs(cashChange).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.` };
        }

        const fifoSale = assetType === "stock" && action === "sell"
          ? consumeStockLots(target, holding.symbol, quantity)
          : null;

        set((latest) => {
          const existing = latest.holdingsByPortfolio[target].find((item) => holdingKey(item) === key);
          const oldQuantityForRealized = existing?.shares ?? 0;
          const closesStock = assetType === "stock" && action === "sell";
          const closesOption = assetType === "option" && oldQuantityForRealized !== 0 && Math.sign(oldQuantityForRealized) !== Math.sign(signedDelta);
          const closedQuantity = closesStock ? Math.min(quantity, Math.abs(oldQuantityForRealized)) : closesOption ? Math.min(Math.abs(signedDelta), Math.abs(oldQuantityForRealized)) : 0;
          const realizedCostBasis = closesStock && fifoSale
            ? fifoSale.costBasis
            : closedQuantity * (existing?.averageCost ?? holding.averageCost) * multiplier;
          const realizedProceeds = closedQuantity * price * multiplier;
          const realizedGain = closedQuantity > 0
            ? (assetType === "option"
                ? (price - (existing?.averageCost ?? holding.averageCost)) * closedQuantity * multiplier * Math.sign(oldQuantityForRealized)
                : realizedProceeds - realizedCostBasis)
            : undefined;
          let nextHoldings: Holding[];
          if (assetType === "option") {
            const oldQuantity = existing?.shares ?? 0;
            const nextQuantity = oldQuantity + signedDelta;
            const sameDirection = oldQuantity === 0 || Math.sign(oldQuantity) === Math.sign(signedDelta);
            const nextAverage = sameDirection && nextQuantity !== 0
              ? (((existing?.averageCost ?? 0) * Math.abs(oldQuantity)) + price * Math.abs(signedDelta)) / Math.abs(nextQuantity)
              : (Math.sign(oldQuantity) !== Math.sign(nextQuantity) && nextQuantity !== 0 ? price : (existing?.averageCost ?? price));
            if (nextQuantity === 0) {
              nextHoldings = latest.holdingsByPortfolio[target].filter((item) => holdingKey(item) !== key);
            } else {
              const merged: Holding = {
                ...(existing ?? holding),
                ...holding,
                shares: nextQuantity,
                averageCost: nextAverage,
                currentPrice: existing?.currentPrice ?? price,
                previousClose: existing?.previousClose ?? price,
                updatedAt: "Just now",
              };
              nextHoldings = [merged, ...latest.holdingsByPortfolio[target].filter((item) => holdingKey(item) !== key)];
            }
          } else if (action === "buy") {
            const oldQuantity = existing?.shares ?? 0;
            const nextQuantity = oldQuantity + quantity;
            const nextAverage = nextQuantity ? (((existing?.averageCost ?? 0) * oldQuantity) + price * quantity) / nextQuantity : price;
            const merged: Holding = {
              ...(existing ?? holding),
              ...holding,
              shares: nextQuantity,
              averageCost: nextAverage,
              currentPrice: existing?.currentPrice ?? price,
              previousClose: existing?.previousClose ?? price,
              updatedAt: "Just now",
            };
            nextHoldings = [merged, ...latest.holdingsByPortfolio[target].filter((item) => holdingKey(item) !== key)];
          } else {
            const remaining = (existing?.shares ?? 0) - quantity;
            nextHoldings = remaining > 0
              ? [{
                  ...existing!,
                  shares: remaining,
                  averageCost: fifoSale && fifoSale.remainingShares > 0 ? fifoSale.remainingAverageCost : existing!.averageCost,
                  updatedAt: "Just now",
                }, ...latest.holdingsByPortfolio[target].filter((item) => holdingKey(item) !== key)]
              : latest.holdingsByPortfolio[target].filter((item) => holdingKey(item) !== key);
          }

          const holdingsByPortfolio = { ...latest.holdingsByPortfolio, [target]: nextHoldings };
          const cashByPortfolio = {
            ...latest.cashByPortfolio,
            [target]: target === "fidelity-401k" ? 0 : latest.cashByPortfolio[target] + cashChange,
          };
          const transaction: Transaction = {
            id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            symbol: holding.symbol,
            type: action,
            quantity,
            price,
            amount: tradeValue,
            date: tradeDate || new Date().toISOString().slice(0, 10),
            fees: safeFees,
            assetType,
            optionType: holding.optionType,
            optionExpiry: holding.optionExpiry,
            optionStrike: holding.optionStrike,
            optionSymbol: holding.optionSymbol,
            notes: `${action === "buy" ? "Bought" : "Sold"} from Holdings${fees > 0 ? " | Platform Fee" : ""}`,
            source: "Holdings",
            cashImpact: cashChange,
            realizedGain,
            realizedCostBasis: closedQuantity > 0 ? realizedCostBasis : undefined,
            realizedProceeds: closedQuantity > 0 ? realizedProceeds : undefined,
          };
          const transactionsByPortfolio = { ...latest.transactionsByPortfolio, [target]: [transaction, ...latest.transactionsByPortfolio[target]] };
          return {
            holdingsByPortfolio,
            cashByPortfolio,
            transactionsByPortfolio,
            ...visibleState(latest.activePortfolioId, holdingsByPortfolio, transactionsByPortfolio, cashByPortfolio),
          };
        });
        if (assetType === "stock" && action === "buy") {
          recordStockTrade(target, holding.symbol, action, quantity, price, tradeDate || new Date().toISOString().slice(0, 10));
        }
        return { ok: true };
      },
    }),
    {
      name: "folio-pro-portfolio",
      partialize: (state) => ({
        holdingsByPortfolio: state.holdingsByPortfolio,
        transactionsByPortfolio: state.transactionsByPortfolio,
        cashByPortfolio: state.cashByPortfolio,
        range: state.range,
        recoveryVersion: state.recoveryVersion,
        portfolioIdSchemaVersion: state.portfolioIdSchemaVersion,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("Folio portfolio hydration failed", error);
        }
        state?.setHasHydrated(true);
      },
      merge: (persisted, current) => {
        const saved = persisted as Partial<State> & {
          holdings?: Holding[];
          transactions?: Transaction[];
          cash?: number;
        };

        // Preserve every existing saved value exactly, while safely backfilling only missing
        // portfolio containers. This avoids crashes with older partial persisted/cloud state
        // without clearing, remapping, or overwriting any user's portfolio data.
        const legacyHoldings = saved.holdings
          ? { robinhood: saved.holdings.map((holding) => ({ ...holding, assetType: holding.assetType ?? "stock" })) }
          : undefined;
        const legacyTransactions = saved.transactions ? { robinhood: saved.transactions } : undefined;
        const legacyCash = typeof saved.cash === "number" ? { robinhood: saved.cash } : undefined;

        const migratedSaved = migrateLegacyPortfolioState(saved as Record<string, any>) as Partial<State> & {
          holdings?: Holding[];
          transactions?: Transaction[];
          cash?: number;
        };
        const transactionsByPortfolio = normalizeTransactionsByPortfolio(migratedSaved.transactionsByPortfolio ?? legacyTransactions);
        const holdingsByPortfolio = normalizeHoldingsByPortfolio(migratedSaved.holdingsByPortfolio ?? legacyHoldings);
        let recoveryVersion = migratedSaved.recoveryVersion ?? "";

        // One-time recovery only. RECOVERY_VERSION v3 specifically repairs Robinhood buckets
        // that were persisted as empty by the former single-portfolio quote-refresh reducer.
        // Once this marker is persisted, normal user removals remain removed and are never
        // resurrected on future reloads.
        if (recoveryVersion !== RECOVERY_VERSION) {
          transactionsByPortfolio["fidelity-roth"] = mergeKnownRothTransactions(transactionsByPortfolio["fidelity-roth"]);
          holdingsByPortfolio.robinhood = restoreKnownRobinhoodIfEmpty(holdingsByPortfolio.robinhood);
          holdingsByPortfolio["fidelity-roth"] = mergeKnownRothRecovery(
            holdingsByPortfolio["fidelity-roth"],
            transactionsByPortfolio["fidelity-roth"],
          );
          recoveryVersion = RECOVERY_VERSION;
        }
        const cashByPortfolio = normalizeCashByPortfolio(migratedSaved.cashByPortfolio ?? legacyCash);
        const activePortfolioId = current.activePortfolioId;

        return {
          ...current,
          ...migratedSaved,
          activePortfolioId,
          holdingsByPortfolio,
          transactionsByPortfolio,
          cashByPortfolio,
          recoveryVersion,
          portfolioIdSchemaVersion: PORTFOLIO_ID_SCHEMA_VERSION,
          ...visibleState(activePortfolioId, holdingsByPortfolio, transactionsByPortfolio, cashByPortfolio),
        };
      },
    },
  ),
);
