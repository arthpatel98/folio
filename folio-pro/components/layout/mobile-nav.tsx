"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, Coins, LayoutDashboard, Landmark, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  ["/", "Home", LayoutDashboard],
  ["/holdings", "Holdings", BriefcaseBusiness],
  ["/dca", "Simulator", Coins],
  ["/targets", "Targets", Target],
  ["/realized", "Realized", Landmark],
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-2 bottom-2 z-50 grid grid-cols-5 rounded-2xl border border-zinc-200 bg-white/95 px-1 py-1.5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95 lg:hidden"
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
  );
}
