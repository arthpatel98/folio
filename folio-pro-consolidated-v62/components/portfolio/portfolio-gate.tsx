"use client";

import { usePortfolioStore } from "@/store/portfolio-store";

export function PortfolioGate({ children }: { children: React.ReactNode }) {
  const hasHydrated = usePortfolioStore((state) => state.hasHydrated);
  const cloudReady = usePortfolioStore((state) => state.cloudReady);

  if (!hasHydrated || !cloudReady) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          Loading Portfolio Data…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
