"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Download, FileDown, Pencil, Search, Trash2, Upload, X } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/utils";
import { usePortfolioStore } from "@/store/portfolio-store";

type TradeType = "stock" | "option";

type RealizedPosition = {
  id: string;
  symbol: string;
  type: TradeType;
  amount: number;
  fees: number;
  lastSellDate: string;
  pat: number | null;
  loss: number | null;
  patNeeded: number | null;
  comment: string;
  dividendAmount: number;
  dividendNraWithholding: number;
  lastDividendDate: string;
  quantity?: number;
  sellPrice?: number;
  costBasis?: number;
  proceeds?: number;
  optionDetails?: string;
  sourceTransaction?: boolean;
  sourceTransactionIds?: string[];
  manualFees?: boolean;
  feeTransactionSignature?: string;
};

type ImportedRow = Record<string, unknown>;

type PositionGroup = {
  symbol: string;
  positions: RealizedPosition[];
  amount: number;
  fees: number;
  patNeeded: number;
  latestDate: string;
  stockCount: number;
  optionCount: number;
  dividendAmount: number;
  dividendNraWithholding: number;
  lastDividendDate: string;
  quantity?: number;
  sellPrice?: number;
  costBasis?: number;
  proceeds?: number;
  optionDetails?: string;
  sourceTransaction?: boolean;
  sourceTransactionIds?: string[];
};

type SortKey = "symbol" | "mix" | "amount" | "fees" | "latestDate" | "patNeeded" | "dividendAmount" | "dividendNraWithholding" | "lastDividendDate";
type SortDirection = "asc" | "desc";

const STORAGE_KEY = "folio-realized-positions-v4";
const PREVIOUS_STORAGE_KEYS = ["folio-realized-positions-v3", "folio-realized-positions-v2"];
const REALIZED_SORT_STORAGE_KEY = "folio-realized-sort-preference";
type RealizedPortfolioId = "robinhood" | "fidelity-401k" | "fidelity-roth";
type PositionsByPortfolio = Record<RealizedPortfolioId, RealizedPosition[]>;

const seedRows: Array<[string, number, number, string]> = [
  ["IREN", 9761.96, 0.7, "May 27, 2026"], ["HOOD", 8214.02, 0.4, "Sep 30, 2025"],
  ["CIFR", 5781.16, 0.55, "May 5, 2026"], ["HIMS", 2497.68, 0.22, "Jul 23, 2025"],
  ["TEM", 1741.99, 0.03, "Oct 2, 2025"], ["NBIS", 1563.12, 0.06, "May 21, 2026"],
  ["MMYT", 1278.1, 0.87, "Feb 10, 2026"], ["PLTR", 1269.61, 0.34, "Jul 7, 2026"],
  ["MSTR", 1255.34, 0.21, "Dec 4, 2024"], ["AGL", 1220.07, 0.47, "Apr 8, 2025"],
  ["APP", 1125.24, 0.41, "Apr 25, 2025"], ["VST", 930.43, 0.19, "Jan 15, 2025"],
  ["TSLA", 836.88, 0.17, "Jul 17, 2025"], ["BMNR", 789.48, 0.02, "Oct 6, 2025"],
  ["NVDA", 783.15, 0.17, "Oct 21, 2024"], ["META", 606.13, 0.2, "Jul 10, 2026"],
  ["OKLO", 570.94, 0.03, "Sep 11, 2025"], ["RDDT", 552.31, 0.06, "Jun 4, 2025"],
  ["MOD", 533.16, 0.06, "Aug 30, 2024"], ["ASTS", 389.57, 0.12, "Jun 29, 2026"],
  ["VRT", 318.56, 0.17, "May 14, 2025"], ["DKNG", 300.23, 0.11, "Feb 10, 2025"],
  ["EOSE", 243.92, 0.03, "Nov 7, 2025"], ["DELL", 217.22, 0.06, "Nov 21, 2024"],
  ["GOOGL", 151.92, 0, "Dec 30, 2025"], ["RKLB", 139.52, 0.02, "Aug 8, 2025"],
  ["SPXC", 120.36, 0.17, "May 5, 2026"], ["NFLX", 103.49, 0, "Sep 4, 2025"],
  ["CNMD", 69.12, 0.02, "Nov 13, 2024"], ["SITM", 63.81, 0.03, "Jul 9, 2026"],
  ["SPOT", 63.6, 0, "Sep 18, 2025"], ["TSM", 61.85, 0, "Feb 6, 2026"],
  ["GME", 51.63, 0.08, "Jul 12, 2024"], ["SPCX", 44, 0, "Jun 15, 2026"],
  ["AMD", 40.26, 0.02, "Oct 4, 2024"], ["AMAT", 39.61, 0.09, "Feb 10, 2026"],
  ["JPM", 35.45, 0.02, "Jul 9, 2024"], ["ALB", 31.05, 0, "Mar 1, 2024"],
  ["AMZN", 15.79, 0.03, "Jun 21, 2024"], ["ADM", 8.27, 0, "Mar 19, 2024"],
  ["SGML", 8.22, 0, "May 3, 2024"], ["AMR", 7.97, 0.02, "Feb 6, 2025"],
  ["RHP", 6.23, 0.03, "Feb 6, 2025"], ["MSFT", 4.82, 0, "May 3, 2024"],
  ["JEF", 2.5, 0, "May 17, 2024"], ["COIN", 1.52, 0.09, "Dec 4, 2024"],
  ["BGNE", 0.57, 0, "Aug 6, 2024"], ["CALX", 0.4, 0, "May 22, 2024"],
  ["ACLS", 0.23, 0, "May 20, 2024"], ["CELH", -287.39, 0, "Aug 18, 2025"],
  ["CRWV", -414.8, 0.06, "May 6, 2026"], ["SMCI", -796.1, 0, "Jul 28, 2025"],
  ["DUOL", -844.64, 0, "Mar 25, 2026"], ["WDAY", -1614.91, 0.03, "Feb 4, 2026"],
  ["RTCJF", -1931, 7.97, "May 15, 2025"],
];

