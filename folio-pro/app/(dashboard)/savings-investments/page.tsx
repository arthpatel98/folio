"use client";

import { useMemo } from "react";
import { BarChart3, Landmark, TrendingUp, WalletCards } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { portfolioSummary } from "@/lib/calculations/portfolio";
import { cn, money } from "@/lib/utils";
import {
  investmentAccounts,
  quarterlyIncome,
  yearlyIncome,
  ytdPerformance,
} from "@/lib/savings-investments-data";
import { usePortfolioStore, type DataPortfolioId } from "@/store/portfolio-store";

const pct = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;

function Metric({ label, value, detail, icon: Icon, positive }: { label: string; value: string; detail?: string; icon: typeof Landmark; positive?: boolean }) {
  return <Card className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-sm text-zinc-500">{label}</div><div className={cn("mt-2 text-2xl font-semibold tracking-tight", positive === true && "positive", positive === false && "negative")}>{value}</div>{detail && <div className="mt-2 text-xs text-zinc-600">{detail}</div>}</div><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-400"><Icon size={18}/></div></div></Card>;
}

const accountPortfolioIds: Record<string, DataPortfolioId> = {
  Robinhood: "robinhood",
  "Fidelity Roth IRA": "fidelity-401k",
  "Fidelity 401(k)": "fidelity-roth",
};

