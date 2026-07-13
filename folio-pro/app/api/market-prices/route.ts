import { NextRequest, NextResponse } from "next/server";

type FinnhubQuote = {
  c?: number;
  pc?: number;
  d?: number;
  dp?: number;
  t?: number;
};

type PriceResult = {
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  timestamp: number | null;
};

const cache = new Map<string, { expiresAt: number; quote: PriceResult }>();
const CACHE_MS = 5 * 60 * 1000;
const MAX_SYMBOLS = 50;

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "FINNHUB_API_KEY is not configured in Vercel." },
      { status: 503 },
    );
  }

  const rawSymbols = request.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = Array.from(
    new Set(rawSymbols.split(",").map(normalizeSymbol).filter(Boolean)),
  ).slice(0, MAX_SYMBOLS);

  if (!symbols.length) {
    return NextResponse.json({ error: "Provide at least one stock ticker." }, { status: 400 });
  }

  const now = Date.now();
  const prices: Record<string, PriceResult> = {};
  const unavailable: string[] = [];

  await Promise.all(
    symbols.map(async (symbol) => {
      const cached = cache.get(symbol);
      if (cached && cached.expiresAt > now) {
        prices[symbol] = cached.quote;
        return;
      }

      try {
        const response = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`,
          { cache: "no-store", signal: AbortSignal.timeout(8000) },
        );

        if (!response.ok) {
          unavailable.push(symbol);
          return;
        }

        const data = (await response.json()) as FinnhubQuote;
        const currentPrice = Number(data.c);
        const previousClose = Number(data.pc);

        if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
          unavailable.push(symbol);
          return;
        }

        const quote: PriceResult = {
          currentPrice,
          previousClose: Number.isFinite(previousClose) && previousClose > 0 ? previousClose : currentPrice,
          change: Number.isFinite(Number(data.d)) ? Number(data.d) : currentPrice - (Number.isFinite(previousClose) ? previousClose : currentPrice),
          changePercent: Number.isFinite(Number(data.dp)) ? Number(data.dp) : 0,
          timestamp: Number.isFinite(Number(data.t)) ? Number(data.t) : null,
        };

        cache.set(symbol, { expiresAt: now + CACHE_MS, quote });
        prices[symbol] = quote;
      } catch {
        unavailable.push(symbol);
      }
    }),
  );

  return NextResponse.json(
    { prices, unavailable, refreshedAt: new Date().toISOString(), cacheSeconds: CACHE_MS / 1000 },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
