"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BriefcaseBusiness, Check, ChevronDown, Coins, LayoutDashboard, Landmark, Layers3, PiggyBank, ReceiptText, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { portfolios, useActivePortfolio } from "@/components/portfolio/portfolio-context";

const items = [
  ["/", "Home", LayoutDashboard],
  ["/holdings", "Holdings", BriefcaseBusiness],
  ["/dca", "Simulator", Coins],
  ["/targets", "Targets", Target],
  ["/realized", "Realized", Landmark],
  ["/transactions", "Txns", ReceiptText],
  ["/savings-investments", "Performance", PiggyBank],
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const [portfolioOpen,setPortfolioOpen]=useState(false);
  const {active,activeId,setActiveId}=useActivePortfolio();

  return (
    <>
      <div className="fixed inset-x-2 bottom-[78px] z-50 lg:hidden">
        {portfolioOpen&&<div className="mb-2 rounded-2xl border border-zinc-200 bg-white/98 p-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/98">
          <div className="px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Switch Portfolio</div>
          {portfolios.map(portfolio=><button key={portfolio.id} type="button" onClick={()=>{setActiveId(portfolio.id);setPortfolioOpen(false)}} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-zinc-100 dark:hover:bg-white/[.05]">
            <div className={cn("grid size-8 place-items-center rounded-lg bg-zinc-100 text-[10px] font-bold text-zinc-500 dark:bg-white/[.06] dark:text-zinc-300",portfolio.id==="robinhood"&&"bg-emerald-400/15 text-emerald-500 dark:text-emerald-400")}>{portfolio.id==="all"?<Layers3 size={15}/>:portfolio.badge}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{portfolio.name}</div><div className="truncate text-xs text-zinc-500">{portfolio.subtitle}</div></div>
            {activeId===portfolio.id&&<Check size={15} className="text-emerald-400"/>}
          </button>)}
        </div>}
        <button type="button" onClick={()=>setPortfolioOpen(open=>!open)} className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white/95 px-3 py-2.5 text-left shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95">
          <div className="grid size-8 place-items-center rounded-xl bg-emerald-400/15 text-[10px] font-bold text-emerald-400">{activeId==="all"?<Layers3 size={15}/>:active.badge}</div>
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{active.name}</div><div className="truncate text-[11px] text-zinc-500">Tap To Switch Portfolio</div></div>
          <ChevronDown size={16} className={cn("text-zinc-500 transition",portfolioOpen&&"rotate-180")}/>
        </button>
      </div>
      <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-2 bottom-2 z-50 grid grid-cols-7 rounded-2xl border border-zinc-200 bg-white/95 px-1 py-1.5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95 lg:hidden"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      {items.map(([href, label, Icon]) => {
        const active = href === "/" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            href={href}
            key={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] leading-tight text-zinc-500 transition",
              "hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/[.06] dark:hover:text-white",
              active && "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
            )}
          >
            <Icon size={18} strokeWidth={active ? 2.4 : 2} />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
    </>
  );
}
