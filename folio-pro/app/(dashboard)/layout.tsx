import {Sidebar} from "@/components/layout/sidebar";
import {Topbar} from "@/components/layout/topbar";
import {MobileNav} from "@/components/layout/mobile-nav";
import {PortfolioProvider} from "@/components/portfolio/portfolio-context";
import {PortfolioGate} from "@/components/portfolio/portfolio-gate";
import {CloudSync} from "@/components/cloud/cloud-sync";

export default function DashboardLayout({children}:{children:React.ReactNode}){
  return <PortfolioProvider><CloudSync/><Sidebar/><div className="min-h-screen lg:pl-72"><Topbar/><main className="mx-auto max-w-[1600px] px-3 py-4 pb-20 sm:px-4 md:p-7"><PortfolioGate>{children}</PortfolioGate></main></div><MobileNav/></PortfolioProvider>
}
