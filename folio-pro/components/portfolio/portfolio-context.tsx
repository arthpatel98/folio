"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePortfolioStore } from "@/store/portfolio-store";

export type PortfolioId = "robinhood" | "fidelity-401k" | "fidelity-roth" | "all";
export type Portfolio = { id: PortfolioId; name: string; subtitle: string; badge: string };

export const portfolios: Portfolio[] = [
  { id: "robinhood", name: "Robinhood", subtitle: "Taxable Brokerage", badge: "RH" },
  { id: "fidelity-401k", name: "Fidelity Roth IRA", subtitle: "Retirement", badge: "ROTH" },
  { id: "fidelity-roth", name: "Fidelity 401(k)", subtitle: "Retirement", badge: "401K" },
  { id: "all", name: "All Portfolios", subtitle: "Combined view", badge: "ALL" },
];

const STORAGE_KEY = "folio-active-portfolio";
const Context = createContext<{ activeId: PortfolioId; active: Portfolio; setActiveId: (id: PortfolioId) => void } | null>(null);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveIdState] = useState<PortfolioId>("robinhood");
  const setStorePortfolio = usePortfolioStore((state) => state.setActivePortfolio);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as PortfolioId | null;
    const resolved = saved && portfolios.some((portfolio) => portfolio.id === saved) ? saved : "robinhood";
    setActiveIdState(resolved);
    setStorePortfolio(resolved);
  }, [setStorePortfolio]);

  const setActiveId = (id: PortfolioId) => {
    setActiveIdState(id);
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
