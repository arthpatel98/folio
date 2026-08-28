"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, BarChart3, ChevronLeft, ChevronRight, Landmark, TrendingUp, WalletCards, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { portfolioSummary } from "@/lib/calculations/portfolio";
import { cn, money } from "@/lib/utils";
import {
  investmentAccounts,
  quarterlyIncome,
  ytdPerformance,
} from "@/lib/savings-investments-data";
import { useActivePortfolio } from "@/components/portfolio/portfolio-context";
import { usePortfolioStore, type DataPortfolioId } from "@/store/portfolio-store";

const pct = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
const wholeDollar = (value: number) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}).format(Math.round(value));

type ExtraRow = { id: string; label: string; amount: number; lastPostedDate: string };
type ProfitDrilldownTransaction = {
  id: string;
  date: string;
  ticker: string;
  label: string;
  quantity: number | null;
  price: number | null;
  proceeds: number | null;
  realizedProfit: number;
  category: "Sell Call" | "Sell Put" | "Buy Call" | "Buy Put" | "Common Stocks";
  preserveLabelCasing?: boolean;
};
type ProfitTickerGroup = {
  ticker: string;
  realizedProfit: number;
  percent: number;
  transactions: ProfitDrilldownTransaction[];
};


type DividendTransaction = { date: string; ticker: string; amount: number };
const ROBINHOOD_DIVIDENDS: DividendTransaction[] = [
  // Dividends
  { date: "2024-10-01", ticker: "SOXL Dividend", amount: 20.98 },
  { date: "2024-12-16", ticker: "SCHD Dividend", amount: 34.00 },
  { date: "2024-12-31", ticker: "SOXL Dividend", amount: 27.07 },
  { date: "2025-03-27", ticker: "VRT Dividend", amount: 1.28 },
  { date: "2025-03-31", ticker: "SCHD Dividend", amount: 31.98 },
  { date: "2025-04-01", ticker: "SOXL Dividend", amount: 12.61 },
  { date: "2025-06-30", ticker: "SCHD Dividend", amount: 33.45 },
  { date: "2025-07-01", ticker: "SOXS Dividend", amount: 29.11 },
  { date: "2025-09-30", ticker: "SOXS Dividend", amount: 29.20 },
  { date: "2025-12-15", ticker: "GOOGL Dividend", amount: 0.79 },
  { date: "2025-12-29", ticker: "BMNR Dividend", amount: 1.09 },
  { date: "2025-12-31", ticker: "SOXS Dividend", amount: 21.20 },
  { date: "2026-01-02", ticker: "UNHG Dividend", amount: 796.74 },
  { date: "2026-03-31", ticker: "SOXS Dividend", amount: 9.92 },
  { date: "2026-06-15", ticker: "META Dividend", amount: 5.25 },
  { date: "2026-06-30", ticker: "SOXS Dividend", amount: 0.75 },

  // Robinhood Gold membership charges / plan credits
  { date: "2024-08-18", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2024-09-16", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2024-10-16", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2024-11-15", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2024-12-15", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2025-01-14", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2025-02-13", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2025-03-15", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2025-04-14", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2025-05-14", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2025-06-13", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2025-07-13", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2025-08-12", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2025-09-11", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2025-10-11", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2025-11-10", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2025-12-10", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2026-01-09", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2026-02-08", ticker: "Robinhood Gold", amount: -5.00 },
  { date: "2026-02-09", ticker: "Robinhood Gold", amount: -50.00 },
  { date: "2026-02-09", ticker: "Gold Plan Credit", amount: 4.83 },
  { date: "2026-03-04", ticker: "Gold Plan Credit", amount: 46.85 },

  // Gold Deposit Boost Payouts
  { date: "2024-07-31", ticker: "Gold Deposit Boost Payout", amount: 0.80 },
  { date: "2024-08-31", ticker: "Gold Deposit Boost Payout", amount: 6.46 },
  { date: "2024-09-30", ticker: "Gold Deposit Boost Payout", amount: 8.15 },
  { date: "2024-10-31", ticker: "Gold Deposit Boost Payout", amount: 8.36 },
  { date: "2024-11-30", ticker: "Gold Deposit Boost Payout", amount: 8.36 },
  { date: "2024-12-31", ticker: "Gold Deposit Boost Payout", amount: 8.36 },
  { date: "2025-01-31", ticker: "Gold Deposit Boost Payout", amount: 8.36 },
  { date: "2025-02-28", ticker: "Gold Deposit Boost Payout", amount: 8.36 },
  { date: "2025-03-31", ticker: "Gold Deposit Boost Payout", amount: 8.36 },
  { date: "2025-04-30", ticker: "Gold Deposit Boost Payout", amount: 8.34 },
  { date: "2025-05-31", ticker: "Gold Deposit Boost Payout", amount: 8.33 },
  { date: "2025-06-30", ticker: "Gold Deposit Boost Payout", amount: 8.33 },
  { date: "2025-07-31", ticker: "Gold Deposit Boost Payout", amount: 8.33 },
  { date: "2025-08-31", ticker: "Gold Deposit Boost Payout", amount: 8.33 },
  { date: "2025-09-30", ticker: "Gold Deposit Boost Payout", amount: 8.33 },
  { date: "2025-10-31", ticker: "Gold Deposit Boost Payout", amount: 8.33 },
  { date: "2025-11-30", ticker: "Gold Deposit Boost Payout", amount: 8.31 },
  { date: "2025-12-31", ticker: "Gold Deposit Boost Payout", amount: 8.31 },
  { date: "2026-01-31", ticker: "Gold Deposit Boost Payout", amount: 8.31 },
  { date: "2026-02-28", ticker: "Gold Deposit Boost Payout", amount: 8.31 },
  { date: "2026-03-31", ticker: "Gold Deposit Boost Payout", amount: 8.31 },
  { date: "2026-04-30", ticker: "Gold Deposit Boost Payout", amount: 8.31 },
  { date: "2026-05-31", ticker: "Gold Deposit Boost Payout", amount: 8.31 },
  { date: "2026-06-30", ticker: "Gold Deposit Boost Payout", amount: 8.31 },
  { date: "2026-07-31", ticker: "Gold Deposit Boost Payout", amount: 7.34 },

  // Interest Payments
  { date: "2024-07-31", ticker: "Interest Payment", amount: 3.39 },
  { date: "2024-08-30", ticker: "Interest Payment", amount: 5.06 },
  { date: "2024-09-30", ticker: "Interest Payment", amount: 2.61 },
  { date: "2024-10-31", ticker: "Interest Payment", amount: 18.41 },
  { date: "2024-11-29", ticker: "Interest Payment", amount: 34.19 },
  { date: "2024-12-31", ticker: "Interest Payment", amount: 5.35 },
  { date: "2025-01-31", ticker: "Interest Payment", amount: 11.02 },
  { date: "2025-02-28", ticker: "Interest Payment", amount: 10.02 },
  { date: "2025-03-31", ticker: "Interest Payment", amount: 7.41 },
  { date: "2025-04-30", ticker: "Interest Payment", amount: 13.26 },
  { date: "2025-05-30", ticker: "Interest Payment", amount: 47.70 },
  { date: "2025-06-30", ticker: "Interest Payment", amount: 24.29 },
  { date: "2025-07-30", ticker: "Interest Payment", amount: 15.10 },
  { date: "2025-07-31", ticker: "Interest Payment", amount: 6.10 },
  { date: "2025-08-29", ticker: "Interest Payment", amount: 17.02 },
  { date: "2025-09-30", ticker: "Interest Payment", amount: 35.68 },
  { date: "2025-10-21", ticker: "Interest Payment", amount: 45.48 },
  { date: "2025-10-31", ticker: "Interest Payment", amount: 30.72 },
  { date: "2025-11-20", ticker: "Interest Payment", amount: 12.28 },
  { date: "2025-11-28", ticker: "Interest Payment", amount: 5.57 },
  { date: "2025-12-22", ticker: "Interest Payment", amount: 2.20 },
  { date: "2025-12-31", ticker: "Interest Payment", amount: 0.14 },
  { date: "2026-01-30", ticker: "Interest Payment", amount: 7.66 },
  { date: "2026-02-27", ticker: "Interest Payment", amount: 21.51 },
  { date: "2026-03-31", ticker: "Interest Payment", amount: 28.08 },
  { date: "2026-04-30", ticker: "Interest Payment", amount: 54.89 },
  { date: "2026-05-21", ticker: "Interest Payment", amount: 35.86 },
  { date: "2026-05-29", ticker: "Interest Payment", amount: 56.12 },
  { date: "2026-06-22", ticker: "Interest Payment", amount: 24.52 },
  { date: "2026-06-29", ticker: "Interest Payment", amount: 5.43 },
  { date: "2026-06-30", ticker: "Interest Payment", amount: 40.01 },
  { date: "2026-07-31", ticker: "Interest Payment", amount: 19.20 },
];
const dividendPeriod = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" });

