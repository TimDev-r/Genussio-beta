import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { membershipOf, rpc } from "./deck.functions";

export type ReservationStatus = "geklickt" | "vorgemerkt" | "bezahlt" | "erstattet";

export const getReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const m = await membershipOf(sb, context.userId);
    if (!m)
      return {
        householdId: null as string | null,
        status: null as ReservationStatus | null,
        hasPlan: false,
      };
    const [res, plan] = await Promise.all([
      sb
        .from("reservations")
        .select("status")
        .eq("household_id", m.household_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb
        .from("meal_plan_entries")
        .select("id", { count: "exact", head: true })
        .eq("household_id", m.household_id),
    ]);
    if (res.error) throw res.error;
    return {
      householdId: m.household_id as string | null,
      status: (res.data?.status ?? null) as ReservationStatus | null,
      hasPlan: (plan.count ?? 0) > 0,
    };
  });

export const saveReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ status: z.enum(["geklickt", "vorgemerkt"]) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: status, error } = await rpc(context.supabase, "save_reservation", {
      p_status: data.status,
    });
    if (error) throw error;
    return status as ReservationStatus;
  });

export const adminSetReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        householdId: z.string().uuid(),
        status: z.enum(["geklickt", "vorgemerkt", "bezahlt", "erstattet"]).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { error } = await rpc(context.supabase, "admin_set_reservation", {
      p_household_id: data.householdId,
      p_status: data.status,
    });
    if (error) throw error;
    return true;
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await rpc(context.supabase, "delete_my_account", {});
    if (error) throw error;
    return true;
  });
