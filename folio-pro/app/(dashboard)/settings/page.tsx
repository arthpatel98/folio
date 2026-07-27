"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudDownload, CloudUpload, LogIn, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { downloadCloudState, getCloudState, summarizeCloudPayload, uploadLocalState } from "@/lib/cloud-state";
import { toast } from "sonner";

type CloudStatus = { email: string | null; hasCloudData: boolean; updatedAt: string | null; robinhoodHoldings: number; rothHoldings: number; k401Holdings: number };

export default function Page() {
  const [status, setStatus] = useState<CloudStatus>({ email: null, hasCloudData: false, updatedAt: null, robinhoodHoldings: 0, rothHoldings: 0, k401Holdings: 0 });
  const [busy, setBusy] = useState(false);

  const refreshStatus = async () => {
    try {
      const state = await getCloudState();
      const summary = summarizeCloudPayload(state.payload);
      setStatus({ email: state.user?.email ?? null, hasCloudData: Boolean(state.payload), updatedAt: state.updatedAt, robinhoodHoldings: summary.robinhoodHoldings, rothHoldings: summary.rothHoldings, k401Holdings: summary.k401Holdings });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not check cloud status.");
    }
  };

  useEffect(() => { refreshStatus(); }, []);

  const upload = async () => {
    if (!confirm("Emergency replace: overwrite the Supabase master copy with this browser's current Folio data? Only continue if you are certain this browser has the correct data.")) return;
    setBusy(true);
    try {
      await uploadLocalState({ force: true });
      await refreshStatus();
      toast.success("Supabase master data was replaced with this browser's current Folio data.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Cloud upload failed."); }
    finally { setBusy(false); }
  };

  const download = async () => {
    if (!confirm("Restore the Supabase master copy to this browser? Managed local Folio data will be replaced.")) return;
    setBusy(true);
    try {
      await downloadCloudState();
      toast.success("Cloud data restored. Reloading Folio...");
      setTimeout(() => location.reload(), 400);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Cloud download failed."); setBusy(false); }
  };

  const signOut = async () => {
    await createClient().auth.signOut();
    location.href = "/login";
  };

  return <div>
    <h1 className="text-3xl font-semibold">Settings</h1>
    <p className="mt-1 text-sm text-zinc-500">Manage Cloud Sync And Sign-In Settings.</p>
    <div className="mt-6 max-w-3xl">
      <Card className="p-5">
        <div className="flex items-center gap-2"><Cloud className="size-5 text-emerald-400"/><h2 className="font-medium">Supabase Cloud Sync</h2></div>
        {status.email ? <>
          <p className="mt-3 text-sm text-zinc-400">Signed in as <span className="text-zinc-200">{status.email}</span>.</p>
          <p className="mt-1 text-sm text-zinc-500">{status.hasCloudData ? `Supabase master data available${status.updatedAt ? ` · last saved ${new Date(status.updatedAt).toLocaleString()}` : ""}.` : "No cloud row exists yet. Folio will create it automatically from this device."}</p>
          {status.hasCloudData && <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/[.02] px-3 py-2"><div className="text-xs text-zinc-500">Robinhood</div><div className="mt-1 text-sm font-medium text-zinc-200">{status.robinhoodHoldings} Holdings</div></div>
            <div className="rounded-lg border border-white/10 bg-white/[.02] px-3 py-2"><div className="text-xs text-zinc-500">Fidelity Roth IRA</div><div className="mt-1 text-sm font-medium text-zinc-200">{status.rothHoldings} Holdings</div></div>
            <div className="rounded-lg border border-white/10 bg-white/[.02] px-3 py-2"><div className="text-xs text-zinc-500">Fidelity 401(k)</div><div className="mt-1 text-sm font-medium text-zinc-200">{status.k401Holdings} Holdings</div></div>
          </div>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={download} disabled={busy || !status.hasCloudData}><CloudDownload className="mr-2 size-4"/>Restore Supabase Master</Button>
            <Button variant="outline" onClick={upload} disabled={busy}><CloudUpload className="mr-2 size-4"/>Emergency Replace Cloud</Button>
            <Button variant="ghost" onClick={signOut}><LogOut className="mr-2 size-4"/>Sign out</Button>
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-500"><span className="font-medium text-emerald-400">Supabase is the source of truth.</span> On login or refresh, the cloud snapshot replaces the managed browser cache. Changes made after loading are saved back to Supabase automatically, and newer updates from another device are pulled down when this device has no pending edit.</p>
        </> : <>
          <p className="mt-3 text-sm text-zinc-400">Sign in to use the same portfolio data on localhost, Vercel, and other devices.</p>
          <Button className="mt-4" onClick={() => location.href = "/login"}><LogIn className="mr-2 size-4"/>Sign in</Button>
        </>}
      </Card>

    </div>
  </div>;
}
