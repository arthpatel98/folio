"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, BriefcaseBusiness, Calculator, Check, ChevronDown, Coins, LayoutDashboard, Landmark, Layers3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { portfolios, useActivePortfolio } from "@/components/portfolio/portfolio-context";

const items=[['/','Overview',LayoutDashboard],['/holdings','Holdings',BriefcaseBusiness],['/realized','Realized P/L',Landmark],['/analytics','Analytics',BarChart3],['/calculator','Profit / Loss Calculator',Calculator],['/dca','DCA Calculator',Coins]] as const;

export function Sidebar(){
  const path=usePathname();
  const [open,setOpen]=useState(false);
  const {active,activeId,setActiveId}=useActivePortfolio();
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-zinc-200 bg-white/95 p-4 text-zinc-900 dark:border-white/10 dark:bg-zinc-950/90 dark:text-zinc-100 backdrop-blur-xl lg:block">
    <div className="mb-4 flex items-center gap-3 px-2 py-3"><img src="/finance-logo.png" alt="Finance" className="size-10 rounded-2xl object-cover shadow-glow"/><div className="font-semibold">Arth’s Portfolios</div></div>
    <div className="relative mb-5">
      <button onClick={()=>setOpen(!open)} className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/[.045] p-3 text-left transition hover:bg-white/[.07]">
        <div className="grid size-9 place-items-center rounded-xl bg-emerald-400/15 text-xs font-bold text-emerald-400">{active.badge}</div>
        <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{active.name}</div><div className="truncate text-xs text-zinc-500">{active.subtitle}</div></div><ChevronDown size={16} className={cn("text-zinc-500 transition",open&&"rotate-180")}/>
      </button>
      {open&&<div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-white/10 bg-white p-2 dark:bg-zinc-950 shadow-2xl">
        <div className="px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-zinc-600">Switch portfolio</div>
        {portfolios.map((portfolio)=><button key={portfolio.id} onClick={()=>{setActiveId(portfolio.id);setOpen(false)}} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-zinc-100 dark:hover:bg-white/[.05]">
          <div className={cn("grid size-8 place-items-center rounded-lg bg-white/[.06] text-[10px] font-bold text-zinc-300",portfolio.id==='robinhood'&&"bg-emerald-400/15 text-emerald-400")}>{portfolio.id==='all'?<Layers3 size={15}/>:portfolio.badge}</div>
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-sm"><span className="truncate">{portfolio.name}</span></div><div className="text-xs text-zinc-600">{portfolio.subtitle}</div></div>{activeId===portfolio.id&&<Check size={15} className="text-emerald-400"/>}
        </button>)}
      </div>}
    </div>
    <nav className="space-y-1">{items.map(([href,label,Icon])=><Link key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-white/[.05] hover:text-white",path===href&&"bg-white/[.07] text-white")}><Icon size={17}/>{label}</Link>)}</nav>

  </aside>
}
