"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Banknote, BriefcaseBusiness, CalendarDays, Download, Layers3, LockKeyhole, RefreshCw, Search, Star, TrendingUp, WalletCards } from "lucide-react";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { AddHoldingDialog } from "@/components/portfolio/add-holding-dialog";
import { EditCashDialog } from "@/components/portfolio/edit-cash-dialog";
import { Input } from "@/components/ui/input";
import { holdingMetrics, optionCollateral, portfolioSummary } from "@/lib/calculations/portfolio";
import { cn, money } from "@/lib/utils";
import { buildOptionSymbol } from "@/lib/options";
import { isUsMarketDay, isUsMarketOpen } from "@/lib/market-hours";
import { investmentAccounts } from "@/lib/savings-investments-data";
import { usePortfolioStore, visibleState } from "@/store/portfolio-store";
import type { Holding, OptionType } from "@/types/portfolio";
import * as XLSX from "xlsx";

function MetricBlock({ label, value, subvalue, positive, icon: Icon, tone = "green", valueExtra }: { label: string; value: string; subvalue?: React.ReactNode; positive?: boolean; icon: typeof BriefcaseBusiness; tone?: "green" | "red" | "blue" | "purple"; valueExtra?: React.ReactNode }) {
  const toneClass = tone === "red" ? "border-red-500/30 bg-red-500/[.06] text-red-400" : tone === "blue" ? "border-blue-500/30 bg-blue-500/[.06] text-blue-400" : tone === "purple" ? "border-violet-500/30 bg-violet-500/[.06] text-violet-400" : "border-emerald-500/30 bg-emerald-500/[.06] text-emerald-400";
  return <div className={cn("rounded-2xl border p-4 shadow-sm", toneClass)}><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-zinc-400">{label}</p><div className="rounded-lg bg-current/10 p-2"><Icon size={18}/></div></div><div className="mt-3 flex items-baseline justify-between gap-2"><p className={cn("text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white", positive === true && "text-emerald-500", positive === false && "text-red-500")}>{value}</p>{valueExtra}</div>{subvalue && <p className={cn("mt-1.5 whitespace-pre-line text-sm", positive === true && "text-emerald-400", positive === false && "text-red-400", positive === undefined && "text-zinc-500")}>{subvalue}</p>}</div>;
}

function PerformanceMiniCard({label,value,positive}:{label:string;value:string;positive:boolean}) {
  return <div className="rounded-3xl border border-white/10 bg-zinc-950/40 p-4 shadow-sm"><div className="text-xs font-medium text-zinc-400">{label}</div><div className={cn("mt-3 text-xl font-semibold tracking-tight",positive?"text-emerald-400":"text-rose-400")}>{value}</div></div>;
}

function PortfolioValueMetric({ value, dayReturn, dayReturnPct }: { value: number; dayReturn: number; dayReturnPct: number }) {
  const positive = dayReturn >= 0;
  return <div className={cn("min-w-0 rounded-2xl border p-3 shadow-sm sm:p-4", positive ? "border-emerald-500/30 bg-emerald-500/[.06]" : "border-red-500/30 bg-red-500/[.06]")}>
    <div className="flex min-w-0 items-center gap-2 text-xs text-zinc-500">
      <span className={cn("grid size-8 place-items-center rounded-lg", positive ? "bg-emerald-400/15 text-emerald-400" : "bg-red-400/15 text-red-400")}><WalletCards size={16}/></span>
      Portfolio Value
    </div>
    <div className="mt-3 break-words text-lg font-semibold text-zinc-950 dark:text-white sm:text-xl">{money(value)}</div>
    <div className="mt-3 flex flex-wrap gap-2">
      <span className={cn("rounded-lg border px-2 py-1 text-[11px] font-semibold", positive ? "border-emerald-400/20 bg-emerald-400/[.08] text-emerald-300" : "border-rose-400/20 bg-rose-400/[.08] text-rose-300")}>Day Return {dayReturn >= 0 ? "+" : "-"}{money(Math.abs(dayReturn))}</span>
      <span className={cn("rounded-lg border px-2 py-1 text-[11px] font-semibold", dayReturnPct >= 0 ? "border-emerald-400/20 bg-emerald-400/[.08] text-emerald-300" : "border-rose-400/20 bg-rose-400/[.08] text-rose-300")}>{dayReturnPct >= 0 ? "+" : ""}{dayReturnPct.toFixed(2)}%</span>
    </div>
  </div>;
}