export default function SavingsInvestmentsPage() {
  const holdingsByPortfolio = usePortfolioStore((state) => state.holdingsByPortfolio);
  const cashByPortfolio = usePortfolioStore((state) => state.cashByPortfolio);
  const transactionsByPortfolio = usePortfolioStore((state) => state.transactionsByPortfolio);

  const accounts = useMemo(() => {
    const monthNumber = new Date().getMonth() + 1;
    const monthFraction = (monthNumber - 1) / 12;

    return investmentAccounts.map((account) => {
      const portfolioId = accountPortfolioIds[account.name];
      const summary = portfolioSummary(
        holdingsByPortfolio[portfolioId] ?? [],
        account.name === "Fidelity 401(k)" ? 0 : (cashByPortfolio[portfolioId] ?? 0),
      );
      const current = summary.value;
      const invested = account.invested;
      const gain = current - invested;
      const totalReturn = invested > 0 ? gain / invested : 0;
      const cagrBaseYears = account.name === "Fidelity Roth IRA" ? 1.0833 : 2;
      const cagrYears = cagrBaseYears + monthFraction;
      const cagr = invested > 0 && current > 0
        ? Math.pow(current / invested, 1 / cagrYears) - 1
        : 0;
      const ytd = account.name === "Robinhood"
        ? current / 83745 - 1
        : account.name === "Fidelity Roth IRA"
          ? current / 16452 - 1
          : 0.205;

      return { ...account, current, gain, totalReturn, cagr, ytd };
    });
  }, [cashByPortfolio, holdingsByPortfolio]);

  const totals = useMemo(() => {
    const invested = accounts.reduce((sum, account) => sum + account.invested, 0);
    const current = accounts.reduce((sum, account) => sum + account.current, 0);
    const gain = current - invested;
    return { invested, current, gain, totalReturn: invested > 0 ? gain / invested : 0 };
  }, [accounts]);

  const realizedSalesByMonth = useMemo(() => {
    const aggregate = (portfolioId: DataPortfolioId) => {
      const monthly = new Map<string, number>();
      (transactionsByPortfolio[portfolioId] ?? []).forEach((transaction) => {
        if (transaction.type !== "sell" || !Number.isFinite(transaction.realizedGain)) return;
        if (!transaction.notes?.includes("Sold from Holdings")) return;
        const date = new Date(`${transaction.date}T12:00:00`);
        if (Number.isNaN(date.getTime())) return;
        const period = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
        monthly.set(period, (monthly.get(period) ?? 0) + (transaction.realizedGain ?? 0));
      });
      return monthly;
    };
    return {
      robinhood: aggregate("robinhood"),
      roth: aggregate("fidelity-401k"),
    };
  }, [transactionsByPortfolio]);

  const mergeMonthlySales = (
    base: { period: string; realizedProfit: number; income: number }[],
    monthlySales: Map<string, number>,
  ) => {
    const rows = base.map((row) => ({ ...row }));
    monthlySales.forEach((profit, period) => {
      const existing = rows.find((row) => row.period === period);
      if (existing) existing.realizedProfit += profit;
      else rows.push({ period, realizedProfit: profit, income: 0 });
    });
    return rows.sort((a, b) => {
      const parsePeriod = (period: string) => {
        const quarter = period.match(/^Q([1-4]) (\d{4})$/);
        if (quarter) return new Date(Number(quarter[2]), (Number(quarter[1]) - 1) * 3, 1).getTime();
        const month = new Date(`${period} 1`);
        return Number.isNaN(month.getTime()) ? 0 : month.getTime();
      };
      return parsePeriod(a.period) - parsePeriod(b.period);
    });
  };

  const robinhoodQuarterly = useMemo(() => mergeMonthlySales(quarterlyIncome.map((row) => {
    const realizedProfit = row.robinhoodProfit - (row.period === "Q1 2025" ? 311.71 : 0);
    return { period: row.period, realizedProfit, income: row.robinhoodIncome };
  }), realizedSalesByMonth.robinhood), [realizedSalesByMonth]);

  const rothQuarterly = useMemo(() => mergeMonthlySales(quarterlyIncome.map((row) => ({
    period: row.period,
    realizedProfit: row.rothProfit,
    income: row.rothIncome,
  })), realizedSalesByMonth.roth), [realizedSalesByMonth]);

  const incomeTotals = useMemo(() => {
    const sum = (rows: { realizedProfit: number; income: number }[]) => ({
      realizedProfit: rows.reduce((total, row) => total + row.realizedProfit, 0),
      income: rows.reduce((total, row) => total + row.income, 0),
    });
    const robinhood = sum(robinhoodQuarterly);
    const roth = sum(rothQuarterly);
    return {
      robinhood,
      roth,
      total: robinhood.realizedProfit + robinhood.income + roth.realizedProfit + roth.income,
    };
  }, [robinhoodQuarterly, rothQuarterly]);

  const brokerageIncomeTotals = useMemo(() => [
    { account: "Robinhood", realizedProfit: incomeTotals.robinhood.realizedProfit, income: incomeTotals.robinhood.income },
    { account: "Roth IRA", realizedProfit: incomeTotals.roth.realizedProfit, income: incomeTotals.roth.income },
  ], [incomeTotals]);

  const dynamicYtd = useMemo(() => ({
    Robinhood: accounts.find((account) => account.name === "Robinhood")?.ytd ?? 0,
    "Roth IRA": accounts.find((account) => account.name === "Fidelity Roth IRA")?.ytd ?? 0,
    "401(k) IRA": 0.205,
  }), [accounts]);

  return <div className="space-y-6">
    <div>
      <p className="text-sm text-zinc-500">Savings & Investments workbook</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Savings & Investments</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">Investment performance using your workbook investment basis and live portfolio values from Holdings.</p>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Total Investments" value={money(totals.current)} detail={`${money(totals.invested)} invested`} icon={WalletCards}/>
      <Metric label="Total Gain" value={money(totals.gain)} detail={`${pct(totals.totalReturn)} total return`} icon={TrendingUp} positive={totals.gain >= 0}/>
      <Metric label="Realized Income" value={money(incomeTotals.total)} detail="Realized profit + DIV / INT / extras" icon={Landmark} positive={incomeTotals.total >= 0}/>
      <Metric label="2026 Realized YTD" value={money(yearlyIncome[2].total)} detail="Through July 2026" icon={BarChart3} positive={yearlyIncome[2].total >= 0}/>
    </div>

    <div className="grid gap-4 xl:grid-cols-3">
      {accounts.map((account) => <Card key={account.name} className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div><div className="text-sm text-zinc-500">Brokerage Account</div><h2 className="mt-1 text-lg font-semibold">{account.name}</h2></div>
          <div className={cn("rounded-xl px-2.5 py-1.5 text-xs font-medium", account.totalReturn >= 0 ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400")}>{pct(account.totalReturn)}</div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-zinc-200 pt-4 dark:border-white/10">
          <div><div className="text-xs text-zinc-500">Investment</div><div className="mt-1 text-xl font-semibold">{money(account.invested)}</div></div>
          <div><div className="text-xs text-zinc-500">Current Value</div><div className="mt-1 text-xl font-semibold">{money(account.current)}</div></div>
          <div><div className="text-xs text-zinc-500">Total Gain</div><div className={cn("mt-1 text-xl font-semibold",account.gain>=0?"positive":"negative")}>{money(account.gain)}</div></div>
          <div><div className="text-xs text-zinc-500">Total Return</div><div className={cn("mt-1 text-sm font-medium",account.totalReturn>=0?"positive":"negative")}>{pct(account.totalReturn)}</div></div>
          <div><div className="text-xs text-zinc-500">CAGR</div><div className={cn("mt-1 text-sm font-medium",account.cagr>=0?"positive":"negative")}>{pct(account.cagr)}</div></div>
          <div><div className="text-xs text-zinc-500">2026 YTD</div><div className={cn("mt-1 text-sm font-medium",account.ytd>=0?"positive":"negative")}>{pct(account.ytd)}</div></div>
        </div>
        <div className="mt-4 space-y-2 text-xs text-zinc-500"><div className="flex justify-between gap-4"><span>Portfolio Start</span><span className="text-zinc-400">{account.start}</span></div><div className="flex justify-between gap-4"><span>All-Time High</span><span className="text-right text-zinc-400">{account.allTimeHigh}</span></div></div>
      </Card>)}
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <QuarterlyChart title="Robinhood Quarterly Data" subtitle="Profit vs Dividend, Interest & Bonus by quarter" data={robinhoodQuarterly}/>
      <QuarterlyChart title="Fidelity Roth IRA Quarterly Data" subtitle="Profit vs Dividend, Interest & Bonus by quarter" data={rothQuarterly}/>
    </div>

    <IncomeTotalsChart data={brokerageIncomeTotals}/>

    <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
      <Card><CardHeader><h2 className="font-medium">Yearly Realized Income</h2><p className="text-xs text-zinc-500">Workbook yearly totals</p></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">{yearlyIncome.map((row)=><div key={row.year} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/[.025]"><div className="text-xs text-zinc-500">{row.year}</div><div className="mt-1 text-xl font-semibold">{money(row.total)}</div></div>)}</CardContent></Card>

      <Card className="overflow-hidden"><CardHeader><h2 className="font-medium">YTD Performance</h2><p className="text-xs text-zinc-500">Annual performance by account; 2026 uses the live formulas above</p></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-white/10"><th className="pb-3 pr-4 font-medium">Account</th><th className="pb-3 px-4 text-right font-medium">2024</th><th className="pb-3 px-4 text-right font-medium">2025</th><th className="pb-3 pl-4 text-right font-medium">2026</th></tr></thead><tbody>{ytdPerformance.map(row=>{
        const currentYtd = dynamicYtd[row.account as keyof typeof dynamicYtd];
        return <tr key={row.account} className="border-b border-zinc-200/70 last:border-0 dark:border-white/[.06]"><td className="py-4 pr-4 font-medium">{row.account}</td><td className={cn("px-4 py-4 text-right font-medium",row["2024"]>=0?"positive":"negative")}>{pct(row["2024"])}</td><td className={cn("px-4 py-4 text-right font-medium",row["2025"]>=0?"positive":"negative")}>{pct(row["2025"])}</td><td className={cn("pl-4 py-4 text-right font-medium",currentYtd>=0?"positive":"negative")}>{pct(currentYtd)}</td></tr>;
      })}</tbody></table></CardContent></Card>
    </div>
  </div>;
}

