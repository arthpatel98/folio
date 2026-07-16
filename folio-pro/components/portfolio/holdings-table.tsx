"use client";

import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  ColumnSizingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, BriefcaseBusiness, Trash2 } from "lucide-react";
import { AssetType, Holding, OptionType } from "@/types/portfolio";
import { holdingMetrics } from "@/lib/calculations/portfolio";
import { cn, money } from "@/lib/utils";
import { EditHoldingDialog } from "@/components/portfolio/edit-holding-dialog";
import { usePortfolioStore } from "@/store/portfolio-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function SignedMoney({ value }: { value: number }) {
  return <span className={cn(value >= 0 ? "text-emerald-500" : "text-red-500")}>{value < 0 ? "-" : ""}{money(Math.abs(value))}</span>;
}

function SignedPercent({ value }: { value: number }) {
  return <span className={cn("text-sm", value >= 0 ? "text-emerald-500" : "text-red-500")}>{value.toFixed(2)}%</span>;
}

const optionTypeLabels: Record<OptionType, string> = {
  "buy-call": "Buy Call",
  "sell-call": "Sell Call",
  "buy-put": "Buy Put",
  "sell-put": "Sell Put",
};
const optionTypeClasses: Record<OptionType, string> = {
  "buy-call": "border-emerald-500/25 bg-emerald-500/10 text-emerald-500",
  "sell-call": "border-blue-500/25 bg-blue-500/10 text-blue-500",
  "buy-put": "border-amber-500/25 bg-amber-500/10 text-amber-500",
  "sell-put": "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-500",
};
function daysToExpiry(expiry?: string) {
  if (!expiry) return null;
  const expiryDate = new Date(`${expiry}T23:59:59`);
  if (Number.isNaN(expiryDate.getTime())) return null;
  return Math.ceil((expiryDate.getTime() - Date.now()) / 86_400_000);
}

