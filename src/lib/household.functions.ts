import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { householdSchema, memberSchema } from "./household-rules";
import { LOCALES } from "@/i18n";

export const getHousehold = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (profileError) throw profileError;
    const { data: membership, error } = await context.supabase
      .from("household_members")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!membership) return { profile, membership: null, household: null, members: [] };
    const { data: household, error: householdError } = await context.supabase
      .from("households")
      .select("*")
      .eq("id", membership.household_id)
      .single();
    if (householdError) throw householdError;
    const { data: members, error: membersError } = await context.supabase
      .from("household_members")
      .select("*")
      .eq("household_id", household.id)
      .order("created_at");
    if (membersError) throw membersError;
    return { profile, membership, household, members: members ?? [] };
  });
export const saveHousehold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), settings: householdSchema }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("households")
      .update(data.settings)
      .eq("id", data.id)
      .select("id")
      .single();
    if (error) throw error;
    return true;
  });
export const saveMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), settings: memberSchema }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("household_members")
      .update(data.settings)
      .eq("id", data.id)
      .select("id")
      .single();
    if (error) throw error;
    return true;
  });
export const addKid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ householdId: z.string().uuid(), settings: memberSchema }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("household_members")
      .insert({ ...data.settings, household_id: data.householdId, user_id: null, is_kid: true });
    if (error) throw error;
    return true;
  });
export const removeKid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("household_members")
      .delete()
      .eq("id", data.id)
      .eq("is_kid", true)
      .is("user_id", null)
      .select("id")
      .single();
    if (error) throw error;
    return true;
  });
export const savePersonalProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        display_name: z.string().trim().min(1).max(100).optional(),
        locale: z.enum(LOCALES).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const patch = {
      ...(data.display_name !== undefined ? { display_name: data.display_name } : {}),
      ...(data.locale !== undefined ? { locale: data.locale } : {}),
    };
    const { error } = await context.supabase
      .from("profiles")
      .update(patch)
      .eq("id", context.userId)
      .select("id")
      .single();
    if (error) throw error;
    return true;
  });
