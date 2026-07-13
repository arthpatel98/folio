"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus, RotateCcw, Save, X } from "lucide-react";
import { cn, money } from "@/lib/utils";
import { DcaLot, DcaPosition, NumericValue } from "@/lib/dca-data";
import { DCA_SELECTED_POSITION_KEY, DCA_UPDATED_EVENT, loadDcaPositions, saveDcaPositions, upsertDcaPosition } from "@/lib/dca-storage";
import { useActivePortfolio } from "@/components/portfolio/portfolio-context";

const toNumber = (value: NumericValue) => value === "" || !Number.isFinite(Number(value)) ? 0 : Number(value);
const parseNumericInput = (value: string): NumericValue => value === "" ? "" : Number(value);
const pct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
const signedMoney = (value: number) => `${value >= 0 ? "+" : "-"}${money(Math.abs(value))}`;
const formatShares = (value: number) => Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const formatDate = (value: string) => {
  if (value === "Future") return "Future";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};
const clonePosition = (position: DcaPosition): DcaPosition => ({ ...position, lots: position.lots.map((lot) => ({ ...lot })) });

type LotDraft = { shares: NumericValue; price: NumericValue; date: string; future: boolean };
const emptyDraft = (future = false): LotDraft => ({ shares: "", price: "", date: "", future });

