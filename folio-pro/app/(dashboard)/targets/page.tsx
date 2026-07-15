"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CircleDollarSign, Flag, Info, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useActivePortfolio } from "@/components/portfolio/portfolio-context";
import { usePortfolioStore } from "@/store/portfolio-store";
import { cn } from "@/lib/utils";
import type { Holding } from "@/types/portfolio";

const ROBINHOOD_TARGETS = [
  ["Aug 31, 2026",112000,0],["Oct 31, 2026",129360,17360],["Dec 31, 2026",149411,20051],["Feb 28, 2027",172569,23159],["Apr 30, 2027",199318,26748],["Jun 30, 2027",230212,30894],["Aug 31, 2027",265895,35683],["Oct 31, 2027",307109,41214],["Dec 31, 2027",354710,47602],
] as const;
const ROTH_TARGETS = [
  ["Aug 31, 2026",21000,0],["Oct 31, 2026",24675,3675],["Dec 31, 2026",28993,4318],["Feb 28, 2027",34067,5074],["Apr 30, 2027",40029,5962],["Jun 30, 2027",47034,7005],["Aug 31, 2027",55265,8231],["Oct 31, 2027",64936,9671],["Dec 31, 2027",76300,11364],
] as const;

type Scenario = { targetPrice: number; additionalQty: number; gapShare: number };
const money=(v:number)=>v.toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});
const money2=(v:number)=>v.toLocaleString("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2});
const pct=(v:number)=>`${v.toFixed(2)}%`;
const keyFor=(h:Holding)=>`${h.assetType??"stock"}:${h.symbol}:${h.optionExpiry??""}:${h.optionStrike??""}`;
function portfolioValue(holdings:Holding[],cash:number){return holdings.reduce((s,h)=>s+h.currentPrice*h.shares*(h.assetType==="option"?100:1),0)+cash;}

export default function TargetPlannerPage(){
  const {activeId,active}=useActivePortfolio();
  const holdingsByPortfolio=usePortfolioStore(s=>s.holdingsByPortfolio);
  const cashByPortfolio=usePortfolioStore(s=>s.cashByPortfolio);
  const isRobinhood=activeId==="robinhood";
  const isRoth=activeId==="fidelity-401k";
  const selectedHoldings=useMemo(()=>isRobinhood?holdingsByPortfolio.robinhood:isRoth?holdingsByPortfolio["fidelity-401k"]:[...holdingsByPortfolio.robinhood,...holdingsByPortfolio["fidelity-401k"]],[holdingsByPortfolio,isRobinhood,isRoth]);
  const selectedCash=isRobinhood?cashByPortfolio.robinhood:isRoth?cashByPortfolio["fidelity-401k"]:cashByPortfolio.robinhood+cashByPortfolio["fidelity-401k"];
  const rows=useMemo(()=>isRobinhood?ROBINHOOD_TARGETS.map(([date,target,increase])=>({date,target,increase})):isRoth?ROTH_TARGETS.map(([date,target,increase])=>({date,target,increase})):ROBINHOOD_TARGETS.map(([date,target,increase],i)=>({date,target:target+ROTH_TARGETS[i][1],increase:increase+ROTH_TARGETS[i][2]})),[isRobinhood,isRoth]);
  const [selectedDate,setSelectedDate]=useState<string>(rows[1].date);
  const [scenarios,setScenarios]=useState<Record<string,Scenario>>({});
  const storageKey=`folio-target-scenarios:${activeId}`;
  useEffect(()=>{const raw=localStorage.getItem(storageKey);setScenarios(raw?JSON.parse(raw):{});setSelectedDate(rows[1].date)},[storageKey,rows]);
  useEffect(()=>{localStorage.setItem(storageKey,JSON.stringify(scenarios))},[storageKey,scenarios]);
  const currentValue=portfolioValue(selectedHoldings,selectedCash);
  const selectedTarget=rows.find(r=>r.date===selectedDate)??rows[0];
  const baseGap=Math.max(0,selectedTarget.target-currentValue);
  const owned=selectedHoldings.filter(h=>Math.abs(h.shares)>0);
  const details=owned.map(h=>{
    const k=keyFor(h); const s=scenarios[k]??{targetPrice:h.currentPrice,additionalQty:0,gapShare:25};
    const multiplier=h.assetType==="option"?100:1;
    const ownedQty=Math.abs(h.shares); const totalQty=ownedQty+Math.max(0,s.additionalQty);
    const existingProfit=(s.targetPrice-h.currentPrice)*ownedQty*multiplier;
    const addedProfit=(s.targetPrice-h.currentPrice)*Math.max(0,s.additionalQty)*multiplier;
    const totalProfit=existingProfit+addedProfit;
    const investment=Math.max(0,s.additionalQty)*h.currentPrice*multiplier;
    const expectedReturn=h.currentPrice>0?(s.targetPrice/h.currentPrice-1)*100:0;
    const gapCovered=baseGap>0?totalProfit/baseGap*100:100;
    const desiredProfit=baseGap*(s.gapShare/100);
    const profitPerUnit=Math.max(0,(s.targetPrice-h.currentPrice)*multiplier);
    const qtyForGoal=profitPerUnit>0?Math.ceil(desiredProfit/profitPerUnit):0;
    const extraForGoal=Math.max(0,qtyForGoal-ownedQty);
    return {h,k,s,multiplier,ownedQty,totalQty,existingProfit,addedProfit,totalProfit,investment,expectedReturn,gapCovered,desiredProfit,qtyForGoal,extraForGoal};
  });
  const scenarioProfit=details.reduce((s,d)=>s+d.totalProfit,0);
  const projectedValue=currentValue+scenarioProfit;
  const remainingGap=Math.max(0,selectedTarget.target-projectedValue);
  const totalInvestment=details.reduce((s,d)=>s+d.investment,0);
  const update=(k:string,patch:Partial<Scenario>,h:Holding)=>setScenarios(prev=>{ const base=prev[k] ?? { targetPrice:h.currentPrice, additionalQty:0, gapShare:25 }; return {...prev,[k]:{...base,...patch}}; });

  return <div className="space-y-6">
    <div><h1 className="text-3xl font-semibold">Target Scenario Builder</h1><p className="mt-1 text-sm text-zinc-500">Enter your own price targets and see how owned stocks and options could change your portfolio by each milestone date.</p></div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Metric icon={CircleDollarSign} label="Current Portfolio" value={money2(currentValue)}/>
      <Metric icon={Target} label="Selected Target" value={money(selectedTarget.target)} accent/>
      <Metric icon={TrendingUp} label="Scenario Profit" value={`${scenarioProfit>=0?"+":""}${money2(scenarioProfit)}`} good={scenarioProfit>=0}/>
      <Metric icon={Flag} label="Projected Portfolio" value={money2(projectedValue)} accent={projectedValue>=selectedTarget.target}/>
      <Metric icon={CalendarDays} label="Remaining Gap" value={money(remainingGap)} subtle={`${baseGap?Math.min(100,Math.max(0,scenarioProfit/baseGap*100)).toFixed(1):100}% covered`}/>
    </div>

    <Card className="p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="font-semibold">1. Select Target Date</h2><p className="mt-1 text-sm text-zinc-500">Choose one of your saved Target Portfolio Values milestones.</p></div><select value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-zinc-950 px-4 text-sm outline-none">{rows.map(r=><option key={r.date} value={r.date}>{r.date} · {money(r.target)}</option>)}</select></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Mini label="Starting Value" value={money2(currentValue)}/><Mini label="Profit Needed" value={money(baseGap)}/><Mini label="Selected Portfolio" value={active.name}/></div></Card>

    <Card className="overflow-hidden">
      <div className="border-b border-white/10 p-5"><h2 className="font-semibold">2. Build Your Price-Target Scenarios</h2><p className="mt-1 text-sm text-zinc-500">Only positions already owned in {active.name} are available. Values save automatically.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1320px] text-sm"><thead className="bg-white/[.035] text-left text-xs uppercase tracking-wider text-zinc-500"><tr><th className="px-4 py-3">Position</th><th className="px-4 py-3">Owned</th><th className="px-4 py-3">Current Price</th><th className="px-4 py-3">Your Target Price</th><th className="px-4 py-3">Expected Return</th><th className="px-4 py-3">Buy More</th><th className="px-4 py-3">New Investment</th><th className="px-4 py-3">Profit At Target</th><th className="px-4 py-3">Target Gap Covered</th><th className="px-4 py-3">Target Date</th></tr></thead><tbody>{details.map(d=><tr key={d.k} className="border-t border-white/[.06]"><td className="px-4 py-3"><div className="font-medium">{d.h.symbol}</div><div className="text-xs text-zinc-600">{d.h.assetType==="option"?`${d.h.optionExpiry??"Option"} · $${d.h.optionStrike??0}`:d.h.company}</div></td><td className="px-4 py-3">{d.ownedQty.toLocaleString()} {d.h.assetType==="option"?"contracts":"shares"}</td><td className="px-4 py-3">{money2(d.h.currentPrice)}</td><td className="px-4 py-3"><input type="number" min="0" step="0.01" value={d.s.targetPrice} onChange={e=>update(d.k,{targetPrice:Number(e.target.value)},d.h)} className="h-9 w-28 rounded-lg border border-blue-400/20 bg-blue-400/[.06] px-3 text-blue-200 outline-none"/></td><td className={cn("px-4 py-3 font-medium",d.expectedReturn>=0?"text-emerald-400":"text-red-400")}>{d.expectedReturn>=0?"+":""}{pct(d.expectedReturn)}</td><td className="px-4 py-3"><input type="number" min="0" step="1" value={d.s.additionalQty} onChange={e=>update(d.k,{additionalQty:Number(e.target.value)},d.h)} className="h-9 w-24 rounded-lg border border-white/10 bg-zinc-950 px-3 outline-none"/></td><td className="px-4 py-3">{money2(d.investment)}</td><td className={cn("px-4 py-3 font-medium",d.totalProfit>=0?"text-emerald-400":"text-red-400")}>{d.totalProfit>=0?"+":""}{money2(d.totalProfit)}</td><td className="px-4 py-3">{pct(d.gapCovered)}</td><td className="px-4 py-3">{selectedDate}</td></tr>)}</tbody></table></div>
    </Card>

    <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <Card className="overflow-hidden"><div className="border-b border-white/10 p-5"><h2 className="font-semibold">3. Work Backward From The Target Gap</h2><p className="mt-1 text-sm text-zinc-500">Choose how much of the gap each idea should cover. The calculator estimates the total and additional quantity required.</p></div><div className="divide-y divide-white/[.06]">{details.map(d=><div key={d.k} className="grid gap-4 p-4 md:grid-cols-[1fr_1.2fr_.8fr_.8fr] md:items-center"><div><div className="font-medium">{d.h.symbol}</div><div className="text-xs text-zinc-500">Target {money2(d.s.targetPrice)}</div></div><div><div className="mb-2 flex justify-between text-xs"><span>Gap Share</span><span className="text-blue-300">{d.s.gapShare}%</span></div><input type="range" min="5" max="100" step="5" value={d.s.gapShare} onChange={e=>update(d.k,{gapShare:Number(e.target.value)},d.h)} className="w-full"/></div><div><div className="text-xs text-zinc-500">Total Needed</div><div className="font-semibold">{d.qtyForGoal.toLocaleString()} {d.h.assetType==="option"?"contracts":"shares"}</div></div><div><div className="text-xs text-zinc-500">Add From Here</div><div className="font-semibold text-blue-300">{d.extraForGoal.toLocaleString()}</div></div></div>)}</div></Card>

      <Card className="p-5"><h2 className="font-semibold">Scenario Summary</h2><div className="mt-4 space-y-3"><Summary label="Target Date" value={selectedDate}/><Summary label="Target Portfolio Value" value={money(selectedTarget.target)}/><Summary label="Current Portfolio Value" value={money2(currentValue)}/><Summary label="New Capital Required" value={money2(totalInvestment)}/><Summary label="Potential Profit" value={`${scenarioProfit>=0?"+":""}${money2(scenarioProfit)}`} good={scenarioProfit>=0}/><Summary label="Projected Portfolio Value" value={money2(projectedValue)} good={projectedValue>=selectedTarget.target}/><Summary label="Remaining Gap" value={money2(remainingGap)} good={remainingGap===0}/></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-emerald-400" style={{width:`${Math.min(100,baseGap?Math.max(0,scenarioProfit/baseGap*100):100)}%`}}/></div><p className="mt-3 text-sm text-zinc-500">Your scenarios cover <span className="font-medium text-white">{baseGap?pct(Math.max(0,scenarioProfit/baseGap*100)):"100.00%"}</span> of the selected target gap.</p></Card>
    </div>

    {details[0]&&<Sensitivity detail={details[0]} targetDate={selectedDate} currentValue={currentValue} targetValue={selectedTarget.target}/>} 

    <div className="flex gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[.05] p-4 text-sm text-zinc-400"><Info className="shrink-0 text-amber-400" size={18}/><p>This is a user-driven planning simulator. It calculates outcomes from the price targets and quantities you enter; it does not predict prices or guarantee returns. Options can expire worthless, and taxes, spreads, liquidity, and timing can materially change results.</p></div>
  </div>;
}

