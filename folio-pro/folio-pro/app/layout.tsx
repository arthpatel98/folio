import "./globals.css"; import type {Metadata} from "next"; import {ThemeProvider} from "@/components/providers/theme-provider"; import {Toaster} from "sonner";
export const metadata:Metadata={title:"Arth’s Portfolios",description:"Premium portfolio analytics",icons:{icon:"/finance-logo.png",apple:"/finance-logo.png"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body className="font-sans"><ThemeProvider>{children}<Toaster richColors/></ThemeProvider></body></html>}
