"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, ChevronDown, Laptop, Moon, Search, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  return <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-4 text-zinc-900 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70 dark:text-zinc-100 md:px-7">
    <div className="relative hidden max-w-sm flex-1 md:block"><Search className="absolute left-3 top-2.5 text-zinc-500" size={17}/><Input className="pl-9" placeholder="Search stocks, transactions, insights..."/></div>
    <div className="ml-auto flex items-center gap-3">
      <button className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-white/[.03]"><Bell size={17}/></button>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild><button className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-1.5 pr-3 dark:border-white/10 dark:bg-white/[.03]"><div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-300 to-cyan-400 text-xs font-bold text-zinc-950">AP</div><span className="hidden text-sm sm:block">Arth</span><ChevronDown size={14} className="text-zinc-500"/></button></DropdownMenu.Trigger>
        <DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-56 rounded-xl border border-zinc-200 bg-white p-2 text-sm text-zinc-800 shadow-2xl dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200">
          <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Appearance</div>
          <DropdownMenu.Item onSelect={()=>setTheme("light")} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 outline-none hover:bg-zinc-100 dark:hover:bg-white/[.06]"><Sun size={16}/>Light {theme === "light" && <span className="ml-auto">✓</span>}</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={()=>setTheme("dark")} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 outline-none hover:bg-zinc-100 dark:hover:bg-white/[.06]"><Moon size={16}/>Dark {theme === "dark" && <span className="ml-auto">✓</span>}</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={()=>setTheme("system")} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 outline-none hover:bg-zinc-100 dark:hover:bg-white/[.06]"><Laptop size={16}/>System {theme === "system" && <span className="ml-auto">✓</span>}</DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-zinc-200 dark:bg-white/10"/>
          <DropdownMenu.Item asChild><Link href="/settings" className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 outline-none hover:bg-zinc-100 dark:hover:bg-white/[.06]"><Settings size={16}/>Settings</Link></DropdownMenu.Item>
        </DropdownMenu.Content></DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  </header>;
}
