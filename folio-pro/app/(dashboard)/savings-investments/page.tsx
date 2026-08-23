"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Landmark, TrendingUp, WalletCards, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { portfolioSummary } from "@/lib/calculations/portfolio";
import { cn, money } from "@/lib/utils";
import {
  investmentAccounts,
  quarterlyIncome,
  ytdPerformance,
} from "@/lib/savings-investments-data";
import { useActivePortfolio } from "@/components/portfolio/portfolio-context";
import { usePortfolioStore, type DataPortfolioId } from "@/store/portfolio-store";

const pct = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
const wholeDollar = (value: number) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}).format(Math.round(value));

type ExtraRow = { id: string; label: string; amount: number; lastPostedDate: string };
type ProfitDrilldownTransaction = {
  id: string;
  date: string;
  ticker: string;
  label: string;
  quantity: number | null;
  price: number | null;
  proceeds: number | null;
  realizedProfit: number;
  category: "Sell Call" | "Sell Put" | "Buy Call" | "Buy Put" | "Common Stocks";
};
type ProfitTickerGroup = {
  ticker: string;
  realizedProfit: number;
  percent: number;
  transactions: ProfitDrilldownTransaction[];
};
type ExtrasByPortfolio = Record<"robinhood"|"fidelity-roth", ExtraRow[]>;
const EXTRAS_STORAGE_KEY = "folio-portfolio-performance-extras-v1";
type AllTimeHighEntry = { value: number; date: string };
type AllTimeHighByPortfolio = Record<DataPortfolioId, AllTimeHighEntry>;
const ALL_TIME_HIGH_STORAGE_KEY = "folio-portfolio-performance-all-time-high-v1";
const DEFAULT_ALL_TIME_HIGHS: AllTimeHighByPortfolio = {
  robinhood: { value: 108128, date: "2025-11-05" },
  "fidelity-roth": { value: 20134, date: "2025-08-06" },
  "fidelity-401k": { value: 21194, date: "2026-06-02" },
};

const DEFAULT_EXTRAS: ExtrasByPortfolio = {
  robinhood: [
    { id:"rg-interest", label:"RG Interest", amount:651.71, lastPostedDate:"2026-07-31" },
    { id:"rg-deposit-boost", label:"RG Deposit Boost", amount:197.71, lastPostedDate:"2026-07-31" },
    { id:"rg-membership", label:"RG Membership", amount:-93.32, lastPostedDate:"2026-03-04" },
  ],
  "fidelity-roth": [
    { id:"spaxx-dividend", label:"SPAXX Dividend", amount:159.89, lastPostedDate:"2026-07-31" },
    { id:"mags-short-term-cap-gain", label:"MAGS Short - Term Cap Gain", amount:0.86, lastPostedDate:"2024-12-31" },
  ],
};

