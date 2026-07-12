"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudDownload, CloudUpload, LogIn, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { downloadCloudState, getCloudState, uploadLocalState } from "@/lib/cloud-state";
import { toast } from "sonner";

type CloudStatus = { email: string | null; hasCloudData: boolean; updatedAt: string | null };

export default function Page() {
  const [status, setStatus] = useState<CloudStatus>({ email: null, hasCloudData: false, updatedAt: null });
  const [busy, setBusy] = useState(false);

  const refreshStatus = async () => {
    try {
      const state = await getCloudState();
      setStatus({ email: state.user?.email ?? null, hasCloudData: Boolean(state.payload), updatedAt: state.updatedAt });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not check cloud status.");
    }
  };

  useEffect(() => { refreshStatus(); }, []);

  const upload = async () => {
    if (!confirm("Upload this browser's Folio data to Supabase? This will replace the current cloud copy.")) return;
    setBusy(true);
    try {
      await uploadLocalState();
      await refreshStatus();
      toast.success("This browser's portfolio data is now in Supabase. Future changes will sync automatically.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Cloud upload failed."); }
    finally { setBusy(false); }
  };

  const download = async () => {
    if (!confirm("Replace this browser's Folio data with the cloud copy?")) return;
    setBusy(true);
    try {
      await downloadCloudState();
      toast.success("Cloud data restored. Reloading Folio...");
      setTimeout(() => location.reload(), 400);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Cloud download failed."); setBusy(false); }
  };

  const signOut = async () => {
    await createClient().auth.signOut();
    sessionStorage.removeItem("folio-cloud-restored-session");
    location.href = "/login";
  };

  return <div>
    <h1 className="text-3xl font-semibold">Settings</h1>
    <p className="mt-1 text-sm text-zinc-500">Profile, cloud sync, market data and portfolio integrations.</p>
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <Card className="p-5">
        <h2 className="font-medium">Profile</h2>
        <div className="mt-4 space-y-3"><Input defaultValue="Arth Patel"/><Input defaultValue={status.email ?? "arth@example.com"}/><Button>Save changes</Button></div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2"><Cloud className="size-5 text-emerald-400"/><h2 className="font-medium">Supabase Cloud Sync</h2></div>
        {status.email ? <>
          <p className="mt-3 text-sm text-zinc-400">Signed in as <span className="text-zinc-200">{status.email}</span>.</p>
          <p className="mt-1 text-sm text-zinc-500">{status.hasCloudData ? `Cloud data available${status.updatedAt ? ` · updated ${new Date(status.updatedAt).toLocaleString()}` : ""}.` : "No cloud copy exists yet. Upload your localhost data first."}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={upload} disabled={busy}><CloudUpload className="mr-2 size-4"/>Upload This Browser to Cloud</Button>
            <Button variant="outline" onClick={download} disabled={busy || !status.hasCloudData}><CloudDownload className="mr-2 size-4"/>Restore Cloud Data</Button>
            <Button variant="ghost" onClick={signOut}><LogOut className="mr-2 size-4"/>Sign out</Button>
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-600">After the first upload, holdings, transactions, cash, Realized P/L, active portfolio, and Holdings column widths sync automatically while you are signed in.</p>
        </> : <>
          <p className="mt-3 text-sm text-zinc-400">Sign in to use the same portfolio data on localhost, Vercel, and other devices.</p>
          <Button className="mt-4" onClick={() => location.href = "/login"}><LogIn className="mr-2 size-4"/>Sign in</Button>
        </>}
      </Card>

      <Card className="p-5"><h2 className="font-medium">Market data providers</h2><div className="mt-4 space-y-3">{["Polygon.io","Finnhub","Alpha Vantage","Twelve Data"].map(x=><div key={x} className="flex items-center justify-between rounded-xl border p-3"><span className="text-sm">{x}</span><Button variant="outline" size="sm">Connect</Button></div>)}</div></Card>
      <Card className="p-5"><h2 className="font-medium">Broker connections</h2><p className="mt-1 text-sm text-zinc-500">Use aggregator or broker-supported OAuth APIs in production. Never collect brokerage passwords directly.</p><div className="mt-4 flex flex-wrap gap-2">{["Robinhood","Charles Schwab","Fidelity","Interactive Brokers","CSV import"].map(x=><Button key={x} variant="outline">{x}</Button>)}</div></Card>
    </div>
  </div>;
}
