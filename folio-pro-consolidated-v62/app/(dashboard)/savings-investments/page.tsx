import { redirect } from "next/navigation";

// Portfolio Performance is intentionally hidden from the UI.
// Its preserved implementation/data can be restored from project history as HIDDEN.
export default function PortfolioPerformanceHiddenPage() {
  redirect("/holdings");
}
