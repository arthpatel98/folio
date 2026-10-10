"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useActivePortfolio } from "@/components/portfolio/portfolio-context";
import { usePortfolioStore, type DataPortfolioId } from "@/store/portfolio-store";
import type { Transaction } from "@/types/portfolio";
import {
  ROBINHOOD_VERIFIED_CLOSE_DATE_TRANSACTIONS,
  ROTH_IRA_CLOSED_LOT_TRANSACTIONS,
  VERIFIED_PROFIT_EDITS_KEY,
  type ProfitDrilldownTransaction,
} from "@/components/portfolio/robinhood-quarterly-data";

type Strategy = "commonStock" | "longCall" | "longPut" | "shortCall" | "shortPut";
type StrategyLabel = "Common Stock" | "Buy Call" | "Buy Put" | "Sell Call" | "Sell Put";
type SortColumn = "ticker" | Strategy | "total";
type RealizedRow = { id:string; portfolioId:DataPortfolioId; date:string; ticker:string; strategy:Strategy; realizedProfit:number };
type ChartRow = { ticker:string; commonStock:number; longCall:number; longPut:number; shortCall:number; shortPut:number; total:number };

const STRATEGIES: Array<{key:Strategy;label:StrategyLabel;fill:string}> = [
  {key:"commonStock",label:"Common Stock",fill:"#34d399"},
  {key:"longCall",label:"Buy Call",fill:"#60a5fa"},
  {key:"longPut",label:"Buy Put",fill:"#a78bfa"},
  {key:"shortCall",label:"Sell Call",fill:"#fbbf24"},
  {key:"shortPut",label:"Sell Put",fill:"#fb7185"},
];

