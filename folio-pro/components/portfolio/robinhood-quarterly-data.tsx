"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { quarterlyIncome } from "@/lib/savings-investments-data";
import { cn, money } from "@/lib/utils";

type ProfitDrilldownTransaction = {
  id: string; date: string; ticker: string; label: string; quantity: number | null; price: number | null;
  proceeds: number | null; realizedProfit: number; category: "Sell Call" | "Sell Put" | "Buy Call" | "Buy Put" | "Common Stocks";
  preserveLabelCasing?: boolean;
};
type VerifiedProfitEdit = Partial<ProfitDrilldownTransaction> & { deleted?: boolean };
type VerifiedProfitEdits = Record<string, VerifiedProfitEdit>;
const VERIFIED_PROFIT_EDITS_KEY = "folio-robinhood-verified-profit-edits-v1";

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


const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const wholeDollar=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0,maximumFractionDigits:0}).format(Math.round(value));
const chartAxisValue=(value:number)=>new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(Math.round(value));
const periodTime=(period:string)=>{const m=period.match(/^([A-Z][a-z]{2}) (20\d{2})$/);return m?new Date(Number(m[2]),months.indexOf(m[1]),1).getTime():0;};

export function RobinhoodQuarterlyData() {
  const [selectedYear,setSelectedYear]=useState("2026");
  const [view,setView]=useState<"month"|"year">("month");
  const [selectedPeriod,setSelectedPeriod]=useState<string|null>(null);
  const [edits,setEdits]=useState<VerifiedProfitEdits>({});
  useEffect(()=>{try{const raw=window.localStorage.getItem(VERIFIED_PROFIT_EDITS_KEY);if(raw)setEdits(JSON.parse(raw));}catch{}},[]);
  const saveEdit=(id:string,patch:VerifiedProfitEdit)=>setEdits(current=>{const next={...current,[id]:{...(current[id]??{}),...patch}};try{window.localStorage.setItem(VERIFIED_PROFIT_EDITS_KEY,JSON.stringify(next));}catch{}return next;});
  const transactionsByPeriod=useMemo(()=>{
    const out:Record<string,ProfitDrilldownTransaction[]>={};
    Object.values(ROBINHOOD_VERIFIED_CLOSE_DATE_TRANSACTIONS).flat().forEach(tx=>{
      const patch=edits[tx.id]??{}; if(patch.deleted)return; const edited={...tx,...patch};
      const d=new Date(`${edited.date}T12:00:00`); if(Number.isNaN(d.getTime()))return;
      const period=new Intl.DateTimeFormat("en-US",{month:"short",year:"numeric"}).format(d);
      (out[period]??=[]).push(edited);
    }); return out;
  },[edits]);
  const verifiedTotals=useMemo(()=>Object.fromEntries(Object.entries(transactionsByPeriod).map(([p,txs])=>[p,txs.reduce((s,t)=>s+t.realizedProfit,0)])),[transactionsByPeriod]);
  const monthlyData=useMemo(()=>{
    const rows=quarterlyIncome.filter(row=>!/^Q[1-4] 2025$/.test(row.period)).map(row=>({period:row.period,realizedProfit:verifiedTotals[row.period]??row.robinhoodProfit,income:row.robinhoodIncome}));
    Object.entries(verifiedTotals).forEach(([period,realizedProfit])=>{const existing=rows.find(r=>r.period===period);if(existing)existing.realizedProfit=realizedProfit;else rows.push({period,realizedProfit,income:0});});
    return rows.filter(r=>r.period.match(/(20\d{2})/)?.[1]===selectedYear && !/^Q/.test(r.period)).sort((a,b)=>periodTime(a.period)-periodTime(b.period));
  },[selectedYear,verifiedTotals]);
  const annualData=useMemo(()=>{const m=new Map<string,{period:string;realizedProfit:number;income:number}>();
    const source=quarterlyIncome.filter(row=>!/^Q[1-4] 2025$/.test(row.period)).map(row=>({period:row.period,realizedProfit:verifiedTotals[row.period]??row.robinhoodProfit,income:row.robinhoodIncome}));
    Object.entries(verifiedTotals).forEach(([period,realizedProfit])=>{const e=source.find(r=>r.period===period);if(e)e.realizedProfit=realizedProfit;else source.push({period,realizedProfit,income:0});});
    source.forEach(r=>{const y=r.period.match(/(20\d{2})/)?.[1];if(!y)return;const cur=m.get(y)??{period:y,realizedProfit:0,income:0};cur.realizedProfit+=r.realizedProfit;cur.income+=r.income;m.set(y,cur);});return Array.from(m.values()).sort((a,b)=>a.period.localeCompare(b.period));},[verifiedTotals]);
  const data=view==="year"?annualData:monthlyData;
  const selectedTransactions=selectedPeriod?transactionsByPeriod[selectedPeriod]??[]:[];
  const total=selectedTransactions.reduce((s,t)=>s+t.realizedProfit,0);
  const available=Object.keys(transactionsByPeriod).sort((a,b)=>periodTime(a)-periodTime(b));
  const idx=selectedPeriod?available.indexOf(selectedPeriod):-1;
  const prev=idx>0?available[idx-1]:null, next=idx>=0&&idx<available.length-1?available[idx+1]:null;
  const open=(period:string)=>{if(view==="year"){setSelectedYear(period);setView("month");return;}if(transactionsByPeriod[period])setSelectedPeriod(period);};
  return <>
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-zinc-200/70 dark:border-white/[.06]">
        <div><h2 className="font-medium">Robinhood Quarterly Data</h2><p className="mt-1 text-xs text-zinc-500">Profit Vs Dividend, Interest & Bonus</p></div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="inline-flex h-9 overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10">{(["month","year"] as const).map(v=><button key={v} type="button" onClick={()=>setView(v)} className={cn("px-3 text-xs font-semibold capitalize transition",view===v?"bg-emerald-500 text-zinc-950":"text-zinc-500 hover:text-zinc-200")}>{v}</button>)}</div>
          {view!=="year"&&<select value={selectedYear} onChange={e=>setSelectedYear(e.target.value)} className="h-9 rounded-xl border border-zinc-200 bg-transparent px-3 text-sm font-medium outline-none dark:border-white/10 dark:bg-zinc-950">{["2026","2025","2024"].map(y=><option key={y}>{y}</option>)}</select>}
        </div>
      </CardHeader>
      <CardContent className="pt-5"><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} barGap={6} barCategoryGap="22%" margin={{left:4,right:12,top:28,bottom:4}}>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(161,161,170,.13)"/><XAxis dataKey="period" tick={{fill:"#a1a1aa",fontSize:10}} axisLine={false} tickLine={false} interval={0}/><YAxis tick={{fill:"#71717a",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={chartAxisValue}/>
        <Tooltip formatter={(value:any)=>money(Number(value))} contentStyle={{background:"#18181b",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,color:"#f4f4f5"}}/><Legend wrapperStyle={{fontSize:12,paddingTop:14}} iconType="circle"/>
        <Bar dataKey="realizedProfit" name="Profit" radius={[7,7,2,2]} maxBarSize={34} onClick={(entry:any)=>open(entry?.period)} style={{cursor:"pointer"}}>{data.map(row=><Cell key={`p-${row.period}`} fill={row.realizedProfit<0?"#e11d48":"#10b981"}/>)}<LabelList dataKey="realizedProfit" position="top" formatter={(v:any)=>wholeDollar(Number(v))} fill="#e4e4e7" fontSize={11} fontWeight={700} stroke="#09090b" strokeWidth={2} paintOrder="stroke"/></Bar>
        <Bar dataKey="income" name="Dividend, Interest & Bonus" radius={[7,7,2,2]} maxBarSize={34}>{data.map(row=><Cell key={`i-${row.period}`} fill={row.income<0?"#e11d48":"#3b82f6"}/>)}<LabelList dataKey="income" position="top" formatter={(v:any)=>wholeDollar(Number(v))} fill="#e4e4e7" fontSize={11} fontWeight={700} stroke="#09090b" strokeWidth={2} paintOrder="stroke"/></Bar>
      </BarChart></ResponsiveContainer></div></CardContent>
    </Card>
    {selectedPeriod&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onMouseDown={e=>{if(e.currentTarget===e.target)setSelectedPeriod(null)}}><div className="max-h-[88vh] w-full max-w-5xl overflow-auto rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-950 px-5 py-4"><div className="flex items-center gap-2">{prev&&<button onClick={()=>setSelectedPeriod(prev)} className="grid size-9 place-items-center rounded-lg border border-white/10"><ChevronLeft size={17}/></button>}<h3 className="text-lg font-semibold">{selectedPeriod} Details</h3>{next&&<button onClick={()=>setSelectedPeriod(next)} className="grid size-9 place-items-center rounded-lg border border-white/10"><ChevronRight size={17}/></button>}</div><button onClick={()=>setSelectedPeriod(null)} className="grid size-9 place-items-center rounded-lg border border-white/10"><X size={17}/></button></div>
      <div className="p-5"><div className="mb-5 rounded-xl border border-white/10 p-4"><div className="text-xs text-zinc-500">Total Profit</div><div className={cn("mt-1 text-2xl font-semibold",total>=0?"positive":"negative")}>{money(total)}</div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="border-y border-white/10 text-xs text-zinc-500"><tr><th className="px-3 py-3 text-left">Date</th><th className="px-3 py-3 text-left">Ticker</th><th className="px-3 py-3 text-left">Position</th><th className="px-3 py-3 text-left">Type</th><th className="px-3 py-3 text-right">Realized Profit</th><th className="px-3 py-3"></th></tr></thead><tbody>{selectedTransactions.slice().sort((a,b)=>b.realizedProfit-a.realizedProfit).map(tx=><EditableRow key={tx.id} tx={tx} onSave={patch=>saveEdit(tx.id,patch)}/>)}</tbody></table></div></div>
    </div></div>}
  </>;
}

