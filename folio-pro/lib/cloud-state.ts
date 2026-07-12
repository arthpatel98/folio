import { createClient } from "@/lib/supabase/client";

export const CLOUD_KEYS = [
  "folio-pro-portfolio",
  "folio-realized-positions-v4",
  "folio-active-portfolio",
  "folio-column-widths-stock",
  "folio-column-widths-option",
] as const;

export type CloudPayload = Record<string, string>;

export function readLocalFolioState(): CloudPayload {
  const payload: CloudPayload = {};
  for (const key of CLOUD_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value !== null) payload[key] = value;
  }
  return payload;
}

export function writeLocalFolioState(payload: CloudPayload) {
  for (const key of CLOUD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      window.localStorage.setItem(key, payload[key]);
    }
  }
}

export async function getCloudState() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return { user: null, payload: null as CloudPayload | null, updatedAt: null as string | null };
  const { data, error } = await supabase
    .from("user_app_state")
    .select("payload,updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return { user, payload: (data?.payload as CloudPayload | null) ?? null, updatedAt: data?.updated_at ?? null };
}

export async function uploadLocalState() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in before uploading portfolio data to the cloud.");
  const payload = readLocalFolioState();
  const { error } = await supabase.from("user_app_state").upsert({
    user_id: user.id,
    payload,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
  return payload;
}

export async function downloadCloudState() {
  const state = await getCloudState();
  if (!state.user) throw new Error("Sign in before downloading cloud data.");
  if (!state.payload) throw new Error("No cloud portfolio backup exists yet.");
  writeLocalFolioState(state.payload);
  return state.payload;
}