export function HoldingsTable({
  data,
  title = "Holdings",
  assetType = "stock",
  portfolioValue,
}: {
  data: Holding[];
  title?: string;
  assetType?: AssetType;
  portfolioValue?: number;
}) {
  const removeHolding = usePortfolioStore((state) => state.removeHolding);
  const allocationBase = portfolioValue ?? data.reduce((sum, holding) => sum + holdingMetrics(holding).marketValue, 0);
  const sortStorageKey = `folio-holdings-sort-${assetType}`;
  const [sorting, setSorting] = useState<SortingState>([{ id: "marketValue", desc: true }]);
  const [pendingDelete, setPendingDelete] = useState<Holding | null>(null);
  const storageKey = `folio-column-widths-${assetType}`;
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  useEffect(() => {
    try { const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}"); setColumnSizing({ ...saved, Symbol: Math.max(Number(saved.Symbol) || 0, 280) }); } catch { setColumnSizing({ Symbol: 300 }); }
    try {
      const savedSort = window.localStorage.getItem(sortStorageKey);
      if (savedSort) setSorting(JSON.parse(savedSort));
    } catch {}
  }, [storageKey, sortStorageKey]);
  useEffect(() => { window.localStorage.setItem(storageKey, JSON.stringify(columnSizing)); }, [columnSizing, storageKey]);
  useEffect(() => { window.localStorage.setItem(sortStorageKey, JSON.stringify(sorting)); }, [sorting, sortStorageKey]);

  const columns = useMemo<ColumnDef<Holding>[]>(() => [
    {
      accessorKey: "Symbol",
      size: 300,
      minSize: 280,
      header: assetType === "stock" ? "Ticker" : "Ticker",
      cell: ({ row }) => (
        <div className="min-w-[210px]">
          <Link href={`/positions/${row.original.symbol}`} className="text-base font-semibold tracking-wide text-zinc-900 transition hover:text-emerald-600 dark:text-white">
            {row.original.symbol}
          </Link>
          <div className="mt-0.5 max-w-[270px] truncate text-sm text-zinc-500">{row.original.company}</div>
        </div>
      ),
    },
    ...(assetType === "option" ? [
      {
        accessorKey: "optionType",
        header: "Type",
        cell: ({ row }: any) => {
          const type = (row.original.optionType ?? "buy-call") as OptionType;
          return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", optionTypeClasses[type])}>{optionTypeLabels[type]}</span>;
        },
      },
      {
        accessorKey: "sector",
        header: "Sector",
        cell: ({ getValue }: any) => <span className="inline-block max-w-[210px] whitespace-normal text-left text-sm leading-5 text-zinc-600 dark:text-zinc-300">{getValue() as string || "—"}</span>,
      },
      {
        accessorKey: "optionExpiry",
        header: "Expiry Date",
        cell: ({ getValue }: any) => {
          const value = getValue() as string;
          return value ? new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
        },
      },
      {
        id: "dte",
        header: "Days to Expiry",
        accessorFn: (holding: Holding) => daysToExpiry(holding.optionExpiry) ?? -99999,
        cell: ({ row }: any) => {
          const dte = daysToExpiry(row.original.optionExpiry);
          if (dte === null) return <span className="text-zinc-500">—</span>;
          const type = (row.original.optionType ?? "buy-call") as OptionType;
          const urgent = type === "buy-call" || type === "buy-put" ? dte <= 60 : dte <= 7;
          return <span className={cn("font-medium", dte < 0 || urgent ? "text-red-500" : "text-zinc-700 dark:text-zinc-200")}>{dte < 0 ? `${Math.abs(dte)}d expired` : `${dte} days`}</span>;
        },
      },
    ] as ColumnDef<Holding>[] : []),
    ...(assetType === "stock" ? [{
      accessorKey: "sector",
      header: "Sector",
      cell: ({ getValue }: any) => <span className="inline-block max-w-[210px] whitespace-normal text-left text-sm leading-5 text-zinc-600 dark:text-zinc-300">{getValue() as string || "—"}</span>,
    }] as ColumnDef<Holding>[] : []),
    {
      accessorKey: "currentPrice",
      header: "Current Price",
      cell: ({ getValue }) => <span className="font-medium">{money(getValue() as number)}</span>,
    },
    {
      id: "dayChange",
      header: "Day Change",
      accessorFn: (holding) => holding.currentPrice - holding.previousClose,
      cell: ({ row }) => {
        const metrics = holdingMetrics(row.original);
        return <div className="space-y-1 text-right"><div className="text-base"><SignedMoney value={row.original.currentPrice - row.original.previousClose} /></div><SignedPercent value={metrics.todayPct} /></div>;
      },
    },
    {
      id: "dayReturn",
      header: "Day Return",
      accessorFn: (holding) => holdingMetrics(holding).todayGain,
      cell: ({ row }) => {
        const metrics = holdingMetrics(row.original);
        const shortOption = assetType === "option" && (row.original.optionType === "sell-call" || row.original.optionType === "sell-put");
        return <div className="space-y-1 text-right"><div className="text-base"><SignedMoney value={metrics.todayGain} /></div><SignedPercent value={shortOption ? -metrics.todayPct : metrics.todayPct} /></div>;
      },
    },
    {
      id: "totalReturn",
      header: "Total Return",
      accessorFn: (holding) => holdingMetrics(holding).totalGain,
      cell: ({ row }) => {
        const metrics = holdingMetrics(row.original);
        const shortOption = assetType === "option" && (row.original.optionType === "sell-call" || row.original.optionType === "sell-put");
        return <div className="space-y-1 text-right"><div className="text-base"><SignedMoney value={metrics.totalGain} /></div><SignedPercent value={shortOption ? -metrics.totalGainPct : metrics.totalGainPct} /></div>;
      },
    },
    {
      accessorKey: "shares",
      header: assetType === "stock" ? "Shares" : "Contracts",
      cell: ({ getValue }) => <span>{new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(getValue<number>())}</span>,
    },
    ...(assetType === "option" ? [{
      accessorKey: "averageCost",
      header: "Contract Cost",
      cell: ({ getValue }: any) => <span className="font-medium">{money(getValue() as number)}</span>,
    }] as ColumnDef<Holding>[] : []),
    ...(assetType === "stock" ? [{ accessorKey: "averageCost", header: "Avg. Cost", cell: ({ getValue }: any) => money(getValue() as number) }] as ColumnDef<Holding>[] : []),
    { id: "totalCost", header: "Total Cost", accessorFn: (holding) => holdingMetrics(holding).costBasis, cell: ({ row }) => money(holdingMetrics(row.original).costBasis) },
    {
      id: "marketValue",
      header: "Current Value",
      accessorFn: (holding) => holdingMetrics(holding).marketValue,
      cell: ({ row }) => {
        const value = holdingMetrics(row.original).marketValue;
        const allocation = allocationBase ? Math.abs(value / allocationBase) * 100 : 0;
        return <div className="space-y-1 text-right"><div className="text-base font-medium">{money(value)}</div><div className="text-sm text-zinc-500">{allocation.toFixed(2)}%</div></div>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <EditHoldingDialog holding={row.original} />
          <button type="button" onClick={() => setPendingDelete(row.original)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/20 text-red-500 transition hover:bg-red-500/10" aria-label={`Remove ${row.original.symbol}`} title={`Remove ${row.original.symbol}`}>
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ], [allocationBase, assetType]);

  const subtotal = useMemo(() => {
    const totals = data.reduce((acc, holding) => {
      const metrics = holdingMetrics(holding);
      acc.marketValue += metrics.marketValue;
      acc.costBasis += metrics.costBasis;
      acc.todayGain += metrics.todayGain;
      return acc;
    }, { marketValue: 0, costBasis: 0, todayGain: 0 });

    return {
      ...totals,
      todayPct: totals.marketValue - totals.todayGain ? (totals.todayGain / (totals.marketValue - totals.todayGain)) * 100 : 0,
      totalGain: totals.marketValue - totals.costBasis,
      totalGainPct: totals.costBasis ? ((totals.marketValue - totals.costBasis) / totals.costBasis) * 100 : 0,
    };
  }, [data]);

  const table = useReactTable({ data, columns, defaultColumn: { size: 160, minSize: 80, maxSize: 600 }, state: { sorting, columnSizing }, onSortingChange: setSorting, onColumnSizingChange: setColumnSizing, columnResizeMode: "onChange", getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });

  return (
    <>
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950/30">
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-3 sm:px-5 sm:py-4 dark:border-white/5">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500"><BriefcaseBusiness size={19} /></div><div><h2 className="font-semibold">{title}</h2><p className="text-xs text-zinc-500">{data.length} Open {data.length === 1 ? "Position" : "Positions"}</p></div></div>
      </div>
      <div className="relative isolate -mx-px overflow-x-auto overscroll-x-contain pb-1">
        <table className="table-fixed text-left text-sm" style={{ width: table.getTotalSize(), minWidth: assetType === "option" ? 1760 : 1540 }}>
          <thead className="relative z-10 bg-slate-200 text-zinc-600 dark:bg-slate-800 dark:text-zinc-300">
            {table.getHeaderGroups().map((headerGroup) => <tr key={headerGroup.id}>{headerGroup.headers.map((header, index) => {
              const sorted = header.column.getIsSorted();
              const rightAligned = index > 0 && header.column.id !== "sector";
              const headerWidth = index === 0 ? Math.max(header.getSize(), 220) : header.getSize();
              return <th key={header.id} style={{ width: headerWidth, minWidth: headerWidth, maxWidth: headerWidth }} className={cn("relative z-0 h-[56px] overflow-hidden whitespace-nowrap bg-slate-200 px-3 text-xs sm:h-[68px] sm:px-6 sm:text-sm font-semibold transition hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700", rightAligned && "text-right", index === 0 && "sticky left-0 z-50 bg-slate-200 shadow-[10px_0_14px_-12px_rgba(0,0,0,.75)] dark:bg-slate-800") }>
                <button type="button" onClick={header.column.getToggleSortingHandler()} className={cn("inline-flex w-full items-center gap-2", rightAligned && "justify-end")}>{flexRender(header.column.columnDef.header, header.getContext())}{sorted === "asc" ? <ArrowUp size={15} className="text-emerald-500" /> : sorted === "desc" ? <ArrowDown size={15} className="text-emerald-500" /> : <ArrowUpDown size={14} className="opacity-25" />}</button>
                <div onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()} className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-emerald-500/50" title="Drag to resize column" />
              </th>;
            })}</tr>)}
          </thead>
          <tbody>{table.getRowModel().rows.map((row) => <tr key={row.id} className="group h-[88px] sm:h-[112px] border-b border-zinc-200/80 bg-white text-zinc-900 transition last:border-0 hover:bg-zinc-50 dark:border-white/[.06] dark:bg-zinc-950/20 dark:text-zinc-100 dark:hover:bg-white/[.025]">
            {row.getVisibleCells().map((cell, index) => {
              const cellWidth = index === 0 ? Math.max(cell.column.getSize(), 220) : cell.column.getSize();
              return <td key={cell.id} style={{ width: cellWidth, minWidth: cellWidth, maxWidth: cellWidth }} className={cn("whitespace-nowrap px-6 py-5 text-base", index > 0 && cell.column.id !== "sector" && "text-right", cell.column.id === "sector" && "text-left", index === 0 && "sticky left-0 z-40 bg-white shadow-[10px_0_14px_-12px_rgba(0,0,0,.65)] group-hover:bg-zinc-50 dark:bg-zinc-950 dark:group-hover:bg-zinc-900") }>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>;
            })}
          </tr>)}</tbody>
          {!!table.getRowModel().rows.length && <tfoot>
            <tr className="h-[96px] border-t-2 border-zinc-300 bg-zinc-100/95 font-semibold text-zinc-900 dark:border-white/15 dark:bg-white/[.055] dark:text-zinc-100">
              {table.getVisibleLeafColumns().map((column, index) => {
                const rightAligned = index > 0 && column.id !== "sector";
                let content: React.ReactNode = null;
                if (index === 0) content = <div><div className="text-base">{title} Subtotal</div><div className="mt-1 text-xs font-normal text-zinc-500">{data.length} Open {data.length === 1 ? "Position" : "Positions"}</div></div>;
                if (column.id === "dayReturn") content = <div className="space-y-1"><div className="text-base"><SignedMoney value={subtotal.todayGain} /></div><SignedPercent value={subtotal.todayPct} /></div>;
                if (column.id === "totalReturn") content = <div className="space-y-1"><div className="text-base"><SignedMoney value={subtotal.totalGain} /></div><SignedPercent value={subtotal.totalGainPct} /></div>;
                if (column.id === "totalCost") content = money(subtotal.costBasis);
                if (column.id === "marketValue") content = <div className="space-y-1"><div className="text-base">{money(subtotal.marketValue)}</div><div className="text-sm font-normal text-zinc-500">{allocationBase ? (Math.abs(subtotal.marketValue / allocationBase) * 100).toFixed(2) : "0.00"}%</div></div>;
                const footerWidth = index === 0 ? Math.max(column.getSize(), 300) : column.getSize();
                return <td key={column.id} style={{ width: footerWidth, minWidth: footerWidth, maxWidth: footerWidth }} className={cn("whitespace-nowrap px-6 py-5 text-base", rightAligned && "text-right", column.id === "sector" && "text-left", index === 0 && "sticky left-0 z-40 bg-zinc-100 shadow-[10px_0_14px_-12px_rgba(0,0,0,.65)] dark:bg-zinc-900")}>{content}</td>;
              })}
            </tr>
          </tfoot>}
        </table>
        {!table.getRowModel().rows.length && <div className="px-6 py-14 text-center text-sm text-zinc-500">No {title.toLowerCase()} match your search.</div>}
      </div>
    </section>
    <Dialog.Root open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-2xl dark:border-white/10 dark:bg-zinc-950">
          <Dialog.Title className="text-xl font-semibold">Remove Position?</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-zinc-500">
            {pendingDelete ? `Remove ${pendingDelete.symbol} From Your ${assetType === "option" ? "Options" : "Stocks"}?` : ""}
          </Dialog.Description>
          <div className="mt-6 flex justify-center gap-3">
            <Dialog.Close asChild><Button type="button" variant="outline">Cancel</Button></Dialog.Close>
            <Button type="button" className="bg-red-500 text-white hover:bg-red-600" onClick={() => {
              if (!pendingDelete) return;
              removeHolding(pendingDelete.symbol, assetType);
              toast.success("Position Removed Successfully");
              setPendingDelete(null);
            }}>Remove Position</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    </>
  );
}
