import type { Holding, Transaction } from "@/types/portfolio";

export const RECOVERY_VERSION = "2026-07-18-robinhood-roth-v1";

export const KNOWN_ROBINHOOD_HOLDINGS: Holding[] = [
  {
    "assetType": "stock",
    "symbol": "VSTL",
    "company": "Defiance Daily Target 2X Long VST ETF",
    "shares": 215.67,
    "averageCost": 55.56,
    "currentPrice": 27.06,
    "previousClose": 28.39,
    "dividendYield": 0,
    "sector": "Utilities / Energy",
    "updatedAt": "Just now"
  },
  {
    "assetType": "option",
    "symbol": "ROBN",
    "company": "ROBN $26 Put Exp Aug 21, 2026",
    "shares": -1,
    "averageCost": 2.6,
    "currentPrice": 4.095000000000001,
    "previousClose": 2.6,
    "dividendYield": 0,
    "sector": "Crypto / Bitcoin",
    "optionType": "sell-put",
    "optionExpiry": "2026-08-21",
    "updatedAt": "2026-07-18T03:02:03.486Z"
  },
  {
    "assetType": "option",
    "symbol": "ROBN",
    "company": "ROBN $41 Call Exp Aug 21, 2026",
    "shares": -1,
    "averageCost": 2.05,
    "currentPrice": 1.9,
    "previousClose": 5.5,
    "dividendYield": 0,
    "sector": "Crypto / Bitcoin",
    "optionType": "sell-call",
    "optionExpiry": "2026-08-21",
    "updatedAt": "2026-07-18T03:02:03.486Z"
  },
  {
    "assetType": "stock",
    "symbol": "AMBA",
    "company": "Ambarella",
    "shares": 17,
    "averageCost": 60.4,
    "currentPrice": 61.91,
    "previousClose": 63.275,
    "dividendYield": 0,
    "sector": "Cloud / AI / Software",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "stock",
    "symbol": "NBIS",
    "company": "Nebius Group",
    "shares": 37,
    "averageCost": 200.5264864864865,
    "currentPrice": 177.98,
    "previousClose": 171.68,
    "dividendYield": 0,
    "sector": "AI Data Centers",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "stock",
    "symbol": "SITM",
    "company": "Sitime",
    "shares": 7,
    "averageCost": 581.3628571428571,
    "currentPrice": 556.035,
    "previousClose": 564.85,
    "dividendYield": 0,
    "sector": "Semiconductors",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "stock",
    "symbol": "ASTS",
    "company": "AST SpaceMobile",
    "shares": 80,
    "averageCost": 62.0125,
    "currentPrice": 57.78,
    "previousClose": 55.02,
    "dividendYield": 0,
    "sector": "Space",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "stock",
    "symbol": "CRWV",
    "company": "CoreWeave",
    "shares": 37,
    "averageCost": 75.2918918918919,
    "currentPrice": 73.15,
    "previousClose": 72.955,
    "dividendYield": 0,
    "sector": "AI Data Centers",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "stock",
    "symbol": "SOXS",
    "company": "Direxion Daily Semiconductor Bear 3X ETF",
    "shares": 2,
    "averageCost": 2313,
    "currentPrice": 55.03,
    "previousClose": 52.105,
    "dividendYield": 0,
    "sector": "Semiconductors",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "stock",
    "symbol": "PLTR",
    "company": "Palantir Technologies",
    "shares": 38,
    "averageCost": 120.77000000000001,
    "currentPrice": 132.37,
    "previousClose": 134.46,
    "dividendYield": 0,
    "sector": "AI / Enterprise Software",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "stock",
    "symbol": "DUOL",
    "company": "Duolingo",
    "shares": 3,
    "averageCost": 478.55,
    "currentPrice": 133.845,
    "previousClose": 128.82,
    "dividendYield": 0,
    "sector": "Education Technology",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "option",
    "symbol": "NVDA",
    "company": "NVDA $220 Call Exp June 17, 2027",
    "shares": 3,
    "averageCost": 38.35,
    "currentPrice": 30.22,
    "previousClose": 31.8,
    "dividendYield": 0,
    "sector": "Semiconductors",
    "optionType": "buy-call",
    "optionExpiry": "2027-06-17",
    "updatedAt": "2026-07-18T03:02:03.486Z"
  },
  {
    "assetType": "option",
    "symbol": "GOOGL",
    "company": "GOOGL $390 Call Exp Mar 19, 2027",
    "shares": 1,
    "averageCost": 54,
    "currentPrice": 28.485,
    "previousClose": 40.95,
    "dividendYield": 0,
    "sector": "Digital Advertising / AI",
    "optionType": "buy-call",
    "optionExpiry": "2027-03-19",
    "updatedAt": "2026-07-18T03:02:03.486Z"
  },
  {
    "assetType": "stock",
    "symbol": "DRAM",
    "company": "Roundhill Memory ETF",
    "shares": 65,
    "averageCost": 62.14384615384616,
    "currentPrice": 52.14,
    "previousClose": 52.41,
    "dividendYield": 0,
    "sector": "Memory Semiconductors",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "stock",
    "symbol": "MSTU",
    "company": "T-Rex 2X Long MSTR Daily Target ETF",
    "shares": 50.84,
    "averageCost": 196.71,
    "currentPrice": 1.88,
    "previousClose": 1.84,
    "dividendYield": 0,
    "sector": "Crypto / Bitcoin",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "stock",
    "symbol": "BMNR",
    "company": "BitMine Immersion Technologies",
    "shares": 144.69,
    "averageCost": 48.38,
    "currentPrice": 15.66,
    "previousClose": 15.46,
    "dividendYield": 0,
    "sector": "Ethereum / Crypto Treasury",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "stock",
    "symbol": "ROBN",
    "company": "T-Rex 2X Long HOOD Daily Target ETF",
    "shares": 100,
    "averageCost": 48.51,
    "currentPrice": 29.03,
    "previousClose": 32.7,
    "dividendYield": 0,
    "sector": "Financials",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "stock",
    "symbol": "GRAB",
    "company": "Grab",
    "shares": 1000,
    "averageCost": 6,
    "currentPrice": 3.57,
    "previousClose": 3.71,
    "dividendYield": 0,
    "sector": "Mobility / Delivery",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "stock",
    "symbol": "ONDS",
    "company": "Ondas Inc.",
    "shares": 550,
    "averageCost": 9.07,
    "currentPrice": 6.53,
    "previousClose": 6.66,
    "dividendYield": 0,
    "sector": "Drones",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "stock",
    "symbol": "IREN",
    "company": "IREN Limited",
    "shares": 100,
    "averageCost": 56.48,
    "currentPrice": 33.615,
    "previousClose": 34.825,
    "dividendYield": 0,
    "sector": "AI Data Centers",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "stock",
    "symbol": "FPS",
    "company": "Forgent Power Solutions",
    "shares": 100,
    "averageCost": 55.91,
    "currentPrice": 39.795,
    "previousClose": 39.62,
    "dividendYield": 0,
    "sector": "Electrical Equipment / Power Infrastructure",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "stock",
    "symbol": "AMZN",
    "company": "Amazon",
    "shares": 23,
    "averageCost": 243.7,
    "currentPrice": 247.15,
    "previousClose": 249.95,
    "dividendYield": 0,
    "sector": "E-Commerce & Cloud",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "stock",
    "symbol": "UNHG",
    "company": "Leverage Shares 2X Long UNH Daily ETF",
    "shares": 300,
    "averageCost": 21.2,
    "currentPrice": 23.84,
    "previousClose": 23.51,
    "dividendYield": 0,
    "sector": "Healthcare",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  },
  {
    "assetType": "stock",
    "symbol": "IBIT",
    "company": "iShares Bitcoin Trust ETF",
    "shares": 222,
    "averageCost": 48.36,
    "currentPrice": 36.3,
    "previousClose": 36.39,
    "dividendYield": 0,
    "sector": "Crypto / Bitcoin",
    "updatedAt": "2026-07-18T03:02:03.544Z"
  }
] as Holding[];

