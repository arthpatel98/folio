"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CircleDollarSign, Flag, MinusCircle, Plus, Target, Trash2, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useActivePortfolio } from "@/components/portfolio/portfolio-context";
import { usePortfolioStore } from "@/store/portfolio-store";
import { cn } from "@/lib/utils";
import { optionCollateral } from "@/lib/calculations/portfolio";
import type { Holding } from "@/types/portfolio";
import { PORTFOLIO_ID_SCHEMA_VERSION } from "@/lib/portfolio-id-migration";

const ROBINHOOD_TARGETS = [
  ["Aug 31, 2026",112000,0],["Oct 31, 2026",129360,17360],["Dec 31, 2026",150881,21521],["Feb 28, 2027",175508,24627],["Apr 30, 2027",203728,28220],["Jun 30, 2027",236094,32366],["Aug 31, 2027",273248,37154],["Oct 31, 2027",315932,42684],["Dec 31, 2027",365000,49068],
] as const;
const ROTH_TARGETS = [
  ["Aug 31, 2026",21000,0],["Oct 31, 2026",24675,3675],["Dec 31, 2026",31084,6409],["Feb 28, 2027",38250,7166],["Apr 30, 2027",46304,8054],["Jun 30, 2027",55400,9096],["Aug 31, 2027",65617,10217],["Oct 31, 2027",77119,11502],["Dec 31, 2027",90941,13822],
] as const;

