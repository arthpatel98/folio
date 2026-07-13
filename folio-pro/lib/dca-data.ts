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
};

export const builtInDcaPositions: DcaPosition[] = [
  { id:"AMZN", symbol:"AMZN", sellPrice:257.20, lots:[
    {amount:1800,shares:7,price:257.14,date:"May 19, 2026"},
    {amount:1919,shares:8,price:239.93,date:"Jun 10, 2026"},
    {amount:1886,shares:8,price:235.70,date:"Jun 11, 2026"},
    {amount:1178.50,shares:5,price:235.70,date:"Future",future:true},
  ]},
  { id:"PLTR", symbol:"PLTR", sellPrice:136, lots:[
    {amount:1791,shares:14,price:127.90,date:"Jun 18, 2026"},{amount:1694,shares:15,price:112.90,date:"Jun 24, 2026"},
  ]},
  { id:"ONDS-A", symbol:"ONDS", label:"ONDS", sellPrice:9.71, lots:[
    {amount:2027,shares:210,price:9.65,date:"Jun 9, 2026"},{amount:1748,shares:190,price:9.20,date:"Jun 12, 2026"},{amount:1215,shares:150,price:8.10,date:"Jun 24, 2026"},
  ]},
  { id:"ROBN", symbol:"ROBN", sellPrice:46.10, lots:[
    {amount:4000,shares:78.32816,price:51.07,date:"Jan 15, 2026",note:"Jul 17 CC"},{amount:851.49,shares:21.67184,price:39.28,date:"Jul 7, 2026"},
  ]},
  { id:"IREN", symbol:"IREN", sellPrice:45, lots:[
    {amount:2754,shares:44,price:62.59,date:"Oct 28, 2025"},{amount:543,shares:11,price:49.38,date:"Nov 19, 2025"},{amount:1064,shares:20,price:53.19,date:"Jun 23, 2026"},{amount:1287,shares:25,price:51.47,date:"Jun 24, 2026"},
  ]},
  { id:"IBIT", symbol:"IBIT", sellPrice:38.66, lots:[
    {amount:3000,shares:49.57449,price:60.52,date:"Oct 30, 2025"},{amount:3000,shares:52.26026,price:57.41,date:"Nov 4, 2025"},{amount:1130,shares:20.16526,price:56.03,date:"Nov 13, 2025"},{amount:3605,shares:100,price:36.05,date:"Jun 11, 2026"},
  ]},
  { id:"FPS", symbol:"FPS", sellPrice:61.10, lots:[
    {amount:1571,shares:25,price:62.82,date:"Jun 22, 2026"},{amount:1284,shares:22,price:58.35,date:"Jun 25, 2026"},{amount:940,shares:17,price:55.30,date:"Jun 26, 2026"},{amount:1103,shares:21,price:52.50,date:"Jul 1, 2026"},{amount:694,shares:15,price:46.28,date:"Jul 2, 2026"},
  ]},
  { id:"ONDS-B", symbol:"ONDS", label:"ONDS · Jul 24 CC", sellPrice:9.16, lots:[
    {amount:1770,shares:200,price:8.85,date:"Jun 23, 2026",note:"Jul 24 CC"},{amount:1540,shares:200,price:7.70,date:"Jul 2, 2026"},
  ]},
  { id:"DRAM", symbol:"DRAM", sellPrice:69.30, lots:[{amount:1668,shares:25,price:66.70,date:"Jun 29, 2026"},{amount:1232,shares:20,price:61.60,date:"Jul 2, 2026"}]},
  { id:"NBIS", symbol:"NBIS", sellPrice:225, lots:[{amount:1643,shares:7,price:234.69,date:"Jul 1, 2026"},{amount:1050,shares:5,price:209.98,date:"Jul 2, 2026"},{amount:1171,shares:6,price:195.20,date:"Jul 7, 2026"}]},
  { id:"SITM", symbol:"SITM", sellPrice:670, lots:[{amount:1214,shares:2,price:606.77,date:"Jul 2, 2026"}]},
];
