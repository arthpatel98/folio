"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AssetType, Holding, Transaction } from "@/types/portfolio";
import { holdings as robinhoodHoldings, transactions as robinhoodTransactions } from "@/lib/data/mock";
import { buildOptionSymbol } from "@/lib/options";
import { recordStockTrade, removeDcaPosition } from "@/lib/dca-storage";

export type DataPortfolioId = "robinhood" | "fidelity-401k" | "fidelity-roth";
export type ActivePortfolioId = DataPortfolioId | "all";

const holdingKey = (symbol: string, assetType: AssetType = "stock") =>
  `${assetType}:${symbol.trim().toUpperCase()}`;

const cloneHoldings = (items: Holding[]) => items.map((holding) => ({ ...holding }));
const sampleHoldings = cloneHoldings(robinhoodHoldings.slice(0, 5));

const initialHoldingsByPortfolio: Record<DataPortfolioId, Holding[]> = {
  robinhood: cloneHoldings(robinhoodHoldings),
  "fidelity-401k": cloneHoldings(sampleHoldings),
  "fidelity-roth": cloneHoldings(sampleHoldings),
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
    const key = holdingKey(holding.symbol, assetType);
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
  if (activePortfolioId === "all") {
    return {
      holdings: aggregateHoldings(Object.values(holdingsByPortfolio)),
      transactions: Object.values(transactionsByPortfolio).flat(),
      cash: Object.values(cashByPortfolio).reduce((sum, value) => sum + value, 0),
    };
  }

  return {
    holdings: holdingsByPortfolio[activePortfolioId],
    transactions: transactionsByPortfolio[activePortfolioId],
    cash: cashByPortfolio[activePortfolioId],
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
  setActivePortfolio: (portfolioId: ActivePortfolioId) => void;
  setRange: (range: string) => void;
  setCash: (cash: number) => void;
  addHolding: (holding: Holding) => void;
  updateHolding: (originalSymbol: string, originalAssetType: AssetType, holding: Holding) => void;
  removeHolding: (symbol: string, assetType: AssetType) => void;
  addTransaction: (transaction: Transaction) => void;
  executeTrade: (trade: { action: "buy" | "sell"; holding: Holding; quantity: number; price: number; tradeDate?: string; fees?: number }) => { ok: boolean; message?: string };
  updateStockQuotes: (quotes: Record<string, { currentPrice: number; previousClose: number }>) => void;
  updateOptionQuotes: (quotes: Record<string, { currentPrice: number; previousClose: number }>) => void;
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
      addHolding: (holding) =>
        set((state) => {
          const target = state.activePortfolioId === "all" ? "robinhood" : state.activePortfolioId;
          const normalized = { ...holding, assetType: holding.assetType ?? "stock" };
          const newKey = holdingKey(normalized.symbol, normalized.assetType);
          const updated = [
            normalized,
            ...state.holdingsByPortfolio[target].filter(
              (item) => holdingKey(item.symbol, item.assetType ?? "stock") !== newKey,
            ),
          ];
          const holdingsByPortfolio = { ...state.holdingsByPortfolio, [target]: updated };
          return {
            holdingsByPortfolio,
            ...visibleState(state.activePortfolioId, holdingsByPortfolio, state.transactionsByPortfolio, state.cashByPortfolio),
          };
        }),
      updateHolding: (originalSymbol, originalAssetType, holding) =>
        set((state) => {
          const target = state.activePortfolioId === "all" ? "robinhood" : state.activePortfolioId;
          const normalized = { ...holding, assetType: holding.assetType ?? "stock" };
          const originalKey = holdingKey(originalSymbol, originalAssetType);
          const newKey = holdingKey(normalized.symbol, normalized.assetType);
          const updated = [
            normalized,
            ...state.holdingsByPortfolio[target].filter((item) => {
              const key = holdingKey(item.symbol, item.assetType ?? "stock");
              return key !== originalKey && key !== newKey;
            }),
          ];
          const holdingsByPortfolio = { ...state.holdingsByPortfolio, [target]: updated };
          return {
            holdingsByPortfolio,
            ...visibleState(state.activePortfolioId, holdingsByPortfolio, state.transactionsByPortfolio, state.cashByPortfolio),
          };
        }),
      removeHolding: (symbol, assetType) =>
        set((state) => {
          const target = state.activePortfolioId === "all" ? "robinhood" : state.activePortfolioId;
          if (assetType === "stock") removeDcaPosition(target, symbol);
          const updated = state.holdingsByPortfolio[target].filter(
            (item) => holdingKey(item.symbol, item.assetType ?? "stock") !== holdingKey(symbol, assetType),
          );
          const holdingsByPortfolio = { ...state.holdingsByPortfolio, [target]: updated };
          return {
            holdingsByPortfolio,
            ...visibleState(state.activePortfolioId, holdingsByPortfolio, state.transactionsByPortfolio, state.cashByPortfolio),
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
      updateStockQuotes: (quotes) =>
        set((state) => {
          const portfolioIds: DataPortfolioId[] = ["robinhood", "fidelity-401k", "fidelity-roth"];
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
      updateOptionQuotes: (quotes) =>
        set((state) => {
          const portfolioIds: DataPortfolioId[] = ["robinhood", "fidelity-401k", "fidelity-roth"];
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
        const key = holdingKey(holding.symbol, assetType);
        const current = state.holdingsByPortfolio[target].find((item) => holdingKey(item.symbol, item.assetType ?? "stock") === key);
        const multiplier = assetType === "option" ? 100 : 1;
        const signedDelta = assetType === "option" ? quantity : (action === "buy" ? quantity : -quantity);
        const tradeValue = Math.abs(quantity) * price * multiplier;
        const cashChange = assetType === "option" ? -signedDelta * price * multiplier : (action === "sell" ? tradeValue : -tradeValue);

        if (assetType === "stock" && action === "sell" && (!current || quantity > current.shares)) {
          return { ok: false, message: current ? `Only ${current.shares} shares are available.` : "No matching open position was found." };
        }
        if (cashChange < 0 && state.cashByPortfolio[target] < Math.abs(cashChange)) {
          return { ok: false, message: `Insufficient cash. This purchase requires $${Math.abs(cashChange).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.` };
        }

        set((latest) => {
          const existing = latest.holdingsByPortfolio[target].find((item) => holdingKey(item.symbol, item.assetType ?? "stock") === key);
          const oldQuantityForRealized = existing?.shares ?? 0;
          const closesStock = assetType === "stock" && action === "sell";
          const closesOption = assetType === "option" && oldQuantityForRealized !== 0 && Math.sign(oldQuantityForRealized) !== Math.sign(signedDelta);
          const closedQuantity = closesStock ? Math.min(quantity, Math.abs(oldQuantityForRealized)) : closesOption ? Math.min(Math.abs(signedDelta), Math.abs(oldQuantityForRealized)) : 0;
          const realizedCostBasis = closedQuantity * (existing?.averageCost ?? holding.averageCost) * multiplier;
          const realizedProceeds = closedQuantity * price * multiplier;
          const realizedGain = closedQuantity > 0
            ? (assetType === "option"
                ? (price - (existing?.averageCost ?? holding.averageCost)) * closedQuantity * multiplier * Math.sign(oldQuantityForRealized)
                : realizedProceeds - realizedCostBasis) - fees
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
              nextHoldings = latest.holdingsByPortfolio[target].filter((item) => holdingKey(item.symbol, item.assetType ?? "stock") !== key);
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
              nextHoldings = [merged, ...latest.holdingsByPortfolio[target].filter((item) => holdingKey(item.symbol, item.assetType ?? "stock") !== key)];
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
            nextHoldings = [merged, ...latest.holdingsByPortfolio[target].filter((item) => holdingKey(item.symbol, item.assetType ?? "stock") !== key)];
          } else {
            const remaining = (existing?.shares ?? 0) - quantity;
            nextHoldings = remaining > 0
              ? [{ ...existing!, shares: remaining, updatedAt: "Just now" }, ...latest.holdingsByPortfolio[target].filter((item) => holdingKey(item.symbol, item.assetType ?? "stock") !== key)]
              : latest.holdingsByPortfolio[target].filter((item) => holdingKey(item.symbol, item.assetType ?? "stock") !== key);
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
            fees: Number.isFinite(fees) ? Math.max(0, fees) : 0,
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
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<State> & {
          holdings?: Holding[];
          transactions?: Transaction[];
          cash?: number;
        };

        // Migrate users from the original single-portfolio storage without losing Robinhood edits.
        const holdingsByPortfolio = saved.holdingsByPortfolio ?? {
          ...initialHoldingsByPortfolio,
          robinhood: (saved.holdings ?? initialHoldingsByPortfolio.robinhood).map((holding) => ({
            ...holding,
            assetType: holding.assetType ?? "stock",
          })),
        };
        const transactionsByPortfolio = saved.transactionsByPortfolio ?? {
          ...initialTransactionsByPortfolio,
          robinhood: saved.transactions ?? initialTransactionsByPortfolio.robinhood,
        };
        const cashByPortfolio = saved.cashByPortfolio ?? {
          ...initialCashByPortfolio,
          robinhood: typeof saved.cash === "number" ? saved.cash : initialCashByPortfolio.robinhood,
        };
        const activePortfolioId = current.activePortfolioId;

        return {
          ...current,
          ...saved,
          activePortfolioId,
          holdingsByPortfolio,
          transactionsByPortfolio,
          cashByPortfolio,
          ...visibleState(activePortfolioId, holdingsByPortfolio, transactionsByPortfolio, cashByPortfolio),
        };
      },
    },
  ),
);