function chartValueLabel(value: number) {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  if (absolute >= 1000) return `${sign}$${(absolute / 1000).toFixed(absolute >= 10000 ? 0 : 1)}k`;
  return `${sign}$${absolute.toFixed(0)}`;
}

function QuarterlyChart({ title, subtitle, data }: { title: string; subtitle: string; data: { period: string; realizedProfit: number; income: number }[] }) {
  return <Card className="overflow-hidden"><CardHeader className="border-b border-zinc-200/70 dark:border-white/[.06]"><h2 className="font-medium">{title}</h2><p className="text-xs text-zinc-500">{subtitle}</p></CardHeader><CardContent className="pt-5"><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} barGap={6} barCategoryGap="22%" margin={{left:4,right:12,top:28,bottom:4}}><defs><linearGradient id={`${title.replace(/\W/g, "")}-profit`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={1}/><stop offset="100%" stopColor="#10b981" stopOpacity={0.65}/></linearGradient><linearGradient id={`${title.replace(/\W/g, "")}-income`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.65}/></linearGradient></defs><CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(161,161,170,.13)"/><XAxis dataKey="period" tick={{fill:"#71717a",fontSize:10}} axisLine={false} tickLine={false} interval={0} angle={data.length > 8 ? -28 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 55 : 30}/><YAxis tick={{fill:"#71717a",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={(v: number)=>`$${Math.round(v/1000)}k`}/><Tooltip cursor={{fill:"rgba(161,161,170,.06)"}} contentStyle={{background:"#18181b",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,color:"#f4f4f5",boxShadow:"0 12px 30px rgba(0,0,0,.25)"}} formatter={(value: any)=>money(Number(value))}/><Legend wrapperStyle={{fontSize:12,paddingTop:14}} iconType="circle"/><Bar dataKey="realizedProfit" name="Profit" fill={`url(#${title.replace(/\W/g, "")}-profit)`} radius={[7,7,2,2]} maxBarSize={34}><LabelList dataKey="realizedProfit" position="top" formatter={(value: any)=>chartValueLabel(Number(value))} fill="#a1a1aa" fontSize={9}/></Bar><Bar dataKey="income" name="Dividend, Interest & Bonus" fill={`url(#${title.replace(/\W/g, "")}-income)`} radius={[7,7,2,2]} maxBarSize={34}><LabelList dataKey="income" position="top" formatter={(value: any)=>chartValueLabel(Number(value))} fill="#a1a1aa" fontSize={9}/></Bar></BarChart></ResponsiveContainer></div></CardContent></Card>;
}

