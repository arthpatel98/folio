import type { DataPortfolioId } from "@/store/portfolio-store";

// Names recovered from Folio's bundled historical closed-position data. Runtime
// holdings/transactions are layered on top of this list by the Holdings dialogs.
const historicalCompanyNames: Record<DataPortfolioId, Record<string, string>> = {
  robinhood: {},
  "fidelity-401k": {},
  "fidelity-roth": {
    CIFR: "Cipher Digital Inc.",
    CRCL: "Circle Internet Group Inc.",
    CRDO: "Credo Technology Group Holding Ltd.",
    HIMZ: "Defiance Daily Target 2X Long HIMS ETF",
    HOOD: "Robinhood Markets Inc.",
    IREN: "IREN Limited",
    MAGS: "Roundhill Magnificent Seven ETF",
    MMYT: "MakeMyTrip Ltd.",
    MSTZ: "T-Rex 2X Inverse MSTR Daily Target ETF",
    NBIS: "Nebius Group N.V.",
    NEBX: "Tradr 2X Long NBIS Daily ETF",
    NVDX: "T-Rex 2X Long NVIDIA Daily Target ETF",
    OKLO: "Oklo Inc.",
    ONDS: "Ondas Holdings Inc.",
    PLTU: "Direxion Daily PLTR Bull 2X Shares",
    RDDT: "Reddit Inc.",
    ROBN: "T-Rex 2X Long HOOD Daily Target ETF",
    SOXS: "Direxion Daily Semiconductor Bear 3X Shares",
    VST: "Vistra Corp.",
    VSTL: "Defiance Daily Target 2X Long VST ETF",
  },
};

export function getBundledHistoricalCompanyNames(portfolioId: DataPortfolioId) {
  return historicalCompanyNames[portfolioId];
}
