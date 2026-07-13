"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { cn, money } from "@/lib/utils";
import { DcaLot, DcaPosition, NumericValue } from "@/lib/dca-data";
import { DCA_UPDATED_EVENT, loadDcaPositions, saveDcaPositions, upsertDcaPosition } from "@/lib/dca-storage";

const toNumber = (value: NumericValue) => value === "" || !Number.isFinite(Number(value)) ? 0 : Number(value);
const parseNumericInput = (value: string): NumericValue => value === "" ? "" : Number(value);
const pct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
const clonePosition = (position: DcaPosition): DcaPosition => ({ ...position, lots: position.lots.map((lot) => ({ ...lot })) });

export default function DcaPage() {
  const [positions, setPositions] = useState<DcaPosition[]>([]);
  const [positionId, setPositionId] = useState("");
  const [lots, setLots] = useState<DcaLot[]>([]);
  const [sellPrice, setSellPrice] = useState<NumericValue>("");
  const [savedMessage, setSavedMessage] = useState("");
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newSellPrice, setNewSellPrice] = useState<NumericValue>("");
  const [newShares, setNewShares] = useState<NumericValue>("");
  const [newBuyPrice, setNewBuyPrice] = useState<NumericValue>("");
  const [newBuyDate, setNewBuyDate] = useState("");

  const loadAll = (preferredId?: string) => {
    const next = loadDcaPositions();
    setPositions(next);
    const id = preferredId && next.some((position) => position.id === preferredId)
      ? preferredId
      : positionId && next.some((position) => position.id === positionId)
        ? positionId
        : next[0]?.id ?? "";
    const selected = next.find((position) => position.id === id);
    setPositionId(id);
    if (selected) {
      const copy = clonePosition(selected);
      setLots(copy.lots);
      setSellPrice(copy.sellPrice);
    }
  };

  useEffect(() => {
    loadAll();
    const refresh = () => loadAll();
    window.addEventListener(DCA_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(DCA_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPosition = positions.find((position) => position.id === positionId);

  const load = (id: string) => {
    const position = positions.find((item) => item.id === id);
    if (!position) return;
    const copy = clonePosition(position);
    setPositionId(id);
    setLots(copy.lots);
    setSellPrice(copy.sellPrice);
    setSavedMessage("");
  };

  const totals = useMemo(() => {
    const amount = lots.reduce((sum, lot) => sum + lot.amount, 0);
    const shares = lots.reduce((sum, lot) => sum + toNumber(lot.shares), 0);
    const target = toNumber(sellPrice);
    const avg = shares ? amount / shares : 0;
    const value = shares * target;
    const profit = value - amount;
    const roi = amount ? profit / amount * 100 : 0;
    const existing = lots.filter((lot) => !lot.future);
    const future = lots.filter((lot) => lot.future);
    const oldAmount = existing.reduce((sum, lot) => sum + lot.amount, 0);
    const oldShares = existing.reduce((sum, lot) => sum + toNumber(lot.shares), 0);
    const oldAvg = oldShares ? oldAmount / oldShares : 0;
    return { amount, shares, avg, value, profit, roi, oldAvg, futureAmount: future.reduce((sum, lot) => sum + lot.amount, 0) };
  }, [lots, sellPrice]);

  const update = (index: number, key: keyof DcaLot, value: string) => setLots((previous) => previous.map((lot, lotIndex) => {
    if (lotIndex !== index) return lot;
    if (key === "date" || key === "note") return { ...lot, [key]: value };
    const numeric = parseNumericInput(value);
    const next = { ...lot, [key]: numeric };
    const shares = key === "shares" ? toNumber(numeric) : toNumber(next.shares);
    const price = key === "price" ? toNumber(numeric) : toNumber(next.price);
    return { ...next, amount: shares * price };
  }));

  const addExisting = () => setLots((previous) => [...previous, { amount: 0, shares: "", price: "", date: "", future: false }]);
  const addFuture = () => setLots((previous) => [...previous, { amount: 0, shares: "", price: "", date: "", future: true }]);

  const savePurchaseLots = () => {
    if (!selectedPosition) return;
    const cleanedLots = lots.filter((lot) => toNumber(lot.shares) > 0 && toNumber(lot.price) > 0 && Boolean(lot.date));
    const updated: DcaPosition = { ...selectedPosition, sellPrice, lots: cleanedLots.map((lot) => ({ ...lot, amount: toNumber(lot.shares) * toNumber(lot.price) })) };
    upsertDcaPosition(updated);
    setLots(updated.lots.map((lot) => ({ ...lot })));
    setSavedMessage("Purchase Lots Saved");
    window.setTimeout(() => setSavedMessage(""), 1800);
  };

  const resetPosition = () => load(positionId);

  const addPosition = () => {
    const symbol = newSymbol.trim().toUpperCase();
    const shares = toNumber(newShares);
    const buyPrice = toNumber(newBuyPrice);
    if (!symbol || shares <= 0 || buyPrice <= 0 || !newBuyDate) return;
    const position: DcaPosition = {
      id: `CUSTOM-${symbol}-${Date.now()}`,
      symbol,
      label: symbol,
      sellPrice: newSellPrice,
      custom: true,
      lots: [{ amount: shares * buyPrice, shares, price: buyPrice, date: newBuyDate, future: false }],
    };
    const next = [...loadDcaPositions(), position];
    saveDcaPositions(next);
    setPositions(next);
    load(position.id);
    setNewSymbol(""); setNewSellPrice(""); setNewShares(""); setNewBuyPrice(""); setNewBuyDate("");
    setShowAddPosition(false);
    loadAll(position.id);
  };

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="text-3xl font-semibold tracking-tight">DCA Calculator</h1><p className="mt-1 text-sm text-zinc-500">Track Existing Purchase Lots And Test How A Future Purchase Changes Your Average Cost And Potential Return.</p></div>
      <button onClick={() => setShowAddPosition(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-300"><Plus size={16}/>Add Position</button>
    </div>

    {showAddPosition && <section className="rounded-2xl border border-white/10 bg-zinc-950/50 p-5">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Add Position</h2><button aria-label="Close Add Position" onClick={() => setShowAddPosition(false)} className="rounded-lg p-2 text-zinc-500 hover:bg-white/[.05] hover:text-white"><X size={17}/></button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-2 text-sm font-medium text-zinc-300">Ticker Symbol<input value={newSymbol} onChange={(event) => setNewSymbol(event.target.value.toUpperCase())} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 uppercase outline-none"/></label>
        <label className="space-y-2 text-sm font-medium text-zinc-300">Potential Sell Price<input type="number" step="any" value={newSellPrice} onChange={(event) => setNewSellPrice(parseNumericInput(event.target.value))} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 outline-none"/></label>
        <label className="space-y-2 text-sm font-medium text-zinc-300">Shares<input type="number" step="any" value={newShares} onChange={(event) => setNewShares(parseNumericInput(event.target.value))} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 outline-none"/></label>
        <label className="space-y-2 text-sm font-medium text-zinc-300">Buy Price<input type="number" step="any" value={newBuyPrice} onChange={(event) => setNewBuyPrice(parseNumericInput(event.target.value))} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 outline-none"/></label>
        <label className="space-y-2 text-sm font-medium text-zinc-300">Buy Date<input type="date" value={newBuyDate} onChange={(event) => setNewBuyDate(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 outline-none"/></label>
      </div>
      <div className="mt-5 flex justify-end"><button onClick={addPosition} disabled={!newSymbol.trim() || toNumber(newShares) <= 0 || toNumber(newBuyPrice) <= 0 || !newBuyDate} className="h-10 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-40">Add Position</button></div>
    </section>}

    <section className="rounded-2xl border border-white/10 bg-zinc-950/35 p-5 lg:p-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div><label className="mb-2 block text-sm font-medium text-zinc-300">Position</label><select value={positionId} onChange={(event) => load(event.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-zinc-950/70 px-4 text-sm outline-none">{positions.map((position) => <option key={position.id} value={position.id}>{position.label ?? position.symbol}</option>)}</select></div>
        <div><label className="mb-2 block text-sm font-medium text-zinc-300">Potential Sell Price</label><input type="number" step="any" value={sellPrice} onChange={(event) => setSellPrice(parseNumericInput(event.target.value))} className="h-12 w-full rounded-xl border border-white/10 bg-black/15 px-4 text-lg font-semibold outline-none"/></div>
        <div className="flex gap-2"><button onClick={resetPosition} className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm"><RotateCcw size={16}/>Reset Position</button><button onClick={savePurchaseLots} className="inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-zinc-950"><Save size={16}/>Save Purchase Lots</button></div>
      </div>
      {savedMessage && <p className="mt-3 text-sm text-emerald-400">{savedMessage}</p>}
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {[["Total Investment", totals.amount ? money(totals.amount) : "—"], ["Total Shares", totals.shares ? totals.shares.toLocaleString(undefined, { maximumFractionDigits: 5 }) : "—"], ["New Average", totals.avg ? money(totals.avg) : "—"], [totals.profit >= 0 ? "Potential Profit" : "Potential Loss", totals.amount ? `${totals.profit < 0 ? "-" : ""}${money(Math.abs(totals.profit))}` : "—"], ["Potential Return", totals.amount ? pct(totals.roi) : "—"]].map(([label, value], index) => <div key={label} className={cn("rounded-2xl border border-white/10 bg-zinc-950/35 p-5", index >= 3 && (totals.profit >= 0 ? "border-emerald-500/35 bg-emerald-500/[.06]" : "border-rose-500/35 bg-rose-500/[.06]"))}><p className="text-sm text-zinc-500">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p></div>)}
    </div>

    <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/35">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-semibold">Purchase Lots</h2><p className="mt-1 text-sm text-zinc-500">Holdings Purchases Are Added Automatically. Stock Sales Remove The Oldest Shares First Using FIFO.</p></div><div className="flex gap-2"><button onClick={addExisting} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold"><Plus size={16}/>Add Existing Purchase</button><button onClick={addFuture} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-zinc-950"><Plus size={16}/>Add Future Purchase</button></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-white/[.025] text-left text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-5 py-3">Type</th><th className="px-4 py-3">Shares</th><th className="px-4 py-3">Buy Price</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Buy Date</th><th className="px-4 py-3">P/L At Target</th><th className="px-4 py-3">Return</th><th></th></tr></thead><tbody>{lots.map((lot, index) => { const shares = toNumber(lot.shares), price = toNumber(lot.price), profit = shares * (toNumber(sellPrice) - price), returnPct = lot.amount ? profit / lot.amount * 100 : 0; return <tr key={index} className={cn("border-t border-white/10", lot.future && "bg-emerald-500/[.04]")}><td className="px-5 py-3"><span>{lot.future ? "Future DCA" : "Existing"}</span>{lot.note && <p className="mt-1 text-xs text-zinc-500">{lot.note}</p>}</td><td className="px-4 py-3"><input type="number" step="any" value={lot.shares} onChange={(event) => update(index, "shares", event.target.value)} className="w-28 rounded-lg border border-white/10 bg-black/20 px-3 py-2"/></td><td className="px-4 py-3"><input type="number" step="any" value={lot.price} onChange={(event) => update(index, "price", event.target.value)} className="w-28 rounded-lg border border-white/10 bg-black/20 px-3 py-2"/></td><td className="px-4 py-3">{lot.amount ? money(lot.amount) : "—"}</td><td className="px-4 py-3"><input type="date" value={lot.date.includes("-") ? lot.date : ""} onChange={(event) => update(index, "date", event.target.value)} className="w-40 rounded-lg border border-white/10 bg-black/20 px-3 py-2"/></td><td className="px-4 py-3">{lot.amount ? money(profit) : "—"}</td><td className="px-4 py-3">{lot.amount ? pct(returnPct) : "—"}</td><td className="px-4 py-3"><button aria-label="Remove Purchase Lot" onClick={() => setLots((previous) => previous.filter((_, lotIndex) => lotIndex !== index))} className="rounded-lg p-2 text-zinc-500 hover:text-rose-400"><Trash2 size={16}/></button></td></tr>; })}</tbody></table></div>
    </section>

    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-zinc-950/35 p-5"><h2 className="font-semibold">Before Vs. After DCA</h2><div className="mt-5 flex items-center justify-between"><div><p className="text-sm text-zinc-500">Existing Average</p><p className="mt-1 text-xl font-semibold">{totals.oldAvg ? money(totals.oldAvg) : "—"}</p></div><ArrowDownRight/><div className="text-right"><p className="text-sm text-zinc-500">New Average</p><p className="mt-1 text-xl font-semibold">{totals.avg ? money(totals.avg) : "—"}</p></div></div></section>
      <section className="rounded-2xl border border-white/10 bg-zinc-950/35 p-5"><h2 className="flex items-center gap-2 font-semibold">{totals.profit >= 0 ? <ArrowUpRight size={18}/> : <ArrowDownRight size={18}/>}Scenario Insight</h2><p className="mt-4 text-sm leading-6 text-zinc-300">{totals.amount && toNumber(sellPrice) > 0 ? <>At A Sell Price Of <strong>{money(toNumber(sellPrice))}</strong>, This Position Would Be Worth <strong>{money(totals.value)}</strong> With A {totals.profit >= 0 ? "Profit" : "Loss"} Of <strong>{money(Math.abs(totals.profit))}</strong>.</> : "Enter Position And Purchase-Lot Data To Calculate The Scenario."}</p></section>
    </div>
  </div>;
}
