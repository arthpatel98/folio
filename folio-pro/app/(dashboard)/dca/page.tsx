"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn, money } from "@/lib/utils";
import { DcaLot, DcaPosition, NumericValue } from "@/lib/dca-data";
import { DCA_SELECTED_POSITION_KEY, DCA_UPDATED_EVENT, loadDcaPositions, saveDcaPositions, upsertDcaPosition } from "@/lib/dca-storage";
import { useActivePortfolio } from "@/components/portfolio/portfolio-context";
import { usePortfolioStore } from "@/store/portfolio-store";

const toNumber = (value: NumericValue | string) => value === "" || !Number.isFinite(Number(value)) ? 0 : Number(value);
const parseNumericInput = (value: string): NumericValue => value === "" ? "" : Number(value);
const pct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
const fixedMoney = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const signedMoney = (value: number) => `${value >= 0 ? "+" : "-"}${fixedMoney(Math.abs(value))}`;
const formatShares = (value: number) => Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const daysSinceAdded = (value: string) => {
  if (!value || value === "Future") return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - date.getTime()) / 86400000)).toLocaleString();
};
const formatDate = (value: string) => {
  if (value === "Future") return "Future";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const lotDateValue = (value: string) => {
  if (!value || value === "Future") return Number.MAX_SAFE_INTEGER;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
};
const sortLots = (lots: DcaLot[]) => lots.slice().sort((a, b) => lotDateValue(a.date) - lotDateValue(b.date));
const clonePosition = (position: DcaPosition): DcaPosition => ({ ...position, lots: position.lots.map((lot) => ({ ...lot })) });

type LotDraft = { shares: NumericValue; price: NumericValue; cost: NumericValue; costOverridden: boolean; date: string; future: boolean };
const emptyDraft = (future = false): LotDraft => ({ shares: "", price: "", cost: "", costOverridden: false, date: "", future });
const DCA_LOT_WIDTHS_KEY = "folio-dca-purchase-lot-column-widths";
const DCA_LOT_SCROLL_KEY = "folio-dca-purchase-lot-scroll-left";
const lotColumns = [
  { key: "shares", label: "Shares", defaultWidth: 120 },
  { key: "buyPrice", label: "Buy Price", defaultWidth: 130 },
  { key: "cost", label: "Cost", defaultWidth: 130 },
  { key: "buyDate", label: "Buy Date", defaultWidth: 180 },
  { key: "days", label: "Days Since Added", defaultWidth: 170 },
  { key: "return", label: "Potential Return", defaultWidth: 160 },
  { key: "returnPct", label: "Potential Return %", defaultWidth: 180 },
  { key: "actions", label: "Actions", defaultWidth: 130 },
] as const;
type LotColumnKey = typeof lotColumns[number]["key"];
const defaultLotWidths = Object.fromEntries(lotColumns.map((column) => [column.key, column.defaultWidth])) as Record<LotColumnKey, number>;

export default function DcaPage() {
  const { activeId } = useActivePortfolio();
  const holdingsByPortfolio = usePortfolioStore((state) => state.holdingsByPortfolio);
  const [allPositions, setAllPositions] = useState<DcaPosition[]>([]);
  const [positionId, setPositionId] = useState("");
  const [lots, setLots] = useState<DcaLot[]>([]);
  const [sellPrice, setSellPrice] = useState("");
  const [sellPriceFocused, setSellPriceFocused] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [showLotForm, setShowLotForm] = useState<"existing" | "future" | null>(null);
  const [newLotType, setNewLotType] = useState<"existing" | "future">("existing");
  const [lotDraft, setLotDraft] = useState<LotDraft>(emptyDraft());
  const [editingLotIndex, setEditingLotIndex] = useState<number | null>(null);
  const [lotColumnWidths, setLotColumnWidths] = useState<Record<LotColumnKey, number>>(defaultLotWidths);
  const lotScrollRef = useRef<HTMLDivElement>(null);
  const [newSymbol, setNewSymbol] = useState("");
  const [newSellPrice, setNewSellPrice] = useState("");
  const [newShares, setNewShares] = useState<NumericValue>("");
  const [newBuyPrice, setNewBuyPrice] = useState<NumericValue>("");
  const [newBuyDate, setNewBuyDate] = useState("");

  const mergeWithHeldStocks = (savedPositions: DcaPosition[]) => {
    const saved = savedPositions.filter((position) => activeId === "all" || position.portfolioId === activeId);
    const savedKeys = new Set(saved.map((position) => `${position.portfolioId}:${position.symbol.trim().toUpperCase()}`));
    const portfolioIds = activeId === "all" ? (["robinhood", "fidelity-401k", "fidelity-roth"] as const) : [activeId];
    const placeholders: DcaPosition[] = [];
    portfolioIds.forEach((portfolioId) => {
      holdingsByPortfolio[portfolioId]
        .filter((holding) => (holding.assetType ?? "stock") === "stock" && holding.shares > 0)
        .forEach((holding) => {
          const symbol = holding.symbol.trim().toUpperCase();
          const key = `${portfolioId}:${symbol}`;
          if (!savedKeys.has(key)) placeholders.push({ id: `PORTFOLIO-${portfolioId}-${symbol}`, symbol, label: symbol, sellPrice: "", lots: [], custom: true, portfolioId });
        });
    });
    return [...saved, ...placeholders].sort((a, b) => (a.label ?? a.symbol).localeCompare(b.label ?? b.symbol));
  };

  const positions = useMemo(() => mergeWithHeldStocks(allPositions), [allPositions, activeId, holdingsByPortfolio]);

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
    setLots(sortLots(copy.lots));
    setSellPrice(copy.sellPrice === "" ? "" : String(copy.sellPrice));
    saveSelection(copy.id);
  };

  const loadAll = (preferredId?: string) => {
    const next = loadDcaPositions();
    setAllPositions(next);
    const visible = mergeWithHeldStocks(next);
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


  useEffect(() => {
    try {
      const savedWidths = window.localStorage.getItem(DCA_LOT_WIDTHS_KEY);
      if (savedWidths) setLotColumnWidths({ ...defaultLotWidths, ...JSON.parse(savedWidths) });
      const savedScroll = Number(window.localStorage.getItem(DCA_LOT_SCROLL_KEY) ?? "0");
      window.requestAnimationFrame(() => {
        if (lotScrollRef.current && Number.isFinite(savedScroll)) lotScrollRef.current.scrollLeft = savedScroll;
      });
    } catch {}
  }, []);

  const persistLotWidths = (widths: Record<LotColumnKey, number>) => {
    setLotColumnWidths(widths);
    try { window.localStorage.setItem(DCA_LOT_WIDTHS_KEY, JSON.stringify(widths)); } catch {}
  };

  const startColumnResize = (event: React.MouseEvent, key: LotColumnKey) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = lotColumnWidths[key];
    const onMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(90, Math.round(startWidth + moveEvent.clientX - startX));
      persistLotWidths({ ...lotColumnWidths, [key]: nextWidth });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const selectedPosition = positions.find((position) => position.id === positionId);
  const load = (id: string) => { applyPosition(positions.find((position) => position.id === id)); setSavedMessage(""); };

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
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weightedHeldLots = lots.filter((lot) => {
      if (!lot.date) return false;
      const parsed = new Date(`${lot.date}T00:00:00`);
      return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= today.getTime() && toNumber(lot.shares) > 0;
    });
    const heldShares = weightedHeldLots.reduce((sum, lot) => sum + toNumber(lot.shares), 0);
    const weightedHeldDays = weightedHeldLots.reduce((sum, lot) => {
      const added = new Date(`${lot.date}T00:00:00`);
      const days = Math.max(0, Math.floor((today.getTime() - added.getTime()) / 86400000));
      return sum + days * toNumber(lot.shares);
    }, 0);
    const avgDaysHeld = heldShares ? Math.round(weightedHeldDays / heldShares) : 0;
    return { amount, shares, avg, value, profit, roi, oldAvg, avgDaysHeld };
  }, [lots, sellPrice]);

  const saveLot = () => {
    const shares = toNumber(lotDraft.shares), price = toNumber(lotDraft.price), cost = toNumber(lotDraft.cost);
    if (shares <= 0 || price <= 0 || cost <= 0 || (!lotDraft.future && !lotDraft.date)) return;
    const existing = editingLotIndex === null ? undefined : lots[editingLotIndex];
    const lot: DcaLot = { ...existing, amount: cost, shares, price, date: lotDraft.future ? "Future" : lotDraft.date, future: lotDraft.future };
    const nextLots = editingLotIndex === null
      ? sortLots([...lots, lot])
      : sortLots(lots.map((item, index) => index === editingLotIndex ? lot : item));
    setLots(nextLots);
    if (selectedPosition) upsertDcaPosition({ ...selectedPosition, sellPrice: parseNumericInput(sellPrice), lots: nextLots });
    setLotDraft(emptyDraft()); setShowLotForm(null); setEditingLotIndex(null); setSavedMessage(editingLotIndex === null ? (lot.future ? "Future Purchase Added" : "Purchase Added") : (lot.future ? "Future Purchase Updated" : "Purchase Updated"));
    window.setTimeout(() => setSavedMessage(""), 1800);
  };

  const editLot = (index: number) => {
    const lot = lots[index];
    setEditingLotIndex(index);
    setShowLotForm(lot.future ? "future" : "existing");
    setLotDraft({ shares: lot.shares, price: lot.price, cost: lot.amount, costOverridden: false, date: lot.date === "Future" ? "" : lot.date, future: Boolean(lot.future) });
  };

  const deleteLot = (index: number) => {
    const nextLots = lots.filter((_, lotIndex) => lotIndex !== index);
    setLots(nextLots);
    if (selectedPosition) upsertDcaPosition({ ...selectedPosition, sellPrice: parseNumericInput(sellPrice), lots: nextLots });
    setSavedMessage(lots[index]?.future ? "Future Purchase Removed" : "Purchase Removed");
    window.setTimeout(() => setSavedMessage(""), 1800);
  };

  const updateFutureLot = (index: number, field: "shares" | "price", value: NumericValue) => {
    setLots((current) => current.map((lot, lotIndex) => {
      if (lotIndex !== index || !lot.future) return lot;
      const next = { ...lot, [field]: value };
      return { ...next, amount: toNumber(next.shares) * toNumber(next.price) };
    }));
  };

  const addPosition = () => {
    const symbol = newSymbol.trim().toUpperCase(), shares = toNumber(newShares), buyPrice = toNumber(newBuyPrice);
    if (!symbol || shares <= 0 || buyPrice <= 0 || !newBuyDate || activeId === "all") return;
    const position: DcaPosition = {
      id: `CUSTOM-${activeId}-${symbol}-${Date.now()}`, symbol, label: symbol, sellPrice: parseNumericInput(newSellPrice), custom: true, portfolioId: activeId,
      lots: [{ amount: shares * buyPrice, shares, price: buyPrice, date: newBuyDate, future: false }],
    };
    const next = [...loadDcaPositions(), position];
    saveDcaPositions(next); setAllPositions(next); applyPosition(position);
    setNewSymbol(""); setNewSellPrice(""); setNewShares(""); setNewBuyPrice(""); setNewBuyDate(""); setShowAddPosition(false);
  };

  const removeSelectedPosition = () => {
    if (!selectedPosition || activeId === "all") return;
    const symbol = selectedPosition.symbol.trim().toUpperCase();
    const isInHoldings = holdingsByPortfolio[activeId].some((holding) =>
      (holding.assetType ?? "stock") === "stock" && holding.shares > 0 && holding.symbol.trim().toUpperCase() === symbol,
    );
    if (isInHoldings) {
      setSavedMessage("Can’t Remove Position Because It’s Part Of Holdings");
      window.setTimeout(() => setSavedMessage(""), 2200);
      return;
    }
    const next = loadDcaPositions().filter((position) => position.id !== selectedPosition.id);
    saveDcaPositions(next);
    setAllPositions(next);
    const visible = mergeWithHeldStocks(next);
    applyPosition(visible[0]);
    setSavedMessage("Position Removed");
    window.setTimeout(() => setSavedMessage(""), 1800);
  };

  return <div className="space-y-5">
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">DCA Calculator</h1><p className="mt-1 text-sm text-zinc-500">Track Existing Purchase Lots And Test How A Future Purchase Changes Your Average Cost And Potential Return.</p>
    </div>

    {showAddPosition && <section className="rounded-2xl border border-white/10 bg-zinc-950/50 p-5">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Add Position</h2><button aria-label="Close Add Position" onClick={() => setShowAddPosition(false)} className="rounded-lg p-2 text-zinc-500 hover:bg-white/[.05] hover:text-white"><X size={17}/></button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-2 text-sm font-medium text-zinc-300">Ticker Symbol<input value={newSymbol} onChange={(event) => setNewSymbol(event.target.value.toUpperCase())} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 uppercase outline-none"/></label>
        <label className="space-y-2 text-sm font-medium text-zinc-300">Potential Sell Price<input type="text" inputMode="decimal" value={newSellPrice} onChange={(event) => { const value = event.target.value; if (/^\d*(?:\.\d{0,2})?$/.test(value)) setNewSellPrice(value); }} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 outline-none"/></label>
        <label className="space-y-2 text-sm font-medium text-zinc-300">Shares<input type="number" step="any" value={newShares} onChange={(event) => setNewShares(parseNumericInput(event.target.value))} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 outline-none"/></label>
        <label className="space-y-2 text-sm font-medium text-zinc-300">Buy Price<input type="number" step="any" value={newBuyPrice} onChange={(event) => setNewBuyPrice(parseNumericInput(event.target.value))} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 outline-none"/></label>
        <label className="space-y-2 text-sm font-medium text-zinc-300">Buy Date<input type="date" value={newBuyDate} onChange={(event) => setNewBuyDate(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 outline-none"/></label>
      </div>
      <div className="mt-5 flex justify-end"><button onClick={addPosition} disabled={!newSymbol.trim() || toNumber(newShares) <= 0 || toNumber(newBuyPrice) <= 0 || !newBuyDate} className="h-10 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-40">Add Position</button></div>
    </section>}

    <section className="rounded-2xl border border-white/10 bg-zinc-950/35 p-5 lg:p-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div><label className="mb-2 block text-sm font-medium text-zinc-300">Position</label><select value={positionId} onChange={(event) => load(event.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-zinc-950/70 px-4 text-sm outline-none">{positions.map((position) => <option key={position.id} value={position.id}>{position.label ?? position.symbol}</option>)}</select></div>
        <div><label className="mb-2 block text-sm font-medium text-zinc-300">Potential Sell Price</label><div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-zinc-500">$</span><input type="text" inputMode="decimal" value={sellPriceFocused ? String(sellPrice) : (sellPrice === "" ? "" : Number(sellPrice).toFixed(2))} onFocus={() => setSellPriceFocused(true)} onChange={(event) => { const value = event.target.value; if (/^\d*(?:\.\d{0,2})?$/.test(value)) setSellPrice(value); }} onBlur={() => { const normalized = sellPrice === "" ? "" : Number(Number(sellPrice).toFixed(2)); setSellPriceFocused(false); setSellPrice(normalized === "" ? "" : normalized.toFixed(2)); if (selectedPosition) upsertDcaPosition({ ...selectedPosition, sellPrice: normalized, lots: sortLots(lots) }); }} className="h-12 w-full rounded-xl border border-white/10 bg-black/15 pl-8 pr-4 text-lg font-semibold outline-none"/></div></div>
        <div className="flex gap-2"><button onClick={() => setShowAddPosition(true)} aria-label="Add Position" title="Add Position" className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400 text-zinc-950 hover:bg-emerald-300"><Plus size={19}/></button><button onClick={removeSelectedPosition} disabled={!selectedPosition || activeId === "all"} className="inline-flex h-12 items-center justify-center rounded-xl border border-rose-500/30 px-4 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40">Remove</button></div>
      </div>
      {savedMessage && <p className="mt-3 text-sm text-emerald-400">{savedMessage}</p>}
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {[ ["Total Investment", totals.amount ? money(totals.amount) : "—"], ["Total Shares", totals.shares ? formatShares(totals.shares) : "—"], ["Average Price", totals.avg ? money(totals.avg) : "—"], ["Average Days Held", totals.avgDaysHeld ? `${totals.avgDaysHeld.toLocaleString()} Days` : "—"], ["Potential Return", totals.amount ? signedMoney(totals.profit) : "—"], ["Potential Return %", totals.amount ? pct(totals.roi) : "—"] ].map(([label, value], index) => <div key={label} className={cn("rounded-2xl border border-white/10 bg-zinc-950/35 p-5", index >= 4 && (totals.profit >= 0 ? "border-emerald-500/35 bg-emerald-500/[.06]" : "border-rose-500/35 bg-rose-500/[.06]"))}><p className="text-sm text-zinc-500">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p></div>)}
    </div>

    <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/35">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-semibold">Purchase Lots</h2><p className="mt-1 text-sm text-zinc-500">Edit Existing Or Future Purchase Lots. Holdings Purchases Are Added Automatically.</p></div><button onClick={() => { setEditingLotIndex(null); setNewLotType("existing"); setShowLotForm("existing"); setLotDraft(emptyDraft(false)); }} aria-label="Add Purchase" title="Add Purchase" className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-zinc-950 hover:bg-emerald-300"><Plus size={18}/></button></div>
      {showLotForm && <div className="border-b border-white/10 p-5">
        {editingLotIndex === null && <div className="mb-4 inline-flex rounded-xl border border-white/10 bg-black/20 p-1">
          {(["existing", "future"] as const).map((type) => <button key={type} onClick={() => { setNewLotType(type); setShowLotForm(type); setLotDraft(emptyDraft(type === "future")); }} className={cn("rounded-lg px-4 py-2 text-sm font-semibold transition", newLotType === type ? "bg-emerald-400 text-zinc-950" : "text-zinc-400 hover:text-white")}>{type === "existing" ? "Existing Purchase" : "Future Purchase"}</button>)}
        </div>}
        <div className={cn("grid gap-4 sm:grid-cols-2 lg:items-end", lotDraft.future ? "lg:grid-cols-[1fr_1fr_1fr_auto]" : "lg:grid-cols-[1fr_1fr_1fr_1fr_auto]")}>
          <label className="space-y-2 text-sm font-medium text-zinc-300">Shares<input type="number" step="any" value={lotDraft.shares} onChange={(e) => setLotDraft((d) => { const shares = parseNumericInput(e.target.value); return { ...d, shares, cost: d.costOverridden ? d.cost : toNumber(shares) * toNumber(d.price) }; })} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3"/></label>
          <label className="space-y-2 text-sm font-medium text-zinc-300">Buy Price<input type="number" step="any" value={lotDraft.price} onChange={(e) => setLotDraft((d) => { const price = parseNumericInput(e.target.value); return { ...d, price, cost: d.costOverridden ? d.cost : toNumber(d.shares) * toNumber(price) }; })} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3"/></label>
          <label className="space-y-2 text-sm font-medium text-zinc-300">Cost<input type="number" step="any" value={lotDraft.cost} onChange={(e) => setLotDraft((d) => ({ ...d, cost: parseNumericInput(e.target.value), costOverridden: true }))} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3"/></label>
          {!lotDraft.future && <label className="space-y-2 text-sm font-medium text-zinc-300">Buy Date<input type="date" value={lotDraft.date} onChange={(e) => setLotDraft((d) => ({ ...d, date: e.target.value }))} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3"/></label>}
          <div className="flex gap-2"><button onClick={saveLot} disabled={toNumber(lotDraft.shares) <= 0 || toNumber(lotDraft.price) <= 0 || toNumber(lotDraft.cost) <= 0 || (!lotDraft.future && !lotDraft.date)} className="h-11 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-40">{editingLotIndex === null ? "Save Purchase" : "Update Purchase"}</button><button onClick={() => { setShowLotForm(null); setEditingLotIndex(null); }} className="h-11 rounded-xl border border-white/10 px-4 text-sm">Cancel</button></div>
        </div>
      </div>}
      <div
        ref={lotScrollRef}
        className="overflow-x-auto"
        onScroll={(event) => {
          try { window.localStorage.setItem(DCA_LOT_SCROLL_KEY, String(event.currentTarget.scrollLeft)); } catch {}
        }}
      >
        <table className="table-fixed text-sm" style={{ width: Object.values(lotColumnWidths).reduce((sum, width) => sum + width, 0) }}>
          <colgroup>{lotColumns.map((column) => <col key={column.key} style={{ width: lotColumnWidths[column.key] }} />)}</colgroup>
          <thead className="bg-white/[.025] text-left text-xs tracking-wide text-zinc-500">
            <tr>{lotColumns.map((column) => <th key={column.key} className={cn("relative whitespace-nowrap px-4 py-3 font-medium", column.key === "actions" && "text-right")}>
              {column.label}
              <span onMouseDown={(event) => startColumnResize(event, column.key)} className="absolute inset-y-0 right-0 w-2 cursor-col-resize select-none" aria-hidden="true" />
            </th>)}</tr>
          </thead>
          <tbody>{lots.map((lot, index) => {
            const shares = toNumber(lot.shares), price = toNumber(lot.price), cost = lot.amount;
            const profit = shares * (toNumber(sellPrice) - price), returnPct = cost ? profit / cost * 100 : 0;
            return <tr key={`${lot.date}-${index}`} className={cn("border-t border-white/10", lot.future && "bg-emerald-500/[.04]")}>
              <td className="whitespace-nowrap px-4 py-3">{formatShares(shares)}</td>
              <td className="whitespace-nowrap px-4 py-3">{fixedMoney(price)}</td>
              <td className="whitespace-nowrap px-4 py-3">{fixedMoney(cost)}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatDate(lot.date)}</td>
              <td className="whitespace-nowrap px-4 py-3">{daysSinceAdded(lot.date)}</td>
              <td className="whitespace-nowrap px-4 py-3">{signedMoney(profit)}</td>
              <td className="whitespace-nowrap px-4 py-3">{pct(returnPct)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button onClick={() => editLot(index)} aria-label="Edit Purchase Lot" title="Edit Purchase Lot" className="rounded-lg p-2 text-zinc-500 hover:bg-emerald-500/10 hover:text-emerald-400"><Pencil size={16}/></button>
                <button onClick={() => deleteLot(index)} aria-label="Delete Purchase Lot" title="Delete Purchase Lot" className="rounded-lg p-2 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400"><Trash2 size={16}/></button>
              </td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>

    <section className="rounded-2xl border border-white/10 bg-zinc-950/35 p-5"><h2 className="font-semibold">Before DCA Vs. After DCA</h2><div className="mt-5 grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-black/15 p-5"><p className="text-sm text-zinc-500">Before DCA</p><p className="mt-1 text-xs text-zinc-600">Existing Average Price</p><p className="mt-4 text-3xl font-semibold">{totals.oldAvg ? money(totals.oldAvg) : "—"}</p></div>
      <div className={cn("rounded-2xl border p-5", totals.avg < totals.oldAvg ? "border-emerald-500/30 bg-emerald-500/[.06]" : totals.avg > totals.oldAvg ? "border-rose-500/30 bg-rose-500/[.06]" : "border-white/10 bg-black/15")}><p className="text-sm text-zinc-500">After DCA</p><p className="mt-1 text-xs text-zinc-600">New Average Price</p><div className="mt-4 flex items-end justify-between gap-4"><p className="text-3xl font-semibold">{totals.avg ? money(totals.avg) : "—"}</p>{totals.oldAvg > 0 && totals.avg > 0 && (() => { const difference = totals.avg - totals.oldAvg; const percent = difference / totals.oldAvg * 100; const Icon = difference > 0 ? ArrowUp : difference < 0 ? ArrowDown : ArrowRight; return <div className={cn("flex items-center gap-1.5 text-sm font-semibold", difference < 0 ? "text-emerald-400" : difference > 0 ? "text-rose-400" : "text-zinc-400")}><Icon size={17}/><span>{signedMoney(difference)} · {Math.abs(percent).toFixed(2)}%</span></div>; })()}</div></div>
    </div></section>
  </div>;
}
