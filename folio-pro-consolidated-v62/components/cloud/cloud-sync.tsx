"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { establishCloudAuthority, getCloudState, hasCloudAuthorityMarker, readLocalFolioState, uploadLocalState, writeLocalFolioState } from "@/lib/cloud-state";
import { usePortfolioStore } from "@/store/portfolio-store";

const SYNC_INTERVAL_MS = 2000;
const REMOTE_CHECK_EVERY_TICKS = 5;

/**
 * Supabase is the source of truth whenever a user is signed in.
 *
 * Startup:
 * - Existing cloud row -> replace all managed browser cache keys with cloud state.
 * - No cloud row -> seed Supabase once from the current browser, then cloud becomes authoritative.
 *
 * Runtime:
 * - Local edits are pushed only after authoritative startup has completed.
 * - When this device has no pending local edit, a newer remote snapshot is pulled down.
 */
export function CloudSync() {
  const hasHydrated = usePortfolioStore((state) => state.hasHydrated);
  const setCloudReady = usePortfolioStore((state) => state.setCloudReady);
  const lastSnapshot = useRef("");
  const lastCloudUpdatedAt = useRef<string | null>(null);
  const ready = useRef(false);
  const inFlight = useRef(false);
  const tick = useRef(0);

  useEffect(() => {
    if (!hasHydrated) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const rehydrateLiveStore = async () => {
      await usePortfolioStore.persist.rehydrate();
    };

    const applyAuthoritativeCloud = async (payload: Record<string, string>) => {
      writeLocalFolioState(payload, { authoritative: true });
      await rehydrateLiveStore();
      lastSnapshot.current = JSON.stringify(readLocalFolioState());
    };

    const start = async () => {
      try {
        const cloud = await getCloudState();
        if (cancelled) return;

        if (!cloud.user) {
          ready.current = false;
          setCloudReady(true);
          return;
        }

        if (cloud.payload && hasCloudAuthorityMarker(cloud.payload)) {
          // After the one-time upgrade, an existing Supabase snapshot always wins startup.
          await applyAuthoritativeCloud(cloud.payload);
          lastCloudUpdatedAt.current = cloud.updatedAt;
        } else {
          // One-time safe cutover from the older browser-first model (or first cloud creation).
          // This preserves current data before making Supabase authoritative permanently.
          await establishCloudAuthority(cloud.payload);
          await rehydrateLiveStore();
          lastSnapshot.current = JSON.stringify(readLocalFolioState());
          const refreshed = await getCloudState();
          lastCloudUpdatedAt.current = refreshed.updatedAt;
        }

        ready.current = true;
        setCloudReady(true);

        timer = setInterval(async () => {
          if (!ready.current || inFlight.current || cancelled) return;
          inFlight.current = true;
          try {
            const localPayload = readLocalFolioState();
            const nextSnapshot = JSON.stringify(localPayload);

            if (nextSnapshot !== lastSnapshot.current) {
              // A local user edit occurred after authoritative startup. Push it safely.
              const uploaded = await uploadLocalState();
              lastSnapshot.current = JSON.stringify(readLocalFolioState());
              const refreshed = await getCloudState();
              lastCloudUpdatedAt.current = refreshed.updatedAt;
              return;
            }

            tick.current += 1;
            if (tick.current % REMOTE_CHECK_EVERY_TICKS !== 0) return;

            // No pending local change: check whether another device wrote a newer cloud snapshot.
            const remote = await getCloudState();
            if (!remote.user || !remote.payload) return;
            // A user edit may have happened while the remote request was in flight. Never pull
            // over it; the next interval will push that local edit first.
            if (JSON.stringify(readLocalFolioState()) !== lastSnapshot.current) return;
            if (remote.updatedAt && remote.updatedAt !== lastCloudUpdatedAt.current) {
              await applyAuthoritativeCloud(remote.payload);
              lastCloudUpdatedAt.current = remote.updatedAt;
            }
          } catch (error) {
            console.error("Folio cloud sync failed", error);
          } finally {
            inFlight.current = false;
          }
        }, SYNC_INTERVAL_MS);
      } catch (error) {
        console.error("Folio cloud initialization failed", error);
        if (!cancelled) setCloudReady(true);
      }
    };

    void start();

    const supabase = createClient();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        ready.current = false;
        lastSnapshot.current = "";
        lastCloudUpdatedAt.current = null;
      }
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      listener.subscription.unsubscribe();
    };
  }, [hasHydrated, setCloudReady]);

  return null;
}
