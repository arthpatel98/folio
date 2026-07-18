# Folio — Premium Investment Portfolio

A production-style Next.js 15 portfolio analytics application with a Robinhood/TradingView-inspired interface, typed financial calculations, Supabase authentication/database scaffolding, responsive layouts, charts, tables, goals, watchlists and position detail pages.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The dashboard uses local seed data and runs before Supabase is configured.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor, then `supabase/seed.sql`.
3. Add the project URL and anon key to `.env.local`.
4. Add `http://localhost:3000/auth/callback` to Auth redirect URLs.
5. Visit `/login` to test passwordless email authentication.

## Architecture

- `app/(dashboard)` — App Router dashboard pages
- `app/(auth)` — authentication screens
- `components/charts` — Recharts visualizations
- `components/portfolio` — portfolio-specific interactive UI
- `components/ui` — reusable shadcn-style primitives
- `lib/calculations` — portfolio and FIFO domain logic
- `lib/supabase` — browser/server clients
- `store` — Zustand client state
- `supabase` — schema, RLS and seed SQL

## Implemented pages

Overview, holdings, position details, transactions, realized P/L and tax lots, analytics, watchlist, goals, settings and login.

## Market data and broker integrations

Provider buttons are intentionally adapters, not credential collectors. Add server-only route handlers for Polygon/Finnhub/etc., cache quotes, and normalize them into `securities` and `price_history`. Broker connectivity should use official OAuth or a regulated aggregation provider. Robinhood does not provide a general public retail portfolio API, so never request or store a user's brokerage password.

## Production hardening checklist

- Protect dashboard routes after Supabase setup.
- Move mock data to repository functions backed by Supabase.
- Add background quote ingestion and snapshot jobs.
- Add Zod validation and server actions for transactions.
- Add idempotent CSV import mapping.
- Add tests for splits, partial sales, fees and multiple currencies.
- Add rate limiting, observability and encrypted provider tokens.

## Financial calculation notes

`calculateFIFO` processes transactions chronologically, consumes oldest open lots first and calculates realized gains after allocated fees. Extend it for wash-sale reporting, short positions, return of capital and jurisdiction-specific tax rules before relying on it for tax filing.
