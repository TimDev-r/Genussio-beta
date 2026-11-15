import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { readAttribution } from "@/lib/attribution";
import { isLocale, type Locale } from "@/i18n";
import { trackEvent } from "@/lib/track-event";
import { metaTrack } from "@/lib/consent";

export async function ensureProfile(user: User, locale: Locale) {
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("id,locale,display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (readError) throw readError;
  if (existing) return existing;
  const a = readAttribution();
  const method = user.app_metadata["provider"] === "google" ? "google" : "email";
  const activeLocale =
    isLocale(user.user_metadata["locale"]) && method === "email"
      ? user.user_metadata["locale"]
      : locale;
  const displayName = user.user_metadata["full_name"] ?? user.user_metadata["name"] ?? null;
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        display_name: typeof displayName === "string" ? displayName : null,
        beta_code: a.code ?? null,
        utm_source: a.utm_source ?? null,
        utm_medium: a.utm_medium ?? null,
        utm_campaign: a.utm_campaign ?? null,
        signup_source: a.utm_source ? "ads" : "einladung",
        locale: activeLocale,
      },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select("id,locale,display_name")
    .maybeSingle();
  if (error) throw error;
  if (data) {
    if (method === "google") {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { locale: activeLocale },
      });
      if (metadataError) throw metadataError;
    }
    await trackEvent("signed_up", { method });
    metaTrack("Lead");
    return data;
  }
  const { data: winner, error: winnerError } = await supabase
    .from("profiles")
    .select("id,locale,display_name")
    .eq("id", user.id)
    .single();
  if (winnerError) throw winnerError;
  return winner;
}
