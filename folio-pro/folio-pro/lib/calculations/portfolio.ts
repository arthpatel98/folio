import { Holding, Transaction, TaxLot } from "@/types/portfolio";

export const contractMultiplier = (holding: Pick<Holding, "assetType">) => holding.assetType === "option" ? 100 : 1;

export function holdingMetrics(h: Holding) {
  const multiplier = contractMultiplier(h);
  const marketValue = h.shares * h.currentPrice * multiplier;
  const costBasis = h.shares * h.averageCost * multiplier;
  const totalGain = marketValue - costBasis;
  const todayGain = h.shares * (h.currentPrice - h.previousClose) * multiplier;
  const rawTodayPct = h.previousClose ? (h.currentPrice - h.previousClose) / h.previousClose * 100 : 0;
  return {
    marketValue,
    costBasis,
    totalGain,
    totalGainPct: costBasis ? (totalGain / costBasis) * 100 : 0,
    todayGain,
    todayPct: rawTodayPct,
  };
}


export function optionCollateral(holdings: Holding[], asOf = new Date()) {
  const localToday = new Date(asOf.getTime() - asOf.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

  return holdings.reduce((total, holding) => {
    if (holding.assetType !== "option" || holding.optionType !== "sell-put" || holding.shares === 0) return total;
    if (holding.optionExpiry && holding.optionExpiry < localToday) return total;

    const strikeFromName = holding.company.match(/\$(\d+(?:\.\d+)?)\s+Put\b/i);
    const strike = Number.isFinite(holding.optionStrike) && (holding.optionStrike ?? 0) > 0
      ? holding.optionStrike!
      : strikeFromName
        ? Number(strikeFromName[1])
        : 0;

    if (!Number.isFinite(strike) || strike <= 0) return total;
    return total + Math.abs(holding.shares) * strike * 100;
  }, 0);
}

export function portfolioSummary(holdings: Holding[], cash = 14820.55) {
  const values = holdings.map(holdingMetrics);
  const invested = values.reduce((s, x) => s + x.marketValue, 0);
  const cost = values.reduce((s, x) => s + x.costBasis, 0);
  const today = values.reduce((s, x) => s + x.todayGain, 0);
  return {
    value: invested + cash,
    invested,
    cash,
    buyingPower: cash,
    totalGain: invested - cost,
    totalGainPct: cost ? (invested - cost) / cost * 100 : 0,
    today,
    todayPct: (invested - today) ? today / (invested - today) * 100 : 0,
    unrealized: invested - cost,
  };
}

export function calculateFIFO(transactions: Transaction[]) {
  const lots: TaxLot[] = [];
  let realized = 0;
  for (const tx of [...transactions].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!tx.symbol || !tx.quantity || !tx.price) continue;
    const multiplier = tx.assetType === "option" ? 100 : 1;
    if (tx.type === "buy") lots.push({ id: tx.id, symbol: tx.symbol, openedAt: tx.date, quantity: tx.quantity, remaining: tx.quantity, costPerShare: tx.price * multiplier });
    if (tx.type === "sell") {
      let remaining = tx.quantity;
      for (const lot of lots.filter((l) => l.symbol === tx.symbol && l.remaining > 0)) {
        const used = Math.min(lot.remaining, remaining);
        realized += used * (tx.price * multiplier - lot.costPerShare) - tx.fees * (used / tx.quantity);
        lot.remaining -= used;
        remaining -= used;
        if (!lot.remaining) {
          lot.closedAt = tx.date;
          lot.proceeds = used * tx.price * multiplier;
          lot.realizedGain = used * (tx.price * multiplier - lot.costPerShare);
        }
        if (!remaining) break;
      }
    }
  }
  return { lots, realized };
}
