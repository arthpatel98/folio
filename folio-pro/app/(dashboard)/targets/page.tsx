"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CircleDollarSign, Flag, Plus, Target, Trash2, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useActivePortfolio } from "@/components/portfolio/portfolio-context";
import { usePortfolioStore } from "@/store/portfolio-store";
import { cn } from "@/lib/utils";
import { optionCollateral } from "@/lib/calculations/portfolio";
import type { Holding } from "@/types/portfolio";

const ROBINHOOD_TARGETS = [
  ["Aug 31, 2026",112000,0],["Oct 31, 2026",129360,17360],["Dec 31, 2026",149411,20051],["Feb 28, 2027",172569,23159],["Apr 30, 2027",199318,26748],["Jun 30, 2027",230212,30894],["Aug 31, 2027",265895,35683],["Oct 31, 2027",307109,41214],["Dec 31, 2027",354710,47602],
] as const;
const ROTH_TARGETS = [
  ["Aug 31, 2026",21000,0],["Oct 31, 2026",24675,3675],["Dec 31, 2026",28993,4318],["Feb 28, 2027",34067,5074],["Apr 30, 2027",40029,5962],["Jun 30, 2027",47034,7005],["Aug 31, 2027",55265,8231],["Oct 31, 2027",64936,9671],["Dec 31, 2027",76300,11364],
] as const;

