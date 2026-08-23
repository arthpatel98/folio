"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, BarChart3, Landmark, TrendingUp, WalletCards, X } from "lucide-react";
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

const ROBINHOOD_VERIFIED_CLOSE_DATE_TRANSACTIONS: Record<string, ProfitDrilldownTransaction[]> = {
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
  const [verifiedProfitEdits,setVerifiedProfitEdits]=useState<VerifiedProfitEdits>({});
  useEffect(()=>{
    try{
      const raw=window.localStorage.getItem(VERIFIED_PROFIT_EDITS_KEY);
      if(raw)setVerifiedProfitEdits(JSON.parse(raw));
    }catch{}
  },[]);
  const saveVerifiedProfitEdit=(id:string,patch:VerifiedProfitEdit)=>{
    setVerifiedProfitEdits(current=>{
      const next={...current,[id]:{...(current[id]??{}),...patch}};
      try{window.localStorage.setItem(VERIFIED_PROFIT_EDITS_KEY,JSON.stringify(next));}catch{}
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
        const date = new Date(`${transaction.date}T12:00:00`);
        if (Number.isNaN(date.getTime())) return;
        const period = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
        monthly.set(period, (monthly.get(period) ?? 0) + (transaction.realizedGain ?? 0));
      });
      return monthly;
    };
    return {
      robinhood: aggregate("robinhood"),
      roth: aggregate("fidelity-roth"),
    };
  }, [transactionsByPortfolio]);

  const profitDrilldownGroups = useMemo<ProfitTickerGroup[]>(() => {
    if (!profitDrilldown) return [];
    const transactions = transactionsByPortfolio[profitDrilldown.portfolioId] ?? [];
    const matching = transactions.filter((transaction) => {
      if (transaction.type !== "sell" || !Number.isFinite(transaction.realizedGain)) return false;
      if (!transaction.notes?.includes("Sold from Holdings")) return false;
      if (!isFutureHoldingsSale(transaction.id)) return false;
      const date = new Date(`${transaction.date}T12:00:00`);
      if (Number.isNaN(date.getTime())) return false;
      const period = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
      return period === profitDrilldown.period;
    });

    const groups = new Map<string, ProfitDrilldownTransaction[]>();
    matching.forEach((transaction) => {
      const ticker = (transaction.symbol ?? "Other").trim().toUpperCase() || "Other";
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
        date: transaction.date,
        ticker,
        label,
        quantity: typeof transaction.quantity === "number" ? Math.abs(transaction.quantity) : null,
        price: typeof transaction.price === "number" ? transaction.price : null,
        proceeds: typeof transaction.realizedProceeds === "number"
          ? transaction.realizedProceeds
          : transaction.amount ? Math.abs(transaction.amount) : null,
        realizedProfit: Number(transaction.realizedGain) || 0,
        category,
      };
      groups.set(ticker, [...(groups.get(ticker) ?? []), row]);
    });

    const total = matching.reduce((sum, transaction) => sum + (Number(transaction.realizedGain) || 0), 0);
    return Array.from(groups.entries())
      .map(([ticker, transactions]) => {
        const realizedProfit = transactions.reduce((sum, transaction) => sum + transaction.realizedProfit, 0);
        return { ticker, realizedProfit, percent: total ? realizedProfit / total * 100 : 0, transactions };
      })
      .sort((a,b) => b.realizedProfit - a.realizedProfit);
  }, [profitDrilldown, transactionsByPortfolio]);

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
    const base: { period: string; realizedProfit: number; income: number }[] = quarterlyIncome.map((row) => {
      const realizedProfit = row.period === "Q1 2026"
        ? q1
        : row.period === "Q2 2026"
          ? q2
          : row.robinhoodProfit - (row.period === "Q1 2025" ? 311.71 : 0);
      return { period: row.period, realizedProfit, income: row.robinhoodIncome };
    });
    Object.keys(verifiedCloseDateMonthlyTotals).forEach(period=>{
      const realizedProfit:number=verifiedCloseDateMonthlyTotals[period]??0;
      base.push({period,realizedProfit,income:0});
    });
    return mergeMonthlySales(base, realizedSalesByMonth.robinhood);
  }, [realizedSalesByMonth,verifiedCloseDateMonthlyTotals]);

  const rothQuarterly = useMemo(() => mergeMonthlySales(quarterlyIncome.map((row) => ({
    period: row.period,
    realizedProfit: row.rothProfit,
    income: row.rothIncome,
  })), realizedSalesByMonth.roth), [realizedSalesByMonth]);

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

  const selectedVisual = activeId === "robinhood"
    ? <QuarterlyChart title="Robinhood Quarterly Data" subtitle="Profit Vs Dividend, Interest & Bonus" data={robinhoodChartData} selectedYear={robinhoodChartYear} onYearChange={setRobinhoodChartYear} yearOptions={["2026","2025","2024"]} onProfitBarClick={(period)=>setProfitDrilldown({portfolioId:"robinhood",period})}/>
    : activeId === "fidelity-roth"
      ? <QuarterlyChart title="Fidelity Roth IRA Quarterly Data" subtitle="Profit Vs Dividend, Interest & Bonus By Quarter" data={rothQuarterly} onProfitBarClick={(period)=>setProfitDrilldown({portfolioId:"fidelity-roth",period})}/>
      : activeId === "fidelity-401k"
        ? <YtdAccountChart account="Fidelity 401(k)" data={ytdPerformance.find((row) => row.account === "401(k) IRA") ?? { account: "401(k) IRA", "2024": 0, "2025": 0, "2026": 0.1465 }} currentYtd={dynamicYtd["Fidelity 401(k)"]}/>
        : <IncomeTotalsChart data={brokerageIncomeTotals}/>;

  return <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Portfolio Performance</h1>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Total Investments" value={money(totals.current)} detail={`${money(totals.invested)} Invested`} icon={WalletCards}/>
      <Metric label="Total Gain" value={money(totals.gain)} detail={`${pct(totals.totalReturn)} Total Return`} icon={TrendingUp} positive={totals.gain >= 0}/>
      <Metric label="Realized Income" value={money(selectedRealizedIncome)} icon={Landmark} positive={selectedRealizedIncome >= 0}/>
      <Metric label="2026 Realized YTD" value={money(selected2026Income)} detail="Through July 2026" icon={BarChart3} positive={selected2026Income >= 0}/>
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
      onEditTransaction={profitDrilldown.portfolioId==="robinhood"&&verifiedCloseDateTransactions[profitDrilldown.period]?saveVerifiedProfitEdit:undefined}
      onClose={()=>setProfitDrilldown(null)}
    />}

    <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
      <Card>
        <CardHeader><h2 className="font-medium">Yearly Realized Income</h2></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {yearlyRealizedIncome.map((row)=><div key={row.year} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/[.025]">
            <div className="text-xs text-zinc-500">{row.year}</div>
            <div className={cn("mt-1 text-xl font-semibold", row.total >= 0 ? "positive" : "negative")}>{money(row.total)}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-200/70 pt-3 text-xs dark:border-white/[.06]">
              <div><div className="text-zinc-500">Profit</div><div className={cn("mt-1 font-medium", row.realizedProfit >= 0 ? "positive" : "negative")}>{money(row.realizedProfit)}</div></div>
              <div><div className="text-zinc-500">Dividend, Interest & Bonus</div><div className={cn("mt-1 font-medium", row.income >= 0 ? "positive" : "negative")}>{money(row.income)}</div></div>
            </div>
          </div>)}
        </CardContent>
      </Card>

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
        {activeId==="robinhood"&&<ExtrasTable rows={extras.robinhood} onSave={rows=>saveExtras("robinhood",rows)}/>}
        {activeId==="fidelity-roth"&&<ExtrasTable rows={extras["fidelity-roth"]} onSave={rows=>saveExtras("fidelity-roth",rows)}/>}
      </div>
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

