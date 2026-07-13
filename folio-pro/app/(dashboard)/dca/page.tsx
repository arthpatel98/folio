"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { cn, money } from "@/lib/utils";

type NumericValue = number | "";
type Lot = {
  amount: number;
  shares: NumericValue;
  price: NumericValue;
  date: string;
  note?: string;
  future?: boolean;
};
type Position = {
  id: string;
  symbol: string;
  label?: string;
  sellPrice: NumericValue;
  lots: Lot[];
  custom?: boolean;
};

const builtInPositions: Position[] = [
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
  { id:"DRAM", symbol:"DRAM", sellPrice:69.30, lots:[{amount:1668,shares:25,price:66.70,date:"Jun 29, 2026"},{amount:1232,shares:20,price:61.60,date:"Jul 2, 2026"}]},
  { id:"NBIS", symbol:"NBIS", sellPrice:225, lots:[{amount:1643,shares:7,price:234.69,date:"Jul 1, 2026"},{amount:1050,shares:5,price:209.98,date:"Jul 2, 2026"},{amount:1171,shares:6,price:195.20,date:"Jul 7, 2026"}]},
  { id:"SITM", symbol:"SITM", sellPrice:670, lots:[{amount:1214,shares:2,price:606.77,date:"Jul 2, 2026"}]},
];

