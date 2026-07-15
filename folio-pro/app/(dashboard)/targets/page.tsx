"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, CircleDollarSign, Clock3, Flag, Info, Plus, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useActivePortfolio } from "@/components/portfolio/portfolio-context";
import { usePortfolioStore } from "@/store/portfolio-store";
import { cn } from "@/lib/utils";
import type { Holding } from "@/types/portfolio";

const ROBINHOOD_TARGETS = [
  ["Aug 31, 2026", 112000, 0], ["Oct 31, 2026", 129360, 17360], ["Dec 31, 2026", 149411, 20051],
  ["Feb 28, 2027", 172569, 23159], ["Apr 30, 2027", 199318, 26748], ["Jun 30, 2027", 230212, 30894],
  ["Aug 31, 2027", 265895, 35683], ["Oct 31, 2027", 307109, 41214], ["Dec 31, 2027", 354710, 47602],
] as const;
const ROTH_TARGETS = [
  ["Aug 31, 2026", 21000, 0], ["Oct 31, 2026", 24675, 3675], ["Dec 31, 2026", 28993, 4318],
  ["Feb 28, 2027", 34067, 5074], ["Apr 30, 2027", 40029, 5962], ["Jun 30, 2027", 47034, 7005],
  ["Aug 31, 2027", 55265, 8231], ["Oct 31, 2027", 64936, 9671], ["Dec 31, 2027", 76300, 11364],
] as const;

const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const money2 = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (value: number) => `${value.toFixed(2)}%`;
const parseDate = (label: string) => new Date(label.replace(",", ""));

function portfolioValue(holdings: Holding[], cash: number) {
  return holdings.reduce((sum, h) => sum + h.currentPrice * h.shares * (h.assetType === "option" ? 100 : 1), 0) + cash;
}

