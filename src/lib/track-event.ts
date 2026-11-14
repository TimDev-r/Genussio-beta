import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export async function trackEvent(
  name: string,
  props: Record<string, Json | undefined> = {},
  householdId?: string,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("events")
    .insert({ name, props, user_id: user.id, household_id: householdId ?? null });
  if (error) console.warn("Event could not be saved", error.code);
}
