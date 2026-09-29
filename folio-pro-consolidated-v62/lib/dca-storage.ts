"use client";

import { builtInDcaPositions, DcaPosition } from "@/lib/dca-data";
import type { DataPortfolioId } from "@/store/portfolio-store";
import type { AssetType } from "@/types/portfolio";
import { PORTFOLIO_ID_SCHEMA_VERSION, swapLegacyFidelityId } from "@/lib/portfolio-id-migration";

export const DCA_STORAGE_KEY = "folio-dca-positions-v3";
export const DCA_UPDATED_EVENT = "folio-dca-updated";
export const DCA_SELECTED_POSITION_KEY = "folio-dca-selected-position";
const DCA_ID_SCHEMA_KEY = "folio-dca-portfolio-id-schema-version";

const clone = (position: DcaPosition): DcaPosition => ({ ...position, lots: position.lots.map((lot) => ({ ...lot })) });
const lotIdFor = (positionId: string, lot: { id?: string; date: string; price: unknown; shares: unknown }, lotIndex: number) =>
  lot.id || `lot-${positionId}-${lot.date || "unknown"}-${Number(lot.price) || 0}-${lotIndex}`;

function normalizeDate(value: string) {
  if (!value || value === "Future" || /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

function migrate(positions: DcaPosition[]) {
  return positions.map((position) => ({
    ...position,
    portfolioId: position.id === "ONDS-B" ? "fidelity-401k" : (position.portfolioId ?? "robinhood"),
    lots: position.lots.map((lot, lotIndex) => ({ ...lot, id: lotIdFor(position.id, lot, lotIndex), date: normalizeDate(lot.date) })),
  }));
}

export function loadDcaPositions(): DcaPosition[] {
  if (typeof window === "undefined") return builtInDcaPositions.map(clone);
  try {
    const saved = window.localStorage.getItem(DCA_STORAGE_KEY);
    if (saved) {
      let parsed = JSON.parse(saved) as DcaPosition[];
      if (window.localStorage.getItem(DCA_ID_SCHEMA_KEY) !== String(PORTFOLIO_ID_SCHEMA_VERSION)) {
        parsed = parsed.map((position) => ({ ...position, portfolioId: swapLegacyFidelityId(position.portfolioId) }));
        window.localStorage.setItem(DCA_ID_SCHEMA_KEY, String(PORTFOLIO_ID_SCHEMA_VERSION));
        window.localStorage.setItem(DCA_STORAGE_KEY, JSON.stringify(parsed));
      }
      return migrate(parsed);
    }
    const previous = window.localStorage.getItem("folio-dca-positions-v2");
    if (previous) {
      const migrated = migrate(JSON.parse(previous) as DcaPosition[]);
      const remapped = migrated.map((position) => ({ ...position, portfolioId: swapLegacyFidelityId(position.portfolioId) }));
      window.localStorage.setItem(DCA_ID_SCHEMA_KEY, String(PORTFOLIO_ID_SCHEMA_VERSION));
      saveDcaPositions(remapped, false);
      return remapped;
    }
  } catch {}
  const initial = builtInDcaPositions.map(clone);
  window.localStorage.setItem(DCA_ID_SCHEMA_KEY, String(PORTFOLIO_ID_SCHEMA_VERSION));
  saveDcaPositions(initial, false);
  return initial;
}

export function saveDcaPositions(positions: DcaPosition[], notify = true) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DCA_STORAGE_KEY, JSON.stringify(positions));
  if (notify) window.dispatchEvent(new CustomEvent(DCA_UPDATED_EVENT));
}

export function upsertDcaPosition(position: DcaPosition) {
  const positions = loadDcaPositions();
  const index = positions.findIndex((item) => item.id === position.id);
  const next = positions.slice();
  if (index >= 0) next[index] = clone(position);
  else next.push(clone(position));
  saveDcaPositions(next);
}

export function removeDcaPosition(portfolioId: DataPortfolioId, symbolInput: string, assetType: AssetType = "stock") {
  if (typeof window === "undefined") return;
  const symbol = symbolInput.trim().toUpperCase();
  const positions = loadDcaPositions().filter((position) => {
    if (position.portfolioId !== portfolioId || position.symbol.trim().toUpperCase() !== symbol) return true;
    const isOptionPosition = position.id.includes("-option-") || /\b(?:call|put)\b/i.test(position.label ?? "");
    return assetType === "option" ? !isOptionPosition : isOptionPosition;
  });
  saveDcaPositions(positions);
}

