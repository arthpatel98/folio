"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { FormEvent, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePortfolioStore } from "@/store/portfolio-store";
import { toast } from "sonner";
import { AssetType, OptionType, Sector } from "@/types/portfolio";

const NEW_POSITION = "__new_position__";

const sectors: Sector[] = [
  "AI / Enterprise Software", "AI Data Centers", "Cloud / AI / Software", "Crypto / Bitcoin",
  "Digital Advertising / AI", "Drones", "Space", "Defense", "BioTech", "E-Commerce & Cloud",
  "Education Technology", "Electrical Equipment / Power Infrastructure", "ETF",
  "Ethereum / Crypto Treasury", "Financials", "Healthcare", "Memory Semiconductors",
  "Mobility / Delivery", "Other", "Semiconductors", "Utilities / Energy",
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
};

const createInitialForm = (action: "buy" | "sell" = "buy", assetType: AssetType = "stock"): FormState => ({
  action, assetType, symbol: "", company: "", quantity: "", tradePrice: "", sector: "",
  optionType: "buy-call", optionExpiry: "",
});

export function AddHoldingDialog() {
  const holdings = usePortfolioStore((state) => state.holdings);
  const executeTrade = usePortfolioStore((state) => state.executeTrade);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => createInitialForm());
  const [stockSelection, setStockSelection] = useState(NEW_POSITION);
  const [error, setError] = useState("");

  const ownedStocks = useMemo(() => holdings
    .filter((holding) => (holding.assetType ?? "stock") === "stock" && holding.shares > 0)
    .slice().sort((a, b) => a.symbol.localeCompare(b.symbol)), [holdings]);
  const ownedOptions = useMemo(() => holdings
    .filter((holding) => holding.assetType === "option" && holding.shares !== 0)
    .slice().sort((a, b) => a.company.localeCompare(b.company)), [holdings]);

  const matching = useMemo(() => {
    if (form.assetType === "option" && form.action === "buy") return undefined;
    return holdings.find((holding) => (holding.assetType ?? "stock") === form.assetType
      && holding.symbol.toUpperCase() === form.symbol.trim().toUpperCase());
  }, [form.action, form.assetType, form.symbol, holdings]);

  const resetForSelection = (field: "action" | "assetType", value: string) => {
    setError("");
    const next = createInitialForm(
      field === "action" ? value as "buy" | "sell" : form.action,
      field === "assetType" ? value as AssetType : form.assetType,
    );
    setForm(next);
    setStockSelection(NEW_POSITION);
  };

  const update = (field: keyof FormState, value: string) => {
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
    const isOption = form.assetType === "option";
    const isRemoveStock = form.action === "sell" && form.assetType === "stock";
    const isRemoveOption = form.action === "sell" && form.assetType === "option";
    const company = (matching?.company ?? form.company).trim();
    const sector = matching?.sector ?? form.sector;

    if (!symbol) return setError("Ticker Symbol Is Required.");
    if (isRemoveStock && !matching) return setError("Select A Stock You Currently Own.");
    if (isRemoveOption && !matching) return setError("Select An Option Contract You Currently Own.");
    if (!isRemoveStock && !company) return setError(isOption ? "Contract Details Are Required." : "Company Name Is Required.");
    if (!Number.isFinite(quantity) || quantity <= 0) return setError(isOption ? "Enter A Valid Contract Quantity." : "Enter A Valid Share Quantity.");
    if (!Number.isFinite(tradePrice) || tradePrice <= 0) return setError(isOption ? (isRemoveOption ? "Sell Price Is Required." : "Contract Cost Is Required.") : (isRemoveStock ? "Sell Price Is Required." : "Share Price Is Required."));
    if (!matching && !sector) return setError("Select Sector Is Required.");
    if (isOption && form.action === "buy" && !form.optionExpiry) return setError("Option Expiry Is Required.");

    const optionQuantity = isRemoveOption
      ? ((matching?.shares ?? 0) > 0 ? -Math.abs(quantity) : Math.abs(quantity))
      : (isOption && (form.optionType === "sell-call" || form.optionType === "sell-put") ? -Math.abs(quantity) : Math.abs(quantity));
    const result = executeTrade({
      action: form.action,
      quantity: optionQuantity,
      price: tradePrice,
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
    setOpen(false);
  }

  const isRemoveStock = form.action === "sell" && form.assetType === "stock";
  const isRemoveOption = form.action === "sell" && form.assetType === "option";
  const isNewStock = form.assetType === "stock" && form.action === "buy" && stockSelection === NEW_POSITION;

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) { setForm(createInitialForm()); setStockSelection(NEW_POSITION); setError(""); }
    }}>
      <Dialog.Trigger asChild><Button className="gap-2 rounded-lg px-4"><Plus size={17} /> Update Position</Button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100">
          <div className="flex items-start justify-between gap-4">
            <div><Dialog.Title className="text-xl font-semibold text-zinc-950 dark:text-white">Update Position</Dialog.Title><Dialog.Description className="mt-1 text-sm text-zinc-400">Add Or Remove A Stock Or Option Position.</Dialog.Description></div>
            <Dialog.Close className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"><X size={18} /></Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
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
            </> : isRemoveOption ? <>
              <Field label="Contract Details"><select required value={form.symbol} onChange={(e) => update("symbol", e.target.value)} className="field-select" autoFocus><option value="">Select Contract</option>{ownedOptions.map((holding, index) => <option key={`${holding.symbol}-${holding.optionType}-${holding.optionExpiry}-${index}`} value={holding.symbol}>{holding.company}</option>)}</select></Field>
              <Field label="Contracts"><Input required type="number" min="1" step="1" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} /></Field>
              <Field label="Sell Price"><Input required type="number" min="0.000001" step="any" value={form.tradePrice} onChange={(e) => update("tradePrice", e.target.value)} /></Field>
            </> : form.assetType === "stock" ? <>
              <Field label="Select Position"><select required value={stockSelection} onChange={(e) => selectBuyStock(e.target.value)} className="field-select" autoFocus><option value={NEW_POSITION}>New Position</option>{ownedStocks.map((holding) => <option key={holding.symbol} value={holding.symbol}>{holding.symbol}</option>)}</select></Field>
              {isNewStock ? <Field label="New Position Ticker"><Input required value={form.symbol} onChange={(e) => update("symbol", e.target.value)} className="uppercase" placeholder="Enter Ticker" /></Field> : <Field label="Position Status"><div className="flex h-10 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm dark:border-white/10 dark:bg-white/[.03]"><span className="text-emerald-400">Existing Shares - {matching?.shares ?? 0}</span></div></Field>}
              {!matching && <Field label="Company Name"><Input required value={form.company} onChange={(e) => update("company", e.target.value)} /></Field>}
              <Field label="Shares"><Input required type="number" min="0.000001" step="any" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} /></Field>
              <Field label="Share Price"><Input required type="number" min="0.000001" step="any" value={form.tradePrice} onChange={(e) => update("tradePrice", e.target.value)} /></Field>
              {!matching && <SectorField value={form.sector} onChange={(value) => update("sector", value)} />}
            </> : <>
              <Field label="Underlying Ticker"><Input required value={form.symbol} onChange={(e) => update("symbol", e.target.value)} autoFocus className="uppercase" /></Field>
              <Field label="Contract Details"><Input required value={form.company} onChange={(e) => update("company", e.target.value)} /></Field>
              <Field label="Contracts"><Input required type="number" min="1" step="1" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} /></Field>
              <Field label="Contract Cost"><Input required type="number" min="0.000001" step="any" value={form.tradePrice} onChange={(e) => update("tradePrice", e.target.value)} /></Field>
              <Field label="Option Type"><select required value={form.optionType} onChange={(e) => update("optionType", e.target.value)} className="field-select">{optionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Option Expiry"><Input required type="date" value={form.optionExpiry} onChange={(e) => update("optionExpiry", e.target.value)} /></Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"><span>{label}</span>{children}</label>;
}
function SectorField({ value, onChange }: { value: "" | Sector; onChange: (value: string) => void }) {
  return <Field label="Sector"><select required value={value} onChange={(e) => onChange(e.target.value)} className="flex h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400/60 dark:border-white/10 dark:bg-white/[.03] dark:text-zinc-100"><option value="" className="bg-white dark:bg-zinc-950">Select Sector</option>{sectors.map((sector) => <option key={sector} value={sector} className="bg-white dark:bg-zinc-950">{sector}</option>)}</select></Field>;
}
