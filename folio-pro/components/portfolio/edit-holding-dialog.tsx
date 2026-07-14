"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { FormEvent, useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePortfolioStore } from "@/store/portfolio-store";
import { toast } from "sonner";
import { AssetType, Holding, Sector } from "@/types/portfolio";

const sectors: Sector[] = [
  "AI / Enterprise Software",
  "AI Data Centers",
  "Cloud / AI / Software",
  "Crypto / Bitcoin",
  "Digital Advertising / AI",
  "Drones",
  "Space",
  "Defense",
  "BioTech",
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

type HoldingForm = {
  assetType: AssetType;
  symbol: string;
  company: string;
  shares: string;
  averageCost: string;
  currentPrice: string;
  previousClose: string;
  sector: Sector;
  optionType: string;
  optionExpiry: string;
  dte: string;
};

function toForm(holding: Holding): HoldingForm {
  return {
    assetType: holding.assetType ?? "stock",
    symbol: holding.symbol,
    company: holding.company,
    shares: String(holding.shares),
    averageCost: String(holding.averageCost),
    currentPrice: String(holding.currentPrice),
    previousClose: String(holding.previousClose),
    sector: holding.sector,
    optionType: holding.optionType ?? "buy-call",
    optionExpiry: holding.optionExpiry ?? "",
    dte: holding.optionExpiry ? String(Math.ceil((new Date(`${holding.optionExpiry}T23:59:59`).getTime() - Date.now()) / 86_400_000)) : "",
  };
}

export function EditHoldingDialog({ holding }: { holding: Holding }) {
  const updateHolding = usePortfolioStore((state) => state.updateHolding);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<HoldingForm>(() => toForm(holding));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) setForm(toForm(holding));
  }, [holding, open]);

  const update = (field: keyof HoldingForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const symbol = form.symbol.trim().toUpperCase();
    const company = form.company.trim();
    const shares = Number(form.shares);
    const averageCost = Number(form.averageCost);
    const currentPrice = Number(form.currentPrice);
    const previousClose = Number(form.previousClose);
    const isOption = form.assetType === "option";

    if (!symbol || !company) {
      setError("Ticker symbol and company name are required.");
      return;
    }

    if (
      !Number.isFinite(shares) ||
      (!isOption && shares <= 0) ||
      (isOption && shares === 0) ||
      !Number.isFinite(averageCost) ||
      averageCost < 0 ||
      !Number.isFinite(currentPrice) ||
      currentPrice < 0 ||
      !Number.isFinite(previousClose) ||
      previousClose < 0
    ) {
      setError("Please enter valid positive numbers for every price and quantity field.");
      return;
    }

    if (isOption && (!form.optionExpiry || averageCost <= 0)) {
      setError("Expiry Date and Contract Cost are required for live option prices.");
      return;
    }

    updateHolding(holding.symbol, holding.assetType ?? "stock", {
      assetType: form.assetType,
      symbol,
      company,
      shares,
      averageCost,
      currentPrice,
      previousClose,
      dividendYield: holding.dividendYield ?? 0,
      sector: form.sector,
      optionType: isOption ? form.optionType as any : undefined,
      optionExpiry: isOption ? form.optionExpiry || undefined : undefined,
      updatedAt: "Just now",
    });

    toast.success("Changes Saved Successfully");
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label={`Edit ${holding.symbol}`}
          title={`Edit ${holding.symbol}`}
        >
          <Pencil size={16} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-semibold text-zinc-950 dark:text-white">
                Edit Position
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-zinc-400">
                Update the Details for {holding.symbol}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white" aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Position Type">
              <select
                value={form.assetType}
                onChange={(e) => update("assetType", e.target.value)}
                className="flex h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-white/10 dark:bg-white/[.03] dark:text-zinc-100 outline-none transition focus:border-emerald-400/60"
              >
                <option value="stock" className="bg-white dark:bg-zinc-950">Stock</option>
                <option value="option" className="bg-white dark:bg-zinc-950">Option</option>
              </select>
            </Field>
            <Field label="Ticker Symbol">
              <Input value={form.symbol} onChange={(e) => update("symbol", e.target.value)} autoFocus />
            </Field>
            <Field label={form.assetType === "option" ? "Contract Details" : "Company Name"}>
              <Input value={form.company} onChange={(e) => update("company", e.target.value)} />
            </Field>
            <Field label={form.assetType === "option" ? "Contracts" : "Shares"}>
              <Input className="number-input-no-spinner" type="number" min={form.assetType === "option" ? undefined : "0"} step="any" value={form.shares} onChange={(e) => update("shares", e.target.value)} />
            </Field>
            <Field label={form.assetType === "option" ? "Contract Cost" : "Avg. Cost"}>
              <Input className="number-input-no-spinner" type="number" min="0" step="any" value={form.averageCost} onChange={(e) => update("averageCost", e.target.value)} />
            </Field>
            <Field label="Current Price">
              <Input className="number-input-no-spinner" type="number" min="0" step="any" value={form.currentPrice} onChange={(e) => update("currentPrice", e.target.value)} />
            </Field>
            <Field label="Previous Close">
              <Input className="number-input-no-spinner" type="number" min="0" step="any" value={form.previousClose} onChange={(e) => update("previousClose", e.target.value)} />
            </Field>
            {form.assetType === "option" && <>
              <Field label="Option Type"><select value={form.optionType} onChange={(e) => update("optionType", e.target.value)} className="flex h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-white/[.03] dark:text-zinc-100 outline-none"><option value="buy-call" className="bg-white dark:bg-zinc-950">Buy Call</option><option value="sell-call" className="bg-white dark:bg-zinc-950">Sell Call</option><option value="buy-put" className="bg-white dark:bg-zinc-950">Buy Put</option><option value="sell-put" className="bg-white dark:bg-zinc-950">Sell Put</option></select></Field>
              <Field label="Expiry Date"><Input type="date" value={form.optionExpiry} onChange={(e) => { const value=e.target.value; update("optionExpiry", value); if(value) update("dte", String(Math.ceil((new Date(`${value}T23:59:59`).getTime()-Date.now())/86_400_000))); }} /><span className="block text-xs font-normal text-zinc-500">{form.optionExpiry ? new Date(`${form.optionExpiry}T12:00:00`).toLocaleDateString("en-US", {month:"long", day:"numeric", year:"numeric"}) : "Select a date"}</span></Field>
              <Field label="Days to Expiry"><Input className="number-input-no-spinner" type="number" step="1" value={form.dte} onChange={(e) => { const value=e.target.value; update("dte", value); const days=Number(value); if(Number.isInteger(days)){ const date=new Date(); date.setDate(date.getDate()+days); update("optionExpiry", date.toISOString().slice(0,10)); } }} /></Field>
            </>}
            <Field label="Sector">
              <select
                value={form.sector}
                onChange={(e) => update("sector", e.target.value)}
                className="flex h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-white/10 dark:bg-white/[.03] dark:text-zinc-100 outline-none transition focus:border-emerald-400/60"
              >
                {sectors.map((sector) => (
                  <option key={sector} value={sector} className="bg-white dark:bg-zinc-950">
                    {sector}
                  </option>
                ))}
              </select>
            </Field>

            {error && (
              <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 sm:col-span-2">
                {error}
              </p>
            )}

            <div className="mt-2 flex justify-end gap-3 sm:col-span-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </Dialog.Close>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      <span>{label}</span>
      {children}
    </label>
  );
}
