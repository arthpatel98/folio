export const investmentAccounts = [
  { name: "Robinhood", invested: 74500, current: 91570, gain: 17070, totalReturn: 0.2291275168, cagr: 0.08602238397, ytd: 0.09343841423, allTimeHigh: "$108,128 On Nov 5, 2025", start: "Jan 9, 2024" },
  { name: "Fidelity Roth IRA", invested: 19000, current: 14183, gain: -4817, totalReturn: -0.2535263158, cagr: -0.1686250316, ytd: -0.1379163628, allTimeHigh: "$20,134 On Aug 6, 2025", start: "Dec 2, 2024" },
  { name: "Fidelity 401(k)", invested: 13703.6, current: 19801, gain: 6097.4, totalReturn: 0.4449487726, cagr: 0.1586198911, ytd: 0.205, allTimeHigh: "$21,194 On June 2, 2026", start: "Jan 19, 2024" },
] as const;

export const investmentTotals = { invested: 107203.6, current: 125554, gain: 18350.4, totalReturn: 0.1711733561 };
export const stockTotals = { invested: 93500, current: 105753, gain: 12253, totalReturn: 0.1310481283 };

export const quarterlyIncome = [
  { period: "Q1 2024", robinhoodProfit: 39.32, robinhoodIncome: 6.18, rothProfit: 0, rothIncome: 0, total: 45.5 },
  { period: "Q2 2024", robinhoodProfit: 690.41, robinhoodIncome: 13.64, rothProfit: 0, rothIncome: 0, total: 704.05 },
  { period: "Q3 2024", robinhoodProfit: 1352.77, robinhoodIncome: 40.29, rothProfit: 0, rothIncome: 0, total: 1393.06 },
  { period: "Q4 2024", robinhoodProfit: 5478.23, robinhoodIncome: 198.82, rothProfit: 0, rothIncome: 35.87, total: 5712.92 },
  { period: "Q1 2025", robinhoodProfit: 6042.57, robinhoodIncome: 82.88, rothProfit: 1999.89, rothIncome: 22.72, total: 8148.06 },
  { period: "Q2 2025", robinhoodProfit: 1464.24, robinhoodIncome: 156.66, rothProfit: 3652.55, rothIncome: 35.1, total: 5308.55 },
  { period: "Q3 2025", robinhoodProfit: 14689.17, robinhoodIncome: 161.64, rothProfit: 1795.36, rothIncome: 106.13, total: 16752.3 },
  { period: "Q4 2025", robinhoodProfit: 17530.04, robinhoodIncome: 137.11, rothProfit: 1587.46, rothIncome: 32.93, total: 19287.54 },
  { period: "Q1 2026", robinhoodProfit: -3851.48, robinhoodIncome: 880.52, rothProfit: -522.7, rothIncome: 13.27, total: -3480.39 },
  { period: "Q2 2026", robinhoodProfit: 15699.68, robinhoodIncome: 247.76, rothProfit: -909.09, rothIncome: 61.81, total: 15100.16 },
  { period: "Jul 2026", robinhoodProfit: 3669.1, robinhoodIncome: 0, rothProfit: -480.1, rothIncome: 0, total: 3189 },
] as const;

export const yearlyIncome = [
  { year: "2024", total: 7855.53 },
  { year: "2025", total: 49496.45 },
  { year: "2026 YTD", total: 14808.77 },
] as const;

export const realizedTotals = { robinhoodProfit: 62492.34, robinhoodIncome: 1925.5, rothProfit: 7123.37, rothIncome: 307.83, total: 72160.75 };

export const ytdPerformance = [
  { account: "Robinhood", "2024": -0.0893, "2025": 0.1694, "2026": 0.09343841423 },
  { account: "Roth IRA", "2024": 0.0054, "2025": -0.1594, "2026": -0.1379163628 },
  { account: "401(k) IRA", "2024": 0.1506, "2025": 0.2342, "2026": 0.205 },
] as const;

export const savingsByYear = [
  { period: "2023", amount: 31279 },
  { period: "2024", amount: 46530 },
  { period: "2025", amount: 44120 },
  { period: "Q1 2026", amount: 9382 },
  { period: "Q2 2026", amount: 5482 },
  { period: "Jul 2026", amount: 1477 },
] as const;

export const wealthSnapshot = {
  updated: "July 24, 2026",
  cash: 41678,
  investments: 125554,
  property: 12700,
  debts: -1239,
  totalNetWorth: 178693,
  nrCashValue: 132009,
};

export const splitwise = [
  { item: "Hirenbhai Chase", amount: -10000 },
  { item: "Taxes Transfer Chase", amount: 5000 },
  { item: "Friends", amount: -31 },
  { item: "EVgo June 23", amount: 44.17 },
] as const;

export const robinhoodExtras = [
  { item: "RG Interest", amount: 632.51, lastPosted: "Jun 30, 2026" },
  { item: "RG Deposit Boost", amount: 190.37, lastPosted: "Jun 30, 2026" },
  { item: "RG Membership", amount: -93.32, lastPosted: "Mar 4, 2026" },
] as const;

export const fidelityExtras = [
  { item: "SPAXX Dividend", amount: 146.52, lastPosted: "Jun 30, 2026" },
  { item: "MAGS Short-Term Cap Gain", amount: 0.86, lastPosted: "Dec 31, 2024" },
] as const;

export const utilityHistory = [
  { month: "May 2026", ce: 35.61, wifi: 40, dte: 41.88, utilitiesFees: 32.95, rentersInsurance: 14.11, total: 164.55 },
  { month: "Jun 2026", ce: 31.72, wifi: 40, dte: 39.82, utilitiesFees: 32.95, rentersInsurance: 6.443333333, total: 150.9333333 },
  { month: "Jul 2026", ce: 23.69, wifi: 40, dte: 37.15, utilitiesFees: 32.95, rentersInsurance: 6.443333333, total: 140.2333333 },
] as const;

export const expenseCategories = [
  "Mortgage & Rent", "Travel & Vacation", "Food & Dining", "Auto & Transport", "Groceries", "Shopping", "Health & Fitness", "Entertainment", "Home & Garden", "Taxes", "Personal Care", "Gifts", "Others Combined",
] as const;

export const expenseMonthly = [
  { month: "Jan 2026", values: [203,35,169,46,129,1,10,0,0,0,0,37,3], total: 633 },
  { month: "Feb 2026", values: [466,0,69,44,68,130,258,55,0,0,0,0,3], total: 1093 },
  { month: "Mar 2026", values: [1588,0,116,263,63,-8,23,32,0,176,48,19,23], total: 2343 },
  { month: "Apr 2026", values: [1131,0,208,750,206,0,10,47,80,1551,0,0,42], total: 4025 },
  { month: "May 2026", values: [337,68,133,-34,276,0,10,0,325,1500,21,0,43], total: 2679 },
  { month: "Jun 2026", values: [-7,830,21,0,272,160,99,0,98,1500,43,38,379], total: 3433 },
  { month: "Jul 2026", values: [1835,75,54,52,243,37,10,6,185,0,0,-29,20], total: 2488 },
] as const;

export const expenseAverages = {
  "2025": { values: [600,271,150,243,146,96,78,58,0,0,48,14,-82], total: 1622 },
  "2026": { values: [793.2857143,144,110,160.1428571,179.5714286,45.71428571,60,20,98.28571429,675.2857143,16,9.285714286,73.28571429], total: 2384.857143 },
};