function formatDisplayDate(value: string) {
  if (!value) return "—";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ExtrasTable({rows,onSave}:{rows:ExtraRow[];onSave:(rows:ExtraRow[])=>void}) {
  const [draft,setDraft]=useState(rows);
  const [editing,setEditing]=useState<{id:string;field:"amount"|"lastPostedDate"}|null>(null);
  useEffect(()=>setDraft(rows),[rows]);
  const total=draft.reduce((sum,row)=>sum+(Number(row.amount)||0),0);
  const update=(id:string,field:"amount"|"lastPostedDate",value:string)=>{
    setDraft(current=>{
      const next=current.map(row=>row.id===id?{...row,[field]:field==="amount"?(value===""?0:Number(value)||0):value}:row);
      onSave(next);
      return next;
    });
  };
  return <Card className="overflow-hidden">
    <CardHeader><h2 className="font-medium">Extras</h2></CardHeader>
    <CardContent><div className="overflow-hidden rounded-t-xl border border-b-0 border-dashed border-zinc-300/80 dark:border-white/15 dark:border-b-0"><table className="w-full table-fixed border-collapse text-xs sm:text-sm">
      <thead><tr className="text-left text-[11px] text-zinc-500 sm:text-xs"><th className="w-[42%] border-b border-r border-dashed border-zinc-300/70 p-3 font-medium dark:border-white/10">Extras</th><th className="w-[25%] border-b border-r border-dashed border-zinc-300/70 p-3 text-right font-medium dark:border-white/10">Amount</th><th className="w-[33%] border-b border-dashed border-zinc-300/70 p-3 text-right font-medium dark:border-white/10">Last Posted Date</th></tr></thead>
      <tbody>{draft.map((row,index)=><tr key={row.id}>
        <td className={cn("border-r border-dashed border-zinc-300/60 p-3 font-medium dark:border-white/10",index<draft.length-1&&"border-b")}>{row.label}</td>
        <td className={cn("border-r border-dashed border-zinc-300/60 p-2 text-right dark:border-white/10",index<draft.length-1&&"border-b")}>
          {editing?.id===row.id&&editing.field==="amount"
            ? <input autoFocus type="number" step="0.01" value={row.amount===0?"":row.amount} placeholder="0.00" onChange={e=>update(row.id,"amount",e.target.value)} onBlur={()=>setEditing(null)} onKeyDown={e=>{if(e.key==="Enter")setEditing(null);}} className={cn("h-9 w-full rounded-lg border border-white/10 bg-transparent px-2 text-right font-medium tabular-nums outline-none",row.amount<0?"negative":"positive")}/>
            : <button type="button" onClick={()=>setEditing({id:row.id,field:"amount"})} className={cn("w-full rounded-md px-2 py-2 text-right font-medium tabular-nums transition hover:bg-white/[.04]",row.amount<0?"negative":"positive")} title="Click To Edit Amount">{money(row.amount)}</button>}
        </td>
        <td className={cn("p-2 text-right",index<draft.length-1&&"border-b border-dashed border-zinc-300/60 dark:border-white/10")}>
          {editing?.id===row.id&&editing.field==="lastPostedDate"
            ? <input autoFocus type="date" value={row.lastPostedDate} onChange={e=>update(row.id,"lastPostedDate",e.target.value)} onBlur={()=>setEditing(null)} onKeyDown={e=>{if(e.key==="Enter")setEditing(null);}} className="h-9 w-full rounded-lg border border-white/10 bg-transparent px-2 text-right text-xs font-medium outline-none"/>
            : <button type="button" onClick={()=>setEditing({id:row.id,field:"lastPostedDate"})} className="w-full rounded-md px-2 py-2 text-right text-xs font-medium transition hover:bg-white/[.04]" title="Click To Edit Last Posted Date">{formatDisplayDate(row.lastPostedDate)}</button>}
        </td>
      </tr>)}
      <tr className="border-t border-zinc-300/60 font-semibold dark:border-white/10"><td className="border-r border-zinc-300/60 p-3 dark:border-white/10">Total</td><td className={cn("border-r border-zinc-300/60 p-3 text-right tabular-nums dark:border-white/10",total<0?"negative":"positive")}>{money(total)}</td><td className="p-3"/></tr></tbody>
    </table></div></CardContent>
  </Card>;
}

// The workbook/manual July 2026 Robinhood baseline is $3,669.10. Only Holdings
// sales created after this build are layered onto that baseline so existing
// historical transactions do not double-count the value the user supplied.
const REALIZED_CHART_FUTURE_SALE_CUTOFF_MS = 1785077788669;
const isFutureHoldingsSale = (transactionId: string) => {
  const match = transactionId.match(/^trade-(\d+)-/);
  return Boolean(match && Number(match[1]) > REALIZED_CHART_FUTURE_SALE_CUTOFF_MS);
};

function Metric({ label, value, detail, icon: Icon, positive }: { label: string; value: string; detail?: string; icon: typeof Landmark; positive?: boolean }) {
  return <Card className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-sm text-zinc-500">{label}</div><div className={cn("mt-2 text-2xl font-semibold tracking-tight", positive === true && "positive", positive === false && "negative")}>{value}</div>{detail && <div className="mt-2 text-xs text-zinc-600">{detail}</div>}</div><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-400"><Icon size={18}/></div></div></Card>;
}

const accountPortfolioIds: Record<string, DataPortfolioId> = {
  Robinhood: "robinhood",
  "Fidelity Roth IRA": "fidelity-roth",
  "Fidelity 401(k)": "fidelity-401k",
};

export default function SavingsInvestmentsPage() {
  const { activeId } = useActivePortfolio();
  const [extras,setExtras]=useState<ExtrasByPortfolio>(DEFAULT_EXTRAS);
  const [allTimeHighs,setAllTimeHighs]=useState<AllTimeHighByPortfolio>(DEFAULT_ALL_TIME_HIGHS);
  const [editingAllTimeHigh,setEditingAllTimeHigh]=useState<{portfolioId:DataPortfolioId;field:"value"|"date"}|null>(null);
  const [profitDrilldown,setProfitDrilldown]=useState<{portfolioId:DataPortfolioId;period:string}|null>(null);
  useEffect(()=>{
    try {
      const saved=window.localStorage.getItem(ALL_TIME_HIGH_STORAGE_KEY);
      if(saved) setAllTimeHighs(current=>({...current,...JSON.parse(saved)}));
    } catch {}
  },[]);
  const updateAllTimeHigh=(portfolioId:DataPortfolioId,field:"value"|"date",raw:string)=>{
    setAllTimeHighs(current=>{
      const next={...current,[portfolioId]:{...current[portfolioId],[field]:field==="value"?(Number(raw)||0):raw}};
      try{window.localStorage.setItem(ALL_TIME_HIGH_STORAGE_KEY,JSON.stringify(next));}catch{}
      return next;
    });
  };
  useEffect(()=>{
    try{
      const saved=window.localStorage.getItem(EXTRAS_STORAGE_KEY);
      if(saved){
        const parsed=JSON.parse(saved) as Partial<ExtrasByPortfolio>;
        setExtras({
          robinhood:Array.isArray(parsed.robinhood)?parsed.robinhood:DEFAULT_EXTRAS.robinhood,
          "fidelity-roth":Array.isArray(parsed["fidelity-roth"])?parsed["fidelity-roth"]:DEFAULT_EXTRAS["fidelity-roth"],
        });
      }
    }catch{}
  },[]);
  const saveExtras=(portfolioId:"robinhood"|"fidelity-roth",rows:ExtraRow[])=>{
    setExtras(current=>{
      const next={...current,[portfolioId]:rows};
      try{window.localStorage.setItem(EXTRAS_STORAGE_KEY,JSON.stringify(next));}catch{}
      return next;
    });
  };
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
          : 0.1465;

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
        if (!isFutureHoldingsSale(transaction.id)) return;
        const date = new Date(`${transaction.date}T12:00:00`);
        if (Number.isNaN(date.getTime())) return;
        const period = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
        monthly.set(period, (monthly.get(period) ?? 0) + (transaction.realizedGain ?? 0));
      });
      return monthly;
    };
    return {
      robinhood: aggregate("robinhood"),
      roth: aggregate("fidelity-roth"),
    };
  }, [transactionsByPortfolio]);

  const profitDrilldownGroups = useMemo<ProfitTickerGroup[]>(() => {
    if (!profitDrilldown) return [];
    const transactions = transactionsByPortfolio[profitDrilldown.portfolioId] ?? [];
    const matching = transactions.filter((transaction) => {
      if (transaction.type !== "sell" || !Number.isFinite(transaction.realizedGain)) return false;
      if (!transaction.notes?.includes("Sold from Holdings")) return false;
      if (!isFutureHoldingsSale(transaction.id)) return false;
      const date = new Date(`${transaction.date}T12:00:00`);
      if (Number.isNaN(date.getTime())) return false;
      const period = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
      return period === profitDrilldown.period;
    });

    const groups = new Map<string, ProfitDrilldownTransaction[]>();
    matching.forEach((transaction) => {
      const ticker = (transaction.symbol ?? "Other").trim().toUpperCase() || "Other";
      const optionType = transaction.assetType === "option"
        ? transaction.optionType?.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
        : "";
      const strike = transaction.assetType === "option" && typeof transaction.optionStrike === "number"
        ? ` $${transaction.optionStrike}`
        : "";
      const expiry = transaction.assetType === "option" && transaction.optionExpiry
        ? ` · ${new Date(`${transaction.optionExpiry}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : "";
      const label = transaction.assetType === "option"
        ? `${ticker}${strike} ${optionType || "Option"}${expiry}`
        : ticker;
      const category: ProfitDrilldownTransaction["category"] = transaction.assetType !== "option"
        ? "Common Stocks"
        : transaction.optionType === "sell-call"
          ? "Sell Call"
          : transaction.optionType === "sell-put"
            ? "Sell Put"
            : transaction.optionType === "buy-put"
              ? "Buy Put"
              : "Buy Call";
      const row: ProfitDrilldownTransaction = {
        id: transaction.id,
        date: transaction.date,
        ticker,
        label,
        quantity: typeof transaction.quantity === "number" ? Math.abs(transaction.quantity) : null,
        price: typeof transaction.price === "number" ? transaction.price : null,
        proceeds: typeof transaction.realizedProceeds === "number"
          ? transaction.realizedProceeds
          : transaction.amount ? Math.abs(transaction.amount) : null,
        realizedProfit: Number(transaction.realizedGain) || 0,
        category,
      };
      groups.set(ticker, [...(groups.get(ticker) ?? []), row]);
    });

    const total = matching.reduce((sum, transaction) => sum + (Number(transaction.realizedGain) || 0), 0);
    return Array.from(groups.entries())
      .map(([ticker, transactions]) => {
        const realizedProfit = transactions.reduce((sum, transaction) => sum + transaction.realizedProfit, 0);
        return { ticker, realizedProfit, percent: total ? realizedProfit / total * 100 : 0, transactions };
      })
      .sort((a,b) => b.realizedProfit - a.realizedProfit);
  }, [profitDrilldown, transactionsByPortfolio]);

  const profitDrilldownTotal = profitDrilldownGroups.reduce((sum, group) => sum + group.realizedProfit, 0);

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

  const selectedRealizedIncome = activeId === "robinhood"
    ? incomeTotals.robinhood.realizedProfit + incomeTotals.robinhood.income
    : activeId === "fidelity-roth"
      ? incomeTotals.roth.realizedProfit + incomeTotals.roth.income
      : activeId === "fidelity-401k"
        ? 0
        : incomeTotals.total;

  const yearlyRealizedIncome = useMemo(() => {
    const summarize = (rows: { period: string; realizedProfit: number; income: number }[]) => {
      const totals = new Map<string, { realizedProfit: number; income: number }>();
      rows.forEach((row) => {
        const yearMatch = row.period.match(/(20\d{2})/);
        if (!yearMatch) return;
        const year = yearMatch[1];
        const current = totals.get(year) ?? { realizedProfit: 0, income: 0 };
        current.realizedProfit += row.realizedProfit;
        current.income += row.income;
        totals.set(year, current);
      });
      return ["2024", "2025", "2026"].map((year) => {
        const values = totals.get(year) ?? { realizedProfit: 0, income: 0 };
        return {
          year: year === "2026" ? "2026 YTD" : year,
          realizedProfit: values.realizedProfit,
          income: values.income,
          total: values.realizedProfit + values.income,
        };
      });
    };

    if (activeId === "robinhood") return summarize(robinhoodQuarterly);
    if (activeId === "fidelity-roth") return summarize(rothQuarterly);
    if (activeId === "fidelity-401k") return summarize([]);
    return summarize([...robinhoodQuarterly, ...rothQuarterly]);
  }, [activeId, robinhoodQuarterly, rothQuarterly]);

  const selected2026Income = yearlyRealizedIncome.find((row) => row.year === "2026 YTD")?.total ?? 0;

  const brokerageIncomeTotals = useMemo(() => [
    { account: "Robinhood", realizedProfit: incomeTotals.robinhood.realizedProfit, income: incomeTotals.robinhood.income },
    { account: "Fidelity Roth IRA", realizedProfit: incomeTotals.roth.realizedProfit, income: incomeTotals.roth.income },
  ], [incomeTotals]);

  const dynamicYtd = useMemo(() => ({
    Robinhood: accounts.find((account) => account.name === "Robinhood")?.ytd ?? 0,
    "Fidelity Roth IRA": accounts.find((account) => account.name === "Fidelity Roth IRA")?.ytd ?? 0,
    "Fidelity 401(k)": 0.1465,
  }), [accounts]);

  const selectedVisual = activeId === "robinhood"
    ? <QuarterlyChart title="Robinhood Quarterly Data" subtitle="Profit Vs Dividend, Interest & Bonus By Quarter" data={robinhoodQuarterly} onProfitBarClick={(period)=>setProfitDrilldown({portfolioId:"robinhood",period})}/>
    : activeId === "fidelity-roth"
      ? <QuarterlyChart title="Fidelity Roth IRA Quarterly Data" subtitle="Profit Vs Dividend, Interest & Bonus By Quarter" data={rothQuarterly} onProfitBarClick={(period)=>setProfitDrilldown({portfolioId:"fidelity-roth",period})}/>
      : activeId === "fidelity-401k"
        ? <YtdAccountChart account="Fidelity 401(k)" data={ytdPerformance.find((row) => row.account === "401(k) IRA") ?? { account: "401(k) IRA", "2024": 0, "2025": 0, "2026": 0.1465 }} currentYtd={dynamicYtd["Fidelity 401(k)"]}/>
        : <IncomeTotalsChart data={brokerageIncomeTotals}/>;

  return <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Portfolio Performance</h1>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Total Investments" value={money(totals.current)} detail={`${money(totals.invested)} Invested`} icon={WalletCards}/>
      <Metric label="Total Gain" value={money(totals.gain)} detail={`${pct(totals.totalReturn)} Total Return`} icon={TrendingUp} positive={totals.gain >= 0}/>
      <Metric label="Realized Income" value={money(selectedRealizedIncome)} icon={Landmark} positive={selectedRealizedIncome >= 0}/>
      <Metric label="2026 Realized YTD" value={money(selected2026Income)} detail="Through July 2026" icon={BarChart3} positive={selected2026Income >= 0}/>
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
        <div className="mt-4 space-y-2 text-xs">
          <div className="grid min-h-7 grid-cols-[auto_1fr] items-center gap-4">
            <span className="text-zinc-500">Portfolio Start</span>
            <span className="text-right text-zinc-400">{account.start}</span>
          </div>
          {(()=>{
            const portfolioId=accountPortfolioIds[account.name];
            const ath=allTimeHighs[portfolioId];
            return <div className="grid min-h-7 grid-cols-[auto_1fr] items-center gap-4">
              <span className="text-zinc-500">All-Time High</span>
              {editingAllTimeHigh?.portfolioId===portfolioId
                ? <div className="flex min-w-0 flex-wrap justify-end gap-2"><input autoFocus type="number" step="1" value={ath.value||""} onChange={e=>updateAllTimeHigh(portfolioId,"value",e.target.value)} className="h-8 w-28 rounded-lg border border-white/10 bg-transparent px-2 text-right text-xs text-zinc-300 outline-none"/><input type="date" value={ath.date} onChange={e=>updateAllTimeHigh(portfolioId,"date",e.target.value)} onKeyDown={e=>{if(e.key==="Enter")setEditingAllTimeHigh(null);}} className="h-8 w-36 rounded-lg border border-white/10 bg-transparent px-2 text-right text-xs text-zinc-300 outline-none"/><button type="button" onClick={()=>setEditingAllTimeHigh(null)} className="h-8 rounded-lg border border-white/10 px-2 text-xs text-zinc-400 hover:bg-white/[.04]">Done</button></div>
                : <button type="button" onClick={()=>setEditingAllTimeHigh({portfolioId,field:"value"})} className="justify-self-end whitespace-nowrap p-0 text-right text-xs text-zinc-400 transition hover:text-zinc-200" title="Click To Edit All-Time High">{wholeDollar(ath.value)} On {formatDisplayDate(ath.date)}</button>}
            </div>;
          })()}
        </div>
      </Card>)}
    </div>

    {selectedVisual}

    {profitDrilldown && <ProfitDrilldownModal
      period={profitDrilldown.period}
      groups={profitDrilldownGroups}
      total={profitDrilldownTotal}
      onClose={()=>setProfitDrilldown(null)}
    />}

    <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
      <Card>
        <CardHeader><h2 className="font-medium">Yearly Realized Income</h2></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {yearlyRealizedIncome.map((row)=><div key={row.year} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/[.025]">
            <div className="text-xs text-zinc-500">{row.year}</div>
            <div className={cn("mt-1 text-xl font-semibold", row.total >= 0 ? "positive" : "negative")}>{money(row.total)}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-200/70 pt-3 text-xs dark:border-white/[.06]">
              <div><div className="text-zinc-500">Profit</div><div className={cn("mt-1 font-medium", row.realizedProfit >= 0 ? "positive" : "negative")}>{money(row.realizedProfit)}</div></div>
              <div><div className="text-zinc-500">Dividend, Interest & Bonus</div><div className={cn("mt-1 font-medium", row.income >= 0 ? "positive" : "negative")}>{money(row.income)}</div></div>
            </div>
          </div>)}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="overflow-hidden">
          <CardHeader><h2 className="font-medium">YTD Performance</h2></CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-dashed border-zinc-300/80 dark:border-white/15">
              <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
                <thead><tr className="text-left text-[11px] text-zinc-500 sm:text-xs">
                  <th className="w-[43%] border-b border-r border-dashed border-zinc-300/70 p-3 font-medium dark:border-white/10">Account</th>
                  <th className="w-[19%] border-b border-r border-dashed border-zinc-300/70 p-3 text-right font-medium dark:border-white/10">2024</th>
                  <th className="w-[19%] border-b border-r border-dashed border-zinc-300/70 p-3 text-right font-medium dark:border-white/10">2025</th>
                  <th className="w-[19%] border-b border-dashed border-zinc-300/70 p-3 text-right font-medium dark:border-white/10">2026</th>
                </tr></thead>
                <tbody>{ytdPerformance.map((row, index)=>{
                  const displayAccount = row.account === "Roth IRA" ? "Fidelity Roth IRA" : row.account === "401(k) IRA" ? "Fidelity 401(k)" : row.account;
                  const currentYtd = dynamicYtd[displayAccount as keyof typeof dynamicYtd];
                  const rowBorder = index < ytdPerformance.length - 1 ? "border-b border-dashed border-zinc-300/60 dark:border-white/10" : "";
                  return <tr key={row.account}>
                    <td className={cn("break-words border-r border-dashed border-zinc-300/60 p-3 font-medium leading-tight dark:border-white/10", rowBorder)}>{displayAccount}</td>
                    <td className={cn("border-r border-dashed border-zinc-300/60 p-3 text-right font-medium tabular-nums dark:border-white/10", rowBorder,row["2024"]>=0?"positive":"negative")}>{pct(row["2024"])}</td>
                    <td className={cn("border-r border-dashed border-zinc-300/60 p-3 text-right font-medium tabular-nums dark:border-white/10", rowBorder,row["2025"]>=0?"positive":"negative")}>{pct(row["2025"])}</td>
                    <td className={cn("p-3 text-right font-medium tabular-nums", rowBorder,currentYtd>=0?"positive":"negative")}>{pct(currentYtd)}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        {activeId==="robinhood"&&<ExtrasTable rows={extras.robinhood} onSave={rows=>saveExtras("robinhood",rows)}/>}
        {activeId==="fidelity-roth"&&<ExtrasTable rows={extras["fidelity-roth"]} onSave={rows=>saveExtras("fidelity-roth",rows)}/>}
      </div>
    </div>
  </div>;
}

function chartValueLabel(value: number) {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  if (absolute >= 1000) return `${sign}$${(absolute / 1000).toFixed(absolute >= 10000 ? 0 : 1)}k`;
  return `${sign}$${absolute.toFixed(0)}`;
}

function QuarterlyChart({ title, subtitle, data, onProfitBarClick }: { title: string; subtitle: string; data: { period: string; realizedProfit: number; income: number }[]; onProfitBarClick?: (period:string)=>void }) {
  const gradientId=title.replace(/\W/g, "");
  const openProfitDetail=(entry:any)=>{
    const period=entry?.payload?.period??entry?.period;
    if(typeof period==="string"&&/^[A-Z][a-z]{2} 20\d{2}$/.test(period)) onProfitBarClick?.(period);
  };
  return <Card className="overflow-hidden">
    <CardHeader className="border-b border-zinc-200/70 dark:border-white/[.06]"><h2 className="font-medium">{title}</h2><p className="text-xs text-zinc-500">{subtitle}</p></CardHeader>
    <CardContent className="pt-5">
      <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} barGap={6} barCategoryGap="22%" margin={{left:4,right:12,top:28,bottom:4}}>
        <defs><linearGradient id={`${gradientId}-profit`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={1}/><stop offset="100%" stopColor="#10b981" stopOpacity={0.65}/></linearGradient><linearGradient id={`${gradientId}-income`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.65}/></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(161,161,170,.13)"/>
        <XAxis dataKey="period" tick={{fill:"#71717a",fontSize:10}} axisLine={false} tickLine={false} interval={0} angle={data.length > 8 ? -28 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 55 : 30}/>
        <YAxis tick={{fill:"#71717a",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={(v: number)=>`$${Math.round(v/1000)}k`}/>
        <Tooltip cursor={{fill:"rgba(161,161,170,.06)"}} contentStyle={{background:"#18181b",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,color:"#f4f4f5",boxShadow:"0 12px 30px rgba(0,0,0,.25)"}} formatter={(value: any)=>money(Number(value))}/>
        <Legend wrapperStyle={{fontSize:12,paddingTop:14}} iconType="circle"/>
        <Bar dataKey="realizedProfit" name="Profit" fill={`url(#${gradientId}-profit)`} radius={[7,7,2,2]} maxBarSize={34} onClick={openProfitDetail} style={{cursor:onProfitBarClick?"pointer":"default"}}>
          <LabelList dataKey="realizedProfit" position="top" formatter={(value: any)=>chartValueLabel(Number(value))} fill="#a1a1aa" fontSize={9}/>
        </Bar>
        <Bar dataKey="income" name="Dividend, Interest & Bonus" fill={`url(#${gradientId}-income)`} radius={[7,7,2,2]} maxBarSize={34}>
          <LabelList dataKey="income" position="top" formatter={(value: any)=>chartValueLabel(Number(value))} fill="#a1a1aa" fontSize={9}/>
        </Bar>
      </BarChart></ResponsiveContainer></div>
      {onProfitBarClick&&<p className="mt-2 text-center text-[11px] text-zinc-600">Click A Monthly Profit Bar For Ticker And Transaction Details</p>}
    </CardContent>
  </Card>;
}

function ProfitDrilldownModal({period,groups,total,onClose}:{period:string;groups:ProfitTickerGroup[];total:number;onClose:()=>void}) {
  const transactions=groups
    .flatMap(group=>group.transactions.map(transaction=>({...transaction,groupTicker:group.ticker})))
    .sort((a,b)=>b.realizedProfit-a.realizedProfit||b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  const categoryOrder: ProfitDrilldownTransaction["category"][]=["Sell Call","Sell Put","Buy Call","Buy Put","Common Stocks"];
  const categoryTotals=categoryOrder.map(category=>{
    const categoryTransactions=transactions.filter(transaction=>transaction.category===category);
    return {
      category,
      realizedProfit:categoryTransactions.reduce((sum,transaction)=>sum+transaction.realizedProfit,0),
      count:categoryTransactions.length,
    };
  });
  const dateText=(value:string)=>new Date(`${value}T12:00:00`).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event)=>{if(event.currentTarget===event.target)onClose();}}>
    <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 shadow-[0_30px_90px_rgba(0,0,0,.55)]">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/[.07] bg-zinc-950/95 px-5 py-4 backdrop-blur-xl sm:px-6">
        <div><h2 className="text-xl font-semibold">{period} Details</h2><p className="mt-1 text-sm text-zinc-500">Realized Profit By Position Type And Transaction</p></div>
        <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl border border-white/10 text-zinc-500 transition hover:bg-white/[.05] hover:text-white" aria-label="Close Details"><X size={17}/></button>
      </div>
      <div className="p-5 sm:p-6">
        <div className="mb-5"><p className="text-xs uppercase tracking-[.14em] text-zinc-600">Total Profit</p><p className={cn("mt-1 text-3xl font-semibold",total>=0?"text-emerald-400":"text-rose-400")}>{money(total)}</p></div>
        {groups.length===0?<div className="rounded-2xl border border-white/10 bg-white/[.025] px-6 py-16 text-center text-sm text-zinc-500">No transaction-level profit details are available for {period}.</div>:<>
          <div>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Profit By Position Type</h3><span className="text-xs text-zinc-600">{transactions.length} Transactions</span></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {categoryTotals.map(item=><div key={item.category} className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4">
                <p className="text-sm font-medium text-zinc-400">{item.category}</p>
                <p className={cn("mt-3 text-2xl font-semibold",item.realizedProfit>0?"text-emerald-400":item.realizedProfit<0?"text-rose-400":"text-zinc-300")}>{money(item.realizedProfit)}</p>
                <p className="mt-2 text-xs text-zinc-600">{item.count} {item.count===1?"Transaction":"Transactions"}</p>
              </div>)}
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.02]">
            <div className="flex flex-col gap-1 border-b border-white/[.07] px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
              <div><h3 className="text-sm font-semibold">Top Profit By Transaction</h3><p className="mt-1 text-xs text-zinc-600">Sorted By Realized Profit, Highest To Lowest.</p></div>
              <span className="text-xs text-zinc-600">{period}</span>
            </div>
            <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm">
              <thead className="bg-white/[.025] text-left text-xs text-zinc-500"><tr><th className="px-4 py-3">Rank</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Ticker</th><th className="px-4 py-3">Position</th><th className="px-4 py-3 text-right">Quantity</th><th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3 text-right">Proceeds</th><th className="px-4 py-3 text-right">Realized Profit</th></tr></thead>
              <tbody>{transactions.map((transaction,index)=><tr key={transaction.id} className="border-t border-white/[.06]">
                <td className="px-4 py-3 font-semibold text-zinc-500">#{index+1}</td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{dateText(transaction.date)}</td>
                <td className="whitespace-nowrap px-4 py-3"><span className="inline-flex rounded-lg border border-white/10 bg-white/[.035] px-2 py-1 text-xs font-medium text-zinc-300">{transaction.category}</span></td>
                <td className="px-4 py-3 font-semibold">{transaction.groupTicker}</td>
                <td className="max-w-72 px-4 py-3 text-zinc-400">{transaction.label}</td>
                <td className="px-4 py-3 text-right">{transaction.quantity===null?"—":transaction.quantity.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{transaction.price===null?"—":money(transaction.price)}</td>
                <td className="px-4 py-3 text-right">{transaction.proceeds===null?"—":money(transaction.proceeds)}</td>
                <td className={cn("px-4 py-3 text-right font-semibold",transaction.realizedProfit>0?"text-emerald-400":transaction.realizedProfit<0?"text-rose-400":"text-zinc-400")}>{money(transaction.realizedProfit)}</td>
              </tr>)}</tbody>
            </table></div>
          </div>
        </>}
      </div>
    </div>
  </div>;
}

function YtdAccountChart({ account, data, currentYtd }: { account: string; data: { account: string; "2024": number; "2025": number; "2026": number }; currentYtd: number }) {
  const chartData = [
    { year: "2024", performance: data["2024"] * 100 },
    { year: "2025", performance: data["2025"] * 100 },
    { year: "2026", performance: currentYtd * 100 },
  ];
  return <Card className="overflow-hidden"><CardHeader className="border-b border-zinc-200/70 dark:border-white/[.06]"><h2 className="font-medium">{account} YTD Performance</h2><p className="text-xs text-zinc-500">Annual Portfolio Performance</p></CardHeader><CardContent className="pt-5"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{left:4,right:12,top:28,bottom:0}}><CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(161,161,170,.13)"/><XAxis dataKey="year" tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#71717a",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={(v: number)=>`${v.toFixed(0)}%`}/><Tooltip cursor={{fill:"rgba(161,161,170,.06)"}} contentStyle={{background:"#18181b",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,color:"#f4f4f5"}} formatter={(value: any)=>`${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(2)}%`}/><Bar dataKey="performance" name="YTD Performance" fill="#34d399" radius={[8,8,2,2]} maxBarSize={72}><LabelList dataKey="performance" position="top" formatter={(value: any)=>`${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(1)}%`} fill="#a1a1aa" fontSize={10}/></Bar></BarChart></ResponsiveContainer></div></CardContent></Card>;
}

function IncomeTotalsChart({ data }: { data: { account: string; realizedProfit: number; income: number }[] }) {
  return <Card className="overflow-hidden"><CardHeader className="border-b border-zinc-200/70 dark:border-white/[.06]"><h2 className="font-medium">Realized Income Totals</h2><p className="text-xs text-zinc-500">Total Realized Profit Compared With Dividend, Interest & Bonus For Robinhood And Fidelity Roth IRA.</p></CardHeader><CardContent className="pt-5"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} barGap={10} barCategoryGap="30%" margin={{left:4,right:12,top:28,bottom:0}}><CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(161,161,170,.13)"/><XAxis dataKey="account" tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#71717a",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={(v: number)=>`$${Math.round(v/1000)}k`}/><Tooltip cursor={{fill:"rgba(161,161,170,.06)"}} contentStyle={{background:"#18181b",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,color:"#f4f4f5"}} formatter={(value: any)=>money(Number(value))}/><Legend wrapperStyle={{fontSize:12,paddingTop:14}} iconType="circle"/><Bar dataKey="realizedProfit" name="Realized Profit" fill="#34d399" radius={[8,8,2,2]} maxBarSize={50}><LabelList dataKey="realizedProfit" position="top" formatter={(value: any)=>chartValueLabel(Number(value))} fill="#a1a1aa" fontSize={10}/></Bar><Bar dataKey="income" name="Dividend, Interest & Bonus" fill="#60a5fa" radius={[8,8,2,2]} maxBarSize={50}><LabelList dataKey="income" position="top" formatter={(value: any)=>chartValueLabel(Number(value))} fill="#a1a1aa" fontSize={10}/></Bar></BarChart></ResponsiveContainer></div></CardContent></Card>;
}