export default function DcaPage() {
  const { activeId } = useActivePortfolio();
  const [allPositions, setAllPositions] = useState<DcaPosition[]>([]);
  const [positionId, setPositionId] = useState("");
  const [lots, setLots] = useState<DcaLot[]>([]);
  const [sellPrice, setSellPrice] = useState<NumericValue>("");
  const [savedMessage, setSavedMessage] = useState("");
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [showLotForm, setShowLotForm] = useState<"existing" | "future" | null>(null);
  const [lotDraft, setLotDraft] = useState<LotDraft>(emptyDraft());
  const [newSymbol, setNewSymbol] = useState("");
  const [newSellPrice, setNewSellPrice] = useState<NumericValue>("");
  const [newShares, setNewShares] = useState<NumericValue>("");
  const [newBuyPrice, setNewBuyPrice] = useState<NumericValue>("");
  const [newBuyDate, setNewBuyDate] = useState("");

  const positions = useMemo(() => allPositions.filter((position) => activeId === "all" || position.portfolioId === activeId), [allPositions, activeId]);

  const readSavedSelection = () => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(DCA_SELECTED_POSITION_KEY) ?? "{}") as Record<string, string>;
      return saved[activeId] ?? "";
    } catch { return ""; }
  };
  const saveSelection = (id: string) => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(DCA_SELECTED_POSITION_KEY) ?? "{}") as Record<string, string>;
      saved[activeId] = id;
      window.localStorage.setItem(DCA_SELECTED_POSITION_KEY, JSON.stringify(saved));
    } catch {}
  };

  const applyPosition = (position?: DcaPosition) => {
    if (!position) { setPositionId(""); setLots([]); setSellPrice(""); return; }
    const copy = clonePosition(position);
    setPositionId(copy.id);
    setLots(copy.lots);
    setSellPrice(copy.sellPrice);
    saveSelection(copy.id);
  };

  const loadAll = (preferredId?: string) => {
    const next = loadDcaPositions();
    setAllPositions(next);
    const visible = next.filter((position) => activeId === "all" || position.portfolioId === activeId);
    const wanted = preferredId || readSavedSelection();
    const selected = visible.find((position) => position.id === wanted) ?? visible[0];
    applyPosition(selected);
  };

  useEffect(() => {
    loadAll();
    const refresh = () => loadAll(positionId);
    window.addEventListener(DCA_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener(DCA_UPDATED_EVENT, refresh); window.removeEventListener("storage", refresh); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const selectedPosition = allPositions.find((position) => position.id === positionId);
  const load = (id: string) => { applyPosition(allPositions.find((position) => position.id === id)); setSavedMessage(""); };

  const totals = useMemo(() => {
    const amount = lots.reduce((sum, lot) => sum + lot.amount, 0);
    const shares = lots.reduce((sum, lot) => sum + toNumber(lot.shares), 0);
    const target = toNumber(sellPrice);
    const avg = shares ? amount / shares : 0;
    const value = shares * target;
    const profit = value - amount;
    const roi = amount ? profit / amount * 100 : 0;
    const existing = lots.filter((lot) => !lot.future);
    const oldAmount = existing.reduce((sum, lot) => sum + lot.amount, 0);
    const oldShares = existing.reduce((sum, lot) => sum + toNumber(lot.shares), 0);
    const oldAvg = oldShares ? oldAmount / oldShares : 0;
    return { amount, shares, avg, value, profit, roi, oldAvg };
  }, [lots, sellPrice]);

  const savePosition = () => {
    if (!selectedPosition) return;
    const updated = { ...selectedPosition, sellPrice, lots: lots.map((lot) => ({ ...lot })) };
    upsertDcaPosition(updated);
    setSavedMessage("Position Saved");
    window.setTimeout(() => setSavedMessage(""), 1800);
  };

  const addLot = () => {
    const shares = toNumber(lotDraft.shares), price = toNumber(lotDraft.price);
    if (shares <= 0 || price <= 0 || !lotDraft.date) return;
    const lot: DcaLot = { amount: shares * price, shares, price, date: lotDraft.date, future: lotDraft.future };
    const nextLots = [...lots, lot];
    setLots(nextLots);
    if (selectedPosition) upsertDcaPosition({ ...selectedPosition, sellPrice, lots: nextLots });
    setLotDraft(emptyDraft()); setShowLotForm(null); setSavedMessage("Purchase Saved");
    window.setTimeout(() => setSavedMessage(""), 1800);
  };

  const addPosition = () => {
    const symbol = newSymbol.trim().toUpperCase(), shares = toNumber(newShares), buyPrice = toNumber(newBuyPrice);
    if (!symbol || shares <= 0 || buyPrice <= 0 || !newBuyDate || activeId === "all") return;
    const position: DcaPosition = {
      id: `CUSTOM-${activeId}-${symbol}-${Date.now()}`, symbol, label: symbol, sellPrice: newSellPrice, custom: true, portfolioId: activeId,
      lots: [{ amount: shares * buyPrice, shares, price: buyPrice, date: newBuyDate, future: false }],
    };
    const next = [...loadDcaPositions(), position];
    saveDcaPositions(next); setAllPositions(next); applyPosition(position);
    setNewSymbol(""); setNewSellPrice(""); setNewShares(""); setNewBuyPrice(""); setNewBuyDate(""); setShowAddPosition(false);
  };

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="text-3xl font-semibold tracking-tight">DCA Calculator</h1><p className="mt-1 text-sm text-zinc-500">Track Existing Purchase Lots And Test How A Future Purchase Changes Your Average Cost And Potential Return.</p></div>
      {activeId !== "all" && <button onClick={() => setShowAddPosition(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-300"><Plus size={16}/>Add Position</button>}
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
        <div className="flex gap-2"><button onClick={() => load(positionId)} className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm"><RotateCcw size={16}/>Reset Position</button><button onClick={savePosition} className="inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-zinc-950"><Save size={16}/>Save Position</button></div>
      </div>
      {savedMessage && <p className="mt-3 text-sm text-emerald-400">{savedMessage}</p>}
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {[ ["Total Investment", totals.amount ? money(totals.amount) : "—"], ["Total Shares", totals.shares ? formatShares(totals.shares) : "—"], ["New Average", totals.avg ? money(totals.avg) : "—"], ["Potential Return", totals.amount ? signedMoney(totals.profit) : "—"], ["Potential Return %", totals.amount ? pct(totals.roi) : "—"] ].map(([label, value], index) => <div key={label} className={cn("rounded-2xl border border-white/10 bg-zinc-950/35 p-5", index >= 3 && (totals.profit >= 0 ? "border-emerald-500/35 bg-emerald-500/[.06]" : "border-rose-500/35 bg-rose-500/[.06]"))}><p className="text-sm text-zinc-500">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p></div>)}
    </div>

    <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/35">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-semibold">Purchase Lots</h2><p className="mt-1 text-sm text-zinc-500">Saved Purchase Lots Are Read-Only. Holdings Purchases Are Added Automatically And Sales Use FIFO.</p></div><div className="flex gap-2"><button onClick={() => { setShowLotForm("existing"); setLotDraft(emptyDraft(false)); }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold"><Plus size={16}/>Add Existing Purchase</button><button onClick={() => { setShowLotForm("future"); setLotDraft(emptyDraft(true)); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-zinc-950"><Plus size={16}/>Add Future Purchase</button></div></div>
      {showLotForm && <div className="grid gap-4 border-b border-white/10 p-5 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        <label className="space-y-2 text-sm font-medium text-zinc-300">Shares<input type="number" step="any" value={lotDraft.shares} onChange={(e) => setLotDraft((d) => ({ ...d, shares: parseNumericInput(e.target.value) }))} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3"/></label>
        <label className="space-y-2 text-sm font-medium text-zinc-300">Buy Price<input type="number" step="any" value={lotDraft.price} onChange={(e) => setLotDraft((d) => ({ ...d, price: parseNumericInput(e.target.value) }))} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3"/></label>
        <label className="space-y-2 text-sm font-medium text-zinc-300">Buy Date<input type="date" value={lotDraft.date} onChange={(e) => setLotDraft((d) => ({ ...d, date: e.target.value }))} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3"/></label>
        <div className="flex gap-2"><button onClick={addLot} disabled={toNumber(lotDraft.shares) <= 0 || toNumber(lotDraft.price) <= 0 || !lotDraft.date} className="h-11 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-40">Save Purchase</button><button onClick={() => setShowLotForm(null)} className="h-11 rounded-xl border border-white/10 px-4 text-sm">Cancel</button></div>
      </div>}
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-white/[.025] text-left text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-5 py-3">Type</th><th className="px-4 py-3">Shares</th><th className="px-4 py-3">Buy Price</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Buy Date</th><th className="px-4 py-3">Potential Return</th><th className="px-4 py-3">Return</th></tr></thead><tbody>{lots.map((lot, index) => { const shares = toNumber(lot.shares), price = toNumber(lot.price), profit = shares * (toNumber(sellPrice) - price), returnPct = lot.amount ? profit / lot.amount * 100 : 0; return <tr key={`${lot.date}-${index}`} className={cn("border-t border-white/10", lot.future && "bg-emerald-500/[.04]")}><td className="px-5 py-3"><span>{lot.future ? "Future DCA" : "Existing"}</span>{lot.note && <p className="mt-1 text-xs text-zinc-500">{lot.note}</p>}</td><td className="px-4 py-3">{formatShares(shares)}</td><td className="px-4 py-3">{money(price)}</td><td className="px-4 py-3">{money(lot.amount)}</td><td className="px-4 py-3">{formatDate(lot.date)}</td><td className="px-4 py-3">{signedMoney(profit)}</td><td className="px-4 py-3">{pct(returnPct)}</td></tr>; })}</tbody></table></div>
    </section>

    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-zinc-950/35 p-5"><h2 className="font-semibold">Before Vs. After DCA</h2><div className="mt-5 flex items-center justify-between"><div><p className="text-sm text-zinc-500">Existing Average</p><p className="mt-1 text-xl font-semibold">{totals.oldAvg ? money(totals.oldAvg) : "—"}</p></div><ArrowDownRight/><div className="text-right"><p className="text-sm text-zinc-500">New Average</p><p className="mt-1 text-xl font-semibold">{totals.avg ? money(totals.avg) : "—"}</p></div></div></section>
      <section className="rounded-2xl border border-white/10 bg-zinc-950/35 p-5"><h2 className="flex items-center gap-2 font-semibold">{totals.profit >= 0 ? <ArrowUpRight size={18}/> : <ArrowDownRight size={18}/>}Scenario Insight</h2><p className="mt-4 text-sm leading-6 text-zinc-300">{totals.amount && toNumber(sellPrice) > 0 ? <>At A Sell Price Of <strong>{money(toNumber(sellPrice))}</strong>, This Position Would Be Worth <strong>{money(totals.value)}</strong> With A Potential Return Of <strong>{signedMoney(totals.profit)}</strong>.</> : "Enter Position And Purchase-Lot Data To Calculate The Scenario."}</p></section>
    </div>
  </div>;
}