const ROBINHOOD_VERIFIED_CLOSE_DATE_TRANSACTIONS: Record<string, ProfitDrilldownTransaction[]> = {
  "Jan 2025": [{"id":"gk-2025-01-16-amat-5","date":"2025-01-16","ticker":"AMAT","label":"APPLIED MATERIALS INC (AMAT)","quantity":0.72469,"price":null,"proceeds":134.91,"realizedProfit":-15.09,"category":"Common Stocks"},{"id":"gk-2025-01-16-amat-6","date":"2025-01-16","ticker":"AMAT","label":"APPLIED MATERIALS INC (AMAT)","quantity":1.378359,"price":null,"proceeds":256.61,"realizedProfit":-43.39,"category":"Common Stocks"},{"id":"gk-2025-01-16-amat-7","date":"2025-01-16","ticker":"AMAT","label":"APPLIED MATERIALS INC (AMAT)","quantity":13.98113,"price":null,"proceeds":2602.81,"realizedProfit":52.81,"category":"Common Stocks"},{"id":"gk-2025-01-31-app-8","date":"2025-01-31","ticker":"APP","label":"APPLOVIN CORPORATION CL A (APP)","quantity":5.64365,"price":null,"proceeds":2126.69,"realizedProfit":126.69,"category":"Common Stocks"},{"id":"gk-2025-01-15-hood-94","date":"2025-01-15","ticker":"HOOD","label":"ROBINHOOD MARKETS INC (HOOD)","quantity":50.3588,"price":null,"proceeds":2318.57,"realizedProfit":318.57,"category":"Common Stocks"},{"id":"gk-2025-01-15-hood-95","date":"2025-01-15","ticker":"HOOD","label":"ROBINHOOD MARKETS INC (HOOD)","quantity":51.0733,"price":null,"proceeds":2351.47,"realizedProfit":351.47,"category":"Common Stocks"},{"id":"gk-2025-01-15-hood-96","date":"2025-01-15","ticker":"HOOD","label":"ROBINHOOD MARKETS INC (HOOD)","quantity":17.89109,"price":null,"proceeds":823.73,"realizedProfit":123.73,"category":"Common Stocks"},{"id":"gk-2025-01-15-vrt-150","date":"2025-01-15","ticker":"VRT","label":"VERTIV HOLDINGS LLC (VRT)","quantity":26.535253,"price":null,"proceeds":3504.28,"realizedProfit":4.28,"category":"Common Stocks"},{"id":"gk-2025-01-15-vst-152","date":"2025-01-15","ticker":"VST","label":"VISTRA CORP (VST)","quantity":22.620501,"price":null,"proceeds":4018.98,"realizedProfit":518.98,"category":"Common Stocks"},{"id":"gk-2025-01-15-vst-153","date":"2025-01-15","ticker":"VST","label":"VISTRA CORP (VST)","quantity":3.38604,"price":null,"proceeds":601.6,"realizedProfit":101.6,"category":"Common Stocks"}],
  "Feb 2025": [{"id":"gk-2025-02-06-amr-3","date":"2025-02-06","ticker":"AMR","label":"ALPHA METALLURGICAL RESOURC (AMR)","quantity":3.824509,"price":null,"proceeds":714.02,"realizedProfit":14.02,"category":"Common Stocks"},{"id":"gk-2025-02-21-rtc-11","date":"2025-02-21","ticker":"RTC","label":"BAIJIAYUN GROUP LIMITED CL (RTC)","quantity":7000.0,"price":null,"proceeds":5262.7,"realizedProfit":1239.11,"category":"Common Stocks"},{"id":"gk-2025-02-21-soxl-38","date":"2025-02-21","ticker":"SOXL","label":"DIREXION DAILY SEMICONDUCTO (SOXL)","quantity":28.159853,"price":null,"proceeds":893.46,"realizedProfit":-549.73,"category":"Common Stocks"},{"id":"gk-2025-02-21-soxl-39","date":"2025-02-21","ticker":"SOXL","label":"DIREXION DAILY SEMICONDUCTO (SOXL)","quantity":36.107514,"price":null,"proceeds":1145.62,"realizedProfit":-611.19,"category":"Common Stocks"},{"id":"gk-2025-02-21-soxl-40","date":"2025-02-21","ticker":"SOXL","label":"DIREXION DAILY SEMICONDUCTO (SOXL)","quantity":90.57971,"price":null,"proceeds":2873.91,"realizedProfit":-626.09,"category":"Common Stocks"},{"id":"gk-2025-02-21-soxl-41","date":"2025-02-21","ticker":"SOXL","label":"DIREXION DAILY SEMICONDUCTO (SOXL)","quantity":0.152923,"price":null,"proceeds":4.85,"realizedProfit":-1.04,"category":"Common Stocks"},{"id":"gk-2025-02-21-soxl-42","date":"2025-02-21","ticker":"SOXL","label":"DIREXION DAILY SEMICONDUCTO (SOXL)","quantity":215.137822,"price":null,"proceeds":6825.9,"realizedProfit":531.79,"category":"Common Stocks"},{"id":"gk-2025-02-21-soxl-43","date":"2025-02-21","ticker":"SOXL","label":"DIREXION DAILY SEMICONDUCTO (SOXL)","quantity":29.862178,"price":null,"proceeds":947.47,"realizedProfit":48.94,"category":"Common Stocks"},{"id":"gk-2025-02-21-soxl-44","date":"2025-02-21","ticker":"SOXL","label":"DIREXION DAILY SEMICONDUCTO (SOXL)","quantity":28.159853,"price":null,"proceeds":0.0,"realizedProfit":549.73,"category":"Common Stocks"},{"id":"gk-2025-02-21-soxl-45","date":"2025-02-21","ticker":"SOXL","label":"DIREXION DAILY SEMICONDUCTO (SOXL)","quantity":36.107514,"price":null,"proceeds":0.0,"realizedProfit":611.19,"category":"Common Stocks"},{"id":"gk-2025-02-21-soxl-46","date":"2025-02-21","ticker":"SOXL","label":"DIREXION DAILY SEMICONDUCTO (SOXL)","quantity":90.57971,"price":null,"proceeds":0.0,"realizedProfit":626.09,"category":"Common Stocks"},{"id":"gk-2025-02-21-soxl-47","date":"2025-02-21","ticker":"SOXL","label":"DIREXION DAILY SEMICONDUCTO (SOXL)","quantity":0.152923,"price":null,"proceeds":0.0,"realizedProfit":1.04,"category":"Common Stocks"},{"id":"gk-2025-02-10-dkng-52","date":"2025-02-10","ticker":"DKNG","label":"DRAFTKINGS INC (DKNG)","quantity":76.90631,"price":null,"proceeds":3300.12,"realizedProfit":300.12,"category":"Common Stocks"},{"id":"gk-2025-02-13-hims-54","date":"2025-02-13","ticker":"HIMS","label":"HIMS & HERS HEALTH INC (HIMS)","quantity":112.90887,"price":null,"proceeds":6265.47,"realizedProfit":1265.47,"category":"Common Stocks"},{"id":"gk-2025-02-13-iren-60","date":"2025-02-13","ticker":"IREN","label":"IREN LIMITED (IREN)","quantity":413.24765,"price":null,"proceeds":5434.68,"realizedProfit":1254.68,"category":"Common Stocks"},{"id":"gk-2025-02-05-mmyt-67","date":"2025-02-05","ticker":"MMYT","label":"MAKEMYTRIP LTD (MMYT)","quantity":47.4878,"price":null,"proceeds":5661.81,"realizedProfit":661.81,"category":"Common Stocks"},{"id":"gk-2025-02-06-pltr-86","date":"2025-02-06","ticker":"PLTR","label":"PALANTIR TECHNOLOGIES INC C (PLTR)","quantity":17.34495,"price":null,"proceeds":1878.24,"realizedProfit":428.24,"category":"Common Stocks"},{"id":"gk-2025-02-06-rhp-112","date":"2025-02-06","ticker":"RHP","label":"RYMAN HOSPITALITY PROPERTIE (RHP)","quantity":9.768266,"price":null,"proceeds":1014.25,"realizedProfit":14.25,"category":"Common Stocks"}],
  "Mar 2025": [{"id":"gk-2025-03-21-mmyt-68","date":"2025-03-21","ticker":"MMYT","label":"MAKEMYTRIP LTD (MMYT)","quantity":70.46549,"price":null,"proceeds":7108.35,"realizedProfit":108.35,"category":"Common Stocks"},{"id":"gk-2025-03-21-rddt-92","date":"2025-03-21","ticker":"RDDT","label":"REDDIT INC CL A (RDDT)","quantity":18.87109,"price":null,"proceeds":2185.1,"realizedProfit":109.1,"category":"Common Stocks"}],
  "Apr 2025": [{"id":"gk-2025-04-08-agl-1","date":"2025-04-08","ticker":"AGL","label":"AGILON HEALTH INC (AGL)","quantity":355.738336,"price":null,"proceeds":1989.26,"realizedProfit":189.26,"category":"Common Stocks"},{"id":"gk-2025-04-08-agl-2","date":"2025-04-08","ticker":"AGL","label":"AGILON HEALTH INC (AGL)","quantity":899.03897,"price":null,"proceeds":5027.36,"realizedProfit":1027.36,"category":"Common Stocks"},{"id":"gk-2025-04-01-app-9","date":"2025-04-01","ticker":"APP","label":"APPLOVIN CORPORATION CL A (APP)","quantity":20.21112,"price":null,"proceeds":5715.18,"realizedProfit":425.18,"category":"Common Stocks"},{"id":"gk-2025-04-25-app-10","date":"2025-04-25","ticker":"APP","label":"APPLOVIN CORPORATION CL A (APP)","quantity":22.54314,"price":null,"proceeds":6249.99,"realizedProfit":469.99,"category":"Common Stocks"},{"id":"gk-2025-04-17-rtc-12","date":"2025-04-17","ticker":"RTC","label":"BAIJIAYUN GROUP LIMITED CL (RTC)","quantity":6800.0,"price":null,"proceeds":2908.02,"realizedProfit":471.58,"category":"Common Stocks"},{"id":"gk-2025-04-25-pltr-87","date":"2025-04-25","ticker":"PLTR","label":"PALANTIR TECHNOLOGIES INC C (PLTR)","quantity":12.86901,"price":null,"proceeds":1434.6,"realizedProfit":-65.4,"category":"Common Stocks"},{"id":"gk-2025-04-25-pltr-88","date":"2025-04-25","ticker":"PLTR","label":"PALANTIR TECHNOLOGIES INC C (PLTR)","quantity":33.10177,"price":null,"proceeds":3690.08,"realizedProfit":-9.92,"category":"Common Stocks"}],
  "May 2025": [{"id":"gk-2025-05-15-rtcjf-13","date":"2025-05-15","ticker":"RTCJF","label":"BAIJIAYUN GROUP LIMITED CL (RTCJF)","quantity":500.0,"price":null,"proceeds":70.02,"realizedProfit":-75.73,"category":"Common Stocks"},{"id":"gk-2025-05-15-rtcjf-14","date":"2025-05-15","ticker":"RTCJF","label":"BAIJIAYUN GROUP LIMITED CL (RTCJF)","quantity":23500.0,"price":null,"proceeds":3291.05,"realizedProfit":-3619.03,"category":"Common Stocks"},{"id":"gk-2025-05-13-hood-97","date":"2025-05-13","ticker":"HOOD","label":"ROBINHOOD MARKETS INC (HOOD)","quantity":66.28113,"price":null,"proceeds":4190.4,"realizedProfit":190.4,"category":"Common Stocks"},{"id":"gk-2025-05-13-hood-98","date":"2025-05-13","ticker":"HOOD","label":"ROBINHOOD MARKETS INC (HOOD)","quantity":38.16196,"price":null,"proceeds":2412.66,"realizedProfit":412.66,"category":"Common Stocks"},{"id":"gk-2025-05-02-spxc-120","date":"2025-05-02","ticker":"SPXC","label":"SPX TECHNOLOGIES INC (SPXC)","quantity":12.597631,"price":null,"proceeds":1821.59,"realizedProfit":-178.41,"category":"Common Stocks"},{"id":"gk-2025-05-02-spxc-121","date":"2025-05-02","ticker":"SPXC","label":"SPX TECHNOLOGIES INC (SPXC)","quantity":14.22344,"price":null,"proceeds":2056.67,"realizedProfit":56.67,"category":"Common Stocks"},{"id":"gk-2025-05-14-vrt-151","date":"2025-05-14","ticker":"VRT","label":"VERTIV HOLDINGS LLC (VRT)","quantity":45.62093,"price":null,"proceeds":4974.38,"realizedProfit":-25.62,"category":"Common Stocks"}],
  "Jun 2025": [{"id":"gk-2025-06-16-soxl-48","date":"2025-06-16","ticker":"SOXL","label":"DIREXION DAILY SEMICONDUCTO (SOXL)","quantity":69.841701,"price":null,"proceeds":1543.5,"realizedProfit":-557.97,"category":"Common Stocks"},{"id":"gk-2025-06-16-soxl-49","date":"2025-06-16","ticker":"SOXL","label":"DIREXION DAILY SEMICONDUCTO (SOXL)","quantity":189.70796,"price":null,"proceeds":4192.55,"realizedProfit":-2595.5,"category":"Common Stocks"},{"id":"gk-2025-06-20-hims-55","date":"2025-06-20","ticker":"HIMS","label":"HIMS & HERS HEALTH INC (HIMS)","quantity":37.90682,"price":null,"proceeds":2414.64,"realizedProfit":314.64,"category":"Common Stocks"},{"id":"gk-2025-06-26-iren-61","date":"2025-06-26","ticker":"IREN","label":"IREN LIMITED (IREN)","quantity":645.27303,"price":null,"proceeds":8181.92,"realizedProfit":1181.74,"category":"Common Stocks"},{"id":"gk-2025-06-27-mmyt-69","date":"2025-06-27","ticker":"MMYT","label":"MAKEMYTRIP LTD (MMYT)","quantity":72.07444,"price":null,"proceeds":7150.49,"realizedProfit":150.49,"category":"Common Stocks"},{"id":"gk-2025-06-27-mmyt-70","date":"2025-06-27","ticker":"MMYT","label":"MAKEMYTRIP LTD (MMYT)","quantity":59.41094,"price":null,"proceeds":5894.15,"realizedProfit":-105.85,"category":"Common Stocks"},{"id":"gk-2025-06-27-mmyt-71","date":"2025-06-27","ticker":"MMYT","label":"MAKEMYTRIP LTD (MMYT)","quantity":44.29019,"price":null,"proceeds":0.0,"realizedProfit":78.91,"category":"Common Stocks"},{"id":"gk-2025-06-04-rddt-93","date":"2025-06-04","ticker":"RDDT","label":"REDDIT INC CL A (RDDT)","quantity":38.10267,"price":null,"proceeds":4443.15,"realizedProfit":443.15,"category":"Common Stocks"},{"id":"gk-2025-06-11-robn-131","date":"2025-06-11","ticker":"ROBN","label":"T-REX 2X LONG HOOD DAILY TA (ROBN)","quantity":175.80356,"price":null,"proceeds":6103.86,"realizedProfit":103.86,"category":"Common Stocks"},{"id":"gk-2025-06-11-robn-132","date":"2025-06-11","ticker":"ROBN","label":"T-REX 2X LONG HOOD DAILY TA (ROBN)","quantity":57.55395,"price":null,"proceeds":1998.26,"realizedProfit":-1.74,"category":"Common Stocks"},{"id":"gk-2025-06-02-tem-142","date":"2025-06-02","ticker":"TEM","label":"TEMPUS AI INC (TEM)","quantity":131.58043,"price":null,"proceeds":8440.86,"realizedProfit":1440.86,"category":"Common Stocks"},{"id":"gk-2025-06-18-tsla-145","date":"2025-06-18","ticker":"TSLA","label":"TESLA INC (TSLA)","quantity":6.23402,"price":null,"proceeds":2025.4,"realizedProfit":25.4,"category":"Common Stocks"}],
  "Jul 2025": [{"id":"gk-2025-07-14-hims-56","date":"2025-07-14","ticker":"HIMS","label":"HIMS & HERS HEALTH INC (HIMS)","quantity":63.66344,"price":null,"proceeds":3276.11,"realizedProfit":276.11,"category":"Common Stocks"},{"id":"gk-2025-07-23-hims-57","date":"2025-07-23","ticker":"HIMS","label":"HIMS & HERS HEALTH INC (HIMS)","quantity":125.11025,"price":null,"proceeds":6641.24,"realizedProfit":641.24,"category":"Common Stocks"},{"id":"gk-2025-07-16-mmyt-72","date":"2025-07-16","ticker":"MMYT","label":"MAKEMYTRIP LTD (MMYT)","quantity":17.77086,"price":null,"proceeds":1691.79,"realizedProfit":60.13,"category":"Common Stocks"},{"id":"gk-2025-07-16-mmyt-73","date":"2025-07-16","ticker":"MMYT","label":"MAKEMYTRIP LTD (MMYT)","quantity":26.51933,"price":null,"proceeds":2524.64,"realizedProfit":77.39,"category":"Common Stocks"},{"id":"gk-2025-07-14-oklo-83","date":"2025-07-14","ticker":"OKLO","label":"OKLO INC (OKLO)","quantity":73.32453,"price":null,"proceeds":4244.7,"realizedProfit":244.7,"category":"Common Stocks"},{"id":"gk-2025-07-14-oklo-84","date":"2025-07-14","ticker":"OKLO","label":"OKLO INC (OKLO)","quantity":38.09161,"price":null,"proceeds":2205.09,"realizedProfit":205.09,"category":"Common Stocks"},{"id":"gk-2025-07-09-pltr-89","date":"2025-07-09","ticker":"PLTR","label":"PALANTIR TECHNOLOGIES INC C (PLTR)","quantity":30.46922,"price":null,"proceeds":4357.14,"realizedProfit":357.14,"category":"Common Stocks"},{"id":"gk-2025-07-09-pltr-90","date":"2025-07-09","ticker":"PLTR","label":"PALANTIR TECHNOLOGIES INC C (PLTR)","quantity":15.37219,"price":null,"proceeds":2198.25,"realizedProfit":198.25,"category":"Common Stocks"},{"id":"gk-2025-07-02-schd-113","date":"2025-07-02","ticker":"SCHD","label":"SCHWAB US DIVIDEND EQUITY E (SCHD)","quantity":null,"price":null,"proceeds":102.65,"realizedProfit":-197.45,"category":"Common Stocks"},{"id":"gk-2025-07-02-schd-114","date":"2025-07-02","ticker":"SCHD","label":"SCHWAB US DIVIDEND EQUITY E (SCHD)","quantity":null,"price":null,"proceeds":47.96,"realizedProfit":-90.46,"category":"Common Stocks"},{"id":"gk-2025-07-02-schd-115","date":"2025-07-02","ticker":"SCHD","label":"SCHWAB US DIVIDEND EQUITY E (SCHD)","quantity":null,"price":null,"proceeds":20.77,"realizedProfit":-32.74,"category":"Common Stocks"},{"id":"gk-2025-07-16-spxc-122","date":"2025-07-16","ticker":"SPXC","label":"SPX TECHNOLOGIES INC (SPXC)","quantity":14.60497,"price":null,"proceeds":2533.09,"realizedProfit":33.09,"category":"Common Stocks"},{"id":"gk-2025-07-28-smci-124","date":"2025-07-28","ticker":"SMCI","label":"SUPER MICRO COMPUTER INC (SMCI)","quantity":1.23967,"price":null,"proceeds":72.58,"realizedProfit":-27.42,"category":"Common Stocks"},{"id":"gk-2025-07-28-smci-125","date":"2025-07-28","ticker":"SMCI","label":"SUPER MICRO COMPUTER INC (SMCI)","quantity":9.47933,"price":null,"proceeds":555.02,"realizedProfit":-145.46,"category":"Common Stocks"},{"id":"gk-2025-07-28-smci-126","date":"2025-07-28","ticker":"SMCI","label":"SUPER MICRO COMPUTER INC (SMCI)","quantity":13.56894,"price":null,"proceeds":794.46,"realizedProfit":-212.57,"category":"Common Stocks"},{"id":"gk-2025-07-28-smci-127","date":"2025-07-28","ticker":"SMCI","label":"SUPER MICRO COMPUTER INC (SMCI)","quantity":13.99015,"price":null,"proceeds":819.12,"realizedProfit":-250.88,"category":"Common Stocks"},{"id":"gk-2025-07-28-smci-128","date":"2025-07-28","ticker":"SMCI","label":"SUPER MICRO COMPUTER INC (SMCI)","quantity":9.6109,"price":null,"proceeds":562.72,"realizedProfit":-159.77,"category":"Common Stocks"},{"id":"gk-2025-07-17-tsla-146","date":"2025-07-17","ticker":"TSLA","label":"TESLA INC (TSLA)","quantity":6.61629,"price":null,"proceeds":2138.52,"realizedProfit":138.52,"category":"Common Stocks"},{"id":"gk-2025-07-17-tsla-147","date":"2025-07-17","ticker":"TSLA","label":"TESLA INC (TSLA)","quantity":10.26237,"price":null,"proceeds":3317.0,"realizedProfit":317.0,"category":"Common Stocks"},{"id":"gk-2025-07-17-tsla-148","date":"2025-07-17","ticker":"TSLA","label":"TESLA INC (TSLA)","quantity":10.12743,"price":null,"proceeds":3273.39,"realizedProfit":273.38,"category":"Common Stocks"},{"id":"gk-2025-07-17-tsla-149","date":"2025-07-17","ticker":"TSLA","label":"TESLA INC (TSLA)","quantity":6.42179,"price":null,"proceeds":2075.65,"realizedProfit":75.65,"category":"Common Stocks"}],
  "Aug 2025": [{"id":"gk-2025-08-18-celh-17","date":"2025-08-18","ticker":"CELH","label":"CELSIUS HOLDINGS INC (CELH)","quantity":6.032965,"price":null,"proceeds":368.24,"realizedProfit":-131.76,"category":"Common Stocks"},{"id":"gk-2025-08-18-celh-18","date":"2025-08-18","ticker":"CELH","label":"CELSIUS HOLDINGS INC (CELH)","quantity":7.164209,"price":null,"proceeds":437.28,"realizedProfit":-155.63,"category":"Common Stocks"},{"id":"gk-2025-08-05-ionx-24","date":"2025-08-05","ticker":"IONX","label":"DEFIANCE DAILY TARGET 2X LO (IONX)","quantity":91.71398,"price":null,"proceeds":5733.48,"realizedProfit":333.48,"category":"Common Stocks"},{"id":"gk-2025-08-05-ionx-25","date":"2025-08-05","ticker":"IONX","label":"DEFIANCE DAILY TARGET 2X LO (IONX)","quantity":27.60624,"price":null,"proceeds":1725.8,"realizedProfit":125.8,"category":"Common Stocks"},{"id":"gk-2025-08-27-ionx-26","date":"2025-08-27","ticker":"IONX","label":"DEFIANCE DAILY TARGET 2X LO (IONX)","quantity":147.94874,"price":null,"proceeds":8771.12,"realizedProfit":747.12,"category":"Common Stocks"},{"id":"gk-2025-08-08-tsll-50","date":"2025-08-08","ticker":"TSLL","label":"DIREXION DAILY TSLA BULL 2X (TSLL)","quantity":495.60531,"price":null,"proceeds":5868.37,"realizedProfit":368.38,"category":"Common Stocks"},{"id":"gk-2025-08-08-tsll-51","date":"2025-08-08","ticker":"TSLL","label":"DIREXION DAILY TSLA BULL 2X (TSLL)","quantity":369.00461,"price":null,"proceeds":4369.32,"realizedProfit":369.31,"category":"Common Stocks"},{"id":"gk-2025-08-07-hood-99","date":"2025-08-07","ticker":"HOOD","label":"ROBINHOOD MARKETS INC (HOOD)","quantity":27.59107,"price":null,"proceeds":3031.09,"realizedProfit":1031.09,"category":"Common Stocks"},{"id":"gk-2025-08-07-hood-100","date":"2025-08-07","ticker":"HOOD","label":"ROBINHOOD MARKETS INC (HOOD)","quantity":33.1829,"price":null,"proceeds":3645.4,"realizedProfit":1145.4,"category":"Common Stocks"},{"id":"gk-2025-08-07-hood-101","date":"2025-08-07","ticker":"HOOD","label":"ROBINHOOD MARKETS INC (HOOD)","quantity":4.86208,"price":null,"proceeds":534.14,"realizedProfit":130.45,"category":"Common Stocks"},{"id":"gk-2025-08-08-rklb-110","date":"2025-08-08","ticker":"RKLB","label":"ROCKET LAB CORP (RKLB)","quantity":40.09221,"price":null,"proceeds":1908.38,"realizedProfit":-91.62,"category":"Common Stocks"},{"id":"gk-2025-08-08-rklb-111","date":"2025-08-08","ticker":"RKLB","label":"ROCKET LAB CORP (RKLB)","quantity":67.88098,"price":null,"proceeds":3231.12,"realizedProfit":231.12,"category":"Common Stocks"}],
  "Sep 2025": [{"id":"gk-2025-09-24-iren-62","date":"2025-09-24","ticker":"IREN","label":"IREN LIMITED (IREN)","quantity":126.979344,"price":null,"proceeds":6059.43,"realizedProfit":1465.95,"category":"Common Stocks"},{"id":"gk-2025-09-04-nflx-79","date":"2025-09-04","ticker":"NFLX","label":"NETFLIX INC (NFLX)","quantity":1.65244,"price":null,"proceeds":2066.82,"realizedProfit":66.82,"category":"Common Stocks"},{"id":"gk-2025-09-04-nflx-80","date":"2025-09-04","ticker":"NFLX","label":"NETFLIX INC (NFLX)","quantity":1.57615,"price":null,"proceeds":1971.41,"realizedProfit":-28.58,"category":"Common Stocks"},{"id":"gk-2025-09-04-nflx-81","date":"2025-09-04","ticker":"NFLX","label":"NETFLIX INC (NFLX)","quantity":1.57424,"price":null,"proceeds":1969.01,"realizedProfit":-31.0,"category":"Common Stocks"},{"id":"gk-2025-09-04-nflx-82","date":"2025-09-04","ticker":"NFLX","label":"NETFLIX INC (NFLX)","quantity":2.45881,"price":null,"proceeds":3075.41,"realizedProfit":75.42,"category":"Common Stocks"},{"id":"gk-2025-09-11-oklo-85","date":"2025-09-11","ticker":"OKLO","label":"OKLO INC (OKLO)","quantity":78.15043,"price":null,"proceeds":6121.12,"realizedProfit":121.12,"category":"Common Stocks"},{"id":"gk-2025-09-23-hood-102","date":"2025-09-23","ticker":"HOOD","label":"ROBINHOOD MARKETS INC (HOOD)","quantity":13.20394,"price":null,"proceeds":1666.63,"realizedProfit":570.32,"category":"Common Stocks"},{"id":"gk-2025-09-23-hood-103","date":"2025-09-23","ticker":"HOOD","label":"ROBINHOOD MARKETS INC (HOOD)","quantity":21.29698,"price":null,"proceeds":2688.16,"realizedProfit":688.16,"category":"Common Stocks"},{"id":"gk-2025-09-23-hood-104","date":"2025-09-23","ticker":"HOOD","label":"ROBINHOOD MARKETS INC (HOOD)","quantity":8.285897,"price":null,"proceeds":1045.87,"realizedProfit":282.41,"category":"Common Stocks"},{"id":"gk-2025-09-29-hood-105","date":"2025-09-29","ticker":"HOOD","label":"ROBINHOOD MARKETS INC (HOOD)","quantity":19.932023,"price":null,"proceeds":2675.85,"realizedProfit":839.31,"category":"Common Stocks"},{"id":"gk-2025-09-29-hood-106","date":"2025-09-29","ticker":"HOOD","label":"ROBINHOOD MARKETS INC (HOOD)","quantity":24.21551,"price":null,"proceeds":3250.91,"realizedProfit":850.91,"category":"Common Stocks"},{"id":"gk-2025-09-29-hood-107","date":"2025-09-29","ticker":"HOOD","label":"ROBINHOOD MARKETS INC (HOOD)","quantity":5.852467,"price":null,"proceeds":785.69,"realizedProfit":166.21,"category":"Common Stocks"},{"id":"gk-2025-09-30-hood-108","date":"2025-09-30","ticker":"HOOD","label":"ROBINHOOD MARKETS INC (HOOD)","quantity":27.213183,"price":null,"proceeds":3897.88,"realizedProfit":1017.36,"category":"Common Stocks"},{"id":"gk-2025-09-30-hood-109","date":"2025-09-30","ticker":"HOOD","label":"ROBINHOOD MARKETS INC (HOOD)","quantity":2.786817,"price":null,"proceeds":399.17,"realizedProfit":95.17,"category":"Common Stocks"},{"id":"gk-2025-09-18-spot-116","date":"2025-09-18","ticker":"SPOT","label":"SPOTIFY TECHNOLOGY SA (SPOT)","quantity":2.14221,"price":null,"proceeds":1580.24,"realizedProfit":80.24,"category":"Common Stocks"},{"id":"gk-2025-09-18-spot-117","date":"2025-09-18","ticker":"SPOT","label":"SPOTIFY TECHNOLOGY SA (SPOT)","quantity":1.40473,"price":null,"proceeds":1036.23,"realizedProfit":36.23,"category":"Common Stocks"},{"id":"gk-2025-09-18-spot-118","date":"2025-09-18","ticker":"SPOT","label":"SPOTIFY TECHNOLOGY SA (SPOT)","quantity":1.94031,"price":null,"proceeds":1431.31,"realizedProfit":-68.69,"category":"Common Stocks"},{"id":"gk-2025-09-18-spot-119","date":"2025-09-18","ticker":"SPOT","label":"SPOTIFY TECHNOLOGY SA (SPOT)","quantity":2.72851,"price":null,"proceeds":2012.74,"realizedProfit":12.74,"category":"Common Stocks"},{"id":"gk-2025-09-25-mstz-130","date":"2025-09-25","ticker":"MSTZ","label":"T-REX 2X INVERSE MSTR DAILY (MSTZ)","quantity":806.874,"price":null,"proceeds":4857.23,"realizedProfit":-2152.77,"category":"Common Stocks"},{"id":"gk-2025-09-18-robn-133","date":"2025-09-18","ticker":"ROBN","label":"T-REX 2X LONG HOOD DAILY TA (ROBN)","quantity":136.972789,"price":null,"proceeds":11126.7,"realizedProfit":1567.77,"category":"Common Stocks"},{"id":"gk-2025-09-23-robn-134","date":"2025-09-23","ticker":"ROBN","label":"T-REX 2X LONG HOOD DAILY TA (ROBN)","quantity":13.484811,"price":null,"proceeds":1147.56,"realizedProfit":206.49,"category":"Common Stocks"},{"id":"gk-2025-09-23-robn-135","date":"2025-09-23","ticker":"ROBN","label":"T-REX 2X LONG HOOD DAILY TA (ROBN)","quantity":7.543016,"price":null,"proceeds":641.91,"realizedProfit":141.9,"category":"Common Stocks"},{"id":"gk-2025-09-23-robn-136","date":"2025-09-23","ticker":"ROBN","label":"T-REX 2X LONG HOOD DAILY TA (ROBN)","quantity":28.972173,"price":null,"proceeds":2465.53,"realizedProfit":709.15,"category":"Common Stocks"},{"id":"gk-2025-09-24-robn-137","date":"2025-09-24","ticker":"ROBN","label":"T-REX 2X LONG HOOD DAILY TA (ROBN)","quantity":70.0,"price":null,"proceeds":6256.6,"realizedProfit":2012.98,"category":"Common Stocks"}],
  "Oct 2025": [{"id":"gk-2025-10-06-bmnr-15","date":"2025-10-06","ticker":"BMNR","label":"BITMINE IMMERSION TECHNOLOG (BMNR)","quantity":52.924053,"price":null,"proceeds":3321.08,"realizedProfit":321.08,"category":"Common Stocks"},{"id":"gk-2025-10-06-bmnr-16","date":"2025-10-06","ticker":"BMNR","label":"BITMINE IMMERSION TECHNOLOG (BMNR)","quantity":55.271521,"price":null,"proceeds":3468.38,"realizedProfit":468.38,"category":"Common Stocks"},{"id":"gk-2025-10-10-cifr-21","date":"2025-10-10","ticker":"CIFR","label":"CIPHER DIGITAL INC (CIFR)","quantity":313.602508,"price":null,"proceeds":6294.45,"realizedProfit":2294.45,"category":"Common Stocks"},{"id":"gk-2025-10-10-cifr-22","date":"2025-10-10","ticker":"CIFR","label":"CIPHER DIGITAL INC (CIFR)","quantity":17.334391,"price":null,"proceeds":347.93,"realizedProfit":129.43,"category":"Common Stocks"},{"id":"gk-2025-10-03-ionx-27","date":"2025-10-03","ticker":"IONX","label":"DEFIANCE DAILY TARGET 2X LO (IONX)","quantity":24.981576,"price":null,"proceeds":4084.74,"realizedProfit":84.74,"category":"Common Stocks"},{"id":"gk-2025-10-03-ionx-28","date":"2025-10-03","ticker":"IONX","label":"DEFIANCE DAILY TARGET 2X LO (IONX)","quantity":18.246576,"price":null,"proceeds":2983.5,"realizedProfit":-16.5,"category":"Common Stocks"},{"id":"gk-2025-10-02-rklx-29","date":"2025-10-02","ticker":"RKLX","label":"DEFIANCE DAILY TARGET 2X LO (RKLX)","quantity":43.566767,"price":null,"proceeds":4381.08,"realizedProfit":381.08,"category":"Common Stocks"},{"id":"gk-2025-10-02-rklx-30","date":"2025-10-02","ticker":"RKLX","label":"DEFIANCE DAILY TARGET 2X LO (RKLX)","quantity":2.125611,"price":null,"proceeds":213.75,"realizedProfit":30.9,"category":"Common Stocks"},{"id":"gk-2025-10-03-rklx-31","date":"2025-10-03","ticker":"RKLX","label":"DEFIANCE DAILY TARGET 2X LO (RKLX)","quantity":56.0,"price":null,"proceeds":5950.55,"realizedProfit":1133.4,"category":"Common Stocks"},{"id":"gk-2025-10-16-ggll-35","date":"2025-10-16","ticker":"GGLL","label":"DIREXION DAILY GOOGL BULL 2 (GGLL)","quantity":32.396533,"price":null,"proceeds":2232.76,"realizedProfit":232.76,"category":"Common Stocks"},{"id":"gk-2025-10-16-ggll-36","date":"2025-10-16","ticker":"GGLL","label":"DIREXION DAILY GOOGL BULL 2 (GGLL)","quantity":48.039969,"price":null,"proceeds":3310.91,"realizedProfit":310.91,"category":"Common Stocks"},{"id":"gk-2025-10-16-ggll-37","date":"2025-10-16","ticker":"GGLL","label":"DIREXION DAILY GOOGL BULL 2 (GGLL)","quantity":63.806436,"price":null,"proceeds":4397.53,"realizedProfit":397.53,"category":"Common Stocks"},{"id":"gk-2025-10-14-iren-63","date":"2025-10-14","ticker":"IREN","label":"IREN LIMITED (IREN)","quantity":11.237656,"price":null,"proceeds":792.25,"realizedProfit":385.73,"category":"Common Stocks"},{"id":"gk-2025-10-14-iren-64","date":"2025-10-14","ticker":"IREN","label":"IREN LIMITED (IREN)","quantity":60.038434,"price":null,"proceeds":4232.7,"realizedProfit":1989.36,"category":"Common Stocks"},{"id":"gk-2025-10-02-nbis-74","date":"2025-10-02","ticker":"NBIS","label":"NEBIUS GROUP NV (NBIS)","quantity":31.965903,"price":null,"proceeds":3992.21,"realizedProfit":992.21,"category":"Common Stocks"},{"id":"gk-2025-10-02-nbis-75","date":"2025-10-02","ticker":"NBIS","label":"NEBIUS GROUP NV (NBIS)","quantity":18.196097,"price":null,"proceeds":2272.51,"realizedProfit":312.24,"category":"Common Stocks"},{"id":"gk-2025-10-31-nbis-76","date":"2025-10-31","ticker":"NBIS","label":"NEBIUS GROUP NV (NBIS)","quantity":18.933764,"price":null,"proceeds":2466.6,"realizedProfit":426.87,"category":"Common Stocks"},{"id":"gk-2025-10-31-nbis-77","date":"2025-10-31","ticker":"NBIS","label":"NEBIUS GROUP NV (NBIS)","quantity":28.066236,"price":null,"proceeds":3656.33,"realizedProfit":656.33,"category":"Common Stocks"},{"id":"gk-2025-10-31-nbis-78","date":"2025-10-31","ticker":"NBIS","label":"NEBIUS GROUP NV (NBIS)","quantity":0.00449,"price":null,"proceeds":0.58,"realizedProfit":0.0,"category":"Common Stocks"},{"id":"gk-2025-10-24-pltr-91","date":"2025-10-24","ticker":"PLTR","label":"PALANTIR TECHNOLOGIES INC C (PLTR)","quantity":16.939103,"price":null,"proceeds":3119.25,"realizedProfit":119.25,"category":"Common Stocks"},{"id":"gk-2025-10-28-spxc-123","date":"2025-10-28","ticker":"SPXC","label":"SPX TECHNOLOGIES INC (SPXC)","quantity":15.38619,"price":null,"proceeds":3045.23,"realizedProfit":45.23,"category":"Common Stocks"},{"id":"gk-2025-10-24-robn-138","date":"2025-10-24","ticker":"ROBN","label":"T-REX 2X LONG HOOD DAILY TA (ROBN)","quantity":53.516975,"price":null,"proceeds":5430.36,"realizedProfit":430.36,"category":"Common Stocks"},{"id":"gk-2025-10-24-robn-139","date":"2025-10-24","ticker":"ROBN","label":"T-REX 2X LONG HOOD DAILY TA (ROBN)","quantity":45.38492,"price":null,"proceeds":4605.21,"realizedProfit":605.21,"category":"Common Stocks"},{"id":"gk-2025-10-24-nvdx-140","date":"2025-10-24","ticker":"NVDX","label":"T-REX 2X LONG NVIDIA DAILY (NVDX)","quantity":340.141839,"price":null,"proceeds":6324.91,"realizedProfit":324.91,"category":"Common Stocks"},{"id":"gk-2025-10-24-nvdx-141","date":"2025-10-24","ticker":"NVDX","label":"T-REX 2X LONG NVIDIA DAILY (NVDX)","quantity":290.951411,"price":null,"proceeds":5410.22,"realizedProfit":410.22,"category":"Common Stocks"},{"id":"gk-2025-10-02-tem-143","date":"2025-10-02","ticker":"TEM","label":"TEMPUS AI INC (TEM)","quantity":34.700133,"price":null,"proceeds":3107.05,"realizedProfit":107.05,"category":"Common Stocks"},{"id":"gk-2025-10-02-tem-144","date":"2025-10-02","ticker":"TEM","label":"TEMPUS AI INC (TEM)","quantity":35.671861,"price":null,"proceeds":3194.05,"realizedProfit":194.05,"category":"Common Stocks"}],
  "Nov 2025": [{"id":"gk-2025-11-26-cifr-19","date":"2025-11-26","ticker":"CIFR","label":"CIFR 05 DEC 2025 17.0 CALL","quantity":500.0,"price":null,"proceeds":1324.78,"realizedProfit":674.57,"category":"Buy Call"},{"id":"gk-2025-11-03-cifr-23","date":"2025-11-03","ticker":"CIFR","label":"CIPHER DIGITAL INC (CIFR)","quantity":217.79661,"price":null,"proceeds":5390.45,"realizedProfit":2645.12,"category":"Common Stocks"},{"id":"gk-2025-11-17-qbtz-32","date":"2025-11-17","ticker":"QBTZ","label":"DEFIANCE DAILY TARGET 2X SH (QBTZ)","quantity":130.0,"price":null,"proceeds":2951.31,"realizedProfit":201.81,"category":"Common Stocks"},{"id":"gk-2025-11-14-rgtz-33","date":"2025-11-14","ticker":"RGTZ","label":"DEFIANCE DAILY TARGET 2X SH (RGTZ)","quantity":73.273493,"price":null,"proceeds":2240.56,"realizedProfit":240.56,"category":"Common Stocks"},{"id":"gk-2025-11-20-rgtz-34","date":"2025-11-20","ticker":"RGTZ","label":"DEFIANCE DAILY TARGET 2X SH (RGTZ)","quantity":91.0,"price":null,"proceeds":2679.02,"realizedProfit":270.25,"category":"Common Stocks"},{"id":"gk-2025-11-07-eose-53","date":"2025-11-07","ticker":"EOSE","label":"EOS ENERGY ENTERPRISES INC (EOSE)","quantity":177.744072,"price":null,"proceeds":3243.89,"realizedProfit":243.89,"category":"Common Stocks"},{"id":"gk-2025-11-05-iren-65","date":"2025-11-05","ticker":"IREN","label":"IREN LIMITED (IREN)","quantity":47.01362,"price":null,"proceeds":3551.87,"realizedProfit":1795.21,"category":"Common Stocks"},{"id":"gk-2025-11-05-iren-66","date":"2025-11-05","ticker":"IREN","label":"IREN LIMITED (IREN)","quantity":13.871345,"price":null,"proceeds":1047.98,"realizedProfit":467.67,"category":"Common Stocks"},{"id":"gk-2025-11-19-crcd-129","date":"2025-11-19","ticker":"CRCD","label":"T-REX 2X INVERSE CRCL DAILY (CRCD)","quantity":42.0,"price":null,"proceeds":2244.97,"realizedProfit":214.06,"category":"Common Stocks"}],
  "Dec 2025": [{"id":"gk-2025-12-30-googl-4","date":"2025-12-30","ticker":"GOOGL","label":"ALPHABET INC-CL A (GOOGL)","quantity":5.0,"price":null,"proceeds":1583.7,"realizedProfit":151.92,"category":"Common Stocks"},{"id":"gk-2025-12-19-cifr-20","date":"2025-12-19","ticker":"CIFR","label":"CIFR 19 DEC 2025 18.0 CALL","quantity":600.0,"price":null,"proceeds":0.0,"realizedProfit":-1104.12,"category":"Buy Call"},{"id":"gk-2025-12-05-iren-58","date":"2025-12-05","ticker":"IREN","label":"IREN 05 DEC 2025 48.5 CALL","quantity":300.0,"price":null,"proceeds":0.0,"realizedProfit":-780.12,"category":"Buy Call"},{"id":"gk-2025-12-05-iren-59","date":"2025-12-05","ticker":"IREN","label":"IREN 05 DEC 2025 48.5 CALL","quantity":100.0,"price":null,"proceeds":0.97,"realizedProfit":-259.07,"category":"Buy Call"}],
  "Jan 2026": [
    {
      "id": "gk-2026-01-12-ire-1",
      "date": "2026-01-12",
      "ticker": "IRE",
      "label": "DEFIANCE DAILY TARGET 2X LO (IRE)",
      "quantity": 446.842306,
      "price": null,
      "proceeds": 4528.66,
      "realizedProfit": 409.66,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-01-20-cifr-2",
      "date": "2026-01-20",
      "ticker": "CIFR",
      "label": "CIFR 16 JAN 2026 20.0 CALL",
      "quantity": 600.0,
      "price": null,
      "proceeds": 161.74,
      "realizedProfit": 161.74,
      "category": "Sell Call"
    },
    {
      "id": "gk-2026-01-20-iren-3",
      "date": "2026-01-20",
      "ticker": "IREN",
      "label": "IREN 16 JAN 2026 58.0 CALL",
      "quantity": 200.0,
      "price": null,
      "proceeds": 101.91,
      "realizedProfit": 101.91,
      "category": "Sell Call"
    },
    {
      "id": "gk-2026-01-20-nbis-4",
      "date": "2026-01-20",
      "ticker": "NBIS",
      "label": "NBIS 16 JAN 2026 119.0 CALL",
      "quantity": 100.0,
      "price": null,
      "proceeds": 122.95,
      "realizedProfit": 122.95,
      "category": "Sell Call"
    },
    {
      "id": "gk-2026-01-23-iren-5",
      "date": "2026-01-23",
      "ticker": "IREN",
      "label": "IREN LIMITED (IREN)",
      "quantity": 57.838945,
      "price": null,
      "proceeds": 3360.55,
      "realizedProfit": 940.86,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-01-29-mmyt-6",
      "date": "2026-01-29",
      "ticker": "MMYT",
      "label": "MAKEMYTRIP LTD (MMYT)",
      "quantity": 35.419271,
      "price": null,
      "proceeds": 2164.83,
      "realizedProfit": -1114.29,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-01-29-unhg-7",
      "date": "2026-01-29",
      "ticker": "UNHG",
      "label": "UNHG 20 FEB 2026 20.0 CALL",
      "quantity": 400.0,
      "price": null,
      "proceeds": 363.83,
      "realizedProfit": 343.67,
      "category": "Sell Call"
    },
    {
      "id": "gk-2026-01-30-wday-8",
      "date": "2026-01-30",
      "ticker": "WDAY",
      "label": "WORKDAY, INC. (WDAY)",
      "quantity": 7.94806,
      "price": null,
      "proceeds": 1393.33,
      "realizedProfit": -606.67,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-01-30-wday-9",
      "date": "2026-01-30",
      "ticker": "WDAY",
      "label": "WORKDAY, INC. (WDAY)",
      "quantity": 3.583963,
      "price": null,
      "proceeds": 628.29,
      "realizedProfit": -186.99,
      "category": "Common Stocks"
    }
  ],
  "Feb 2026": [
    {
      "id": "gk-2026-02-04-wday-10",
      "date": "2026-02-04",
      "ticker": "WDAY",
      "label": "WORKDAY, INC. (WDAY)",
      "quantity": 14.0,
      "price": null,
      "proceeds": 2358.3,
      "realizedProfit": -826.42,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-02-06-nvdx-11",
      "date": "2026-02-06",
      "ticker": "NVDX",
      "label": "T-REX 2X LONG NVIDIA DAILY (NVDX)",
      "quantity": 162.232316,
      "price": null,
      "proceeds": 2628.84,
      "realizedProfit": 128.84,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-02-06-tsm-12",
      "date": "2026-02-06",
      "ticker": "TSM",
      "label": "TAIWAN SEMICONDUCTOR MANUFA (TSM)",
      "quantity": 4.544215,
      "price": null,
      "proceeds": 1561.85,
      "realizedProfit": 61.85,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-02-10-amat-13",
      "date": "2026-02-10",
      "ticker": "AMAT",
      "label": "APPLIED MATERIALS INC (AMAT)",
      "quantity": 2.117778,
      "price": null,
      "proceeds": 708.19,
      "realizedProfit": 8.19,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-02-10-amat-14",
      "date": "2026-02-10",
      "ticker": "AMAT",
      "label": "APPLIED MATERIALS INC (AMAT)",
      "quantity": 3.998216,
      "price": null,
      "proceeds": 1337.0,
      "realizedProfit": 37.0,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-02-10-mmyt-15",
      "date": "2026-02-10",
      "ticker": "MMYT",
      "label": "MAKEMYTRIP LTD (MMYT)",
      "quantity": 33.213396,
      "price": null,
      "proceeds": 2105.45,
      "realizedProfit": -894.55,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-02-10-mmyt-16",
      "date": "2026-02-10",
      "ticker": "MMYT",
      "label": "MAKEMYTRIP LTD (MMYT)",
      "quantity": 7.786604,
      "price": null,
      "proceeds": 493.61,
      "realizedProfit": -227.27,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-02-20-amzn-17",
      "date": "2026-02-20",
      "ticker": "AMZN",
      "label": "AMZN 15 JAN 2027 205.0 CALL",
      "quantity": 100.0,
      "price": null,
      "proceeds": 3454.95,
      "realizedProfit": 414.91,
      "category": "Buy Call"
    },
    {
      "id": "gk-2026-02-26-meta-18",
      "date": "2026-02-26",
      "ticker": "META",
      "label": "META 18 DEC 2026 640.0 CALL",
      "quantity": 100.0,
      "price": null,
      "proceeds": 10379.95,
      "realizedProfit": 1134.91,
      "category": "Buy Call"
    },
    {
      "id": "gk-2026-02-27-nbis-19",
      "date": "2026-02-27",
      "ticker": "NBIS",
      "label": "NBIS 27 FEB 2026 117.0 CALL",
      "quantity": 100.0,
      "price": null,
      "proceeds": 161.95,
      "realizedProfit": 155.91,
      "category": "Sell Call"
    }
  ],
  "Mar 2026": [
    {
      "id": "gk-2026-03-02-cifr-20",
      "date": "2026-03-02",
      "ticker": "CIFR",
      "label": "CIFR 06 MAR 2026 20.0 CALL",
      "quantity": 200.0,
      "price": null,
      "proceeds": 67.91,
      "realizedProfit": 57.83,
      "category": "Sell Call"
    },
    {
      "id": "gk-2026-03-03-cifr-21",
      "date": "2026-03-03",
      "ticker": "CIFR",
      "label": "CIFR 06 MAR 2026 20.0 CALL",
      "quantity": 400.0,
      "price": null,
      "proceeds": 135.83,
      "realizedProfit": 123.67,
      "category": "Sell Call"
    },
    {
      "id": "gk-2026-03-04-cifr-22",
      "date": "2026-03-04",
      "ticker": "CIFR",
      "label": "CIFR 16 OCT 2026 15.0 CALL",
      "quantity": 500.0,
      "price": null,
      "proceeds": 2849.78,
      "realizedProfit": 399.58,
      "category": "Buy Call"
    },
    {
      "id": "gk-2026-03-05-mstz-23",
      "date": "2026-03-05",
      "ticker": "MSTZ",
      "label": "T-REX 2X INVERSE MSTR DAILY (MSTZ)",
      "quantity": 220.820189,
      "price": null,
      "proceeds": 2288.76,
      "realizedProfit": 188.76,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-03-10-nvda-24",
      "date": "2026-03-10",
      "ticker": "NVDA",
      "label": "NVDA 18 DEC 2026 179.0 CALL",
      "quantity": 200.0,
      "price": null,
      "proceeds": 6999.9,
      "realizedProfit": 529.82,
      "category": "Buy Call"
    },
    {
      "id": "gk-2026-03-13-nbis-25",
      "date": "2026-03-13",
      "ticker": "NBIS",
      "label": "NEBIUS GROUP NV (NBIS)",
      "quantity": 23.250422,
      "price": null,
      "proceeds": 2468.71,
      "realizedProfit": -530.71,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-03-13-nbis-26",
      "date": "2026-03-13",
      "ticker": "NBIS",
      "label": "NEBIUS GROUP NV (NBIS)",
      "quantity": 33.749578,
      "price": null,
      "proceeds": 3583.51,
      "realizedProfit": -416.49,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-03-13-nbis-27",
      "date": "2026-03-13",
      "ticker": "NBIS",
      "label": "NEBIUS GROUP NV (NBIS)",
      "quantity": 43.0,
      "price": null,
      "proceeds": 4565.71,
      "realizedProfit": -95.06,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-03-23-bmnr-28",
      "date": "2026-03-23",
      "ticker": "BMNR",
      "label": "BMNR 20 MAR 2026 24.0 CALL",
      "quantity": 100.0,
      "price": null,
      "proceeds": 63.95,
      "realizedProfit": 63.95,
      "category": "Sell Call"
    },
    {
      "id": "gk-2026-03-23-ibit-29",
      "date": "2026-03-23",
      "ticker": "IBIT",
      "label": "IBIT 20 MAR 2026 43.0 CALL",
      "quantity": 100.0,
      "price": null,
      "proceeds": 52.95,
      "realizedProfit": 52.95,
      "category": "Sell Call"
    },
    {
      "id": "gk-2026-03-25-duol-30",
      "date": "2026-03-25",
      "ticker": "DUOL",
      "label": "DUOLINGO INC (DUOL)",
      "quantity": 2.22415,
      "price": null,
      "proceeds": 219.72,
      "realizedProfit": -844.64,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-03-26-qbtz-31",
      "date": "2026-03-26",
      "ticker": "QBTZ",
      "label": "DEFIANCE DAILY TARGET 2X SH (QBTZ)",
      "quantity": 13.333333,
      "price": null,
      "proceeds": 673.73,
      "realizedProfit": -558.7,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-03-30-cifr-32",
      "date": "2026-03-30",
      "ticker": "CIFR",
      "label": "CIFR 02 APR 2026 17.5 CALL",
      "quantity": 400.0,
      "price": null,
      "proceeds": 227.83,
      "realizedProfit": 203.67,
      "category": "Sell Call"
    },
    {
      "id": "gk-2026-03-30-iren-33",
      "date": "2026-03-30",
      "ticker": "IREN",
      "label": "IREN 27 MAR 2026 39.0 PUT",
      "quantity": 100.0,
      "price": null,
      "proceeds": 101.95,
      "realizedProfit": -252.09,
      "category": "Sell Put"
    },
    {
      "id": "gk-2026-03-30-qbtz-34",
      "date": "2026-03-30",
      "ticker": "QBTZ",
      "label": "DEFIANCE DAILY TARGET 2X SH (QBTZ)",
      "quantity": 10.0,
      "price": null,
      "proceeds": 630.65,
      "realizedProfit": -293.68,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-03-30-soxs-35",
      "date": "2026-03-30",
      "ticker": "SOXS",
      "label": "DIREXION DAILY SEMICONDUCTO (SOXS)",
      "quantity": 14.586943,
      "price": null,
      "proceeds": 665.63,
      "realizedProfit": -2708.34,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-03-31-ibit-36",
      "date": "2026-03-31",
      "ticker": "IBIT",
      "label": "IBIT 30 MAR 2026 41.5 CALL",
      "quantity": 100.0,
      "price": null,
      "proceeds": 58.95,
      "realizedProfit": 58.95,
      "category": "Sell Call"
    }
  ],
  "Apr 2026": [
    {
      "id": "gk-2026-04-08-nvda-37",
      "date": "2026-04-08",
      "ticker": "NVDA",
      "label": "NVDA 18 DEC 2026 177.0 CALL",
      "quantity": 200.0,
      "price": null,
      "proceeds": 6169.78,
      "realizedProfit": 310.7,
      "category": "Buy Call"
    },
    {
      "id": "gk-2026-04-09-cifr-38",
      "date": "2026-04-09",
      "ticker": "CIFR",
      "label": "CIPHER DIGITAL INC (CIFR)",
      "quantity": 82.20339,
      "price": null,
      "proceeds": 1341.92,
      "realizedProfit": 305.75,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-04-10-iren-39",
      "date": "2026-04-10",
      "ticker": "IREN",
      "label": "IREN 10 APR 2026 38.5 PUT",
      "quantity": 100.0,
      "price": null,
      "proceeds": 443.95,
      "realizedProfit": 313.91,
      "category": "Sell Put"
    },
    {
      "id": "gk-2026-04-10-nvda-40",
      "date": "2026-04-10",
      "ticker": "NVDA",
      "label": "NVDA 18 DEC 2026 177.0 CALL",
      "quantity": 200.0,
      "price": null,
      "proceeds": 6469.77,
      "realizedProfit": 610.69,
      "category": "Buy Call"
    },
    {
      "id": "gk-2026-04-13-bmnr-41",
      "date": "2026-04-13",
      "ticker": "BMNR",
      "label": "BMNR 10 APR 2026 21.5 CALL",
      "quantity": 100.0,
      "price": null,
      "proceeds": 50.94,
      "realizedProfit": 50.94,
      "category": "Sell Call"
    },
    {
      "id": "gk-2026-04-14-ibit-42",
      "date": "2026-04-14",
      "ticker": "IBIT",
      "label": "IBIT 13 APR 2026 41.5 CALL",
      "quantity": 100.0,
      "price": null,
      "proceeds": 46.94,
      "realizedProfit": 39.9,
      "category": "Sell Call"
    },
    {
      "id": "gk-2026-04-14-meta-43",
      "date": "2026-04-14",
      "ticker": "META",
      "label": "META 20 NOV 2026 640.0 CALL",
      "quantity": 100.0,
      "price": null,
      "proceeds": 9609.75,
      "realizedProfit": 724.71,
      "category": "Buy Call"
    },
    {
      "id": "gk-2026-04-17-cifr-44",
      "date": "2026-04-17",
      "ticker": "CIFR",
      "label": "CIPHER DIGITAL INC (CIFR)",
      "quantity": 200.0,
      "price": null,
      "proceeds": 3101.79,
      "realizedProfit": -674.21,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-04-17-cifr-45",
      "date": "2026-04-17",
      "ticker": "CIFR",
      "label": "CIPHER DIGITAL INC (CIFR)",
      "quantity": 117.79661,
      "price": null,
      "proceeds": 2243.37,
      "realizedProfit": 19.37,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-04-17-cifr-46",
      "date": "2026-04-17",
      "ticker": "CIFR",
      "label": "CIPHER DIGITAL INC (CIFR)",
      "quantity": 200.0,
      "price": null,
      "proceeds": 0.0,
      "realizedProfit": 674.21,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-04-20-cifr-47",
      "date": "2026-04-20",
      "ticker": "CIFR",
      "label": "CIFR 17 APR 2026 16.0 CALL",
      "quantity": 200.0,
      "price": null,
      "proceeds": 101.9,
      "realizedProfit": -128.18,
      "category": "Sell Call"
    },
    {
      "id": "gk-2026-04-20-unhg-48",
      "date": "2026-04-20",
      "ticker": "UNHG",
      "label": "UNHG 17 APR 2026 13.0 CALL",
      "quantity": 400.0,
      "price": null,
      "proceeds": 219.83,
      "realizedProfit": -332.33,
      "category": "Sell Call"
    },
    {
      "id": "gk-2026-04-30-tsla-49",
      "date": "2026-04-30",
      "ticker": "TSLA",
      "label": "TSLA 15 JAN 2027 370.0 CALL",
      "quantity": 100.0,
      "price": null,
      "proceeds": 6979.8,
      "realizedProfit": 889.76,
      "category": "Buy Call"
    }
  ],
  "May 2026": [
    {
      "id": "gk-2026-05-01-mu-50",
      "date": "2026-05-01",
      "ticker": "MU",
      "label": "MU 15 JAN 2027 500.0 CALL",
      "quantity": 100.0,
      "price": null,
      "proceeds": 15359.63,
      "realizedProfit": 3009.59,
      "category": "Buy Call"
    },
    {
      "id": "gk-2026-05-04-cifr-51",
      "date": "2026-05-04",
      "ticker": "CIFR",
      "label": "CIFR 01 MAY 2026 21.0 CALL",
      "quantity": 200.0,
      "price": null,
      "proceeds": 133.88,
      "realizedProfit": 133.88,
      "category": "Sell Call"
    },
    {
      "id": "gk-2026-05-05-cifr-52",
      "date": "2026-05-05",
      "ticker": "CIFR",
      "label": "CIPHER DIGITAL INC (CIFR)",
      "quantity": 200.0,
      "price": null,
      "proceeds": 4073.9,
      "realizedProfit": -421.1,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-05-05-cifr-53",
      "date": "2026-05-05",
      "ticker": "CIFR",
      "label": "CIPHER DIGITAL INC (CIFR)",
      "quantity": 200.0,
      "price": null,
      "proceeds": 4073.89,
      "realizedProfit": 807.59,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-05-05-spxc-54",
      "date": "2026-05-05",
      "ticker": "SPXC",
      "label": "SPX TECHNOLOGIES INC (SPXC)",
      "quantity": 4.830021,
      "price": null,
      "proceeds": 1011.05,
      "realizedProfit": 11.05,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-05-06-crwv-55",
      "date": "2026-05-06",
      "ticker": "CRWV",
      "label": "COREWEAVE INC (CRWV)",
      "quantity": 18.92744,
      "price": null,
      "proceeds": 2585.14,
      "realizedProfit": -414.86,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-05-06-iren-56",
      "date": "2026-05-06",
      "ticker": "IREN",
      "label": "IREN LIMITED (IREN)",
      "quantity": 42.161055,
      "price": null,
      "proceeds": 2586.52,
      "realizedProfit": 119.81,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-05-06-tsm-57",
      "date": "2026-05-06",
      "ticker": "TSM",
      "label": "TSM 15 JAN 2027 400.0 CALL",
      "quantity": 100.0,
      "price": null,
      "proceeds": 7304.79,
      "realizedProfit": 1214.75,
      "category": "Buy Call"
    },
    {
      "id": "gk-2026-05-12-qbtz-58",
      "date": "2026-05-12",
      "ticker": "QBTZ",
      "label": "DEFIANCE DAILY TARGET 2X SH (QBTZ)",
      "quantity": 137.0,
      "price": null,
      "proceeds": 1637.08,
      "realizedProfit": 146.53,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-05-12-qqq-59",
      "date": "2026-05-12",
      "ticker": "QQQ",
      "label": "QQQ 30 SEP 2026 650.0 PUT",
      "quantity": 200.0,
      "price": null,
      "proceeds": 3849.83,
      "realizedProfit": 201.75,
      "category": "Buy Put"
    },
    {
      "id": "gk-2026-05-12-unhg-60",
      "date": "2026-05-12",
      "ticker": "UNHG",
      "label": "LEVERAGE SHARES 2X LONG UNH (UNHG)",
      "quantity": 100.0,
      "price": null,
      "proceeds": 1527.9,
      "realizedProfit": -674.1,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-05-14-asts-61",
      "date": "2026-05-14",
      "ticker": "ASTS",
      "label": "AST SPACEMOBILE INC CL A (ASTS)",
      "quantity": 12.440131,
      "price": null,
      "proceeds": 1043.02,
      "realizedProfit": 43.02,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-05-14-asts-62",
      "date": "2026-05-14",
      "ticker": "ASTS",
      "label": "AST SPACEMOBILE INC CL A (ASTS)",
      "quantity": 13.117334,
      "price": null,
      "proceeds": 1099.8,
      "realizedProfit": 99.8,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-05-14-unhg-63",
      "date": "2026-05-14",
      "ticker": "UNHG",
      "label": "UNHG 15 MAY 2026 14.0 CALL",
      "quantity": 300.0,
      "price": null,
      "proceeds": 383.86,
      "realizedProfit": -1860.26,
      "category": "Sell Call"
    },
    {
      "id": "gk-2026-05-15-robn-64",
      "date": "2026-05-15",
      "ticker": "ROBN",
      "label": "ROBN 15 MAY 2026 24.0 PUT",
      "quantity": 100.0,
      "price": null,
      "proceeds": 299.94,
      "realizedProfit": 54.9,
      "category": "Sell Put"
    },
    {
      "id": "gk-2026-05-20-vsat-65",
      "date": "2026-05-20",
      "ticker": "VSAT",
      "label": "VSAT 15 JAN 2027 75.0 CALL",
      "quantity": 200.0,
      "price": null,
      "proceeds": 3719.83,
      "realizedProfit": 379.75,
      "category": "Buy Call"
    },
    {
      "id": "gk-2026-05-21-iren-66",
      "date": "2026-05-21",
      "ticker": "IREN",
      "label": "IREN 15 JAN 2027 60.0 CALL",
      "quantity": 200.0,
      "price": null,
      "proceeds": 3659.83,
      "realizedProfit": 389.75,
      "category": "Buy Call"
    },
    {
      "id": "gk-2026-05-21-nbis-67",
      "date": "2026-05-21",
      "ticker": "NBIS",
      "label": "NEBIUS GROUP NV (NBIS)",
      "quantity": 10.0,
      "price": null,
      "proceeds": 2193.95,
      "realizedProfit": 217.65,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-05-26-amat-68",
      "date": "2026-05-26",
      "ticker": "AMAT",
      "label": "AMAT 15 JAN 2027 450.0 CALL",
      "quantity": 100.0,
      "price": null,
      "proceeds": 8354.77,
      "realizedProfit": 619.73,
      "category": "Buy Call"
    },
    {
      "id": "gk-2026-05-27-iren-69",
      "date": "2026-05-27",
      "ticker": "IREN",
      "label": "IREN LIMITED (IREN)",
      "quantity": 15.884965,
      "price": null,
      "proceeds": 1010.26,
      "realizedProfit": 16.02,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-05-27-iren-70",
      "date": "2026-05-27",
      "ticker": "IREN",
      "label": "IREN LIMITED (IREN)",
      "quantity": 9.115035,
      "price": null,
      "proceeds": 579.7,
      "realizedProfit": 46.41,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-05-27-iren-71",
      "date": "2026-05-27",
      "ticker": "IREN",
      "label": "IREN LIMITED (IREN)",
      "quantity": 20.0,
      "price": null,
      "proceeds": 1339.97,
      "realizedProfit": 88.17,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-05-27-meta-72",
      "date": "2026-05-27",
      "ticker": "META",
      "label": "META 18 DEC 2026 620.0 CALL",
      "quantity": 100.0,
      "price": null,
      "proceeds": 8639.77,
      "realizedProfit": 822.73,
      "category": "Buy Call"
    },
    {
      "id": "gk-2026-05-28-pltr-73",
      "date": "2026-05-28",
      "ticker": "PLTR",
      "label": "PLTR 19 MAR 2027 135.0 CALL",
      "quantity": 300.0,
      "price": null,
      "proceeds": 8819.68,
      "realizedProfit": 1019.56,
      "category": "Buy Call"
    }
  ],
  "Jun 2026": [
    {
      "id": "gk-2026-06-01-nvda-74",
      "date": "2026-06-01",
      "ticker": "NVDA",
      "label": "NVDA 19 MAR 2027 220.0 CALL",
      "quantity": 200.0,
      "price": null,
      "proceeds": 7639.74,
      "realizedProfit": 659.66,
      "category": "Buy Call"
    },
    {
      "id": "gk-2026-06-01-pltr-75",
      "date": "2026-06-01",
      "ticker": "PLTR",
      "label": "PALANTIR TECHNOLOGIES INC C (PLTR)",
      "quantity": 17.553755,
      "price": null,
      "proceeds": 2865.59,
      "realizedProfit": -134.41,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-06-01-pltr-76",
      "date": "2026-06-01",
      "ticker": "PLTR",
      "label": "PALANTIR TECHNOLOGIES INC C (PLTR)",
      "quantity": 1.553755,
      "price": null,
      "proceeds": 0.0,
      "realizedProfit": 11.9,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-06-01-pltr-77",
      "date": "2026-06-01",
      "ticker": "PLTR",
      "label": "PALANTIR TECHNOLOGIES INC C (PLTR)",
      "quantity": 16.0,
      "price": null,
      "proceeds": 0.0,
      "realizedProfit": 122.51,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-06-01-pltr-78",
      "date": "2026-06-01",
      "ticker": "PLTR",
      "label": "PALANTIR TECHNOLOGIES INC C (PLTR)",
      "quantity": 8.446245,
      "price": null,
      "proceeds": 1378.82,
      "realizedProfit": 279.37,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-06-01-robn-79",
      "date": "2026-06-01",
      "ticker": "ROBN",
      "label": "ROBN 18 JUN 2026 17.0 PUT",
      "quantity": 100.0,
      "price": null,
      "proceeds": 184.94,
      "realizedProfit": 149.9,
      "category": "Sell Put"
    },
    {
      "id": "gk-2026-06-01-robn-80",
      "date": "2026-06-01",
      "ticker": "ROBN",
      "label": "ROBN 18 JUN 2026 18.0 PUT",
      "quantity": 100.0,
      "price": null,
      "proceeds": 204.94,
      "realizedProfit": 159.9,
      "category": "Sell Put"
    },
    {
      "id": "gk-2026-06-02-asts-81",
      "date": "2026-06-02",
      "ticker": "ASTS",
      "label": "ASTS 19 MAR 2027 115.0 CALL",
      "quantity": 100.0,
      "price": null,
      "proceeds": 4689.85,
      "realizedProfit": 429.81,
      "category": "Buy Call"
    },
    {
      "id": "gk-2026-06-02-nvda-82",
      "date": "2026-06-02",
      "ticker": "NVDA",
      "label": "NVDA 19 MAR 2027 215.0 CALL",
      "quantity": 200.0,
      "price": null,
      "proceeds": 9319.7,
      "realizedProfit": 2239.62,
      "category": "Buy Call"
    },
    {
      "id": "gk-2026-06-04-meta-83",
      "date": "2026-06-04",
      "ticker": "META",
      "label": "META 16 JUN 2028 640.0 CALL",
      "quantity": 100.0,
      "price": null,
      "proceeds": 16569.6,
      "realizedProfit": 2159.56,
      "category": "Buy Call"
    },
    {
      "id": "gk-2026-06-05-unhg-84",
      "date": "2026-06-05",
      "ticker": "UNHG",
      "label": "LEVERAGE SHARES 2X LONG UNH (UNHG)",
      "quantity": 19.837387,
      "price": null,
      "proceeds": 427.0,
      "realizedProfit": -9.82,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-06-12-ibit-85",
      "date": "2026-06-12",
      "ticker": "IBIT",
      "label": "IBIT 12 JUN 2026 39.0 PUT",
      "quantity": 100.0,
      "price": null,
      "proceeds": 152.94,
      "realizedProfit": -142.06,
      "category": "Sell Put"
    },
    {
      "id": "manual-2026-06-30-ibit-user",
      "date": "2026-06-30",
      "ticker": "IBIT",
      "label": "IBIT",
      "quantity": null,
      "price": null,
      "proceeds": null,
      "realizedProfit": -142.05,
      "category": "Common Stocks",
      "preserveLabelCasing": true
    },
    {
      "id": "gk-2026-06-15-spcx-86",
      "date": "2026-06-15",
      "ticker": "SPCX",
      "label": "SPACE EXPLORATION TECHNOLOG (SPCX)",
      "quantity": 1.0,
      "price": null,
      "proceeds": 179.0,
      "realizedProfit": 44.0,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-06-16-qbtz-87",
      "date": "2026-06-16",
      "ticker": "QBTZ",
      "label": "DEFIANCE DAILY TARGET 2X SH (QBTZ)",
      "quantity": 350.0,
      "price": null,
      "proceeds": 1303.65,
      "realizedProfit": 99.65,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-06-18-robn-88",
      "date": "2026-06-18",
      "ticker": "ROBN",
      "label": "ROBN 17 JUL 2026 19.0 PUT",
      "quantity": 200.0,
      "price": null,
      "proceeds": 479.9,
      "realizedProfit": 403.82,
      "category": "Sell Put"
    },
    {
      "id": "gk-2026-06-22-mstz-89",
      "date": "2026-06-22",
      "ticker": "MSTZ",
      "label": "T-REX 2X INVERSE MSTR DAILY (MSTZ)",
      "quantity": 86.896827,
      "price": null,
      "proceeds": 1001.32,
      "realizedProfit": 1.32,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-06-22-qbtz-90",
      "date": "2026-06-22",
      "ticker": "QBTZ",
      "label": "DEFIANCE DAILY TARGET 2X SH (QBTZ)",
      "quantity": 400.0,
      "price": null,
      "proceeds": 1639.88,
      "realizedProfit": 107.88,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-06-25-dram-91",
      "date": "2026-06-25",
      "ticker": "DRAM",
      "label": "ROUNDHILL MEMORY ETF (DRAM)",
      "quantity": 20.0,
      "price": null,
      "proceeds": 1518.96,
      "realizedProfit": 119.57,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-06-29-asts-92",
      "date": "2026-06-29",
      "ticker": "ASTS",
      "label": "AST SPACEMOBILE INC CL A (ASTS)",
      "quantity": 20.0,
      "price": null,
      "proceeds": 1637.97,
      "realizedProfit": 67.17,
      "category": "Common Stocks"
    },
    {
      "id": "gk-2026-06-29-asts-93",
      "date": "2026-06-29",
      "ticker": "ASTS",
      "label": "AST SPACEMOBILE INC CL A (ASTS)",
      "quantity": 20.0,
      "price": null,
      "proceeds": 1637.96,
      "realizedProfit": 179.46,
      "category": "Common Stocks"
    }
  ],
  "Jul 2026": [
    { "id": "gk-2026-07-30-amzn-94", "date": "2026-07-30", "ticker": "AMZN", "label": "AMAZON COM INC (AMZN)", "quantity": 7, "price": null, "proceeds": 1805.26, "realizedProfit": 5.29, "category": "Common Stocks" },
    { "id": "gk-2026-07-31-amzn-95", "date": "2026-07-31", "ticker": "AMZN", "label": "AMAZON COM INC (AMZN)", "quantity": 8, "price": null, "proceeds": 2154.35, "realizedProfit": 234.91, "category": "Common Stocks" },
    { "id": "gk-2026-07-21-amba-96", "date": "2026-07-21", "ticker": "AMBA", "label": "AMBARELLA, INC. (AMBA)", "quantity": 17, "price": null, "proceeds": 1164.48, "realizedProfit": 137.68, "category": "Common Stocks" },
    { "id": "gk-2026-07-15-amzn-call-97", "date": "2026-07-15", "ticker": "AMZN", "label": "AMZN 17 JUN 2027 260.0 CALL", "quantity": 200, "price": null, "proceeds": 7739.75, "realizedProfit": 49.67, "category": "Buy Call" },
    { "id": "gk-2026-07-21-crwv-98", "date": "2026-07-21", "ticker": "CRWV", "label": "COREWEAVE INC (CRWV)", "quantity": 20, "price": null, "proceeds": 1637.96, "realizedProfit": 99.96, "category": "Common Stocks" },
    { "id": "gk-2026-07-07-qbtz-99", "date": "2026-07-07", "ticker": "QBTZ", "label": "DEFIANCE DAILY TARGET 2X SH (QBTZ)", "quantity": 200, "price": null, "proceeds": 925.94, "realizedProfit": 36.94, "category": "Common Stocks" },
    { "id": "gk-2026-07-10-qbtz-100", "date": "2026-07-10", "ticker": "QBTZ", "label": "DEFIANCE DAILY TARGET 2X SH (QBTZ)", "quantity": 300, "price": null, "proceeds": 1432.41, "realizedProfit": 115.41, "category": "Common Stocks" },
    { "id": "gk-2026-07-29-qbtz-101", "date": "2026-07-29", "ticker": "QBTZ", "label": "DEFIANCE DAILY TARGET 2X SH (QBTZ)", "quantity": 250, "price": null, "proceeds": 1379.92, "realizedProfit": 14.92, "category": "Common Stocks" },
    { "id": "gk-2026-07-29-soxs-102", "date": "2026-07-29", "ticker": "SOXS", "label": "DIREXION DAILY SEMICONDUCTO (SOXS)", "quantity": 2, "price": null, "proceeds": 146.00, "realizedProfit": -4480.02, "category": "Common Stocks" },
    { "id": "gk-2026-07-27-duol-103", "date": "2026-07-27", "ticker": "DUOL", "label": "DUOLINGO INC (DUOL)", "quantity": 3, "price": null, "proceeds": 400.20, "realizedProfit": -1035.44, "category": "Common Stocks" },
    { "id": "gk-2026-07-28-iren-call-104", "date": "2026-07-28", "ticker": "IREN", "label": "IREN 07 AUG 2026 54.0 CALL", "quantity": 100, "price": null, "proceeds": 119.94, "realizedProfit": 105.90, "category": "Sell Call" },
    { "id": "gk-2026-07-06-iren-call-105", "date": "2026-07-06", "ticker": "IREN", "label": "IREN 10 JUL 2026 57.0 CALL", "quantity": 100, "price": null, "proceeds": 108.94, "realizedProfit": 99.90, "category": "Sell Call" },
    { "id": "gk-2026-07-13-iren-call-106", "date": "2026-07-13", "ticker": "IREN", "label": "IREN 17 JUL 2026 54.0 CALL", "quantity": 100, "price": null, "proceeds": 110.94, "realizedProfit": 94.90, "category": "Sell Call" },
    { "id": "gk-2026-07-21-unhg-107", "date": "2026-07-21", "ticker": "UNHG", "label": "LEVERAGE SHARES 2X LONG UNH (UNHG)", "quantity": 107.228916, "price": null, "proceeds": 2600.22, "realizedProfit": 239.04, "category": "Common Stocks" },
    { "id": "gk-2026-07-21-unhg-108", "date": "2026-07-21", "ticker": "UNHG", "label": "LEVERAGE SHARES 2X LONG UNH (UNHG)", "quantity": 192.771084, "price": null, "proceeds": 4674.56, "realizedProfit": 674.56, "category": "Common Stocks" },
    { "id": "gk-2026-07-01-meta-109", "date": "2026-07-01", "ticker": "META", "label": "META PLATFORMS INC (META)", "quantity": 3, "price": null, "proceeds": 1845.09, "realizedProfit": 20.02, "category": "Common Stocks" },
    { "id": "gk-2026-07-07-meta-110", "date": "2026-07-07", "ticker": "META", "label": "META PLATFORMS INC (META)", "quantity": 3, "price": null, "proceeds": 1835.96, "realizedProfit": 83.96, "category": "Common Stocks" },
    { "id": "gk-2026-07-10-meta-111", "date": "2026-07-10", "ticker": "META", "label": "META PLATFORMS INC (META)", "quantity": 4, "price": null, "proceeds": 2707.93, "realizedProfit": 451.93, "category": "Common Stocks" },
    { "id": "gk-2026-07-16-msft-call-112", "date": "2026-07-16", "ticker": "MSFT", "label": "MSFT 21 JAN 2028 500.0 CALL", "quantity": 100, "price": null, "proceeds": 4921.84, "realizedProfit": 671.80, "category": "Buy Call" },
    { "id": "gk-2026-07-07-pltr-113", "date": "2026-07-07", "ticker": "PLTR", "label": "PALANTIR TECHNOLOGIES INC C (PLTR)", "quantity": 16, "price": null, "proceeds": 2155.15, "realizedProfit": -25.76, "category": "Common Stocks" },
    { "id": "gk-2026-07-07-pltr-114", "date": "2026-07-07", "ticker": "PLTR", "label": "PALANTIR TECHNOLOGIES INC C (PLTR)", "quantity": 12.446245, "price": null, "proceeds": 0, "realizedProfit": 20.04, "category": "Common Stocks" },
    { "id": "gk-2026-07-07-pltr-115", "date": "2026-07-07", "ticker": "PLTR", "label": "PALANTIR TECHNOLOGIES INC C (PLTR)", "quantity": 3.553755, "price": null, "proceeds": 0, "realizedProfit": 5.72, "category": "Common Stocks" },
    { "id": "gk-2026-07-20-pltr-116", "date": "2026-07-20", "ticker": "PLTR", "label": "PALANTIR TECHNOLOGIES INC C (PLTR)", "quantity": 14, "price": null, "proceeds": 1894.16, "realizedProfit": 71.62, "category": "Common Stocks" },
    { "id": "gk-2026-07-20-pltr-117", "date": "2026-07-20", "ticker": "PLTR", "label": "PALANTIR TECHNOLOGIES INC C (PLTR)", "quantity": 1.553755, "price": null, "proceeds": 0, "realizedProfit": 0.41, "category": "Common Stocks" },
    { "id": "gk-2026-07-09-qcom-call-118", "date": "2026-07-09", "ticker": "QCOM", "label": "QCOM 21 JAN 2028 250.0 CALL", "quantity": 100, "price": null, "proceeds": 4764.85, "realizedProfit": 474.81, "category": "Buy Call" },
    { "id": "gk-2026-07-17-robn-call-119", "date": "2026-07-17", "ticker": "ROBN", "label": "ROBN 17 JUL 2026 45.0 CALL", "quantity": 100, "price": null, "proceeds": 109.94, "realizedProfit": 99.90, "category": "Sell Call" },
    { "id": "gk-2026-07-09-sitm-120", "date": "2026-07-09", "ticker": "SITM", "label": "SITIME CORPORATION (SITM)", "quantity": 2, "price": null, "proceeds": 1334.97, "realizedProfit": 63.78, "category": "Common Stocks" },
    { "id": "gk-2026-07-16-mstz-121", "date": "2026-07-16", "ticker": "MSTZ", "label": "T-REX 2X INVERSE MSTR DAILY (MSTZ)", "quantity": 110, "price": null, "proceeds": 1372.75, "realizedProfit": 85.75, "category": "Common Stocks" },
    { "id": "gk-2026-07-23-mstz-122", "date": "2026-07-23", "ticker": "MSTZ", "label": "T-REX 2X INVERSE MSTR DAILY (MSTZ)", "quantity": 120, "price": null, "proceeds": 1451.95, "realizedProfit": 47.95, "category": "Common Stocks" },
    { "id": "gk-2026-07-29-mstz-123", "date": "2026-07-29", "ticker": "MSTZ", "label": "T-REX 2X INVERSE MSTR DAILY (MSTZ)", "quantity": 100, "price": null, "proceeds": 1175.95, "realizedProfit": 22.95, "category": "Common Stocks" },
    { "id": "gk-2026-07-20-unhg-call-124", "date": "2026-07-20", "ticker": "UNHG", "label": "UNHG 17 JUL 2026 25.0 CALL", "quantity": 300, "price": null, "proceeds": 359.86, "realizedProfit": 359.86, "category": "Sell Call" },
    { "id": "gk-2026-07-09-unhg-call-125", "date": "2026-07-09", "ticker": "UNHG", "label": "UNHG 18 SEP 2026 23.0 CALL", "quantity": 300, "price": null, "proceeds": 623.85, "realizedProfit": -441.27, "category": "Sell Call" }
  ]
};

