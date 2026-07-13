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

const createInitialForm = (
  action: "buy" | "sell" = "buy",
  assetType: AssetType = "stock",
): FormState => ({
  action,
  assetType,
  symbol: "",
  company: "",
  quantity: "",
  tradePrice: "",
  sector: "",
  optionType: "buy-call",
  optionExpiry: "",
});

export function AddHoldingDialog() {
  const holdings = usePortfolioStore((state) => state.holdings);
  const executeTrade = usePortfolioStore((state) => state.executeTrade);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => createInitialForm());
  const [error, setError] = useState("");

  const ownedStocks = useMemo(
    () => holdings
      .filter((holding) => (holding.assetType ?? "stock") === "stock" && holding.shares > 0)
      .slice()
      .sort((a, b) => a.symbol.localeCompare(b.symbol)),
    [holdings],
  );

  const matching = useMemo(() => holdings.find((holding) =>
    (holding.assetType ?? "stock") === form.assetType
      && holding.symbol.toUpperCase() === form.symbol.trim().toUpperCase()
  ), [form.assetType, form.symbol, holdings]);

  const resetForSelection = (field: "action" | "assetType", value: string) => {
    setError("");
    setForm((current) => createInitialForm(
      field === "action" ? value as "buy" | "sell" : current.action,
      field === "assetType" ? value as AssetType : current.assetType,
    ));
  };

  const update = (field: keyof FormState, value: string) => {
    setForm((current) => {
      const next = { ...current, [field]: value } as FormState;
      if (field === "symbol") {
        const found = holdings.find((holding) =>
          (holding.assetType ?? "stock") === current.assetType
            && holding.symbol.toUpperCase() === value.trim().toUpperCase()
        );
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const symbol = form.symbol.trim().toUpperCase();
    const quantity = Number(form.quantity);
    const tradePrice = Number(form.tradePrice);
    const isOption = form.assetType === "option";
    const isSellStock = form.action === "sell" && form.assetType === "stock";
    const company = (matching?.company ?? form.company).trim();
    const sector = matching?.sector ?? form.sector;

    if (!symbol) return setError("Ticker Symbol is required.");
    if (isSellStock && !matching) return setError("Select a stock you currently own.");
    if (!isSellStock && !company) return setError(isOption ? "Contract Details are required." : "Company Name is required.");
    if (!Number.isFinite(quantity) || (!isOption && quantity <= 0) || (isOption && quantity === 0)) {
      return setError(isOption ? "Enter a valid non-zero contract quantity." : "Enter a valid share quantity.");
    }
    if (!Number.isFinite(tradePrice) || tradePrice <= 0) {
      return setError(isOption ? "Contract Cost is required." : form.action === "sell" ? "Sell Price is required." : "Share Price is required.");
    }
    if (!matching && !sector) return setError("Select Sector is required.");
    if (isOption && (form.optionType === "sell-call" || form.optionType === "sell-put") && quantity > 0) {
      return setError("Sell Call and Sell Put positions must use a negative contract quantity, such as -1.");
    }
    if (isOption && (form.optionType === "buy-call" || form.optionType === "buy-put") && quantity < 0) {
      return setError("Buy Call and Buy Put positions must use a positive contract quantity.");
    }
    if (isOption && !form.optionExpiry) return setError("Option Expiry is required.");

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
        currentPrice: matching?.currentPrice ?? tradePrice,
        previousClose: matching?.previousClose ?? tradePrice,
        dividendYield: matching?.dividendYield ?? 0,
        sector: sector as Sector,
        optionType: isOption ? (matching?.optionType ?? form.optionType) : undefined,
        optionExpiry: isOption ? (matching?.optionExpiry ?? form.optionExpiry) : undefined,
        updatedAt: "Just now",
      },
    });

    if (!result.ok) return setError(result.message ?? "Unable to update the position.");
    setForm(createInitialForm());
    setOpen(false);
  }

  const isSellStock = form.action === "sell" && form.assetType === "stock";

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        setForm(createInitialForm());
        setError("");
      }
    }}>
      <Dialog.Trigger asChild><Button className="gap-2 rounded-lg px-4"><Plus size={17} /> Update Position</Button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-semibold text-zinc-950 dark:text-white">Update Position</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-zinc-400">Buy/Sell an Existing Position, or Open a New Stock/Option Position.</Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"><X size={18} /></Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Activity">
              <select required value={form.action} onChange={(e) => resetForSelection("action", e.target.value)} className="field-select">
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </Field>
            <Field label="Position Type">
              <select required value={form.assetType} onChange={(e) => resetForSelection("assetType", e.target.value)} className="field-select">
                <option value="stock">Stock</option>
                <option value="option">Option</option>
              </select>
            </Field>

            {isSellStock ? (
              <>
                <Field label="Ticker Symbol">
                  <select required value={form.symbol} onChange={(e) => update("symbol", e.target.value)} className="field-select" autoFocus>
                    <option value="">Select Ticker</option>
                    {ownedStocks.map((holding) => <option key={holding.symbol} value={holding.symbol}>{holding.symbol}</option>)}
                  </select>
                </Field>
                <Field label="Sold Shares"><Input required type="number" min="0.000001" step="any" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} /></Field>
                <Field label="Sell Price"><Input required type="number" min="0.000001" step="any" value={form.tradePrice} onChange={(e) => update("tradePrice", e.target.value)} /></Field>
              </>
            ) : (
              <>
                <Field label={form.assetType === "option" ? "Underlying Ticker" : "Ticker Symbol"}>
                  <Input
                    required
                    value={form.symbol}
                    onChange={(e) => update("symbol", e.target.value)}
                    list={form.action === "buy" && form.assetType === "stock" ? "owned-stock-tickers" : undefined}
                    autoFocus
                  />
                  {form.action === "buy" && form.assetType === "stock" && (
                    <datalist id="owned-stock-tickers">
                      {ownedStocks.map((holding) => <option key={holding.symbol} value={holding.symbol}>{holding.company}</option>)}
                    </datalist>
                  )}
                </Field>

                <Field label="Position Status">
                  <div className="flex h-10 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm dark:border-white/10 dark:bg-white/[.03]">
                    <span className={matching ? "text-emerald-400" : "text-zinc-400"}>{matching ? `Existing · ${matching.shares} ${form.assetType === "option" ? "contracts" : "shares"}` : "New Position"}</span>
                  </div>
                </Field>

                {!matching && (
                  <Field label={form.assetType === "option" ? "Contract Details" : "Company Name"}>
                    <Input required value={form.company} onChange={(e) => update("company", e.target.value)} />
                  </Field>
                )}

                <Field label={form.assetType === "option" ? "Contracts" : "Shares"}>
                  <Input required type="number" min={form.assetType === "option" ? undefined : "0.000001"} step={form.assetType === "option" ? "1" : "any"} value={form.quantity} onChange={(e) => update("quantity", e.target.value)} />
                </Field>
                <Field label={form.assetType === "option" ? "Contract Cost" : "Share Price"}>
                  <Input required type="number" min="0.000001" step="any" value={form.tradePrice} onChange={(e) => update("tradePrice", e.target.value)} />
                </Field>

                {form.assetType === "option" && (
                  <>
                    <Field label="Option Type">
                      <select required value={matching?.optionType ?? form.optionType} onChange={(e) => update("optionType", e.target.value)} disabled={Boolean(matching)} className="field-select">
                        {optionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Option Expiry"><Input required type="date" value={matching?.optionExpiry ?? form.optionExpiry} onChange={(e) => update("optionExpiry", e.target.value)} disabled={Boolean(matching)} /></Field>
                  </>
                )}

                {!matching && (
                  <Field label="Sector">
                    <select required value={form.sector} onChange={(e) => update("sector", e.target.value)} className="field-select">
                      <option value="">Select Sector</option>
                      {sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
                    </select>
                  </Field>
                )}
              </>
            )}

            {form.assetType === "option" && form.quantity && form.tradePrice && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-200 sm:col-span-2">
                {form.quantity} contract{Math.abs(Number(form.quantity)) === 1 ? "" : "s"} represent {Math.abs(Number(form.quantity)) * 100} shares. Total position value: ${(Math.abs(Number(form.quantity)) * Number(form.tradePrice) * 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
              </div>
            )}
            {error && <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 sm:col-span-2">{error}</p>}
            <div className="mt-2 flex justify-end gap-3 sm:col-span-2">
              <Dialog.Close asChild><Button type="button" variant="outline">Cancel</Button></Dialog.Close>
              <Button type="submit">{form.action === "buy" ? "Complete Purchase" : "Complete Sale"}</Button>
            </div>
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
