import {PortfolioProvider} from "@/components/portfolio/portfolio-context";
import {CloudSync} from "@/components/cloud/cloud-sync";
import {DashboardShell} from "@/components/layout/dashboard-shell";

export default function DashboardLayout({children}:{children:React.ReactNode}){
  return <PortfolioProvider><CloudSync/><DashboardShell>{children}</DashboardShell></PortfolioProvider>
}