export default function TargetPlannerPage() {
  const { activeId, active } = useActivePortfolio();
  const holdingsByPortfolio = usePortfolioStore((s) => s.holdingsByPortfolio);
  const cashByPortfolio = usePortfolioStore((s) => s.cashByPortfolio);

  const isRobinhood = activeId === "robinhood";
  const isRoth = activeId === "fidelity-401k";
  const isCombined = activeId === "all" || activeId === "fidelity-roth";

  const selectedHoldings = useMemo(() => {
    if (isRobinhood) return holdingsByPortfolio.robinhood;
    if (isRoth) return holdingsByPortfolio["fidelity-401k"];
    return [...holdingsByPortfolio.robinhood, ...holdingsByPortfolio["fidelity-401k"]];
  }, [holdingsByPortfolio, isRobinhood, isRoth]);

  const selectedCash = isRobinhood ? cashByPortfolio.robinhood : isRoth ? cashByPortfolio["fidelity-401k"] : cashByPortfolio.robinhood + cashByPortfolio["fidelity-401k"];
  const currentValue = portfolioValue(selectedHoldings, selectedCash);
  const finalTarget = isRobinhood ? 354710 : isRoth ? 76300 : 455941;
  const milestoneTarget = isCombined ? 431010 : finalTarget;
  const growthRate = isRobinhood ? 15.5 : isRoth ? 17.5 : 16.5;
  const endDate = new Date("2027-12-31T23:59:59");
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000));
  const weeksRemaining = Math.max(1, daysRemaining / 7);
  const monthsRemaining = Math.max(1, daysRemaining / 30.4375);
  const gap = Math.max(0, finalTarget - currentValue);
  const requiredMonthlyRate = currentValue > 0 ? (Math.pow(finalTarget / currentValue, 1 / monthsRemaining) - 1) * 100 : 0;
  const requiredWeeklyRate = currentValue > 0 ? (Math.pow(finalTarget / currentValue, 1 / weeksRemaining) - 1) * 100 : 0;
  const monthlyDollar = gap / monthsRemaining;
  const weeklyDollar = gap / weeksRemaining;
  const progress = Math.min(100, currentValue / finalTarget * 100);

  const rows = useMemo(() => {
    if (isRobinhood) return ROBINHOOD_TARGETS.map(([date, rh, rhInc]) => ({ date, target: rh, increase: rhInc }));
    if (isRoth) return ROTH_TARGETS.map(([date, ,], index) => ({ date, target: ROTH_TARGETS[index][1], increase: ROTH_TARGETS[index][2] }));
    return ROBINHOOD_TARGETS.map(([date, rh, rhInc], index) => ({ date, target: rh + ROTH_TARGETS[index][1], increase: rhInc + ROTH_TARGETS[index][2] }));
  }, [isRobinhood, isRoth]);

  const nextTarget = rows.find((row) => parseDate(row.date).getTime() >= Date.now()) ?? rows[rows.length - 1];

  const actions = useMemo(() => selectedHoldings
    .filter((h) => Math.abs(h.shares) > 0)
    .map((holding, index) => {
      const option = holding.assetType === "option";
      const quantity = option ? Math.max(1, Math.min(Math.abs(holding.shares), 2)) : Math.max(1, Math.min(Math.floor(Math.abs(holding.shares)), Math.ceil(Math.abs(holding.shares) * 0.25)));
      const gain = holding.averageCost > 0 ? (holding.currentPrice - holding.averageCost) / holding.averageCost : 0;
      const add = gain < -0.06;
      const addPrice = holding.currentPrice * (add ? 0.94 : 0.90);
      const sellPrice = Math.max(holding.currentPrice * (1 + growthRate / 100), holding.averageCost * 1.08);
      const multiplier = option ? 100 : 1;
      const estimatedImpact = add
        ? quantity * (sellPrice - addPrice) * multiplier
        : quantity * Math.max(0, sellPrice - holding.currentPrice) * multiplier;
      return {
        ...holding,
        action: add ? "Add" : "Sell",
        addPrice,
        sellPrice,
        quantity,
        estimatedImpact,
        targetDate: rows[Math.min(rows.length - 1, index % rows.length)].date,
      };
    })
    .sort((a, b) => b.estimatedImpact - a.estimatedImpact), [selectedHoldings, growthRate, rows]);

  const totalPotential = actions.reduce((sum, a) => sum + a.estimatedImpact, 0);
  const chartData = rows.map((row) => ({ date: row.date.replace(", 20", " ’"), target: row.target, currentPace: Math.min(row.target, currentValue * Math.pow(1 + growthRate / 100, Math.max(0, (parseDate(row.date).getTime() - Date.now()) / 31557600000))) }));

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div><h1 className="text-3xl font-semibold">Target Portfolio Planner</h1><p className="mt-1 text-sm text-zinc-500">A portfolio-specific roadmap using only positions you already own.</p></div>
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-400">{active.name} · {growthRate}% target pace</div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Metric icon={CircleDollarSign} label="Current Value" value={money2(currentValue)} />
      <Metric icon={Target} label="Target By Dec 31, 2027" value={money(finalTarget)} accent />
      <Metric icon={TrendingUp} label="Total Gap" value={money(gap)} subtle={`${pct(Math.max(0, finalTarget / Math.max(currentValue, 1) * 100 - 100))} needed`} />
      <Metric icon={Clock3} label="Time Remaining" value={`${daysRemaining} Days`} />
      <Metric icon={Flag} label="Progress" value={pct(progress)} subtle={isCombined ? `Milestone: ${money(milestoneTarget)}` : "Toward final target"} />
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
      <Card className="overflow-hidden">
        <div className="border-b border-white/10 p-5"><h2 className="font-semibold">Target Portfolio Values</h2><p className="mt-1 text-sm text-zinc-500">Milestones for {active.name}. The next upcoming target is highlighted.</p></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-white/[.035] text-left text-xs uppercase tracking-wider text-zinc-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Target Value</th><th className="px-5 py-3">Increase</th><th className="px-5 py-3">Gap At Date</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{rows.map((row) => { const isNext = row.date === nextTarget.date; const rowGap = Math.max(0, row.target - currentValue); return <tr key={row.date} className={cn("border-t border-white/[.06]", isNext && "bg-blue-500/[.08]")}><td className="px-5 py-3 font-medium">{row.date}{isNext && <span className="ml-2 rounded-full bg-blue-400/15 px-2 py-0.5 text-[10px] text-blue-300">NEXT</span>}</td><td className="px-5 py-3">{money(row.target)}</td><td className="px-5 py-3 text-emerald-400">{row.increase ? `+${money(row.increase)}` : "—"}</td><td className="px-5 py-3">{money(rowGap)}</td><td className="px-5 py-3"><span className={cn("rounded-full px-2 py-1 text-xs", currentValue >= row.target ? "bg-emerald-400/15 text-emerald-400" : "bg-amber-400/15 text-amber-300")}>{currentValue >= row.target ? "Reached" : "In Progress"}</span></td></tr>})}</tbody></table></div>
      </Card>

      <div className="space-y-4">
        <Card className="p-5"><h2 className="font-semibold">Your Growth Pace</h2><div className="mt-4 space-y-3"><PaceRow label="Monthly" rate={requiredMonthlyRate} amount={monthlyDollar}/><PaceRow label="Weekly" rate={requiredWeeklyRate} amount={weeklyDollar}/><PaceRow label="Average Daily" rate={requiredWeeklyRate / 7} amount={weeklyDollar / 7}/></div></Card>
        <Card className="p-5"><h2 className="font-semibold">Next Milestone</h2><div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-400/[.07] p-4"><div className="flex items-center gap-2 text-sm text-blue-300"><CalendarDays size={16}/>{nextTarget.date}</div><div className="mt-2 text-2xl font-semibold">{money(nextTarget.target)}</div><div className="mt-1 text-sm text-zinc-500">You need {money(Math.max(0, nextTarget.target-currentValue))} more by this date.</div></div></Card>
      </div>
    </div>

    <Card className="p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">Projected Growth Path</h2><p className="mt-1 text-sm text-zinc-500">Target values compared with your current portfolio growing at the selected target pace.</p></div></div><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="targetFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="currentColor" stopOpacity={0.3}/><stop offset="95%" stopColor="currentColor" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.07)"/><XAxis dataKey="date" tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tickFormatter={(v)=>`$${Math.round(v/1000)}K`} tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false}/><Tooltip formatter={(v:number)=>money(v)} contentStyle={{background:"#09090b",border:"1px solid rgba(255,255,255,.1)",borderRadius:12}}/><Area type="monotone" dataKey="target" name="Target" stroke="#3b82f6" fill="url(#targetFill)" strokeWidth={2}/><Area type="monotone" dataKey="currentPace" name="Current Pace" stroke="#22c55e" fillOpacity={0} strokeWidth={2}/></AreaChart></ResponsiveContainer></div></Card>

    <Card className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between"><div><h2 className="font-semibold">Smart Action Plan</h2><p className="mt-1 text-sm text-zinc-500">Suggested add and sell levels based only on positions currently owned in {active.name}.</p></div><div className="text-sm text-emerald-400">Potential estimated increase: {money2(totalPotential)}</div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-white/[.035] text-left text-xs uppercase tracking-wider text-zinc-500"><tr><th className="px-4 py-3">Position</th><th className="px-4 py-3">Owned</th><th className="px-4 py-3">Current</th><th className="px-4 py-3">Suggested Action</th><th className="px-4 py-3">Add At</th><th className="px-4 py-3">Sell At</th><th className="px-4 py-3">Qty / Contracts</th><th className="px-4 py-3">Sell By</th><th className="px-4 py-3">Est. Value Increase</th></tr></thead><tbody>{actions.map((a) => <tr key={`${a.assetType}-${a.symbol}-${a.optionExpiry ?? ""}`} className="border-t border-white/[.06]"><td className="px-4 py-3"><div className="font-medium">{a.symbol}</div><div className="text-xs text-zinc-600">{a.company}</div></td><td className="px-4 py-3">{Math.abs(a.shares).toLocaleString()} {a.assetType === "option" ? "contracts" : "shares"}</td><td className="px-4 py-3">{money2(a.currentPrice)}</td><td className="px-4 py-3"><span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs", a.action === "Add" ? "bg-blue-400/15 text-blue-300" : "bg-emerald-400/15 text-emerald-300")}>{a.action === "Add" && <Plus size={12}/>} {a.action}</span></td><td className="px-4 py-3 text-blue-300">{money2(a.addPrice)}</td><td className="px-4 py-3 text-emerald-300">{money2(a.sellPrice)}</td><td className="px-4 py-3">{a.quantity}</td><td className="px-4 py-3">{a.targetDate}</td><td className="px-4 py-3 text-emerald-400">+{money2(a.estimatedImpact)}</td></tr>)}</tbody></table></div>
      <div className="flex gap-3 border-t border-white/10 p-4 text-xs text-zinc-500"><Info size={16} className="shrink-0 text-amber-400"/><p>These are planning estimates derived from your current holdings, cost basis, target growth rate, and milestone dates. They are not guaranteed returns or personalized investment advice. Review taxes, liquidity, and risk before trading.</p></div>
    </Card>
  </div>;
}

function Metric({ icon: Icon, label, value, subtle, accent=false }: { icon: typeof Target; label: string; value: string; subtle?: string; accent?: boolean }) {
  return <Card className="p-4"><div className="flex items-center gap-2 text-xs text-zinc-500"><span className={cn("grid size-8 place-items-center rounded-lg", accent ? "bg-emerald-400/15 text-emerald-400" : "bg-blue-400/15 text-blue-300")}><Icon size={16}/></span>{label}</div><div className={cn("mt-3 text-xl font-semibold", accent && "text-emerald-400")}>{value}</div>{subtle && <div className="mt-1 text-xs text-zinc-500">{subtle}</div>}</Card>;
}
function PaceRow({ label, rate, amount }: { label: string; rate: number; amount: number }) { return <div className="flex items-center justify-between rounded-xl border border-white/[.07] bg-white/[.025] p-3"><div><div className="text-sm font-medium">{label}</div><div className="text-xs text-zinc-500">On current portfolio value</div></div><div className="text-right"><div className="font-semibold text-emerald-400">{pct(rate)}</div><div className="text-xs text-zinc-500">{money(amount)} needed</div></div></div>; }
