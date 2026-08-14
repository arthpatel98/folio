"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { FormEvent, useMemo, useState } from "react";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePortfolioStore, type DataPortfolioId } from "@/store/portfolio-store";
import { toast } from "sonner";
import { AssetType, Holding, OptionType, Sector } from "@/types/portfolio";
import { getStockTaxLots, type StockTaxLot, type TaxLotMethod } from "@/lib/dca-storage";
import { cn, money } from "@/lib/utils";

const NEW_POSITION = "__new_position__";

const optionContractKey = (holding: Holding) => holding.optionSymbol || [holding.symbol, holding.optionType ?? "option", holding.optionExpiry ?? "", holding.optionStrike ?? "", holding.company].join("|");

const sectors: Sector[] = [
  "AI / Enterprise Software", "AI Data Centers", "Cloud / AI / Software", "Crypto / Bitcoin",
  "Digital Advertising / AI", "Drones", "Space", "Defense", "BioTech", "E-Commerce & Cloud",
  "Education Technology", "Electrical Equipment / Power Infrastructure", "ETF",
  "Ethereum / Crypto Treasury", "Financials", "Healthcare", "Memory Semiconductors",
  "Mobility / Delivery", "Physical AI", "Inverse ETF/ Hedge", "Other", "Semiconductors", "Utilities / Energy",
];

const optionTypes: { value: OptionType; label: string }[] = [
  { value: "buy-call", label: "Buy Call" },
  { value: "sell-call", label: "Sell Call" },
  { value: "buy-put", label: "Buy Put" },
  { value: "sell-put", label: "Sell Put" },
];

type FormState = {
  action: "buy" | "sell";
  assetType: AssetType;
  symbol: string;
  company: string;
  quantity: string;
  tradePrice: string;
  sector: "" | Sector;
  optionType: OptionType;
  optionExpiry: string;
  tradeDate: string;
  platformFees: string;
  selectedContractKey: string;
};

const todayInputValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

const formatTradeDate = (value: string) => {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayText = date.toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC" });
  const monthText = date.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  return `${dayText} ${monthText}, ${year}`;
};

const createInitialForm = (action: "buy" | "sell" = "buy", assetType: AssetType = "stock"): FormState => ({
  action, assetType, symbol: "", company: "", quantity: "", tradePrice: "", sector: "",
  optionType: "buy-call", optionExpiry: "", tradeDate: todayInputValue(), platformFees: "0.00", selectedContractKey: "",
});

