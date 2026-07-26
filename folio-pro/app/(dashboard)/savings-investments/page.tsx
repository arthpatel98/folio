"use client";

import { useMemo, useState } from "react";
import { BarChart3, Landmark, PiggyBank, ReceiptText, TrendingUp, WalletCards } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn, money } from "@/lib/utils";
import {
  expenseAverages,
  expenseCategories,
  expenseMonthly,
  fidelityExtras,
  investmentAccounts,
  investmentTotals,
  quarterlyIncome,
  realizedTotals,
  robinhoodExtras,
  savingsByYear,
  splitwise,
  utilityHistory,
  wealthSnapshot,
  yearlyIncome,
  ytdPerformance,
} from "@/lib/savings-investments-data";

type View = "investments" | "wealth" | "expenses";

const pct = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;

function Metric({ label, value, detail, icon: Icon, positive }: { label: string; value: string; detail?: string; icon: typeof Landmark; positive?: boolean }) {
  return <Card className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-sm text-zinc-500">{label}</div><div className={cn("mt-2 text-2xl font-semibold tracking-tight", positive === true && "positive", positive === false && "negative")}>{value}</div>{detail && <div className="mt-2 text-xs text-zinc-600">{detail}</div>}</div><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-400"><Icon size={18}/></div></div></Card>;
}

function MoneyValue({ value }: { value: number }) {
  return <span className={cn(value > 0 && "text-emerald-400", value < 0 && "text-red-400")}>{money(value)}</span>;
}

