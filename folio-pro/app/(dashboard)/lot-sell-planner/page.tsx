"use client";
import {useEffect,useMemo,useState} from "react";
import {useActivePortfolio} from "@/components/portfolio/portfolio-context";
import {usePortfolioStore} from "@/store/portfolio-store";
import {DCA_STORAGE_KEY,DCA_UPDATED_EVENT,loadDcaPositions} from "@/lib/dca-storage";
import type {DcaPosition} from "@/lib/dca-data";
const usd=(v:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(v);
const pct=(v:number)=>`${v>=0?"+":""}${v.toFixed(2)}%`;
const targetKey="folio-lot-sell-planner-v1";
export default function LotSellPlanner(){
 const {activeId}=useActivePortfolio();
 const holdings=usePortfolioStore(s=>s.holdingsByPortfolio);
 const [positions,setPositions]=useState<DcaPosition[]>([]);
 const [targets,setTargets]=useState<Record<string,string>>({});
 const [selected,setSelected]=useState<Record<string,boolean>>({});
 const [filter,setFilter]=useState("all");
 const [search,setSearch]=useState("");
 const [ready,setReady]=useState(false);
 const [today,setToday]=useState("");
 useEffect(()=>{const refresh=()=>setPositions(loadDcaPositions());refresh();setToday(new Date().toISOString().slice(0,10));try{setTargets(JSON.parse(localStorage.getItem(targetKey)||"{}"));}catch{}setReady(true);window.addEventListener(DCA_UPDATED_EVENT,refresh);const storage=(e:StorageEvent)=>{if(e.key===DCA_STORAGE_KEY)refresh();};window.addEventListener("storage",storage);return()=>{window.removeEventListener(DCA_UPDATED_EVENT,refresh);window.removeEventListener("storage",storage);};},[]);
 useEffect(()=>{if(ready)localStorage.setItem(targetKey,JSON.stringify(targets));},[targets,ready]);
 const rows=useMemo(()=>positions.flatMap(pos=>{
  const portfolio=pos.portfolioId??"robinhood";
  if(activeId!=="all"&&activeId!==portfolio)return [];
  const holding=holdings[portfolio]?.find(h=>h.symbol.toUpperCase()===pos.symbol.toUpperCase()&&h.assetType!=="option"&&h.shares>0);
  if(!holding||!(holding.currentPrice>0))return [];
  return pos.lots.flatMap((lot,index)=>{
   if(lot.future||lot.date==="Future")return [];
   const shares=Number(lot.shares),buy=Number(lot.price),current=holding.currentPrice;
   if(!(shares>0&&buy>0))return [];
   const currentReturn=(current/buy-1)*100;
   // Eligible lots: profitable now or within 7% below break-even.
   if(currentReturn < -7)return [];
   const id=`${portfolio}:${pos.id}:${lot.id??index}`;
   const sell=targets[id]===undefined||targets[id].trim()===""?current:Number(targets[id]);
   const cost=shares*buy;
   const date=/^\d{4}-\d{2}-\d{2}$/.test(lot.date)?Date.parse(`${lot.date}T00:00:00Z`):Date.parse(lot.date);
   const days=Number.isFinite(date)&&today?Math.max(0,Math.floor((Date.parse(`${today}T00:00:00Z`)-date)/86400000)):null;
   return [{id,ticker:pos.symbol,portfolio,date:lot.date,days,shares,buy,current,currentReturn,sell,cost,cash:sell*shares,profit:sell*shares-cost,returnPct:(sell/buy-1)*100}];
  });
 }),[positions,holdings,activeId,targets,today]);
 const shown=rows.filter(r=>(filter==="all"||(filter==="profit"?r.currentReturn>=0:r.currentReturn<0))&&r.ticker.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.currentReturn-a.currentReturn);
 const chosen=shown.filter(r=>selected[r.id]!==false);
 const cash=chosen.reduce((s,r)=>s+r.cash,0),cost=chosen.reduce((s,r)=>s+r.cost,0);
 const cell="px-3 py-3 whitespace-nowrap";
 return <div className="space-y-5 pb-10"><div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-500">Purchase lots</p><h1 className="mt-2 text-3xl font-semibold">Purchase Lot Sell Planner</h1><p className="mt-2 text-sm text-zinc-500">All lots currently profitable or within 7% below break-even. Edit the sell price to estimate cash and returns. No trades are placed.</p></div>
 <div className="grid gap-3 sm:grid-cols-3">{[["Selected lots",`${chosen.length} / ${shown.length}`],["Cash from selected sales",usd(cash)],["Potential realized P/L",usd(cash-cost)]].map(([label,value])=><div key={label} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-white/[.04]"><div className="text-sm text-zinc-500">{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></div>)}</div>
 <div className="rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-white/[.035]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 p-4 dark:border-white/10"><div className="flex flex-wrap gap-2">{[["all","All eligible"],["profit","Profitable"],["near","Near break-even"]].map(([value,label])=><button key={value} onClick={()=>setFilter(value)} className={`rounded-lg px-3 py-2 text-sm ${filter===value?"bg-emerald-500/15 text-emerald-500":"bg-zinc-500/10 text-zinc-500"}`}>{label}</button>)}</div><input aria-label="Search ticker" placeholder="Search ticker..." value={search} onChange={e=>setSearch(e.target.value)} className="rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-white/10"/></div>
 <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-sm"><thead className="bg-zinc-500/[.04] text-xs text-zinc-500"><tr>{["Sell?","Ticker / Portfolio","Purchase date","Avg days held","Shares","Buy price","Current price","Current return","Sell price","Cash proceeds","Potential P/L","Potential return"].map(x=><th key={x} className={cell}>{x}</th>)}</tr></thead><tbody>{shown.map(r=><tr key={r.id} className="border-t border-zinc-200 dark:border-white/10"><td className={cell}><input type="checkbox" aria-label={`Select ${r.ticker} lot ${r.date}`} checked={selected[r.id]!==false} onChange={e=>setSelected(old=>({...old,[r.id]:e.target.checked}))}/></td><td className={cell}><strong>{r.ticker}</strong><div className="text-xs text-zinc-500">{r.portfolio}</div></td><td className={cell}>{r.date}</td><td className={cell}>{r.days===null?"—":`${r.days} Days`}</td><td className={cell}>{r.shares}</td><td className={cell}>{usd(r.buy)}</td><td className={cell}>{usd(r.current)}</td><td className={`${cell} ${r.currentReturn>=0?"text-emerald-500":"text-rose-500"}`}>{pct(r.currentReturn)}</td><td className={cell}><input type="number" min="0" step="0.01" aria-label={`Sell price ${r.ticker} ${r.date}`} value={targets[r.id]??String(r.current)} onChange={e=>setTargets(old=>({...old,[r.id]:e.target.value}))} className="w-28 rounded-lg border border-zinc-200 bg-transparent px-2 py-2 text-right dark:border-white/10"/></td><td className={cell}>{usd(r.cash)}</td><td className={`${cell} ${r.profit>=0?"text-emerald-500":"text-rose-500"}`}>{usd(r.profit)}</td><td className={`${cell} ${r.returnPct>=0?"text-emerald-500":"text-rose-500"}`}>{pct(r.returnPct)}</td></tr>)}</tbody></table>{shown.length===0&&<div className="p-10 text-center text-sm text-zinc-500">No eligible purchase lots with a matching current holding price.</div>}</div>
 <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 p-4 text-xs text-zinc-500 dark:border-white/10"><span>Uses saved purchase lots and available holding prices. Gross proceeds exclude fees and taxes; sold shares are not independently reconciled.</span><div className="flex gap-2"><button className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-white/10" onClick={()=>setSelected(Object.fromEntries(shown.map(r=>[r.id,true])))}>Select visible</button><button className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-white/10" onClick={()=>setSelected(Object.fromEntries(shown.map(r=>[r.id,false])))}>Deselect visible</button><button className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-white/10" onClick={()=>setTargets({})}>Reset prices</button></div></div></div></div>;
}