function Sensitivity({detail,targetDate,currentValue,targetValue}:{detail:any;targetDate:string;currentValue:number;targetValue:number}){const points=[-30,-20,-10,0,10,20,30].map(delta=>{const price=detail.s.targetPrice*(1+delta/100);const profit=(price-detail.h.currentPrice)*detail.totalQty*detail.multiplier;const value=currentValue+profit;return{delta,price,profit,value,gap:Math.max(0,targetValue-value)}});return <Card className="overflow-hidden"><div className="border-b border-white/10 p-5"><h2 className="font-semibold">4. What If Your Target Is Wrong? · {detail.h.symbol}</h2><p className="mt-1 text-sm text-zinc-500">A sensitivity range around your entered price target for {targetDate}.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-white/[.035] text-left text-xs uppercase tracking-wider text-zinc-500"><tr><th className="px-5 py-3">Scenario</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">Position Profit / Loss</th><th className="px-5 py-3">Projected Portfolio</th><th className="px-5 py-3">Remaining Gap</th></tr></thead><tbody>{points.map(p=><tr key={p.delta} className={cn("border-t border-white/[.06]",p.delta===0&&"bg-blue-400/[.07]")}><td className="px-5 py-3">{p.delta===0?"Your Target":`${p.delta>0?"+":""}${p.delta}%`}</td><td className="px-5 py-3">{money2(p.price)}</td><td className={cn("px-5 py-3",p.profit>=0?"text-emerald-400":"text-red-400")}>{p.profit>=0?"+":""}{money2(p.profit)}</td><td className="px-5 py-3">{money2(p.value)}</td><td className="px-5 py-3">{money2(p.gap)}</td></tr>)}</tbody></table></div></Card>}
function Metric({icon:Icon,label,value,subtle,accent=false,good=false}:{icon:any;label:string;value:string;subtle?:string;accent?:boolean;good?:boolean}){return <Card className="p-4"><div className="flex items-center gap-2 text-xs text-zinc-500"><span className={cn("grid size-8 place-items-center rounded-lg",accent||good?"bg-emerald-400/15 text-emerald-400":"bg-blue-400/15 text-blue-300")}><Icon size={16}/></span>{label}</div><div className={cn("mt-3 text-xl font-semibold",(accent||good)&&"text-emerald-400")}>{value}</div>{subtle&&<div className="mt-1 text-xs text-zinc-500">{subtle}</div>}</Card>}
function Mini({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-4"><div className="text-xs text-zinc-500">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>}
function Summary({label,value,good=false}:{label:string;value:string;good?:boolean}){return <div className="flex items-center justify-between border-b border-white/[.06] pb-3 text-sm last:border-0"><span className="text-zinc-500">{label}</span><span className={cn("font-medium",good&&"text-emerald-400")}>{value}</span></div>}
