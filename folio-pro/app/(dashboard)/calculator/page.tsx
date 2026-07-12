"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { holdingMetrics, portfolioSummary } from "@/lib/calculations/portfolio";
import { cn, money } from "@/lib/utils";
import { usePortfolioStore } from "@/store/portfolio-store";

const numberValue = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function ResultCard({
  label,
  value,
  caption,
  tone = "neutral",
}: {
  label: string;
  value: string;
  caption: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-zinc-950/35 p-5 shadow-sm",
        tone === "positive" && "border-emerald-500/45 bg-emerald-500/[.07]",
        tone === "negative" && "border-rose-500/45 bg-rose-500/[.07]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-400">{label}</p>
          <p
            className={cn(
              "mt-3 text-2xl font-semibold tracking-tight sm:text-3xl",
              tone === "positive" && "text-emerald-400",
              tone === "negative" && "text-rose-400",
            )}
          >
            {value}
          </p>
          <p className={cn("mt-2 text-sm text-zinc-500", tone === "positive" && "text-emerald-400", tone === "negative" && "text-rose-400")}>{caption}</p>
        </div>
        {tone === "positive" && <TrendingUp className="text-emerald-400" size={22} />}
        {tone === "negative" && <TrendingDown className="text-rose-400" size={22} />}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-medium text-zinc-300">{children}</label>;
}

export default function CalculatorPage() {
  const holdings = usePortfolioStore((state) => state.holdings);
  const cash = usePortfolioStore((state) => state.cash);
  const stocks = useMemo(
    () => holdings.filter((holding) => (holding.assetType ?? "stock") === "stock"),
    [holdings],
  );

  const [symbol, setSymbol] = useState("");
  const selected = stocks.find((holding) => holding.symbol === symbol) ?? stocks[0];
  const [shares, setShares] = useState(0);
  const [averageCost, setAverageCost] = useState(0);
  const [targetPrice, setTargetPrice] = useState(0);
  const [targetReturn, setTargetReturn] = useState(25);
  const [sharesToSell, setSharesToSell] = useState(0);

  useEffect(() => {
    if (!selected) return;
    setSymbol(selected.symbol);
    setShares(selected.shares);
    setAverageCost(selected.averageCost);
    setTargetPrice(selected.currentPrice);
    setSharesToSell(Math.min(selected.shares, Math.max(1, Math.ceil(selected.shares / 2))));
  }, [selected?.symbol]);

  const totalInvestment = shares * averageCost;
  const sellingValue = shares * targetPrice;
  const profit = sellingValue - totalInvestment;
  const roi = totalInvestment ? (profit / totalInvestment) * 100 : 0;
  const profitPerShare = targetPrice - averageCost;
  const requiredSellingPrice = averageCost * (1 + targetReturn / 100);
  const targetPotentialProfit = shares * (requiredSellingPrice - averageCost);
  const safeSharesToSell = Math.min(Math.max(sharesToSell, 0), shares);
  const partialProceeds = safeSharesToSell * targetPrice;
  const partialProfit = safeSharesToSell * (targetPrice - averageCost);
  const remainingShares = Math.max(shares - safeSharesToSell, 0);
  const remainingCostBasis = remainingShares * averageCost;
  const summary = useMemo(() => portfolioSummary(holdings, cash), [holdings, cash]);
  const projectedPortfolio = summary.value + profit;
  const portfolioImpact = summary.value ? (profit / summary.value) * 100 : 0;

  const rangeFloor = Math.max(0, averageCost * 0.7);
  const rangeCeiling = Math.max(averageCost * 1.3, targetPrice, averageCost + 1);
  const sliderValue = Math.min(Math.max(targetPrice, rangeFloor), rangeCeiling);
  const currentChange = selected?.previousClose
    ? ((selected.currentPrice - selected.previousClose) / selected.previousClose) * 100
    : 0;
  const isProfit = profit >= 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Stock Profit / Loss Calculator</h1>
          <p className="mt-1 text-sm text-zinc-500">Calculate your potential profit or loss at any selling price.</p>
        </div>
        <Link href="/holdings" className="inline-flex h-10 items-center gap-2 self-start rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm font-medium text-zinc-200 transition hover:bg-white/[.07]">
          <ArrowLeft size={16} /> Back to Holdings
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/35 shadow-sm">
        <div className="grid gap-6 p-5 lg:grid-cols-[.95fr_1.45fr] lg:p-6">
          <div className="lg:border-r lg:border-white/10 lg:pr-6">
            <FieldLabel>1. Select Stock</FieldLabel>
            <select
              value={selected?.symbol ?? ""}
              onChange={(event) => setSymbol(event.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-zinc-950/70 px-4 text-sm outline-none focus:border-emerald-400/60"
            >
              {stocks.map((holding) => (
                <option key={holding.symbol} value={holding.symbol}>
                  {holding.symbol} - {holding.company}
                </option>
              ))}
            </select>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-400"><CheckCircle2 size={15} /> Auto-filled from your holdings</p>
          </div>

          <div>
            <FieldLabel>2. Position Details (Your Holding)</FieldLabel>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                <p className="text-xs text-zinc-500">Shares</p>
                <input value={shares} min={0} step="any" type="number" onChange={(e) => setShares(numberValue(e.target.value))} className="mt-2 w-full bg-transparent text-lg font-semibold outline-none" />
              </div>
              <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                <p className="text-xs text-zinc-500">Avg. Cost / Share</p>
                <div className="mt-2 flex items-center text-lg font-semibold"><span>$</span><input value={averageCost} min={0} step="any" type="number" onChange={(e) => setAverageCost(numberValue(e.target.value))} className="w-full bg-transparent outline-none" /></div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                <p className="text-xs text-zinc-500">Total Cost</p>
                <p className="mt-2 text-lg font-semibold">{money(totalInvestment)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 p-5 lg:p-6">
          <div className="max-w-md">
            <FieldLabel>3. Target Selling Price</FieldLabel>
            <div className="flex h-12 items-center rounded-xl border border-white/10 bg-black/15 px-4 text-lg font-semibold focus-within:border-emerald-400/60">
              <span className="mr-2 text-zinc-400">$</span>
              <input value={targetPrice} min={0} step="any" type="number" onChange={(e) => setTargetPrice(numberValue(e.target.value))} className="w-full bg-transparent outline-none" />
            </div>
            {selected && <p className="mt-3 text-sm text-zinc-400">Current Price: {money(selected.currentPrice)} <span className={currentChange >= 0 ? "text-emerald-400" : "text-rose-400"}>({currentChange >= 0 ? "+" : ""}{currentChange.toFixed(2)}%)</span></p>}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResultCard label="Total Investment" value={money(totalInvestment)} caption={`${shares.toLocaleString()} shares × ${money(averageCost)}`} />
        <ResultCard label="Selling Value" value={money(sellingValue)} caption={`${shares.toLocaleString()} shares × ${money(targetPrice)}`} />
        <ResultCard label={isProfit ? "Net Profit" : "Net Loss"} value={`${profit < 0 ? "-" : ""}${money(Math.abs(profit))}`} caption={isProfit ? "Profit" : "Loss"} tone={isProfit ? "positive" : "negative"} />
        <ResultCard label="Return (ROI)" value={`${roi >= 0 ? "+" : ""}${roi.toFixed(2)}%`} caption="Total Return" tone={isProfit ? "positive" : "negative"} />
      </div>

      <section className="grid overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/35 lg:grid-cols-[.75fr_1.35fr]">
        <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r lg:p-6">
          <h2 className="font-semibold">Breakdown</h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><span className="text-zinc-400">Total Investment</span><span>{money(totalInvestment)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-zinc-400">Selling Value</span><span>{money(sellingValue)}</span></div>
            <div className="border-t border-white/10 pt-3 flex justify-between gap-4"><span className={isProfit ? "text-emerald-400" : "text-rose-400"}>{isProfit ? "Net Profit" : "Net Loss"}</span><span className={isProfit ? "text-emerald-400" : "text-rose-400"}>{profit < 0 ? "-" : ""}{money(Math.abs(profit))}</span></div>
            <div className="flex justify-between gap-4"><span className="text-zinc-400">Profit / Loss Per Share</span><span className={profitPerShare >= 0 ? "text-emerald-400" : "text-rose-400"}>{profitPerShare < 0 ? "-" : "+"}{money(Math.abs(profitPerShare))}</span></div>
            <div className="flex justify-between gap-4"><span className="text-zinc-400">Break-even Price</span><span>{money(averageCost)}</span></div>
          </div>
        </div>

        <div className="p-5 lg:p-6">
          <h2 className="flex items-center gap-2 font-semibold">Price Range Simulator <Info size={15} className="text-zinc-500" /></h2>
          <div className="mt-6 grid grid-cols-3 text-sm">
            <div><p className="font-semibold text-rose-400">{money(rangeFloor)}</p><p className="mt-1 text-xs text-zinc-500">-30.00%</p></div>
            <div className="text-center"><p className="font-semibold">{money(averageCost)}</p><p className="mt-1 text-xs text-zinc-500">Break-even</p></div>
            <div className="text-right"><p className="font-semibold text-emerald-400">{money(rangeCeiling)}</p><p className="mt-1 text-xs text-zinc-500">+{averageCost ? (((rangeCeiling - averageCost) / averageCost) * 100).toFixed(2) : "0.00"}%</p></div>
          </div>
          <input
            aria-label="Target selling price"
            type="range"
            min={rangeFloor}
            max={rangeCeiling}
            step={Math.max((rangeCeiling - rangeFloor) / 300, 0.01)}
            value={sliderValue}
            onChange={(event) => setTargetPrice(numberValue(event.target.value))}
            className="mt-5 w-full accent-emerald-400"
          />
          <p className="mt-3 text-center text-sm text-emerald-400">Target Price: {money(targetPrice)}</p>
          <div className="mt-5 grid grid-cols-3 rounded-xl border border-white/10 bg-black/15 p-4 text-sm">
            <div><p className="font-semibold text-rose-400">{money(rangeFloor)}</p><p className="mt-1 text-xs text-rose-400">Potential Loss</p></div>
            <div className="text-center"><p className="font-semibold">{money(targetPrice)}</p><p className="mt-1 text-xs text-zinc-500">Current Target</p></div>
            <div className="text-right"><p className="font-semibold text-emerald-400">{money(rangeCeiling)}</p><p className="mt-1 text-xs text-emerald-400">Potential Profit</p></div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-white/10 bg-zinc-950/35 p-5">
          <h2 className="flex items-center gap-2 font-semibold">Target Return Calculator <Info size={15} className="text-zinc-500" /></h2>
          <p className="mt-4 text-sm text-zinc-400">What return do you want to achieve?</p>
          <FieldLabel>Target Return (%)</FieldLabel>
          <div className="flex h-11 items-center rounded-xl border border-white/10 bg-black/15 px-4">
            <input value={targetReturn} type="number" step="any" onChange={(e) => setTargetReturn(numberValue(e.target.value))} className="w-full bg-transparent outline-none" />
            <span>%</span>
          </div>
          <div className="mt-4 rounded-xl border border-emerald-500/35 bg-emerald-500/[.07] p-5 text-center">
            <p className="text-sm text-zinc-300">Required Selling Price</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-400">{money(requiredSellingPrice)}</p>
            <p className="mt-2 text-sm text-emerald-400">Potential Profit: {money(targetPotentialProfit)} ({targetReturn.toFixed(2)}%)</p>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-950/35 p-5">
          <h2 className="flex items-center gap-2 font-semibold">Partial Sale Calculator <Info size={15} className="text-zinc-500" /></h2>
          <FieldLabel>Shares to Sell</FieldLabel>
          <div className="flex h-11 items-center rounded-xl border border-white/10 bg-black/15 px-4">
            <input value={sharesToSell} min={0} max={shares} type="number" step="any" onChange={(e) => setSharesToSell(numberValue(e.target.value))} className="w-full bg-transparent outline-none" />
            <span className="whitespace-nowrap text-sm text-zinc-400">of {shares.toLocaleString()}</span>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-zinc-400">Proceeds (At Target Price)</span><span>{money(partialProceeds)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Profit on Sale</span><span className={partialProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>{partialProfit < 0 ? "-" : "+"}{money(Math.abs(partialProfit))}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Remaining Shares</span><span>{remainingShares.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Remaining Cost Basis</span><span>{money(remainingCostBasis)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">New Avg. Cost / Share</span><span>{remainingShares ? money(averageCost) : money(0)}</span></div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-950/35 p-5">
          <h2 className="flex items-center gap-2 font-semibold">Portfolio Impact <Info size={15} className="text-zinc-500" /></h2>
          <p className="mt-4 text-sm text-zinc-400">If you sell at {money(targetPrice)}</p>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-zinc-400">Current Portfolio Value</span><span>{money(summary.value)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Change in Value</span><span className={isProfit ? "text-emerald-400" : "text-rose-400"}>{profit < 0 ? "-" : "+"}{money(Math.abs(profit))}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Projected Portfolio Value</span><span>{money(projectedPortfolio)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Portfolio Return Impact</span><span className={isProfit ? "text-emerald-400" : "text-rose-400"}>{portfolioImpact >= 0 ? "+" : ""}{portfolioImpact.toFixed(2)}%</span></div>
          </div>
          <div className={cn("mt-5 flex gap-3 rounded-xl border p-4 text-sm", isProfit ? "border-emerald-500/25 bg-emerald-500/[.06] text-emerald-400" : "border-rose-500/25 bg-rose-500/[.06] text-rose-400")}>
            <BarChart3 className="shrink-0" size={20} />
            <p>This sale would {isProfit ? "increase" : "decrease"} your portfolio value by {money(Math.abs(profit))} ({Math.abs(portfolioImpact).toFixed(2)}%).</p>
          </div>
        </section>
      </div>

      <p className="pb-2 text-center text-xs text-zinc-600">Disclaimer: This calculator is for informational purposes only and does not constitute financial advice.</p>
    </div>
  );
}
