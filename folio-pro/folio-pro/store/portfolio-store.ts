"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AssetType, Holding, Transaction } from "@/types/portfolio";
import { holdings as robinhoodHoldings, transactions as robinhoodTransactions } from "@/lib/data/mock";
import { buildOptionSymbol } from "@/lib/options";
import { recordStockTrade, removeDcaPosition } from "@/lib/dca-storage";
import { mergeKnownRothRecovery, mergeKnownRothTransactions, RECOVERY_VERSION, restoreKnownRobinhoodIfEmpty } from "@/lib/recovery-data";

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
    "fidelity-401k": typeof value?.["fidelity-401k"] === "number" && Number.isFinite(value["fidelity-401k"]) ? value["fidelity-401k"] : initialCashByPortfolio["fidelity-401k"],
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

function visibleState(
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
  setActivePortfolio: (portfolioId: ActivePortfolioId) => void;
  setRange: (range: string) => void;
  setCash: (cash: number) => void;
  addHolding: (holding: Holding) => void;
  replaceHoldings: (holdings: Holding[], portfolioId?: DataPortfolioId) => void;
  updateHolding: (originalHolding: Holding, holding: Holding) => void;
  removeHolding: (holding: Holding) => void;
  addTransaction: (transaction: Transaction) => void;
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
          const cashByPortfolio = { ...state.cashByPortfolio, [target]: cash };
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
          return {
            holdingsByPortfolio,
            ...visibleState(state.activePortfolioId, holdingsByPortfolio, state.transactionsByPortfolio, state.cashByPortfolio),
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
          return {
            holdingsByPortfolio,
            ...visibleState(state.activePortfolioId, holdingsByPortfolio, state.transactionsByPortfolio, state.cashByPortfolio),
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
          // Options collateral is derived from active Sell Put positions. Removing a Sell Put
          // automatically releases its collateral into available cash without mutating stored cash.
          // Removing a Sell Call must not change cash.
          const cashByPortfolio = state.cashByPortfolio;
          return {
            holdingsByPortfolio,
            cashByPortfolio,
            ...visibleState(state.activePortfolioId, holdingsByPortfolio, state.transactionsByPortfolio, cashByPortfolio),
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
      updateStockQuotes: (quotes, portfolioId) =>
        set((state) => {
          const portfolioIds: DataPortfolioId[] = portfolioId ? [portfolioId] : ["robinhood", "fidelity-401k", "fidelity-roth"];
          const holdingsByPortfolio = portfolioIds.reduce<Record<DataPortfolioId, Holding[]>>((result, portfolioId) => {
            result[portfolioId] = state.holdingsByPortfolio[portfolioId].map((holding) => {
              if ((holding.assetType ?? "stock") !== "stock" || holding.symbol.trim().toUpperCase() === "VSTL") return holding;
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
          }, {} as Record<DataPortfolioId, Holding[]>);

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
          }, {} as Record<DataPortfolioId, Holding[]>);
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
        const baseCashChange = isRemovingShortOption
          ? 0
          : assetType === "option"
            ? -signedDelta * price * multiplier
            : (action === "sell" ? tradeValue : -tradeValue);
        // Platform fees always reduce cash, regardless of asset type or trade direction.
        const cashChange = baseCashChange - safeFees;

        if (assetType === "stock" && action === "sell" && (!current || quantity > current.shares)) {
          return { ok: false, message: current ? `Only ${current.shares} shares are available.` : "No matching open position was found." };
        }
        if (cashChange < 0 && state.cashByPortfolio[target] < Math.abs(cashChange)) {
          return { ok: false, message: `Insufficient cash. This purchase requires $${Math.abs(cashChange).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.` };
        }

        set((latest) => {
          const existing = latest.holdingsByPortfolio[target].find((item) => holdingKey(item) === key);
          const oldQuantityForRealized = existing?.shares ?? 0;
          const closesStock = assetType === "stock" && action === "sell";
          const closesOption = assetType === "option" && oldQuantityForRealized !== 0 && Math.sign(oldQuantityForRealized) !== Math.sign(signedDelta);
          const closedQuantity = closesStock ? Math.min(quantity, Math.abs(oldQuantityForRealized)) : closesOption ? Math.min(Math.abs(signedDelta), Math.abs(oldQuantityForRealized)) : 0;
          const realizedCostBasis = closedQuantity * (existing?.averageCost ?? holding.averageCost) * multiplier;
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
              ? [{ ...existing!, shares: remaining, updatedAt: "Just now" }, ...latest.holdingsByPortfolio[target].filter((item) => holdingKey(item) !== key)]
              : latest.holdingsByPortfolio[target].filter((item) => holdingKey(item) !== key);
          }

          const holdingsByPortfolio = { ...latest.holdingsByPortfolio, [target]: nextHoldings };
          const cashByPortfolio = { ...latest.cashByPortfolio, [target]: latest.cashByPortfolio[target] + cashChange };
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
        if (assetType === "stock") {
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
      }),
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

        const transactionsByPortfolio = normalizeTransactionsByPortfolio(saved.transactionsByPortfolio ?? legacyTransactions);
        const holdingsByPortfolio = normalizeHoldingsByPortfolio(saved.holdingsByPortfolio ?? legacyHoldings);
        let recoveryVersion = saved.recoveryVersion ?? "";

        // One-time recovery only. After the marker is persisted, normal user removals remain
        // removed and are never resurrected by this migration on future reloads.
        if (recoveryVersion !== RECOVERY_VERSION) {
          transactionsByPortfolio["fidelity-401k"] = mergeKnownRothTransactions(transactionsByPortfolio["fidelity-401k"]);
          holdingsByPortfolio.robinhood = restoreKnownRobinhoodIfEmpty(holdingsByPortfolio.robinhood);
          holdingsByPortfolio["fidelity-401k"] = mergeKnownRothRecovery(
            holdingsByPortfolio["fidelity-401k"],
            transactionsByPortfolio["fidelity-401k"],
          );
          recoveryVersion = RECOVERY_VERSION;
        }
        const cashByPortfolio = normalizeCashByPortfolio(saved.cashByPortfolio ?? legacyCash);
        const activePortfolioId = current.activePortfolioId;

        return {
          ...current,
          ...saved,
          activePortfolioId,
          holdingsByPortfolio,
          transactionsByPortfolio,
          cashByPortfolio,
          recoveryVersion,
          ...visibleState(activePortfolioId, holdingsByPortfolio, transactionsByPortfolio, cashByPortfolio),
        };
      },
    },
  ),
);