export function AddHoldingDialog() {
  const holdings = usePortfolioStore((state) => state.holdings);
  const executeTrade = usePortfolioStore((state) => state.executeTrade);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => createInitialForm());
  const [stockSelection, setStockSelection] = useState(NEW_POSITION);
  const [error, setError] = useState("");
  const activePortfolioId = usePortfolioStore((state) => state.activePortfolioId);
  const [taxLotMethod,setTaxLotMethod]=useState<TaxLotMethod>("fifo");
  const [customTaxLots,setCustomTaxLots]=useState<Record<string,string>>({});

  const ownedStocks = useMemo(() => holdings
    .filter((holding) => (holding.assetType ?? "stock") === "stock" && holding.shares > 0)
    .slice().sort((a, b) => a.symbol.localeCompare(b.symbol)), [holdings]);
  const ownedOptions = useMemo(() => holdings
    .filter((holding) => holding.assetType === "option" && holding.shares !== 0)
    .slice().sort((a, b) => a.company.localeCompare(b.company)), [holdings]);

  const matching = useMemo(() => {
    if (form.assetType === "option" && form.action === "buy") return undefined;
    if (form.assetType === "option") return holdings.find((holding) => holding.assetType === "option" && optionContractKey(holding) === form.selectedContractKey);
    return holdings.find((holding) => (holding.assetType ?? "stock") === "stock"
      && holding.symbol.toUpperCase() === form.symbol.trim().toUpperCase());
  }, [form.action, form.assetType, form.selectedContractKey, form.symbol, holdings]);

  const stockTaxLots = useMemo<StockTaxLot[]>(() => {
    if (form.action !== "sell" || form.assetType !== "stock" || !form.symbol || activePortfolioId === "all") return [];
    return getStockTaxLots(activePortfolioId as DataPortfolioId, form.symbol);
  }, [activePortfolioId, form.action, form.assetType, form.symbol]);

  const saleQuantity = Math.max(0, Number(form.quantity) || 0);
  const salePrice = Math.max(0, Number(form.tradePrice) || 0);
  const autoLotAllocation = useMemo(() => {
    const lots=stockTaxLots.slice();
    if(taxLotMethod==="lifo")lots.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
    else if(taxLotMethod==="highest-cost")lots.sort((a,b)=>b.price-a.price||Date.parse(a.date)-Date.parse(b.date));
    else lots.sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
    let remaining=saleQuantity;
    const allocation:Record<string,number>={};
    if(taxLotMethod==="custom"){
      stockTaxLots.forEach(lot=>allocation[lot.id]=Math.max(0,Math.min(lot.shares,Number(customTaxLots[lot.id])||0)));
      return allocation;
    }
    lots.forEach(lot=>{const qty=Math.min(lot.shares,remaining);if(qty>0)allocation[lot.id]=qty;remaining-=qty;});
    return allocation;
  },[customTaxLots,saleQuantity,stockTaxLots,taxLotMethod]);

  const selectedTaxLotShares=Object.values(autoLotAllocation).reduce((sum,value)=>sum+value,0);
  const selectedTaxLotCost=stockTaxLots.reduce((sum,lot)=>sum+(autoLotAllocation[lot.id]||0)*lot.price,0);
  const selectedTaxLotProceeds=selectedTaxLotShares*salePrice;
  const selectedTaxLotGain=selectedTaxLotProceeds-selectedTaxLotCost;

  const resetForSelection = (field: "action" | "assetType", value: string) => {
    setError("");
    const next = createInitialForm(
      field === "action" ? value as "buy" | "sell" : form.action,
      field === "assetType" ? value as AssetType : form.assetType,
    );
    setForm(next);
    setStockSelection(NEW_POSITION);
    setTaxLotMethod("fifo");
    setCustomTaxLots({});
  };

  const update = (field: keyof FormState, value: string) => {
    if(field==="symbol"){setTaxLotMethod("fifo");setCustomTaxLots({});}
    setForm((current) => {
      const next = { ...current, [field]: field === "symbol" ? value.toUpperCase() : value } as FormState;
      if (field === "symbol") {
        const found = current.assetType === "option" && current.action === "buy" ? undefined : holdings.find((holding) =>
          (holding.assetType ?? "stock") === current.assetType && holding.symbol.toUpperCase() === value.trim().toUpperCase());
        if (found) {
          next.company = found.company;
          next.sector = found.sector;
          next.optionType = found.optionType ?? current.optionType;
          next.optionExpiry = found.optionExpiry ?? "";
        } else {
          next.company = "";
          next.sector = "";
          next.optionType = "buy-call";
          next.optionExpiry = "";
        }
      }
      return next;
    });
  };

  const selectOptionContract = (value: string) => {
    const found = ownedOptions.find((holding) => optionContractKey(holding) === value);
    setForm((current) => found ? {
      ...current,
      selectedContractKey: value,
      symbol: found.symbol,
      company: found.company,
      sector: found.sector,
      optionType: found.optionType ?? current.optionType,
      optionExpiry: found.optionExpiry ?? "",
    } : { ...current, selectedContractKey: "", symbol: "", company: "", optionExpiry: "" });
  };

  const selectBuyStock = (value: string) => {
    setStockSelection(value);
    if (value === NEW_POSITION) update("symbol", "");
    else update("symbol", value);
  };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const symbol = form.symbol.trim().toUpperCase();
    const quantity = Number(form.quantity);
    const tradePrice = Number(form.tradePrice);
    const platformFees = Number(form.platformFees || 0);
    const isOption = form.assetType === "option";
    const isRemoveStock = form.action === "sell" && form.assetType === "stock";
    const isRemoveOption = form.action === "sell" && form.assetType === "option";
    const company = (matching?.company ?? form.company).trim();
    const sector = matching?.sector ?? form.sector;

    if (!symbol) return setError("Ticker Symbol Is Required.");
    if (isRemoveStock && !matching) return setError("Select A Stock You Currently Own.");
    if (isRemoveOption && !matching) return setError("Select An Option Contract You Currently Own.");
    if (!isRemoveStock && !company) return setError(isOption ? "Contract Details Are Required." : "Company Name Is Required.");
    if (!Number.isFinite(quantity) || quantity === 0) return setError(isOption ? "Enter A Valid Contract Quantity." : "Enter A Valid Share Quantity.");
    if (!isOption && quantity < 0) return setError("Enter A Valid Share Quantity.");
    if (isOption && form.action === "buy") {
      const isShortOption = form.optionType === "sell-call" || form.optionType === "sell-put";
      if (isShortOption && quantity > 0) return setError("Sell Call And Sell Put Contracts Must Be Negative.");
      if (!isShortOption && quantity < 0) return setError("Buy Call And Buy Put Contracts Must Be Positive.");
    }
    if (!Number.isFinite(platformFees) || platformFees < 0) return setError("Enter A Valid Platform Fee.");
    if (!form.tradeDate) return setError("Trade Date Is Required.");
    if (!Number.isFinite(tradePrice) || tradePrice < 0 || (!isRemoveOption && tradePrice === 0)) return setError(isOption ? (isRemoveOption ? "Enter A Valid Sell Price." : "Contract Cost Is Required.") : (isRemoveStock ? "Sell Price Is Required." : "Share Price Is Required."));
    if (!matching && !sector) return setError("Select Sector Is Required.");
    if (isOption && form.action === "buy" && !form.optionExpiry) return setError("Option Expiry Is Required.");
    if (isRemoveStock && stockTaxLots.length > 0 && selectedTaxLotShares + 1e-6 < quantity) return setError("Simulator Tax Lots Do Not Contain Enough Shares For This Sale.");
    if (isRemoveStock && taxLotMethod === "custom" && Math.abs(selectedTaxLotShares - quantity) > 1e-6) return setError("Custom Tax-Lot Shares Must Exactly Match The Shares Being Sold.");

    const optionQuantity = isRemoveOption
      ? ((matching?.shares ?? 0) > 0 ? -Math.abs(quantity) : Math.abs(quantity))
      : (isOption && (form.optionType === "sell-call" || form.optionType === "sell-put") ? -Math.abs(quantity) : Math.abs(quantity));
    const result = executeTrade({
      action: form.action,
      quantity: optionQuantity,
      price: tradePrice,
      tradeDate: form.tradeDate,
      fees: platformFees,
      taxLotMethod: isRemoveStock && stockTaxLots.length > 0 ? taxLotMethod : undefined,
      customTaxLots: isRemoveStock && taxLotMethod === "custom"
        ? Object.fromEntries(Object.entries(customTaxLots).map(([id,value])=>[id,Math.max(0,Number(value)||0)]))
        : undefined,
      holding: {
        assetType: form.assetType, symbol, company, shares: quantity, averageCost: tradePrice,
        currentPrice: matching?.currentPrice ?? tradePrice, previousClose: matching?.previousClose ?? tradePrice,
        dividendYield: matching?.dividendYield ?? 0, sector: sector as Sector,
        optionType: isOption ? (matching?.optionType ?? form.optionType) : undefined,
        optionExpiry: isOption ? (matching?.optionExpiry ?? form.optionExpiry) : undefined,
        optionStrike: matching?.optionStrike, optionSymbol: matching?.optionSymbol, updatedAt: "Just now",
      },
    });

    if (!result.ok) return setError(result.message ?? "Unable To Update The Position.");
    toast.success(form.action === "buy" ? "Position Added Successfully" : "Position Removed Successfully");
    setForm(createInitialForm());
    setStockSelection(NEW_POSITION);
    setTaxLotMethod("fifo");
    setCustomTaxLots({});
    setOpen(false);
  }

  const isRemoveStock = form.action === "sell" && form.assetType === "stock";
  const isRemoveOption = form.action === "sell" && form.assetType === "option";
  const isNewStock = form.assetType === "stock" && form.action === "buy" && stockSelection === NEW_POSITION;

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) { setForm(createInitialForm()); setStockSelection(NEW_POSITION); setTaxLotMethod("fifo"); setCustomTaxLots({}); setError(""); }
    }}>
      <Dialog.Trigger asChild><Button aria-label="Update Position" title="Update Position" className="size-10 rounded-lg p-0"><Pencil size={17} /></Button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 text-zinc-900 shadow-2xl dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100">
          <div className="flex items-start justify-between gap-4">
            <div><Dialog.Title className="text-xl font-semibold text-zinc-950 dark:text-white">Update Position</Dialog.Title><Dialog.Description className="mt-1 text-sm text-zinc-400">Add Or Remove A Stock Or Option Position.</Dialog.Description></div>
            <Dialog.Close className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"><X size={18} /></Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2">
            <Field label="Position Type">
              <select required value={form.assetType} onChange={(e) => resetForSelection("assetType", e.target.value)} className="field-select">
                <option value="stock">Stock</option><option value="option">Option</option>
              </select>
            </Field>
            <Field label="Activity">
              <select required value={form.action} onChange={(e) => resetForSelection("action", e.target.value)} className="field-select">
                {form.assetType === "option" ? <><option value="buy">Add</option><option value="sell">Remove</option></> : <><option value="buy">Buy</option><option value="sell">Sell</option></>}
              </select>
            </Field>

            {isRemoveStock ? <>
              <Field label="Ticker Symbol"><select required value={form.symbol} onChange={(e) => update("symbol", e.target.value)} className="field-select" autoFocus><option value="">Select Ticker</option>{ownedStocks.map((holding) => <option key={holding.symbol} value={holding.symbol}>{holding.symbol}</option>)}</select></Field>
              <Field label="Sell Shares"><Input required type="number" min="0.000001" step="any" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} /></Field>
              <Field label="Sell Price"><Input required type="number" min="0.000001" step="any" value={form.tradePrice} onChange={(e) => update("tradePrice", e.target.value)} /></Field>
              <DateField label="Sell Date" value={form.tradeDate} onChange={(value) => update("tradeDate", value)} />
              <MoneyField label="Platform Fees" value={form.platformFees} onChange={(value) => update("platformFees", value)} />
              <div className="sm:col-span-2">
                {stockTaxLots.length>0?<div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[.04] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div><div className="text-sm font-semibold">Tax Lot Selection</div><div className="mt-1 text-xs font-normal text-zinc-500">Uses the purchase lots saved on Return Simulator for {form.symbol}.</div></div>
                    <label className="block min-w-44"><span className="mb-1.5 block text-xs font-medium text-zinc-500">Sell Method</span><select value={taxLotMethod} onChange={e=>{setTaxLotMethod(e.target.value as TaxLotMethod);setCustomTaxLots({});}} className="field-select"><option value="fifo">FIFO · Oldest First</option><option value="lifo">LIFO · Newest First</option><option value="custom">Custom Lots</option></select></label>
                  </div>
                  <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/10">
                    <table className="min-w-full text-xs">
                      <thead className="bg-zinc-50 text-zinc-500 dark:bg-white/[.035]"><tr><th className="px-3 py-2 text-left">Buy Date</th><th className="px-3 py-2 text-right">Available</th><th className="px-3 py-2 text-right">Cost</th><th className="px-3 py-2 text-right">Gain / Loss</th><th className="px-3 py-2 text-right">Term</th><th className="px-3 py-2 text-right">Sell Shares</th></tr></thead>
                      <tbody>{stockTaxLots.slice().sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)).map(lot=>{
                        const selected=autoLotAllocation[lot.id]||0;
                        const gain=(salePrice-lot.price)*selected;
                        const buy=new Date(`${lot.date}T12:00:00`);
                        const sell=new Date(`${form.tradeDate}T12:00:00`);
                        const oneYearLater=new Date(buy);oneYearLater.setFullYear(oneYearLater.getFullYear()+1);
                        const term=!Number.isNaN(buy.getTime())&&!Number.isNaN(sell.getTime())&&sell.getTime()>oneYearLater.getTime()?"Long":"Short";
                        return <tr key={lot.id} className={cn("border-t border-zinc-200 dark:border-white/10",selected>0&&"bg-emerald-500/[.04]")}><td className="whitespace-nowrap px-3 py-2">{formatTradeDate(lot.date)}</td><td className="px-3 py-2 text-right">{lot.shares.toLocaleString(undefined,{maximumFractionDigits:6})}</td><td className="px-3 py-2 text-right">{money(lot.price)}</td><td className={cn("px-3 py-2 text-right font-medium",gain>0?"text-emerald-500":gain<0?"text-rose-500":"text-zinc-500")}>{selected>0?`${gain>=0?"+":""}${money(gain)}`:"—"}</td><td className="px-3 py-2 text-right"><span className={cn("rounded-md px-1.5 py-0.5",term==="Long"?"bg-emerald-500/10 text-emerald-500":"bg-amber-500/10 text-amber-500")}>{term}</span></td><td className="px-3 py-2 text-right">{taxLotMethod==="custom"?<input type="number" min="0" max={lot.shares} step="any" value={customTaxLots[lot.id]??""} onChange={e=>{const raw=e.target.value;const next=raw===""?"":String(Math.max(0,Math.min(lot.shares,Number(raw)||0)));setCustomTaxLots(current=>({...current,[lot.id]:next}));}} placeholder="0" className="h-8 w-24 rounded-lg border border-zinc-200 bg-white px-2 text-right outline-none dark:border-white/10 dark:bg-zinc-950"/>:<span className={cn("font-semibold",selected>0?"text-emerald-500":"text-zinc-500")}>{selected?selected.toLocaleString(undefined,{maximumFractionDigits:6}):"—"}</span>}</td></tr>
                      })}</tbody>
                    </table>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-4">
                    <TaxLotMetric label="Shares Selected" value={`${selectedTaxLotShares.toLocaleString(undefined,{maximumFractionDigits:6})} / ${saleQuantity.toLocaleString(undefined,{maximumFractionDigits:6})}`} />
                    <TaxLotMetric label="Cost Basis" value={money(selectedTaxLotCost)} />
                    <TaxLotMetric label="Sale Proceeds" value={money(selectedTaxLotProceeds)} />
                    <TaxLotMetric label="Est. Realized P/L" value={`${selectedTaxLotGain>=0?"+":""}${money(selectedTaxLotGain)}`} tone={selectedTaxLotGain>=0?"good":"bad"} />
                  </div>
                  {taxLotMethod==="custom"&&Math.abs(selectedTaxLotShares-saleQuantity)>1e-6&&<p className="mt-3 text-xs font-medium text-amber-500">Select exactly {saleQuantity.toLocaleString(undefined,{maximumFractionDigits:6})} shares across the lots above. Currently selected: {selectedTaxLotShares.toLocaleString(undefined,{maximumFractionDigits:6})}.</p>}
                </div>:form.symbol&&<div className="rounded-xl border border-amber-500/20 bg-amber-500/[.05] p-3 text-xs font-normal text-amber-600 dark:text-amber-300">No Return Simulator tax lots were found for {form.symbol}. This sale will use the position average cost for realized P/L.</div>}
              </div>
            </> : isRemoveOption ? <>
              <Field label="Contract Details"><select required value={form.selectedContractKey} onChange={(e) => selectOptionContract(e.target.value)} className="field-select" autoFocus><option value="">Select Contract</option>{ownedOptions.map((holding) => <option key={optionContractKey(holding)} value={optionContractKey(holding)}>{holding.company}</option>)}</select></Field>
              <Field label="Contracts"><Input required type="number" min="1" step="1" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} /></Field>
              <Field label="Sell Price"><Input required type="number" min="0" step="any" value={form.tradePrice} onChange={(e) => update("tradePrice", e.target.value)} /></Field>
              <MoneyField label="Platform Fees" value={form.platformFees} onChange={(value) => update("platformFees", value)} />
            </> : form.assetType === "stock" ? <>
              <Field label="Select Position"><select required value={stockSelection} onChange={(e) => selectBuyStock(e.target.value)} className="field-select" autoFocus><option value={NEW_POSITION}>New Position</option>{ownedStocks.map((holding) => <option key={holding.symbol} value={holding.symbol}>{holding.symbol}</option>)}</select></Field>
              {isNewStock ? <Field label="New Position Ticker"><Input required value={form.symbol} onChange={(e) => update("symbol", e.target.value)} className="uppercase" /></Field> : <Field label="Position Status"><div className="flex h-10 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm dark:border-white/10 dark:bg-white/[.03]"><span className="text-emerald-400">Existing Shares - {matching?.shares ?? 0}</span></div></Field>}
              {!matching && <Field label="Company Name"><Input required value={form.company} onChange={(e) => update("company", e.target.value)} /></Field>}
              <Field label="Shares"><Input required type="number" min="0.000001" step="any" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} /></Field>
              <Field label="Share Price"><Input required type="number" min="0.000001" step="any" value={form.tradePrice} onChange={(e) => update("tradePrice", e.target.value)} /></Field>
              <DateField label="Buy Date" value={form.tradeDate} onChange={(value) => update("tradeDate", value)} />
              {!matching && <SectorField value={form.sector} onChange={(value) => update("sector", value)} />}
            </> : <>
              <Field label="Underlying Ticker"><Input required value={form.symbol} onChange={(e) => update("symbol", e.target.value)} autoFocus className="uppercase" /></Field>
              <Field label="Contract Details"><Input required value={form.company} onChange={(e) => update("company", e.target.value)} /></Field>
              <Field label="Contracts"><Input required type="number" step="1" max={form.optionType === "sell-call" || form.optionType === "sell-put" ? -1 : undefined} min={form.optionType === "sell-call" || form.optionType === "sell-put" ? undefined : 1} value={form.quantity} onChange={(e) => update("quantity", e.target.value)} /></Field>
              <Field label="Contract Cost"><Input required type="number" min="0.000001" step="any" value={form.tradePrice} onChange={(e) => update("tradePrice", e.target.value)} /></Field>
              <Field label="Option Type"><select required value={form.optionType} onChange={(e) => { const nextType = e.target.value as OptionType; update("optionType", nextType); const currentQuantity = Number(form.quantity); if (Number.isFinite(currentQuantity) && currentQuantity !== 0) update("quantity", String(nextType === "sell-call" || nextType === "sell-put" ? -Math.abs(currentQuantity) : Math.abs(currentQuantity))); }} className="field-select">{optionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <DateField label="Option Expiry" value={form.optionExpiry} onChange={(value) => update("optionExpiry", value)} />
              <DateField label="Buy Date" value={form.tradeDate} onChange={(value) => update("tradeDate", value)} />
              <MoneyField label="Platform Fees" value={form.platformFees} onChange={(value) => update("platformFees", value)} />
              <SectorField value={form.sector} onChange={(value) => update("sector", value)} />
            </>}

            {error && <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 sm:col-span-2">{error}</p>}
            <div className="mt-2 flex justify-end gap-3 sm:col-span-2"><Dialog.Close asChild><Button type="button" variant="outline">Cancel</Button></Dialog.Close><Button type="submit">{form.action === "buy" ? (form.assetType === "option" ? "Add Position" : "Complete Purchase") : "Remove Position"}</Button></div>
          </form>
          <style jsx>{`.field-select{display:flex;height:2.5rem;width:100%;border-radius:.75rem;border:1px solid #e4e4e7;background:#fff;padding:0 .75rem;font-size:.875rem;color:#18181b;outline:none}.field-select option{background:#fff;color:#18181b}:global(.dark) .field-select{border-color:rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#f4f4f5}:global(.dark) .field-select option{background:#09090b;color:#f4f4f5}`}</style>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TaxLotMetric({label,value,tone}:{label:string;value:string;tone?:"good"|"bad"}) {
  return <div className="rounded-xl border border-zinc-200 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[.025]"><div className="text-[11px] font-normal text-zinc-500">{label}</div><div className={cn("mt-1 text-sm font-semibold",tone==="good"?"text-emerald-500":tone==="bad"?"text-rose-500":"text-zinc-800 dark:text-zinc-200")}>{value}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"><span>{label}</span>{children}</label>;
}
function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <Field label={label}><div className="space-y-1"><Input required type="date" value={value} onChange={(e) => onChange(e.target.value)} /><p className="text-xs font-normal text-zinc-500 dark:text-zinc-400">{formatTradeDate(value)}</p></div></Field>;
}
function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <Field label={label}><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span><Input inputMode="decimal" min="0" step="0.01" type="number" value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => onChange((Number(value || 0)).toFixed(2))} className="pl-7" /></div></Field>;
}
function SectorField({ value, onChange }: { value: "" | Sector; onChange: (value: string) => void }) {
  return <Field label="Sector"><select required value={value} onChange={(e) => onChange(e.target.value)} className="flex h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400/60 dark:border-white/10 dark:bg-white/[.03] dark:text-zinc-100"><option value="" className="bg-white dark:bg-zinc-950">Select Sector</option>{sectors.map((sector) => <option key={sector} value={sector} className="bg-white dark:bg-zinc-950">{sector}</option>)}</select></Field>;
}
