"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { FormEvent, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePortfolioStore } from "@/store/portfolio-store";
import { AssetType, OptionType, Sector } from "@/types/portfolio";

const sectors: Sector[] = [
  "AI / Enterprise Software",
  "AI Data Centers",
  "Cloud / AI / Software",
  "Crypto / Bitcoin",
  "Digital Advertising / AI",
  "Drones",
  "E-Commerce & Cloud",
  "Education Technology",
  "Electrical Equipment / Power Infrastructure",
  "ETF",
  "Ethereum / Crypto Treasury",
  "Financials",
  "Healthcare",
  "Memory Semiconductors",
  "Mobility / Delivery",
  "Other",
  "Semiconductors",
  "Utilities / Energy",
];
const optionTypes: { value: OptionType; label: string }[] = [
  { value: "buy-call", label: "Buy Call" },
  { value: "sell-call", label: "Sell Call" },
  { value: "buy-put", label: "Buy Put" },
  { value: "sell-put", label: "Sell Put" },
];

const initialForm = {
  action: "buy" as "buy" | "sell",
  assetType: "stock" as AssetType,
  symbol: "",
  company: "",
  quantity: "",
  tradePrice: "",
  currentPrice: "",
  previousClose: "",
  dividendYield: "0",
  sector: "Cloud / AI / Software" as Sector,
  optionType: "buy-call" as OptionType,
  optionExpiry: "",
};