export const KNOWN_ROTH_RECOVERY_TRANSACTIONS: Transaction[] = [
  {
    "id": "trade-1784349984108-jv00xx",
    "date": "2026-07-18",
    "fees": 0,
    "type": "buy",
    "notes": "Bought from Holdings",
    "price": 54.93,
    "amount": 4998.63,
    "symbol": "VSTL",
    "quantity": 91,
    "assetType": "stock"
  },
  {
    "id": "trade-1784349907239-l3ld5b",
    "date": "2026-07-18",
    "fees": 0,
    "type": "buy",
    "notes": "Bought from Holdings",
    "price": 75.61,
    "amount": 3999.84461,
    "symbol": "RDTL",
    "quantity": 52.901,
    "assetType": "stock"
  },
  {
    "id": "trade-1784349833872-l4yk10",
    "date": "2026-07-18",
    "fees": 0,
    "type": "buy",
    "notes": "Bought from Holdings",
    "price": 1814.99,
    "amount": 1814.99,
    "symbol": "SOXS",
    "quantity": 1,
    "assetType": "stock"
  },
  {
    "id": "trade-1784349758307-tb6vgr",
    "date": "2026-07-18",
    "fees": 0,
    "type": "buy",
    "notes": "Bought from Holdings",
    "price": 8.28,
    "amount": 3311.9999999999995,
    "symbol": "ONDS",
    "quantity": 400,
    "assetType": "stock"
  },
  {
    "id": "trade-1784349670640-vl80a4",
    "date": "2026-05-29",
    "fees": 0,
    "type": "buy",
    "notes": "Bought from Holdings",
    "price": 52.56,
    "amount": 5256,
    "symbol": "GOOGL",
    "quantity": 1,
    "assetType": "option",
    "optionType": "buy-call",
    "optionExpiry": "2027-03-19"
  },
  {
    "id": "trade-1783994932453-yencvh",
    "date": "2026-07-14",
    "fees": 0,
    "type": "buy",
    "notes": "Bought from Holdings",
    "price": 40.2,
    "amount": 4020.0000000000005,
    "symbol": "QCOM",
    "quantity": 1,
    "assetType": "option",
    "optionType": "buy-call",
    "optionExpiry": "2028-01-21"
  },
  {
    "id": "trade-1783805777721-y8parg",
    "date": "2026-07-11",
    "fees": 0,
    "type": "buy",
    "notes": "Bought from Holdings",
    "price": 0.19,
    "amount": 76,
    "symbol": "ONDS",
    "quantity": -4,
    "assetType": "option",
    "optionType": "sell-call",
    "optionExpiry": "2026-07-24"
  }
] as Transaction[];

