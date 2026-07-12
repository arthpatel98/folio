"use client";

import { useMemo, useState } from "react";
import { Banknote, BriefcaseBusiness, Download, Layers3, Search, WalletCards } from "lucide-react";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { AddHoldingDialog } from "@/components/portfolio/add-holding-dialog";
import { EditCashDialog } from "@/components/portfolio/edit-cash-dialog";
import { Input } from "@/components/ui/input";
import { holdingMetrics, portfolioSummary } from "@/lib/calculations/portfolio";
import { cn, money } from "@/lib/utils";
import { usePortfolioStore } from "@/store/portfolio-store";
import * as XLSX from "xlsx";

function MetricBlock({ label, value, subvalue, positive, icon: Icon, tone = "green", valueExtra }: { label: string; value: string; subvalue?: string; positive?: boolean; icon: typeof BriefcaseBusiness; tone?: "green" | "red" | "blue" | "purple"; valueExtra?: React.ReactNode }) {
  const toneClass = tone === "red" ? "border-red-500/30 bg-red-500/[.06] text-red-400" : tone === "blue" ? "border-blue-500/30 bg-blue-500/[.06] text-blue-400" : tone === "purple" ? "border-violet-500/30 bg-violet-500/[.06] text-violet-400" : "border-emerald-500/30 bg-emerald-500/[.06] text-emerald-400";
  return <div className={cn("rounded-2xl border p-4 shadow-sm", toneClass)}><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-zinc-400">{label}</p><div className="rounded-lg bg-current/10 p-2"><Icon size={18}/></div></div><div className="mt-3 flex items-baseline justify-between gap-2"><p className={cn("text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white", positive === true && "text-emerald-500", positive === false && "text-red-500")}>{value}</p>{valueExtra}</div>{subvalue && <p className={cn("mt-1.5 text-sm", positive === true && "text-emerald-400", positive === false && "text-red-400", positive === undefined && "text-zinc-500")}>{subvalue}</p>}</div>;
}

export default function Page() {
  const holdings = usePortfolioStore((state) => state.holdings);
  const cash = usePortfolioStore((state) => state.cash);
  const activePortfolioId = usePortfolioStore((state) => state.activePortfolioId);
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedQuery) return holdings;
    return holdings.filter((holding) =>
      holding.symbol.toLowerCase().includes(normalizedQuery) ||
      holding.company.toLowerCase().includes(normalizedQuery),
    );
  }, [holdings, normalizedQuery]);

  const stocks = filtered.filter((holding) => (holding.assetType ?? "stock") === "stock");
  const isFidelity401k = activePortfolioId === "fidelity-roth";
  const options = isFidelity401k ? [] : filtered.filter((holding) => holding.assetType === "option");
  const summary = useMemo(() => portfolioSummary(holdings, cash), [holdings, cash]);
  const positionValue = summary.invested;
  const stockValue = holdings.filter((holding) => (holding.assetType ?? "stock") === "stock").reduce((sum, holding) => sum + holdingMetrics(holding).marketValue, 0);
  const optionValue = holdings.filter((holding) => holding.assetType === "option").reduce((sum, holding) => sum + holdingMetrics(holding).marketValue, 0);
  const stockHoldings = holdings.filter((holding) => (holding.assetType ?? "stock") === "stock");
  const optionHoldings = holdings.filter((holding) => holding.assetType === "option");
  const profitableStocks = stockHoldings.filter((holding) => holdingMetrics(holding).totalGain > 0).length;
  const profitableOptions = optionHoldings.filter((holding) => holdingMetrics(holding).totalGain > 0).length;

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight">Portfolio Overview</h1><p className="mt-1 text-sm text-zinc-500">Portfolio Performance and Open Positions at a Glance.</p></div><div className="flex flex-wrap items-center gap-2"><button onClick={downloadExcel} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-white/[.03] dark:text-zinc-200"><Download size={16}/>Download Portfolio</button><AddHoldingDialog /></div></div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricBlock label="Portfolio Value" value={money(summary.value)} subvalue={`Day Return: ${summary.today >= 0 ? "↑ +" : "↓ -"}${money(Math.abs(summary.today))} (${summary.todayPct >= 0 ? "+" : ""}${summary.todayPct.toFixed(2)}%)`} positive={summary.today >= 0} icon={WalletCards}/>
        <MetricBlock label="Total Holdings" value={money(positionValue)} subvalue={`${holdings.length} Open Positions`} icon={BriefcaseBusiness} tone="blue"/>
        <MetricBlock label="Total Stocks" value={money(stockValue)} subvalue={`${stockHoldings.length} Open Positions (${profitableStocks} Profitable)`} icon={Layers3} tone="green"/>
        <MetricBlock label="Total Options" value={money(optionValue)} subvalue={`${optionHoldings.length} Open Positions (${profitableOptions} Profitable)`} icon={Layers3} tone="purple"/>
        <MetricBlock label="Cash" value={money(cash)} subvalue={`${summary.value ? ((cash / summary.value) * 100).toFixed(2) : "0.00"}% of portfolio`} icon={Banknote} tone="purple"/>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950/30">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ticker or company / contract name" className="h-10 rounded-lg pl-9" />
        </div>
      </div>

      <HoldingsTable data={stocks} title="Stocks" assetType="stock" portfolioValue={summary.value} />
      {!isFidelity401k && <HoldingsTable data={options} title="Options" assetType="option" portfolioValue={summary.value} />}

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
            <div className="flex items-center gap-3"><div className="text-right"><p className="font-semibold">{money(cash)}</p><p className="text-sm text-zinc-500">{summary.value ? ((cash / summary.value) * 100).toFixed(2) : "0.00"}%</p></div><EditCashDialog /></div>
          </div>}
          <div className="grid min-h-[92px] grid-cols-[1fr_auto] items-center gap-6 bg-emerald-500/[.04] px-6 py-4">
            <div><p className="text-lg font-semibold">Total</p><p className="text-sm text-zinc-500">Holdings Plus Cash</p></div>
            <div className="text-right"><p className="text-xl font-semibold">{money(summary.value)}</p><p className="text-sm text-zinc-500">100.00%</p></div>
          </div>
        </div>
      </section>
    </div>
  );
}