export function AddHoldingDialog() {
  const holdings = usePortfolioStore((state) => state.holdings);
  const executeTrade = usePortfolioStore((state) => state.executeTrade);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  const matching = useMemo(() => holdings.find((holding) =>
    (holding.assetType ?? "stock") === form.assetType && holding.symbol.toUpperCase() === form.symbol.trim().toUpperCase()
  ), [form.assetType, form.symbol, holdings]);

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "symbol") {
        const found = holdings.find((holding) => (holding.assetType ?? "stock") === current.assetType && holding.symbol.toUpperCase() === value.trim().toUpperCase());
        if (found) {
          next.company = found.company;
          next.currentPrice = String(found.currentPrice);
          next.previousClose = String(found.previousClose);
          next.dividendYield = String(found.dividendYield);
          next.sector = found.sector;
          next.optionType = found.optionType ?? current.optionType;
          next.optionExpiry = found.optionExpiry ?? "";
        }
      }
      return next;
    });
  };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const symbol = form.symbol.trim().toUpperCase();
    const quantity = Number(form.quantity);
    const tradePrice = Number(form.tradePrice);
    const company = (matching?.company ?? form.company).trim();
    const currentPrice = matching?.currentPrice ?? Number(form.currentPrice || tradePrice);
    const previousClose = matching?.previousClose ?? Number(form.previousClose || tradePrice);
    const dividendYield = matching?.dividendYield ?? Number(form.dividendYield || 0);

    if (!symbol || !company) return setError("Ticker and company / contract name are required.");
    const isOption = form.assetType === "option";
    if (!Number.isFinite(quantity) || (!isOption && quantity <= 0) || (isOption && quantity === 0) || !Number.isFinite(tradePrice) || tradePrice < 0) return setError("Enter a valid non-zero contract quantity and execution price.");
    if (isOption && (form.optionType === "sell-call" || form.optionType === "sell-put") && quantity > 0) return setError("Sell Call and Sell Put positions must use a negative contract quantity, such as -1.");
    if (isOption && (form.optionType === "buy-call" || form.optionType === "buy-put") && quantity < 0) return setError("Buy Call and Buy Put positions must use a positive contract quantity.");
    if (form.assetType === "option" && !form.optionExpiry) return setError("Option Expiry date is required.");

    const result = executeTrade({
      action: form.action,
      quantity,
      price: tradePrice,
      holding: {
        assetType: form.assetType,
        symbol,
        company,
        shares: quantity,
        averageCost: tradePrice,
        currentPrice,
        previousClose,
        dividendYield,
        sector: matching?.sector ?? form.sector,
        optionType: form.assetType === "option" ? (matching?.optionType ?? form.optionType) : undefined,
        optionExpiry: form.assetType === "option" ? (matching?.optionExpiry ?? form.optionExpiry) : undefined,
        updatedAt: "Just now",
      },
    });
    if (!result.ok) return setError(result.message ?? "Unable to update the position.");
    setForm(initialForm);
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild><Button className="gap-2 rounded-lg px-4"><Plus size={17} /> Update Position</Button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div><Dialog.Title className="text-xl font-semibold text-zinc-950 dark:text-white">Update Position</Dialog.Title><Dialog.Description className="mt-1 text-sm text-zinc-400">Buy/ Sell an Existing Position, or Open a New Stock/ Option Position.</Dialog.Description></div>
            <Dialog.Close className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"><X size={18} /></Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Activity"><select value={form.action} onChange={(e) => update("action", e.target.value)} className="field-select"><option value="buy">Buy</option><option value="sell">Sell</option></select></Field>
            <Field label="Position Type"><select value={form.assetType} onChange={(e) => { setForm({ ...initialForm, action: form.action, assetType: e.target.value as AssetType }); }} className="field-select"><option value="stock">Stock</option><option value="option">Option</option></select></Field>
            <Field label={form.assetType === "option" ? "Underlying Ticker" : "Ticker Symbol"}><Input value={form.symbol} onChange={(e) => update("symbol", e.target.value)} placeholder="NVDA" autoFocus /></Field>
            <Field label="Position Status"><div className="flex h-10 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm dark:border-white/10 dark:bg-white/[.03]"><span className={matching ? "text-emerald-400" : "text-zinc-400"}>{matching ? `Existing · ${matching.shares} ${form.assetType === "option" ? "contracts" : "shares"}` : "New position"}</span></div></Field>
            {!matching && <Field label={form.assetType === "option" ? "Contract Details" : "Company Name"}><Input value={form.company} onChange={(e) => update("company", e.target.value)} placeholder={form.assetType === "option" ? "NVDA Jan 2027 $200 Call" : "NVIDIA Corporation"} /></Field>}
            <Field label={form.assetType === "option" ? "Contracts" : "Shares"}><Input type="number" min={form.assetType === "option" ? undefined : "0"} step="1" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} placeholder={form.assetType === "option" ? "-1" : "10"} /></Field>
            <Field label={form.assetType === "option" ? "Contract Cost" : "Share Price"}><Input type="number" min="0" step="any" value={form.tradePrice} onChange={(e) => update("tradePrice", e.target.value)} placeholder="142.50" /></Field>

            {form.assetType === "option" && <>
              <Field label="Option Type"><select value={matching?.optionType ?? form.optionType} onChange={(e) => update("optionType", e.target.value)} disabled={Boolean(matching)} className="field-select">{optionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Option Expiry"><Input type="date" value={matching?.optionExpiry ?? form.optionExpiry} onChange={(e) => update("optionExpiry", e.target.value)} disabled={Boolean(matching)} /></Field>
            </>}

            {!matching && <>
              <Field label={form.assetType === "option" ? "Current Price" : "Current Price"}><Input type="number" min="0" step="any" value={form.currentPrice} onChange={(e) => update("currentPrice", e.target.value)} placeholder={form.tradePrice || "0"} /></Field>
              <Field label="Previous Close"><Input type="number" min="0" step="any" value={form.previousClose} onChange={(e) => update("previousClose", e.target.value)} placeholder={form.tradePrice || "0"} /></Field>
              <Field label="Sector"><select value={form.sector} onChange={(e) => update("sector", e.target.value)} className="field-select">{sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}</select></Field>
            </>}

            {form.assetType === "option" && form.quantity && form.tradePrice && <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-200 sm:col-span-2">{form.quantity} contract{Math.abs(Number(form.quantity)) === 1 ? "" : "s"} represent {Math.abs(Number(form.quantity)) * 100} shares. Total position value: ${(Math.abs(Number(form.quantity)) * Number(form.tradePrice) * 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.</div>}
            {error && <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 sm:col-span-2">{error}</p>}
            <div className="mt-2 flex justify-end gap-3 sm:col-span-2"><Dialog.Close asChild><Button type="button" variant="outline">Cancel</Button></Dialog.Close><Button type="submit">{form.action === "buy" ? "Complete purchase" : "Complete sale"}</Button></div>
          </form>
          <style jsx>{`.field-select{display:flex;height:2.5rem;width:100%;border-radius:.75rem;border:1px solid #e4e4e7;background:#fff;padding:0 .75rem;font-size:.875rem;color:#18181b;outline:none}.field-select option{background:#fff;color:#18181b}:global(.dark) .field-select{border-color:rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#f4f4f5}:global(.dark) .field-select option{background:#09090b;color:#f4f4f5}`}</style>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"><span>{label}</span>{children}</label>; }