function dateValue(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}


export type TaxLotMethod = "fifo" | "lifo" | "highest-cost" | "custom";

export type StockTaxLot = {
  id: string;
  positionId: string;
  positionLabel?: string;
  date: string;
  shares: number;
  price: number;
  amount: number;
  note?: string;
};

export type StockLotSale = {
  costBasis: number;
  remainingShares: number;
  remainingAverageCost: number;
  selectedLots: Array<{
    lotId: string;
    positionId: string;
    date: string;
    quantity: number;
    costPerShare: number;
    costBasis: number;
    term: "short-term" | "long-term";
  }>;
};

function isLongTermHolding(buyDate: string, sellDate?: string) {
  const buy = new Date(`${normalizeDate(buyDate)}T12:00:00`);
  const sell = new Date(`${normalizeDate(sellDate || new Date().toISOString().slice(0, 10))}T12:00:00`);
  if (Number.isNaN(buy.getTime()) || Number.isNaN(sell.getTime())) return false;
  const oneYearLater = new Date(buy);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  return sell.getTime() > oneYearLater.getTime();
}

export function getStockTaxLots(portfolioId: DataPortfolioId, symbolInput: string): StockTaxLot[] {
  if (typeof window === "undefined") return [];
  const symbol = symbolInput.trim().toUpperCase();
  return loadDcaPositions()
    .filter((position) => {
      if (position.portfolioId !== portfolioId || position.symbol.trim().toUpperCase() !== symbol) return false;
      return !(position.id.includes("-option-") || /\b(?:call|put)\b/i.test(position.label ?? ""));
    })
    .flatMap((position) => position.lots.map((lot, lotIndex) => {
      const shares = Number(lot.shares) || 0;
      const price = Number(lot.price) || (shares > 0 ? Number(lot.amount) / shares : 0);
      return {
        id: lotIdFor(position.id, lot, lotIndex),
        positionId: position.id,
        positionLabel: position.label,
        date: lot.date,
        shares,
        price,
        amount: Number(lot.amount) || shares * price,
        note: lot.note,
        future: lot.future,
      };
    }))
    .filter((lot: any) => !lot.future && lot.shares > 1e-9)
    .map(({ future, ...lot }: any) => lot);
}