function QuarterlyChart({ title, subtitle, data, onProfitBarClick, selectedYear, onYearChange, yearOptions }: { title: string; subtitle: string; data: { period: string; realizedProfit: number; income: number }[]; onProfitBarClick?: (period:string)=>void; selectedYear?:string; onYearChange?:(year:string)=>void; yearOptions?:string[] }) {
  const gradientId=title.replace(/\W/g, "");
  const isMonthly=(period:string)=>/^[A-Z][a-z]{2} 20\d{2}$/.test(period);
  const openProfitDetail=(entry:any)=>{
    const period=entry?.payload?.period??entry?.period;
    if(typeof period==="string"&&isMonthly(period)) onProfitBarClick?.(period);
  };
  const PeriodTick=(props:any)=>{
    const {x,y,payload}=props;
    const period=String(payload?.value??"");
    const clickable=Boolean(onProfitBarClick&&isMonthly(period));
    return <g transform={`translate(${x},${y})`} onClick={()=>clickable&&onProfitBarClick?.(period)} style={{cursor:clickable?"pointer":"default"}}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill={clickable?"#a1a1aa":"#71717a"} fontSize={10} fontWeight={clickable?600:400}>{period}</text>
    </g>;
  };
  return <Card className="overflow-hidden">
    <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-zinc-200/70 dark:border-white/[.06]">
      <div><h2 className="font-medium">{title}</h2><p className="mt-1 text-xs text-zinc-500">{subtitle}</p></div>
      {selectedYear&&onYearChange&&<select value={selectedYear} onChange={event=>onYearChange(event.target.value)} className="h-9 rounded-xl border border-zinc-200 bg-transparent px-3 text-sm font-medium outline-none dark:border-white/10 dark:bg-zinc-950">{(yearOptions??[]).map(year=><option key={year} value={year}>{year}</option>)}</select>}
    </CardHeader>
    <CardContent className="pt-5">
      <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} barGap={6} barCategoryGap="22%" margin={{left:4,right:12,top:28,bottom:4}}>
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
        <Bar dataKey="income" name="Dividend, Interest & Bonus" fill={`url(#${gradientId}-income)`} radius={[7,7,2,2]} maxBarSize={34}>
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

function ProfitDrilldownModal({period,groups,total,onEditTransaction,onClose}:{period:string;groups:ProfitTickerGroup[];total:number;onEditTransaction?:(id:string,patch:VerifiedProfitEdit)=>void;onClose:()=>void}) {
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
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/[.07] bg-zinc-950/95 px-5 py-4 backdrop-blur-xl sm:px-6">
        <div><h2 className="text-xl font-semibold">{period} Details</h2></div>
        <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl border border-white/10 text-zinc-500 transition hover:bg-white/[.05] hover:text-white" aria-label="Close Details"><X size={17}/></button>
      </div>
      <div className="p-5 sm:p-6">
        {groups.length===0?<><div className="mb-5"><p className="text-xs uppercase tracking-[.14em] text-zinc-600">Total Profit</p><p className={cn("mt-1 text-3xl font-semibold",total>=0?"text-emerald-400":"text-rose-400")}>{money(total)}</p></div><div className="rounded-2xl border border-white/10 bg-white/[.025] px-6 py-16 text-center text-sm text-zinc-500">No transaction-level profit details are available for {period}.</div></>:<>
          <div>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Profit By Position Type</h3><span className="text-xs text-zinc-600">{transactions.length} Transactions</span></div>
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
