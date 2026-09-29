"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, ChevronDown, Search, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function Topbar({ reserveSidebarToggle = false }: { reserveSidebarToggle?: boolean }) {
  return <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-4 text-zinc-900 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70 dark:text-zinc-100 md:px-7">
    <div className={cn("flex-1", reserveSidebarToggle && "lg:ml-16")} />
    <div className="ml-auto flex items-center gap-3">
      <button className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-white/[.03]"><Bell size={17}/></button>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild><button className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-1.5 pr-3 dark:border-white/10 dark:bg-white/[.03]"><div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-300 to-cyan-400 text-xs font-bold text-zinc-950">AP</div><span className="hidden text-sm sm:block">Arth</span><ChevronDown size={14} className="text-zinc-500"/></button></DropdownMenu.Trigger>
        <DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-56 rounded-xl border border-zinc-200 bg-white p-2 text-sm text-zinc-800 shadow-2xl dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200">
          <DropdownMenu.Item asChild><Link href="/settings" className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 outline-none hover:bg-zinc-100 dark:hover:bg-white/[.06]"><Settings size={16}/>Settings</Link></DropdownMenu.Item>
        </DropdownMenu.Content></DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  </header>;
}
