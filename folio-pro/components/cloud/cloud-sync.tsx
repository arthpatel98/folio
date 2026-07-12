"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCloudState, readLocalFolioState, uploadLocalState, writeLocalFolioState } from "@/lib/cloud-state";

const RESTORE_MARKER = "folio-cloud-restored-session";

export function CloudSync() {
  const lastSnapshot = useRef("");
  const ready = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const start = async () => {
      try {
        const cloud = await getCloudState();
        if (cancelled || !cloud.user) return;

        if (cloud.payload && sessionStorage.getItem(RESTORE_MARKER) !== cloud.user.id) {
          writeLocalFolioState(cloud.payload);
          sessionStorage.setItem(RESTORE_MARKER, cloud.user.id);
          location.reload();
          return;
        }

        lastSnapshot.current = JSON.stringify(readLocalFolioState());
        ready.current = Boolean(cloud.payload);
        timer = setInterval(async () => {
          if (!ready.current) return;
          const next = JSON.stringify(readLocalFolioState());
          if (next === lastSnapshot.current) return;
          try {
            await uploadLocalState();
            lastSnapshot.current = next;
          } catch (error) {
            console.error("Folio cloud sync failed", error);
          }
        }, 2000);
      } catch (error) {
        console.error("Folio cloud initialization failed", error);
      }
    };

    start();
    const supabase = createClient();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      // Supabase emits INITIAL_SESSION and TOKEN_REFRESHED during normal page loads.
      // Clearing the marker for those events causes an infinite refresh loop.
      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem(RESTORE_MARKER);
      }
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      listener.subscription.unsubscribe();
    };
  }, []);

  return null;
}