const categoryStrategy=(category:ProfitDrilldownTransaction["category"]):Strategy=>{
  if(category==="Buy Call")return "longCall";
  if(category==="Buy Put")return "longPut";
  if(category==="Sell Call")return "shortCall";
  if(category==="Sell Put")return "shortPut";
  return "commonStock";
};
const liveStrategy=(tx:Transaction):Strategy|null=>{
  if((tx.assetType??"stock")!=="option")return "commonStock";
  if(tx.optionType==="buy-call")return "longCall";
  if(tx.optionType==="buy-put")return "longPut";
  if(tx.optionType==="sell-call")return "shortCall";
  if(tx.optionType==="sell-put")return "shortPut";
  return null;
};
const yearOf=(date:string)=>/^\d{4}/.test(date)?date.slice(0,4):"";
const monthPeriod=(date:string)=>{
  const parsed=new Date(`${date}T12:00:00`);
  if(Number.isNaN(parsed.getTime()))return "";
  return new Intl.DateTimeFormat("en-US",{month:"short",year:"numeric"}).format(parsed);
};
const money=(value:number)=>`${value<0?"-":""}${Math.abs(value).toLocaleString("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0,maximumFractionDigits:2})}`;
export default function TickerStrategyPlPage(){
  const {activeId}=useActivePortfolio();
  const transactionsByPortfolio=usePortfolioStore(s=>s.transactionsByPortfolio);
  const [year,setYear]=useState("");
  const [sortColumn,setSortColumn]=useState<SortColumn>("total");
  const [sortDirection,setSortDirection]=useState<"asc"|"desc">("desc");
  const [search,setSearch]=useState("");
  const [edits,setEdits]=useState<Record<string,Partial<ProfitDrilldownTransaction>&{deleted?:boolean}>>({});

  useEffect(()=>{try{const raw=window.localStorage.getItem(VERIFIED_PROFIT_EDITS_KEY);if(raw)setEdits(JSON.parse(raw));}catch{}},[]);

  const realizedRows=useMemo<RealizedRow[]>(()=>{
    const out:RealizedRow[]=[];
    const addStatic=(tx:ProfitDrilldownTransaction,portfolioId:DataPortfolioId)=>{
      const patch=edits[tx.id]??{}; if(patch.deleted)return;
      const item={...tx,...patch};
      if(!item.date||!item.ticker||!Number.isFinite(Number(item.realizedProfit)))return;
      out.push({id:`${portfolioId}:${item.id}`,portfolioId,date:item.date,ticker:item.ticker.toUpperCase(),strategy:categoryStrategy(item.category),realizedProfit:Number(item.realizedProfit)});
    };
    if(activeId==="robinhood"||activeId==="all")Object.values(ROBINHOOD_VERIFIED_CLOSE_DATE_TRANSACTIONS).flat().forEach(tx=>addStatic(tx,"robinhood"));
    if(activeId==="fidelity-roth"||activeId==="all")ROTH_IRA_CLOSED_LOT_TRANSACTIONS.forEach(tx=>addStatic(tx,"fidelity-roth"));
    const portfolioIds:DataPortfolioId[]=activeId==="all"?["robinhood","fidelity-roth","fidelity-401k"]:[activeId as DataPortfolioId];
    portfolioIds.forEach(portfolioId=>(transactionsByPortfolio[portfolioId]??[]).forEach(tx=>{
      if(typeof tx.realizedGain!=="number"||!tx.symbol||!tx.date)return;
      if(portfolioId==="robinhood"&&ROBINHOOD_VERIFIED_CLOSE_DATE_TRANSACTIONS[monthPeriod(tx.date)])return;
      const strategy=liveStrategy(tx); if(!strategy)return;
      const editId=`live-${tx.id}`; const patch=edits[editId]??{}; if(patch.deleted)return;
      out.push({id:`${portfolioId}:${editId}`,portfolioId,date:String(patch.date??tx.date),ticker:String(patch.ticker??tx.symbol).toUpperCase(),strategy:patch.category?categoryStrategy(patch.category):strategy,realizedProfit:Number(patch.realizedProfit??tx.realizedGain)||0});
    }));
    return out;
  },[activeId,transactionsByPortfolio,edits]);

  const years=useMemo(()=>Array.from(new Set(realizedRows.map(r=>yearOf(r.date)).filter(Boolean))).sort((a,b)=>Number(b)-Number(a)),[realizedRows]);
  useEffect(()=>{
    if(year&&year!=="all"&&years.includes(year))return;
    const current=String(new Date().getFullYear());
    setYear(years.includes(current)?current:(years[0]??"all"));
  },[years,year]);

  const rows=useMemo<ChartRow[]>(()=>{
    const map=new Map<string,ChartRow>();
    realizedRows.filter(r=>year==="all"||yearOf(r.date)===year).forEach(r=>{
      const row=map.get(r.ticker)??{ticker:r.ticker,commonStock:0,longCall:0,longPut:0,shortCall:0,shortPut:0,total:0};
      row[r.strategy]+=r.realizedProfit; row.total+=r.realizedProfit; map.set(r.ticker,row);
    });
    return Array.from(map.values());
  },[realizedRows,year]);

  const sortedRows=useMemo(()=>{
    const next=[...rows];
    next.sort((a,b)=>{
      const comparison=sortColumn==="ticker"?a.ticker.localeCompare(b.ticker):a[sortColumn]-b[sortColumn];
      return sortDirection==="asc"?comparison:-comparison;
    });
    return next;
  },[rows,sortColumn,sortDirection]);
  const total=rows.reduce((sum,r)=>sum+r.total,0);
  const top=rows.filter(r=>r.total>0).sort((a,b)=>b.total-a.total)[0]??null;
  const loss=rows.filter(r=>r.total<0).sort((a,b)=>a.total-b.total)[0]??null;
  const tableRows=sortedRows.filter(r=>r.ticker.includes(search.trim().toUpperCase()));
  const columnTotals=useMemo(()=>tableRows.reduce((acc,row)=>({
    commonStock:acc.commonStock+row.commonStock,
    longCall:acc.longCall+row.longCall,
    longPut:acc.longPut+row.longPut,
    shortCall:acc.shortCall+row.shortCall,
    shortPut:acc.shortPut+row.shortPut,
    total:acc.total+row.total,
  }),{commonStock:0,longCall:0,longPut:0,shortCall:0,shortPut:0,total:0}),[tableRows]);
  const yearLabel=year==="all"?"All Time":year||"—";
  const changeSort=(column:SortColumn)=>{
    if(sortColumn===column){setSortDirection(direction=>direction==="asc"?"desc":"asc");return;}
    setSortColumn(column);
    setSortDirection(column==="ticker"?"asc":"desc");
  };
  const SortHeader=({label,column,right=false}:{label:string;column:SortColumn;right?:boolean})=>{
    const active=sortColumn===column;
    const SortIcon=!active?ArrowUpDown:sortDirection==="asc"?ArrowUp:ArrowDown;
    return <button type="button" onClick={()=>changeSort(column)} className={cn("inline-flex w-full items-center gap-2",right&&"justify-end")} aria-label={`Sort By ${label} ${active?(sortDirection==="asc"?"Ascending":"Descending"):""}`} title={active?`${label}: ${sortDirection==="asc"?"Ascending":"Descending"}`:`Sort By ${label}`}>{label}<SortIcon size={active?15:14} className={active?"text-emerald-500":"opacity-25"}/></button>;
  };

  return <div className="space-y-5 pb-24 lg:pb-6">
    <section className="rounded-3xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm dark:border-white/10 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/60 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-3xl">Realized P/L by Ticker &amp; Strategy</h1>
          
          <label className="mt-5 block w-full max-w-[180px] text-xs font-medium text-zinc-500">Year<select value={year} onChange={e=>setYear(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500/50 dark:border-white/10 dark:bg-white/[.04] dark:text-zinc-100"><option value="all">All Time</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-3 xl:max-w-[690px]">
          <Card className="rounded-2xl p-4"><div className="text-xs font-medium text-zinc-500">Total Realized P/L</div><div className={cn("mt-2 text-xl font-semibold tracking-tight",total<0?"text-rose-400":"text-emerald-400")}>{money(total)}</div><div className="mt-1 text-xs text-zinc-500">{yearLabel}</div></Card>
          <Card className="rounded-2xl p-4"><div className="text-xs font-medium text-zinc-500">Top Profit Ticker</div><div className="mt-2 text-xl font-semibold tracking-tight">{top?.ticker??"—"}</div><div className="mt-1 text-sm font-medium text-emerald-400">{top?money(top.total):"$0"}</div></Card>
          <Card className="rounded-2xl p-4"><div className="text-xs font-medium text-zinc-500">Biggest Loss Ticker</div><div className="mt-2 text-xl font-semibold tracking-tight">{loss?.ticker??"—"}</div><div className="mt-1 text-sm font-medium text-rose-400">{loss?money(loss.total):"$0"}</div></Card>
        </div>
      </div>
    </section>

    <Card className="overflow-hidden rounded-3xl shadow-sm">
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div><h2 className="text-base font-semibold text-zinc-950 dark:text-white">Ticker Breakdown ({yearLabel})</h2></div>
        <div className="relative w-full sm:w-60"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ticker..." className="h-9 w-full rounded-xl border border-zinc-200 bg-transparent pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500/50 dark:border-white/10"/></div>
      </div>
      {rows.length===0?<div className="p-12 text-center text-sm text-zinc-500">No realized P/L data available for this year.</div>:<div className="overflow-x-auto"><table className="w-full min-w-[940px] text-sm"><thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500 dark:bg-white/[.025]"><tr><th className="px-4 py-3 text-left"><SortHeader label="Ticker" column="ticker"/></th>{STRATEGIES.map(s=><th key={s.key} className="px-4 py-3 text-right"><SortHeader label={s.label} column={s.key} right/></th>)}<th className="px-4 py-3 text-right"><SortHeader label="Total Realized P/L" column="total" right/></th></tr></thead><tbody>{tableRows.map(row=><tr key={row.ticker} className="border-t border-zinc-100 transition hover:bg-zinc-50/70 dark:border-white/[.06] dark:hover:bg-white/[.025]"><td className="px-4 py-3 font-semibold">{row.ticker}</td>{STRATEGIES.map(s=><td key={s.key} className={cn("px-4 py-3 text-right tabular-nums",row[s.key]<0?"text-rose-400":row[s.key]>0?"text-emerald-400":"text-zinc-500")}>{money(row[s.key])}</td>)}<td className={cn("px-4 py-3 text-right font-bold tabular-nums",row.total<0?"text-rose-400":row.total>0?"text-emerald-400":"text-zinc-500")}>{money(row.total)}</td></tr>)}</tbody><tfoot><tr className="border-t-2 border-zinc-200 bg-zinc-50/80 font-semibold dark:border-white/10 dark:bg-white/[.035]"><td className="px-4 py-3.5 text-zinc-900 dark:text-white">Total</td>{STRATEGIES.map(s=><td key={s.key} className={cn("px-4 py-3.5 text-right tabular-nums",columnTotals[s.key]<0?"text-rose-400":columnTotals[s.key]>0?"text-emerald-400":"text-zinc-500")}>{money(columnTotals[s.key])}</td>)}<td className={cn("px-4 py-3.5 text-right text-base font-bold tabular-nums",columnTotals.total<0?"text-rose-400":columnTotals.total>0?"text-emerald-400":"text-zinc-500")}>{money(columnTotals.total)}</td></tr></tfoot></table>{tableRows.length===0&&<div className="p-8 text-center text-sm text-zinc-500">No tickers match your search.</div>}</div>}
    </Card>
  </div>;
}
