"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CircleDollarSign, Flag, Target, TrendingUp } from "lucide-react";
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
function positionLabel(h:Holding){if(h.assetType!=="option")return h.symbol;const type=h.optionType?h.optionType.split("-").map(word=>word.charAt(0).toUpperCase()+word.slice(1).toLowerCase()).join(" "):"Option";const expiry=h.optionExpiry?new Date(`${h.optionExpiry}T12:00:00`).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"No Expiry";return `${h.symbol} $${h.optionStrike??0} ${type} · ${expiry}`;}

export default function TargetPlannerPage(){
  const {activeId}=useActivePortfolio();
  const holdingsByPortfolio=usePortfolioStore(s=>s.holdingsByPortfolio);
  const cashByPortfolio=usePortfolioStore(s=>s.cashByPortfolio);
  const isRobinhood=activeId==="robinhood";
  const isRoth=activeId==="fidelity-401k";
  const selectedHoldings=useMemo(()=>isRobinhood?holdingsByPortfolio.robinhood:isRoth?holdingsByPortfolio["fidelity-401k"]:[...holdingsByPortfolio.robinhood,...holdingsByPortfolio["fidelity-401k"]],[holdingsByPortfolio,isRobinhood,isRoth]);
  const selectedCash=isRobinhood?cashByPortfolio.robinhood:isRoth?cashByPortfolio["fidelity-401k"]:cashByPortfolio.robinhood+cashByPortfolio["fidelity-401k"];
  const rows=useMemo(()=>isRobinhood?ROBINHOOD_TARGETS.map(([date,target,increase])=>({date,target,increase})):isRoth?ROTH_TARGETS.map(([date,target,increase])=>({date,target,increase})):ROBINHOOD_TARGETS.map(([date,target,increase],i)=>({date,target:target+ROTH_TARGETS[i][1],increase:increase+ROTH_TARGETS[i][2]})),[isRobinhood,isRoth]);
  const [selectedDate,setSelectedDate]=useState<string>(rows[1].date);
  const [scenarios,setScenarios]=useState<Record<string,Scenario>>({});
  const [cashError,setCashError]=useState<string | null>(null);
  const storageKey=`folio-target-scenarios:${activeId}`;
  useEffect(()=>{const raw=localStorage.getItem(storageKey);setScenarios(raw?JSON.parse(raw):{});setSelectedDate(rows[1].date)},[storageKey,rows]);
  useEffect(()=>{localStorage.setItem(storageKey,JSON.stringify(scenarios))},[storageKey,scenarios]);
  const currentValue=portfolioValue(selectedHoldings,selectedCash);
  const selectedTarget=rows.find(r=>r.date===selectedDate)??rows[0];
  const baseGap=Math.max(0,selectedTarget.target-currentValue);
  const owned=selectedHoldings.filter(h=>Math.abs(h.shares)>0).sort((a,b)=>a.symbol.localeCompare(b.symbol)||positionLabel(a).localeCompare(positionLabel(b)));
  const details=owned.map(h=>{
    const k=keyFor(h); const s=scenarios[k]??{targetPrice:0,additionalQty:0,gapShare:25};
    const multiplier=h.assetType==="option"?100:1;
    const direction=h.assetType==="option"?(Math.sign(h.shares)||1):1;
    const ownedQty=Math.abs(h.shares); const totalQty=ownedQty+Math.max(0,s.additionalQty);
    const existingProfit=(s.targetPrice-h.currentPrice)*ownedQty*multiplier*direction;
    const addedProfit=(s.targetPrice-h.currentPrice)*Math.max(0,s.additionalQty)*multiplier*direction;
    const totalProfit=existingProfit+addedProfit;
    const investment=Math.max(0,s.additionalQty)*h.currentPrice*multiplier;
    const expectedReturn=h.currentPrice>0?((s.targetPrice-h.currentPrice)/h.currentPrice)*100*direction:0;
    const gapCovered=baseGap>0?totalProfit/baseGap*100:100;
    const desiredProfit=baseGap*(s.gapShare/100);
    const profitPerUnit=Math.max(0,(s.targetPrice-h.currentPrice)*multiplier*direction);
    const qtyForGoal=profitPerUnit>0?Math.ceil(desiredProfit/profitPerUnit):0;
    const extraForGoal=Math.max(0,qtyForGoal-ownedQty);
    return {h,k,s,multiplier,ownedQty,totalQty,existingProfit,addedProfit,totalProfit,investment,expectedReturn,gapCovered,desiredProfit,qtyForGoal,extraForGoal};
  });
  const scenarioProfit=details.reduce((s,d)=>s+d.totalProfit,0);
  const projectedValue=currentValue+scenarioProfit;
  const remainingGap=Math.max(0,selectedTarget.target-projectedValue);
  const totalInvestment=details.reduce((s,d)=>s+d.investment,0);
  const update=(k:string,patch:Partial<Scenario>,h:Holding)=>setScenarios(prev=>{ const base=prev[k] ?? { targetPrice:0, additionalQty:0, gapShare:25 }; return {...prev,[k]:{...base,...patch}}; });
  const updateAdditionalQty=(detail:typeof details[number],value:number)=>{
    const nextQty=Math.max(0,Number.isFinite(value)?value:0);
    const nextInvestment=nextQty*detail.h.currentPrice*detail.multiplier;
    const otherInvestment=totalInvestment-detail.investment;
    if(otherInvestment+nextInvestment>selectedCash+0.005){setCashError("Not Enough Cash");return;}
    setCashError(null);
    update(detail.k,{additionalQty:nextQty},detail.h);
  };

  return <div className="space-y-6">
    <div><h1 className="text-3xl font-semibold">Target Scenario Builder</h1><p className="mt-1 text-sm text-zinc-500">Enter Your Own Price Targets And See How Owned Stocks And Options Could Change Your Portfolio By Each Milestone Date.</p></div>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric icon={CircleDollarSign} label="Current Portfolio" value={money2(currentValue)}/>
      <Metric icon={Target} label="Selected Target" value={money(selectedTarget.target)} accent/>
      <Metric icon={TrendingUp} label="Profit Needed" value={money(baseGap)} />
      <Metric icon={TrendingUp} label="Projected Profit" value={`${scenarioProfit>=0?"+":""}${money2(scenarioProfit)}`} good={scenarioProfit>=0}/>
      <Metric icon={Flag} label="Projected Portfolio" value={money2(projectedValue)} accent={projectedValue>=selectedTarget.target}/>
      <Metric icon={CalendarDays} label="Remaining Gap" value={money(remainingGap)} subtle={`${baseGap?Math.min(100,Math.max(0,scenarioProfit/baseGap*100)).toFixed(1):100}% Covered`}/>
      <Metric icon={CircleDollarSign} label="New Capital Required" value={money2(totalInvestment)}/>
    </div>

    <Card className="overflow-hidden">
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold">Build Your Price-Target Scenarios</h2>
            <p className="mt-2 text-xs text-zinc-500">Available Cash: <span className="font-medium text-white">{money2(selectedCash)}</span></p>
            {cashError&&<p className="mt-2 text-sm font-medium text-red-400">{cashError}</p>}
          </div>
          <label className="w-full lg:w-auto lg:min-w-56">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">Target Date</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-blue-300"/>
              <select value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} className="h-11 w-full appearance-none rounded-xl border border-blue-400/25 bg-blue-400/[.07] pl-10 pr-10 text-sm font-medium text-blue-100 outline-none transition focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/15">{rows.map(r=><option key={r.date} value={r.date}>{r.date}</option>)}</select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-300">▼</span>
            </div>
          </label>
        </div>
      </div>
      <div className="-mx-px overflow-x-auto overscroll-x-contain pb-1"><table className="w-full min-w-[1420px] text-sm"><thead className="bg-white/[.035] text-left text-xs uppercase tracking-wider text-zinc-500"><tr><th className="px-4 py-3">Position</th><th className="px-4 py-3">Owned</th><th className="px-4 py-3">Average Cost</th><th className="px-4 py-3">Current Price</th><th className="px-4 py-3">Your Target Price</th><th className="px-4 py-3">Expected Return</th><th className="px-4 py-3">Buy More</th><th className="px-4 py-3">New Investment</th><th className="px-4 py-3">Profit At Target</th><th className="px-4 py-3">Target Gap Covered</th><th className="px-4 py-3">Target Date</th></tr></thead><tbody>{details.map(d=><tr key={d.k} className="border-t border-white/[.06]"><td className="px-4 py-3"><div className="font-medium">{positionLabel(d.h)}</div></td><td className="px-4 py-3">{d.ownedQty.toLocaleString()} {d.h.assetType==="option"?"Contracts":"Shares"}</td><td className="px-4 py-3">{money2(d.h.averageCost)}</td><td className="px-4 py-3">{money2(d.h.currentPrice)}</td><td className="px-4 py-3"><input type="number" min="0" step="0.01" value={(scenarios[d.k]?.targetPrice ?? 0) === 0 ? "" : scenarios[d.k]?.targetPrice} onChange={e=>update(d.k,{targetPrice:e.target.value===""?0:Number(e.target.value)},d.h)} className="h-9 w-28 rounded-lg border border-blue-400/20 bg-blue-400/[.06] px-3 text-blue-200 outline-none"/></td><td className={cn("px-4 py-3 font-medium",d.expectedReturn>=0?"text-emerald-400":"text-red-400")}>{d.expectedReturn>=0?"+":""}{pct(d.expectedReturn)}</td><td className="px-4 py-3"><input type="number" min="0" step="1" value={scenarios[d.k]?.additionalQty || ""} onChange={e=>updateAdditionalQty(d,e.target.value===""?0:Number(e.target.value))} className="h-9 w-24 rounded-lg border border-white/10 bg-zinc-950 px-3 outline-none"/></td><td className="px-4 py-3">{money2(d.investment)}</td><td className={cn("px-4 py-3 font-medium",d.totalProfit>=0?"text-emerald-400":"text-red-400")}>{d.totalProfit>=0?"+":""}{money2(d.totalProfit)}</td><td className="px-4 py-3">{pct(d.gapCovered)}</td><td className="px-4 py-3">{selectedDate}</td></tr>)}</tbody></table></div>
    </Card>

    <Card className="overflow-hidden">
      <div className="border-b border-white/10 p-4 sm:p-5">
        <h2 className="font-semibold">Work Backward From The Target Gap</h2>
        <p className="mt-1 text-sm text-zinc-500">Choose How Much Of The Gap Each Idea Should Cover. The Calculator Estimates The Total And Additional Quantity Required.</p>
      </div>
      <div className="divide-y divide-white/[.06]">{details.map(d=><div key={d.k} className="grid gap-4 p-4 sm:grid-cols-2 md:grid-cols-[1fr_1.2fr_.8fr_.8fr] md:items-center"><div><div className="font-medium">{positionLabel(d.h)}</div><div className="text-xs text-zinc-500">Target {money2(d.s.targetPrice)}</div></div><div><div className="mb-2 flex justify-between text-xs"><span>Gap Share</span><span className="text-blue-300">{d.s.gapShare}%</span></div><input type="range" min="5" max="100" step="5" value={d.s.gapShare} onChange={e=>update(d.k,{gapShare:Number(e.target.value)},d.h)} className="w-full"/></div><div><div className="text-xs text-zinc-500">Total Needed</div><div className="font-semibold">{d.qtyForGoal.toLocaleString()} {d.h.assetType==="option"?"Contracts":"Shares"}</div></div><div><div className="text-xs text-zinc-500">Add From Here</div><div className="font-semibold text-blue-300">{d.extraForGoal.toLocaleString()}</div></div></div>)}</div>
    </Card>

  </div>;
}

function Metric({icon:Icon,label,value,subtle,accent=false,good=false}:{icon:any;label:string;value:string;subtle?:string;accent?:boolean;good?:boolean}){return <Card className="min-w-0 p-3 sm:p-4"><div className="flex min-w-0 items-center gap-2 text-xs text-zinc-500"><span className={cn("grid size-8 place-items-center rounded-lg",accent||good?"bg-emerald-400/15 text-emerald-400":"bg-blue-400/15 text-blue-300")}><Icon size={16}/></span>{label}</div><div className={cn("mt-3 break-words text-lg font-semibold sm:text-xl",(accent||good)&&"text-emerald-400")}>{value}</div>{subtle&&<div className="mt-1 text-xs text-zinc-500">{subtle}</div>}</Card>}