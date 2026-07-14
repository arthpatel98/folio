"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { FormEvent, useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePortfolioStore } from "@/store/portfolio-store";
import { toast } from "sonner";

export function EditCashDialog() {
  const cash = usePortfolioStore((state) => state.cash);
  const setCash = usePortfolioStore((state) => state.setCash);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(cash.toFixed(2));
  const [error, setError] = useState("");

  useEffect(() => { if (!open) setValue(cash.toFixed(2)); }, [cash, open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = Number(value);
    if (!Number.isFinite(next) || next < 0) { setError("Enter a valid cash amount of zero or more."); return; }
    setCash(Number(next.toFixed(2)));
    toast.success("Cash Balance Updated Successfully");
    setError("");
    setOpen(false);
  }

  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-white/10 dark:hover:bg-white/10" aria-label="Edit cash"><Pencil size={14} /></button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
      <div className="flex items-start justify-between"><div><Dialog.Title className="text-xl font-semibold text-white">Edit Cash Balance</Dialog.Title><Dialog.Description className="mt-1 text-sm text-zinc-400">Cash Is Included in Your Total Portfolio Value.</Dialog.Description></div><Dialog.Close className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"><X size={18} /></Dialog.Close></div>
      <form onSubmit={submit} className="mt-6 space-y-4"><label className="space-y-2 text-sm font-medium text-zinc-300"><span>Cash Amount</span><Input type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} autoFocus /></label>{error && <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}<div className="flex justify-end gap-3"><Dialog.Close asChild><Button type="button" variant="outline">Cancel</Button></Dialog.Close><Button type="submit">Save Cash</Button></div></form>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
