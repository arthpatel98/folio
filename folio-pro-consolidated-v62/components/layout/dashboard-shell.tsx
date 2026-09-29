"use client";

import { useEffect, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PortfolioGate } from "@/components/portfolio/portfolio-gate";
import { cn } from "@/lib/utils";

const SIDEBAR_KEY="folio-desktop-sidebar-open";

export function DashboardShell({children}:{children:React.ReactNode}){
  const [sidebarOpen,setSidebarOpen]=useState(true);

  useEffect(()=>{
    try{
      const saved=window.localStorage.getItem(SIDEBAR_KEY);
      if(saved!==null)setSidebarOpen(saved!=="false");
    }catch{}
  },[]);

  const setOpen=(open:boolean)=>{
    setSidebarOpen(open);
    try{window.localStorage.setItem(SIDEBAR_KEY,String(open));}catch{}
  };

  return <>
    {sidebarOpen&&<Sidebar onCollapse={()=>setOpen(false)}/>}
    {!sidebarOpen&&<button type="button" onClick={()=>setOpen(true)} aria-label="Show Sidebar" title="Show Sidebar" className="fixed left-3 top-3 z-50 hidden size-10 place-items-center rounded-xl border border-zinc-200 bg-white/95 text-zinc-600 shadow-lg backdrop-blur-xl transition hover:bg-zinc-100 hover:text-zinc-950 dark:border-white/10 dark:bg-zinc-950/95 dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-white lg:grid"><PanelLeftOpen size={18}/></button>}
    <div className={cn("min-h-screen transition-[padding] duration-200",sidebarOpen?"lg:pl-72":"lg:pl-0")}>
      <Topbar reserveSidebarToggle={!sidebarOpen}/>
      <main className={cn("mx-auto px-3 py-4 pb-20 transition-[max-width] duration-200 sm:px-4 md:p-7",sidebarOpen?"max-w-[1600px]":"max-w-[1840px]")}>
        <PortfolioGate>{children}</PortfolioGate>
      </main>
    </div>
    <MobileNav/>
  </>;
}