export default function SavingsInvestmentsPage() {
  const [view, setView] = useState<View>("investments");
  const latestSavings = useMemo(() => savingsByYear.filter((row) => row.period.includes("2026")).reduce((sum, row) => sum + row.amount, 0), []);
  const expenseChart = useMemo(() => expenseMonthly.map((row) => ({ month: row.month.replace(" 2026", ""), total: row.total })), []);

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="text-sm text-zinc-500">Savings & Investments workbook · Updated {wealthSnapshot.updated}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Savings & Investments</h1><p className="mt-2 max-w-2xl text-sm text-zinc-500">A unified view of portfolio performance, savings, net worth, income, and monthly spending from your workbook.</p></div>
      <div className="inline-flex w-full rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-white/10 dark:bg-white/[.03] md:w-auto">
        {([['investments','Investments'],['wealth','Savings & Net Worth'],['expenses','Expenses']] as const).map(([key,label]) => <button key={key} onClick={()=>setView(key)} className={cn("flex-1 rounded-lg px-3 py-2 text-sm text-zinc-500 transition md:flex-none", view===key && "bg-white text-zinc-950 shadow-sm dark:bg-white/[.08] dark:text-white")}>{label}</button>)}
      </div>
    </div>

    {view === "investments" && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total Investments" value={money(investmentTotals.current)} detail={`${money(investmentTotals.invested)} invested`} icon={WalletCards}/>
        <Metric label="Total Gain" value={money(investmentTotals.gain)} detail={`${pct(investmentTotals.totalReturn)} total return`} icon={TrendingUp} positive={investmentTotals.gain >= 0}/>
        <Metric label="Realized Income" value={money(realizedTotals.total)} detail="Realized profit + DIV / INT / extras" icon={Landmark} positive={realizedTotals.total >= 0}/>
        <Metric label="2026 Realized YTD" value={money(yearlyIncome[2].total)} detail="Through July 2026" icon={BarChart3} positive={yearlyIncome[2].total >= 0}/>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {investmentAccounts.map((account) => <Card key={account.name} className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-sm text-zinc-500">Brokerage Account</div><h2 className="mt-1 text-lg font-semibold">{account.name}</h2></div><div className={cn("rounded-xl px-2.5 py-1.5 text-xs font-medium", account.gain >= 0 ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400")}>{pct(account.totalReturn)}</div></div><div className="mt-5 grid grid-cols-2 gap-4 border-t border-zinc-200 pt-4 dark:border-white/10"><div><div className="text-xs text-zinc-500">Current Value</div><div className="mt-1 text-xl font-semibold">{money(account.current)}</div></div><div><div className="text-xs text-zinc-500">Total Gain</div><div className={cn("mt-1 text-xl font-semibold",account.gain>=0?"positive":"negative")}>{money(account.gain)}</div></div><div><div className="text-xs text-zinc-500">CAGR</div><div className={cn("mt-1 text-sm font-medium",account.cagr>=0?"positive":"negative")}>{pct(account.cagr)}</div></div><div><div className="text-xs text-zinc-500">2026 YTD</div><div className={cn("mt-1 text-sm font-medium",account.ytd>=0?"positive":"negative")}>{pct(account.ytd)}</div></div></div><div className="mt-4 space-y-2 text-xs text-zinc-500"><div className="flex justify-between gap-4"><span>Portfolio Start</span><span className="text-zinc-400">{account.start}</span></div><div className="flex justify-between gap-4"><span>All-Time High</span><span className="text-right text-zinc-400">{account.allTimeHigh}</span></div></div></Card>)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card><CardHeader><h2 className="font-medium">Realized Income By Period</h2><p className="text-xs text-zinc-500">Combined Robinhood and Roth IRA realized profit, dividends, interest, and extras</p></CardHeader><CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={[...quarterlyIncome]} margin={{left:4,right:8,top:8,bottom:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(161,161,170,.12)"/><XAxis dataKey="period" tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={(v)=>`$${Math.round(v/1000)}k`}/><Tooltip cursor={{fill:"rgba(255,255,255,.03)"}} contentStyle={{background:"#18181b",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,color:"#f4f4f5"}} formatter={(value)=>money(Number(value))}/><Bar dataKey="total" fill="#34d399" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></CardContent></Card>
        <Card><CardHeader><h2 className="font-medium">Yearly Realized Income</h2><p className="text-xs text-zinc-500">Workbook yearly totals</p></CardHeader><CardContent className="space-y-3">{yearlyIncome.map((row)=><div key={row.year} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/[.025]"><div className="text-xs text-zinc-500">{row.year}</div><div className="mt-1 text-xl font-semibold">{money(row.total)}</div></div>)}</CardContent></Card>
      </div>

      <Card className="overflow-hidden"><CardHeader><h2 className="font-medium">YTD Performance</h2><p className="text-xs text-zinc-500">Annual performance by account</p></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-white/10"><th className="pb-3 pr-4 font-medium">Account</th><th className="pb-3 px-4 text-right font-medium">2024</th><th className="pb-3 px-4 text-right font-medium">2025</th><th className="pb-3 pl-4 text-right font-medium">2026</th></tr></thead><tbody>{ytdPerformance.map(row=><tr key={row.account} className="border-b border-zinc-200/70 last:border-0 dark:border-white/[.06]"><td className="py-4 pr-4 font-medium">{row.account}</td>{(["2024","2025","2026"] as const).map(y=><td key={y} className={cn("px-4 py-4 text-right font-medium",row[y]>=0?"positive":"negative")}>{pct(row[y])}</td>)}</tr>)}</tbody></table></CardContent></Card>
    </>}

    {view === "wealth" && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total Net Worth" value={money(wealthSnapshot.totalNetWorth)} detail={`Updated ${wealthSnapshot.updated}`} icon={Landmark}/><Metric label="Cash" value={money(wealthSnapshot.cash)} detail="Asset balance" icon={WalletCards}/><Metric label="Investments" value={money(wealthSnapshot.investments)} detail="Current investment value" icon={TrendingUp}/><Metric label="Property" value={money(wealthSnapshot.property)} detail={`Debts ${money(wealthSnapshot.debts)}`} icon={PiggyBank}/></div>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card><CardHeader><h2 className="font-medium">Savings Progress</h2><p className="text-xs text-zinc-500">Historical savings and 2026 quarterly / monthly additions</p></CardHeader><CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={[...savingsByYear]}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(161,161,170,.12)"/><XAxis dataKey="period" tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={(v)=>`$${Math.round(v/1000)}k`}/><Tooltip contentStyle={{background:"#18181b",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,color:"#f4f4f5"}} formatter={(value)=>money(Number(value))}/><Bar dataKey="amount" fill="#34d399" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></CardContent></Card>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><Metric label="2026 Savings" value={money(latestSavings)} detail="Q1 + Q2 + July" icon={PiggyBank}/><Metric label="NR Cash Value" value={money(wealthSnapshot.nrCashValue)} detail="Workbook cash-value metric" icon={WalletCards}/></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3"><DataList title="SplitWise" subtitle="Current balances" rows={splitwise.map(r=>({label:r.item,value:r.amount}))}/><DataList title="Robinhood Extras" subtitle="Interest, boost, and membership" rows={robinhoodExtras.map(r=>({label:r.item,value:r.amount,detail:r.lastPosted}))}/><DataList title="Fidelity Extras" subtitle="Dividends and capital gains" rows={fidelityExtras.map(r=>({label:r.item,value:r.amount,detail:r.lastPosted}))}/></div>
    </>}

    {view === "expenses" && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="2026 Avg. / Month" value={money(expenseAverages["2026"].total)} detail="Average monthly spending" icon={ReceiptText}/><Metric label="2025 Avg. / Month" value={money(expenseAverages["2025"].total)} detail="Average monthly spending" icon={ReceiptText}/><Metric label="July 2026 Spend" value={money(expenseMonthly.at(-1)?.total ?? 0)} detail="Latest month in workbook" icon={WalletCards}/><Metric label="July Utilities" value={money(utilityHistory.at(-1)?.total ?? 0)} detail="CE + Wi-Fi + DTE + fees + insurance" icon={Landmark}/></div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]"><Card><CardHeader><h2 className="font-medium">Monthly Spending</h2><p className="text-xs text-zinc-500">Total expenses by month in 2026</p></CardHeader><CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={expenseChart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(161,161,170,.12)"/><XAxis dataKey="month" tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={(v)=>`$${Math.round(v/1000)}k`}/><Tooltip contentStyle={{background:"#18181b",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,color:"#f4f4f5"}} formatter={(value)=>money(Number(value))}/><Bar dataKey="total" fill="#34d399" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></CardContent></Card><Card><CardHeader><h2 className="font-medium">Utilities Trend</h2><p className="text-xs text-zinc-500">Recent monthly household utilities</p></CardHeader><CardContent className="space-y-3">{utilityHistory.map(row=><div key={row.month} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/[.025]"><div className="flex items-center justify-between"><div className="text-sm font-medium">{row.month}</div><div className="font-semibold">{money(row.total)}</div></div><div className="mt-2 text-xs text-zinc-500">CE {money(row.ce)} · Wi-Fi {money(row.wifi)} · DTE {money(row.dte)}</div></div>)}</CardContent></Card></div>
      <Card className="overflow-hidden"><CardHeader><h2 className="font-medium">Expense Detail</h2><p className="text-xs text-zinc-500">Monthly category data from the Expenses worksheet</p></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[1500px] text-sm"><thead><tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-white/10"><th className="pb-3 pr-4 font-medium">Month</th>{expenseCategories.map(c=><th key={c} className="px-3 pb-3 text-right font-medium">{c}</th>)}<th className="pb-3 pl-3 text-right font-medium">Total</th></tr></thead><tbody>{expenseMonthly.map(row=><tr key={row.month} className="border-b border-zinc-200/70 last:border-0 dark:border-white/[.06]"><td className="py-4 pr-4 font-medium">{row.month}</td>{row.values.map((v,i)=><td key={i} className="px-3 py-4 text-right"><MoneyValue value={v}/></td>)}<td className="py-4 pl-3 text-right font-semibold">{money(row.total)}</td></tr>)}</tbody></table></CardContent></Card>
    </>}
  </div>;
}

function DataList({ title, subtitle, rows }: { title: string; subtitle: string; rows: { label: string; value: number; detail?: string }[] }) {
  const total = rows.reduce((sum,row)=>sum+row.value,0);
  return <Card><CardHeader><div className="flex items-start justify-between gap-3"><div><h2 className="font-medium">{title}</h2><p className="text-xs text-zinc-500">{subtitle}</p></div><div className="text-sm font-semibold"><MoneyValue value={total}/></div></div></CardHeader><CardContent className="space-y-1">{rows.map(row=><div key={row.label} className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition hover:bg-zinc-100 dark:hover:bg-white/[.04]"><div className="min-w-0"><div className="truncate text-sm">{row.label}</div>{row.detail&&<div className="mt-0.5 text-xs text-zinc-600">Last posted {row.detail}</div>}</div><div className="shrink-0 text-sm font-medium"><MoneyValue value={row.value}/></div></div>)}</CardContent></Card>;
}