const PORTFOLIO_CLOSE_SNAPSHOTS_KEY = "folio-portfolio-close-snapshots-v1";
const PERFORMANCE_ATH_KEY = "folio-portfolio-performance-all-time-high-v1";
const DEFAULT_PERFORMANCE_ATH: Record<string,{value:number;date:string}> = {
  robinhood:{value:108128,date:"2025-11-05"},
  "fidelity-roth":{value:20134,date:"2025-08-06"},
  "fidelity-401k":{value:21194,date:"2026-06-02"},
};
const HOLDINGS_ACCOUNT_NAMES: Record<string,string> = {robinhood:"Robinhood","fidelity-roth":"Fidelity Roth IRA","fidelity-401k":"Fidelity 401(k)"};
function compactDate(value:string){const d=new Date(`${value}T12:00:00`);return Number.isNaN(d.getTime())?value:d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});}


function easternMarketClock(date = new Date()) {
  const dateText = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour12: false, hour: "2-digit", minute: "2-digit" }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return { dateText, minutes: hour * 60 + minute };
}

export default function Page() {
  const activePortfolioId = usePortfolioStore((state) => state.activePortfolioId);
  const holdingsByPortfolio = usePortfolioStore((state) => state.holdingsByPortfolio);
  const transactionsByPortfolio = usePortfolioStore((state) => state.transactionsByPortfolio);
  const cashByPortfolio = usePortfolioStore((state) => state.cashByPortfolio);
  // Holdings is derived directly from the canonical per-portfolio buckets instead of the
  // store's compatibility cache. This makes cross-portfolio leakage impossible on switching.
  const portfolioView = useMemo(
    () => visibleState(activePortfolioId, holdingsByPortfolio, transactionsByPortfolio, cashByPortfolio),
    [activePortfolioId, cashByPortfolio, holdingsByPortfolio, transactionsByPortfolio],
  );
  const holdings = portfolioView.holdings;
  const cash = portfolioView.cash;
  const updateStockQuotes = usePortfolioStore((state) => state.updateStockQuotes);
  const updateOptionQuotes = usePortfolioStore((state) => state.updateOptionQuotes);
  const replaceHoldings = usePortfolioStore((state) => state.replaceHoldings);
  const [query, setQuery] = useState("");
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesError, setPricesError] = useState<string | null>(null);
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState<Date | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [closeSnapshots, setCloseSnapshots] = useState<Record<string, number>>({});
  const [performanceAth,setPerformanceAth]=useState<Record<string,{value:number;date:string}>>(DEFAULT_PERFORMANCE_ATH);
  const [editingAth,setEditingAth]=useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedQuery) return holdings;
    const compactQuery = normalizedQuery.replace(/[^a-z0-9]/g, "");
    return holdings.filter((holding) => {
      const optionTypeText = holding.optionType
        ? holding.optionType.replace(/-/g, " ")
        : "";
      const strikeText = holding.optionStrike != null
        ? `${holding.optionStrike} $${holding.optionStrike}`
        : "";
      const searchable = [
        holding.symbol,
        holding.company,
        holding.sector,
        holding.optionSymbol ?? "",
        optionTypeText,
        holding.optionType?.includes("call") ? "call" : "",
        holding.optionType?.includes("put") ? "put" : "",
        strikeText,
        holding.optionExpiry ?? "",
        holding.assetType === "option" ? "option contract" : "stock",
      ].join(" ").toLowerCase();
      const compactSearchable = searchable.replace(/[^a-z0-9]/g, "");
      return searchable.includes(normalizedQuery) ||
        (compactQuery.length > 0 && compactSearchable.includes(compactQuery));
    });
  }, [holdings, normalizedQuery]);

  const stocks = filtered.filter((holding) => (holding.assetType ?? "stock") === "stock");
  const isFidelity401k = activePortfolioId === "fidelity-401k";
  const options = isFidelity401k ? [] : filtered.filter((holding) => holding.assetType === "option");
  const displayedCash = isFidelity401k ? 0 : cash;
  const collateral = useMemo(() => isFidelity401k ? 0 : optionCollateral(holdings), [holdings, isFidelity401k]);
  const availableCash = displayedCash - collateral;
  const summary = useMemo(() => portfolioSummary(holdings, displayedCash), [holdings, displayedCash]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(PORTFOLIO_CLOSE_SNAPSHOTS_KEY) ?? "{}");
      if (saved && typeof saved === "object") setCloseSnapshots(saved);
    } catch {}
  }, []);

  useEffect(()=>{try{const saved=JSON.parse(window.localStorage.getItem(PERFORMANCE_ATH_KEY)??"{}");if(saved&&typeof saved==="object")setPerformanceAth(current=>({...current,...saved}));}catch{}},[]);

  useEffect(() => {
    const captureClose = () => {
      const now = new Date();
      const clock = easternMarketClock(now);
      if (!isUsMarketDay(now) || clock.minutes < 16 * 60) return;
      const key = `${activePortfolioId}:${clock.dateText}`;
      setCloseSnapshots((current) => {
        if (current[key] !== undefined) return current;
        const next = { ...current, [key]: summary.value };
        try { window.localStorage.setItem(PORTFOLIO_CLOSE_SNAPSHOTS_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
    };
    captureClose();
    const timer = window.setInterval(captureClose, 60_000);
    return () => window.clearInterval(timer);
  }, [activePortfolioId, summary.value]);

  const priorCloseValue = useMemo(() => {
    const today = easternMarketClock().dateText;
    const prefix = `${activePortfolioId}:`;
    const candidates = Object.entries(closeSnapshots)
      .filter(([key, value]) => key.startsWith(prefix) && key.slice(prefix.length) < today && Number.isFinite(value) && value > 0)
      .sort(([a], [b]) => b.localeCompare(a));
    return candidates.length ? Number(candidates[0][1]) : null;
  }, [activePortfolioId, closeSnapshots]);

  const portfolioDayReturn = priorCloseValue !== null ? summary.value - priorCloseValue : summary.today;
  const impliedStartOfDayValue = summary.value - portfolioDayReturn;
  const portfolioDayReturnPct = priorCloseValue
    ? (portfolioDayReturn / priorCloseValue) * 100
    : impliedStartOfDayValue
      ? (portfolioDayReturn / impliedStartOfDayValue) * 100
      : 0;

  const performanceAccount = useMemo(()=>{
    const name=HOLDINGS_ACCOUNT_NAMES[activePortfolioId]??"Robinhood";
    const base=investmentAccounts.find(account=>account.name===name)??investmentAccounts[0];
    const current=summary.value;
    const invested=base.invested;
    const gain=current-invested;
    const totalReturn=invested>0?gain/invested:0;
    const monthNumber=new Date().getMonth()+1;
    const monthFraction=(monthNumber-1)/12;
    const cagrBaseYears=name==="Fidelity Roth IRA"?1.0833:2;
    const cagrYears=cagrBaseYears+monthFraction;
    const cagr=invested>0&&current>0?Math.pow(current/invested,1/cagrYears)-1:0;
    const ytd=name==="Robinhood"?current/83745-1:name==="Fidelity Roth IRA"?current/16452-1:0.1465;
    return {...base,current,invested,gain,totalReturn,cagr,ytd};
  },[activePortfolioId,summary.value]);
  const activeAth=performanceAth[activePortfolioId]??DEFAULT_PERFORMANCE_ATH[activePortfolioId]??DEFAULT_PERFORMANCE_ATH.robinhood;
  const updateAth=(field:"value"|"date",raw:string)=>{
    const next={...performanceAth,[activePortfolioId]:{...activeAth,[field]:field==="value"?(Number(raw)||0):raw}};
    setPerformanceAth(next);
    try{window.localStorage.setItem(PERFORMANCE_ATH_KEY,JSON.stringify(next));}catch{}
  };

  const positionValue = summary.invested;
  const stockValue = holdings.filter((holding) => (holding.assetType ?? "stock") === "stock").reduce((sum, holding) => sum + holdingMetrics(holding).marketValue, 0);
  const optionValue = holdings.filter((holding) => holding.assetType === "option").reduce((sum, holding) => sum + holdingMetrics(holding).marketValue, 0);
  const stockHoldings = holdings.filter((holding) => (holding.assetType ?? "stock") === "stock");
  const optionHoldings = holdings.filter((holding) => holding.assetType === "option");
  const profitableStocks = stockHoldings.filter((holding) => holdingMetrics(holding).totalGain > 0).length;
  const profitableOptions = optionHoldings.filter((holding) => holdingMetrics(holding).totalGain > 0).length;

  const stockSymbols = useMemo(() =>
    Array.from(new Set(holdings
      .filter((holding) => (holding.assetType ?? "stock") === "stock")
      .map((holding) => holding.symbol.trim().toUpperCase())
      .filter(Boolean)))
      .sort(),
  [holdings]);
  const stockSymbolsKey = stockSymbols.join(",");

  const optionContracts = useMemo(() => holdings
    .filter((holding) => holding.assetType === "option")
    .map((holding) => ({ holding, contract: buildOptionSymbol(holding) }))
  , [holdings]);
  const missingOptionDetails = optionContracts.filter((item) => !item.contract).map((item) => item.holding.symbol);
  const optionSymbolsKey = Array.from(new Set(optionContracts.map((item) => item.contract).filter((value): value is string => Boolean(value)))).sort().join(",");
  const hasRefreshableSymbols = Boolean(stockSymbolsKey || optionSymbolsKey);

  const refreshPrices = useCallback(async (silent = false, force = false) => {
    if (!hasRefreshableSymbols || pricesLoading) return;
    const is401k = activePortfolioId === "fidelity-401k";
    if (!force && (is401k || !isUsMarketOpen())) return;
    if (!silent) setPricesLoading(true);
    setPricesError(null);

    try {
      const requests: Promise<void>[] = [];
      const messages: string[] = [];
      let refreshedAt: Date | null = null;

      if (stockSymbolsKey) {
        requests.push((async () => {
          const response = await fetch(`/api/market-prices?symbols=${encodeURIComponent(stockSymbolsKey)}`, { cache: "no-store" });
          const body = await response.json() as { prices?: Record<string, { currentPrice: number; previousClose: number }>; unavailable?: string[]; refreshedAt?: string; error?: string };
          if (!response.ok) throw new Error(body.error || "Could not refresh stock prices.");
          if (body.prices && Object.keys(body.prices).length) updateStockQuotes(body.prices, activePortfolioId === "all" ? undefined : activePortfolioId);
          if (body.unavailable?.length) messages.push(`No stock quote found for: ${body.unavailable.join(", ")}`);
          refreshedAt = body.refreshedAt ? new Date(body.refreshedAt) : new Date();
        })());
      }

      if (optionSymbolsKey) {
        requests.push((async () => {
          const response = await fetch(`/api/option-prices?symbols=${encodeURIComponent(optionSymbolsKey)}`, { cache: "no-store" });
          const body = await response.json() as { prices?: Record<string, { currentPrice: number; previousClose: number }>; unavailable?: string[]; refreshedAt?: string; error?: string };
          if (!response.ok) throw new Error(body.error || "Could not refresh option prices.");
          if (body.prices && Object.keys(body.prices).length) updateOptionQuotes(body.prices, activePortfolioId === "all" ? undefined : activePortfolioId);
          if (body.unavailable?.length) messages.push(`No option quote found for: ${body.unavailable.join(", ")}`);
          refreshedAt = body.refreshedAt ? new Date(body.refreshedAt) : new Date();
        })());
      }

      await Promise.all(requests);
      if (missingOptionDetails.length) messages.push(`Use Option Details format like UNHG $25 Call for: ${Array.from(new Set(missingOptionDetails)).join(", ")}`);
      setPricesUpdatedAt(refreshedAt ?? new Date());
      if (messages.length) setPricesError(messages.join(" · "));
    } catch (error) {
      setPricesError(error instanceof Error ? error.message : "Could not refresh prices.");
    } finally {
      setPricesLoading(false);
    }
  }, [activePortfolioId, hasRefreshableSymbols, missingOptionDetails.join(","), optionSymbolsKey, pricesLoading, stockSymbolsKey, updateOptionQuotes, updateStockQuotes]);

  useEffect(() => {
    if (!hasRefreshableSymbols) {
      if (missingOptionDetails.length) setPricesError(`Use Option Details format like UNHG $25 Call for: ${Array.from(new Set(missingOptionDetails)).join(", ")}`);
      return;
    }

    if (activePortfolioId === "fidelity-401k") {
      const checkScheduledRefresh = () => {
        const now = new Date();
        if (!isUsMarketDay(now)) return;
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/New_York",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).formatToParts(now);
        const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
        const hour = Number(get("hour"));
        const minute = Number(get("minute"));
        const slot = hour === 17 && minute === 30 ? "17:30" : hour === 18 && minute === 0 ? "18:00" : "";
        if (!slot) return;
        const dateKey = `${get("year")}-${get("month")}-${get("day")}`;
        const storageKey = `folio-401k-refresh:${dateKey}:${slot}`;
        if (window.localStorage.getItem(storageKey)) return;
        window.localStorage.setItem(storageKey, "requested");
        refreshPrices(true, true);
      };
      checkScheduledRefresh();
      const timer = window.setInterval(checkScheduledRefresh, 30 * 1000);
      return () => window.clearInterval(timer);
    }

    if (!isUsMarketOpen()) return;
    refreshPrices(true);
    const timer = window.setInterval(() => {
      if (isUsMarketOpen()) refreshPrices(true);
    }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [activePortfolioId, hasRefreshableSymbols, missingOptionDetails.join(","), optionSymbolsKey, refreshPrices, stockSymbolsKey]);

  function parseCsvDate(value: unknown) {
    const text = String(value ?? "").trim();
    if (!text) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return undefined;
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseOptionType(value: unknown): OptionType | undefined {
    const text = String(value ?? "").trim().toLowerCase().replace(/[ _]+/g, "-");
    if (text === "buy-call" || text === "sell-call" || text === "buy-put" || text === "sell-put") return text;
    return undefined;
  }

  function numberFrom(value: unknown, fallback = 0) {
    const parsed = Number(String(value ?? "").replace(/[$,%]/g, "").trim());
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  async function importHoldingsCsv(file: File) {
    setImportMessage(null);
    try {
      if (activePortfolioId === "all") {
        setImportMessage("Select A Single Portfolio Before Importing Holdings");
        return;
      }
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
      const imported: Holding[] = rows.map((row) => {
        const assetText = String(row["Asset"] ?? row["Asset Type"] ?? row["assetType"] ?? "Stock").trim().toLowerCase();
        const assetType: Holding["assetType"] = assetText === "option" ? "option" : "stock";
        const symbol = String(row["Symbol"] ?? row["Ticker"] ?? row["symbol"] ?? "").trim().toUpperCase();
        const company = String(row["Description"] ?? row["Company"] ?? row["company"] ?? symbol).trim() || symbol;
        const optionType = assetType === "option" ? parseOptionType(row["Option Type"] ?? row["optionType"]) : undefined;
        const optionExpiry = assetType === "option" ? parseCsvDate(row["Expiry Date"] ?? row["Option Expiry"] ?? row["optionExpiry"]) : undefined;
        const strikeMatch = company.match(/\$([0-9]+(?:\.[0-9]+)?)\s+(?:Call|Put)/i);
        const optionStrike = assetType === "option" ? numberFrom(row["Strike"] ?? row["Option Strike"] ?? row["optionStrike"], strikeMatch ? Number(strikeMatch[1]) : 0) : undefined;
        return {
          assetType,
          symbol,
          company,
          shares: numberFrom(row["Shares / Contracts"] ?? row["Shares"] ?? row["Contracts"] ?? row["shares"]),
          averageCost: numberFrom(row["Average Cost / Contract Cost"] ?? row["Average Cost"] ?? row["averageCost"]),
          currentPrice: numberFrom(row["Current Price"] ?? row["currentPrice"]),
          previousClose: numberFrom(row["Previous Close"] ?? row["previousClose"], numberFrom(row["Current Price"] ?? row["currentPrice"])),
          dividendYield: numberFrom(row["Dividend Yield"] ?? row["dividendYield"]),
          sector: String(row["Sector"] ?? row["sector"] ?? "Other").trim() as Holding["sector"],
          optionType,
          optionExpiry,
          optionStrike: optionStrike && optionStrike > 0 ? optionStrike : undefined,
          optionSymbol: String(row["Option Symbol"] ?? row["optionSymbol"] ?? "").trim() || undefined,
          updatedAt: "Just now",
        };
      }).filter((holding) => Boolean(holding.symbol));

      if (!imported.length) {
        setImportMessage("No Valid Holdings Found In CSV");
        return;
      }
      const confirmed = window.confirm(`Replace ${holdings.length} Current Holdings With ${imported.length} Imported Holdings?`);
      if (!confirmed) return;
      replaceHoldings(imported, activePortfolioId);
      setImportMessage(`${imported.length} Holdings Imported And Saved`);
    } catch (error) {
      setImportMessage(error instanceof Error ? `Import Failed: ${error.message}` : "Import Failed");
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  }

  function portfolioRows() {
    return holdings.map((holding) => {
      const metrics = holdingMetrics(holding);
      const dte = holding.optionExpiry ? Math.ceil((new Date(`${holding.optionExpiry}T23:59:59`).getTime() - Date.now()) / 86_400_000) : "";
      return {
        Asset: holding.assetType === "option" ? "Option" : "Stock",
        Symbol: holding.symbol,
        Description: holding.company,
        "Option Type": holding.optionType ?? "",
        "Expiry Date": holding.optionExpiry ? new Date(`${holding.optionExpiry}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "",
        "Days to Expiry": dte,
        "Shares / Contracts": holding.shares,
        "Average Cost / Contract Cost": holding.averageCost,
        "Current Price": holding.currentPrice,
        "Previous Close": holding.previousClose,
        "Total Cost": metrics.costBasis,
        "Current Value": metrics.marketValue,
        "Day Return": metrics.todayGain,
        "Total Return": metrics.totalGain,
        "Total Return %": metrics.totalGainPct,
        Sector: holding.sector,
      };
    });
  }


  function downloadExcel() {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(portfolioRows()), "Holdings");
    XLSX.writeFile(workbook, "folio-portfolio.xlsx");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Portfolio Overview</h1>{pricesUpdatedAt && <p className="mt-1 text-xs text-zinc-500">Prices Updated {pricesUpdatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>}{pricesError && <p className="mt-1 text-xs text-amber-500">{pricesError}</p>}{importMessage && <p className="mt-1 text-xs font-medium text-emerald-500">{importMessage}</p>}</div><div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white/70 p-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[.025]"><input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) importHoldingsCsv(file); }} /><button type="button" onClick={() => refreshPrices(false, true)} disabled={pricesLoading || !hasRefreshableSymbols} aria-label="Refresh Prices" title="Refresh Prices" className="inline-flex h-10 items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:-translate-y-px hover:bg-zinc-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-black/20 dark:text-zinc-100 dark:hover:bg-white/[.05]"><span className="grid size-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500"><RefreshCw size={16} className={pricesLoading ? "animate-spin" : ""}/></span><span className="hidden sm:inline">Refresh Prices</span></button><button onClick={downloadExcel} aria-label="Download Portfolio" title="Download Portfolio" className="inline-flex size-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-emerald-500 shadow-sm transition hover:-translate-y-px hover:bg-zinc-50 hover:shadow dark:border-white/10 dark:bg-black/20 dark:hover:bg-white/[.05]"><Download size={17}/></button><div className="[&_button]:shadow-sm [&_button]:transition [&_button:hover]:-translate-y-px"><AddHoldingDialog /></div></div></div>

      <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-2", isFidelity401k ? "xl:grid-cols-3" : "xl:grid-cols-4")}>
        <PortfolioValueMetric value={summary.value} dayReturn={portfolioDayReturn} dayReturnPct={portfolioDayReturnPct}/>
        <MetricBlock label="Total Stocks Value" value={money(stockValue)} subvalue={`${stockHoldings.length} Open Positions\n( ${profitableStocks} Profitable Positions )`} icon={Layers3} tone="green"/>
        {!isFidelity401k && <MetricBlock label="Total Options Value" value={money(optionValue)} subvalue={`${optionHoldings.length} Open Positions\n( ${profitableOptions} Profitable Positions )`} icon={Layers3} tone="purple"/>}
        <MetricBlock label="Cash" value={money(availableCash)} subvalue={`${summary.value ? ((availableCash / summary.value) * 100).toFixed(2) : "0.00"}% of Portfolio`} icon={Banknote} tone="purple"/>
      </div>

      <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="row-span-2 rounded-3xl border border-white/10 bg-zinc-950/40 p-4 shadow-sm">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400"><TrendingUp size={20}/></div>
          <div className="mt-4 text-xs font-medium text-zinc-400">Investment</div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight">{money(performanceAccount.invested)}</div>
          <div className={cn("mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",performanceAccount.totalReturn>=0?"bg-emerald-400/10 text-emerald-400":"bg-rose-400/10 text-rose-400")}>{performanceAccount.totalReturn>=0?"+":""}{(performanceAccount.totalReturn*100).toFixed(2)}%</div>
        </div>
        <PerformanceMiniCard label="Total Gain" value={money(performanceAccount.gain)} positive={performanceAccount.gain>=0}/>
        <PerformanceMiniCard label="Total Return" value={`${performanceAccount.totalReturn>=0?"+":""}${(performanceAccount.totalReturn*100).toFixed(2)}%`} positive={performanceAccount.totalReturn>=0}/>
        <PerformanceMiniCard label="CAGR" value={`${performanceAccount.cagr>=0?"+":""}${(performanceAccount.cagr*100).toFixed(2)}%`} positive={performanceAccount.cagr>=0}/>
        <PerformanceMiniCard label="2026 YTD" value={`${performanceAccount.ytd>=0?"+":""}${(performanceAccount.ytd*100).toFixed(2)}%`} positive={performanceAccount.ytd>=0}/>
        <div className="rounded-3xl border border-white/10 bg-zinc-950/40 p-4 shadow-sm"><div className="flex items-center justify-between"><div className="text-xs font-medium text-zinc-400">Portfolio Start</div><CalendarDays size={18} className="text-zinc-600"/></div><div className="mt-3 text-base font-semibold text-zinc-200">{performanceAccount.start}</div></div>
        <div className="rounded-3xl border border-white/10 bg-zinc-950/40 p-4 shadow-sm"><div className="flex items-center justify-between"><div className="text-xs font-medium text-zinc-400">All-Time High</div><Star size={18} className="text-zinc-600"/></div>{editingAth?<div className="mt-4 flex flex-wrap gap-2"><input autoFocus type="number" step="1" value={activeAth.value||""} onChange={e=>updateAth("value",e.target.value)} className="h-9 w-32 rounded-xl border border-white/10 bg-transparent px-3 text-sm outline-none"/><input type="date" value={activeAth.date} onChange={e=>updateAth("date",e.target.value)} onKeyDown={e=>{if(e.key==="Enter")setEditingAth(false)}} className="h-9 w-40 rounded-xl border border-white/10 bg-transparent px-3 text-sm outline-none"/><button type="button" onClick={()=>setEditingAth(false)} className="h-9 rounded-xl border border-white/10 px-3 text-xs text-zinc-400">Done</button></div>:<button type="button" onClick={()=>setEditingAth(true)} title="Click To Edit All-Time High" className="mt-3 block text-left"><span className="block text-base font-semibold text-zinc-200">{money(activeAth.value)}</span><span className="mt-1 block text-xs text-zinc-500">on {compactDate(activeAth.date)}</span></button>}</div>
      </section>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950/30">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Ticker or Company / Contract Name" className="h-10 rounded-lg pl-9" />
        </div>
      </div>

      {(!normalizedQuery || stocks.length > 0) && <HoldingsTable data={stocks} title="Stocks" assetType="stock" portfolioValue={summary.value} portfolioId={activePortfolioId} />}
      {!isFidelity401k && (!normalizedQuery || options.length > 0) && <HoldingsTable data={options} title="Options" assetType="option" portfolioValue={summary.value} portfolioId={activePortfolioId} />}
      {normalizedQuery && stocks.length === 0 && (isFidelity401k || options.length === 0) && <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center text-sm text-zinc-500 shadow-sm dark:border-white/10 dark:bg-zinc-950/30">No holdings match your search.</div>}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950/30">
        <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-white/5 dark:bg-white/[.025]"><h2 className="font-semibold">Portfolio Totals</h2></div>
        <div className="divide-y divide-zinc-200 dark:divide-white/[.06]">
          <div className="grid min-h-[88px] grid-cols-[1fr_auto] items-center gap-6 px-6 py-4 sm:grid-cols-[1fr_repeat(3,minmax(140px,auto))]">
            <div><p className="font-semibold">Holdings Subtotal</p><p className="text-sm text-zinc-500">Stocks and Options</p></div>
            <div className="hidden text-right sm:block"><p className="text-xs uppercase tracking-wide text-zinc-500">Stocks</p><p className="mt-1 font-medium">{money(stockValue)}</p></div>
            <div className="hidden text-right sm:block"><p className="text-xs uppercase tracking-wide text-zinc-500">Options</p><p className="mt-1 font-medium">{money(optionValue)}</p></div>
            <div className="text-right"><p className="font-semibold">{money(positionValue)}</p><p className="text-sm text-zinc-500">{summary.value ? ((positionValue / summary.value) * 100).toFixed(2) : "0.00"}%</p></div>
          </div>
          {!isFidelity401k && <div className="grid min-h-[88px] grid-cols-[1fr_auto] items-center gap-6 px-6 py-4">
            <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500"><Banknote size={18} /></div><div><p className="font-semibold">Cash</p><p className="text-sm text-zinc-500">Available Cash Balance</p></div></div>
            <div className="flex items-center gap-3">{!isFidelity401k ? <EditCashDialog><span className="block font-semibold">{money(availableCash)}</span><span className="block text-sm text-zinc-500">{summary.value ? ((availableCash / summary.value) * 100).toFixed(2) : "0.00"}%</span></EditCashDialog> : <div className="text-right"><p className="font-semibold">{money(availableCash)}</p><p className="text-sm text-zinc-500">{summary.value ? ((availableCash / summary.value) * 100).toFixed(2) : "0.00"}%</p></div>}</div>
          </div>}
          {!isFidelity401k && Math.abs(collateral) > 0.005 && <div className="grid min-h-[88px] grid-cols-[1fr_auto] items-center gap-6 px-6 py-4">
            <div className="flex items-center gap-3"><div className="rounded-xl bg-violet-500/10 p-2 text-violet-500"><LockKeyhole size={18} /></div><div><p className="font-semibold">Options Collateral</p><p className="text-sm text-zinc-500">Cash Reserved for Sell Puts</p></div></div>
            <div className="text-right"><p className="font-semibold">{money(collateral)}</p><p className="text-sm text-zinc-500">{summary.value ? ((collateral / summary.value) * 100).toFixed(2) : "0.00"}%</p></div>
          </div>}
          <div className="grid min-h-[92px] grid-cols-[1fr_auto] items-center gap-6 bg-emerald-500/[.04] px-6 py-4">
            <div><p className="text-lg font-semibold">Total</p></div>
            <div className="text-right"><p className="text-xl font-semibold">{money(summary.value)}</p><p className="text-sm text-zinc-500">100.00%</p></div>
          </div>
        </div>
      </section>
    </div>
  );
}
