import { Holding } from "@/types/portfolio";

export function buildOptionSymbol(holding: Pick<Holding, "symbol" | "optionType" | "optionExpiry" | "averageCost">) {
  const strikePrice = Number(holding.averageCost);
  if (!holding.optionExpiry || !holding.optionType || !Number.isFinite(strikePrice) || strikePrice <= 0) return null;
  const [year, month, day] = holding.optionExpiry.split("-");
  if (!year || !month || !day) return null;
  const side = holding.optionType.includes("call") ? "C" : "P";
  const strike = Math.round(strikePrice * 1000).toString().padStart(8, "0");
  return `${holding.symbol.trim().toUpperCase()}${year.slice(-2)}${month}${day}${side}${strike}`;
}