type VerifiedProfitEdit = Partial<ProfitDrilldownTransaction> & { deleted?: boolean };
type VerifiedProfitEdits = Record<string, VerifiedProfitEdit>;
const VERIFIED_PROFIT_EDITS_KEY = "folio-robinhood-verified-profit-edits-v1";
const DYNAMIC_PROFIT_EDITS_KEY = "folio-robinhood-dynamic-profit-edits-v1";
type ExtrasByPortfolio = Record<"robinhood"|"fidelity-roth", ExtraRow[]>;
const EXTRAS_STORAGE_KEY = "folio-portfolio-performance-extras-v1";
type AllTimeHighEntry = { value: number; date: string };
type AllTimeHighByPortfolio = Record<DataPortfolioId, AllTimeHighEntry>;
const ALL_TIME_HIGH_STORAGE_KEY = "folio-portfolio-performance-all-time-high-v1";
const DEFAULT_ALL_TIME_HIGHS: AllTimeHighByPortfolio = {
  robinhood: { value: 108128, date: "2025-11-05" },
  "fidelity-roth": { value: 20134, date: "2025-08-06" },
  "fidelity-401k": { value: 21194, date: "2026-06-02" },
};

const DEFAULT_EXTRAS: ExtrasByPortfolio = {
  robinhood: [
    { id:"rg-interest", label:"RG Interest", amount:651.71, lastPostedDate:"2026-07-31" },
    { id:"rg-deposit-boost", label:"RG Deposit Boost", amount:197.71, lastPostedDate:"2026-07-31" },
    { id:"rg-membership", label:"RG Membership", amount:-93.32, lastPostedDate:"2026-03-04" },
  ],
  "fidelity-roth": [
    { id:"spaxx-dividend", label:"SPAXX Dividend", amount:159.89, lastPostedDate:"2026-07-31" },
    { id:"mags-short-term-cap-gain", label:"MAGS Short - Term Cap Gain", amount:0.86, lastPostedDate:"2024-12-31" },
  ],
};

