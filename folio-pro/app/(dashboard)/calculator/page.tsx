"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Info, TrendingDown, TrendingUp } from "lucide-react";
import { portfolioSummary } from "@/lib/calculations/portfolio";
import { DCA_UPDATED_EVENT, loadDcaPositions } from "@/lib/dca-storage";
import type { DcaLot, DcaPosition } from "@/lib/dca-data";
import { cn, money } from "@/lib/utils";
import { usePortfolioStore } from "@/store/portfolio-store";

const numberValue = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const signedMoney = (value: number) => `${value >= 0 ? "+" : "-"}${money(Math.abs(value))}`;

function ResultCard({
  label,
  value,
  caption,
  tone = "neutral",
  info,
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: "neutral" | "positive" | "negative";
  info?: string;
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
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm text-zinc-400">
            {label}
            {info && <InfoTip text={info} />}
          </p>
          <p
            className={cn(
              "mt-3 text-2xl font-semibold tracking-tight sm:text-3xl",
              tone === "positive" && "text-emerald-400",
              tone === "negative" && "text-rose-400",
            )}
          >
            {value}
          </p>
          {caption ? <p className="mt-2 text-sm text-zinc-500">{caption}</p> : null}
        </div>
        {tone === "positive" && <TrendingUp className="shrink-0 text-emerald-400" size={22} />}
        {tone === "negative" && <TrendingDown className="shrink-0 text-rose-400" size={22} />}
      </div>
    </div>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={text}
        title={text}
        className="inline-flex rounded-full text-zinc-500 transition hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
      >
        <Info size={15} />
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-left text-xs font-normal leading-relaxed text-zinc-200 shadow-xl group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}

function FieldLabel({ children, info }: { children: React.ReactNode; info?: string }) {
  return (
    <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-zinc-300">
      {children}
      {info && <InfoTip text={info} />}
    </label>
  );
}

function lotDateValue(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

type FifoRow = {
  date: string;
  shares: number;
  buyPrice: number;
  sellPrice: number;
  costBasis: number;
  proceeds: number;
  returnValue: number;
  source: "lot" | "average";
};

export default function CalculatorPage() {
  const holdings = usePortfolioStore((state) => state.holdings);
  const cash = usePortfolioStore((state) => state.cash);
  const activePortfolioId = usePortfolioStore((state) => state.activePortfolioId);
  const positions = useMemo(
    () =>
      holdings.slice().sort((a, b) => {
        const aLabel = (a.assetType === "option" ? a.company : a.symbol).toUpperCase();
        const bLabel = (b.assetType === "option" ? b.company : b.symbol).toUpperCase();
        return aLabel.localeCompare(bLabel);
      }),
    [holdings],
  );
  const positionKey = (holding: (typeof holdings)[number]) =>
    [holding.assetType ?? "stock", holding.symbol, holding.optionType ?? "", holding.optionExpiry ?? "", holding.company].join("|");

  const [selectedKey, setSelectedKey] = useState("");
  const selected = positions.find((holding) => positionKey(holding) === selectedKey) ?? positions[0];
  const isOption = selected?.assetType === "option";
  const multiplier = isOption ? 100 : 1;
  const [shares, setShares] = useState(0);
  const [averageCostInput, setAverageCostInput] = useState("0.00");
  const [targetPriceInput, setTargetPriceInput] = useState("");
  const [targetReturn, setTargetReturn] = useState(25);
  const [sharesToSell, setSharesToSell] = useState(0);
  const [dcaPositions, setDcaPositions] = useState<DcaPosition[]>([]);

  useEffect(() => {
    const refresh = () => setDcaPositions(loadDcaPositions());
    refresh();
    window.addEventListener(DCA_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(DCA_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    setSelectedKey(positionKey(selected));
    setShares(selected.shares);
    setAverageCostInput(selected.averageCost.toFixed(2));
    setTargetPriceInput("");
    setSharesToSell(Math.min(Math.abs(selected.shares), Math.max(1, Math.ceil(Math.abs(selected.shares) / 2))));
  }, [selectedKey, selected?.symbol, selected?.company, selected?.optionExpiry]);

  const averageCost = numberValue(averageCostInput);
  const targetPrice = numberValue(targetPriceInput);
  const positionDirection = shares < 0 ? -1 : 1;
  const totalInvestment = Math.abs(shares) * averageCost * multiplier;
  const sellingValue = Math.abs(shares) * targetPrice * multiplier;
  const profit = (sellingValue - totalInvestment) * positionDirection;
  const roi = totalInvestment ? (profit / totalInvestment) * 100 : 0;
  const profitPerShare = (targetPrice - averageCost) * multiplier * positionDirection;
  const requiredSellingPrice = Math.max(0, averageCost * (1 + (targetReturn / 100) * positionDirection));
  const targetPotentialProfit = Math.abs(shares) * (requiredSellingPrice - averageCost) * multiplier * positionDirection;
  const safeSharesToSell = Math.min(Math.max(sharesToSell, 0), Math.abs(shares));
  const partialProceeds = safeSharesToSell * targetPrice * multiplier;
  const summary = useMemo(() => portfolioSummary(holdings, cash), [holdings, cash]);
  const projectedPortfolio = summary.value + profit;
  const portfolioImpact = summary.value ? (profit / summary.value) * 100 : 0;

  const matchingLots = useMemo(() => {
    if (!selected || isOption) return [] as DcaLot[];
    const symbol = selected.symbol.trim().toUpperCase();
    return dcaPositions
      .filter(
        (position) =>
          position.symbol.trim().toUpperCase() === symbol &&
          (activePortfolioId === "all" || position.portfolioId === activePortfolioId),
      )
      .flatMap((position) => position.lots)
      .filter((lot) => !lot.future && Number(lot.shares) > 0 && Number(lot.price) >= 0)
      .sort((a, b) => lotDateValue(a.date) - lotDateValue(b.date));
  }, [activePortfolioId, dcaPositions, isOption, selected]);

  const fifoRows = useMemo(() => {
    if (!selected || safeSharesToSell <= 0) return [] as FifoRow[];
    if (isOption || matchingLots.length === 0) {
      const returnValue = safeSharesToSell * (targetPrice - averageCost) * multiplier * positionDirection;
      return [{
        date: "Average Cost",
        shares: safeSharesToSell,
        buyPrice: averageCost,
        sellPrice: targetPrice,
        costBasis: safeSharesToSell * averageCost * multiplier,
        proceeds: safeSharesToSell * targetPrice * multiplier,
        returnValue,
        source: "average",
      }];
    }

    let remaining = safeSharesToSell;
    const rows: FifoRow[] = [];
    for (const lot of matchingLots) {
      if (remaining <= 0) break;
      const available = Number(lot.shares) || 0;
      const buyPrice = Number(lot.price) || 0;
      const used = Math.min(available, remaining);
      if (used <= 0) continue;
      rows.push({
        date: lot.date,
        shares: used,
        buyPrice,
        sellPrice: targetPrice,
        costBasis: used * buyPrice,
        proceeds: used * targetPrice,
        returnValue: used * (targetPrice - buyPrice),
        source: "lot",
      });
      remaining -= used;
    }

    if (remaining > 0) {
      rows.push({
        date: "Average Cost Remainder",
        shares: remaining,
        buyPrice: averageCost,
        sellPrice: targetPrice,
        costBasis: remaining * averageCost,
        proceeds: remaining * targetPrice,
        returnValue: remaining * (targetPrice - averageCost),
        source: "average",
      });
    }
    return rows;
  }, [averageCost, isOption, matchingLots, multiplier, positionDirection, safeSharesToSell, selected, targetPrice]);

  const partialProfit = fifoRows.reduce((sum, row) => sum + row.returnValue, 0);
  const consumedCostBasis = fifoRows.reduce((sum, row) => sum + row.costBasis, 0);
  const remainingShares = Math.max(Math.abs(shares) - safeSharesToSell, 0);
  const remainingCostBasis = Math.max(totalInvestment - consumedCostBasis, 0);
  const remainingAverageCost = remainingShares ? remainingCostBasis / (remainingShares * multiplier) : 0;

  const rangeFloor = Math.max(0, averageCost * 0.4);
  const rangeCeiling = Math.max(rangeFloor, averageCost * 1.6);
  const sliderValue = targetPriceInput === "" ? averageCost : Math.min(Math.max(targetPrice, rangeFloor), rangeCeiling);
  const currentChange = selected?.previousClose
    ? ((selected.currentPrice - selected.previousClose) / selected.previousClose) * 100
    : 0;
  const isProfit = profit >= 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Profit / Loss Calculator</h1>
          <p className="mt-1 text-sm text-zinc-500">Calculate Your Potential Profit or Loss at Any Selling Price.</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/35 shadow-sm">
        <div className="grid gap-6 p-5 lg:grid-cols-[.95fr_1.45fr] lg:p-6">
          <div className="lg:border-r lg:border-white/10 lg:pr-6">
            <FieldLabel info="Choose a stock or option currently held in the active portfolio. Stock entries show the ticker; option entries show their contract details.">1. Select Existing Position</FieldLabel>
            <select
              value={selected ? positionKey(selected) : ""}
              onChange={(event) => setSelectedKey(event.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-zinc-950/70 px-4 text-sm outline-none focus:border-emerald-400/60"
            >
              {positions.map((holding) => (
                <option key={positionKey(holding)} value={positionKey(holding)}>
                  {holding.assetType === "option" ? holding.company : holding.symbol}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel info="These values come from the selected holding. You can adjust them temporarily to model a different scenario.">2. Position Details (Your Holding)</FieldLabel>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                <p className="flex items-center gap-1 text-xs text-zinc-500">{isOption ? "Contracts" : "Shares"} <InfoTip text={`The number of ${isOption ? "option contracts" : "shares"} used in this calculation. Negative option contracts are treated as a short position.`} /></p>
                <input value={shares} step="any" type="number" onChange={(e) => setShares(numberValue(e.target.value))} className="mt-2 w-full bg-transparent text-lg font-semibold outline-none" />
              </div>
              <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                <p className="flex items-center gap-1 text-xs text-zinc-500">{isOption ? "Avg. Cost / Contract" : "Avg. Cost / Share"} <InfoTip text={`Your average purchase price per ${isOption ? "contract share unit" : "share"}. Option totals apply the standard 100 multiplier.`} /></p>
                <div className="mt-2 flex items-center text-lg font-semibold"><span>$</span><input value={averageCostInput} inputMode="decimal" onChange={(e) => setAverageCostInput(e.target.value)} onBlur={() => setAverageCostInput(numberValue(averageCostInput).toFixed(2))} className="w-full bg-transparent outline-none" /></div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                <p className="flex items-center gap-1 text-xs text-zinc-500">Total Cost <InfoTip text="The total cost basis: absolute position quantity multiplied by average cost, including the 100 multiplier for options." /></p>
                <p className="mt-2 text-lg font-semibold">{money(totalInvestment)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 p-5 lg:p-6">
          <div className="max-w-md">
            <FieldLabel info="Enter the price at which you may sell. All potential return calculations and the partial-sale analysis update from this value.">3. Target Selling Price</FieldLabel>
            <div className="flex h-12 items-center rounded-xl border border-white/10 bg-black/15 px-4 text-lg font-semibold focus-within:border-emerald-400/60">
              <span className="mr-2 text-zinc-400">$</span>
              <input value={targetPriceInput} min={0} step="any" type="number" placeholder="Enter Target Price" onChange={(e) => setTargetPriceInput(e.target.value)} className="w-full bg-transparent outline-none" />
            </div>
            {selected && <p className="mt-3 text-sm text-zinc-400">Current Price: {money(selected.currentPrice)} <span className={currentChange >= 0 ? "text-emerald-400" : "text-rose-400"}>({currentChange >= 0 ? "+" : ""}{currentChange.toFixed(2)}%)</span></p>}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResultCard label="Total Investment" value={money(totalInvestment)} caption={`${Math.abs(shares).toLocaleString()} ${isOption ? "contracts" : "shares"} × ${money(averageCost)}${isOption ? " × 100" : ""}`} info="Your total cost basis for the selected quantity." />
        <ResultCard label="Selling Value" value={money(sellingValue)} caption={`${Math.abs(shares).toLocaleString()} ${isOption ? "contracts" : "shares"} × ${money(targetPrice)}${isOption ? " × 100" : ""}`} info="The gross value of the full position at the target selling price." />
        <ResultCard label="Potential Return" value={signedMoney(profit)} tone={isProfit ? "positive" : "negative"} info="The estimated dollar gain or loss if the entire position is sold at the target price. Negative option quantities use inverse short-position logic." />
        <ResultCard label="Potential Return %" value={`${roi >= 0 ? "+" : ""}${roi.toFixed(2)}%`} tone={isProfit ? "positive" : "negative"} info="Potential Return divided by Total Investment, expressed as a percentage." />
      </div>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/35 p-5 lg:p-6">
        <h2 className="flex items-center gap-2 font-semibold">Total Return Calculator <InfoTip text="Summarizes the full-position outcome at your target selling price." /></h2>
        <div className="mt-5 max-w-xl space-y-3 text-sm">
          <div className="flex justify-between gap-4"><span className="text-zinc-400">Total Investment</span><span>{money(totalInvestment)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-zinc-400">Selling Value</span><span>{money(sellingValue)}</span></div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-3"><span className={isProfit ? "text-emerald-400" : "text-rose-400"}>Potential Return</span><span className={isProfit ? "text-emerald-400" : "text-rose-400"}>{signedMoney(profit)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-zinc-400">Potential Return %</span><span className={isProfit ? "text-emerald-400" : "text-rose-400"}>{roi >= 0 ? "+" : ""}{roi.toFixed(2)}%</span></div>
          <div className="flex justify-between gap-4"><span className="text-zinc-400">Return Per {isOption ? "Contract" : "Share"}</span><span className={profitPerShare >= 0 ? "text-emerald-400" : "text-rose-400"}>{signedMoney(profitPerShare)}</span></div>
        </div>
      </section>

    </div>
  );
}