type Scenario = { targetPrice: number; newBuyPrice: number; additionalQty: number; gapShare: number };
type ReinvestmentStep = { id: string; ticker: string; returnPct: number | null; date: string };
const finite=(v:number)=>Number.isFinite(v)?v:0;
const money=(v:number)=>finite(v).toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});
const money2=(v:number)=>finite(v).toLocaleString("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2});
const pct=(v:number)=>`${finite(v).toFixed(2)}%`;
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
  const [targetPriceInputs,setTargetPriceInputs]=useState<Record<string,string>>({});
  const [newBuyPriceInputs,setNewBuyPriceInputs]=useState<Record<string,string>>({});
  const [reinvestmentSteps,setReinvestmentSteps]=useState<ReinvestmentStep[]>([]);
  const [selectedPathPositions,setSelectedPathPositions]=useState<Record<string,boolean>>({});
  const storageKey=`folio-target-scenarios:${activeId}`;
  const pathwayStorageKey=`folio-target-pathway:${activeId}`;
  const pathwaySelectionStorageKey=`folio-target-pathway-selection:${activeId}`;
  useEffect(()=>{const raw=localStorage.getItem(storageKey);setScenarios(raw?JSON.parse(raw):{});setSelectedDate(rows[1].date)},[storageKey,rows]);
  useEffect(()=>{localStorage.setItem(storageKey,JSON.stringify(scenarios))},[storageKey,scenarios]);
  useEffect(()=>{
    const raw=localStorage.getItem(pathwayStorageKey);
    if(raw){
      try{setReinvestmentSteps(JSON.parse(raw));return;}catch{}
    }
    setReinvestmentSteps([{id:`step-${Date.now()}`,ticker:"",returnPct:null,date:""}]);
  },[pathwayStorageKey]);
  useEffect(()=>{localStorage.setItem(pathwayStorageKey,JSON.stringify(reinvestmentSteps))},[pathwayStorageKey,reinvestmentSteps]);
  useEffect(()=>{
    const raw=localStorage.getItem(pathwaySelectionStorageKey);
    if(raw){try{setSelectedPathPositions(JSON.parse(raw));return;}catch{}}
    setSelectedPathPositions({});
  },[pathwaySelectionStorageKey]);
  useEffect(()=>{localStorage.setItem(pathwaySelectionStorageKey,JSON.stringify(selectedPathPositions))},[pathwaySelectionStorageKey,selectedPathPositions]);
  const availableCash=Math.max(0,selectedCash-optionCollateral(selectedHoldings));
  const currentValue=portfolioValue(selectedHoldings,selectedCash);
  const selectedTarget=rows.find(r=>r.date===selectedDate)??rows[0];
  const baseGap=Math.max(0,selectedTarget.target-currentValue);
  const owned=selectedHoldings.filter(h=>Math.abs(h.shares)>0).sort((a,b)=>a.symbol.localeCompare(b.symbol)||positionLabel(a).localeCompare(positionLabel(b)));
  const details=owned.map(h=>{
    const k=keyFor(h); const s=scenarios[k]??{targetPrice:0,newBuyPrice:0,additionalQty:0,gapShare:25};
    const multiplier=h.assetType==="option"?100:1;
    const direction=h.assetType==="option"?(Math.sign(h.shares)||1):1;
    const ownedQty=Math.abs(h.shares); const totalQty=ownedQty+Math.max(0,s.additionalQty);
    const existingProfit=(s.targetPrice-h.currentPrice)*ownedQty*multiplier*direction;
    const hasNewPurchase=s.newBuyPrice>0&&s.additionalQty>0;
    const addedProfit=hasNewPurchase?(s.targetPrice-s.newBuyPrice)*Math.max(0,s.additionalQty)*multiplier*direction:0;
    const totalProfit=existingProfit+addedProfit;
    const investment=Math.max(0,s.additionalQty)*Math.max(0,s.newBuyPrice)*multiplier;
    const expectedReturn=h.currentPrice>0?((s.targetPrice-h.currentPrice)/h.currentPrice)*100*direction:0;
    const gapCovered=baseGap>0?totalProfit/baseGap*100:100;
    const desiredProfit=baseGap*(s.gapShare/100);
    const profitPerUnit=Math.max(0,(s.targetPrice-h.currentPrice)*multiplier*direction);
    const qtyForGoal=profitPerUnit>0?Math.ceil(desiredProfit/profitPerUnit):0;
    const extraForGoal=Math.max(0,qtyForGoal-ownedQty);
    return {h,k,s,multiplier,ownedQty,totalQty,existingProfit,addedProfit,totalProfit,investment,expectedReturn,gapCovered,desiredProfit,qtyForGoal,extraForGoal};
  });
  const scenarioProfit=finite(details.reduce((s,d)=>s+finite(d.totalProfit),0));
  const scenarioProjectedValue=finite(currentValue+scenarioProfit);
  const scenarioRemainingGap=Math.max(0,finite(selectedTarget.target-scenarioProjectedValue));
  const remainingGapBeforeSteps=scenarioRemainingGap;
  const totalInvestment=finite(details.reduce((s,d)=>s+finite(d.investment),0));
  const sellSelections=details.filter(d=>d.s.targetPrice>0&&selectedPathPositions[d.k]).map(d=>({
    ...d,
    saleProceeds:d.s.targetPrice*d.ownedQty*d.multiplier,
  }));
  const totalSaleProceeds=sellSelections.reduce((sum,d)=>sum+d.saleProceeds,0);
  const startingCashPool=finite(totalSaleProceeds+availableCash);
  const pathwayValues=reinvestmentSteps.reduce<Array<ReinvestmentStep & {startValue:number;endValue:number}>>((steps,step)=>{
    const startValue=steps.length?steps[steps.length-1].endValue:startingCashPool;
    const returnPct=typeof step.returnPct==="number"&&Number.isFinite(step.returnPct)?step.returnPct:0;
    const endValue=startValue*(1+returnPct/100);
    steps.push({...step,startValue,endValue});
    return steps;
  },[]);
  const pathwayFinalValue=pathwayValues.length?pathwayValues[pathwayValues.length-1].endValue:startingCashPool;
  const pathwayProfit=pathwayFinalValue-startingCashPool;
  const totalProjectedProfit=scenarioProfit;
  const projectedValue=scenarioProjectedValue;
  const remainingGap=scenarioRemainingGap;
  const pathwayGap=Math.max(0,finite(remainingGapBeforeSteps-pathwayProfit));
  const targetDateValue=new Date(selectedTarget.date);
  const update=(k:string,patch:Partial<Scenario>,h:Holding)=>setScenarios(prev=>{ const base=prev[k] ?? { targetPrice:0, newBuyPrice:0, additionalQty:0, gapShare:25 }; return {...prev,[k]:{...base,...patch}}; });
  const addReinvestmentStep=()=>setReinvestmentSteps(prev=>[...prev,{id:`step-${Date.now()}-${prev.length}`,ticker:"",returnPct:null,date:""}]);
  const updateReinvestmentStep=(id:string,patch:Partial<ReinvestmentStep>)=>setReinvestmentSteps(prev=>prev.map(step=>step.id===id?{...step,...patch}:step));
  const removeReinvestmentStep=(id:string)=>setReinvestmentSteps(prev=>prev.filter(step=>step.id!==id));
  const togglePathPosition=(key:string)=>setSelectedPathPositions(prev=>({...prev,[key]:!prev[key]}));
  const updateAdditionalQty=(detail:typeof details[number],value:number)=>{
    const nextQty=Math.max(0,Number.isFinite(value)?value:0);
    const nextInvestment=nextQty*Math.max(0,detail.s.newBuyPrice)*detail.multiplier;
    const otherInvestment=totalInvestment-detail.investment;
    if(otherInvestment+nextInvestment>availableCash+0.005){setCashError("Not Enough Cash");return;}
    setCashError(null);
    update(detail.k,{additionalQty:nextQty},detail.h);
  };

  return <div className="space-y-6">
    <div><h1 className="text-3xl font-semibold">Target Scenario Builder</h1><p className="mt-1 text-sm text-zinc-500">Enter Your Own Price Targets And See How Owned Stocks And Options Could Change Your Portfolio By Each Milestone Date.</p></div>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric icon={CircleDollarSign} label="Current Portfolio" value={money2(currentValue)}/>
      <Metric icon={Target} label="Selected Target" value={money(selectedTarget.target)} accent/>
      <Metric icon={TrendingUp} label="Profit Needed" value={money(baseGap)} />
      <Metric icon={TrendingUp} label="Projected Profit" value={`${totalProjectedProfit>=0?"+":""}${money2(totalProjectedProfit)}`} good={totalProjectedProfit>=0}/>
      <Metric icon={Flag} label="Projected Portfolio" value={money2(projectedValue)} accent={projectedValue>=selectedTarget.target}/>
      <Metric icon={CalendarDays} label="Remaining Gap" value={money(remainingGap)} subtle={`${baseGap?Math.min(100,Math.max(0,totalProjectedProfit/baseGap*100)).toFixed(1):100}% Covered`}/>
      <Metric icon={CircleDollarSign} label="New Capital Required" value={money2(totalInvestment)}/>
    </div>

    <Card className="overflow-hidden">
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold">Build Your Price-Target Scenarios</h2>
            <p className="mt-2 text-xs text-zinc-500">Available Cash: <span className="font-medium text-white">{money2(availableCash)}</span></p>
            {cashError&&<p className="mt-2 text-sm font-medium text-red-400">{cashError}</p>}
          </div>
          <label className="w-full lg:w-auto lg:min-w-56">
            <span className="mb-2 block text-xs font-medium tracking-wider text-zinc-500">Target Date</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-blue-300"/>
              <select value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} className="h-11 w-full appearance-none rounded-xl border border-blue-400/25 bg-blue-400/[.07] pl-10 pr-10 text-sm font-medium text-blue-100 outline-none transition focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/15">{rows.map(r=><option key={r.date} value={r.date}>{r.date}</option>)}</select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-300">▼</span>
            </div>
          </label>
        </div>
      </div>
      <div className="-mx-px overflow-x-auto overscroll-x-contain pb-1"><table className="w-full min-w-[1580px] text-sm"><thead className="bg-white/[.035] text-left text-xs tracking-wider text-zinc-500"><tr><th className="px-4 py-3">Use In Target Path</th><th className="px-4 py-3">Position</th><th className="px-4 py-3">Owned</th><th className="px-4 py-3">Average Cost</th><th className="px-4 py-3">Current Price</th><th className="px-4 py-3">Your Target Price</th><th className="px-4 py-3">Expected Return</th><th className="px-4 py-3">New Buy Price</th><th className="px-4 py-3">Buy More</th><th className="px-4 py-3">New Investment</th><th className="px-4 py-3">Profit At Target</th><th className="px-4 py-3">Target Gap Covered</th></tr></thead><tbody>{details.map(d=><tr key={d.k} className="border-t border-white/[.06]"><td className="px-4 py-3"><label className="inline-flex cursor-pointer items-center gap-2"><input type="checkbox" checked={Boolean(selectedPathPositions[d.k])} onChange={()=>togglePathPosition(d.k)} className="size-4 rounded border-white/20 bg-zinc-950 accent-emerald-500"/><span className={cn("text-xs font-medium",selectedPathPositions[d.k]?"text-emerald-300":"text-zinc-500")}>{selectedPathPositions[d.k]?"Selected":"Select"}</span></label></td><td className="px-4 py-3"><div className="font-medium">{positionLabel(d.h)}</div></td><td className="px-4 py-3">{d.ownedQty.toLocaleString()} {d.h.assetType==="option"?"Contracts":"Shares"}</td><td className="px-4 py-3">{money2(d.h.averageCost)}</td><td className="px-4 py-3">{money2(d.h.currentPrice)}</td><td className="px-4 py-3"><div className="relative w-28"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-300">$</span><input type="text" inputMode="decimal" value={targetPriceInputs[d.k] ?? ((scenarios[d.k]?.targetPrice ?? 0) === 0 ? "" : Number(scenarios[d.k]?.targetPrice).toFixed(2))} onChange={e=>{const value=e.target.value;if(/^\d*(?:\.\d{0,2})?$/.test(value)){setTargetPriceInputs(prev=>({...prev,[d.k]:value}));update(d.k,{targetPrice:value===""?0:Number(value)},d.h);}}} onBlur={()=>setTargetPriceInputs(prev=>{const next={...prev};const value=next[d.k];if(value!==undefined&&value!==""){next[d.k]=Number(value).toFixed(2);}return next;})} className="h-9 w-full rounded-lg border border-blue-400/20 bg-blue-400/[.06] pl-7 pr-3 text-blue-200 outline-none"/></div></td><td className={cn("px-4 py-3 font-medium",d.expectedReturn>=0?"text-emerald-400":"text-red-400")}>{d.expectedReturn>=0?"+":""}{pct(d.expectedReturn)}</td><td className="px-4 py-3"><div className="relative w-28"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-300">$</span><input type="text" inputMode="decimal" value={newBuyPriceInputs[d.k] ?? ((scenarios[d.k]?.newBuyPrice ?? 0) === 0 ? "" : Number(scenarios[d.k]?.newBuyPrice).toFixed(2))} onChange={e=>{const value=e.target.value;if(/^\d*(?:\.\d{0,2})?$/.test(value)){const nextPrice=value===""?0:Number(value);const nextInvestment=Math.max(0,d.s.additionalQty)*nextPrice*d.multiplier;const otherInvestment=totalInvestment-d.investment;if(otherInvestment+nextInvestment>availableCash+0.005){setCashError("Not Enough Cash");return;}setCashError(null);setNewBuyPriceInputs(prev=>({...prev,[d.k]:value}));update(d.k,{newBuyPrice:nextPrice},d.h);}}} onBlur={()=>setNewBuyPriceInputs(prev=>{const next={...prev};const value=next[d.k];if(value!==undefined&&value!==""){next[d.k]=Number(value).toFixed(2);}return next;})} className="h-9 w-full rounded-lg border border-blue-400/20 bg-blue-400/[.06] pl-7 pr-3 text-blue-200 outline-none"/></div></td><td className="px-4 py-3"><input type="number" min="0" step="1" value={scenarios[d.k]?.additionalQty || ""} onChange={e=>updateAdditionalQty(d,e.target.value===""?0:Number(e.target.value))} className="h-9 w-28 rounded-lg border border-blue-400/20 bg-blue-400/[.06] px-3 text-blue-200 outline-none"/></td><td className="px-4 py-3">{money2(d.investment)}</td><td className={cn("px-4 py-3 font-medium",d.totalProfit>=0?"text-emerald-400":"text-red-400")}>{d.totalProfit>=0?"+":""}{money2(d.totalProfit)}</td><td className="px-4 py-3">{pct(d.gapCovered)}</td></tr>)}</tbody></table></div>
    </Card>

    <Card className="overflow-hidden">
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Your Path To The Target</h2>
            <p className="mt-1 text-sm text-zinc-500">Only Positions You Select In Build Your Price-Target Scenarios Are Included. Selected Positions With A Your Target Price Are Combined Into One Cash Pool, Then Reinvested Step By Step Before The Target Date.</p>
          </div>
          <button onClick={addReinvestmentStep} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-medium text-emerald-300 transition hover:bg-emerald-400/15"><Plus size={16}/>Add Reinvestment Step</button>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <PathMetric label="Positions Selected" value={String(sellSelections.length)} />
          <PathMetric label="Starting Cash Pool" value={money2(startingCashPool)} accent />
          <PathMetric label="Profit From Steps" value={`${pathwayProfit>=0?"+":""}${money2(pathwayProfit)}`} accent={pathwayProfit>0} />
          <PathMetric label="Remaining Gap After Steps" value={money2(pathwayGap)} />
        </div>

        {sellSelections.length===0?<div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-8 text-center"><div className="text-sm font-medium text-zinc-300">Select At Least One Position And Enter Its Your Target Price To Start Building The Pathway</div><div className="mt-2 text-xs text-zinc-500">You Can Keep Target Prices Filled For Every Position, Then Choose Only The Positions You Want Included In This Target Path.</div></div>:<>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[.04] p-4">
            <div className="mb-4 flex items-center justify-between gap-3"><div><div className="text-xs font-semibold tracking-wider text-amber-300">STEP 1 · SELL SELECTED POSITIONS</div><div className="mt-1 text-sm text-zinc-400">Estimated Cash Available From Your Available Cash And Selling Every Selected Position At Your Target Price</div></div><div className="text-right"><div className="text-xs text-zinc-500">Combined Cash</div><div className="text-xl font-semibold text-amber-300">{money2(startingCashPool)}</div></div></div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{sellSelections.map(d=><div key={d.k} className="rounded-xl border border-white/[.07] bg-zinc-950/50 p-3"><div className="flex items-start justify-between gap-3"><div><div className="font-medium">{positionLabel(d.h)}</div><div className="mt-1 text-xs text-zinc-500">Sell {d.ownedQty.toLocaleString()} {d.h.assetType==="option"?"Contracts":"Shares"} At {money2(d.s.targetPrice)}</div></div><div className="text-right text-sm font-semibold text-amber-200">{money2(d.saleProceeds)}</div></div></div>)}</div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max items-stretch gap-3">
              <div className="flex w-72 shrink-0 flex-col justify-between rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-400/[.08] to-transparent p-4 shadow-[0_0_28px_rgba(251,191,36,0.05)]">
                <div><div className="text-xs font-semibold tracking-wider text-amber-300">STARTING CASH POOL</div><div className="mt-3 text-2xl font-semibold">{money2(startingCashPool)}</div><div className="mt-2 text-xs leading-5 text-zinc-500">{money2(availableCash)} Available Cash + {money2(totalSaleProceeds)} From {sellSelections.length} Selected Position{sellSelections.length===1?"":"s"}</div></div>
                <div className="mt-5 text-xs text-zinc-500">Target Completion: <span className="text-zinc-300">{selectedTarget.date}</span></div>
              </div>

              {pathwayValues.map((step,index)=><div key={step.id} className="flex items-center gap-3">
                <ArrowRight className="size-5 shrink-0 text-emerald-400"/>
                <div className="w-72 shrink-0 rounded-2xl border border-emerald-400/20 bg-gradient-to-b from-emerald-400/[.07] to-transparent p-4 shadow-[0_0_28px_rgba(52,211,153,0.04)]">
                  <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold tracking-wider text-emerald-300">STEP {index+2} · REINVEST</div><div className="mt-1 text-xs text-zinc-500">Invest {money2(step.startValue)}</div></div><button onClick={()=>removeReinvestmentStep(step.id)} className="grid size-8 place-items-center rounded-lg border border-white/10 text-zinc-500 transition hover:border-red-400/30 hover:text-red-300" aria-label="Remove Reinvestment Step"><Trash2 size={14}/></button></div>
                  <label className="mt-4 block"><span className="mb-1.5 block text-xs text-zinc-500">Ticker Or Investment</span><input value={step.ticker} onChange={e=>updateReinvestmentStep(step.id,{ticker:e.target.value.toUpperCase()})} placeholder="NVDA Or New Ticker" className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm outline-none focus:border-emerald-400/40"/></label>
                  <div className="mt-3 grid grid-cols-2 gap-2"><label><span className="mb-1.5 block text-xs text-zinc-500">Target Return</span><div className="relative"><input type="number" step="0.1" value={step.returnPct??""} onChange={e=>updateReinvestmentStep(step.id,{returnPct:e.target.value===""?null:Number(e.target.value)})} className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 pr-7 text-sm outline-none focus:border-emerald-400/40"/><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">%</span></div></label><label><span className="mb-1.5 block text-xs text-zinc-500">By Date</span><input type="date" max={Number.isNaN(targetDateValue.getTime())?undefined:targetDateValue.toISOString().slice(0,10)} value={step.date} onChange={e=>updateReinvestmentStep(step.id,{date:e.target.value})} className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-xs outline-none focus:border-emerald-400/40"/></label></div>
                  <div className="mt-4 rounded-xl bg-emerald-400/[.06] p-3"><div className="text-xs text-zinc-500">Estimated Value After Step</div><div className="mt-1 text-lg font-semibold text-emerald-300">{money2(step.endValue)}</div><div className="mt-1 text-xs text-zinc-500">{step.ticker||"Choose Any Ticker"} · Profit {step.endValue-step.startValue>=0?"+":""}{money2(step.endValue-step.startValue)}</div></div>
                </div>
              </div>)}

              <div className="flex items-center gap-3">
                <ArrowRight className="size-5 shrink-0 text-violet-400"/>
                <div className={cn("flex w-72 shrink-0 flex-col justify-between rounded-2xl border p-4",pathwayFinalValue>=selectedTarget.target?"border-emerald-400/30 bg-emerald-400/[.06]":"border-violet-400/25 bg-violet-400/[.06]")}>
                  <div><div className="text-xs font-semibold tracking-wider text-violet-300">FINAL TARGET</div><div className="mt-3 text-sm text-zinc-400">Remaining Gap Before Steps · Required By {selectedTarget.date}</div><div className="mt-1 text-2xl font-semibold text-violet-200">{money2(remainingGapBeforeSteps)}</div></div>
                  <div className="mt-5"><div className="text-xs text-zinc-500">Profit From All Steps</div><div className={cn("mt-1 text-lg font-semibold",pathwayProfit>=0?"text-emerald-300":"text-red-300")}>{pathwayProfit>=0?"+":""}{money2(pathwayProfit)}</div><div className="mt-3 text-xs text-zinc-500">Remaining After Steps</div><div className={cn("mt-1 text-base font-semibold",pathwayGap===0?"text-emerald-300":"text-white")}>{money2(pathwayGap)}</div><div className="mt-1 text-xs text-zinc-500">{pathwayGap===0?"Target Reached In This Scenario":`${money2(pathwayGap)} Still Needed`}</div></div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-400/15 bg-blue-400/[.04] p-4 text-sm text-zinc-400"><span className="font-medium text-blue-200">How This Path Works:</span> The First Step assumes every position you selected for the target path, with a target price entered, is fully sold at that price. The sale proceeds are added to your remaining available cash, then each reinvestment step compounds the entire cash pool using the return you enter. Reinvestment dates are limited to the selected Target Date. This is a planning scenario, not a market prediction.</div>
        </>}
      </div>
    </Card>

  </div>;
}

function PathMetric({label,value,accent=false}:{label:string;value:string;accent?:boolean}){return <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-3"><div className="text-xs text-zinc-500">{label}</div><div className={cn("mt-2 text-lg font-semibold",accent&&"text-emerald-300")}>{value}</div></div>}

function Metric({icon:Icon,label,value,subtle,accent=false,good=false}:{icon:any;label:string;value:string;subtle?:string;accent?:boolean;good?:boolean}){return <Card className="min-w-0 p-3 sm:p-4"><div className="flex min-w-0 items-center gap-2 text-xs text-zinc-500"><span className={cn("grid size-8 place-items-center rounded-lg",accent||good?"bg-emerald-400/15 text-emerald-400":"bg-blue-400/15 text-blue-300")}><Icon size={16}/></span>{label}</div><div className={cn("mt-3 break-words text-lg font-semibold sm:text-xl",(accent||good)&&"text-emerald-400")}>{value}</div>{subtle&&<div className="mt-1 text-xs text-zinc-500">{subtle}</div>}</Card>}