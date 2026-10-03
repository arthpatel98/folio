"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { portfolios, type PortfolioId, useActivePortfolio } from "@/components/portfolio/portfolio-context";
import { usePortfolioStore, type DataPortfolioId } from "@/store/portfolio-store";
import type { Transaction } from "@/types/portfolio";
import {
  ROBINHOOD_VERIFIED_CLOSE_DATE_TRANSACTIONS,
  ROTH_IRA_CLOSED_LOT_TRANSACTIONS,
  VERIFIED_PROFIT_EDITS_KEY,
  type ProfitDrilldownTransaction,
} from "@/components/portfolio/robinhood-quarterly-data";

type Strategy = "commonStock" | "longCall" | "longPut" | "shortCall" | "shortPut";
type StrategyLabel = "Common Stock" | "Long Call" | "Long Put" | "Short Call" | "Short Put";
type SortMode = "highest" | "lowest" | "ticker";
type RealizedRow = { id:string; portfolioId:DataPortfolioId; date:string; ticker:string; strategy:Strategy; realizedProfit:number };
type ChartRow = { ticker:string; commonStock:number; longCall:number; longPut:number; shortCall:number; shortPut:number; total:number };

const STRATEGIES: Array<{key:Strategy;label:StrategyLabel;fill:string}> = [
  {key:"commonStock",label:"Common Stock",fill:"#34d399"},
  {key:"longCall",label:"Long Call",fill:"#60a5fa"},
  {key:"longPut",label:"Long Put",fill:"#a78bfa"},
  {key:"shortCall",label:"Short Call",fill:"#fbbf24"},
  {key:"shortPut",label:"Short Put",fill:"#fb7185"},
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
const money=(value:number)=>`${value>0?"+":value<0?"-":""}${Math.abs(value).toLocaleString("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0,maximumFractionDigits:2})}`;
const axisMoney=(value:number)=>value===0?"$0":`${value<0?"-":""}$${Math.abs(value)>=1000?`${(Math.abs(value)/1000).toFixed(Math.abs(value)%1000===0?0:1)}k`:Math.abs(value).toFixed(0)}`;
const monthPeriod=(date:string)=>new Date(`${date}T12:00:00`).toLocaleDateString("en-US",{month:"short",year:"numeric"});

function TotalLabel(props:any){
  const {x=0,y=0,width=0,height=0,value=0}=props;
  if(!Number.isFinite(Number(value)))return null;
  const positive=Number(value)>=0;
  const tx=positive?x+width+8:x-8;
  return <text x={tx} y={y+height/2} dy="0.35em" textAnchor={positive?"start":"end"} className={Number(value)<0?"fill-rose-400":"fill-emerald-400"} fontSize={12} fontWeight={700}>{money(Number(value))}</text>;
}

function StrategyTooltip({active,payload,label,year}:{active?:boolean;payload?:any[];label?:string;year:string}){
  if(!active||!payload?.length)return null;
  const row=payload[0]?.payload as ChartRow|undefined;
  if(!row)return null;
  return <div className="min-w-56 rounded-xl border border-zinc-200 bg-white/95 p-3 text-xs shadow-2xl backdrop-blur dark:border-white/10 dark:bg-zinc-950/95">
    <div className="mb-2 font-semibold text-zinc-900 dark:text-white">{label} — {year}</div>
    <div className="space-y-1.5">{STRATEGIES.filter(s=>Math.abs(row[s.key])>0.004).map(s=><div key={s.key} className="flex items-center justify-between gap-5"><span className="text-zinc-500 dark:text-zinc-400">{s.label}</span><span className={cn("font-medium",row[s.key]<0?"text-rose-400":row[s.key]>0?"text-emerald-400":"text-zinc-500")}>{money(row[s.key])}</span></div>)}</div>
    <div className="mt-2 flex items-center justify-between gap-5 border-t border-zinc-200 pt-2 font-semibold dark:border-white/10"><span>Total Realized P/L</span><span className={row.total<0?"text-rose-400":"text-emerald-400"}>{money(row.total)}</span></div>
  </div>;
}

export default function TickerStrategyPlPage(){
  const {activeId,setActiveId}=useActivePortfolio();
  const transactionsByPortfolio=usePortfolioStore(s=>s.transactionsByPortfolio);
  const [year,setYear]=useState("");
  const [sort,setSort]=useState<SortMode>("highest");
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
    const result=Array.from(map.values());
    result.sort((a,b)=>sort==="ticker"?a.ticker.localeCompare(b.ticker):sort==="lowest"?a.total-b.total:b.total-a.total);
    return result;
  },[realizedRows,year,sort]);

  const total=rows.reduce((sum,r)=>sum+r.total,0);
  const top=rows.filter(r=>r.total>0).sort((a,b)=>b.total-a.total)[0]??null;
  const loss=rows.filter(r=>r.total<0).sort((a,b)=>a.total-b.total)[0]??null;
  const tableRows=rows.filter(r=>r.ticker.includes(search.trim().toUpperCase()));
  const chartHeight=Math.max(360,rows.length*42+100);
  const yearLabel=year==="all"?"All Time":year||"—";

  return <div className="space-y-5 pb-24 lg:pb-6">
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(560px,.9fr)] xl:items-end">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-3xl">Realized P/L by Ticker &amp; Strategy</h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-medium text-zinc-500">Portfolio<select value={activeId} onChange={e=>setActiveId(e.target.value as PortfolioId)} className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none dark:border-white/10 dark:bg-white/[.04] dark:text-zinc-100">{portfolios.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="text-xs font-medium text-zinc-500">Year<select value={year} onChange={e=>setYear(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none dark:border-white/10 dark:bg-white/[.04] dark:text-zinc-100"><option value="all">All Time</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
          <label className="text-xs font-medium text-zinc-500">Sort By<select value={sort} onChange={e=>setSort(e.target.value as SortMode)} className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none dark:border-white/10 dark:bg-white/[.04] dark:text-zinc-100"><option value="highest">Highest P/L</option><option value="lowest">Lowest P/L</option><option value="ticker">Ticker A–Z</option></select></label>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-zinc-500">Total Realized P/L</div><div className={cn("mt-2 text-xl font-semibold",total<0?"text-rose-400":"text-emerald-400")}>{money(total)}</div><div className="mt-1 text-xs text-zinc-500">{yearLabel}</div></Card>
        <Card className="p-4"><div className="text-xs text-zinc-500">Top Profit Ticker</div><div className="mt-2 text-xl font-semibold">{top?.ticker??"—"}</div><div className={cn("mt-1 text-sm font-medium",top&&top.total<0?"text-rose-400":"text-emerald-400")}>{top?money(top.total):"$0"}</div></Card>
        <Card className="p-4"><div className="text-xs text-zinc-500">Biggest Loss Ticker</div><div className="mt-2 text-xl font-semibold">{loss?.ticker??"—"}</div><div className="mt-1 text-sm font-medium text-rose-400">{loss?money(loss.total):"$0"}</div></Card>
      </div>
    </section>

    <Card className="overflow-hidden p-4 sm:p-5">
      <div className="mb-4"><h2 className="font-semibold text-zinc-950 dark:text-white">Ticker × Strategy</h2><p className="mt-1 text-xs text-zinc-500">Realized trading P/L by ticker and strategy · {yearLabel}</p></div>
      {rows.length===0?<div className="grid min-h-72 place-items-center text-sm text-zinc-500">No realized P/L data available for this year.</div>:<div className="w-full overflow-x-auto"><div className="min-w-[760px]" style={{height:chartHeight}}><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout="vertical" margin={{top:8,right:90,bottom:35,left:12}} stackOffset="sign"><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(161,161,170,.16)"/><XAxis type="number" tickFormatter={axisMoney} tick={{fontSize:11,fill:"#71717a"}} label={{value:"Realized P/L ($)",position:"insideBottom",offset:-20,fill:"#71717a",fontSize:11}}/><YAxis type="category" dataKey="ticker" width={72} tick={{fontSize:12,fontWeight:600,fill:"#a1a1aa"}}/><ReferenceLine x={0} stroke="#a1a1aa" strokeWidth={1.5}/><Tooltip content={<StrategyTooltip year={yearLabel}/>}/><Legend verticalAlign="bottom" iconType="square" wrapperStyle={{fontSize:12,paddingTop:16}}/>{STRATEGIES.map(s=><Bar key={s.key} dataKey={s.key} name={s.label} stackId="pl" fill={s.fill} maxBarSize={24}/>) }<Bar dataKey="total" fill="transparent" isAnimationActive={false} legendType="none"><LabelList dataKey="total" content={<TotalLabel/>}/></Bar></BarChart></ResponsiveContainer></div></div>}
    </Card>

    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Ticker Breakdown ({yearLabel})</h2><p className="mt-1 text-xs text-zinc-500">Aggregated realized P/L for every supported strategy.</p></div><div className="relative w-full sm:w-56"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ticker..." className="h-9 w-full rounded-xl border border-zinc-200 bg-transparent pl-9 pr-3 text-sm outline-none dark:border-white/10"/></div></div>
      {rows.length===0?<div className="p-8 text-center text-sm text-zinc-500">No realized P/L data available for this year.</div>:<div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500 dark:bg-white/[.025]"><tr><th className="px-4 py-3 text-left">Ticker</th>{STRATEGIES.map(s=><th key={s.key} className="px-4 py-3 text-right">{s.label}</th>)}<th className="px-4 py-3 text-right">Total Realized P/L</th></tr></thead><tbody>{tableRows.map(row=><tr key={row.ticker} className="border-t border-zinc-100 dark:border-white/[.06]"><td className="px-4 py-3 font-semibold">{row.ticker}</td>{STRATEGIES.map(s=><td key={s.key} className={cn("px-4 py-3 text-right tabular-nums",row[s.key]<0?"text-rose-400":row[s.key]>0?"text-emerald-400":"text-zinc-500")}>{money(row[s.key])}</td>)}<td className={cn("px-4 py-3 text-right font-bold tabular-nums",row.total<0?"text-rose-400":row.total>0?"text-emerald-400":"text-zinc-500")}>{money(row.total)}</td></tr>)}</tbody></table>{tableRows.length===0&&<div className="p-8 text-center text-sm text-zinc-500">No tickers match your search.</div>}</div>}
    </Card>
  </div>;
}