function EditableRow({tx,onSave}:{tx:ProfitDrilldownTransaction;onSave:(patch:VerifiedProfitEdit)=>void}){
  const [editing,setEditing]=useState(false); const [draft,setDraft]=useState(tx);
  useEffect(()=>setDraft(tx),[tx]);
  if(!editing)return <tr className="border-b border-white/[.06]"><td className="px-3 py-3">{new Date(`${tx.date}T12:00:00`).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</td><td className="px-3 py-3 font-semibold">{tx.ticker}</td><td className="px-3 py-3">{tx.label}</td><td className="px-3 py-3">{tx.category}</td><td className={cn("px-3 py-3 text-right font-semibold",tx.realizedProfit>=0?"positive":"negative")}>{money(tx.realizedProfit)}</td><td className="px-3 py-3 text-right"><button onClick={()=>setEditing(true)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">Edit</button></td></tr>;
  return <tr className="border-b border-white/[.06]"><td className="px-2 py-2"><input type="date" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})} className="h-9 rounded-lg border border-white/10 bg-transparent px-2"/></td><td className="px-2 py-2"><input value={draft.ticker} onChange={e=>setDraft({...draft,ticker:e.target.value})} className="h-9 w-24 rounded-lg border border-white/10 bg-transparent px-2"/></td><td className="px-2 py-2"><input value={draft.label} onChange={e=>setDraft({...draft,label:e.target.value})} className="h-9 w-64 rounded-lg border border-white/10 bg-transparent px-2"/></td><td className="px-2 py-2"><select value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value as ProfitDrilldownTransaction["category"]})} className="h-9 rounded-lg border border-white/10 bg-zinc-950 px-2">{["Common Stocks","Sell Call","Sell Put","Buy Call","Buy Put"].map(x=><option key={x}>{x}</option>)}</select></td><td className="px-2 py-2"><input type="number" step="any" value={draft.realizedProfit} onChange={e=>setDraft({...draft,realizedProfit:Number(e.target.value)})} className="h-9 w-28 rounded-lg border border-white/10 bg-transparent px-2 text-right"/></td><td className="px-2 py-2 text-right"><div className="flex justify-end gap-2"><button onClick={()=>{onSave(draft);setEditing(false)}} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950">Save</button><button onClick={()=>setEditing(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">Cancel</button></div></td></tr>;
}
