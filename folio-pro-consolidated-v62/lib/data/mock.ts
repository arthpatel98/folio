import { Holding, PerformancePoint, Transaction } from "@/types/portfolio";
export const holdings:Holding[]=[
{symbol:"NVDA",company:"NVIDIA Corporation",shares:42,averageCost:91.24,currentPrice:142.62,previousClose:139.31,dividendYield:.03,sector:"Cloud / AI / Software",updatedAt:"Just now"},
{symbol:"AAPL",company:"Apple Inc.",shares:36,averageCost:176.10,currentPrice:228.68,previousClose:226.01,dividendYield:.44,sector:"Cloud / AI / Software",updatedAt:"Just now"},
{symbol:"MSFT",company:"Microsoft Corporation",shares:18,averageCost:331.52,currentPrice:418.79,previousClose:415.16,dividendYield:.75,sector:"Cloud / AI / Software",updatedAt:"Just now"},
{symbol:"JPM",company:"JPMorgan Chase & Co.",shares:24,averageCost:168.20,currentPrice:236.41,previousClose:234.92,dividendYield:2.11,sector:"Financials",updatedAt:"1m ago"},
{symbol:"LLY",company:"Eli Lilly and Company",shares:7,averageCost:622.34,currentPrice:807.14,previousClose:819.25,dividendYield:.64,sector:"Healthcare",updatedAt:"1m ago"},
{symbol:"VOO",company:"Vanguard S&P 500 ETF",shares:23,averageCost:438.12,currentPrice:547.83,previousClose:544.21,dividendYield:1.23,sector:"Financials",updatedAt:"2m ago"},
{symbol:"BTC",company:"Bitcoin",shares:.082,averageCost:61200,currentPrice:104350,previousClose:101900,dividendYield:0,sector:"Crypto / Bitcoin",updatedAt:"Just now"}
];
export const transactions:Transaction[]=[
{id:"1",symbol:"NVDA",type:"buy",quantity:20,price:78.5,amount:1570,date:"2024-03-12",fees:0},
{id:"2",symbol:"NVDA",type:"buy",quantity:22,price:102.82,amount:2262.04,date:"2024-08-05",fees:0},
{id:"3",symbol:"AAPL",type:"buy",quantity:36,price:176.10,amount:6339.6,date:"2024-04-22",fees:0},
{id:"4",symbol:"TSLA",type:"buy",quantity:20,price:182,amount:3640,date:"2024-01-10",fees:0},
{id:"5",symbol:"TSLA",type:"sell",quantity:20,price:238,amount:4760,date:"2024-11-15",fees:0},
{id:"6",symbol:"AAPL",type:"dividend",amount:9,date:"2025-02-14",fees:0}
];
export const performance:PerformancePoint[]=Array.from({length:120},(_,i)=>{const drift=i*155;const wave=Math.sin(i/8)*1250;const value=72500+drift+wave+(i>84?2800:0);const prior=i?72500+(i-1)*155+Math.sin((i-1)/8)*1250:72500;return{date:new Date(2025,0,i+1).toISOString().slice(0,10),value,dailyReturn:value-prior,percent:((value-prior)/prior)*100}});
export const watchlist=[{symbol:"AMZN",price:221.30,change:1.82,marketCap:"$2.33T",pe:36.1,earnings:"Feb 6"},{symbol:"META",price:612.77,change:-.74,marketCap:"$1.55T",pe:28.4,earnings:"Jan 29"},{symbol:"AVGO",price:223.54,change:2.91,marketCap:"$1.05T",pe:31.8,earnings:"Mar 6"},{symbol:"COST",price:991.22,change:.46,marketCap:"$440B",pe:58.7,earnings:"Mar 6"}];