const initialPositions = seedRows.map(([symbol, amount, fees, date], index) =>
  makePosition(symbol, amount, fees, date, `default-${index}`),
);

function splitSymbolAndType(value: string): { symbol: string; type: TradeType } {
  const cleaned = value.trim();
  const isOption = /\boption\s*$/i.test(cleaned);
  const symbol = cleaned.replace(/\s*option\s*$/i, "").trim().toUpperCase();
  return { symbol, type: isOption ? "option" : "stock" };
}

function makePosition(rawSymbol: string, amount: number, fees: number, lastSellDate: string, id?: string): RealizedPosition {
  const { symbol, type } = splitSymbolAndType(rawSymbol);
  return {
    id: id ?? `${symbol}-${lastSellDate}-${crypto.randomUUID()}`,
    symbol,
    type,
    amount,
    fees,
    lastSellDate: lastSellDate.trim(),
    pat: null,
    loss: null,
    patNeeded: null,
    comment: "",
    dividendAmount: 0,
    dividendNraWithholding: 0,
    lastDividendDate: "",
  };
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findValue(row: ImportedRow, aliases: string[]) {
  const matchingKey = Object.keys(row).find((key) => aliases.includes(normalizeHeader(key)));
  return matchingKey ? row[matchingKey] : undefined;
}

function parseMoney(value: unknown) {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "")
    .replace(/\(([^)]+)\)/, "-$1")
    .replace(/[$,\s]/g, "")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function normalizeDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return formatDate(value);
  if (typeof value === "number") {
    const excelDate = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(excelDate.getTime()) ? "" : formatDate(excelDate);
  }
  const text = String(value ?? "").trim();
  if (!text) return "";
  const numericDate = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/);
  if (numericDate) {
    const month = Number(numericDate[1]);
    const day = Number(numericDate[2]);
    let year = Number(numericDate[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) return formatDate(date);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : formatDate(parsed);
}

function dateInputValue(value: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// PAT Needed is only shown when the loss is greater than the profit after tax (PAT).
function derivedPatNeeded(pat: number | null, loss: number | null) {
  if (pat === null || loss === null || loss <= pat) return null;
  return loss - pat;
}

function normalizeOptionalMoney(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = parseMoney(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function findImportedField(row: ImportedRow, aliases: string[]) {
  const matchingKey = Object.keys(row).find((key) => aliases.includes(normalizeHeader(key)));
  if (!matchingKey) return { found: false, value: undefined as unknown };
  const value = row[matchingKey];
  const hasValue = value !== null && value !== undefined && String(value).trim() !== "";
  return { found: hasValue, value };
}

function shouldRemoveByComment(comment: unknown) {
  return /\b(?:market\s+sell|limit\s+sell|call|put)\b/i.test(String(comment ?? "").trim());
}

function applyImportedUpdates(current: RealizedPosition[], rows: ImportedRow[]) {
  const updated = current.map((position) => ({ ...position }));
  let matchedRows = 0;
  let addedRows = 0;
  let updatedCells = 0;

  rows.forEach((row) => {
    const importedComment = findImportedField(row, ["comment", "comments", "notes", "note"]);
    if (importedComment.found && shouldRemoveByComment(importedComment.value)) return;
    const rawTicker = String(findValue(row, ["stocksell", "stocksold", "stock", "symbol", "ticker"]) ?? "").trim();
    if (!rawTicker || normalizeHeader(rawTicker) === "total") return;
    const parsedSymbol = splitSymbolAndType(rawTicker);
    const rawType = String(findValue(row, ["type", "assettype", "securitytype"]) ?? "").trim().toLowerCase();
    const type: TradeType = rawType.includes("option") ? "option" : rawType.includes("stock") ? "stock" : parsedSymbol.type;
    let targetIndex = updated.findIndex((position) => position.symbol === parsedSymbol.symbol && position.type === type);
    if (targetIndex < 0) {
      const sellDate = findImportedField(row, ["lastselldate", "selldate", "date"]);
      updated.push(makePosition(parsedSymbol.symbol + (type === "option" ? " Option" : ""), 0, 0, sellDate.found ? normalizeDate(sellDate.value) : ""));
      targetIndex = updated.length - 1;
      addedRows += 1;
    }

    const target = updated[targetIndex];
    let rowUpdates = 0;
    const setMoney = (field: "amount" | "fees" | "dividendAmount" | "dividendNraWithholding", aliases: string[]) => {
      const imported = findImportedField(row, aliases);
      if (imported.found) { target[field] = parseMoney(imported.value); rowUpdates += 1; }
    };
    const setOptionalMoney = (field: "pat" | "loss", aliases: string[]) => {
      const imported = findImportedField(row, aliases);
      if (imported.found) { target[field] = normalizeOptionalMoney(imported.value); rowUpdates += 1; }
    };
    const setDate = (field: "lastSellDate" | "lastDividendDate", aliases: string[]) => {
      const imported = findImportedField(row, aliases);
      if (imported.found) { target[field] = normalizeDate(imported.value); rowUpdates += 1; }
    };

    setMoney("amount", ["amount", "realizedpl", "realizedgainloss", "gainloss"]);
    setMoney("fees", ["fees", "fee"]);
    setDate("lastSellDate", ["lastselldate", "selldate", "date"]);
    setOptionalMoney("pat", ["pat", "profitaftertax"]);
    setOptionalMoney("loss", ["loss"]);
    setMoney("dividendAmount", ["dividendamount", "stockdividend", "stockdividends", "dividend"]);
    setMoney("dividendNraWithholding", ["dividendnrawithholding", "nrawithholding", "withholding"]);
    setDate("lastDividendDate", ["lastdividenddate", "lastdivdate", "dividenddate"]);
    if (importedComment.found) { target.comment = String(importedComment.value).trim(); rowUpdates += 1; }
    if (rowUpdates > 0) { target.patNeeded = derivedPatNeeded(target.pat, target.loss); matchedRows += 1; updatedCells += rowUpdates; }
  });
  return { positions: updated.filter((position) => !shouldRemoveByComment(position.comment)), matchedRows, addedRows, updatedCells };
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function Page() {
  const activePortfolioId = usePortfolioStore((state) => state.activePortfolioId);
  const transactionsByPortfolio = usePortfolioStore((state) => state.transactionsByPortfolio);
  const defaultPositionsByPortfolio = useMemo<PositionsByPortfolio>(() => ({
    robinhood: initialPositions,
    "fidelity-401k": initialPositions.filter((item) => item.symbol === "IREN").map((item) => ({ ...item, id: `401k-${item.id}` })),
    "fidelity-roth": initialPositions.filter((item) => item.symbol === "IREN").map((item) => ({ ...item, id: `roth-${item.id}` })),
  }), []);
  const [positionsByPortfolio, setPositionsByPortfolio] = useState<PositionsByPortfolio>(defaultPositionsByPortfolio);
  const [editingPosition, setEditingPosition] = useState<RealizedPosition | null>(null);
  const [message, setMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set());
  const [selectedPositionIds, setSelectedPositionIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("amount");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetPortfolioId: RealizedPortfolioId = activePortfolioId === "all" ? "robinhood" : activePortfolioId;
  const positions = positionsByPortfolio[targetPortfolioId];
  const setPositions = (updater: RealizedPosition[] | ((current: RealizedPosition[]) => RealizedPosition[])) => {
    setPositionsByPortfolio((current) => ({
      ...current,
      [targetPortfolioId]: typeof updater === "function" ? updater(current[targetPortfolioId]) : updater,
    }));
  };

  useEffect(() => {
    const currentSaved = window.localStorage.getItem(STORAGE_KEY);
    const previousSaved = PREVIOUS_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
    const saved = currentSaved ?? previousSaved;
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as PositionsByPortfolio | Array<Partial<RealizedPosition>>;
        const migratePositions = (items: Array<Partial<RealizedPosition>>) => items.map((position, index) => {
          const split = splitSymbolAndType(String(position.symbol ?? ""));
          const pat = normalizeOptionalMoney(position.pat);
          const loss = normalizeOptionalMoney(position.loss);
          return {
            id: position.id ?? `migrated-${index}-${crypto.randomUUID()}`,
            symbol: split.symbol,
            type: position.type === "option" ? "option" : split.type,
            amount: Number(position.amount) || 0,
            fees: Number(position.fees) || 0,
            lastSellDate: normalizeDate(position.lastSellDate),
            pat, loss, patNeeded: derivedPatNeeded(pat, loss), comment: position.comment ?? "",
            dividendAmount: Number(position.dividendAmount) || 0,
            dividendNraWithholding: Number(position.dividendNraWithholding) || 0,
            lastDividendDate: normalizeDate(position.lastDividendDate),
            optionDetails: position.optionDetails,
            sourceTransaction: Boolean(position.sourceTransaction),
            sourceTransactionIds: Array.isArray(position.sourceTransactionIds) ? position.sourceTransactionIds.filter((id): id is string => typeof id === "string") : [],
            manualFees: Boolean(position.manualFees),
            feeTransactionSignature: typeof position.feeTransactionSignature === "string" ? position.feeTransactionSignature : undefined,
          } satisfies RealizedPosition;
        }).filter((position) => !shouldRemoveByComment(position.comment));
        if (Array.isArray(parsed)) {
          const migrated = migratePositions(parsed);
          setPositionsByPortfolio({
            robinhood: migrated,
            "fidelity-401k": migrated.filter((item) => item.symbol === "IREN").map((item) => ({ ...item, id: `401k-${item.id}` })),
            "fidelity-roth": migrated.filter((item) => item.symbol === "IREN").map((item) => ({ ...item, id: `roth-${item.id}` })),
          });
        } else if (parsed && typeof parsed === "object") {
          setPositionsByPortfolio({
            robinhood: migratePositions(parsed.robinhood ?? []),
            "fidelity-401k": migratePositions(parsed["fidelity-401k"] ?? []),
            "fidelity-roth": migratePositions(parsed["fidelity-roth"] ?? []),
          });
        }
      } catch { window.localStorage.removeItem(STORAGE_KEY); }
    }
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (hasHydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(positionsByPortfolio));
  }, [hasHydrated, positionsByPortfolio]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(REALIZED_SORT_STORAGE_KEY) ?? "null") as { key?: SortKey; direction?: SortDirection } | null;
      if (saved?.key && ["symbol", "amount", "fees", "mix", "latestDate", "patNeeded", "dividendAmount", "dividendNraWithholding", "lastDividendDate"].includes(saved.key)) setSortKey(saved.key);
      if (saved?.direction === "asc" || saved?.direction === "desc") setSortDirection(saved.direction);
    } catch {}
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(REALIZED_SORT_STORAGE_KEY, JSON.stringify({ key: sortKey, direction: sortDirection })); } catch {}
  }, [sortDirection, sortKey]);

  const visiblePositions = useMemo(() => {
    const portfolioIds: RealizedPortfolioId[] = activePortfolioId === "all"
      ? ["robinhood", "fidelity-401k", "fidelity-roth"]
      : [activePortfolioId];
    const feeTransactionSignature = portfolioIds.flatMap((portfolioId) => transactionsByPortfolio[portfolioId])
      .map((transaction) => `${transaction.id}:${transaction.fees}:${transaction.realizedGain ?? ""}`)
      .sort().join("|");
    const base: RealizedPosition[] = portfolioIds.flatMap((portfolioId) => positionsByPortfolio[portfolioId].map((position) => {
      const keepManualFees = position.manualFees && position.feeTransactionSignature === feeTransactionSignature;
      return {
        ...position,
        fees: position.manualFees && !keepManualFees ? 0 : position.fees,
        manualFees: keepManualFees,
        feeTransactionSignature: keepManualFees ? position.feeTransactionSignature : undefined,
        sourceTransactionIds: [...(position.sourceTransactionIds ?? [])],
      };
    }));
    const alreadyApplied = new Set(base.flatMap((position) => position.sourceTransactionIds ?? []));

    portfolioIds.forEach((portfolioId) => {
      transactionsByPortfolio[portfolioId].forEach((transaction) => {
        if (transaction.realizedGain === undefined || !transaction.symbol || alreadyApplied.has(transaction.id)) return;
        const symbol = transaction.symbol.trim().toUpperCase();
        const type: TradeType = transaction.assetType === "option" ? "option" : "stock";
        const optionDetails = type === "option"
          ? `${symbol} ${transaction.optionStrike !== undefined ? `$${transaction.optionStrike}` : ""} ${transaction.optionType?.includes("put") ? "Put" : "Call"}${transaction.optionExpiry ? ` · ${normalizeDate(transaction.optionExpiry)}` : ""}`.replace(/\s+/g, " ").trim()
          : undefined;
        const sellDate = normalizeDate(transaction.date);
        const match = base.find((position) => position.symbol === symbol && position.type === type);
        if (match) {
          match.amount += transaction.realizedGain;
          if (!match.manualFees) match.fees += Number(transaction.fees) || 0;
          if (!match.lastSellDate || new Date(sellDate).getTime() >= new Date(match.lastSellDate).getTime()) match.lastSellDate = sellDate;
          match.comment = optionDetails ?? symbol;
          match.sourceTransaction = true;
          match.sourceTransactionIds = [...(match.sourceTransactionIds ?? []), transaction.id];
        } else {
          base.push({
            ...makePosition(symbol + (type === "option" ? " Option" : ""), transaction.realizedGain, Number(transaction.fees) || 0, sellDate, `sale-${portfolioId}-${transaction.id}`),
            optionDetails,
            sourceTransaction: true,
            sourceTransactionIds: [transaction.id],
            comment: optionDetails ?? symbol,
          });
        }
        alreadyApplied.add(transaction.id);
      });
    });

    const feeTotals = new Map<string, number>();
    portfolioIds.forEach((portfolioId) => {
      transactionsByPortfolio[portfolioId].forEach((transaction) => {
        const fees = Number(transaction.fees) || 0;
        if (fees <= 0 || transaction.realizedGain !== undefined || !transaction.symbol || !transaction.notes?.includes("Platform Fee")) return;
        const type: TradeType = transaction.assetType === "option" ? "option" : "stock";
        const key = `${transaction.symbol.trim().toUpperCase()}:${type}`;
        feeTotals.set(key, (feeTotals.get(key) ?? 0) + fees);
      });
    });
    feeTotals.forEach((fees, key) => {
      const separator = key.lastIndexOf(":");
      const symbol = key.slice(0, separator);
      const type = key.slice(separator + 1) as TradeType;
      const match = base.find((position) => position.symbol === symbol && position.type === type);
      if (match) { if (!match.manualFees) match.fees += fees; }
      else base.push(makePosition(symbol + (type === "option" ? " Option" : ""), 0, fees, "", `tracked-fee-${symbol}-${type}`));
    });
    return base;
  }, [activePortfolioId, positionsByPortfolio, transactionsByPortfolio]);

  const totals = useMemo(() => ({
    realized: visiblePositions.reduce((sum, item) => sum + item.amount, 0),
    fees: visiblePositions.reduce((sum, item) => sum + item.fees, 0),
    patNeeded: 0,
    optionsPl: visiblePositions.filter((item) => item.type === "option").reduce((sum, item) => sum + item.amount, 0),
    stocksPl: visiblePositions.filter((item) => item.type === "stock").reduce((sum, item) => sum + item.amount, 0),
    dividendAmount: visiblePositions.reduce((sum, item) => sum + item.dividendAmount, 0),
    dividendNraWithholding: visiblePositions.reduce((sum, item) => sum + item.dividendNraWithholding, 0),
  }), [visiblePositions]);

  const groups = useMemo<PositionGroup[]>(() => {
    const map = new Map<string, RealizedPosition[]>();
    visiblePositions.forEach((position) => map.set(position.symbol, [...(map.get(position.symbol) ?? []), position]));
    return Array.from(map.entries()).map(([symbol, items]) => ({
      symbol,
      positions: [...items].sort((a, b) => b.amount - a.amount),
      amount: items.reduce((sum, item) => sum + item.amount, 0),
      fees: items.reduce((sum, item) => sum + item.fees, 0),
      patNeeded: derivedPatNeeded(items.reduce((sum, item) => sum + (item.pat ?? 0), 0), items.reduce((sum, item) => sum + (item.loss ?? 0), 0)) ?? 0,
      latestDate: [...items].sort((a, b) => new Date(b.lastSellDate).getTime() - new Date(a.lastSellDate).getTime())[0]?.lastSellDate ?? "",
      stockCount: items.filter((item) => item.type === "stock").length,
      optionCount: items.filter((item) => item.type === "option").length,
      dividendAmount: items.reduce((sum, item) => sum + item.dividendAmount, 0),
      dividendNraWithholding: items.reduce((sum, item) => sum + item.dividendNraWithholding, 0),
      lastDividendDate: [...items].filter((item) => item.lastDividendDate).sort((a, b) => new Date(b.lastDividendDate).getTime() - new Date(a.lastDividendDate).getTime())[0]?.lastDividendDate ?? "",
    }));
  }, [visiblePositions]);

  const totalPatNeeded = groups.reduce((sum, group) => sum + group.patNeeded, 0);
  const lossRecoveryTickers = groups.filter((group) => group.patNeeded > 0).length;

  const filteredAndSortedGroups = useMemo(() => {
    const term = searchTerm.trim().toUpperCase();
    const filtered = term ? groups.filter((group) => group.symbol.includes(term)) : groups;
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortKey === "symbol") comparison = a.symbol.localeCompare(b.symbol);
      else if (sortKey === "mix") comparison = (a.stockCount + a.optionCount) - (b.stockCount + b.optionCount);
      else if (sortKey === "latestDate" || sortKey === "lastDividendDate") comparison = new Date(a[sortKey] || 0).getTime() - new Date(b[sortKey] || 0).getTime();
      else comparison = a[sortKey] - b[sortKey];
      return comparison * direction;
    });
  }, [groups, searchTerm, sortDirection, sortKey]);

  const winners = groups.filter((group) => group.amount > 0);

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setMessage("");
    try {
      const XLSX = await import("xlsx");
      const extension = file.name.split(".").pop()?.toLowerCase();
      const workbook = extension === "csv" || extension === "tsv" || extension === "txt"
        ? XLSX.read(await file.text(), { type: "string", cellDates: true })
        : XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<ImportedRow>(firstSheet, { defval: "", raw: true });
      if (!rows.length) throw new Error("The selected file does not contain any data rows.");
      const result = applyImportedUpdates(positions, rows);
      if (!result.matchedRows) throw new Error("No ticker rows with recognized Realized P/L columns were found. Existing data was not changed.");
      setPositions(result.positions);
      setMessage(`${result.matchedRows} ticker row${result.matchedRows === 1 ? "" : "s"} imported into ${targetPortfolioId === "robinhood" ? "Robinhood" : targetPortfolioId === "fidelity-401k" ? "Fidelity Roth IRA" : "Fidelity 401(k)"}. ${result.addedRows} new ticker${result.addedRows === 1 ? " was" : "s were"} added and ${result.updatedCells} matching column${result.updatedCells === 1 ? " was" : "s were"} updated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The file could not be imported.");
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  }

  function exportCsv() {
    const header = ["Ticker", "Type", "Realized P/L", "Fees", "Last Sell Date", "PAT", "Loss", "PAT Needed", "Dividend Amount", "Dividend NRA Withholding", "Last Dividend Date", "Comment"];
    const rows = visiblePositions.map((item) => [
      item.symbol, item.type === "option" ? "Option" : "Stock", item.amount.toFixed(2), item.fees.toFixed(2),
      item.lastSellDate, item.pat ?? "-", item.loss ?? "-", derivedPatNeeded(item.pat, item.loss) ?? "-", item.dividendAmount.toFixed(2), item.dividendNraWithholding.toFixed(2), item.lastDividendDate || "-", item.comment || "-",
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `realized-pl-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const autoTable = autoTableModule.default;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(18);
    doc.text("Realized P/L Report", 14, 16);
    doc.setFontSize(10);
    doc.text(`Realized P/L: ${money(totals.realized)}   Fees: ${money(totals.fees)}   PAT Needed: ${money(totalPatNeeded)}   Dividends: ${money(totals.dividendAmount)}   NRA Withholding: ${money(totals.dividendNraWithholding)}`, 14, 23);
    autoTable(doc, {
      startY: 29,
      head: [["Ticker", "Type", "Realized P/L", "Fees", "Sell Date", "PAT", "Loss", "PAT Needed", "Dividend", "NRA Withholding", "Dividend Date", "Comment"]],
      body: visiblePositions.map((item) => [
        item.symbol, item.type === "option" ? "Option" : "Stock", money(item.amount), money(item.fees), item.lastSellDate || "-",
        item.pat === null ? "-" : money(item.pat), item.loss === null ? "-" : money(item.loss),
        derivedPatNeeded(item.pat, item.loss) === null ? "-" : money(derivedPatNeeded(item.pat, item.loss) ?? 0), money(item.dividendAmount), money(item.dividendNraWithholding), item.lastDividendDate || "-", item.comment || "-",
      ]),
      styles: { fontSize: 8 },
    });
    doc.save(`realized-pl-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function toggleGroup(symbol: string) {
    setExpandedSymbols((current) => {
      const next = new Set(current);
      if (next.has(symbol)) next.delete(symbol); else next.add(symbol);
      return next;
    });
  }


  function togglePositionSelection(id: string) {
    setSelectedPositionIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleGroupSelection(group: PositionGroup) {
    const ids = group.positions.map((position) => position.id);
    const allSelected = ids.every((id) => selectedPositionIds.has(id));
    setSelectedPositionIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  }

  function deleteSelectedPositions() {
    const count = selectedPositionIds.size;
    if (!count || !window.confirm(`Delete ${count} selected realized P/L entr${count === 1 ? "y" : "ies"}?`)) return;
    setPositionsByPortfolio((current) => ({
      robinhood: current.robinhood.filter((item) => !selectedPositionIds.has(item.id)),
      "fidelity-401k": current["fidelity-401k"].filter((item) => !selectedPositionIds.has(item.id)),
      "fidelity-roth": current["fidelity-roth"].filter((item) => !selectedPositionIds.has(item.id)),
    }));
    setSelectedPositionIds(new Set());
    setMessage(`${count} realized P/L entr${count === 1 ? "y was" : "ies were"} removed.`);
  }

  function saveEditedPosition() {
    if (!editingPosition) return;
    const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
    const amount = roundCurrency(editingPosition.amount);
    const fees = roundCurrency(editingPosition.fees);
    const pat = editingPosition.pat === null ? null : roundCurrency(editingPosition.pat);
    const loss = editingPosition.loss === null ? null : roundCurrency(editingPosition.loss);
    const currentFeeTransactionSignature = transactionsByPortfolio[targetPortfolioId]
      .map((transaction) => `${transaction.id}:${transaction.fees}:${transaction.realizedGain ?? ""}`)
      .sort().join("|");
    const cleaned = {
      ...editingPosition,
      symbol: editingPosition.symbol.trim().toUpperCase(),
      amount,
      fees,
      pat,
      loss,
      lastSellDate: normalizeDate(editingPosition.lastSellDate),
      lastDividendDate: normalizeDate(editingPosition.lastDividendDate),
      patNeeded: derivedPatNeeded(pat, loss),
      manualFees: true,
      feeTransactionSignature: currentFeeTransactionSignature,
    };
    if (!cleaned.symbol) return;
    if (shouldRemoveByComment(cleaned.comment)) {
      setPositions((current) => current.filter((item) => item.id !== cleaned.id));
      setSelectedPositionIds((current) => { const next = new Set(current); next.delete(cleaned.id); return next; });
      setEditingPosition(null);
      setMessage(`${cleaned.symbol} was removed because its comment matched an excluded trade description.`);
      return;
    }
    setPositions((current) => {
      const savedCopy = { ...cleaned, sourceTransaction: false };
      return current.some((item) => item.id === cleaned.id)
        ? current.map((item) => item.id === cleaned.id ? savedCopy : item)
        : [savedCopy, ...current];
    });
    setEditingPosition(null);
    setMessage(`${cleaned.symbol} was updated.`);
  }

  function removePosition(position: RealizedPosition) {
    if (!window.confirm(`Remove this ${position.type} entry for ${position.symbol}?`)) return;
    setPositions((current) => current.filter((item) => item.id !== position.id));
    setMessage(`${position.symbol} was removed.`);
  }

  function editNumber(field: "amount" | "fees" | "dividendAmount" | "dividendNraWithholding", value: string) {
    setEditingPosition((current) => current ? { ...current, [field]: parseMoney(value) } : current);
  }

  function editOptionalMoney(field: "pat" | "loss", value: string) {
    setEditingPosition((current) => {
      if (!current) return current;
      const updated = { ...current, [field]: value.trim() ? parseMoney(value) : null };
      return { ...updated, patNeeded: derivedPatNeeded(updated.pat, updated.loss) };
    });
  }

  function optionalMoney(value: number | null) {
    return value === null ? "-" : money(value);
  }

  function changeSort(key: SortKey) {
    if (sortKey === key) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDirection("asc"); }
  }

  function SortHeader({ label, column }: { label: string; column: SortKey }) {
    const isActive = sortKey === column;
    const SortIcon = !isActive ? ArrowUpDown : sortDirection === "asc" ? ArrowUp : ArrowDown;
    return <button type="button" onClick={() => changeSort(column)} className={`inline-flex items-center justify-center gap-1 hover:text-zinc-200 ${isActive ? "text-emerald-500" : ""}`} aria-label={`Sort By ${label} ${isActive ? (sortDirection === "asc" ? "Ascending" : "Descending") : ""}`} title={isActive ? `${label}: ${sortDirection === "asc" ? "Ascending" : "Descending"}` : `Sort By ${label}`}>
      {label}<SortIcon className="h-3.5 w-3.5" />
    </button>;
  }

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Realized P/L</h1>
          <p className="mt-1 text-sm text-zinc-500">Review Realized Results Grouped By Ticker, Including Stock And Option Trades.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <input ref={fileInputRef} className="hidden" type="file" accept=".csv" onChange={handleFileUpload} />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            <Upload className="mr-2 h-4 w-4" />{isImporting ? "Importing..." : "Import Document"}
          </Button>
          <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
          <Button variant="outline" onClick={exportPdf}><FileDown className="mr-2 h-4 w-4" />Export PDF</Button>
        </div>
      </div>

      {message && <p className="mt-4 text-sm text-emerald-500">{message}</p>}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Net Realized P/L" value={money(totals.realized)} />
        <MetricCard label="Options P/L Total" value={money(totals.optionsPl)} />
        <MetricCard label="Net Stocks P/L" value={money(totals.stocksPl)} />
        <MetricCard label="Profitable Tickers" value={`${winners.length} of ${groups.length}`} />
        <MetricCard label="Loss Recovery Tickers" value={lossRecoveryTickers.toLocaleString()} />
      </div>

      <Card className="mt-6 overflow-hidden p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-medium">Realized P/L By Ticker</h2>
            <p className="mt-1 text-xs text-zinc-500">Choose A Ticker Row To See Its Individual Stock And Option Entries.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex w-full flex-wrap justify-end gap-2">
              <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search Ticker..." className="pl-9" />
              </div>
            </div>
            <p className="text-xs text-zinc-500">{filteredAndSortedGroups.length} of {groups.length} Tickers</p>
          </div>
        </div>

        <div className="-mx-5 overflow-x-auto overscroll-x-contain px-5 pb-1">
          <table className="w-full min-w-[1600px] text-center text-sm">
            <thead className="border-y text-xs tracking-wide text-zinc-500">
              <tr>
                <th className="w-12 px-3 py-3" />
                <th className="sticky left-0 z-20 bg-white px-3 py-3 dark:bg-zinc-950"><SortHeader label="Ticker" column="symbol" /></th>
                <th className="px-3 py-3"><SortHeader label="Mix" column="mix" /></th>
                <th className="px-3 py-3"><SortHeader label="Realized P/L" column="amount" /></th>
                <th className="px-3 py-3"><SortHeader label="Fees" column="fees" /></th>
                <th className="px-3 py-3"><SortHeader label="Latest Sell Date" column="latestDate" /></th>
                <th className="px-3 py-3"><SortHeader label="PAT Needed" column="patNeeded" /></th>
                <th className="px-3 py-3"><SortHeader label="Dividend Amount" column="dividendAmount" /></th>
                <th className="px-3 py-3"><SortHeader label="Dividend NRA Withholding" column="dividendNraWithholding" /></th>
                <th className="px-3 py-3"><SortHeader label="Last Dividend Date" column="lastDividendDate" /></th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedGroups.map((group) => {
                const expanded = expandedSymbols.has(group.symbol);
                return (
                  <FragmentGroup key={group.symbol}>
                    <tr className="cursor-pointer border-b align-middle transition hover:bg-zinc-500/5" onClick={() => toggleGroup(group.symbol)}>
                      <td className="px-3 py-4">{expanded ? <ChevronDown className="mx-auto h-4 w-4" /> : <ChevronRight className="mx-auto h-4 w-4" />}</td>
                      <td className="sticky left-0 z-10 bg-white px-3 py-4 font-semibold group-hover:bg-zinc-50 dark:bg-zinc-950 dark:group-hover:bg-zinc-900">{group.symbol}</td>
                      <td className="px-3 py-4">
                        <div className="flex justify-center gap-2">
                          {group.stockCount > 0 && <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400">Stock {group.stockCount}</span>}
                          {group.optionCount > 0 && <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-xs font-medium text-violet-400">Option {group.optionCount}</span>}
                        </div>
                      </td>
                      <td className={`px-3 py-4 font-semibold tabular-nums ${group.amount < 0 ? "text-red-500" : "text-emerald-500"}`}>{money(group.amount)}</td>
                      <td className="px-3 py-4 tabular-nums text-zinc-500">{money(group.fees)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-zinc-500">{group.latestDate || "—"}</td>
                      <td className="px-3 py-4 tabular-nums">{group.patNeeded > 0 ? money(group.patNeeded) : "-"}</td>
                      <td className="px-3 py-4 tabular-nums text-emerald-500">{group.dividendAmount ? money(group.dividendAmount) : "-"}</td>
                      <td className="px-3 py-4 tabular-nums text-red-500">{group.dividendNraWithholding ? money(group.dividendNraWithholding) : "-"}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-zinc-500">{group.lastDividendDate || "—"}</td>
                    </tr>
                    {expanded && (
                      <tr className="border-b bg-zinc-500/[0.035]">
                        <td colSpan={10} className="p-0">
                          <div className="m-3 overflow-hidden rounded-lg border border-zinc-500/15">
                            <table className="w-full text-center text-xs">
                              <thead className="bg-zinc-500/5 tracking-wide text-zinc-500">
                                <tr>
                                  <th className="px-3 py-3">Type</th><th className="px-3 py-3">Realized P/L</th><th className="px-3 py-3">Fees</th>
                                  <th className="px-3 py-3">Sell Date</th><th className="px-3 py-3">PAT</th><th className="px-3 py-3">Loss</th>
                                  <th className="px-3 py-3">PAT Needed</th><th className="px-3 py-3">Dividend Amount</th><th className="px-3 py-3">Dividend NRA Withholding</th><th className="px-3 py-3">Last Dividend Date</th><th className="px-3 py-3">Comment</th><th className="px-3 py-3">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.positions.map((position) => (
                                  <tr key={position.id} className="border-t border-zinc-500/10">
                                    <td className="px-3 py-3"><span className={`rounded-md border px-2 py-1 font-medium ${position.type === "option" ? "border-violet-500/30 bg-violet-500/10 text-violet-400" : "border-blue-500/30 bg-blue-500/10 text-blue-400"}`}>{position.type === "option" ? "Option" : "Stock"}</span></td>
                                    <td className={`px-3 py-3 font-medium tabular-nums ${position.amount < 0 ? "text-red-500" : "text-emerald-500"}`}>{money(position.amount)}</td>
                                    <td className="px-3 py-3 tabular-nums text-zinc-500">{money(position.fees)}</td>
                                    <td className="whitespace-nowrap px-3 py-3 text-zinc-500">{position.lastSellDate || "—"}</td>
                                    <td className="px-3 py-3 tabular-nums text-emerald-500">{optionalMoney(position.pat)}</td>
                                    <td className="px-3 py-3 tabular-nums text-red-500">{optionalMoney(position.loss)}</td>
                                    <td className="px-3 py-3 tabular-nums">-</td>
                                    <td className="px-3 py-3 tabular-nums text-emerald-500">{position.dividendAmount ? money(position.dividendAmount) : "-"}</td>
                                    <td className="px-3 py-3 tabular-nums text-red-500">{position.dividendNraWithholding ? money(position.dividendNraWithholding) : "-"}</td>
                                    <td className="whitespace-nowrap px-3 py-3 text-zinc-500">{position.lastDividendDate || "—"}</td>
                                    <td className="max-w-64 whitespace-pre-wrap break-words px-3 py-3 text-zinc-500">{position.comment || "-"}</td>
                                    <td className="px-3 py-3">
                                      <div className="flex justify-center gap-2">
                                        <button onClick={(event) => { event.stopPropagation(); setEditingPosition({ ...position }); }} className="rounded-lg border border-zinc-500/20 p-2 text-zinc-400 hover:bg-zinc-500/10" aria-label={`Edit ${position.symbol}`}><Pencil size={14} /></button>
                                        <button onClick={(event) => { event.stopPropagation(); removePosition(position); }} className="rounded-lg border border-red-500/20 p-2 text-red-500 hover:bg-red-500/10" aria-label={`Remove ${position.symbol}`}><Trash2 size={14} /></button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </FragmentGroup>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 font-semibold">
              <tr>
                <td /><td className="px-3 py-4">Total</td><td />
                <td className={`px-3 py-4 tabular-nums ${totals.realized < 0 ? "text-red-500" : "text-emerald-500"}`}>{money(totals.realized)}</td>
                <td className="px-3 py-4 tabular-nums text-zinc-500">{money(totals.fees)}</td>
                <td />
                <td className="px-3 py-4 tabular-nums">{totalPatNeeded > 0 ? money(totalPatNeeded) : "-"}</td>
                <td className="px-3 py-4 tabular-nums text-emerald-500">{money(totals.dividendAmount)}</td>
                <td className="px-3 py-4 tabular-nums text-red-500">{money(totals.dividendNraWithholding)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {editingPosition && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <Card className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-b-none p-4 shadow-2xl sm:rounded-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-xl font-semibold">Edit Realized Entry</h2><p className="mt-1 text-sm text-zinc-500">Update This Stock Or Option Entry.</p></div>
              <button onClick={() => setEditingPosition(null)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-500/10" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">Ticker<Input value={editingPosition.symbol} onChange={(e) => setEditingPosition({ ...editingPosition, symbol: e.target.value })} /></label>
              <label className="space-y-2 text-sm font-medium">Type
                <select value={editingPosition.type} onChange={(e) => setEditingPosition({ ...editingPosition, type: e.target.value as TradeType })} className="flex h-10 w-full rounded-md border border-zinc-500/20 bg-transparent px-3 py-2 text-sm">
                  <option value="stock">Stock</option><option value="option">Option</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium">Last Sell Date<Input type="date" value={dateInputValue(editingPosition.lastSellDate)} onChange={(e) => setEditingPosition({ ...editingPosition, lastSellDate: e.target.value })} /></label>
              <label className="space-y-2 text-sm font-medium">Realized P/L<Input type="number" inputMode="decimal" step="0.01" value={editingPosition.amount === 0 ? "" : editingPosition.amount} onChange={(e) => editNumber("amount", e.target.value)} /></label>
              <label className="space-y-2 text-sm font-medium">Fees<Input type="number" inputMode="decimal" step="0.01" value={editingPosition.fees === 0 ? "" : editingPosition.fees} onChange={(e) => editNumber("fees", e.target.value)} /></label>
              <label className="space-y-2 text-sm font-medium">PAT<Input type="number" step="0.01" placeholder="-" value={editingPosition.pat ?? ""} onChange={(e) => editOptionalMoney("pat", e.target.value)} /></label>
              <label className="space-y-2 text-sm font-medium">Loss<Input type="number" step="0.01" placeholder="-" value={editingPosition.loss ?? ""} onChange={(e) => editOptionalMoney("loss", e.target.value)} /></label>
              <label className="space-y-2 text-sm font-medium">PAT Needed<Input readOnly placeholder="-" value={derivedPatNeeded(editingPosition.pat, editingPosition.loss) === null ? "" : money(derivedPatNeeded(editingPosition.pat, editingPosition.loss) ?? 0)} className="cursor-not-allowed bg-zinc-500/5 text-zinc-500" /></label>
              <label className="space-y-2 text-sm font-medium">Dividend Amount<div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span><Input type="number" step="0.01" min="0" className="pl-7" value={editingPosition.dividendAmount === 0 ? "" : editingPosition.dividendAmount} onChange={(e) => editNumber("dividendAmount", e.target.value)} /></div></label>
              <label className="space-y-2 text-sm font-medium">Dividend NRA Withholding<div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span><Input type="number" step="0.01" min="0" className="pl-7" value={editingPosition.dividendNraWithholding === 0 ? "" : editingPosition.dividendNraWithholding} onChange={(e) => editNumber("dividendNraWithholding", e.target.value)} /></div></label>
              <label className="space-y-2 text-sm font-medium">Last Dividend Date<Input type="date" value={dateInputValue(editingPosition.lastDividendDate)} onChange={(e) => setEditingPosition({ ...editingPosition, lastDividendDate: e.target.value })} /></label>
              <label className="space-y-2 text-sm font-medium sm:col-span-2">Comment<textarea rows={5} placeholder="-" value={editingPosition.comment} onChange={(e) => setEditingPosition({ ...editingPosition, comment: e.target.value })} className="flex min-h-28 w-full resize-y rounded-md border border-zinc-500/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={() => setEditingPosition(null)}>Cancel</Button><Button onClick={saveEditedPosition}>Save Changes</Button></div>
          </Card>
        </div>
      )}
    </div>
  );
}

function FragmentGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
