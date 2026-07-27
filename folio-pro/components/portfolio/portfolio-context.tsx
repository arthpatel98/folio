"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { usePortfolioStore } from "@/store/portfolio-store";
import { PORTFOLIO_ID_SCHEMA_VERSION, swapLegacyFidelityId } from "@/lib/portfolio-id-migration";

export type PortfolioId = "robinhood" | "fidelity-401k" | "fidelity-roth" | "all";
export type Portfolio = { id: PortfolioId; name: string; subtitle: string; badge: string };

export const portfolios: Portfolio[] = [
  { id: "robinhood", name: "Robinhood", subtitle: "Taxable Brokerage", badge: "RH" },
  { id: "fidelity-401k", name: "Fidelity 401(k)", subtitle: "Retirement", badge: "401K" },
  { id: "fidelity-roth", name: "Fidelity Roth IRA", subtitle: "Retirement", badge: "ROTH" },
  { id: "all", name: "All Portfolios", subtitle: "Combined view", badge: "ALL" },
];

const STORAGE_KEY = "folio-active-portfolio";
const ID_MIGRATION_KEY = "folio-portfolio-id-schema-version";
const Context = createContext<{ activeId: PortfolioId; active: Portfolio; setActiveId: (id: PortfolioId) => void } | null>(null);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const activeId = usePortfolioStore((state) => state.activePortfolioId);
  const setStorePortfolio = usePortfolioStore((state) => state.setActivePortfolio);
  const hasHydrated = usePortfolioStore((state) => state.hasHydrated);
  const initialized = useRef(false);

  useEffect(() => {
    if (!hasHydrated || initialized.current) return;
    const rawSaved = window.localStorage.getItem(STORAGE_KEY) as PortfolioId | null;
    const needsIdMigration = window.localStorage.getItem(ID_MIGRATION_KEY) !== String(PORTFOLIO_ID_SCHEMA_VERSION);
    const saved = (needsIdMigration ? swapLegacyFidelityId(rawSaved) : rawSaved) as PortfolioId | null;
    if (needsIdMigration) {
      if (saved) window.localStorage.setItem(STORAGE_KEY, saved);
      window.localStorage.setItem(ID_MIGRATION_KEY, String(PORTFOLIO_ID_SCHEMA_VERSION));
    }
    const resolved = saved && portfolios.some((portfolio) => portfolio.id === saved) ? saved : "robinhood";
    initialized.current = true;
    setStorePortfolio(resolved);
  }, [hasHydrated, setStorePortfolio]);

  const setActiveId = (id: PortfolioId) => {
    // The Zustand portfolio store is the single source of truth. The sidebar/context no
    // longer keeps a second active-portfolio state that can drift during rapid switching.
    setStorePortfolio(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  };
  const active = useMemo(() => portfolios.find((portfolio) => portfolio.id === activeId) ?? portfolios[0], [activeId]);
  return <Context.Provider value={{ activeId, active, setActiveId }}>{children}</Context.Provider>;
}

export function useActivePortfolio() {
  const value = useContext(Context);
  if (!value) throw new Error("useActivePortfolio must be used within PortfolioProvider");
  return value;
}
