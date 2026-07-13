import { NextRequest, NextResponse } from "next/server";

type AlpacaStockSnapshot = {
  latestTrade?: { p?: number };
  latestQuote?: { bp?: number; ap?: number };
  dailyBar?: { c?: number };
  prevDailyBar?: { c?: number };
};

type PriceResult = {
  currentPrice: number;
  previousClose: number;
};

const cache = new Map<string, { expiresAt: number; quote: PriceResult }>();
const CACHE_MS = 5 * 60 * 1000;
const MAX_SYMBOLS = 100;

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
}

export async function GET(request: NextRequest) {
  const key = process.env.APCA_API_KEY_ID;
  const secret = process.env.APCA_API_SECRET_KEY;
  if (!key || !secret) {
    return NextResponse.json(
      { error: "Alpaca API keys are not configured in Vercel." },
      { status: 503 },
    );
  }

  const symbols = Array.from(new Set(
    (request.nextUrl.searchParams.get("symbols") ?? "")
      .split(",")
      .map(normalizeSymbol)
      .filter(Boolean),
  )).slice(0, MAX_SYMBOLS);

  if (!symbols.length) {
    return NextResponse.json({ error: "Provide at least one stock ticker." }, { status: 400 });
  }

  const now = Date.now();
  const prices: Record<string, PriceResult> = {};
  const needed = symbols.filter((symbol) => {
    const hit = cache.get(symbol);
    if (hit && hit.expiresAt > now) {
      prices[symbol] = hit.quote;
      return false;
    }
    return true;
  });
  const unavailable: string[] = [];

  if (needed.length) {
    try {
      const url = new URL("https://data.alpaca.markets/v2/stocks/snapshots");
      url.searchParams.set("symbols", needed.join(","));
      url.searchParams.set("feed", "iex");
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          "APCA-API-KEY-ID": key,
          "APCA-API-SECRET-KEY": secret,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const message = await response.text();
        return NextResponse.json(
          { error: `Alpaca stock quote request failed (${response.status}). ${message.slice(0, 180)}` },
          { status: response.status },
        );
      }

      const body = await response.json() as { snapshots?: Record<string, AlpacaStockSnapshot> };
      const snapshots: Record<string, AlpacaStockSnapshot> = body.snapshots ?? (body as unknown as Record<string, AlpacaStockSnapshot>);

      for (const symbol of needed) {
        const snapshot = snapshots[symbol];
        const trade = Number(snapshot?.latestTrade?.p);
        const bid = Number(snapshot?.latestQuote?.bp);
        const ask = Number(snapshot?.latestQuote?.ap);
        const dailyClose = Number(snapshot?.dailyBar?.c);
        const previousClose = Number(snapshot?.prevDailyBar?.c);
        const midpoint = bid > 0 && ask > 0 ? (bid + ask) / 2 : 0;
        const currentPrice = trade > 0 ? trade : midpoint > 0 ? midpoint : dailyClose;

        if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
          unavailable.push(symbol);
          continue;
        }

        const quote = {
          currentPrice,
          previousClose: Number.isFinite(previousClose) && previousClose > 0 ? previousClose : currentPrice,
        };
        prices[symbol] = quote;
        cache.set(symbol, { expiresAt: now + CACHE_MS, quote });
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not refresh stock prices." },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({
    prices,
    unavailable,
    refreshedAt: new Date().toISOString(),
    cacheSeconds: CACHE_MS / 1000,
  });
}