export const ROTH_RECOVERY_TRANSACTION_IDS = new Set(KNOWN_ROTH_RECOVERY_TRANSACTIONS.map((transaction) => transaction.id));

const COMPANY_BY_SYMBOL: Record<string, string> = {
  VSTL: "Defiance Daily Target 2X Long VST ETF",
  RDTL: "RDTL",
  SOXS: "Direxion Daily Semiconductor Bear 3X ETF",
  ONDS: "Ondas Inc.",
  GOOGL: "Alphabet",
  QCOM: "Qualcomm",
};

const SECTOR_BY_SYMBOL: Record<string, Holding["sector"]> = {
  VSTL: "Utilities / Energy",
  RDTL: "Other",
  SOXS: "Semiconductors",
  ONDS: "Drones",
  GOOGL: "Digital Advertising / AI",
  QCOM: "Semiconductors",
};

function recoveredHoldingKey(holding: Pick<Holding, "symbol" | "assetType" | "optionType" | "optionExpiry">) {
  const assetType = holding.assetType ?? "stock";
  const symbol = String(holding.symbol ?? "").trim().toUpperCase();
  return assetType === "option"
    ? `option:${symbol}:${holding.optionType ?? "option"}:${holding.optionExpiry ?? "no-expiry"}`
    : `stock:${symbol}`;
}

function optionCompany(transaction: Transaction) {
  const symbol = String(transaction.symbol ?? "Option").toUpperCase();
  const label = transaction.optionType === "sell-call" ? "Sell Call"
    : transaction.optionType === "buy-call" ? "Call"
    : transaction.optionType === "sell-put" ? "Sell Put"
    : "Put";
  if (!transaction.optionExpiry) return `${symbol} ${label}`;
  const expiry = new Date(`${transaction.optionExpiry}T12:00:00`);
  const formatted = Number.isNaN(expiry.getTime())
    ? transaction.optionExpiry
    : expiry.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${symbol} ${label} Exp ${formatted}`;
}

export function holdingFromRecoveryTransaction(transaction: Transaction): Holding | null {
  if (!transaction.symbol || !transaction.quantity || transaction.price == null) return null;
  const symbol = transaction.symbol.toUpperCase();
  if (transaction.assetType === "option") {
    return {
      assetType: "option",
      symbol,
      company: optionCompany(transaction),
      shares: transaction.quantity,
      averageCost: transaction.price,
      currentPrice: transaction.price,
      previousClose: transaction.price,
      dividendYield: 0,
      sector: SECTOR_BY_SYMBOL[symbol] ?? "Other",
      optionType: transaction.optionType,
      optionExpiry: transaction.optionExpiry,
      optionStrike: transaction.optionStrike,
      optionSymbol: transaction.optionSymbol,
      updatedAt: "Recovered From Transaction History",
    };
  }
  return {
    assetType: "stock",
    symbol,
    company: COMPANY_BY_SYMBOL[symbol] ?? symbol,
    shares: transaction.quantity,
    averageCost: transaction.price,
    currentPrice: transaction.price,
    previousClose: transaction.price,
    dividendYield: 0,
    sector: SECTOR_BY_SYMBOL[symbol] ?? "Other",
    updatedAt: "Recovered From Transaction History",
  };
}

export function mergeKnownRothTransactions(transactions: Transaction[]): Transaction[] {
  const existingIds = new Set(transactions.map((transaction) => transaction.id));
  const additions = KNOWN_ROTH_RECOVERY_TRANSACTIONS.filter((transaction) => !existingIds.has(transaction.id));
  return additions.length ? [...transactions, ...additions] : transactions;
}

export function mergeKnownRothRecovery(holdings: Holding[], transactions: Transaction[] | undefined): Holding[] {
  if (!Array.isArray(transactions)) return holdings;
  const existingKeys = new Set(holdings.map(recoveredHoldingKey));
  const additions = transactions
    .filter((transaction) => ROTH_RECOVERY_TRANSACTION_IDS.has(transaction.id))
    .map(holdingFromRecoveryTransaction)
    .filter((holding): holding is Holding => Boolean(holding))
    .filter((holding) => !existingKeys.has(recoveredHoldingKey(holding)));
  return additions.length ? [...holdings, ...additions] : holdings;
}

export function restoreKnownRobinhoodIfEmpty(holdings: Holding[]): Holding[] {
  return holdings.length === 0 ? KNOWN_ROBINHOOD_HOLDINGS.map((holding) => ({ ...holding })) : holdings;
}
