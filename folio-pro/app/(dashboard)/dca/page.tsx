"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus, RotateCcw, Trash2 } from "lucide-react";
import { cn, money } from "@/lib/utils";

type Lot = { amount: number; shares: number; price: number; date: string; note?: string; future?: boolean };
type Preset = { id: string; symbol: string; label?: string; sellPrice: number; lots: Lot[] };

const presets: Preset[] = [
  { id:"AMZN", symbol:"AMZN", sellPrice:257.20, lots:[
    {amount:1800,shares:7,price:257.14,date:"May 19, 2026"},
    {amount:1919,shares:8,price:239.93,date:"Jun 10, 2026"},
    {amount:1886,shares:8,price:235.70,date:"Jun 11, 2026"},
    {amount:1178.50,shares:5,price:235.70,date:"Future",future:true},
  ]},
  { id:"PLTR", symbol:"PLTR", sellPrice:136, lots:[
    {amount:1791,shares:14,price:127.90,date:"Jun 18, 2026"},{amount:1694,shares:15,price:112.90,date:"Jun 24, 2026"},
  ]},
  { id:"ONDS-A", symbol:"ONDS", label:"ONDS", sellPrice:9.71, lots:[
    {amount:2027,shares:210,price:9.65,date:"Jun 9, 2026"},{amount:1748,shares:190,price:9.20,date:"Jun 12, 2026"},{amount:1215,shares:150,price:8.10,date:"Jun 24, 2026"},
  ]},
  { id:"ROBN", symbol:"ROBN", sellPrice:46.10, lots:[
    {amount:4000,shares:78.32816,price:51.07,date:"Jan 15, 2026",note:"Jul 17 CC"},{amount:851.49,shares:21.67184,price:39.28,date:"Jul 7, 2026"},
  ]},
  { id:"IREN", symbol:"IREN", sellPrice:45, lots:[
    {amount:2754,shares:44,price:62.59,date:"Oct 28, 2025"},{amount:543,shares:11,price:49.38,date:"Nov 19, 2025"},{amount:1064,shares:20,price:53.19,date:"Jun 23, 2026"},{amount:1287,shares:25,price:51.47,date:"Jun 24, 2026"},
  ]},
  { id:"IBIT", symbol:"IBIT", sellPrice:38.66, lots:[
    {amount:3000,shares:49.57449,price:60.52,date:"Oct 30, 2025"},{amount:3000,shares:52.26026,price:57.41,date:"Nov 4, 2025"},{amount:1130,shares:20.16526,price:56.03,date:"Nov 13, 2025"},{amount:3605,shares:100,price:36.05,date:"Jun 11, 2026"},
  ]},
  { id:"FPS", symbol:"FPS", sellPrice:61.10, lots:[
    {amount:1571,shares:25,price:62.82,date:"Jun 22, 2026"},{amount:1284,shares:22,price:58.35,date:"Jun 25, 2026"},{amount:940,shares:17,price:55.30,date:"Jun 26, 2026"},{amount:1103,shares:21,price:52.50,date:"Jul 1, 2026"},{amount:694,shares:15,price:46.28,date:"Jul 2, 2026"},
  ]},
  { id:"ONDS-B", symbol:"ONDS", label:"ONDS · Jul 24 CC", sellPrice:9.16, lots:[
    {amount:1770,shares:200,price:8.85,date:"Jun 23, 2026",note:"Jul 24 CC"},{amount:1540,shares:200,price:7.70,date:"Jul 2, 2026"},
  ]},
  { id:"DRAM", symbol:"DRAM", sellPrice:69.30, lots:[
    {amount:1668,shares:25,price:66.70,date:"Jun 29, 2026"},{amount:1232,shares:20,price:61.60,date:"Jul 2, 2026"},
  ]},
  { id:"NBIS", symbol:"NBIS", sellPrice:225, lots:[
    {amount:1643,shares:7,price:234.69,date:"Jul 1, 2026"},{amount:1050,shares:5,price:209.98,date:"Jul 2, 2026"},{amount:1171,shares:6,price:195.20,date:"Jul 7, 2026"},
  ]},
  { id:"SITM", symbol:"SITM", sellPrice:670, lots:[{amount:1214,shares:2,price:606.77,date:"Jul 2, 2026"}]},
];