type Scenario = { targetPrice: number; newBuyPrice: number; additionalQty: number; gapShare: number };
type ReinvestmentStep = {
  id: string;
  ticker: string;
  investmentAmount: number | null;
  returnPct: number | null;
  date: string;
  allocationPct?: number | null; // Legacy percentage-based saved steps.
  source?: "cash" | "previous";
  parentId?: string | null;
};
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
  const isRoth=activeId==="fidelity-roth";
  const is401k=activeId==="fidelity-401k";
  const selectedHoldings=useMemo(()=>isRobinhood?holdingsByPortfolio.robinhood:isRoth?holdingsByPortfolio["fidelity-roth"]:[...holdingsByPortfolio.robinhood,...holdingsByPortfolio["fidelity-roth"]],[holdingsByPortfolio,isRobinhood,isRoth]);
  const selectedCash=isRobinhood?cashByPortfolio.robinhood:isRoth?cashByPortfolio["fidelity-roth"]:cashByPortfolio.robinhood+cashByPortfolio["fidelity-roth"];
  const rows=useMemo(()=>isRobinhood?ROBINHOOD_TARGETS.map(([date,target,increase])=>({date,target,increase})):isRoth?ROTH_TARGETS.map(([date,target,increase])=>({date,target,increase})):ROBINHOOD_TARGETS.map(([date,target,increase],i)=>({date,target:target+ROTH_TARGETS[i][1],increase:increase+ROTH_TARGETS[i][2]})),[isRobinhood,isRoth]);
  const [selectedDate,setSelectedDate]=useState<string>(rows[0].date);
  const [scenariosByDate,setScenariosByDate]=useState<Record<string,Record<string,Scenario>>>({});
  const [cashError,setCashError]=useState<string | null>(null);
  const [targetPriceInputs,setTargetPriceInputs]=useState<Record<string,string>>({});
  const [newBuyPriceInputs,setNewBuyPriceInputs]=useState<Record<string,string>>({});
  const [reinvestmentStepsByDate,setReinvestmentStepsByDate]=useState<Record<string,ReinvestmentStep[]>>({});
  const [selectedPathPositionsByDate,setSelectedPathPositionsByDate]=useState<Record<string,Record<string,boolean>>>({});
  const storageKey=`folio-target-scenarios-by-date:${activeId}`;
  const pathwayStorageKey=`folio-target-pathway-by-date:${activeId}`;
  const pathwaySelectionStorageKey=`folio-target-pathway-selection-by-date:${activeId}`;
  const targetDateStorageKey=`folio-target-date:${activeId}`;
  useEffect(()=>{
    const migrationKey="folio-target-portfolio-id-schema-version";
    if(localStorage.getItem(migrationKey)!==String(PORTFOLIO_ID_SCHEMA_VERSION)){
      const prefixes=["folio-target-scenarios:","folio-target-pathway:","folio-target-pathway-selection:","folio-target-date:","folio-target-date-default-aug-2026:","folio-target-scenarios-by-date:","folio-target-pathway-by-date:","folio-target-pathway-selection-by-date:"];
      prefixes.forEach((prefix)=>{
        const old401k=localStorage.getItem(`${prefix}fidelity-401k`);
        const oldRoth=localStorage.getItem(`${prefix}fidelity-roth`);
        if(oldRoth!==null)localStorage.setItem(`${prefix}fidelity-401k`,oldRoth);else localStorage.removeItem(`${prefix}fidelity-401k`);
        if(old401k!==null)localStorage.setItem(`${prefix}fidelity-roth`,old401k);else localStorage.removeItem(`${prefix}fidelity-roth`);
      });
      localStorage.setItem(migrationKey,String(PORTFOLIO_ID_SCHEMA_VERSION));
    }
  },[]);
  useEffect(()=>{
    const savedDate=localStorage.getItem(targetDateStorageKey);
    const validSavedDate=savedDate&&rows.some(r=>r.date===savedDate)?savedDate:null;
    const defaultDate=rows[0].date;
    const defaultVersionKey=`folio-target-date-default-aug-2026:${activeId}`;
    const needsDefaultMigration=(isRobinhood||isRoth)&&localStorage.getItem(defaultVersionKey)!=="1";
    const initialDate=needsDefaultMigration?defaultDate:(validSavedDate??defaultDate);
    if(needsDefaultMigration){
      localStorage.setItem(targetDateStorageKey,defaultDate);
      localStorage.setItem(defaultVersionKey,"1");
    }
    setSelectedDate(initialDate);

    const readObject=(key:string)=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;}catch{return null;}};
    const oldScenarios=readObject(`folio-target-scenarios:${activeId}`);
    const oldSteps=readObject(`folio-target-pathway:${activeId}`);
    const oldSelections=readObject(`folio-target-pathway-selection:${activeId}`);
    const savedScenarios=readObject(storageKey);
    const savedSteps=readObject(pathwayStorageKey);
    const savedSelections=readObject(pathwaySelectionStorageKey);
    setScenariosByDate(savedScenarios??(oldScenarios?{[initialDate]:oldScenarios}:{}));
    setReinvestmentStepsByDate(savedSteps??(Array.isArray(oldSteps)?{[initialDate]:oldSteps}:{}));
    setSelectedPathPositionsByDate(savedSelections??(oldSelections?{[initialDate]:oldSelections}:{}));
    setTargetPriceInputs({});
    setNewBuyPriceInputs({});
  },[activeId,isRobinhood,isRoth,storageKey,pathwayStorageKey,pathwaySelectionStorageKey,targetDateStorageKey,rows]);
  useEffect(()=>{if(selectedDate)localStorage.setItem(targetDateStorageKey,selectedDate)},[targetDateStorageKey,selectedDate]);
  useEffect(()=>{localStorage.setItem(storageKey,JSON.stringify(scenariosByDate))},[storageKey,scenariosByDate]);
  useEffect(()=>{localStorage.setItem(pathwayStorageKey,JSON.stringify(reinvestmentStepsByDate))},[pathwayStorageKey,reinvestmentStepsByDate]);
  useEffect(()=>{localStorage.setItem(pathwaySelectionStorageKey,JSON.stringify(selectedPathPositionsByDate))},[pathwaySelectionStorageKey,selectedPathPositionsByDate]);
  useEffect(()=>{setTargetPriceInputs({});setNewBuyPriceInputs({});setCashError(null)},[selectedDate]);

  const scenarios=scenariosByDate[selectedDate]??{};
  const reinvestmentSteps=reinvestmentStepsByDate[selectedDate]??[];
  const selectedPathPositions=selectedPathPositionsByDate[selectedDate]??{};

  if(is401k){
    return <div className="space-y-6">
      <div><h1 className="text-3xl font-semibold">Target Scenario Builder</h1><p className="mt-1 text-sm text-zinc-500">A focused planning space for each portfolio.</p></div>
      <Card className="overflow-hidden">
        <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
          <div className="grid size-16 place-items-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-400 shadow-sm dark:border-white/10 dark:bg-white/[.03] dark:text-zinc-500"><MinusCircle size={30}/></div>
          <div className="mt-6 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium tracking-wide text-zinc-500 dark:border-white/10 dark:bg-white/[.03]">401(K) · LONG-TERM PLAN</div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">No Target Needed</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">This 401(k) portfolio is intentionally kept outside the Target Scenario Builder. Keep contributing, let the long-term allocation work, and use Robinhood or Fidelity Roth IRA when you want to model a specific portfolio target.</p>
        </div>
      </Card>
    </div>;
  }

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
  const totalInvestment=finite(details.reduce((s,d)=>s+finite(d.investment),0));
  const remainingAvailableCash=Math.max(0,finite(availableCash-totalInvestment));
  const scenarioProjectedValue=finite(currentValue+scenarioProfit);
  const scenarioRemainingGap=Math.max(0,finite(selectedTarget.target-scenarioProjectedValue));
  const remainingGapBeforeSteps=scenarioRemainingGap;
  const sellSelections=details.filter(d=>d.s.targetPrice>0&&selectedPathPositions[d.k]).map(d=>({
    ...d,
    saleProceeds:d.s.targetPrice*d.ownedQty*d.multiplier,
  }));
  const totalSaleProceeds=sellSelections.reduce((sum,d)=>sum+d.saleProceeds,0);
  const startingCashPool=finite(totalSaleProceeds+remainingAvailableCash);
  type PathwayValue = ReinvestmentStep & {availableCash:number;investedValue:number;remainingCash:number;stepProfit:number;endingValue:number;fundingLabel:string};
  const resultById=new Map<string,PathwayValue>();
  let startingCashAllocated=0;
  const pathwayValues:PathwayValue[]=reinvestmentSteps.map((step)=>{
    const parent=step.parentId?resultById.get(step.parentId):undefined;
    const siblingAllocated=step.parentId?reinvestmentSteps
      .filter(candidate=>candidate.parentId===step.parentId&&candidate.id!==step.id)
      .reduce((sum,candidate)=>{
        const prior=resultById.get(candidate.id);
        return sum+(prior?.investedValue??0);
      },0):0;
    const availableCash=parent
      ? Math.max(0,parent.endingValue-siblingAllocated)
      : Math.max(0,startingCashPool-startingCashAllocated);
    const requestedInvestment=typeof step.investmentAmount==="number"&&Number.isFinite(step.investmentAmount)?Math.max(0,step.investmentAmount):0;
    const investedValue=Math.min(availableCash,requestedInvestment);
    const returnPct=typeof step.returnPct==="number"&&Number.isFinite(step.returnPct)?step.returnPct:0;
    const remainingCash=Math.max(0,availableCash-investedValue);
    const stepProfit=investedValue*(returnPct/100);
    const endingValue=investedValue+stepProfit;
    if(!parent)startingCashAllocated+=investedValue;
    const fundingLabel=parent?`${parent.ticker||"Investment"} proceeds`:"Starting Cash";
    const result={...step,availableCash,investedValue,remainingCash,stepProfit,endingValue,fundingLabel};
    resultById.set(step.id,result);
    return result;
  });
  const stageOneValues=pathwayValues.filter(step=>!step.parentId);
  const pathwayAllocated=finite(stageOneValues.reduce((sum,step)=>sum+step.investedValue,0));
  const pathwayProfit=finite(pathwayValues.reduce((sum,step)=>sum+step.stepProfit,0));
  const pathwayRemainingCash=Math.max(0,startingCashPool-pathwayAllocated);
  const pathwayFinalValue=finite(startingCashPool+pathwayProfit);
  const totalProjectedProfit=finite(scenarioProfit+pathwayProfit);
  const projectedValue=finite(currentValue+totalProjectedProfit);
  // Match the Portfolio Performance formulas, but substitute the projected portfolio value.
  const projectedMonthFraction=(new Date().getMonth())/12;
  const projectedYtd=isRobinhood
    ? projectedValue/83745-1
    : isRoth
      ? projectedValue/16452-1
      : 0;
  const projectedInvested=isRobinhood?74500:isRoth?19000:0;
  const projectedCagrYears=(isRoth?1.0833:2)+projectedMonthFraction;
  const projectedCagr=projectedInvested>0&&projectedValue>0
    ? Math.pow(projectedValue/projectedInvested,1/projectedCagrYears)-1
    : 0;
  const projectedPerformance=(isRobinhood||isRoth)
    ? {ytd:projectedYtd*100,cagr:projectedCagr*100}
    : undefined;
  const pathwayGap=Math.max(0,finite(selectedTarget.target-projectedValue));
  const remainingGap=pathwayGap;
  const requiredReturnOnRemainingCash=pathwayRemainingCash>0?(pathwayGap/pathwayRemainingCash)*100:0;
  const targetDateValue=new Date(selectedTarget.date);
  const update=(k:string,patch:Partial<Scenario>,h:Holding)=>setScenariosByDate(prev=>{
    const dateScenarios=prev[selectedDate]??{};
    const base=dateScenarios[k] ?? { targetPrice:0, newBuyPrice:0, additionalQty:0, gapShare:25 };
    return {...prev,[selectedDate]:{...dateScenarios,[k]:{...base,...patch}}};
  });
  const addReinvestmentStep=()=>setReinvestmentStepsByDate(prev=>{const current=prev[selectedDate]??[];return {...prev,[selectedDate]:[...current,{id:`step-${Date.now()}-${current.length}`,ticker:"",investmentAmount:null,returnPct:null,date:"",source:"cash"}]}});
  const updateReinvestmentStep=(id:string,patch:Partial<ReinvestmentStep>)=>setReinvestmentStepsByDate(prev=>({...prev,[selectedDate]:(prev[selectedDate]??[]).map(step=>step.id===id?{...step,...patch}:step)}));
  const removeReinvestmentStep=(id:string)=>setReinvestmentStepsByDate(prev=>({...prev,[selectedDate]:(prev[selectedDate]??[]).filter(step=>step.id!==id)}));
  const addChildInvestment=(parentId:string)=>setReinvestmentStepsByDate(prev=>{const current=prev[selectedDate]??[];const parentIndex=current.findIndex(step=>step.id===parentId);if(parentIndex<0)return prev;const child={id:`step-${Date.now()}-${current.length}`,ticker:"",investmentAmount:null,returnPct:null,date:"",source:"previous" as const,parentId};const next=[...current];let insertAt=parentIndex+1;while(insertAt<next.length&&next[insertAt].parentId===parentId)insertAt++;next.splice(insertAt,0,child);return {...prev,[selectedDate]:next};});
  const togglePathPosition=(key:string)=>setSelectedPathPositionsByDate(prev=>{const current=prev[selectedDate]??{};return {...prev,[selectedDate]:{...current,[key]:!current[key]}}});
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
      <Metric icon={Flag} label="Projected Portfolio" value={money2(projectedValue)} performance={projectedPerformance} accent={projectedValue>=selectedTarget.target}/>
      <Metric icon={CalendarDays} label="Remaining Gap" value={money(remainingGap)} subtle={`${baseGap?Math.min(100,Math.max(0,totalProjectedProfit/baseGap*100)).toFixed(1):100}% Covered`}/>
      <Metric icon={CircleDollarSign} label="New Capital Required" value={money2(totalInvestment)}/>
    </div>

    <Card className="overflow-hidden">
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold">Build Your Price-Target Scenarios</h2>
            <p className="mt-2 text-xs text-zinc-500">Available Cash: <span className="font-medium text-white">{money2(remainingAvailableCash)}</span></p>
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
      <div className="-mx-px overflow-x-auto overscroll-x-contain pb-1"><table className="w-full min-w-[1180px] text-sm"><thead className="bg-white/[.035] text-left text-xs tracking-wider text-zinc-500"><tr><th className="px-4 py-3">Use In Target Path</th><th className="px-4 py-3">Position</th><th className="px-4 py-3">Owned</th><th className="px-4 py-3">Average Cost</th><th className="px-4 py-3">Current Price</th><th className="px-4 py-3">Your Target Price</th><th className="px-4 py-3">Expected Return</th><th className="px-4 py-3">Profit At Target</th><th className="px-4 py-3">Target Gap Covered</th></tr></thead><tbody>{details.map(d=><tr key={d.k} className="border-t border-white/[.06]"><td className="px-4 py-3"><label className="inline-flex cursor-pointer items-center gap-2"><input type="checkbox" checked={Boolean(selectedPathPositions[d.k])} onChange={()=>togglePathPosition(d.k)} className="size-4 rounded border-white/20 bg-zinc-950 accent-emerald-500"/><span className={cn("text-xs font-medium",selectedPathPositions[d.k]?"text-emerald-300":"text-zinc-500")}>{selectedPathPositions[d.k]?"Selected":"Select"}</span></label></td><td className="px-4 py-3"><div className="font-medium">{positionLabel(d.h)}</div></td><td className="px-4 py-3">{d.ownedQty.toLocaleString()} {d.h.assetType==="option"?"Contracts":"Shares"}</td><td className="px-4 py-3">{money2(d.h.averageCost)}</td><td className="px-4 py-3">{money2(d.h.currentPrice)}</td><td className="px-4 py-3"><div className="relative w-28"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-300">$</span><input type="text" inputMode="decimal" value={targetPriceInputs[d.k] ?? ((scenarios[d.k]?.targetPrice ?? 0) === 0 ? "" : Number(scenarios[d.k]?.targetPrice).toFixed(2))} onChange={e=>{const value=e.target.value;if(/^\d*(?:\.\d{0,2})?$/.test(value)){setTargetPriceInputs(prev=>({...prev,[d.k]:value}));update(d.k,{targetPrice:value===""?0:Number(value)},d.h);}}} onBlur={()=>setTargetPriceInputs(prev=>{const next={...prev};const value=next[d.k];if(value!==undefined&&value!==""){next[d.k]=Number(value).toFixed(2);}return next;})} className="h-9 w-full rounded-lg border border-blue-400/20 bg-blue-400/[.06] pl-7 pr-3 text-blue-200 outline-none"/></div></td><td className={cn("px-4 py-3 font-medium",d.expectedReturn>=0?"text-emerald-400":"text-red-400")}>{d.expectedReturn>=0?"+":""}{pct(d.expectedReturn)}</td><td className={cn("px-4 py-3 font-medium",d.totalProfit>=0?"text-emerald-400":"text-red-400")}>{d.totalProfit>=0?"+":""}{money2(d.totalProfit)}</td><td className="px-4 py-3">{pct(d.gapCovered)}</td></tr>)}</tbody></table></div>
    </Card>

    <Card className="overflow-hidden">
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Your Path To The Target</h2>
            <p className="mt-1 max-w-4xl text-sm text-zinc-500">Allocate your cash across multiple investment ideas. Create independent investments from starting cash, then use Reinvest Proceeds to build Stage 2 and later investments funded by a prior investment's expected ending value.</p>
          </div>
          <button type="button" onClick={addReinvestmentStep} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-medium text-emerald-300 transition hover:bg-emerald-400/15"><Plus size={16}/>Add Investment</button>
        </div>
      </div>
      <div className="space-y-5 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <PathMetric label="Starting Cash" value={money2(startingCashPool)} accent />
          <PathMetric label="Total Allocated" value={money2(pathwayAllocated)} />
          <PathMetric label="Remaining Cash" value={money2(pathwayRemainingCash)} />
          <PathMetric label="Expected Profit" value={`${pathwayProfit>0?"+":""}${money2(pathwayProfit)}`} accent={pathwayProfit>0} />
          <PathMetric label="Expected Ending Value" value={money2(pathwayFinalValue)} accent />
          <PathMetric label="Remaining Target Gap" value={money2(pathwayGap)} />
        </div>

        <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4">
          <div className="flex items-center justify-between gap-4 text-sm"><span className="font-medium">Cash Allocation</span><span className="text-zinc-400">{startingCashPool>0?Math.min(100,pathwayAllocated/startingCashPool*100).toFixed(1):"0.0"}% planned</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-emerald-400/70 transition-all" style={{width:`${startingCashPool>0?Math.min(100,pathwayAllocated/startingCashPool*100):0}%`}}/></div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-zinc-500"><span>{money2(pathwayAllocated)} allocated</span><span>{money2(pathwayRemainingCash)} unallocated</span></div>
        </div>

        {sellSelections.length>0&&<div className="rounded-2xl border border-amber-400/20 bg-amber-400/[.04] p-4">
          <div className="text-xs font-semibold tracking-wider text-amber-300">OPTIONAL CASH FROM SELECTED POSITIONS</div>
          <div className="mt-1 text-sm text-zinc-400">Your starting pool includes {money2(remainingAvailableCash)} available cash plus {money2(totalSaleProceeds)} estimated proceeds from {sellSelections.length} selected position{sellSelections.length===1?"":"s"}.</div>
        </div>}

        {reinvestmentSteps.length===0?<div className="rounded-2xl border border-dashed border-white/10 p-8 text-center"><div className="text-sm font-medium text-zinc-300">No investments planned yet</div><div className="mt-1 text-xs text-zinc-500">Add investments to divide your cash across tickers and dates.</div></div>:
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pathwayValues.map((step,index)=><div key={step.id} className="rounded-2xl border border-emerald-400/20 bg-gradient-to-b from-emerald-400/[.07] to-transparent p-4">
            <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold tracking-wider text-emerald-300">INVESTMENT {index+1}</div><div className="mt-1 text-xs text-zinc-500">Funding Source: <span className={step.parentId?"text-violet-300":"text-zinc-300"}>{step.fundingLabel}</span></div><div className="mt-1 text-xs text-zinc-500">Available to invest: {money2(step.availableCash)}</div></div><button onClick={()=>removeReinvestmentStep(step.id)} className="grid size-8 place-items-center rounded-lg border border-white/10 text-zinc-500 hover:border-red-400/30 hover:text-red-300" aria-label="Remove Investment"><Trash2 size={14}/></button></div>
            <label className="mt-4 block"><span className="mb-1.5 block text-xs text-zinc-500">Ticker Or Investment</span><input value={step.ticker} onChange={e=>updateReinvestmentStep(step.id,{ticker:e.target.value.toUpperCase()})} placeholder="NVDA, AMZN, DCA..." className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm outline-none focus:border-emerald-400/40"/></label>
            <div className="mt-3 grid grid-cols-2 gap-2"><label><span className="mb-1.5 block text-xs text-zinc-500">Investment Amount</span><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-emerald-300">$</span><input type="number" min="0" max={step.availableCash} step="0.01" value={step.investmentAmount??""} placeholder="0.00" onChange={e=>updateReinvestmentStep(step.id,{investmentAmount:e.target.value===""?null:Math.min(step.availableCash,Math.max(0,Number(e.target.value)))})} className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 pl-7 pr-3 text-sm outline-none focus:border-emerald-400/40"/></div></label><label><span className="mb-1.5 block text-xs text-zinc-500">Expected Return</span><div className="relative"><input type="number" step="0.1" value={step.returnPct??""} placeholder="0" onChange={e=>updateReinvestmentStep(step.id,{returnPct:e.target.value===""?null:Number(e.target.value)})} className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 pr-7 text-sm outline-none focus:border-emerald-400/40"/><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">%</span></div></label></div>
            <label className="mt-3 block"><span className="mb-1.5 block text-xs text-zinc-500">Exit / Target Date</span><input type="date" max={Number.isNaN(targetDateValue.getTime())?undefined:targetDateValue.toISOString().slice(0,10)} value={step.date} onChange={e=>updateReinvestmentStep(step.id,{date:e.target.value})} className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-xs outline-none focus:border-emerald-400/40"/></label>
            <div className="mt-4 rounded-xl bg-emerald-400/[.06] p-3">
              <div className="flex justify-between gap-3 text-xs text-zinc-500"><span>Expected Profit</span><span className={step.stepProfit>=0?"text-emerald-300":"text-red-300"}>{step.stepProfit>=0?"+":""}{money2(step.stepProfit)}</span></div>
              <div className="mt-2 flex justify-between gap-3 text-xs text-zinc-500"><span>Expected Investment Value</span><span className="text-zinc-200">{money2(step.endingValue)}</span></div>
              <div className="mt-2 flex justify-between gap-3 text-xs text-zinc-500"><span>Cash Remaining After Allocation</span><span className="text-zinc-200">{money2(step.remainingCash)}</span></div>
            </div>
            <button type="button" onClick={()=>addChildInvestment(step.id)} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[.06] text-xs font-medium text-violet-300 transition hover:bg-violet-400/[.1]"><Plus size={14}/>Reinvest Proceeds</button>
          </div>)}
        </div>}

        <div className="grid gap-4">
          <div className="rounded-2xl border border-violet-400/20 bg-violet-400/[.05] p-4">
            <div className="text-xs font-semibold tracking-wider text-violet-300">TARGET CHECK</div>
            <div className="mt-3 grid grid-cols-2 gap-4"><div><div className="text-xs text-zinc-500">Profit From Cash Plan</div><div className="mt-1 text-lg font-semibold text-emerald-300">{pathwayProfit>=0?"+":""}{money2(pathwayProfit)}</div></div><div><div className="text-xs text-zinc-500">Remaining Gap</div><div className="mt-1 text-lg font-semibold">{money2(pathwayGap)}</div></div></div>
            <div className="mt-4 text-xs text-zinc-500">{pathwayGap===0?"Target reached in this scenario.":`The plan still needs ${money2(pathwayGap)} of additional profit.`}</div>
          </div>
        </div>

      </div>
    </Card>

  </div>;
}

