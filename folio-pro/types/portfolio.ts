export type Sector =
  | "AI / Enterprise Software"
  | "AI Data Centers"
  | "Cloud / AI / Software"
  | "Crypto / Bitcoin"
  | "Digital Advertising / AI"
  | "Drones"
  | "Space"
  | "Defense"
  | "BioTech"
  | "E-Commerce & Cloud"
  | "Education Technology"
  | "Electrical Equipment / Power Infrastructure"
  | "ETF"
  | "Ethereum / Crypto Treasury"
  | "Financials"
  | "Healthcare"
  | "Memory Semiconductors"
  | "Mobility / Delivery"
  | "Physical AI"
  | "Inverse ETF/ Hedge"
  | "Other"
  | "Semiconductors"
  | "Utilities / Energy";

export type AssetType = "stock" | "option";
export type OptionType = "buy-call" | "sell-call" | "buy-put" | "sell-put";

export interface Holding {
  symbol: string;
  company: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  previousClose: number;
  dividendYield: number;
  sector: Sector;
  assetType?: AssetType;
  optionType?: OptionType;
  optionExpiry?: string;
  optionStrike?: number;
  optionSymbol?: string;
  updatedAt: string;
}

export type TransactionType =
  | "buy"
  | "sell"
  | "dividend"
  | "interest"
  | "split"
  | "deposit"
  | "withdrawal"
  | "transfer"
  | "cash-adjustment"
  | "position-added"
  | "position-removed"
  | "correction"
  | "option-expired"
  | "option-assigned"
  | "option-exercised";

export interface Transaction {
  id: string;
  symbol?: string;
  type: TransactionType;
  quantity?: number;
  price?: number;
  amount: number;
  date: string;
  fees: number;
  notes?: string;
  source?: string;
  cashImpact?: number;
  assetType?: AssetType;
  optionType?: OptionType;
  optionExpiry?: string;
  optionStrike?: number;
  optionSymbol?: string;
  realizedGain?: number;
  realizedCostBasis?: number;
  realizedProceeds?: number;
  taxLotMethod?: "fifo" | "lifo" | "highest-cost" | "custom";
  taxLots?: Array<{
    lotId: string;
    positionId?: string;
    date: string;
    quantity: number;
    costPerShare: number;
    costBasis: number;
    realizedGain?: number;
    term?: "short-term" | "long-term";
  }>;
  realizedShortTermGain?: number;
  realizedLongTermGain?: number;
}

export interface PerformancePoint {
  date: string;
  value: number;
  dailyReturn: number;
  percent: number;
}

export interface TaxLot {
  id: string;
  symbol: string;
  openedAt: string;
  closedAt?: string;
  quantity: number;
  remaining: number;
  costPerShare: number;
  proceeds?: number;
  realizedGain?: number;
}