const toNumber = (value: NumericValue) => value === "" || !Number.isFinite(Number(value)) ? 0 : Number(value);
const parseNumericInput = (value: string): NumericValue => value === "" ? "" : Number(value);
const pct = (value:number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
const clonePosition = (position: Position): Position => ({...position, lots: position.lots.map((lot) => ({...lot}))});
const STORAGE_KEY = "folio-dca-custom-positions";

export default function DcaPage(){
  const [customPositions,setCustomPositions]=useState<Position[]>([]);
  const [positionId,setPositionId]=useState(builtInPositions[0].id);
  const [lots,setLots]=useState<Lot[]>(builtInPositions[0].lots.map((lot)=>({...lot})));
  const [sellPrice,setSellPrice]=useState<NumericValue>(builtInPositions[0].sellPrice);
  const [showAddPosition,setShowAddPosition]=useState(false);
  const [newSymbol,setNewSymbol]=useState("");
  const [newSellPrice,setNewSellPrice]=useState<NumericValue>("");
  const [newShares,setNewShares]=useState<NumericValue>("");
  const [newBuyPrice,setNewBuyPrice]=useState<NumericValue>("");
  const [newBuyDate,setNewBuyDate]=useState("");

  useEffect(()=>{
    try {
      const saved=window.localStorage.getItem(STORAGE_KEY);
      if(saved) setCustomPositions(JSON.parse(saved));
    } catch {}
  },[]);

  const positions=useMemo(()=>[...builtInPositions,...customPositions], [customPositions]);
  const selectedPosition=positions.find((position)=>position.id===positionId) ?? positions[0];

  const saveCustomPositions=(next:Position[])=>{
    setCustomPositions(next);
    try { window.localStorage.setItem(STORAGE_KEY,JSON.stringify(next)); } catch {}
  };

  const load=(id:string)=>{
    const position=positions.find((item)=>item.id===id);
    if(!position) return;
    const copy=clonePosition(position);
    setPositionId(id);
    setLots(copy.lots);
    setSellPrice(copy.sellPrice);
  };

  const totals=useMemo(()=>{
    const amount=lots.reduce((sum,lot)=>sum+lot.amount,0);
    const shares=lots.reduce((sum,lot)=>sum+toNumber(lot.shares),0);
    const target=toNumber(sellPrice);
    const avg=shares?amount/shares:0;
    const value=shares*target;
    const profit=value-amount;
    const roi=amount?profit/amount*100:0;
    const existing=lots.filter((lot)=>!lot.future);
    const future=lots.filter((lot)=>lot.future);
    const oldAmount=existing.reduce((sum,lot)=>sum+lot.amount,0);
    const oldShares=existing.reduce((sum,lot)=>sum+toNumber(lot.shares),0);
    const oldAvg=oldShares?oldAmount/oldShares:0;
    return {amount,shares,avg,value,profit,roi,oldAvg,futureAmount:future.reduce((sum,lot)=>sum+lot.amount,0)};
  },[lots,sellPrice]);

  const update=(index:number,key:keyof Lot,value:string)=>setLots((previous)=>previous.map((lot,lotIndex)=>{
    if(lotIndex!==index) return lot;
    if(key==="date"||key==="note") return {...lot,[key]:value};
    const numeric=parseNumericInput(value);
    const next={...lot,[key]:numeric};
    const shares=key==="shares"?toNumber(numeric):toNumber(next.shares);
    const price=key==="price"?toNumber(numeric):toNumber(next.price);
    return {...next,amount:shares*price};
  }));

  const addExisting=()=>setLots((previous)=>[...previous,{amount:0,shares:"",price:"",date:"",future:false}]);
  const addFuture=()=>setLots((previous)=>[...previous,{amount:0,shares:"",price:"",date:"",future:true}]);

  const resetNewPosition=()=>{
    setNewSymbol("");setNewSellPrice("");setNewShares("");setNewBuyPrice("");setNewBuyDate("");
  };

  const addPosition=()=>{
    const symbol=newSymbol.trim().toUpperCase();
    const shares=toNumber(newShares);
    const buyPrice=toNumber(newBuyPrice);
    if(!symbol||toNumber(newSellPrice)<=0||shares<=0||buyPrice<=0||!newBuyDate) return;
    const id=`CUSTOM-${symbol}-${Date.now()}`;
    const position:Position={
      id,
      symbol,
      label:symbol,
      sellPrice:newSellPrice,
      custom:true,
      lots:[{amount:shares*buyPrice,shares:newShares,price:newBuyPrice,date:newBuyDate,future:false}],
    };
    saveCustomPositions([...customPositions,position]);
    setPositionId(id);
    setLots(position.lots.map((lot)=>({...lot})));
    setSellPrice(position.sellPrice);
    resetNewPosition();
    setShowAddPosition(false);
  };

  const saveCurrentPosition=()=>{
    if(!selectedPosition?.custom) return;
    const next=customPositions.map((position)=>position.id===positionId?{...position,sellPrice,lots:lots.map((lot)=>({...lot}))}:position);
    saveCustomPositions(next);
  };

  const resetPosition=()=>load(positionId);

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="text-3xl font-semibold tracking-tight">DCA Calculator</h1><p className="mt-1 text-sm text-zinc-500">Test An Additional Purchase And See How It Changes Your Average Cost And Potential Return.</p></div>
      <button onClick={()=>setShowAddPosition(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-300"><Plus size={16}/>Add Position</button>
    </div>

    {showAddPosition&&<section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[.04] p-5 shadow-sm lg:p-6">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Add Position</h2><p className="mt-1 text-sm text-zinc-500">Create A Ticker And Add Its First Existing Purchase Lot.</p></div><button onClick={()=>{setShowAddPosition(false);resetNewPosition();}} aria-label="Close Add Position" className="rounded-lg p-2 text-zinc-400 hover:bg-white/[.06] hover:text-white"><X size={18}/></button></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-2 text-sm font-medium text-zinc-300">Ticker Symbol<input value={newSymbol} onChange={(event)=>setNewSymbol(event.target.value.toUpperCase())} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 uppercase outline-none focus:border-emerald-400/60"/></label>
        <label className="space-y-2 text-sm font-medium text-zinc-300">Potential Sell Price<div className="flex h-11 items-center rounded-xl border border-white/10 bg-black/20 px-3"><span className="text-zinc-500">$</span><input type="number" step="any" value={newSellPrice} onChange={(event)=>setNewSellPrice(parseNumericInput(event.target.value))} className="w-full bg-transparent px-1 outline-none"/></div></label>
        <label className="space-y-2 text-sm font-medium text-zinc-300">Shares<input type="number" step="any" value={newShares} onChange={(event)=>setNewShares(parseNumericInput(event.target.value))} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 outline-none focus:border-emerald-400/60"/></label>
        <label className="space-y-2 text-sm font-medium text-zinc-300">Buy Price<div className="flex h-11 items-center rounded-xl border border-white/10 bg-black/20 px-3"><span className="text-zinc-500">$</span><input type="number" step="any" value={newBuyPrice} onChange={(event)=>setNewBuyPrice(parseNumericInput(event.target.value))} className="w-full bg-transparent px-1 outline-none"/></div></label>
        <label className="space-y-2 text-sm font-medium text-zinc-300">Buy Date<input type="date" value={newBuyDate} onChange={(event)=>setNewBuyDate(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 outline-none focus:border-emerald-400/60"/></label>
      </div>
      <div className="mt-5 flex justify-end"><button onClick={addPosition} disabled={!newSymbol.trim()||toNumber(newSellPrice)<=0||toNumber(newShares)<=0||toNumber(newBuyPrice)<=0||!newBuyDate} className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40">Add Position</button></div>
    </section>}

    <section className="rounded-2xl border border-white/10 bg-zinc-950/35 p-5 shadow-sm lg:p-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div><label className="mb-2 block text-sm font-medium text-zinc-300">Position</label><select value={positionId} onChange={(event)=>load(event.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-zinc-950/70 px-4 text-sm outline-none focus:border-emerald-400/60">{positions.map((position)=><option key={position.id} value={position.id}>{position.label??position.symbol}</option>)}</select></div>
        <div><label className="mb-2 block text-sm font-medium text-zinc-300">Potential Sell Price</label><div className="flex h-12 items-center rounded-xl border border-white/10 bg-black/15 px-4"><span className="mr-2 text-zinc-500">$</span><input type="number" step="any" value={sellPrice} onChange={(event)=>setSellPrice(parseNumericInput(event.target.value))} className="w-full bg-transparent text-lg font-semibold outline-none"/></div></div>
        <div className="flex gap-2"><button onClick={resetPosition} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm hover:bg-white/[.05]"><RotateCcw size={16}/>Reset Position</button>{selectedPosition?.custom&&<button onClick={saveCurrentPosition} className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-300">Save Position</button>}</div>
      </div>
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {[["Total Investment",money(totals.amount)],["Total Shares",totals.shares?totals.shares.toLocaleString(undefined,{maximumFractionDigits:5}):"—"],["New Average",totals.avg?money(totals.avg):"—"],[totals.profit>=0?"Potential Profit":"Potential Loss",totals.amount?`${totals.profit<0?"-":""}${money(Math.abs(totals.profit))}`:"—"],["Potential Return",totals.amount?pct(totals.roi):"—"]].map(([label,value],index)=><div key={label} className={cn("rounded-2xl border border-white/10 bg-zinc-950/35 p-5",index>=3&&(totals.profit>=0?"border-emerald-500/35 bg-emerald-500/[.06]":"border-rose-500/35 bg-rose-500/[.06]"))}><p className="text-sm text-zinc-500">{label}</p><p className={cn("mt-3 text-2xl font-semibold",index>=3&&(totals.profit>=0?"text-emerald-400":"text-rose-400"))}>{value}</p></div>)}
    </div>

    <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/35">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-semibold">Purchase Lots</h2><p className="mt-1 text-sm text-zinc-500">Add Completed Purchases As Existing Lots Or Test A Planned Purchase As Future DCA.</p></div><div className="flex flex-col gap-2 sm:flex-row"><button onClick={addExisting} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold hover:bg-white/[.05]"><Plus size={16}/>Add Existing Purchase</button><button onClick={addFuture} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-300"><Plus size={16}/>Add Future Purchase</button></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-white/[.025] text-left text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-5 py-3">Type</th><th className="px-4 py-3">Shares</th><th className="px-4 py-3">Buy Price</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Buy Date</th><th className="px-4 py-3">P/L At Target</th><th className="px-4 py-3">Return</th><th className="px-4 py-3"></th></tr></thead><tbody>{lots.map((lot,index)=>{const shares=toNumber(lot.shares),price=toNumber(lot.price),profit=shares*(toNumber(sellPrice)-price),returnPct=lot.amount?profit/lot.amount*100:0;return <tr key={index} className={cn("border-t border-white/10",lot.future&&"bg-emerald-500/[.04]")}><td className="px-5 py-3"><span className={cn("rounded-full px-2.5 py-1 text-xs",lot.future?"bg-emerald-400/15 text-emerald-400":"bg-white/[.06] text-zinc-300")}>{lot.future?"Future DCA":"Existing"}</span>{lot.note&&<p className="mt-2 text-xs text-amber-300">{lot.note}</p>}</td><td className="px-4 py-3"><input type="number" step="any" value={lot.shares} onChange={(event)=>update(index,"shares",event.target.value)} className="w-28 rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-emerald-400/50"/></td><td className="px-4 py-3"><div className="flex w-32 items-center rounded-lg border border-white/10 bg-black/20 px-3"><span className="text-zinc-500">$</span><input type="number" step="any" value={lot.price} onChange={(event)=>update(index,"price",event.target.value)} className="w-full bg-transparent px-1 py-2 outline-none"/></div></td><td className="px-4 py-3 font-medium">{lot.amount?money(lot.amount):"—"}</td><td className="px-4 py-3"><input value={lot.date} onChange={(event)=>update(index,"date",event.target.value)} className="w-40 rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none"/></td><td className={cn("px-4 py-3 font-medium",lot.amount&&(profit>=0?"text-emerald-400":"text-rose-400"))}>{lot.amount?`${profit<0?"-":""}${money(Math.abs(profit))}`:"—"}</td><td className={cn("px-4 py-3",lot.amount&&(returnPct>=0?"text-emerald-400":"text-rose-400"))}>{lot.amount?pct(returnPct):"—"}</td><td className="px-4 py-3"><button aria-label="Remove Purchase Lot" onClick={()=>setLots((previous)=>previous.filter((_,lotIndex)=>lotIndex!==index))} className="rounded-lg p-2 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400"><Trash2 size={16}/></button></td></tr>})}</tbody></table></div>
    </section>

    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-zinc-950/35 p-5"><h2 className="font-semibold">Before Vs. After DCA</h2><div className="mt-5 space-y-4"><div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/15 p-4"><div><p className="text-sm text-zinc-500">Existing Average</p><p className="mt-1 text-xl font-semibold">{totals.oldAvg?money(totals.oldAvg):"—"}</p></div><ArrowDownRight className={totals.oldAvg&&totals.avg<=totals.oldAvg?"text-emerald-400":"text-zinc-500"}/><div className="text-right"><p className="text-sm text-zinc-500">New Average</p><p className="mt-1 text-xl font-semibold">{totals.avg?money(totals.avg):"—"}</p></div></div><div className="flex justify-between text-sm"><span className="text-zinc-500">Added DCA Capital</span><span>{totals.futureAmount?money(totals.futureAmount):"—"}</span></div><div className="flex justify-between text-sm"><span className="text-zinc-500">Average Price Change</span><span className={totals.oldAvg?(totals.avg<=totals.oldAvg?"text-emerald-400":"text-rose-400"):"text-zinc-500"}>{totals.oldAvg?pct((totals.avg-totals.oldAvg)/totals.oldAvg*100):"—"}</span></div></div></section>
      <section className={cn("rounded-2xl border p-5",totals.amount?(totals.profit>=0?"border-emerald-500/30 bg-emerald-500/[.06]":"border-rose-500/30 bg-rose-500/[.06]"):"border-white/10 bg-zinc-950/35")}><h2 className="flex items-center gap-2 font-semibold">{totals.amount&&(totals.profit>=0?<ArrowUpRight size={18}/>:<ArrowDownRight size={18}/>)}Scenario Insight</h2><p className="mt-4 text-sm leading-6 text-zinc-300">{totals.amount&&toNumber(sellPrice)>0?<>At A Sell Price Of <strong>{money(toNumber(sellPrice))}</strong>, This Combined Position Would Be Worth <strong>{money(totals.value)}</strong> And Produce A <strong>{totals.profit>=0?"Profit":"Loss"} Of {money(Math.abs(totals.profit))}</strong>. {totals.futureAmount>0?`The Planned DCA Adds ${money(totals.futureAmount)} And Moves The Average From ${money(totals.oldAvg)} To ${money(totals.avg)}.`:"Add A Future Purchase To Compare A New DCA Entry."}</>:"Enter Position And Purchase-Lot Data To Calculate The Scenario."}</p></section>
    </div>
  </div>;
}