const n = (v:string) => Number.isFinite(Number(v)) ? Number(v) : 0;
const pct = (v:number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

export default function DcaPage(){
  const [presetId,setPresetId]=useState(presets[0].id);
  const preset=presets.find(p=>p.id===presetId)!;
  const [lots,setLots]=useState<Lot[]>(preset.lots);
  const [sellPrice,setSellPrice]=useState(preset.sellPrice);

  const load=(id:string)=>{const p=presets.find(x=>x.id===id)!;setPresetId(id);setLots(p.lots.map(x=>({...x})));setSellPrice(p.sellPrice)};
  const totals=useMemo(()=>{
    const amount=lots.reduce((s,l)=>s+l.amount,0), shares=lots.reduce((s,l)=>s+l.shares,0);
    const avg=shares?amount/shares:0, value=shares*sellPrice, profit=value-amount, roi=amount?profit/amount*100:0;
    const existing=lots.filter(l=>!l.future), future=lots.filter(l=>l.future);
    const oldAmount=existing.reduce((s,l)=>s+l.amount,0), oldShares=existing.reduce((s,l)=>s+l.shares,0), oldAvg=oldShares?oldAmount/oldShares:0;
    return {amount,shares,avg,value,profit,roi,oldAvg,futureAmount:future.reduce((s,l)=>s+l.amount,0)};
  },[lots,sellPrice]);
  const update=(i:number,key:keyof Lot,value:string)=>setLots(prev=>prev.map((l,idx)=>idx===i?{...l,[key]:key==="date"||key==="note"?value:n(value),...(key==="shares"?{amount:n(value)*l.price}:{}),...(key==="price"?{amount:l.shares*n(value)}:{})}:l));
  const addFuture=()=>setLots(prev=>[...prev,{amount:0,shares:0,price:totals.avg,date:"Future",future:true}]);

  return <div className="space-y-5">
    <div><h1 className="text-3xl font-semibold tracking-tight">DCA Calculator</h1><p className="mt-1 text-sm text-zinc-500">Test an additional purchase and see how it changes your average cost and potential return.</p></div>

    <section className="rounded-2xl border border-white/10 bg-zinc-950/35 p-5 shadow-sm lg:p-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div><label className="mb-2 block text-sm font-medium text-zinc-300">Position preset</label><select value={presetId} onChange={e=>load(e.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-zinc-950/70 px-4 text-sm outline-none focus:border-emerald-400/60">{presets.map(p=><option key={p.id} value={p.id}>{p.label??p.symbol}</option>)}</select></div>
        <div><label className="mb-2 block text-sm font-medium text-zinc-300">Potential sell price</label><div className="flex h-12 items-center rounded-xl border border-white/10 bg-black/15 px-4"><span className="mr-2 text-zinc-500">$</span><input type="number" step="any" value={sellPrice} onChange={e=>setSellPrice(n(e.target.value))} className="w-full bg-transparent text-lg font-semibold outline-none"/></div></div>
        <button onClick={()=>load(presetId)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm hover:bg-white/[.05]"><RotateCcw size={16}/>Reset preset</button>
      </div>
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {[["Total investment",money(totals.amount)],["Total shares",totals.shares.toLocaleString(undefined,{maximumFractionDigits:5})],["New average",money(totals.avg)],[totals.profit>=0?"Potential profit":"Potential loss",`${totals.profit<0?"-":""}${money(Math.abs(totals.profit))}`],["Potential return",pct(totals.roi)]].map(([a,b],i)=><div key={a} className={cn("rounded-2xl border border-white/10 bg-zinc-950/35 p-5",i>=3&&(totals.profit>=0?"border-emerald-500/35 bg-emerald-500/[.06]":"border-rose-500/35 bg-rose-500/[.06]"))}><p className="text-sm text-zinc-500">{a}</p><p className={cn("mt-3 text-2xl font-semibold",i>=3&&(totals.profit>=0?"text-emerald-400":"text-rose-400"))}>{b}</p></div>)}
    </div>

    <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/35">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Purchase lots</h2><p className="mt-1 text-sm text-zinc-500">Edit any lot or add a future DCA purchase. Calculated profit columns are intentionally omitted because the summary updates automatically.</p></div><button onClick={addFuture} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-300"><Plus size={16}/>Add future purchase</button></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-white/[.025] text-left text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-5 py-3">Type</th><th className="px-4 py-3">Shares</th><th className="px-4 py-3">Buy price</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Buy date</th><th className="px-4 py-3">P/L at target</th><th className="px-4 py-3">Return</th><th className="px-4 py-3"></th></tr></thead><tbody>{lots.map((l,i)=>{const profit=l.shares*(sellPrice-l.price), r=l.amount?profit/l.amount*100:0;return <tr key={i} className={cn("border-t border-white/10",l.future&&"bg-emerald-500/[.04]")}><td className="px-5 py-3"><span className={cn("rounded-full px-2.5 py-1 text-xs",l.future?"bg-emerald-400/15 text-emerald-400":"bg-white/[.06] text-zinc-300")}>{l.future?"Future DCA":"Existing"}</span>{l.note&&<p className="mt-2 text-xs text-amber-300">{l.note}</p>}</td><td className="px-4 py-3"><input type="number" step="any" value={l.shares} onChange={e=>update(i,"shares",e.target.value)} className="w-28 rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-emerald-400/50"/></td><td className="px-4 py-3"><div className="flex w-32 items-center rounded-lg border border-white/10 bg-black/20 px-3"><span className="text-zinc-500">$</span><input type="number" step="any" value={l.price} onChange={e=>update(i,"price",e.target.value)} className="w-full bg-transparent px-1 py-2 outline-none"/></div></td><td className="px-4 py-3 font-medium">{money(l.amount)}</td><td className="px-4 py-3"><input value={l.date} onChange={e=>update(i,"date",e.target.value)} className="w-36 rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none"/></td><td className={cn("px-4 py-3 font-medium",profit>=0?"text-emerald-400":"text-rose-400")}>{profit<0?"-":""}{money(Math.abs(profit))}</td><td className={cn("px-4 py-3",r>=0?"text-emerald-400":"text-rose-400")}>{pct(r)}</td><td className="px-4 py-3"><button aria-label="Remove row" onClick={()=>setLots(prev=>prev.filter((_,x)=>x!==i))} className="rounded-lg p-2 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400"><Trash2 size={16}/></button></td></tr>})}</tbody></table></div>
    </section>

    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-zinc-950/35 p-5"><h2 className="font-semibold">Before vs. after DCA</h2><div className="mt-5 space-y-4"><div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/15 p-4"><div><p className="text-sm text-zinc-500">Existing average</p><p className="mt-1 text-xl font-semibold">{money(totals.oldAvg)}</p></div><ArrowDownRight className={totals.avg<=totals.oldAvg?"text-emerald-400":"text-rose-400"}/><div className="text-right"><p className="text-sm text-zinc-500">New average</p><p className="mt-1 text-xl font-semibold">{money(totals.avg)}</p></div></div><div className="flex justify-between text-sm"><span className="text-zinc-500">Added DCA capital</span><span>{money(totals.futureAmount)}</span></div><div className="flex justify-between text-sm"><span className="text-zinc-500">Average-price change</span><span className={totals.avg<=totals.oldAvg?"text-emerald-400":"text-rose-400"}>{totals.oldAvg?pct((totals.avg-totals.oldAvg)/totals.oldAvg*100):"0.00%"}</span></div></div></section>
      <section className={cn("rounded-2xl border p-5",totals.profit>=0?"border-emerald-500/30 bg-emerald-500/[.06]":"border-rose-500/30 bg-rose-500/[.06]")}><h2 className="flex items-center gap-2 font-semibold">{totals.profit>=0?<ArrowUpRight size={18}/>:<ArrowDownRight size={18}/>}Scenario insight</h2><p className="mt-4 text-sm leading-6 text-zinc-300">At a sell price of <strong>{money(sellPrice)}</strong>, this combined position would be worth <strong>{money(totals.value)}</strong> and produce a <strong>{totals.profit>=0?"profit":"loss"} of {money(Math.abs(totals.profit))}</strong>. {totals.futureAmount>0?`The planned DCA adds ${money(totals.futureAmount)} and moves the average from ${money(totals.oldAvg)} to ${money(totals.avg)}.`:"Add a future purchase row to compare a new DCA entry."}</p></section>
    </div>
  </div>
}