function formatDisplayDate(value: string) {
  if (!value) return "—";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ExtrasTable({rows,onSave}:{rows:ExtraRow[];onSave:(rows:ExtraRow[])=>void}) {
  const [draft,setDraft]=useState(rows);
  const [editing,setEditing]=useState<{id:string;field:"amount"|"lastPostedDate"}|null>(null);
  useEffect(()=>setDraft(rows),[rows]);
  const total=draft.reduce((sum,row)=>sum+(Number(row.amount)||0),0);
  const update=(id:string,field:"amount"|"lastPostedDate",value:string)=>{
    setDraft(current=>{
      const next=current.map(row=>row.id===id?{...row,[field]:field==="amount"?(value===""?0:Number(value)||0):value}:row);
      onSave(next);
      return next;
    });
  };
  return <Card className="overflow-hidden">
    <CardHeader><h2 className="font-medium">Extras</h2></CardHeader>
    <CardContent><div className="overflow-hidden rounded-t-xl border border-b-0 border-dashed border-zinc-300/80 dark:border-white/15 dark:border-b-0"><table className="w-full table-fixed border-collapse text-xs sm:text-sm">
      <thead><tr className="text-left text-[11px] text-zinc-500 sm:text-xs"><th className="w-[42%] border-b border-r border-dashed border-zinc-300/70 p-3 font-medium dark:border-white/10">Extras</th><th className="w-[25%] border-b border-r border-dashed border-zinc-300/70 p-3 text-right font-medium dark:border-white/10">Amount</th><th className="w-[33%] border-b border-dashed border-zinc-300/70 p-3 text-right font-medium dark:border-white/10">Last Posted Date</th></tr></thead>
      <tbody>{draft.map((row,index)=><tr key={row.id}>
        <td className={cn("border-r border-dashed border-zinc-300/60 p-3 font-medium dark:border-white/10",index<draft.length-1&&"border-b")}>{row.label}</td>
        <td className={cn("border-r border-dashed border-zinc-300/60 p-2 text-right dark:border-white/10",index<draft.length-1&&"border-b")}>
          {editing?.id===row.id&&editing.field==="amount"
            ? <input autoFocus type="number" step="0.01" value={row.amount===0?"":row.amount} placeholder="0.00" onChange={e=>update(row.id,"amount",e.target.value)} onBlur={()=>setEditing(null)} onKeyDown={e=>{if(e.key==="Enter")setEditing(null);}} className={cn("h-9 w-full rounded-lg border border-white/10 bg-transparent px-2 text-right font-medium tabular-nums outline-none",row.amount<0?"negative":"positive")}/>
            : <button type="button" onClick={()=>setEditing({id:row.id,field:"amount"})} className={cn("w-full rounded-md px-2 py-2 text-right font-medium tabular-nums transition hover:bg-white/[.04]",row.amount<0?"negative":"positive")} title="Click To Edit Amount">{money(row.amount)}</button>}
        </td>
        <td className={cn("p-2 text-right",index<draft.length-1&&"border-b border-dashed border-zinc-300/60 dark:border-white/10")}>
          {editing?.id===row.id&&editing.field==="lastPostedDate"
            ? <input autoFocus type="date" value={row.lastPostedDate} onChange={e=>update(row.id,"lastPostedDate",e.target.value)} onBlur={()=>setEditing(null)} onKeyDown={e=>{if(e.key==="Enter")setEditing(null);}} className="h-9 w-full rounded-lg border border-white/10 bg-transparent px-2 text-right text-xs font-medium outline-none"/>
            : <button type="button" onClick={()=>setEditing({id:row.id,field:"lastPostedDate"})} className="w-full rounded-md px-2 py-2 text-right text-xs font-medium transition hover:bg-white/[.04]" title="Click To Edit Last Posted Date">{formatDisplayDate(row.lastPostedDate)}</button>}
        </td>
      </tr>)}
      <tr className="border-t border-zinc-300/60 font-semibold dark:border-white/10"><td className="border-r border-zinc-300/60 p-3 dark:border-white/10">Total</td><td className={cn("border-r border-zinc-300/60 p-3 text-right tabular-nums dark:border-white/10",total<0?"negative":"positive")}>{money(total)}</td><td className="p-3"/></tr></tbody>
    </table></div></CardContent>
  </Card>;
}

// The workbook/manual July 2026 Robinhood baseline is $3,669.10. Only Holdings
// sales created after this build are layered onto that baseline so existing
// historical transactions do not double-count the value the user supplied.
const REALIZED_CHART_FUTURE_SALE_CUTOFF_MS = 1785077788669;
const isFutureHoldingsSale = (transactionId: string) => {
  const match = transactionId.match(/^trade-(\d+)-/);
  return Boolean(match && Number(match[1]) > REALIZED_CHART_FUTURE_SALE_CUTOFF_MS);
};

function Metric({ label, value, detail, icon: Icon, positive }: { label: string; value: string; detail?: string; icon: typeof Landmark; positive?: boolean }) {
  return <Card className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-sm text-zinc-500">{label}</div><div className={cn("mt-2 text-2xl font-semibold tracking-tight", positive === true && "positive", positive === false && "negative")}>{value}</div>{detail && <div className="mt-2 text-xs text-zinc-600">{detail}</div>}</div><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-400"><Icon size={18}/></div></div></Card>;
}

const accountPortfolioIds: Record<string, DataPortfolioId> = {
  Robinhood: "robinhood",
  "Fidelity Roth IRA": "fidelity-roth",
  "Fidelity 401(k)": "fidelity-401k",
};

export default function SavingsInvestmentsPage() {
  const { activeId } = useActivePortfolio();
  const [extras,setExtras]=useState<ExtrasByPortfolio>(DEFAULT_EXTRAS);
  const [allTimeHighs,setAllTimeHighs]=useState<AllTimeHighByPortfolio>(DEFAULT_ALL_TIME_HIGHS);
  const [editingAllTimeHigh,setEditingAllTimeHigh]=useState<{portfolioId:DataPortfolioId;field:"value"|"date"}|null>(null);
  const [profitDrilldown,setProfitDrilldown]=useState<{portfolioId:DataPortfolioId;period:string}|null>(null);
  const [robinhoodChartYear,setRobinhoodChartYear]=useState("2026");
  const [robinhoodChartView,setRobinhoodChartView]=useState<"month"|"year">("month");
  const [verifiedProfitEdits,setVerifiedProfitEdits]=useState<VerifiedProfitEdits>({});
  const [dynamicProfitEdits,setDynamicProfitEdits]=useState<VerifiedProfitEdits>({});
  useEffect(()=>{
    try{
      const raw=window.localStorage.getItem(VERIFIED_PROFIT_EDITS_KEY);
      if(raw)setVerifiedProfitEdits(JSON.parse(raw));
    }catch{}
  },[]);
  useEffect(()=>{
    try{
      const raw=window.localStorage.getItem(DYNAMIC_PROFIT_EDITS_KEY);
      if(raw)setDynamicProfitEdits(JSON.parse(raw));
    }catch{}
  },[]);
  const saveVerifiedProfitEdit=(id:string,patch:VerifiedProfitEdit)=>{
    setVerifiedProfitEdits(current=>{
      const next={...current,[id]:{...(current[id]??{}),...patch}};
      try{window.localStorage.setItem(VERIFIED_PROFIT_EDITS_KEY,JSON.stringify(next));}catch{}
      return next;
    });
  };
  const saveDynamicProfitEdit=(id:string,patch:VerifiedProfitEdit)=>{
    setDynamicProfitEdits(current=>{
      const next={...current,[id]:{...(current[id]??{}),...patch}};
      try{window.localStorage.setItem(DYNAMIC_PROFIT_EDITS_KEY,JSON.stringify(next));}catch{}
      return next;
    });
  };
  const verifiedCloseDateTransactions=useMemo<Record<string,ProfitDrilldownTransaction[]>>(()=>{
    const rebucketed: Record<string,ProfitDrilldownTransaction[]> = {};
    Object.values(ROBINHOOD_VERIFIED_CLOSE_DATE_TRANSACTIONS).flat().forEach(transaction=>{
      const patch=verifiedProfitEdits[transaction.id]??{};
      if(patch.deleted)return;
      const edited={...transaction,...patch,preserveLabelCasing:typeof patch.label==="string"};
      const parsed=new Date(`${edited.date}T12:00:00`);
      if(Number.isNaN(parsed.getTime()))return;
      const period=new Intl.DateTimeFormat("en-US",{month:"short",year:"numeric"}).format(parsed);
      rebucketed[period]=[...(rebucketed[period]??[]),edited];
    });
    return rebucketed;
  },[verifiedProfitEdits]);
  const verifiedCloseDateMonthlyTotals=useMemo<Record<string,number>>(()=>{
    const totals:Record<string,number>={};
    Object.keys(verifiedCloseDateTransactions).forEach(period=>{
      const transactions:ProfitDrilldownTransaction[]=verifiedCloseDateTransactions[period]??[];
      totals[period]=transactions.reduce((sum:number,transaction:ProfitDrilldownTransaction)=>sum+transaction.realizedProfit,0);
    });
    return totals;
  },[verifiedCloseDateTransactions]);

  useEffect(()=>{
    try {
      const saved=window.localStorage.getItem(ALL_TIME_HIGH_STORAGE_KEY);
      if(saved) setAllTimeHighs(current=>({...current,...JSON.parse(saved)}));
    } catch {}
  },[]);
  const updateAllTimeHigh=(portfolioId:DataPortfolioId,field:"value"|"date",raw:string)=>{
    setAllTimeHighs(current=>{
      const next={...current,[portfolioId]:{...current[portfolioId],[field]:field==="value"?(Number(raw)||0):raw}};
      try{window.localStorage.setItem(ALL_TIME_HIGH_STORAGE_KEY,JSON.stringify(next));}catch{}
      return next;
    });
  };
  useEffect(()=>{
    try{
      const saved=window.localStorage.getItem(EXTRAS_STORAGE_KEY);
      if(saved){
        const parsed=JSON.parse(saved) as Partial<ExtrasByPortfolio>;
        setExtras({
          robinhood:Array.isArray(parsed.robinhood)?parsed.robinhood:DEFAULT_EXTRAS.robinhood,
          "fidelity-roth":Array.isArray(parsed["fidelity-roth"])?parsed["fidelity-roth"]:DEFAULT_EXTRAS["fidelity-roth"],
        });
      }
    }catch{}
  },[]);
  const saveExtras=(portfolioId:"robinhood"|"fidelity-roth",rows:ExtraRow[])=>{
    setExtras(current=>{
      const next={...current,[portfolioId]:rows};
      try{window.localStorage.setItem(EXTRAS_STORAGE_KEY,JSON.stringify(next));}catch{}
      return next;
    });
  };
  const holdingsByPortfolio = usePortfolioStore((state) => state.holdingsByPortfolio);
  const cashByPortfolio = usePortfolioStore((state) => state.cashByPortfolio);
  const transactionsByPortfolio = usePortfolioStore((state) => state.transactionsByPortfolio);

  const accounts = useMemo(() => {
    const monthNumber = new Date().getMonth() + 1;
    const monthFraction = (monthNumber - 1) / 12;

    return investmentAccounts.map((account) => {
      const portfolioId = accountPortfolioIds[account.name];
      const summary = portfolioSummary(
        holdingsByPortfolio[portfolioId] ?? [],
        account.name === "Fidelity 401(k)" ? 0 : (cashByPortfolio[portfolioId] ?? 0),
      );
      const current = summary.value;
      const invested = account.invested;
      const gain = current - invested;
      const totalReturn = invested > 0 ? gain / invested : 0;
      const cagrBaseYears = account.name === "Fidelity Roth IRA" ? 1.0833 : 2;
      const cagrYears = cagrBaseYears + monthFraction;
      const cagr = invested > 0 && current > 0
        ? Math.pow(current / invested, 1 / cagrYears) - 1
        : 0;
      const ytd = account.name === "Robinhood"
        ? current / 83745 - 1
        : account.name === "Fidelity Roth IRA"
          ? current / 16452 - 1
          : 0.1465;

      return { ...account, current, gain, totalReturn, cagr, ytd };
    });
  }, [cashByPortfolio, holdingsByPortfolio]);

  const totals = useMemo(() => {
    const invested = accounts.reduce((sum, account) => sum + account.invested, 0);
    const current = accounts.reduce((sum, account) => sum + account.current, 0);
    const gain = current - invested;
    return { invested, current, gain, totalReturn: invested > 0 ? gain / invested : 0 };
  }, [accounts]);

  const realizedSalesByMonth = useMemo(() => {
    const aggregate = (portfolioId: DataPortfolioId) => {
      const monthly = new Map<string, number>();
      (transactionsByPortfolio[portfolioId] ?? []).forEach((transaction) => {
        if (transaction.type !== "sell" || !Number.isFinite(transaction.realizedGain)) return;
        if (!transaction.notes?.includes("Sold from Holdings")) return;
        if (!isFutureHoldingsSale(transaction.id)) return;
        const patch=portfolioId==="robinhood"?(dynamicProfitEdits[transaction.id]??{}):{};
        if(patch.deleted)return;
        const effectiveDate=typeof patch.date==="string"?patch.date:transaction.date;
        const realizedProfit=typeof patch.realizedProfit==="number"?patch.realizedProfit:(transaction.realizedGain??0);
        const date = new Date(`${effectiveDate}T12:00:00`);
        if (Number.isNaN(date.getTime())) return;
        const period = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
        monthly.set(period, (monthly.get(period) ?? 0) + realizedProfit);
      });
      return monthly;
    };
    return {
      robinhood: aggregate("robinhood"),
      roth: aggregate("fidelity-roth"),
    };
  }, [transactionsByPortfolio,dynamicProfitEdits]);

  const profitDrilldownGroups = useMemo<ProfitTickerGroup[]>(() => {
    if (!profitDrilldown) return [];
    const transactions = transactionsByPortfolio[profitDrilldown.portfolioId] ?? [];
    const matching = transactions.map(transaction=>({transaction,patch:profitDrilldown.portfolioId==="robinhood"?(dynamicProfitEdits[transaction.id]??{}):{}})).filter(({transaction,patch}) => {
      if (transaction.type !== "sell" || !Number.isFinite(transaction.realizedGain)) return false;
      if (!transaction.notes?.includes("Sold from Holdings")) return false;
      if (!isFutureHoldingsSale(transaction.id)) return false;
      if(patch.deleted)return false;
      const effectiveDate=typeof patch.date==="string"?patch.date:transaction.date;
      const date = new Date(`${effectiveDate}T12:00:00`);
      if (Number.isNaN(date.getTime())) return false;
      const period = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
      return period === profitDrilldown.period;
    });

    const groups = new Map<string, ProfitDrilldownTransaction[]>();
    matching.forEach(({transaction,patch}) => {
      const ticker = (typeof patch.ticker==="string"?patch.ticker:(transaction.symbol ?? "Other")).trim().toUpperCase() || "Other";
      const optionType = transaction.assetType === "option"
        ? transaction.optionType?.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
        : "";
      const strike = transaction.assetType === "option" && typeof transaction.optionStrike === "number"
        ? ` $${transaction.optionStrike}`
        : "";
      const expiry = transaction.assetType === "option" && transaction.optionExpiry
        ? ` · ${new Date(`${transaction.optionExpiry}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : "";
      const label = transaction.assetType === "option"
        ? `${ticker}${strike} ${optionType || "Option"}${expiry}`
        : ticker;
      const category: ProfitDrilldownTransaction["category"] = transaction.assetType !== "option"
        ? "Common Stocks"
        : transaction.optionType === "sell-call"
          ? "Sell Call"
          : transaction.optionType === "sell-put"
            ? "Sell Put"
            : transaction.optionType === "buy-put"
              ? "Buy Put"
              : "Buy Call";
      const row: ProfitDrilldownTransaction = {
        id: transaction.id,
        date: typeof patch.date==="string"?patch.date:transaction.date,
        ticker,
        label: typeof patch.label==="string"?patch.label:label,
        quantity: typeof transaction.quantity === "number" ? Math.abs(transaction.quantity) : null,
        price: typeof transaction.price === "number" ? transaction.price : null,
        proceeds: typeof transaction.realizedProceeds === "number"
          ? transaction.realizedProceeds
          : transaction.amount ? Math.abs(transaction.amount) : null,
        realizedProfit: typeof patch.realizedProfit==="number"?patch.realizedProfit:(Number(transaction.realizedGain) || 0),
        category: patch.category??category,
        preserveLabelCasing: typeof patch.label==="string",
      };
      groups.set(ticker, [...(groups.get(ticker) ?? []), row]);
    });

    const total = matching.reduce((sum, {transaction,patch}) => sum + (typeof patch.realizedProfit==="number"?patch.realizedProfit:(Number(transaction.realizedGain) || 0)), 0);
    return Array.from(groups.entries())
      .map(([ticker, transactions]) => {
        const realizedProfit = transactions.reduce((sum, transaction) => sum + transaction.realizedProfit, 0);
        return { ticker, realizedProfit, percent: total ? realizedProfit / total * 100 : 0, transactions };
      })
      .sort((a,b) => b.realizedProfit - a.realizedProfit);
  }, [profitDrilldown, transactionsByPortfolio,dynamicProfitEdits]);

  const displayedProfitDrilldownGroups = useMemo<ProfitTickerGroup[]>(()=>{
    if(!profitDrilldown || profitDrilldown.portfolioId!=="robinhood") return profitDrilldownGroups;
    const verified=verifiedCloseDateTransactions[profitDrilldown.period];
    if(!verified) return profitDrilldownGroups;
    const total=verified.reduce((sum,transaction)=>sum+transaction.realizedProfit,0);
    const groupedByTicker=new Map<string,ProfitDrilldownTransaction[]>();
    verified.forEach(transaction=>{
      groupedByTicker.set(transaction.ticker,[...(groupedByTicker.get(transaction.ticker)??[]),transaction]);
    });
    return Array.from(groupedByTicker.entries())
      .map(([ticker,transactions])=>{
        const realizedProfit=transactions.reduce((sum,transaction)=>sum+transaction.realizedProfit,0);
        return {ticker,realizedProfit,percent:total?realizedProfit/total*100:0,transactions};
      })
      .sort((a,b)=>b.realizedProfit-a.realizedProfit);
  },[profitDrilldown,profitDrilldownGroups,verifiedCloseDateTransactions]);

  const profitDrilldownTotal = displayedProfitDrilldownGroups.reduce((sum, group) => sum + group.realizedProfit, 0);

  const mergeMonthlySales = (
    base: { period: string; realizedProfit: number; income: number }[],
    monthlySales: Map<string, number>,
  ) => {
    const rows = base.map((row) => ({ ...row }));
    monthlySales.forEach((profit, period) => {
      const existing = rows.find((row) => row.period === period);
      if (existing) existing.realizedProfit += profit;
      else rows.push({ period, realizedProfit: profit, income: 0 });
    });
    return rows.sort((a, b) => {
      const parsePeriod = (period: string) => {
        const quarter = period.match(/^Q([1-4]) (\d{4})$/);
        if (quarter) return new Date(Number(quarter[2]), (Number(quarter[1]) - 1) * 3, 1).getTime();
        const month = new Date(`${period} 1`);
        return Number.isNaN(month.getTime()) ? 0 : month.getTime();
      };
      return parsePeriod(a.period) - parsePeriod(b.period);
    });
  };

  const robinhoodQuarterly = useMemo(() => {
    const q1=(verifiedCloseDateMonthlyTotals["Jan 2026"]??0)+(verifiedCloseDateMonthlyTotals["Feb 2026"]??0)+(verifiedCloseDateMonthlyTotals["Mar 2026"]??0);
    const q2=(verifiedCloseDateMonthlyTotals["Apr 2026"]??0)+(verifiedCloseDateMonthlyTotals["May 2026"]??0)+(verifiedCloseDateMonthlyTotals["Jun 2026"]??0);
    const base: { period: string; realizedProfit: number; income: number }[] = quarterlyIncome
      .filter((row) => !/^Q[1-4] 2025$/.test(row.period))
      .map((row) => {
        const realizedProfit = row.period === "Q1 2026"
          ? q1
          : row.period === "Q2 2026"
            ? q2
            : row.robinhoodProfit;
        return { period: row.period, realizedProfit, income: row.robinhoodIncome };
      });
    Object.keys(verifiedCloseDateMonthlyTotals).forEach(period=>{
      const realizedProfit:number=verifiedCloseDateMonthlyTotals[period]??0;
      const existing=base.find(row=>row.period===period);
      if(existing) existing.realizedProfit=realizedProfit;
      else base.push({period,realizedProfit,income:0});
    });
    const dividendTotals=new Map<string,number>();
    ROBINHOOD_DIVIDENDS.forEach(dividend=>{const period=dividendPeriod(dividend.date);dividendTotals.set(period,(dividendTotals.get(period)??0)+dividend.amount);});
    dividendTotals.forEach((income,period)=>{
      const existing=base.find(row=>row.period===period);
      if(existing) existing.income=income;
      else base.push({period,realizedProfit:0,income});
    });
    const nonVerifiedMonthlySales = new Map(
      Array.from(realizedSalesByMonth.robinhood.entries()).filter(
        ([period]) => verifiedCloseDateMonthlyTotals[period] === undefined,
      ),
    );
    return mergeMonthlySales(base, nonVerifiedMonthlySales);
  }, [realizedSalesByMonth,verifiedCloseDateMonthlyTotals]);

  const rothQuarterly = useMemo(() => {
    // Fidelity Roth IRA closed-lot realized P/L imported from the Fidelity
    // Portfolio Closed Lots report dated Aug 27, 2026. Keep this account
    // isolated from Robinhood and place each gain/loss in its actual sale month.
    const fidelityRothClosedLotsByMonth: Record<string, number> = {
      "Jan 2025": 218.60,
      "Feb 2025": 1781.29,
      "May 2025": 1608.72,
      "Jun 2025": 2043.83,
      "Aug 2025": 779.46,
      "Sep 2025": 1015.90,
      "Oct 2025": 779.41,
      "Nov 2025": 808.05,
      "Jan 2026": 582.41,
      "Feb 2026": 322.66,
      "Mar 2026": -1427.77,
      "Apr 2026": -1508.22,
      "May 2026": 547.18,
      "Jun 2026": 51.95,
      "Jul 2026": -415.33,
      "Aug 2026": 469.88,
    };

    const rows = quarterlyIncome.map((row) => ({
      period: row.period,
      realizedProfit: row.rothProfit,
      income: row.rothIncome,
    }));

    Object.entries(fidelityRothClosedLotsByMonth).forEach(([period, realizedProfit]) => {
      const existing = rows.find((row) => row.period === period);
      if (existing) existing.realizedProfit = realizedProfit;
      else rows.push({ period, realizedProfit, income: 0 });
    });

    // Manual Roth transactions continue to flow into the chart by date.
    // Avoid adding a duplicate static amount when a month is already supplied
    // by the Fidelity closed-lots report.
    const additionalMonthlySales = new Map(
      Array.from(realizedSalesByMonth.roth.entries()).filter(
        ([period]) => fidelityRothClosedLotsByMonth[period] === undefined,
      ),
    );
    return mergeMonthlySales(rows, additionalMonthlySales);
  }, [realizedSalesByMonth]);

  const incomeTotals = useMemo(() => {
    const sum = (rows: { realizedProfit: number; income: number }[]) => ({
      realizedProfit: rows.reduce((total, row) => total + row.realizedProfit, 0),
      income: rows.reduce((total, row) => total + row.income, 0),
    });
    const robinhood = sum(robinhoodQuarterly);
    const roth = sum(rothQuarterly);
    return {
      robinhood,
      roth,
      total: robinhood.realizedProfit + robinhood.income + roth.realizedProfit + roth.income,
    };
  }, [robinhoodQuarterly, rothQuarterly]);

  const selectedRealizedIncome = activeId === "robinhood"
    ? incomeTotals.robinhood.realizedProfit + incomeTotals.robinhood.income
    : activeId === "fidelity-roth"
      ? incomeTotals.roth.realizedProfit + incomeTotals.roth.income
      : activeId === "fidelity-401k"
        ? 0
        : incomeTotals.total;

  const yearlyRealizedIncome = useMemo(() => {
    const summarize = (rows: { period: string; realizedProfit: number; income: number }[]) => {
      const totals = new Map<string, { realizedProfit: number; income: number }>();
      rows.forEach((row) => {
        const yearMatch = row.period.match(/(20\d{2})/);
        if (!yearMatch) return;
        const year = yearMatch[1];
        const current = totals.get(year) ?? { realizedProfit: 0, income: 0 };
        current.realizedProfit += row.realizedProfit;
        current.income += row.income;
        totals.set(year, current);
      });
      return ["2024", "2025", "2026"].map((year) => {
        const values = totals.get(year) ?? { realizedProfit: 0, income: 0 };
        return {
          year: year === "2026" ? "2026 YTD" : year,
          realizedProfit: values.realizedProfit,
          income: values.income,
          total: values.realizedProfit + values.income,
        };
      });
    };

    if (activeId === "robinhood") return summarize(robinhoodQuarterly);
    if (activeId === "fidelity-roth") return summarize(rothQuarterly);
    if (activeId === "fidelity-401k") return summarize([]);
    return summarize([...robinhoodQuarterly, ...rothQuarterly]);
  }, [activeId, robinhoodQuarterly, rothQuarterly]);

  const selected2026Income = yearlyRealizedIncome.find((row) => row.year === "2026 YTD")?.total ?? 0;

  const brokerageIncomeTotals = useMemo(() => [
    { account: "Robinhood", realizedProfit: incomeTotals.robinhood.realizedProfit, income: incomeTotals.robinhood.income },
    { account: "Fidelity Roth IRA", realizedProfit: incomeTotals.roth.realizedProfit, income: incomeTotals.roth.income },
  ], [incomeTotals]);

  const dynamicYtd = useMemo(() => ({
    Robinhood: accounts.find((account) => account.name === "Robinhood")?.ytd ?? 0,
    "Fidelity Roth IRA": accounts.find((account) => account.name === "Fidelity Roth IRA")?.ytd ?? 0,
    "Fidelity 401(k)": 0.1465,
  }), [accounts]);

  const robinhoodChartData=useMemo(()=>robinhoodQuarterly.filter(row=>{
    const yearMatch=row.period.match(/(20\d{2})/);
    if(yearMatch?.[1]!==robinhoodChartYear)return false;
    if(robinhoodChartYear==="2026"&&/^Q[12] 2026$/.test(row.period))return false;
    return true;
  }),[robinhoodQuarterly,robinhoodChartYear]);
  const robinhoodAnnualChartData=useMemo(()=>{
    const annual=new Map<string,{period:string;realizedProfit:number;income:number}>();
    robinhoodQuarterly.forEach(row=>{
      const year=row.period.match(/(20\d{2})/)?.[1];
      if(!year)return;
      if(year==="2026"&&/^Q[12] 2026$/.test(row.period))return;
      const current=annual.get(year)??{period:year,realizedProfit:0,income:0};
      current.realizedProfit+=row.realizedProfit;
      current.income+=row.income;
      annual.set(year,current);
    });
    return Array.from(annual.values()).sort((a,b)=>a.period.localeCompare(b.period));
  },[robinhoodQuarterly]);

  const drilldownAdjacentPeriods=useMemo(()=>{
    if(!profitDrilldown)return {previous:null as string|null,next:null as string|null};
    const match=profitDrilldown.period.match(/^([A-Z][a-z]{2}) (20\d{2})$/);
    if(!match)return {previous:null as string|null,next:null as string|null};
    const monthIndex=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(match[1]);
    if(monthIndex<0)return {previous:null as string|null,next:null as string|null};
    const currentDate=new Date(Number(match[2]),monthIndex,1);
    const formatPeriod=(date:Date)=>new Intl.DateTimeFormat("en-US",{month:"short",year:"numeric"}).format(date);
    const previousCandidate=formatPeriod(new Date(currentDate.getFullYear(),currentDate.getMonth()-1,1));
    const nextCandidate=formatPeriod(new Date(currentDate.getFullYear(),currentDate.getMonth()+1,1));
    const available=new Set<string>();
    if(profitDrilldown.portfolioId==="robinhood") {
      robinhoodQuarterly.forEach(row=>{if(/^[A-Z][a-z]{2} 20\d{2}$/.test(row.period))available.add(row.period);});
      Object.keys(verifiedCloseDateTransactions).forEach(period=>available.add(period));
    } else if(profitDrilldown.portfolioId==="fidelity-roth") {
      rothQuarterly.forEach(row=>{if(/^[A-Z][a-z]{2} 20\d{2}$/.test(row.period))available.add(row.period);});
    }
    return {previous:available.has(previousCandidate)?previousCandidate:null,next:available.has(nextCandidate)?nextCandidate:null};
  },[profitDrilldown,robinhoodQuarterly,rothQuarterly,verifiedCloseDateTransactions]);

  const selectedVisual = activeId === "robinhood"
    ? null
    : activeId === "fidelity-roth"
      ? <QuarterlyChart title="Fidelity Roth IRA Quarterly Data" subtitle="Profit Vs Dividend, Interest & Bonus By Quarter" data={rothQuarterly} onProfitBarClick={(period)=>setProfitDrilldown({portfolioId:"fidelity-roth",period})}/>
      : activeId === "fidelity-401k"
        ? <YtdAccountChart account="Fidelity 401(k)" data={ytdPerformance.find((row) => row.account === "401(k) IRA") ?? { account: "401(k) IRA", "2024": 0, "2025": 0, "2026": 0.1465 }} currentYtd={dynamicYtd["Fidelity 401(k)"]}/>
        : <IncomeTotalsChart data={brokerageIncomeTotals}/>;

  return <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Portfolio Performance</h1>
    </div>

    <div className="grid gap-4 xl:grid-cols-3">
      {accounts.map((account) => <Card key={account.name} className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div><div className="text-sm text-zinc-500">Brokerage Account</div><h2 className="mt-1 text-lg font-semibold">{account.name}</h2></div>
          <div className={cn("rounded-xl px-2.5 py-1.5 text-xs font-medium", account.totalReturn >= 0 ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400")}>{pct(account.totalReturn)}</div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-zinc-200 pt-4 dark:border-white/10">
          <div><div className="text-xs text-zinc-500">Investment</div><div className="mt-1 text-xl font-semibold">{money(account.invested)}</div></div>
          <div><div className="text-xs text-zinc-500">Current Value</div><div className="mt-1 text-xl font-semibold">{money(account.current)}</div></div>
          <div><div className="text-xs text-zinc-500">Total Gain</div><div className={cn("mt-1 text-xl font-semibold",account.gain>=0?"positive":"negative")}>{money(account.gain)}</div></div>
          <div><div className="text-xs text-zinc-500">Total Return</div><div className={cn("mt-1 text-sm font-medium",account.totalReturn>=0?"positive":"negative")}>{pct(account.totalReturn)}</div></div>
          <div><div className="text-xs text-zinc-500">CAGR</div><div className={cn("mt-1 text-sm font-medium",account.cagr>=0?"positive":"negative")}>{pct(account.cagr)}</div></div>
          <div><div className="text-xs text-zinc-500">2026 YTD</div><div className={cn("mt-1 text-sm font-medium",account.ytd>=0?"positive":"negative")}>{pct(account.ytd)}</div></div>
        </div>
        <div className="mt-4 space-y-2 text-xs">
          <div className="grid min-h-7 grid-cols-[auto_1fr] items-center gap-4">
            <span className="text-zinc-500">Portfolio Start</span>
            <span className="text-right text-zinc-400">{account.start}</span>
          </div>
          {(()=>{
            const portfolioId=accountPortfolioIds[account.name];
            const ath=allTimeHighs[portfolioId];
            return <div className="grid min-h-7 grid-cols-[auto_1fr] items-center gap-4">
              <span className="text-zinc-500">All-Time High</span>
              {editingAllTimeHigh?.portfolioId===portfolioId
                ? <div className="flex min-w-0 flex-wrap justify-end gap-2"><input autoFocus type="number" step="1" value={ath.value||""} onChange={e=>updateAllTimeHigh(portfolioId,"value",e.target.value)} className="h-8 w-28 rounded-lg border border-white/10 bg-transparent px-2 text-right text-xs text-zinc-300 outline-none"/><input type="date" value={ath.date} onChange={e=>updateAllTimeHigh(portfolioId,"date",e.target.value)} onKeyDown={e=>{if(e.key==="Enter")setEditingAllTimeHigh(null);}} className="h-8 w-36 rounded-lg border border-white/10 bg-transparent px-2 text-right text-xs text-zinc-300 outline-none"/><button type="button" onClick={()=>setEditingAllTimeHigh(null)} className="h-8 rounded-lg border border-white/10 px-2 text-xs text-zinc-400 hover:bg-white/[.04]">Done</button></div>
                : <button type="button" onClick={()=>setEditingAllTimeHigh({portfolioId,field:"value"})} className="justify-self-end whitespace-nowrap p-0 text-right text-xs text-zinc-400 transition hover:text-zinc-200" title="Click To Edit All-Time High">{wholeDollar(ath.value)} On {formatDisplayDate(ath.date)}</button>}
            </div>;
          })()}
        </div>
      </Card>)}
    </div>

    {selectedVisual}

    {profitDrilldown && <ProfitDrilldownModal
      period={profitDrilldown.period}
      groups={displayedProfitDrilldownGroups}
      total={profitDrilldownTotal}
      dividends={profitDrilldown.portfolioId==="robinhood"?ROBINHOOD_DIVIDENDS.filter(dividend=>dividendPeriod(dividend.date)===profitDrilldown.period):[]}
      onEditTransaction={profitDrilldown.portfolioId==="robinhood"?(verifiedCloseDateTransactions[profitDrilldown.period]?saveVerifiedProfitEdit:saveDynamicProfitEdit):undefined}
      onPrevious={drilldownAdjacentPeriods.previous?()=>setProfitDrilldown(current=>current?{...current,period:drilldownAdjacentPeriods.previous!}:current):undefined}
      onNext={drilldownAdjacentPeriods.next?()=>setProfitDrilldown(current=>current?{...current,period:drilldownAdjacentPeriods.next!}:current):undefined}
      onClose={()=>setProfitDrilldown(null)}
    />}

    <div className="space-y-6">
        <Card className="overflow-hidden">
          <CardHeader><h2 className="font-medium">YTD Performance</h2></CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-dashed border-zinc-300/80 dark:border-white/15">
              <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
                <thead><tr className="text-left text-[11px] text-zinc-500 sm:text-xs">
                  <th className="w-[43%] border-b border-r border-dashed border-zinc-300/70 p-3 font-medium dark:border-white/10">Account</th>
                  <th className="w-[19%] border-b border-r border-dashed border-zinc-300/70 p-3 text-right font-medium dark:border-white/10">2024</th>
                  <th className="w-[19%] border-b border-r border-dashed border-zinc-300/70 p-3 text-right font-medium dark:border-white/10">2025</th>
                  <th className="w-[19%] border-b border-dashed border-zinc-300/70 p-3 text-right font-medium dark:border-white/10">2026</th>
                </tr></thead>
                <tbody>{ytdPerformance.map((row, index)=>{
                  const displayAccount = row.account === "Roth IRA" ? "Fidelity Roth IRA" : row.account === "401(k) IRA" ? "Fidelity 401(k)" : row.account;
                  const currentYtd = dynamicYtd[displayAccount as keyof typeof dynamicYtd];
                  const rowBorder = index < ytdPerformance.length - 1 ? "border-b border-dashed border-zinc-300/60 dark:border-white/10" : "";
                  return <tr key={row.account}>
                    <td className={cn("break-words border-r border-dashed border-zinc-300/60 p-3 font-medium leading-tight dark:border-white/10", rowBorder)}>{displayAccount}</td>
                    <td className={cn("border-r border-dashed border-zinc-300/60 p-3 text-right font-medium tabular-nums dark:border-white/10", rowBorder,row["2024"]>=0?"positive":"negative")}>{pct(row["2024"])}</td>
                    <td className={cn("border-r border-dashed border-zinc-300/60 p-3 text-right font-medium tabular-nums dark:border-white/10", rowBorder,row["2025"]>=0?"positive":"negative")}>{pct(row["2025"])}</td>
                    <td className={cn("p-3 text-right font-medium tabular-nums", rowBorder,currentYtd>=0?"positive":"negative")}>{pct(currentYtd)}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
    </div>
  </div>;
}

function chartValueLabel(value: number) {
  return wholeDollar(value);
}

function chartAxisValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function QuarterlyChart({ title, subtitle, data, onProfitBarClick, selectedYear, onYearChange, yearOptions, selectedView, onViewChange }: { title: string; subtitle: string; data: { period: string; realizedProfit: number; income: number }[]; onProfitBarClick?: (period:string)=>void; selectedYear?:string; onYearChange?:(year:string)=>void; yearOptions?:string[]; selectedView?:"month"|"year"; onViewChange?:(view:"month"|"year")=>void }) {
  const gradientId=title.replace(/\W/g, "");
  const isMonthly=(period:string)=>/^[A-Z][a-z]{2} 20\d{2}$/.test(period);
  const canOpenPeriod=(period:string)=>isMonthly(period)||(selectedView==="year"&&/^20\d{2}$/.test(period));
  const openProfitDetail=(entry:any)=>{
    const period=entry?.payload?.period??entry?.period;
    if(typeof period==="string"&&canOpenPeriod(period)) onProfitBarClick?.(period);
  };
  const PeriodTick=(props:any)=>{
    const {x,y,payload}=props;
    const period=String(payload?.value??"");
    const clickable=Boolean(onProfitBarClick&&canOpenPeriod(period));
    return <g transform={`translate(${x},${y})`} onClick={()=>clickable&&onProfitBarClick?.(period)} style={{cursor:clickable?"pointer":"default"}}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill={clickable?"#a1a1aa":"#71717a"} fontSize={10} fontWeight={clickable?600:400}>{period}</text>
    </g>;
  };
  return <Card className="overflow-hidden">
    <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-zinc-200/70 dark:border-white/[.06]">
      <div><h2 className="font-medium">{title}</h2><p className="mt-1 text-xs text-zinc-500">{subtitle}</p></div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {selectedView&&onViewChange&&<div className="inline-flex h-9 overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10">{(["month","year"] as const).map(view=><button key={view} type="button" onClick={()=>onViewChange(view)} className={cn("px-3 text-xs font-semibold capitalize transition",selectedView===view?"bg-emerald-500 text-zinc-950":"text-zinc-500 hover:text-zinc-200")}>{view}</button>)}</div>}
        {selectedYear&&onYearChange&&selectedView!=="year"&&<select value={selectedYear} onChange={event=>onYearChange(event.target.value)} className="h-9 rounded-xl border border-zinc-200 bg-transparent px-3 text-sm font-medium outline-none dark:border-white/10 dark:bg-zinc-950">{(yearOptions??[]).map(year=><option key={year} value={year}>{year}</option>)}</select>}
      </div>
    </CardHeader>
    <CardContent className="pt-5">
      <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} barGap={6} barCategoryGap="22%" margin={{left:4,right:12,top:28,bottom:4}} onClick={(state:any)=>{const period=state?.activePayload?.[0]?.payload?.period;if(typeof period==="string"&&canOpenPeriod(period)) onProfitBarClick?.(period);}} style={{cursor:onProfitBarClick?"pointer":"default"}}>
        <defs><linearGradient id={`${gradientId}-profit`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={1}/><stop offset="100%" stopColor="#10b981" stopOpacity={0.65}/></linearGradient><linearGradient id={`${gradientId}-income`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.65}/></linearGradient><linearGradient id={`${gradientId}-negative`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb7185" stopOpacity={1}/><stop offset="100%" stopColor="#e11d48" stopOpacity={0.72}/></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(161,161,170,.13)"/>
        <XAxis dataKey="period" tick={<PeriodTick/>} axisLine={false} tickLine={false} interval={0} height={34}/>
        <YAxis tick={{fill:"#71717a",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={(v: number)=>chartAxisValue(v)}/>
        <Tooltip cursor={{fill:"rgba(161,161,170,.06)"}} contentStyle={{background:"#18181b",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,color:"#f4f4f5",boxShadow:"0 12px 30px rgba(0,0,0,.25)"}} formatter={(value: any)=>money(Number(value))}/>
        <Legend wrapperStyle={{fontSize:12,paddingTop:14}} iconType="circle"/>
        <Bar dataKey="realizedProfit" name="Profit" fill={`url(#${gradientId}-profit)`} radius={[7,7,2,2]} maxBarSize={34} onClick={openProfitDetail} style={{cursor:onProfitBarClick?"pointer":"default"}}>
          {data.map((row)=><Cell key={`profit-${row.period}`} fill={row.realizedProfit<0?`url(#${gradientId}-negative)`:`url(#${gradientId}-profit)`}/>)}
          <LabelList dataKey="realizedProfit" position="top" formatter={(value: any)=>chartValueLabel(Number(value))} fill="#e4e4e7" fontSize={11} fontWeight={700} stroke="#09090b" strokeWidth={2} paintOrder="stroke"/>
        </Bar>
        <Bar dataKey="income" name="Dividends & Interest" fill={`url(#${gradientId}-income)`} radius={[7,7,2,2]} maxBarSize={34} onClick={openProfitDetail} style={{cursor:onProfitBarClick?"pointer":"default"}}>
          {data.map((row)=><Cell key={`income-${row.period}`} fill={row.income<0?`url(#${gradientId}-negative)`:`url(#${gradientId}-income)`}/>)}
          <LabelList dataKey="income" position="top" formatter={(value: any)=>chartValueLabel(Number(value))} fill="#e4e4e7" fontSize={11} fontWeight={700} stroke="#09090b" strokeWidth={2} paintOrder="stroke"/>
        </Bar>
      </BarChart></ResponsiveContainer></div>
      
    </CardContent>
  </Card>;
}

function EditableProfitCell({value,display,kind="text",onSave,options,className}:{value:string|number|null;display:string;kind?:"text"|"number"|"date"|"select";onSave?:(value:string|number|null)=>void;options?:string[];className?:string}) {
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(value===null?"":String(value));
  const cancelBlur=useRef(false);
  useEffect(()=>{if(!editing)setDraft(value===null?"":String(value));},[value,editing]);
  if(!onSave)return <td className={cn("px-4 py-3",className)}>{display}</td>;
  const commit=()=>{
    if(cancelBlur.current){cancelBlur.current=false;setEditing(false);return;}
    const next=kind==="number"?(draft.trim()===""?null:Number(draft)):draft;
    onSave(next);
    setEditing(false);
  };
  const keyDown=(event:any)=>{
    if(event.key==="Enter"){event.preventDefault();event.currentTarget.blur();}
    if(event.key==="Escape"){event.preventDefault();cancelBlur.current=true;setDraft(value===null?"":String(value));event.currentTarget.blur();}
  };
  return <td className={cn("px-4 py-3",className)}>
    {editing ? kind==="select"
      ? <select autoFocus value={draft} onChange={event=>setDraft(event.target.value)} onBlur={commit} onKeyDown={keyDown} className="h-9 rounded-lg border border-emerald-400/30 bg-zinc-950 px-2 text-sm outline-none">{(options??[]).map(option=><option key={option} value={option}>{option}</option>)}</select>
      : <input autoFocus type={kind} step={kind==="number"?"any":undefined} value={draft} onChange={event=>setDraft(event.target.value)} onBlur={commit} onKeyDown={keyDown} className="h-9 min-w-24 max-w-56 rounded-lg border border-emerald-400/30 bg-zinc-950 px-2 text-sm outline-none"/>
      : <button type="button" onClick={()=>setEditing(true)} className="w-full cursor-text rounded-md text-left transition hover:bg-white/[.035] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400/40" title="Click To Edit">{display}</button>}
  </td>;
}

function formatPositionLabel(value:string) {
  const words=value.trim().split(/\s+/);
  if(words.length===0)return value;
  const ticker=words[0].toUpperCase();
  const formatted=words.slice(1).map((word,index,rest)=>{
    const lower=word.toLowerCase();
    const isCallPut=lower==="call"||lower==="put";
    const next=rest[index+1]?.toLowerCase();
    const looksStrike=/^\d+(?:\.\d+)?$/.test(word)&&next&&(next==="call"||next==="put");
    if(looksStrike)return `$${word}`;
    if(/^\d+(?:\.\d+)?$/.test(word))return word;
    if(isCallPut)return lower.charAt(0).toUpperCase()+lower.slice(1);
    if(/^[a-z]{3}$/i.test(word))return lower.charAt(0).toUpperCase()+lower.slice(1);
    return lower.charAt(0).toUpperCase()+lower.slice(1);
  });
  return [ticker,...formatted].join(" ");
}

function ProfitDrilldownModal({period,groups,total,dividends,onEditTransaction,onPrevious,onNext,onClose}:{period:string;groups:ProfitTickerGroup[];total:number;dividends:DividendTransaction[];onEditTransaction?:(id:string,patch:VerifiedProfitEdit)=>void;onPrevious?:()=>void;onNext?:()=>void;onClose:()=>void}) {
  const [detailView,setDetailView]=useState<"profit"|"dividends">("profit");
  useEffect(()=>setDetailView("profit"),[period]);
  const dividendTotal=dividends.reduce((sum,dividend)=>sum+dividend.amount,0);
  const incomeCategory=(dividend:DividendTransaction):"Dividends"|"Robinhood Gold"|"Interest"=>{
    if(dividend.ticker==="Interest Payment")return "Interest";
    if(dividend.ticker.endsWith(" Dividend"))return "Dividends";
    return "Robinhood Gold";
  };
  const totalDividends=dividends.filter(item=>incomeCategory(item)==="Dividends").reduce((sum,item)=>sum+item.amount,0);
  const totalRobinhoodGold=dividends.filter(item=>incomeCategory(item)==="Robinhood Gold").reduce((sum,item)=>sum+item.amount,0);
  const totalInterest=dividends.filter(item=>incomeCategory(item)==="Interest").reduce((sum,item)=>sum+item.amount,0);
  const [transactionSort,setTransactionSort]=useState<"date"|"realizedProfit">("realizedProfit");
  const [transactionSortDirection,setTransactionSortDirection]=useState<"asc"|"desc">("desc");
  const transactions=groups
    .flatMap(group=>group.transactions.map(transaction=>({...transaction,groupTicker:group.ticker})))
    .sort((a,b)=>{
      const comparison=transactionSort==="date"
        ? a.date.localeCompare(b.date)
        : a.realizedProfit-b.realizedProfit;
      if(comparison!==0)return transactionSortDirection==="asc"?comparison:-comparison;
      return b.date.localeCompare(a.date)||b.id.localeCompare(a.id);
    });
  const [editingTransaction,setEditingTransaction]=useState<(ProfitDrilldownTransaction & {groupTicker:string})|null>(null);
  const [draft,setDraft]=useState<ProfitDrilldownTransaction|null>(null);
  const categoryOrder: ProfitDrilldownTransaction["category"][]=["Common Stocks","Sell Call","Sell Put","Buy Call","Buy Put"];
  const categoryTotals=categoryOrder.map(category=>{
    const categoryTransactions=transactions.filter(transaction=>transaction.category===category);
    return {
      category,
      realizedProfit:categoryTransactions.reduce((sum,transaction)=>sum+transaction.realizedProfit,0),
      count:categoryTransactions.length,
    };
  }).filter(item=>Math.abs(item.realizedProfit)>0.000001)
    .sort((a,b)=>b.realizedProfit-a.realizedProfit);
  const changeTransactionSort=(column:"date"|"realizedProfit")=>{
    if(transactionSort===column)setTransactionSortDirection(current=>current==="asc"?"desc":"asc");
    else {
      setTransactionSort(column);
      setTransactionSortDirection("desc");
    }
  };
  const TransactionSortHeader=({label,column,right=false}:{label:string;column:"date"|"realizedProfit";right?:boolean})=>{
    const active=transactionSort===column;
    const SortIcon=!active?ArrowUpDown:transactionSortDirection==="asc"?ArrowUp:ArrowDown;
    return <button type="button" onClick={()=>changeTransactionSort(column)} className={cn("inline-flex w-full items-center gap-2 transition hover:text-zinc-200",right&&"justify-end",active&&"text-emerald-400")} aria-label={`Sort By ${label} ${active?(transactionSortDirection==="asc"?"Ascending":"Descending"):""}`} title={active?`${label}: ${transactionSortDirection==="asc"?"Ascending":"Descending"}`:`Sort By ${label}`}>{label}<SortIcon size={14} className={active?"text-emerald-400":"opacity-25"}/></button>;
  };
  const dateText=(value:string)=>new Date(`${value}T12:00:00`).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  const openEditor=(transaction:ProfitDrilldownTransaction & {groupTicker:string})=>{
    if(!onEditTransaction)return;
    setEditingTransaction(transaction);
    setDraft({...transaction});
  };
  const saveEditor=()=>{
    if(!editingTransaction||!draft||!onEditTransaction)return;
    onEditTransaction(editingTransaction.id,{
      date:draft.date,
      category:draft.category,
      ticker:draft.ticker.trim().toUpperCase(),
      label:draft.label.trim(),
      quantity:draft.quantity,
      price:draft.price,
      proceeds:draft.proceeds,
      realizedProfit:draft.realizedProfit,
    });
    setEditingTransaction(null);
    setDraft(null);
  };
  const deleteEditor=()=>{
    if(!editingTransaction||!onEditTransaction)return;
    onEditTransaction(editingTransaction.id,{deleted:true});
    setEditingTransaction(null);
    setDraft(null);
  };
  const setDraftField=<K extends keyof ProfitDrilldownTransaction>(field:K,value:ProfitDrilldownTransaction[K])=>setDraft(current=>current?{...current,[field]:value}:current);

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event)=>{if(event.currentTarget===event.target)onClose();}}>
    <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 shadow-[0_30px_90px_rgba(0,0,0,.55)]">
      <div className="sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/[.07] bg-zinc-950/95 px-5 py-4 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {onPrevious&&<button type="button" onClick={onPrevious} className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 text-zinc-400 transition hover:bg-white/[.05] hover:text-white" aria-label="Previous Month" title="Previous Month"><ChevronLeft size={18}/></button>}
          <h2 className="truncate text-xl font-semibold">{period} Details</h2>
          {onNext&&<button type="button" onClick={onNext} className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 text-zinc-400 transition hover:bg-white/[.05] hover:text-white" aria-label="Next Month" title="Next Month"><ChevronRight size={18}/></button>}
        </div>
        <div className="inline-flex h-9 overflow-hidden rounded-xl border border-white/10">
          <button type="button" onClick={()=>setDetailView("profit")} className={cn("px-4 text-xs font-semibold transition",detailView==="profit"?"bg-emerald-500 text-zinc-950":"text-zinc-400 hover:text-white")}>Realized P/L</button>
          <button type="button" onClick={()=>setDetailView("dividends")} className={cn("px-4 text-xs font-semibold transition",detailView==="dividends"?"bg-blue-500 text-white":"text-zinc-400 hover:text-white")}>Dividends & Interest</button>
        </div>
        <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center justify-self-end rounded-xl border border-white/10 text-zinc-500 transition hover:bg-white/[.05] hover:text-white" aria-label="Close Details"><X size={17}/></button>
      </div>
      <div className="p-5 sm:p-6">
        {detailView==="dividends" ? <div>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-5">
              <p className="text-xs uppercase tracking-[.14em] text-zinc-600">Total Dividends</p>
              <p className={cn("mt-3 text-2xl font-semibold",totalDividends>=0?"text-blue-400":"text-rose-400")}>{money(totalDividends)}</p>
            </div>
            <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-5">
              <p className="text-xs uppercase tracking-[.14em] text-zinc-600">Total Robinhood Gold</p>
              <p className={cn("mt-3 text-2xl font-semibold",totalRobinhoodGold>=0?"text-blue-400":"text-rose-400")}>{money(totalRobinhoodGold)}</p>
            </div>
            <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-5">
              <p className="text-xs uppercase tracking-[.14em] text-zinc-600">Total Interest</p>
              <p className={cn("mt-3 text-2xl font-semibold",totalInterest>=0?"text-blue-400":"text-rose-400")}>{money(totalInterest)}</p>
            </div>
          </div>
          <div className="mb-5 rounded-2xl border border-white/[.08] bg-white/[.025] p-5">
            <p className="text-xs uppercase tracking-[.14em] text-zinc-600">Total Dividends & Interest</p>
            <p className={cn("mt-3 text-3xl font-semibold",dividendTotal>=0?"text-blue-400":"text-rose-400")}>{money(dividendTotal)}</p>
            <p className="mt-2 text-xs text-zinc-600">{dividends.length} {dividends.length===1?"Entry":"Entries"}</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.02]">
            <div className="border-b border-white/[.07] px-4 py-3"><h3 className="text-sm font-semibold">Dividends & Interest By Transaction</h3></div>
            {dividends.length===0?<div className="px-6 py-14 text-center text-sm text-zinc-500">No dividend or interest entries are available for {period}.</div>:<div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm">
              <thead className="bg-white/[.025] text-left text-xs text-zinc-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
              <tbody>{[...dividends].sort((a,b)=>a.date.localeCompare(b.date)).map((dividend,index)=><tr key={`${dividend.date}-${dividend.ticker}-${index}`} className="border-t border-white/[.06]"><td className="px-4 py-3 text-zinc-400">{new Date(`${dividend.date}T12:00:00`).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</td><td className="px-4 py-3 font-semibold">{dividend.ticker}</td><td className="px-4 py-3 text-zinc-400">{incomeCategory(dividend)}</td><td className={cn("px-4 py-3 text-right font-semibold",dividend.amount>=0?"text-blue-400":"text-rose-400")}>{money(dividend.amount)}</td></tr>)}</tbody>
            </table></div>}
          </div>
        </div> : groups.length===0?<><div className="mb-5"><p className="text-xs uppercase tracking-[.14em] text-zinc-600">Total Profit</p><p className={cn("mt-1 text-3xl font-semibold",total>=0?"text-emerald-400":"text-rose-400")}>{money(total)}</p></div><div className="rounded-2xl border border-white/10 bg-white/[.025] px-6 py-16 text-center text-sm text-zinc-500">No transaction-level profit details are available for {period}.</div></>:<>
          <div>
            <div className="mb-3"><h3 className="text-sm font-semibold">Profit By Position Type</h3></div>
            <div className={cn("grid gap-3 sm:grid-cols-2",categoryTotals.length===1&&"xl:grid-cols-2",categoryTotals.length===2&&"xl:grid-cols-3",categoryTotals.length===3&&"xl:grid-cols-4",categoryTotals.length===4&&"xl:grid-cols-5",categoryTotals.length>=5&&"xl:grid-cols-3")}>
              <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4">
                <p className="text-xs uppercase tracking-[.14em] text-zinc-600">Total Profit</p>
                <p className={cn("mt-3 text-2xl font-semibold",total>=0?"text-emerald-400":"text-rose-400")}>{money(total)}</p>
                <p className="mt-2 text-xs text-zinc-600">{transactions.length} {transactions.length===1?"Transaction":"Transactions"}</p>
              </div>
              {categoryTotals.map(item=><div key={item.category} className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4">
                <p className="text-sm font-medium text-zinc-400">{item.category}</p>
                <p className={cn("mt-3 text-2xl font-semibold",item.realizedProfit>0?"text-emerald-400":"text-rose-400")}>{money(item.realizedProfit)}</p>
                <p className="mt-2 text-xs text-zinc-600">{item.count} {item.count===1?"Transaction":"Transactions"}</p>
              </div>)}
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.02]">
            <div className="border-b border-white/[.07] px-4 py-3"><h3 className="text-sm font-semibold">Profit By Ticker</h3></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm">
              <thead className="bg-white/[.025] text-left text-xs text-zinc-500"><tr><th className="px-4 py-3">Ticker</th><th className="px-4 py-3 text-right">Transactions</th><th className="px-4 py-3 text-right">Realized P/L</th></tr></thead>
              <tbody>{groups.map(group=><tr key={group.ticker} className="border-t border-white/[.06]"><td className="px-4 py-3 font-semibold">{group.ticker}</td><td className="px-4 py-3 text-right text-zinc-400">{group.transactions.length}</td><td className={cn("px-4 py-3 text-right font-semibold",group.realizedProfit>0?"text-emerald-400":group.realizedProfit<0?"text-rose-400":"text-zinc-400")}>{money(group.realizedProfit)}</td></tr>)}</tbody>
            </table></div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.02]">
            <div className="border-b border-white/[.07] px-4 py-3">
              <h3 className="text-sm font-semibold">Profit By Transaction</h3>
            </div>
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
              <thead className="bg-white/[.025] text-left text-xs text-zinc-500"><tr><th className="px-4 py-3">Rank</th><th className="px-4 py-3"><TransactionSortHeader label="Date" column="date" /></th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Ticker</th><th className="px-4 py-3">Position</th><th className="px-4 py-3 text-right"><TransactionSortHeader label="Realized Profit" column="realizedProfit" right /></th></tr></thead>
              <tbody>{transactions.map((transaction,index)=><tr key={transaction.id} className="border-t border-white/[.06]">
                <td className="px-4 py-3 font-semibold text-zinc-500">#{index+1}</td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{dateText(transaction.date)}</td>
                <td className="whitespace-nowrap px-4 py-3">{transaction.category}</td>
                <td className="px-4 py-3 font-semibold">{onEditTransaction?<button type="button" onClick={()=>openEditor(transaction)} className="rounded-md text-left text-emerald-400 transition hover:text-emerald-300 hover:underline">{transaction.groupTicker}</button>:transaction.groupTicker}</td>
                <td className="max-w-72 px-4 py-3 text-zinc-400">{transaction.preserveLabelCasing?transaction.label:formatPositionLabel(transaction.label)}</td>
                
                
                
                <td className={cn("px-4 py-3 text-right font-semibold",transaction.realizedProfit>0?"text-emerald-400":transaction.realizedProfit<0?"text-rose-400":"text-zinc-400")}>{money(transaction.realizedProfit)}</td>
              </tr>)}</tbody>
            </table></div>
          </div>
        </>}
      </div>
    </div>

    {editingTransaction&&draft&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onMouseDown={event=>{if(event.currentTarget===event.target){setEditingTransaction(null);setDraft(null);}}}>
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between"><div><h3 className="text-lg font-semibold">Edit Transaction</h3><p className="mt-1 text-sm text-zinc-500">{editingTransaction.groupTicker} · {dateText(editingTransaction.date)}</p></div><button type="button" onClick={()=>{setEditingTransaction(null);setDraft(null);}} className="grid size-9 place-items-center rounded-xl border border-white/10 text-zinc-500 hover:text-white"><X size={16}/></button></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <EditField label="Date"><input type="date" value={draft.date} onChange={e=>setDraftField("date",e.target.value)} className="edit-modal-input"/></EditField>
          <EditField label="Category"><select value={draft.category} onChange={e=>setDraftField("category",e.target.value as ProfitDrilldownTransaction["category"])} className="edit-modal-input">{["Common Stocks","Sell Call","Sell Put","Buy Call","Buy Put"].map(category=><option key={category}>{category}</option>)}</select></EditField>
          <EditField label="Ticker"><input value={draft.ticker} onChange={e=>setDraftField("ticker",e.target.value)} className="edit-modal-input"/></EditField>
          <EditField label="Position"><input value={draft.label} onChange={e=>setDraftField("label",e.target.value)} className="edit-modal-input"/></EditField>
          <EditField label="Realized P/L"><input type="number" step="any" value={draft.realizedProfit} onChange={e=>setDraftField("realizedProfit",Number(e.target.value)||0)} className="edit-modal-input"/></EditField>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={deleteEditor} className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-400 transition hover:bg-rose-500/15">Delete</button>
          <div className="flex gap-2"><button type="button" onClick={()=>{setEditingTransaction(null);setDraft(null);}} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-400 transition hover:bg-white/[.04]">Cancel</button><button type="button" onClick={saveEditor} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400">Save</button></div>
        </div>
      </div>
    </div>}
  </div>;
}

function EditField({label,children}:{label:string;children?:ReactNode}) {
  return <label className="space-y-1.5"><span className="text-xs font-medium text-zinc-500">{label}</span><div className="[&_.edit-modal-input]:h-10 [&_.edit-modal-input]:w-full [&_.edit-modal-input]:rounded-xl [&_.edit-modal-input]:border [&_.edit-modal-input]:border-white/10 [&_.edit-modal-input]:bg-white/[.025] [&_.edit-modal-input]:px-3 [&_.edit-modal-input]:text-sm [&_.edit-modal-input]:outline-none [&_.edit-modal-input:focus]:border-emerald-400/40">{children}</div></label>;
}

function YtdAccountChart({ account, data, currentYtd }: { account: string; data: { account: string; "2024": number; "2025": number; "2026": number }; currentYtd: number }) {
  const chartData = [
    { year: "2024", performance: data["2024"] * 100 },
    { year: "2025", performance: data["2025"] * 100 },
    { year: "2026", performance: currentYtd * 100 },
  ];
  return <Card className="overflow-hidden"><CardHeader className="border-b border-zinc-200/70 dark:border-white/[.06]"><h2 className="font-medium">{account} YTD Performance</h2><p className="text-xs text-zinc-500">Annual Portfolio Performance</p></CardHeader><CardContent className="pt-5"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{left:4,right:12,top:28,bottom:0}}><CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(161,161,170,.13)"/><XAxis dataKey="year" tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#71717a",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={(v: number)=>`${v.toFixed(0)}%`}/><Tooltip cursor={{fill:"rgba(161,161,170,.06)"}} contentStyle={{background:"#18181b",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,color:"#f4f4f5"}} formatter={(value: any)=>`${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(2)}%`}/><Bar dataKey="performance" name="YTD Performance" fill="#34d399" radius={[8,8,2,2]} maxBarSize={72}>{chartData.map(row=><Cell key={row.year} fill={row.performance<0?"#f87171":"#34d399"}/>) }<LabelList dataKey="performance" position="top" formatter={(value: any)=>`${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(1)}%`} fill="#e4e4e7" fontSize={11} fontWeight={700} stroke="#09090b" strokeWidth={2} paintOrder="stroke"/></Bar></BarChart></ResponsiveContainer></div></CardContent></Card>;
}

function IncomeTotalsChart({ data }: { data: { account: string; realizedProfit: number; income: number }[] }) {
  return <Card className="overflow-hidden"><CardHeader className="border-b border-zinc-200/70 dark:border-white/[.06]"><h2 className="font-medium">Realized Income Totals</h2><p className="text-xs text-zinc-500">Total Realized Profit Compared With Dividend, Interest & Bonus For Robinhood And Fidelity Roth IRA.</p></CardHeader><CardContent className="pt-5"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} barGap={10} barCategoryGap="30%" margin={{left:4,right:12,top:28,bottom:0}}><CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(161,161,170,.13)"/><XAxis dataKey="account" tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#71717a",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={(v: number)=>chartAxisValue(v)}/><Tooltip cursor={{fill:"rgba(161,161,170,.06)"}} contentStyle={{background:"#18181b",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,color:"#f4f4f5"}} formatter={(value: any)=>money(Number(value))}/><Legend wrapperStyle={{fontSize:12,paddingTop:14}} iconType="circle"/><Bar dataKey="realizedProfit" name="Realized Profit" fill="#34d399" radius={[8,8,2,2]} maxBarSize={50}>{data.map(row=><Cell key={`profit-${row.account}`} fill={row.realizedProfit<0?"#f87171":"#34d399"}/>)}<LabelList dataKey="realizedProfit" position="top" formatter={(value: any)=>chartValueLabel(Number(value))} fill="#e4e4e7" fontSize={11} fontWeight={700} stroke="#09090b" strokeWidth={2} paintOrder="stroke"/></Bar><Bar dataKey="income" name="Dividend, Interest & Bonus" fill="#60a5fa" radius={[8,8,2,2]} maxBarSize={50}>{data.map(row=><Cell key={`income-${row.account}`} fill={row.income<0?"#f87171":"#60a5fa"}/>)}<LabelList dataKey="income" position="top" formatter={(value: any)=>chartValueLabel(Number(value))} fill="#e4e4e7" fontSize={11} fontWeight={700} stroke="#09090b" strokeWidth={2} paintOrder="stroke"/></Bar></BarChart></ResponsiveContainer></div></CardContent></Card>;
}
