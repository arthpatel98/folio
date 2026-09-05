"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, BarChart3, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { quarterlyIncome } from "@/lib/savings-investments-data";
import { cn, money } from "@/lib/utils";
import { usePortfolioStore } from "@/store/portfolio-store";
import type { Transaction } from "@/types/portfolio";

type ProfitDrilldownTransaction = {
  id: string; date: string; ticker: string; label: string; quantity: number | null; price: number | null;
  proceeds: number | null; realizedProfit: number; category: "Sell Call" | "Sell Put" | "Buy Call" | "Buy Put" | "Common Stocks";
  preserveLabelCasing?: boolean;
};
type VerifiedProfitEdit = Partial<ProfitDrilldownTransaction> & { deleted?: boolean };
type VerifiedProfitEdits = Record<string, VerifiedProfitEdit>;
const VERIFIED_PROFIT_EDITS_KEY = "folio-robinhood-verified-profit-edits-v1";
const AUG_2026_PROFIT_EDIT_EXPIRY_KEY = "folio-v52-aug-2026-profit-edit-expiry";
const AUG_2026_PROFIT_EDIT_WINDOW_MS = 2 * 60 * 60 * 1000;

type IncomeTransaction = { date: string; ticker: string; amount: number };
type IncomeEdit = Partial<IncomeTransaction> & { deleted?: boolean };
type IncomeEdits = Record<string, IncomeEdit>;
const INCOME_EDITS_KEY = "folio-robinhood-income-edits-v1";
const incomeId=(item:IncomeTransaction,index:number)=>`${item.date}|${item.ticker}|${item.amount}|${index}`;
const incomeSourceFromTransaction=(tx:Transaction)=>{
  const descriptor=[tx.notes,tx.source,tx.symbol].filter(Boolean).join(" ").toLowerCase();
  if(descriptor.includes("gold deposit boost"))return "Gold Deposit Boost Payout";
  if(tx.type==="dividend")return `${(tx.symbol||"Dividend").toUpperCase()} Dividend`;
  if(tx.type==="interest")return "Interest Payment";
  return null;
};
const ROBINHOOD_INCOME_TRANSACTIONS: IncomeTransaction[] = [
  // Dividends
  { date: "2024-02-29", ticker: "ADM Dividend", amount: 0.54 },
  { date: "2024-03-27", ticker: "NVDA Dividend", amount: 0.01 },
  { date: "2024-03-28", ticker: "VRT Dividend", amount: 0.01 },
  { date: "2024-04-02", ticker: "VST Dividend", amount: 0.22 },
  { date: "2024-04-05", ticker: "CNMD Dividend", amount: 0.18 },
  { date: "2024-04-15", ticker: "RHP Dividend", amount: 0.48 },
  { date: "2024-05-30", ticker: "JEF Dividend", amount: 0.49 },
  { date: "2024-06-13", ticker: "MSFT Dividend", amount: 0.20 },
  { date: "2024-06-13", ticker: "AMAT Dividend", amount: 0.63 },
  { date: "2024-06-17", ticker: "IVV Dividend", amount: 3.53 },
  { date: "2024-06-26", ticker: "VRT Dividend", amount: 0.43 },
  { date: "2024-06-26", ticker: "META Dividend", amount: 0.90 },
  { date: "2024-06-28", ticker: "VST Dividend", amount: 3.16 },
  { date: "2024-07-01", ticker: "VUG Dividend", amount: 1.10 },
  { date: "2024-07-05", ticker: "CNMD Dividend", amount: 0.18 },
  { date: "2024-07-15", ticker: "RHP Dividend", amount: 0.48 },
  { date: "2024-07-31", ticker: "JPM Dividend", amount: 2.21 },
  { date: "2024-07-31", ticker: "QQQ Dividend", amount: 5.90 },
  { date: "2024-08-02", ticker: "DELL Dividend", amount: 2.64 },
  { date: "2024-09-12", ticker: "AMAT Dividend", amount: 0.63 },
  { date: "2024-09-26", ticker: "VRT Dividend", amount: 0.43 },
  { date: "2024-09-30", ticker: "VUG Dividend", amount: 1.09 },
  { date: "2024-09-30", ticker: "VST Dividend", amount: 3.19 },
  { date: "2024-10-03", ticker: "NVDA Dividend", amount: 0.19 },
  { date: "2024-10-31", ticker: "QQQ Dividend", amount: 5.24 },
  { date: "2024-11-01", ticker: "DELL Dividend", amount: 4.90 },
  { date: "2024-12-12", ticker: "AMAT Dividend", amount: 0.63 },
  { date: "2024-12-19", ticker: "VRT Dividend", amount: 0.75 },
  { date: "2024-12-31", ticker: "VST Dividend", amount: 4.32 },
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
  { date: "2026-06-17", ticker: "META Early Dividend", amount: 5.25 },
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
  { date: "2026-08-31", ticker: "Gold Deposit Boost Payout", amount: 2.08 },

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
function incomePeriod(date:string){const d=new Date(`${date}T12:00:00`);return new Intl.DateTimeFormat("en-US",{month:"short",year:"numeric"}).format(d);}


const ROBINHOOD_VERIFIED_CLOSE_DATE_TRANSACTIONS: Record<string, ProfitDrilldownTransaction[]> = {
  "Mar 2024": [{"id":"gk-2024-03-01-alb-4","date":"2024-03-01","ticker":"ALB","label":"ALBEMARLE CORP (ALB)","quantity":0.675675,"price":null,"proceeds":96.57,"realizedProfit":16.57,"category":"Common Stocks"},{"id":"gk-2024-03-01-alb-5","date":"2024-03-01","ticker":"ALB","label":"ALBEMARLE CORP (ALB)","quantity":0.451202,"price":null,"proceeds":64.48,"realizedProfit":14.48,"category":"Common Stocks"},{"id":"gk-2024-03-19-adm-11","date":"2024-03-19","ticker":"ADM","label":"ARCHER-DANIELS-MIDLAND CO (ADM)","quantity":1.448488,"price":null,"proceeds":88.27,"realizedProfit":8.27,"category":"Common Stocks"}],
  "Apr 2024": [{"id":"gk-2024-04-23-rtc-13","date":"2024-04-23","ticker":"RTC","label":"BAIJIAYUN GROUP LIMITED (RTC)","quantity":36.49635,"price":null,"proceeds":46.53,"realizedProfit":-3.47,"category":"Common Stocks"},{"id":"gk-2024-04-23-rtc-14","date":"2024-04-23","ticker":"RTC","label":"BAIJIAYUN GROUP LIMITED (RTC)","quantity":47.971807,"price":null,"proceeds":61.16,"realizedProfit":-8.84,"category":"Common Stocks"}],
  "May 2024": [{"id":"gk-2024-05-22-agl-3","date":"2024-05-22","ticker":"AGL","label":"AGILON HEALTH INC (AGL)","quantity":12.112612,"price":null,"proceeds":72.98,"realizedProfit":2.98,"category":"Common Stocks"},{"id":"gk-2024-05-20-acls-12","date":"2024-05-20","ticker":"ACLS","label":"AXCELIS TECHNOLOGIES INC (ACLS)","quantity":0.434952,"price":null,"proceeds":50.23,"realizedProfit":0.23,"category":"Common Stocks"},{"id":"gk-2024-05-22-calx-19","date":"2024-05-22","ticker":"CALX","label":"CALIX NETWORKS INC (CALX)","quantity":2.158828,"price":null,"proceeds":70.4,"realizedProfit":0.4,"category":"Common Stocks"},{"id":"gk-2024-05-17-jef-33","date":"2024-05-17","ticker":"JEF","label":"JEFFERIES FINANCIAL GROUP I (JEF)","quantity":2.166612,"price":null,"proceeds":102.5,"realizedProfit":2.5,"category":"Common Stocks"},{"id":"gk-2024-05-24-msft-41","date":"2024-05-24","ticker":"MSFT","label":"MICROSOFT CORP (MSFT)","quantity":0.36122,"price":null,"proceeds":155.41,"realizedProfit":4.82,"category":"Common Stocks"},{"id":"gk-2024-05-24-nvda-47","date":"2024-05-24","ticker":"NVDA","label":"NVIDIA CORPORATION (NVDA)","quantity":0.232099,"price":null,"proceeds":245.2,"realizedProfit":75.2,"category":"Common Stocks"},{"id":"gk-2024-05-24-nvda-48","date":"2024-05-24","ticker":"NVDA","label":"NVIDIA CORPORATION (NVDA)","quantity":0.591863,"price":null,"proceeds":625.28,"realizedProfit":125.28,"category":"Common Stocks"},{"id":"gk-2024-05-24-nvda-49","date":"2024-05-24","ticker":"NVDA","label":"NVIDIA CORPORATION (NVDA)","quantity":0.915343,"price":null,"proceeds":967.02,"realizedProfit":267.02,"category":"Common Stocks"},{"id":"gk-2024-05-03-sgml-53","date":"2024-05-03","ticker":"SGML","label":"SIGMA LITHIUM CORPORATION (SGML)","quantity":4.279315,"price":null,"proceeds":67.36,"realizedProfit":-2.64,"category":"Common Stocks"},{"id":"gk-2024-05-03-sgml-54","date":"2024-05-03","ticker":"SGML","label":"SIGMA LITHIUM CORPORATION (SGML)","quantity":3.866976,"price":null,"proceeds":60.86,"realizedProfit":10.86,"category":"Common Stocks"}],
  "Jun 2024": [{"id":"gk-2024-06-21-amzn-7","date":"2024-06-21","ticker":"AMZN","label":"AMAZON COM INC (AMZN)","quantity":0.035939,"price":null,"proceeds":6.76,"realizedProfit":1.33,"category":"Common Stocks"},{"id":"gk-2024-06-21-amzn-8","date":"2024-06-21","ticker":"AMZN","label":"AMAZON COM INC (AMZN)","quantity":5.391448,"price":null,"proceeds":1014.43,"realizedProfit":14.43,"category":"Common Stocks"},{"id":"gk-2024-06-05-qqq-27","date":"2024-06-05","ticker":"QQQ","label":"INVESCO QQQ TRUST SERIES I (QQQ)","quantity":6,"price":null,"proceeds":2777.38,"realizedProfit":126.16,"category":"Common Stocks"},{"id":"gk-2024-06-27-meta-38","date":"2024-06-27","ticker":"META","label":"META PLATFORMS INC (META)","quantity":0.414702,"price":null,"proceeds":215.82,"realizedProfit":14.82,"category":"Common Stocks"},{"id":"gk-2024-06-27-meta-39","date":"2024-06-27","ticker":"META","label":"META PLATFORMS INC (META)","quantity":0.97772,"price":null,"proceeds":508.82,"realizedProfit":8.82,"category":"Common Stocks"},{"id":"gk-2024-06-27-meta-40","date":"2024-06-27","ticker":"META","label":"META PLATFORMS INC (META)","quantity":1.012723,"price":null,"proceeds":527.04,"realizedProfit":26.38,"category":"Common Stocks"},{"id":"gk-2024-06-14-nflx-46","date":"2024-06-14","ticker":"NFLX","label":"NETFLIX INC (NFLX)","quantity":0.269079,"price":null,"proceeds":180.83,"realizedProfit":20.83,"category":"Common Stocks"},{"id":"gk-2024-06-03-spot-55","date":"2024-06-03","ticker":"SPOT","label":"SPOTIFY TECHNOLOGY SA (SPOT)","quantity":0.969096,"price":null,"proceeds":303.5,"realizedProfit":3.08,"category":"Common Stocks"}],
  "Jul 2024": [{"id":"gk-2024-07-01-amr-6","date":"2024-07-01","ticker":"AMR","label":"ALPHA METALLURGICAL RESOURC (AMR)","quantity":0.193594,"price":null,"proceeds":63.93,"realizedProfit":-6.07,"category":"Common Stocks"},{"id":"gk-2024-07-23-rtc-15","date":"2024-07-23","ticker":"RTC","label":"BAIJIAYUN GROUP LIMITED CL (RTC)","quantity":72.223838,"price":null,"proceeds":512.76,"realizedProfit":12.76,"category":"Common Stocks"},{"id":"gk-2024-07-23-rtc-16","date":"2024-07-23","ticker":"RTC","label":"BAIJIAYUN GROUP LIMITED CL (RTC)","quantity":57.455593,"price":null,"proceeds":407.91,"realizedProfit":7.69,"category":"Common Stocks"},{"id":"gk-2024-07-23-rtc-17","date":"2024-07-23","ticker":"RTC","label":"BAIJIAYUN GROUP LIMITED CL (RTC)","quantity":37.320569,"price":null,"proceeds":264.96,"realizedProfit":36.96,"category":"Common Stocks"},{"id":"gk-2024-07-12-gme-25","date":"2024-07-12","ticker":"GME","label":"GAMESTOP CORP (GME)","quantity":58.733701,"price":null,"proceeds":1528.2,"realizedProfit":28.2,"category":"Common Stocks"},{"id":"gk-2024-07-12-gme-26","date":"2024-07-12","ticker":"GME","label":"GAMESTOP CORP (GME)","quantity":30.939064,"price":null,"proceeds":805.01,"realizedProfit":23.35,"category":"Common Stocks"},{"id":"gk-2024-07-09-jpm-34","date":"2024-07-09","ticker":"JPM","label":"JP MORGAN CHASE & CO (JPM)","quantity":2.564764,"price":null,"proceeds":535.43,"realizedProfit":35.43,"category":"Common Stocks"},{"id":"gk-2024-07-11-spxc-56","date":"2024-07-11","ticker":"SPXC","label":"SPX TECHNOLOGIES INC (SPXC)","quantity":0.627859,"price":null,"proceeds":96.32,"realizedProfit":26.32,"category":"Common Stocks"}],
  "Aug 2024": [{"id":"gk-2024-08-06-bgne-18","date":"2024-08-06","ticker":"BGNE","label":"BEIGENE LTD (BGNE)","quantity":0.577437,"price":null,"proceeds":100.57,"realizedProfit":0.57,"category":"Common Stocks"},{"id":"gk-2024-08-15-ivv-32","date":"2024-08-15","ticker":"IVV","label":"ISHARES CORE S&P 500 ETF (IVV)","quantity":2.92192,"price":null,"proceeds":1621.86,"realizedProfit":121.86,"category":"Common Stocks"},{"id":"gk-2024-08-30-mod-44","date":"2024-08-30","ticker":"MOD","label":"MODINE MFG CO (MOD)","quantity":1.338201,"price":null,"proceeds":160.75,"realizedProfit":30.75,"category":"Common Stocks"},{"id":"gk-2024-08-30-mod-45","date":"2024-08-30","ticker":"MOD","label":"MODINE MFG CO (MOD)","quantity":15.586478,"price":null,"proceeds":1872.35,"realizedProfit":502.35,"category":"Common Stocks"}],
  "Sep 2024": [{"id":"gk-2024-09-11-app-9","date":"2024-09-11","ticker":"APP","label":"APPLOVIN CORPORATION CL A (APP)","quantity":2.289641,"price":null,"proceeds":212.99,"realizedProfit":54.73,"category":"Common Stocks"},{"id":"gk-2024-09-11-app-10","date":"2024-09-11","ticker":"APP","label":"APPLOVIN CORPORATION CL A (APP)","quantity":3.701879,"price":null,"proceeds":344.35,"realizedProfit":48.24,"category":"Common Stocks"},{"id":"gk-2024-09-12-cnmd-21","date":"2024-09-12","ticker":"CNMD","label":"CONMED CORP (CNMD)","quantity":1.199763,"price":null,"proceeds":90.69,"realizedProfit":-9.31,"category":"Common Stocks"},{"id":"gk-2024-09-19-rhp-52","date":"2024-09-19","ticker":"RHP","label":"RYMAN HOSPITALITY PROPERTIE (RHP)","quantity":0.579158,"price":null,"proceeds":61.95,"realizedProfit":-8.05,"category":"Common Stocks"},{"id":"gk-2024-09-26-vug-60","date":"2024-09-26","ticker":"VUG","label":"VANGUARD GROWTH ETF (VUG)","quantity":3.218288,"price":null,"proceeds":1236.93,"realizedProfit":136.93,"category":"Common Stocks"},{"id":"gk-2024-09-20-vst-65","date":"2024-09-20","ticker":"VST","label":"VISTRA CORP (VST)","quantity":1.373564,"price":null,"proceeds":142.15,"realizedProfit":72.15,"category":"Common Stocks"},{"id":"gk-2024-09-20-vst-66","date":"2024-09-20","ticker":"VST","label":"VISTRA CORP (VST)","quantity":1.393793,"price":null,"proceeds":144.23,"realizedProfit":44.23,"category":"Common Stocks"},{"id":"gk-2024-09-20-vst-67","date":"2024-09-20","ticker":"VST","label":"VISTRA CORP (VST)","quantity":10.928381,"price":null,"proceeds":1130.95,"realizedProfit":100.95,"category":"Common Stocks"},{"id":"gk-2024-09-20-vst-68","date":"2024-09-20","ticker":"VST","label":"VISTRA CORP (VST)","quantity":5.72377,"price":null,"proceeds":592.33,"realizedProfit":92.33,"category":"Common Stocks"}],
  "Oct 2024": [{"id":"gk-2024-10-04-amd-1","date":"2024-10-04","ticker":"AMD","label":"ADVANCED MICRO DEVICES INC (AMD)","quantity":0.201491,"price":null,"proceeds":33.92,"realizedProfit":3.92,"category":"Common Stocks"},{"id":"gk-2024-10-04-amd-2","date":"2024-10-04","ticker":"AMD","label":"ADVANCED MICRO DEVICES INC (AMD)","quantity":4.374023,"price":null,"proceeds":736.32,"realizedProfit":36.32,"category":"Common Stocks"},{"id":"gk-2024-10-25-qqq-28","date":"2024-10-25","ticker":"QQQ","label":"INVESCO QQQ TRUST SERIES I (QQQ)","quantity":6.899721,"price":null,"proceeds":3438.89,"realizedProfit":390.11,"category":"Common Stocks"},{"id":"gk-2024-10-25-qqq-29","date":"2024-10-25","ticker":"QQQ","label":"INVESCO QQQ TRUST SERIES I (QQQ)","quantity":3.428979,"price":null,"proceeds":1709.04,"realizedProfit":209.04,"category":"Common Stocks"},{"id":"gk-2024-10-21-nvda-50","date":"2024-10-21","ticker":"NVDA","label":"NVIDIA CORPORATION (NVDA)","quantity":18.348597,"price":null,"proceeds":2593.4,"realizedProfit":193.4,"category":"Common Stocks"},{"id":"gk-2024-10-21-nvda-51","date":"2024-10-21","ticker":"NVDA","label":"NVIDIA CORPORATION (NVDA)","quantity":8.113696,"price":null,"proceeds":1146.8,"realizedProfit":122.08,"category":"Common Stocks"},{"id":"gk-2024-10-09-spxc-57","date":"2024-10-09","ticker":"SPXC","label":"SPX TECHNOLOGIES INC (SPXC)","quantity":7.057324,"price":null,"proceeds":1176.24,"realizedProfit":126.24,"category":"Common Stocks"},{"id":"gk-2024-10-04-vrt-61","date":"2024-10-04","ticker":"VRT","label":"VERTIV HOLDINGS LLC (VRT)","quantity":0.949517,"price":null,"proceeds":99.96,"realizedProfit":39.96,"category":"Common Stocks"},{"id":"gk-2024-10-04-vrt-62","date":"2024-10-04","ticker":"VRT","label":"VERTIV HOLDINGS LLC (VRT)","quantity":1.205711,"price":null,"proceeds":126.94,"realizedProfit":26.94,"category":"Common Stocks"},{"id":"gk-2024-10-04-vrt-63","date":"2024-10-04","ticker":"VRT","label":"VERTIV HOLDINGS LLC (VRT)","quantity":16.172595,"price":null,"proceeds":1702.6,"realizedProfit":202.11,"category":"Common Stocks"},{"id":"gk-2024-10-04-vrt-64","date":"2024-10-04","ticker":"VRT","label":"VERTIV HOLDINGS LLC (VRT)","quantity":4.289672,"price":null,"proceeds":451.6,"realizedProfit":70.72,"category":"Common Stocks"}],
  "Nov 2024": [{"id":"gk-2024-11-13-cnmd-22","date":"2024-11-13","ticker":"CNMD","label":"CONMED CORP (CNMD)","quantity":7.538067,"price":null,"proceeds":578.41,"realizedProfit":78.41,"category":"Common Stocks"},{"id":"gk-2024-11-21-dell-23","date":"2024-11-21","ticker":"DELL","label":"DELL TECHNOLOGIES INC (DELL)","quantity":7.902146,"price":null,"proceeds":1085.92,"realizedProfit":99.1,"category":"Common Stocks"},{"id":"gk-2024-11-21-dell-24","date":"2024-11-21","ticker":"DELL","label":"DELL TECHNOLOGIES INC (DELL)","quantity":6.776584,"price":null,"proceeds":931.24,"realizedProfit":118.06,"category":"Common Stocks"},{"id":"gk-2024-11-22-iren-30","date":"2024-11-22","ticker":"IREN","label":"IREN LIMITED (IREN)","quantity":167.322387,"price":null,"proceeds":1830.44,"realizedProfit":-26.37,"category":"Common Stocks"},{"id":"gk-2024-11-22-iren-31","date":"2024-11-22","ticker":"IREN","label":"IREN LIMITED (IREN)","quantity":153.497431,"price":null,"proceeds":1679.21,"realizedProfit":36.02,"category":"Common Stocks"},{"id":"gk-2024-11-06-mmyt-35","date":"2024-11-06","ticker":"MMYT","label":"MAKEMYTRIP LTD (MMYT)","quantity":33.833314,"price":null,"proceeds":3838.28,"realizedProfit":838.28,"category":"Common Stocks"},{"id":"gk-2024-11-06-mmyt-36","date":"2024-11-06","ticker":"MMYT","label":"MAKEMYTRIP LTD (MMYT)","quantity":41.247563,"price":null,"proceeds":4679.4,"realizedProfit":779.4,"category":"Common Stocks"},{"id":"gk-2024-11-21-mmyt-37","date":"2024-11-21","ticker":"MMYT","label":"MAKEMYTRIP LTD (MMYT)","quantity":70.754716,"price":null,"proceeds":7764.43,"realizedProfit":864.43,"category":"Common Stocks"},{"id":"gk-2024-11-21-tsla-58","date":"2024-11-21","ticker":"TSLA","label":"TESLA INC (TSLA)","quantity":8.605415,"price":null,"proceeds":2963.28,"realizedProfit":-36.72,"category":"Common Stocks"},{"id":"gk-2024-11-21-tsla-59","date":"2024-11-21","ticker":"TSLA","label":"TESLA INC (TSLA)","quantity":8.838346,"price":null,"proceeds":3043.48,"realizedProfit":43.48,"category":"Common Stocks"}],
  "Dec 2024": [{"id":"gk-2024-12-04-coin-20","date":"2024-12-04","ticker":"COIN","label":"COINBASE GLOBAL INC CL A (COIN)","quantity":9.254188,"price":null,"proceeds":3001.43,"realizedProfit":1.43,"category":"Common Stocks"},{"id":"gk-2024-12-04-mstr-42","date":"2024-12-04","ticker":"MSTR","label":"MICROSTRATEGY INC CL A (MSTR)","quantity":8.815103,"price":null,"proceeds":3573.01,"realizedProfit":573.01,"category":"Common Stocks"},{"id":"gk-2024-12-04-mstr-43","date":"2024-12-04","ticker":"MSTR","label":"MICROSTRATEGY INC CL A (MSTR)","quantity":9.084302,"price":null,"proceeds":3682.12,"realizedProfit":682.12,"category":"Common Stocks"},{"id":"gk-2024-12-03-wday-69","date":"2024-12-03","ticker":"WDAY","label":"WORKDAY, INC. (WDAY)","quantity":0.388399,"price":null,"proceeds":99.12,"realizedProfit":-20.88,"category":"Common Stocks"},{"id":"gk-2024-12-03-wday-70","date":"2024-12-03","ticker":"WDAY","label":"WORKDAY, INC. (WDAY)","quantity":4.02058,"price":null,"proceeds":1026.02,"realizedProfit":26.02,"category":"Common Stocks"}],
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


const ROTH_IRA_CLOSED_LOT_TRANSACTIONS: ProfitDrilldownTransaction[] = [
  { id: "roth-closed-1", date: "2025-08-01", ticker: "MSTZ", label: "ETF OPPORTUNITIES TRUST T REX 2X INVERSE", quantity: 0.804, price: null, proceeds: 3.52, realizedProfit: 0.26, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-2", date: "2025-08-01", ticker: "MSTZ", label: "ETF OPPORTUNITIES TRUST T REX 2X INVERSE", quantity: 1053, price: null, proceeds: 4601.71, realizedProfit: 328.21, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-3", date: "2025-08-01", ticker: "MSTZ", label: "ETF OPPORTUNITIES TRUST T REX 2X INVERSE", quantity: 0.06, price: null, proceeds: 0.26, realizedProfit: 0.02, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-4", date: "2025-08-01", ticker: "MSTZ", label: "ETF OPPORTUNITIES TRUST T REX 2X INVERSE", quantity: 0.94, price: null, proceeds: 4.11, realizedProfit: -0.23, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-5", date: "2025-08-01", ticker: "MSTZ", label: "ETF OPPORTUNITIES TRUST T REX 2X INVERSE", quantity: 1190, price: null, proceeds: 5200.42, realizedProfit: -295.24, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-6", date: "2025-06-17", ticker: "MSTZ", label: "ETF OPPORTUNITIES TRUST T REX 2X INVERSE", quantity: 1939, price: null, proceeds: 9791.95, realizedProfit: 794.99, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-7", date: "2025-06-17", ticker: "MSTZ", label: "ETF OPPORTUNITIES TRUST T REX 2X INVERSE", quantity: 0.654, price: null, proceeds: 3.3, realizedProfit: 0.26, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-8", date: "2025-05-23", ticker: "MSTZ", label: "ETF OPPORTUNITIES TRUST T REX 2X INVERSE", quantity: 1643, price: null, proceeds: 8371.74, realizedProfit: 1381.43, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-9", date: "2025-05-23", ticker: "MSTZ", label: "ETF OPPORTUNITIES TRUST T REX 2X INVERSE", quantity: 2, price: null, proceeds: 10.19, realizedProfit: 1.67, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-10", date: "2025-05-23", ticker: "MSTZ", label: "ETF OPPORTUNITIES TRUST T REX 2X INVERSE", quantity: 0.275, price: null, proceeds: 1.4, realizedProfit: 0.23, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-11", date: "2025-06-25", ticker: "IREN", label: "IREN LIMITED COM NPV", quantity: 0.556, price: null, proceeds: 6.73, realizedProfit: 1.14, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-12", date: "2025-06-25", ticker: "IREN", label: "IREN LIMITED COM NPV", quantity: 0.556, price: null, proceeds: 6.72, realizedProfit: 1.13, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-13", date: "2025-06-25", ticker: "IREN", label: "IREN LIMITED COM NPV", quantity: 247.444, price: null, proceeds: 2991.65, realizedProfit: 502.83, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-14", date: "2025-02-14", ticker: "IREN", label: "IREN LIMITED COM NPV", quantity: 0.822, price: null, proceeds: 10.76, realizedProfit: 2.36, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-15", date: "2025-02-14", ticker: "IREN", label: "IREN LIMITED COM NPV", quantity: 0.822, price: null, proceeds: 10.76, realizedProfit: 2.36, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-16", date: "2025-02-14", ticker: "IREN", label: "IREN LIMITED COM NPV", quantity: 509.178, price: null, proceeds: 6667.5, realizedProfit: 1466.3, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-17", date: "2026-08-27", ticker: "CIFR", label: "CIPHER DIGITAL INC. COMMON STOCK", quantity: 100, price: null, proceeds: 1739.96, realizedProfit: 179.96, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-18", date: "2026-04-10", ticker: "CIFR", label: "CIPHER DIGITAL INC. COMMON STOCK", quantity: 0.127, price: null, proceeds: 2.16, realizedProfit: 0.02, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-19", date: "2026-04-10", ticker: "CIFR", label: "CIPHER DIGITAL INC. COMMON STOCK", quantity: 0.127, price: null, proceeds: 2.17, realizedProfit: 0.03, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-20", date: "2026-04-10", ticker: "CIFR", label: "CIPHER DIGITAL INC. COMMON STOCK", quantity: 183.873, price: null, proceeds: 3134.96, realizedProfit: 30.26, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-21", date: "2026-01-27", ticker: "CIFR", label: "CIPHER DIGITAL INC. COMMON STOCK", quantity: 0.342, price: null, proceeds: 6.43, realizedProfit: 0.75, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-22", date: "2026-01-27", ticker: "CIFR", label: "CIPHER DIGITAL INC. COMMON STOCK", quantity: 164.658, price: null, proceeds: 3096.4, realizedProfit: 362.32, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-23", date: "2026-01-27", ticker: "CIFR", label: "CIPHER DIGITAL INC. COMMON STOCK", quantity: 0.342, price: null, proceeds: 6.43, realizedProfit: 0.75, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-24", date: "2025-11-03", ticker: "CIFR", label: "CIPHER DIGITAL INC. COMMON STOCK", quantity: 0.848, price: null, proceeds: 20.45, realizedProfit: 2.85, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-25", date: "2025-11-03", ticker: "CIFR", label: "CIPHER DIGITAL INC. COMMON STOCK", quantity: 0.848, price: null, proceeds: 20.45, realizedProfit: 2.85, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-26", date: "2025-11-03", ticker: "CIFR", label: "CIPHER DIGITAL INC. COMMON STOCK", quantity: 239.152, price: null, proceeds: 5767.15, realizedProfit: 802.35, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-27", date: "2025-09-12", ticker: "HIMZ", label: "TIDAL TRUST II DEFIANCE DAILY 1 FOR 14 R/S INTO TIDAL TRUST II DEFIANCE DAILY TRGT 2X LONG HIMS ETF", quantity: 378, price: null, proceeds: 8554.14, realizedProfit: 1013.64, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-28", date: "2025-09-12", ticker: "HIMZ", label: "TIDAL TRUST II DEFIANCE DAILY 1 FOR 14 R/S INTO TIDAL TRUST II DEFIANCE DAILY TRGT 2X LONG HIMS ETF", quantity: 0.849, price: null, proceeds: 19.2, realizedProfit: 2.26, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-29", date: "2025-10-24", ticker: "VSTL", label: "TIDAL TRUST II DEFIANCE DAILY 1 FOR 3 R/S INTO TIDAL TRUST II DEFIANCE DLY TRGT 2X LONG VST ETF", quantity: 262.164, price: null, proceeds: 5346.26, realizedProfit: 590.61, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-30", date: "2025-10-24", ticker: "VSTL", label: "TIDAL TRUST II DEFIANCE DAILY 1 FOR 3 R/S INTO TIDAL TRUST II DEFIANCE DLY TRGT 2X LONG VST ETF", quantity: 0.836, price: null, proceeds: 17.05, realizedProfit: 1.88, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-31", date: "2025-10-24", ticker: "VSTL", label: "TIDAL TRUST II DEFIANCE DAILY 1 FOR 3 R/S INTO TIDAL TRUST II DEFIANCE DLY TRGT 2X LONG VST ETF", quantity: 0.836, price: null, proceeds: 17.04, realizedProfit: 1.87, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-32", date: "2025-10-10", ticker: "VSTL", label: "TIDAL TRUST II DEFIANCE DAILY 1 FOR 3 R/S INTO TIDAL TRUST II DEFIANCE DLY TRGT 2X LONG VST ETF", quantity: 174.062, price: null, proceeds: 4094.84, realizedProfit: 137.42, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-33", date: "2025-10-10", ticker: "VSTL", label: "TIDAL TRUST II DEFIANCE DAILY 1 FOR 3 R/S INTO TIDAL TRUST II DEFIANCE DLY TRGT 2X LONG VST ETF", quantity: 0.938, price: null, proceeds: 22.07, realizedProfit: 0.83, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-34", date: "2025-10-10", ticker: "VSTL", label: "TIDAL TRUST II DEFIANCE DAILY 1 FOR 3 R/S INTO TIDAL TRUST II DEFIANCE DLY TRGT 2X LONG VST ETF", quantity: 0.938, price: null, proceeds: 22.06, realizedProfit: 0.73, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-35", date: "2025-08-04", ticker: "ROBN", label: "ETF OPPORTUNITIES TRUST T REX 2X LONG HO", quantity: 104, price: null, proceeds: 6678.89, realizedProfit: 680.18, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-36", date: "2025-08-04", ticker: "ROBN", label: "ETF OPPORTUNITIES TRUST T REX 2X LONG HO", quantity: 0.213, price: null, proceeds: 13.69, realizedProfit: 1.4, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-37", date: "2026-05-22", ticker: "PLTR", label: "CALL (PLTR) PALANTIR JAN 15 27 $135 (100 SHS)", quantity: 2, price: null, proceeds: 5398.53, realizedProfit: 547.18, category: "Buy Call", preserveLabelCasing: true },
  { id: "roth-closed-38", date: "2025-06-24", ticker: "MMYT", label: "MAKEMYTRIP LTD USD0.0005", quantity: 0.633, price: null, proceeds: 60.78, realizedProfit: 1.88, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-39", date: "2025-06-24", ticker: "MMYT", label: "MAKEMYTRIP LTD USD0.0005", quantity: 39, price: null, proceeds: 3745.18, realizedProfit: 118.18, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-40", date: "2025-02-05", ticker: "MMYT", label: "MAKEMYTRIP LTD USD0.0005", quantity: 13, price: null, proceeds: 1545.6, realizedProfit: 92.85, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-41", date: "2025-02-05", ticker: "MMYT", label: "MAKEMYTRIP LTD USD0.0005", quantity: 0.745, price: null, proceeds: 88.57, realizedProfit: 5.46, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-42", date: "2025-02-05", ticker: "MMYT", label: "MAKEMYTRIP LTD USD0.0005", quantity: 0.225, price: null, proceeds: 26.75, realizedProfit: 1.5, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-43", date: "2025-02-05", ticker: "MMYT", label: "MAKEMYTRIP LTD USD0.0005", quantity: 30.03, price: null, proceeds: 3570.31, realizedProfit: 204.35, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-44", date: "2025-02-05", ticker: "MMYT", label: "MAKEMYTRIP LTD USD0.0005", quantity: 0.97, price: null, proceeds: 114.83, realizedProfit: 6.11, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-45", date: "2026-07-01", ticker: "NFLX", label: "CALL (NFLX) NETFLIX INC JAN 21 28 $100 (100 SHS)", quantity: 4, price: null, proceeds: 3617.27, realizedProfit: 334.58, category: "Buy Call", preserveLabelCasing: true },
  { id: "roth-closed-46", date: "2026-02-18", ticker: "NEBX", label: "CALL (NEBX) INVESTMENT MANAGERS MAR 20 26 $48 (100 SHS)", quantity: 1, price: null, proceeds: 399.33, realizedProfit: 322.66, category: "Buy Call", preserveLabelCasing: true },
  { id: "roth-closed-47", date: "2025-06-24", ticker: "OKLO", label: "OKLO INC COM CL A", quantity: 47, price: null, proceeds: 2795.85, realizedProfit: 315.19, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-48", date: "2025-06-24", ticker: "OKLO", label: "OKLO INC COM CL A", quantity: 0.366, price: null, proceeds: 21.77, realizedProfit: 2.44, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-49", date: "2026-03-18", ticker: "NEBX", label: "CALL (NEBX) INVESTMENT MANAGERS APR 17 26 $58 (100 SHS)", quantity: 1, price: null, proceeds: 375.33, realizedProfit: 315.31, category: "Buy Call", preserveLabelCasing: true },
  { id: "roth-closed-50", date: "2025-06-18", ticker: "CRCL", label: "CIRCLE INTERNET GROUP INC COM CL A", quantity: 0.161, price: null, proceeds: 26.4, realizedProfit: 2.44, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-51", date: "2025-06-18", ticker: "CRCL", label: "CIRCLE INTERNET GROUP INC COM CL A", quantity: 0.161, price: null, proceeds: 26.4, realizedProfit: 2.44, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-52", date: "2025-06-18", ticker: "CRCL", label: "CIRCLE INTERNET GROUP INC COM CL A", quantity: 19.839, price: null, proceeds: 3252.85, realizedProfit: 300.91, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-53", date: "2026-08-04", ticker: "ONDS", label: "ONDAS INC COMMON STOCK", quantity: 200, price: null, proceeds: 1799.96, realizedProfit: 259.96, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-54", date: "2026-08-04", ticker: "ONDS", label: "ONDAS INC COMMON STOCK", quantity: 200, price: null, proceeds: 1799.96, realizedProfit: 29.96, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-55", date: "2025-01-31", ticker: "MAGS", label: "LISTED FD TR ROUNDHILL MAGNIF", quantity: 0.155, price: null, proceeds: 8.78, realizedProfit: 0.45, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-56", date: "2025-01-31", ticker: "MAGS", label: "LISTED FD TR ROUNDHILL MAGNIF", quantity: 27, price: null, proceeds: 1528.96, realizedProfit: 77.98, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-57", date: "2025-01-31", ticker: "MAGS", label: "LISTED FD TR ROUNDHILL MAGNIF", quantity: 0.757, price: null, proceeds: 42.87, realizedProfit: 2.19, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-58", date: "2025-01-31", ticker: "MAGS", label: "LISTED FD TR ROUNDHILL MAGNIF", quantity: 0.619, price: null, proceeds: 35.05, realizedProfit: 1.24, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-59", date: "2025-01-31", ticker: "MAGS", label: "LISTED FD TR ROUNDHILL MAGNIF", quantity: 36, price: null, proceeds: 2038.62, realizedProfit: 72.41, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-60", date: "2025-01-31", ticker: "MAGS", label: "LISTED FD TR ROUNDHILL MAGNIF", quantity: 0.624, price: null, proceeds: 35.34, realizedProfit: 1.47, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-61", date: "2025-01-31", ticker: "MAGS", label: "LISTED FD TR ROUNDHILL MAGNIF", quantity: 27, price: null, proceeds: 1528.96, realizedProfit: 62.86, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-62", date: "2026-01-22", ticker: "NVDX", label: "ETF OPPORTUNITIES TRT REX 2X LONG NVIDIADAILY TARGET ETF", quantity: 163, price: null, proceeds: 2734.41, realizedProfit: 217.71, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-63", date: "2026-01-22", ticker: "NVDX", label: "ETF OPPORTUNITIES TRT REX 2X LONG NVIDIADAILY TARGET ETF", quantity: 0.657, price: null, proceeds: 11.02, realizedProfit: 0.88, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-64", date: "2025-05-12", ticker: "VST", label: "VISTRA CORP COM", quantity: 0.442, price: null, proceeds: 64.43, realizedProfit: -2.05, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-65", date: "2025-05-12", ticker: "VST", label: "VISTRA CORP COM", quantity: 0.505, price: null, proceeds: 73.62, realizedProfit: -2.33, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-66", date: "2025-05-12", ticker: "VST", label: "VISTRA CORP COM", quantity: 30.558, price: null, proceeds: 4456.14, realizedProfit: -139.87, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-67", date: "2025-05-12", ticker: "VST", label: "VISTRA CORP COM", quantity: 29, price: null, proceeds: 4228.95, realizedProfit: 289.01, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-68", date: "2025-05-12", ticker: "VST", label: "VISTRA CORP COM", quantity: 0.442, price: null, proceeds: 64.46, realizedProfit: 4.33, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-69", date: "2025-05-12", ticker: "HOOD", label: "ROBINHOOD MKTS INC COM CL A", quantity: 0.277, price: null, proceeds: 15.95, realizedProfit: 0.52, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-70", date: "2025-05-12", ticker: "HOOD", label: "ROBINHOOD MKTS INC COM CL A", quantity: 0.277, price: null, proceeds: 15.95, realizedProfit: 0.52, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-71", date: "2025-05-12", ticker: "HOOD", label: "ROBINHOOD MKTS INC COM CL A", quantity: 40.723, price: null, proceeds: 2344.35, realizedProfit: 75.26, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-72", date: "2026-07-09", ticker: "ONDS", label: "CALL (ONDS) ONDAS INC COMMON JUL 24 26 $9 (100 SHS)", quantity: 4, price: null, proceeds: 77.35, realizedProfit: 69.3, category: "Buy Call", preserveLabelCasing: true },
  { id: "roth-closed-73", date: "2025-08-06", ticker: "RDDT", label: "REDDIT INC CL A", quantity: 9, price: null, proceeds: 1900.98, realizedProfit: 134.48, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-74", date: "2025-08-06", ticker: "RDDT", label: "REDDIT INC CL A", quantity: 0.938, price: null, proceeds: 198.13, realizedProfit: 14.02, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-75", date: "2025-08-06", ticker: "RDDT", label: "REDDIT INC CL A", quantity: 12.944, price: null, proceeds: 2734.03, realizedProfit: -77.54, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-76", date: "2025-08-06", ticker: "RDDT", label: "REDDIT INC CL A", quantity: 0.118, price: null, proceeds: 24.92, realizedProfit: -0.7, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-77", date: "2025-08-06", ticker: "RDDT", label: "REDDIT INC CL A", quantity: 0.922, price: null, proceeds: 194.83, realizedProfit: -5.07, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-78", date: "2025-08-06", ticker: "RDDT", label: "REDDIT INC CL A", quantity: 0.056, price: null, proceeds: 11.83, realizedProfit: -0.33, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-79", date: "2026-07-30", ticker: "CRDO", label: "CREDO TECHNOLOGY GROUP HOLDING LTD COM USD0.00005", quantity: 6, price: null, proceeds: 1183.77, realizedProfit: 64.77, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-80", date: "2026-06-29", ticker: "NBIS", label: "NEBIUS GROUP N V COMUSD0.01 CL A", quantity: 8, price: null, proceeds: 2105.55, realizedProfit: 51.95, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-81", date: "2025-10-27", ticker: "PLTU", label: "DIREXION SHARES ETF TRUST DIREXION DAILY PLTR BULL 2X ETF", quantity: 0.663, price: null, proceeds: 72.4, realizedProfit: 0.42, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-82", date: "2025-10-27", ticker: "PLTU", label: "DIREXION SHARES ETF TRUST DIREXION DAILY PLTR BULL 2X ETF", quantity: 73, price: null, proceeds: 7973.57, realizedProfit: 45.65, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-83", date: "2026-03-19", ticker: "VSTL", label: "TIDAL TRUST II DEFI DAI VST ETF", quantity: 0.02, price: null, proceeds: 0.72, realizedProfit: -0.38, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-84", date: "2026-03-19", ticker: "VSTL", label: "TIDAL TRUST II DEFI DAI VST ETF", quantity: 0, price: null, proceeds: 0, realizedProfit: 0, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-85", date: "2026-03-19", ticker: "VSTL", label: "TIDAL TRUST II DEFI DAI VST ETF", quantity: 0, price: null, proceeds: 0, realizedProfit: 0, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-86", date: "2026-03-11", ticker: "NEBX", label: "CALL (NEBX) INVESTMENT MANAGERS MAR 20 26 $45 (100 SHS)", quantity: 1, price: null, proceeds: 229.33, realizedProfit: -50.34, category: "Buy Call", preserveLabelCasing: true },
  { id: "roth-closed-87", date: "2026-07-15", ticker: "SOXS", label: "DIREXION SHARES ETF TRUST DAI SEM 3X ETF", quantity: 0.5, price: null, proceeds: 23.52, realizedProfit: -883.98, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-88", date: "2026-04-16", ticker: "NEBX", label: "INVESTMENT MANAGERS SER TR II TRADR 2X LONG", quantity: 0.648, price: null, proceeds: 29.9, realizedProfit: -6.48, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-89", date: "2026-04-16", ticker: "NEBX", label: "INVESTMENT MANAGERS SER TR II TRADR 2X LONG", quantity: 57, price: null, proceeds: 2630.11, realizedProfit: -574.74, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-90", date: "2026-04-16", ticker: "NEBX", label: "INVESTMENT MANAGERS SER TR II TRADR 2X LONG", quantity: 42.352, price: null, proceeds: 1954.22, realizedProfit: -921.9, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-91", date: "2026-04-13", ticker: "NEBX", label: "INVESTMENT MANAGERS SER TR II TRADR 2X LONG", quantity: 30, price: null, proceeds: 2073.55, realizedProfit: 36.25, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-92", date: "2026-04-10", ticker: "NEBX", label: "INVESTMENT MANAGERS SER TR II TRADR 2X LONG", quantity: 0.352, price: null, proceeds: 22.33, realizedProfit: -1.53, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-93", date: "2026-04-10", ticker: "NEBX", label: "INVESTMENT MANAGERS SER TR II TRADR 2X LONG", quantity: 15.648, price: null, proceeds: 992.52, realizedProfit: -70.13, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-94", date: "2026-03-30", ticker: "SOXS", label: "DIREXION SHARES ETF TRUST DAI SEM 3X ETF1 FOR 10 R/S INTO DIREXION DAILY SEMICONDUCTOR BEAR 3X ETF", quantity: 0.047, price: null, proceeds: 2.21, realizedProfit: -6.37, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-95", date: "2026-03-30", ticker: "SOXS", label: "DIREXION SHARES ETF TRUST DAI SEM 3X ETF1 FOR 10 R/S INTO DIREXION DAILY SEMICONDUCTOR BEAR 3X ETF", quantity: 11.953, price: null, proceeds: 561.67, realizedProfit: -1607.8, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-96", date: "2026-03-05", ticker: "SOXS", label: "DIREXION SHARES ETF TRUST DAI SEM 3X ETF1 FOR 10 R/S INTO DIREXION DAILY SEMICONDUCTOR BEAR 3X ETF", quantity: 0.547, price: null, proceeds: 21.23, realizedProfit: -78.06, category: "Common Stocks", preserveLabelCasing: true },
  { id: "roth-closed-97", date: "2026-03-05", ticker: "SOXS", label: "DIREXION SHARES ETF TRUST DAI SEM 3X ETF1 FOR 10 R/S INTO DIREXION DAILY SEMICONDUCTOR BEAR 3X ETF", quantity: 0.001, price: null, proceeds: 0.04, realizedProfit: -0.13, category: "Common Stocks", preserveLabelCasing: true },
];

const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const wholeDollar=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0,maximumFractionDigits:0}).format(Math.round(value));
const chartAxisValue=(value:number)=>new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(Math.round(value));
const periodTime=(period:string)=>{const m=period.match(/^([A-Z][a-z]{2}) (20\d{2})$/);return m?new Date(Number(m[2]),months.indexOf(m[1]),1).getTime():0;};

export type RobinhoodAllTimeSummary = { realizedProfit: number; dividendAmount: number; extras: number };

export function RobinhoodQuarterlyData({ onAllTimeSummary }: { onAllTimeSummary?: (summary: RobinhoodAllTimeSummary) => void }) {
  const activePortfolioId=usePortfolioStore((state)=>state.activePortfolioId);
  const transactionsByPortfolio=usePortfolioStore((state)=>state.transactionsByPortfolio);
  const holdings=usePortfolioStore((state)=>state.holdings);
  const activeTransactions=useMemo(()=>activePortfolioId==="all"
    ? [...transactionsByPortfolio.robinhood,...transactionsByPortfolio["fidelity-roth"],...transactionsByPortfolio["fidelity-401k"]]
    : transactionsByPortfolio[activePortfolioId],[activePortfolioId,transactionsByPortfolio]);
  const isRobinhood=activePortfolioId==="robinhood";
  const includesRobinhood=activePortfolioId==="robinhood"||activePortfolioId==="all";
  const includesFidelityRoth=activePortfolioId==="fidelity-roth"||activePortfolioId==="all";
  const [selectedYear,setSelectedYear]=useState("2026");
  const [view,setView]=useState<"month"|"year">("month");
  const [selectedPeriod,setSelectedPeriod]=useState<string|null>(null);
  const [detailView,setDetailView]=useState<"profit"|"income">("profit");
  const [edits,setEdits]=useState<VerifiedProfitEdits>({});
  const [incomeEdits,setIncomeEdits]=useState<IncomeEdits>({});
  const [editingIncome,setEditingIncome]=useState<{id:string;item:IncomeTransaction}|null>(null);
  const [incomeDraft,setIncomeDraft]=useState<IncomeTransaction>({date:"",ticker:"",amount:0});
  const [editingProfit,setEditingProfit]=useState<ProfitDrilldownTransaction|null>(null);
  const [profitDraft,setProfitDraft]=useState<ProfitDrilldownTransaction|null>(null);
  const [aug2026ProfitEditExpiry,setAug2026ProfitEditExpiry]=useState(0);
  const [clockNow,setClockNow]=useState(()=>Date.now());
  useEffect(()=>{try{const raw=window.localStorage.getItem(VERIFIED_PROFIT_EDITS_KEY);if(raw)setEdits(JSON.parse(raw));const incomeRaw=window.localStorage.getItem(INCOME_EDITS_KEY);if(incomeRaw)setIncomeEdits(JSON.parse(incomeRaw));let expiry=Number(window.localStorage.getItem(AUG_2026_PROFIT_EDIT_EXPIRY_KEY)||0);if(!expiry){expiry=Date.now()+AUG_2026_PROFIT_EDIT_WINDOW_MS;window.localStorage.setItem(AUG_2026_PROFIT_EDIT_EXPIRY_KEY,String(expiry));}setAug2026ProfitEditExpiry(expiry);}catch{}},[]);
  useEffect(()=>{if(!aug2026ProfitEditExpiry||clockNow>=aug2026ProfitEditExpiry)return;const timer=window.setInterval(()=>setClockNow(Date.now()),30000);return()=>window.clearInterval(timer);},[aug2026ProfitEditExpiry,clockNow]);
  const saveEdit=(id:string,patch:VerifiedProfitEdit)=>setEdits(current=>{const next={...current,[id]:{...(current[id]??{}),...patch}};try{window.localStorage.setItem(VERIFIED_PROFIT_EDITS_KEY,JSON.stringify(next));}catch{}return next;});
  const effectiveIncomeTransactions=useMemo(()=>{
    const staticDefinitions=includesRobinhood?ROBINHOOD_INCOME_TRANSACTIONS.map((item,index)=>{
      const id=incomeId(item,index);
      const patch=incomeEdits[id]??{};
      const edited={...item,...patch} as IncomeTransaction;
      return {id,original:item,edited,deleted:Boolean(patch.deleted)};
    }):[];
    const staticRows=staticDefinitions.filter(row=>!row.deleted).map(({id,edited})=>({id,item:edited}));
    // Always reserve the original static fingerprint as well as the edited one. This prevents a
    // matching live transaction from reappearing after a static dividend/income row is deleted.
    const staticKeys=new Set<string>();
    staticDefinitions.forEach(({original,edited})=>{
      staticKeys.add(`${original.date}|${original.ticker.toUpperCase()}|${original.amount.toFixed(2)}`);
      staticKeys.add(`${edited.date}|${edited.ticker.toUpperCase()}|${edited.amount.toFixed(2)}`);
    });
    const liveRows=activeTransactions.map(tx=>{
      const source=incomeSourceFromTransaction(tx);
      if(!source)return null;
      const original:IncomeTransaction={date:tx.date,ticker:source,amount:Number(tx.amount)||0};
      if(staticKeys.has(`${original.date}|${original.ticker.toUpperCase()}|${original.amount.toFixed(2)}`))return null;
      const id=`live-income-${tx.id}`;
      const patch=incomeEdits[id]??{};
      if(patch.deleted)return null;
      return {id,item:{...original,...patch} as IncomeTransaction};
    }).filter((row):row is {id:string;item:IncomeTransaction}=>row!==null);
    return [...staticRows,...liveRows];
  },[activeTransactions,incomeEdits,includesRobinhood]);
  const persistIncomeEdit=(id:string,patch:IncomeEdit)=>setIncomeEdits(current=>{const next={...current,[id]:{...(current[id]??{}),...patch}};try{window.localStorage.setItem(INCOME_EDITS_KEY,JSON.stringify(next));}catch{}return next;});
  const canEditIncome=(date:string)=>date>="2026-09-01";
  const openIncomeEditor=(id:string,item:IncomeTransaction)=>{if(!canEditIncome(item.date))return;setEditingIncome({id,item});setIncomeDraft({...item});};
  const saveIncomeEditor=()=>{if(!editingIncome)return;persistIncomeEdit(editingIncome.id,incomeDraft);setEditingIncome(null);};
  const deleteIncomeEditor=()=>{if(!editingIncome)return;persistIncomeEdit(editingIncome.id,{deleted:true});setEditingIncome(null);};
  const aug2026ProfitEditingActive=selectedPeriod==="Aug 2026"&&aug2026ProfitEditExpiry>0&&clockNow<aug2026ProfitEditExpiry;
  const canEditProfit=(tx:ProfitDrilldownTransaction)=>activePortfolioId==="fidelity-roth"||(isRobinhood&&aug2026ProfitEditingActive&&tx.date.startsWith("2026-08-"));
  const openProfitEditor=(tx:ProfitDrilldownTransaction)=>{if(!canEditProfit(tx))return;setEditingProfit(tx);setProfitDraft({...tx});};
  const saveProfitEditor=()=>{if(!editingProfit||!profitDraft)return;saveEdit(editingProfit.id,profitDraft);setEditingProfit(null);setProfitDraft(null);};
  const deleteProfitEditor=()=>{if(!editingProfit)return;saveEdit(editingProfit.id,{deleted:true});setEditingProfit(null);setProfitDraft(null);};
  const transactionsByPeriod=useMemo(()=>{
    const out:Record<string,ProfitDrilldownTransaction[]>={};
    if(includesRobinhood){
      Object.values(ROBINHOOD_VERIFIED_CLOSE_DATE_TRANSACTIONS).flat().forEach(tx=>{
        const patch=edits[tx.id]??{}; if(patch.deleted)return; const edited={...tx,...patch};
        const d=new Date(`${edited.date}T12:00:00`); if(Number.isNaN(d.getTime()))return;
        const period=new Intl.DateTimeFormat("en-US",{month:"short",year:"numeric"}).format(d);
        (out[period]??=[]).push(edited);
      });
    }
    if(includesFidelityRoth){
      ROTH_IRA_CLOSED_LOT_TRANSACTIONS.forEach(tx=>{
        const patch=edits[tx.id]??{}; if(patch.deleted)return; const edited={...tx,...patch};
        const d=new Date(`${edited.date}T12:00:00`); if(Number.isNaN(d.getTime()))return;
        const period=new Intl.DateTimeFormat("en-US",{month:"short",year:"numeric"}).format(d);
        (out[period]??=[]).push(edited);
      });
    }
    activeTransactions.forEach((tx:Transaction)=>{
      if(tx.realizedGain===undefined || !tx.symbol || !tx.date)return;
      const d=new Date(`${tx.date}T12:00:00`); if(Number.isNaN(d.getTime()))return;
      const period=new Intl.DateTimeFormat("en-US",{month:"short",year:"numeric"}).format(d);
      if(includesRobinhood&&ROBINHOOD_VERIFIED_CLOSE_DATE_TRANSACTIONS[period])return;
      const option=tx.assetType==="option";
      const optionKind=(tx.optionType??"").toLowerCase();
      const category:ProfitDrilldownTransaction["category"]=option
        ? (optionKind.includes("put")?(optionKind.includes("sell")?"Sell Put":"Buy Put"):(optionKind.includes("sell")?"Sell Call":"Buy Call"))
        : "Common Stocks";
      const isNewTransaction=Boolean(tx.createdAt);
      const holding=isNewTransaction?holdings.find(item=>item.symbol.toUpperCase()===tx.symbol!.toUpperCase()&&Boolean(item.assetType==="option")===option):undefined;
      const legacyOptionLabel=[tx.symbol.toUpperCase(),tx.optionExpiry?new Date(`${tx.optionExpiry}T12:00:00`).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"",tx.optionStrike!==undefined?`$${tx.optionStrike}`:"",optionKind.includes("put")?"Put":"Call"].filter(Boolean).join(" ");
      const expiryText=tx.optionExpiry?new Date(`${tx.optionExpiry}T12:00:00`).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}):"";
      const newOptionLabel=[tx.symbol.toUpperCase(),tx.optionStrike!==undefined?`$${tx.optionStrike}`:"",optionKind.includes("put")?"Put":"Call",expiryText?`Exp ${expiryText}`:""].filter(Boolean).join(" ");
      const displayLabel=isNewTransaction
        ? (option?(tx.optionSymbol||newOptionLabel):(holding?.company||tx.symbol.toUpperCase()))
        : (option?(tx.optionSymbol||legacyOptionLabel):tx.symbol.toUpperCase());
      const liveTx:ProfitDrilldownTransaction={id:`live-${tx.id}`,date:tx.date,ticker:tx.symbol.toUpperCase(),label:displayLabel,quantity:tx.quantity??null,price:tx.price??null,proceeds:tx.realizedProceeds??null,realizedProfit:tx.realizedGain,category,preserveLabelCasing:true};
      const patch=edits[liveTx.id]??{}; if(patch.deleted)return;
      (out[period]??=[]).push({...liveTx,...patch});
    });
    return out;
  },[activeTransactions,edits,includesRobinhood,includesFidelityRoth,holdings]);
  const verifiedTotals=useMemo<Record<string,number>>(()=>{
    const totals:Record<string,number>={};
    Object.entries(transactionsByPeriod).forEach(([period,txs])=>{
      totals[period]=txs.reduce((sum,tx)=>sum+tx.realizedProfit,0);
    });
    return totals;
  },[transactionsByPeriod]);
  const incomeTotals=useMemo(()=>{const totals:Record<string,number>={};effectiveIncomeTransactions.forEach(({item})=>{const p=incomePeriod(item.date);totals[p]=(totals[p]??0)+item.amount;});return totals;},[effectiveIncomeTransactions]);
  const incomeBreakdown=useMemo(()=>{const totals:Record<string,{dividends:number;extras:number}>={};effectiveIncomeTransactions.forEach(({item})=>{const p=incomePeriod(item.date);const row=totals[p]??{dividends:0,extras:0};if(item.ticker.includes("Dividend"))row.dividends+=item.amount;else row.extras+=item.amount;totals[p]=row;});return totals;},[effectiveIncomeTransactions]);
  const monthlyData=useMemo(()=>{
    const rows: Array<{period:string;realizedProfit:number;income:number}> = isRobinhood
      ? quarterlyIncome.filter(row=>!/^Q[1-4] 2025$/.test(row.period)).map(row=>({period:String(row.period),realizedProfit:verifiedTotals[row.period]??row.robinhoodProfit,income:incomeTotals[String(row.period)]??row.robinhoodIncome}))
      : [];
    Object.entries(verifiedTotals).forEach(([period,realizedProfit])=>{const existing=rows.find(r=>r.period===period);if(existing)existing.realizedProfit=realizedProfit;else rows.push({period,realizedProfit,income:incomeTotals[period]??0});});
    Object.entries(incomeTotals).forEach(([period,income])=>{const existing=rows.find(r=>r.period===period);if(existing)existing.income=income;else rows.push({period,realizedProfit:0,income});});
    const filtered=rows.filter(r=>r.period.match(/(20\d{2})/)?.[1]===selectedYear && !/^Q/.test(r.period));
    const now=new Date();
    const currentYear=String(now.getFullYear());
    const maxMonthIndex=selectedYear===currentYear?now.getMonth():11;
    const monthLimit=!isRobinhood&&selectedYear==="2026"?Math.min(maxMonthIndex,7):maxMonthIndex;
    if(!isRobinhood||selectedYear==="2024"){for(const [index,month] of months.entries()){if(index>monthLimit)break;const period=`${month} ${selectedYear}`;if(!filtered.some(r=>r.period===period))filtered.push({period,realizedProfit:0,income:0});}}
    return filtered.filter(r=>{if(isRobinhood||selectedYear!=="2026")return true;const month=r.period.split(" ")[0];return months.indexOf(month)<=7;}).sort((a,b)=>periodTime(a.period)-periodTime(b.period));
  },[selectedYear,verifiedTotals,incomeTotals,isRobinhood]);
  const annualData=useMemo(()=>{
    const years=new Set<string>(isRobinhood?["2024","2025","2026"]:["2025","2026"]);
    if(isRobinhood)quarterlyIncome.forEach(row=>{const y=String(row.period).match(/(20\d{2})/)?.[1];if(y)years.add(y);});
    Object.keys(verifiedTotals).forEach(period=>{const y=period.match(/(20\d{2})/)?.[1];if(y)years.add(y);});
    Object.keys(incomeTotals).forEach(period=>{const y=period.match(/(20\d{2})/)?.[1];if(y)years.add(y);});
    return Array.from(years).sort().map(year=>{
      const monthRows:Array<{period:string;realizedProfit:number;income:number}>=[];
      for(const month of months){
        const period=`${month} ${year}`;
        const base=isRobinhood?quarterlyIncome.find(row=>String(row.period)===period):undefined;
        const hasMonthlyProfit=verifiedTotals[period]!==undefined || base!==undefined;
        const hasIncome=incomeTotals[period]!==undefined || base!==undefined;
        if(hasMonthlyProfit||hasIncome)monthRows.push({period,realizedProfit:verifiedTotals[period]??base?.robinhoodProfit??0,income:incomeTotals[period]??base?.robinhoodIncome??0});
      }
      const realizedProfit=isRobinhood&&monthRows.every(r=>r.realizedProfit===0)
        ? quarterlyIncome.filter(row=>String(row.period).match(new RegExp(`^Q[1-4] ${year}$`))).reduce((sum,row)=>sum+row.robinhoodProfit,0)
        : monthRows.reduce((sum,row)=>sum+row.realizedProfit,0);
      return {period:year,realizedProfit,income:monthRows.reduce((sum,row)=>sum+row.income,0)};
    });
  },[verifiedTotals,incomeTotals,isRobinhood]);
  const data=useMemo(()=>{
    const base=view==="year"?annualData:monthlyData;
    return base.map(row=>{
      if(view==="year"){
        const year=row.period; let dividends=0,extras=0;
        Object.entries(incomeBreakdown).forEach(([period,values])=>{if(period.endsWith(` ${year}`)){dividends+=values.dividends;extras+=values.extras;}});
        return {...row,dividends,extras};
      }
      const breakdown=incomeBreakdown[row.period]??{dividends:0,extras:0};
      return {...row,...breakdown};
    });
  },[view,annualData,monthlyData,incomeBreakdown]);
  const allTimeSummary=useMemo<RobinhoodAllTimeSummary>(()=>({
    realizedProfit:annualData.reduce((sum,row)=>sum+row.realizedProfit,0),
    dividendAmount:effectiveIncomeTransactions.filter(({item})=>item.ticker.includes("Dividend")).reduce((sum,{item})=>sum+item.amount,0),
    extras:effectiveIncomeTransactions.filter(({item})=>!item.ticker.includes("Dividend")).reduce((sum,{item})=>sum+item.amount,0),
  }),[annualData,effectiveIncomeTransactions]);
  useEffect(()=>{onAllTimeSummary?.(allTimeSummary)},[allTimeSummary,onAllTimeSummary]);
  const selectedTransactions=selectedPeriod?transactionsByPeriod[selectedPeriod]??[]:[];
  const [transactionSort,setTransactionSort]=useState<"date"|"realizedProfit">("realizedProfit");
  const [transactionSortDirection,setTransactionSortDirection]=useState<"asc"|"desc">("desc");
  const sortedTransactions=useMemo(()=>selectedTransactions.slice().sort((a,b)=>{
    const comparison=transactionSort==="date"?a.date.localeCompare(b.date):a.realizedProfit-b.realizedProfit;
    if(comparison!==0)return transactionSortDirection==="asc"?comparison:-comparison;
    return b.date.localeCompare(a.date)||b.id.localeCompare(a.id);
  }),[selectedTransactions,transactionSort,transactionSortDirection]);
  const tickerTotals=useMemo(()=>{
    const map=new Map<string,{ticker:string;count:number;total:number}>();
    selectedTransactions.forEach(tx=>{const current=map.get(tx.ticker)??{ticker:tx.ticker,count:0,total:0};current.count+=1;current.total+=tx.realizedProfit;map.set(tx.ticker,current);});
    return Array.from(map.values()).sort((a,b)=>b.total-a.total);
  },[selectedTransactions]);
  const changeTransactionSort=(column:"date"|"realizedProfit")=>{if(transactionSort===column)setTransactionSortDirection(current=>current==="asc"?"desc":"asc");else{setTransactionSort(column);setTransactionSortDirection("desc");}};
  const TransactionSortHeader=({label,column,right=false}:{label:string;column:"date"|"realizedProfit";right?:boolean})=>{const active=transactionSort===column;const SortIcon=!active?ArrowUpDown:transactionSortDirection==="asc"?ArrowUp:ArrowDown;return <button type="button" onClick={()=>changeTransactionSort(column)} className={cn("inline-flex w-full items-center gap-2 transition hover:text-zinc-200",right&&"justify-end",active&&"text-emerald-400")}>{label}<SortIcon size={14} className={active?"text-emerald-400":"opacity-25"}/></button>;};
  const selectedIncomeTransactions=selectedPeriod?effectiveIncomeTransactions.filter(({item})=>incomePeriod(item.date)===selectedPeriod):[];
  const [incomeSort,setIncomeSort]=useState<"date"|"amount">("date");
  const [incomeSortDirection,setIncomeSortDirection]=useState<"asc"|"desc">("desc");
  const sortedIncomeTransactions=useMemo(()=>selectedIncomeTransactions.slice().sort((a,b)=>{const comparison=incomeSort==="date"?a.item.date.localeCompare(b.item.date):a.item.amount-b.item.amount;if(comparison!==0)return incomeSortDirection==="asc"?comparison:-comparison;return b.item.date.localeCompare(a.item.date)||b.id.localeCompare(a.id);}),[selectedIncomeTransactions,incomeSort,incomeSortDirection]);
  const changeIncomeSort=(column:"date"|"amount")=>{if(incomeSort===column)setIncomeSortDirection(current=>current==="asc"?"desc":"asc");else{setIncomeSort(column);setIncomeSortDirection("desc");}};
  const IncomeSortHeader=({label,column,right=false}:{label:string;column:"date"|"amount";right?:boolean})=>{const active=incomeSort===column;const SortIcon=!active?ArrowUpDown:incomeSortDirection==="asc"?ArrowUp:ArrowDown;return <button type="button" onClick={()=>changeIncomeSort(column)} className={cn("inline-flex w-full items-center gap-2 transition hover:text-zinc-200",right&&"justify-end",active&&"text-blue-400")}>{label}<SortIcon size={14} className={active?"text-blue-400":"opacity-25"}/></button>;};
  const total=selectedTransactions.reduce((s,t)=>s+t.realizedProfit,0);
  const incomeTotal=selectedIncomeTransactions.reduce((s,t)=>s+t.item.amount,0);
  const incomeCategory=(item:IncomeTransaction)=>item.ticker.includes("Dividend")?"Dividends":item.ticker==="Interest Payment"?"Interest":"Robinhood Gold";
  const dividendTotal=selectedIncomeTransactions.filter(({item})=>incomeCategory(item)==="Dividends").reduce((s,t)=>s+t.item.amount,0);
  const goldTotal=selectedIncomeTransactions.filter(({item})=>incomeCategory(item)==="Robinhood Gold").reduce((s,t)=>s+t.item.amount,0);
  const interestTotal=selectedIncomeTransactions.filter(({item})=>incomeCategory(item)==="Interest").reduce((s,t)=>s+t.item.amount,0);
  const positionTypeTotals=useMemo(()=>{
    const map=new Map<ProfitDrilldownTransaction["category"],{category:ProfitDrilldownTransaction["category"];total:number;count:number}>();
    selectedTransactions.forEach(tx=>{const current=map.get(tx.category)??{category:tx.category,total:0,count:0};current.total+=tx.realizedProfit;current.count+=1;map.set(tx.category,current);});
    return Array.from(map.values()).sort((a,b)=>b.total-a.total);
  },[selectedTransactions]);
  const available=useMemo(()=>{const periods=new Set<string>();const now=new Date();const startYear=isRobinhood?2024:2025;for(let year=startYear;year<=now.getFullYear();year++){const lastMonth=year===now.getFullYear()?now.getMonth():11;for(let monthIndex=0;monthIndex<=lastMonth;monthIndex++)periods.add(`${months[monthIndex]} ${year}`);}Object.keys(transactionsByPeriod).forEach(period=>periods.add(period));Object.keys(incomeTotals).forEach(period=>periods.add(period));return Array.from(periods).sort((a,b)=>periodTime(a)-periodTime(b));},[isRobinhood,transactionsByPeriod,incomeTotals]);
  const idx=selectedPeriod?available.indexOf(selectedPeriod):-1;
  const prev=idx>0?available[idx-1]:null, next=idx>=0&&idx<available.length-1?available[idx+1]:null;
  const open=(period:string)=>{if(view==="year"){setSelectedYear(period);setView("month");return;}if(period.match(/^[A-Z][a-z]{2} 20\d{2}$/)){setSelectedPeriod(period);setDetailView("profit");}};
  const BarValueLabel=(props:any)=>{const {x,y,width,height,value}=props;if(value===undefined||value===null)return null;const numericValue=Number(value);const labelY=numericValue<0?Number(y)+Number(height)+7:Number(y)-7;return <text x={Number(x)+Number(width)/2} y={labelY} textAnchor="middle" dominantBaseline={numericValue<0?"hanging":"auto"} fill="#e4e4e7" fontSize={11} fontWeight={700} stroke="#09090b" strokeWidth={2} paintOrder="stroke">{wholeDollar(numericValue)}</text>;};
  return <>
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-zinc-200/70 dark:border-white/[.06]">
        <div><h2 className="font-medium">{isRobinhood?"Robinhood Realized P/L, Dividends and Interests":"Realized Returns Over Time"}</h2></div>
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <div className="inline-flex h-10 items-center rounded-xl border border-white/[.08] bg-white/[.025] p-1 shadow-inner">
            <button type="button" onClick={()=>setView("month")} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition",view==="month"?"bg-emerald-500/15 text-emerald-400 shadow-sm ring-1 ring-emerald-500/25":"text-zinc-500 hover:bg-white/[.04] hover:text-zinc-200")}><CalendarDays size={14}/>Month</button>
            <button type="button" onClick={()=>setView("year")} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition",view==="year"?"bg-emerald-500/15 text-emerald-400 shadow-sm ring-1 ring-emerald-500/25":"text-zinc-500 hover:bg-white/[.04] hover:text-zinc-200")}><BarChart3 size={14}/>Year</button>
          </div>
          {view!=="year"&&<div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400"/><select value={selectedYear} onChange={e=>setSelectedYear(e.target.value)} className="h-10 appearance-none rounded-xl border border-white/[.08] bg-white/[.025] pl-9 pr-9 text-sm font-semibold outline-none transition hover:border-emerald-500/25 focus:border-emerald-500/40 dark:bg-zinc-950/70">{(isRobinhood?["2026","2025","2024"]:["2026","2025"]).map(y=><option key={y}>{y}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400"/></div>}
        </div>
      </CardHeader>
      <CardContent className="pt-5"><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} barGap={6} barCategoryGap="22%" margin={{left:4,right:12,top:28,bottom:12}} onClick={(state:any)=>{const period=state?.activePayload?.[0]?.payload?.period;if(typeof period==="string")open(period);}} style={{cursor:"pointer"}}>
        <defs><linearGradient id="rhq-profit" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#10b981" stopOpacity={0.65}/></linearGradient><linearGradient id="rhq-income" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.65}/></linearGradient><linearGradient id="rhq-negative" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb7185"/><stop offset="100%" stopColor="#e11d48" stopOpacity={0.72}/></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(161,161,170,.13)"/><XAxis dataKey="period" tick={{fill:"#a1a1aa",fontSize:10,fontWeight:600}} axisLine={false} tickLine={false} interval={0}/><YAxis tick={{fill:"#71717a",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={chartAxisValue} padding={{top:12,bottom:26}}/>
        <Tooltip cursor={{fill:"rgba(161,161,170,.06)"}} content={({active,payload,label}:any)=>{if(!active||!payload?.length)return null;const row=payload[0]?.payload??{};return <div className="min-w-48 rounded-xl border border-white/10 bg-zinc-900/95 p-3 text-xs shadow-2xl backdrop-blur"><div className="mb-2 font-bold text-zinc-100">{label}</div><div className="space-y-1.5"><div className="flex items-center justify-between gap-6"><span className="text-emerald-400">Profit</span><span className="font-semibold text-zinc-100">{money(Number(row.realizedProfit??0))}</span></div><div className="flex items-center justify-between gap-6"><span className="text-blue-400">Dividends</span><span className="font-semibold text-zinc-100">{money(Number(row.dividends??0))}</span></div><div className="flex items-center justify-between gap-6"><span className="text-amber-400">{isRobinhood?"Robinhood Extras":"Extras"}</span><span className="font-semibold text-zinc-100">{money(Number(row.extras??0))}</span></div></div></div>;}}/><Legend wrapperStyle={{fontSize:12,paddingTop:14}} iconType="circle"/>
        <Bar dataKey="realizedProfit" name="Profit" fill="#10b981" radius={[7,7,2,2]} maxBarSize={34} onClick={(entry:any)=>open(entry?.period)} style={{cursor:"pointer"}}>{data.map(row=><Cell key={`p-${row.period}`} fill={row.realizedProfit<0?"url(#rhq-negative)":"url(#rhq-profit)"}/>)}<LabelList dataKey="realizedProfit" content={<BarValueLabel/>}/></Bar>
        <Bar dataKey="income" name="Dividends & Interest" fill="#3b82f6" radius={[7,7,2,2]} maxBarSize={34} onClick={(entry:any)=>open(entry?.period)} style={{cursor:"pointer"}}>{data.map(row=><Cell key={`i-${row.period}`} fill={row.income<0?"url(#rhq-negative)":"url(#rhq-income)"}/>)}<LabelList dataKey="income" content={<BarValueLabel/>}/></Bar>
      </BarChart></ResponsiveContainer></div></CardContent>
    </Card>
    {editingProfit&&profitDraft&&<div className="fixed inset-0 z-[85] grid place-items-center bg-black/75 p-4" onMouseDown={e=>{if(e.currentTarget===e.target){setEditingProfit(null);setProfitDraft(null)}}}><Card className="w-full max-w-lg overflow-hidden"><div className="flex items-center justify-between border-b border-white/10 p-4"><h3 className="font-semibold">Edit Realized P/L</h3><button onClick={()=>{setEditingProfit(null);setProfitDraft(null)}} className="grid size-9 place-items-center rounded-xl border border-white/10"><X size={16}/></button></div><div className="grid gap-4 p-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs text-zinc-500">Date</span><input type="date" value={profitDraft.date} onChange={e=>setProfitDraft({...profitDraft,date:e.target.value})} className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm"/></label><label><span className="mb-1.5 block text-xs text-zinc-500">Realized Profit</span><input type="number" step="0.01" value={profitDraft.realizedProfit} onChange={e=>setProfitDraft({...profitDraft,realizedProfit:Number(e.target.value)})} className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm"/></label><label><span className="mb-1.5 block text-xs text-zinc-500">Ticker</span><input value={profitDraft.ticker} onChange={e=>setProfitDraft({...profitDraft,ticker:e.target.value})} className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm"/></label><label><span className="mb-1.5 block text-xs text-zinc-500">Type</span><select value={profitDraft.category} onChange={e=>setProfitDraft({...profitDraft,category:e.target.value as ProfitDrilldownTransaction["category"]})} className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm">{["Common Stocks","Sell Call","Sell Put","Buy Call","Buy Put"].map(x=><option key={x}>{x}</option>)}</select></label><label className="sm:col-span-2"><span className="mb-1.5 block text-xs text-zinc-500">Position</span><input value={profitDraft.label} onChange={e=>setProfitDraft({...profitDraft,label:e.target.value})} className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm"/></label></div><div className="flex items-center justify-between border-t border-white/10 p-4"><button onClick={deleteProfitEditor} className="h-10 rounded-xl border border-red-400/25 bg-red-400/[.08] px-4 text-sm font-medium text-red-300">Delete Entry</button><div className="flex gap-2"><button onClick={()=>{setEditingProfit(null);setProfitDraft(null)}} className="h-10 rounded-xl border border-white/10 px-4 text-sm text-zinc-400">Cancel</button><button onClick={saveProfitEditor} className="h-10 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950">Save Entry</button></div></div></Card></div>}
    {editingIncome&&<div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4" onMouseDown={e=>{if(e.currentTarget===e.target)setEditingIncome(null)}}><Card className="w-full max-w-lg overflow-hidden"><div className="flex items-center justify-between border-b border-white/10 p-4"><h3 className="font-semibold">Edit Dividends & Interest</h3><button onClick={()=>setEditingIncome(null)} className="grid size-9 place-items-center rounded-xl border border-white/10"><X size={16}/></button></div><div className="grid gap-4 p-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs text-zinc-500">Date</span><input type="date" value={incomeDraft.date} onChange={e=>setIncomeDraft(d=>({...d,date:e.target.value}))} className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm"/></label><label><span className="mb-1.5 block text-xs text-zinc-500">Amount</span><input type="number" step="0.01" value={incomeDraft.amount} onChange={e=>setIncomeDraft(d=>({...d,amount:Number(e.target.value)}))} className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm"/></label><label className="sm:col-span-2"><span className="mb-1.5 block text-xs text-zinc-500">Source</span><input value={incomeDraft.ticker} onChange={e=>setIncomeDraft(d=>({...d,ticker:e.target.value}))} className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm"/></label></div><div className="flex items-center justify-between border-t border-white/10 p-4"><button onClick={deleteIncomeEditor} className="h-10 rounded-xl border border-red-400/25 bg-red-400/[.08] px-4 text-sm font-medium text-red-300">Delete Entry</button><div className="flex gap-2"><button onClick={()=>setEditingIncome(null)} className="h-10 rounded-xl border border-white/10 px-4 text-sm text-zinc-400">Cancel</button><button onClick={saveIncomeEditor} className="h-10 rounded-xl bg-blue-500 px-4 text-sm font-semibold text-white">Save Entry</button></div></div></Card></div>}
    {selectedPeriod&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onMouseDown={e=>{if(e.currentTarget===e.target)setSelectedPeriod(null)}}><div className="max-h-[88vh] w-full max-w-5xl overflow-auto rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-950 px-5 py-4"><div className="flex items-center gap-2">{prev&&<button onClick={()=>setSelectedPeriod(prev)} className="grid size-9 place-items-center rounded-lg border border-white/10"><ChevronLeft size={17}/></button>}<h3 className="text-lg font-semibold">{selectedPeriod} Details</h3>{next&&<button onClick={()=>setSelectedPeriod(next)} className="grid size-9 place-items-center rounded-lg border border-white/10"><ChevronRight size={17}/></button>}</div><div className="absolute left-1/2 flex -translate-x-1/2 overflow-hidden rounded-xl border border-white/10"><button type="button" onClick={()=>setDetailView("profit")} className={cn("px-4 py-2 text-xs font-semibold transition",detailView==="profit"?"bg-emerald-500 text-zinc-950":"text-zinc-400 hover:text-white")}>Realized P/L</button><button type="button" onClick={()=>setDetailView("income")} className={cn("px-4 py-2 text-xs font-semibold transition",detailView==="income"?"bg-blue-500 text-white":"text-zinc-400 hover:text-white")}>Dividends & Interest</button></div><button onClick={()=>setSelectedPeriod(null)} className="grid size-9 place-items-center rounded-lg border border-white/10"><X size={17}/></button></div>
      <div className="p-5">{detailView==="profit"?<><div className="mb-5"><h4 className="mb-3 text-sm font-semibold">Profit By Position Type</h4><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div className="rounded-xl border border-white/10 p-4"><div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Total Profit</div><div className={cn("mt-2 text-2xl font-semibold",total>=0?"positive":"negative")}>{money(total)}</div><div className="mt-2 text-xs text-zinc-600">{selectedTransactions.length} {selectedTransactions.length===1?"Transaction":"Transactions"}</div></div>{positionTypeTotals.map(item=><div key={item.category} className="rounded-xl border border-white/10 p-4"><div className="text-sm font-semibold text-zinc-400">{item.category}</div><div className={cn("mt-2 text-2xl font-semibold",item.total>=0?"positive":"negative")}>{money(item.total)}</div><div className="mt-2 text-xs text-zinc-600">{item.count} {item.count===1?"Transaction":"Transactions"}</div></div>)}</div></div>
      <div className="mb-5 overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.02]"><div className="border-b border-white/[.07] px-4 py-3"><h4 className="text-sm font-semibold">Profit By Ticker</h4></div><div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead className="bg-white/[.025] text-xs text-zinc-500"><tr><th className="px-4 py-3 text-left">Ticker</th><th className="px-4 py-3 text-right">Transactions</th><th className="px-4 py-3 text-right">Realized P/L</th></tr></thead><tbody>{tickerTotals.map(item=><tr key={item.ticker} className="border-t border-white/[.06]"><td className="px-4 py-3 font-semibold">{item.ticker}</td><td className="px-4 py-3 text-right text-zinc-400">{item.count}</td><td className={cn("px-4 py-3 text-right font-semibold",item.total>0?"positive":item.total<0?"negative":"text-zinc-400")}>{money(item.total)}</td></tr>)}</tbody></table></div></div>
      <div className="overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.02]"><div className="border-b border-white/[.07] px-4 py-3"><h4 className="text-sm font-semibold">Profit By Transaction</h4></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-white/[.025] text-xs text-zinc-500"><tr><th className="px-4 py-3 text-left">Rank</th><th className="px-4 py-3 text-left"><TransactionSortHeader label="Date" column="date" /></th><th className="px-4 py-3 text-left">Ticker</th><th className="px-4 py-3 text-left">Position</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-right"><TransactionSortHeader label="Realized Profit" column="realizedProfit" right /></th></tr></thead><tbody>{sortedTransactions.map((tx,index)=><tr key={tx.id} className="border-t border-white/[.06]"><td className="px-4 py-3 font-semibold text-zinc-500">#{index+1}</td><td className="whitespace-nowrap px-4 py-3 text-zinc-400">{new Date(`${tx.date}T12:00:00`).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</td><td className="px-4 py-3 font-semibold">{tx.ticker}</td><td className="px-4 py-3 text-zinc-400">{canEditProfit(tx)?<button type="button" onClick={()=>openProfitEditor(tx)} className="text-left transition hover:text-emerald-400 hover:underline" title="Click To Edit">{tx.label}</button>:tx.label}</td><td className="px-4 py-3">{tx.category}</td><td className={cn("px-4 py-3 text-right font-semibold",tx.realizedProfit>=0?"positive":"negative")}>{money(tx.realizedProfit)}</td></tr>)}</tbody></table></div></div></>:<><div className="mb-5 grid gap-3 sm:grid-cols-4"><div className="rounded-xl border border-white/10 p-4"><div className="text-xs text-zinc-500">Total Dividends & Interest</div><div className={cn("mt-1 text-xl font-semibold",incomeTotal>=0?"positive":"negative")}>{money(incomeTotal)}</div></div><div className="rounded-xl border border-white/10 p-4"><div className="text-xs text-zinc-500">Total Dividends</div><div className={cn("mt-1 text-xl font-semibold",dividendTotal>=0?"positive":"negative")}>{money(dividendTotal)}</div></div><div className="rounded-xl border border-white/10 p-4"><div className="text-xs text-zinc-500">Total Robinhood Gold</div><div className={cn("mt-1 text-xl font-semibold",goldTotal>=0?"positive":"negative")}>{money(goldTotal)}</div></div><div className="rounded-xl border border-white/10 p-4"><div className="text-xs text-zinc-500">Total Interest</div><div className={cn("mt-1 text-xl font-semibold",interestTotal>=0?"positive":"negative")}>{money(interestTotal)}</div></div></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="border-y border-white/10 text-xs text-zinc-500"><tr><th className="px-3 py-3 text-left"><IncomeSortHeader label="Date" column="date" /></th><th className="px-3 py-3 text-left">Source</th><th className="px-3 py-3 text-left">Category</th><th className="px-3 py-3 text-right"><IncomeSortHeader label="Amount" column="amount" right /></th></tr></thead><tbody>{sortedIncomeTransactions.map(({id,item})=><tr key={id} onClick={()=>{if(canEditIncome(item.date))openIncomeEditor(id,item)}} className={cn("border-b border-white/[.06]",canEditIncome(item.date)&&"cursor-pointer transition hover:bg-white/[.035]")} title={canEditIncome(item.date)?"Click To Edit":undefined}><td className="px-3 py-3">{new Date(`${item.date}T12:00:00`).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</td><td className="px-3 py-3 font-medium">{item.ticker}</td><td className="px-3 py-3">{incomeCategory(item)}</td><td className={cn("px-3 py-3 text-right font-semibold",item.amount>=0?"positive":"negative")}>{money(item.amount)}</td></tr>)}</tbody></table></div></>}</div>
    </div></div>}
  </>;
}

function EditableRow({tx,onSave}:{tx:ProfitDrilldownTransaction;onSave:(patch:VerifiedProfitEdit)=>void}){
  const [editing,setEditing]=useState(false); const [draft,setDraft]=useState(tx);
  useEffect(()=>setDraft(tx),[tx]);
  if(!editing)return <tr className="border-b border-white/[.06]"><td className="px-3 py-3">{new Date(`${tx.date}T12:00:00`).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</td><td className="px-3 py-3 font-semibold">{tx.ticker}</td><td className="px-3 py-3">{tx.label}</td><td className="px-3 py-3">{tx.category}</td><td className={cn("px-3 py-3 text-right font-semibold",tx.realizedProfit>=0?"positive":"negative")}>{money(tx.realizedProfit)}</td><td className="px-3 py-3 text-right"><button onClick={()=>setEditing(true)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">Edit</button></td></tr>;
  return <tr className="border-b border-white/[.06]"><td className="px-2 py-2"><input type="date" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})} className="h-9 rounded-lg border border-white/10 bg-transparent px-2"/></td><td className="px-2 py-2"><input value={draft.ticker} onChange={e=>setDraft({...draft,ticker:e.target.value})} className="h-9 w-24 rounded-lg border border-white/10 bg-transparent px-2"/></td><td className="px-2 py-2"><input value={draft.label} onChange={e=>setDraft({...draft,label:e.target.value})} className="h-9 w-64 rounded-lg border border-white/10 bg-transparent px-2"/></td><td className="px-2 py-2"><select value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value as ProfitDrilldownTransaction["category"]})} className="h-9 rounded-lg border border-white/10 bg-zinc-950 px-2">{["Common Stocks","Sell Call","Sell Put","Buy Call","Buy Put"].map(x=><option key={x}>{x}</option>)}</select></td><td className="px-2 py-2"><input type="number" step="any" value={draft.realizedProfit} onChange={e=>setDraft({...draft,realizedProfit:Number(e.target.value)})} className="h-9 w-28 rounded-lg border border-white/10 bg-transparent px-2 text-right"/></td><td className="px-2 py-2 text-right"><div className="flex justify-end gap-2"><button onClick={()=>{onSave(draft);setEditing(false)}} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950">Save</button><button onClick={()=>setEditing(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">Cancel</button></div></td></tr>;
}