function PathMetric({label,value,accent=false}:{label:string;value:string;accent?:boolean}){return <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-3"><div className="text-xs text-zinc-500">{label}</div><div className={cn("mt-2 text-lg font-semibold",accent&&"text-emerald-300")}>{value}</div></div>}

function Metric({icon:Icon,label,value,subtle,performance,accent=false,good=false}:{icon:any;label:string;value:string;subtle?:string;performance?:{ytd:number;cagr:number};accent?:boolean;good?:boolean}){return <Card className="min-w-0 p-3 sm:p-4"><div className="flex min-w-0 items-center gap-2 text-xs text-zinc-500"><span className={cn("grid size-8 place-items-center rounded-lg",accent||good?"bg-emerald-400/15 text-emerald-400":"bg-blue-400/15 text-blue-300")}><Icon size={16}/></span>{label}</div><div className={cn("mt-3 break-words text-lg font-semibold sm:text-xl",(accent||good)&&"text-emerald-400")}>{value}</div>{performance&&<div className="mt-3 flex flex-wrap gap-2"><span className={cn("rounded-lg border px-2 py-1 text-[11px] font-semibold",performance.ytd>=0?"border-emerald-400/20 bg-emerald-400/[.08] text-emerald-300":"border-rose-400/20 bg-rose-400/[.08] text-rose-300")}>YTD {performance.ytd>=0?"+":""}{performance.ytd.toFixed(2)}%</span><span className={cn("rounded-lg border px-2 py-1 text-[11px] font-semibold",performance.cagr>=0?"border-blue-400/20 bg-blue-400/[.08] text-blue-300":"border-rose-400/20 bg-rose-400/[.08] text-rose-300")}>CAGR {performance.cagr>=0?"+":""}{performance.cagr.toFixed(2)}%</span></div>}{subtle&&<div className="mt-1 text-xs text-zinc-500">{subtle}</div>}</Card>}