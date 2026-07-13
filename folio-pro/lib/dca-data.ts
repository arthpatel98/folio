export type NumericValue = number | "";
export type DcaLot = {
  amount: number;
  shares: NumericValue;
  price: NumericValue;
  date: string;
  note?: string;
  future?: boolean;
};
export type DcaPosition = {
  id: string;
  symbol: string;
  label?: string;
  sellPrice: NumericValue;
  lots: DcaLot[];
  custom?: boolean;
  portfolioId?: "robinhood" | "fidelity-401k" | "fidelity-roth";
};

export const builtInDcaPositions: DcaPosition[] = [
  { id:"AMZN", symbol:"AMZN", sellPrice:257.20, portfolioId:"robinhood", lots:[
    {amount:1800,shares:7,price:257.14,date:"2026-05-19"},
    {amount:1919,shares:8,price:239.93,date:"2026-06-10"},
    {amount:1886,shares:8,price:235.70,date:"2026-06-11"},
    {amount:1178.50,shares:5,price:235.70,date:"Future",future:true},
  ]},
  { id:"PLTR", symbol:"PLTR", sellPrice:136, portfolioId:"robinhood", lots:[
    {amount:1791,shares:14,price:127.90,date:"2026-06-18"},{amount:1694,shares:15,price:112.90,date:"2026-06-24"},
  ]},
  { id:"ONDS-A", symbol:"ONDS", label:"ONDS", sellPrice:9.71, portfolioId:"robinhood", lots:[
    {amount:2027,shares:210,price:9.65,date:"2026-06-09"},{amount:1748,shares:190,price:9.20,date:"2026-06-12"},{amount:1215,shares:150,price:8.10,date:"2026-06-24"},
  ]},
  { id:"ROBN", symbol:"ROBN", sellPrice:46.10, portfolioId:"robinhood", lots:[
    {amount:4000,shares:78.32816,price:51.07,date:"2026-01-15",note:"Jul 17 CC"},{amount:851.49,shares:21.67184,price:39.28,date:"2026-07-07"},
  ]},
  { id:"IREN", symbol:"IREN", sellPrice:45, portfolioId:"robinhood", lots:[
    {amount:2754,shares:44,price:62.59,date:"2025-10-28"},{amount:543,shares:11,price:49.38,date:"2025-11-19"},{amount:1064,shares:20,price:53.19,date:"2026-06-23"},{amount:1287,shares:25,price:51.47,date:"2026-06-24"},
  ]},
  { id:"IBIT", symbol:"IBIT", sellPrice:38.66, portfolioId:"robinhood", lots:[
    {amount:3000,shares:49.57449,price:60.52,date:"2025-10-30"},{amount:3000,shares:52.26026,price:57.41,date:"2025-11-04"},{amount:1130,shares:20.16526,price:56.03,date:"2025-11-13"},{amount:3605,shares:100,price:36.05,date:"2026-06-11"},
  ]},
  { id:"FPS", symbol:"FPS", sellPrice:61.10, portfolioId:"robinhood", lots:[
    {amount:1571,shares:25,price:62.82,date:"2026-06-22"},{amount:1284,shares:22,price:58.35,date:"2026-06-25"},{amount:940,shares:17,price:55.30,date:"2026-06-26"},{amount:1103,shares:21,price:52.50,date:"2026-07-01"},{amount:694,shares:15,price:46.28,date:"2026-07-02"},
  ]},
  { id:"ONDS-B", symbol:"ONDS", label:"ONDS · Jul 24 CC", sellPrice:9.16, portfolioId:"fidelity-401k", lots:[
    {amount:1770,shares:200,price:8.85,date:"2026-06-23",note:"Jul 24 CC"},{amount:1540,shares:200,price:7.70,date:"2026-07-02"},
  ]},
  { id:"DRAM", symbol:"DRAM", sellPrice:69.30, portfolioId:"robinhood", lots:[{amount:1668,shares:25,price:66.70,date:"2026-06-29"},{amount:1232,shares:20,price:61.60,date:"2026-07-02"}]},
  { id:"NBIS", symbol:"NBIS", sellPrice:225, portfolioId:"robinhood", lots:[{amount:1643,shares:7,price:234.69,date:"2026-07-01"},{amount:1050,shares:5,price:209.98,date:"2026-07-02"},{amount:1171,shares:6,price:195.20,date:"2026-07-07"}]},
  { id:"SITM", symbol:"SITM", sellPrice:670, portfolioId:"robinhood", lots:[{amount:1214,shares:2,price:606.77,date:"2026-07-02"}]},
];
