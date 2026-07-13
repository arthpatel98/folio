"use client";

import { builtInDcaPositions, DcaPosition } from "@/lib/dca-data";
import type { DataPortfolioId } from "@/store/portfolio-store";

export const DCA_STORAGE_KEY = "folio-dca-positions-v3";
export const DCA_UPDATED_EVENT = "folio-dca-updated";
export const DCA_SELECTED_POSITION_KEY = "folio-dca-selected-position";

const clone = (position: DcaPosition): DcaPosition => ({ ...position, lots: position.lots.map((lot) => ({ ...lot })) });

function normalizeDate(value: string) {
  if (!value || value === "Future" || /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

function migrate(positions: DcaPosition[]) {
  return positions.map((position) => ({
    ...position,
    portfolioId: position.id === "ONDS-B" ? "fidelity-roth" : (position.portfolioId ?? "robinhood"),
    lots: position.lots.map((lot) => ({ ...lot, date: normalizeDate(lot.date) })),
  }));
}

export function loadDcaPositions(): DcaPosition[] {
  if (typeof window === "undefined") return builtInDcaPositions.map(clone);
  try {
    const saved = window.localStorage.getItem(DCA_STORAGE_KEY);
    if (saved) return migrate(JSON.parse(saved) as DcaPosition[]);
    const previous = window.localStorage.getItem("folio-dca-positions-v2");
    if (previous) {
      const migrated = migrate(JSON.parse(previous) as DcaPosition[]);
      saveDcaPositions(migrated, false);
      return migrated;
    }
  } catch {}
  const initial = builtInDcaPositions.map(clone);
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

export function removeDcaPosition(portfolioId: DataPortfolioId, symbolInput: string) {
  if (typeof window === "undefined") return;
  const symbol = symbolInput.trim().toUpperCase();
  const positions = loadDcaPositions().filter((position) =>
    !(position.portfolioId === portfolioId && position.symbol.trim().toUpperCase() === symbol),
  );
  saveDcaPositions(positions);
}

function dateValue(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
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
    position.lots.push({ amount: quantity * price, shares: quantity, price, date: normalizeDate(date), future: false, note: "Added From Holdings Purchase" });
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