export function consumeStockLots(
  portfolioId: DataPortfolioId,
  symbolInput: string,
  quantity: number,
  options?: {
    method?: TaxLotMethod;
    customSelection?: Record<string, number>;
    saleDate?: string;
  },
): StockLotSale | null {
  if (typeof window === "undefined" || quantity <= 0) return null;
  const symbol = symbolInput.trim().toUpperCase();
  const positions = loadDcaPositions();
  const candidates = positions
    .map((position, positionIndex) => ({ position, positionIndex }))
    .filter(({ position }) => {
      if (position.portfolioId !== portfolioId || position.symbol.trim().toUpperCase() !== symbol) return false;
      return !(position.id.includes("-option-") || /\b(?:call|put)\b/i.test(position.label ?? ""));
    });

  const allLots = candidates.flatMap(({ position, positionIndex }) =>
    position.lots.map((lot, lotIndex) => ({
      lot,
      position,
      positionIndex,
      lotIndex,
      id: lotIdFor(position.id, lot, lotIndex),
      shares: Number(lot.shares) || 0,
      price: Number(lot.price) || ((Number(lot.shares) || 0) > 0 ? Number(lot.amount) / Number(lot.shares) : 0),
    }))
  ).filter(({ lot, shares }) => !lot.future && shares > 1e-9);

  const available = allLots.reduce((sum, item) => sum + item.shares, 0);
  if (available + 1e-9 < quantity || candidates.length === 0) return null;

  const method = options?.method ?? "fifo";
  let orderedLots = allLots.slice();
  if (method === "lifo") orderedLots.sort((a, b) => dateValue(b.lot.date) - dateValue(a.lot.date));
  else if (method === "highest-cost") orderedLots.sort((a, b) => b.price - a.price || dateValue(a.lot.date) - dateValue(b.lot.date));
  else orderedLots.sort((a, b) => dateValue(a.lot.date) - dateValue(b.lot.date));

  const requestedById = options?.customSelection ?? {};
  if (method === "custom") {
    const customTotal = allLots.reduce((sum, item) => sum + Math.max(0, Math.min(item.shares, Number(requestedById[item.id]) || 0)), 0);
    if (Math.abs(customTotal - quantity) > 1e-6) return null;
    orderedLots = allLots.filter((item) => (Number(requestedById[item.id]) || 0) > 0);
  }

  let remainingToSell = quantity;
  let costBasis = 0;
  const selectedLots: StockLotSale["selectedLots"] = [];

  for (const item of orderedLots) {
    if (remainingToSell <= 1e-9) break;
    const requested = method === "custom"
      ? Math.max(0, Math.min(item.shares, Number(requestedById[item.id]) || 0))
      : Math.min(item.shares, remainingToSell);
    if (requested <= 1e-9) continue;
    const removed = Math.min(requested, remainingToSell);
    const lotCost = removed * item.price;
    costBasis += lotCost;
    remainingToSell -= removed;
    selectedLots.push({
      lotId: item.id,
      positionId: item.position.id,
      date: item.lot.date,
      quantity: removed,
      costPerShare: item.price,
      costBasis: lotCost,
      term: isLongTermHolding(item.lot.date, options?.saleDate) ? "long-term" : "short-term",
    });
    const nextShares = item.shares - removed;
    positions[item.positionIndex].lots[item.lotIndex] = {
      ...item.lot,
      id: item.id,
      shares: nextShares,
      amount: nextShares * item.price,
    };
  }

  if (remainingToSell > 1e-6) return null;

  candidates.forEach(({ positionIndex }) => {
    positions[positionIndex].lots = positions[positionIndex].lots.filter((lot) => lot.future || (Number(lot.shares) || 0) > 1e-9);
  });
  const remainingLots = candidates.flatMap(({ positionIndex }) => positions[positionIndex].lots).filter((lot) => !lot.future);
  const remainingShares = remainingLots.reduce((sum, lot) => sum + (Number(lot.shares) || 0), 0);
  const remainingCost = remainingLots.reduce((sum, lot) => sum + (Number(lot.amount) || ((Number(lot.shares) || 0) * (Number(lot.price) || 0))), 0);
  saveDcaPositions(positions);
  return {
    costBasis,
    remainingShares,
    remainingAverageCost: remainingShares > 0 ? remainingCost / remainingShares : 0,
    selectedLots,
  };
}

export function recordStockTrade(portfolioId: DataPortfolioId, symbolInput: string, action: "buy" | "sell", quantity: number, price: number, date: string) {
  if (typeof window === "undefined" || quantity <= 0 || price <= 0) return;
  const symbol = symbolInput.trim().toUpperCase();
  const positions = loadDcaPositions();
  let index = positions.findIndex((position) => position.portfolioId === portfolioId && position.symbol.trim().toUpperCase() === symbol);

  if (index < 0 && action === "buy") {
    positions.push({ id: `PORTFOLIO-${portfolioId}-${symbol}`, symbol, label: symbol, sellPrice: "", custom: true, portfolioId, lots: [] });
    index = positions.length - 1;
  }
  if (index < 0) return;

  const position = clone(positions[index]);
  if (action === "buy") {
    position.lots.push({ id: `lot-${position.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, amount: quantity * price, shares: quantity, price, date: normalizeDate(date), future: false, note: "Added From Holdings Purchase" });
  } else {
    let remaining = quantity;
    const ordered = position.lots.map((lot, lotIndex) => ({ lot, lotIndex })).filter(({ lot }) => !lot.future && Number(lot.shares) > 0).sort((a, b) => dateValue(a.lot.date) - dateValue(b.lot.date));
    for (const { lotIndex } of ordered) {
      if (remaining <= 0) break;
      const lot = position.lots[lotIndex];
      const shares = Number(lot.shares) || 0;
      const removed = Math.min(shares, remaining);
      const nextShares = shares - removed;
      remaining -= removed;
      position.lots[lotIndex] = { ...lot, shares: nextShares, amount: nextShares * (Number(lot.price) || 0) };
    }
    position.lots = position.lots.filter((lot) => lot.future || Number(lot.shares) > 0);
  }
  positions[index] = position;
  saveDcaPositions(positions);
}