function IncomeTotalsChart({ data }: { data: { account: string; realizedProfit: number; income: number }[] }) {
  return <Card className="overflow-hidden"><CardHeader className="border-b border-zinc-200/70 dark:border-white/[.06]"><h2 className="font-medium">Realized Income Totals</h2><p className="text-xs text-zinc-500">Total realized profit compared with Dividend, Interest & Bonus for Robinhood and Fidelity Roth IRA.</p></CardHeader><CardContent className="pt-5"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} barGap={10} barCategoryGap="30%" margin={{left:4,right:12,top:28,bottom:0}}><CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(161,161,170,.13)"/><XAxis dataKey="account" tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#71717a",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={(v: number)=>`$${Math.round(v/1000)}k`}/><Tooltip cursor={{fill:"rgba(161,161,170,.06)"}} contentStyle={{background:"#18181b",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,color:"#f4f4f5"}} formatter={(value: any)=>money(Number(value))}/><Legend wrapperStyle={{fontSize:12,paddingTop:14}} iconType="circle"/><Bar dataKey="realizedProfit" name="Realized Profit" fill="#34d399" radius={[8,8,2,2]} maxBarSize={50}><LabelList dataKey="realizedProfit" position="top" formatter={(value: any)=>chartValueLabel(Number(value))} fill="#a1a1aa" fontSize={10}/></Bar><Bar dataKey="income" name="DIV, INT & Bonus" fill="#60a5fa" radius={[8,8,2,2]} maxBarSize={50}><LabelList dataKey="income" position="top" formatter={(value: any)=>chartValueLabel(Number(value))} fill="#a1a1aa" fontSize={10}/></Bar></BarChart></ResponsiveContainer></div></CardContent></Card>;
}
