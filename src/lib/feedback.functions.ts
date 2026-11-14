import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { membershipOf, rpc } from "./deck.functions";

export const SAVINGS = ["nichts", "bis10", "10bis20", "20bis40", "mehr40"] as const;
export const WOULD_PAY = ["ja", "vielleicht", "nein"] as const;

export const getCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await rpc(context.supabase, "weekly_checkin_status", {});
    if (error) throw error;
    const row = (
      (data ?? []) as {
        due: boolean;
        week_start: string;
        ask_price: boolean;
        household_id: string | null;
      }[]
    )[0];
    return {
      due: !!row?.due,
      weekStart: row?.week_start ?? null,
      askPrice: !!row?.ask_price,
      householdId: row?.household_id ?? null,
    };
  });

export const submitCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .union([
        z.object({ skipped: z.literal(true) }),
        z.object({
          skipped: z.literal(false),
          daysCooked: z.number().int().min(0).max(7),
          savings: z.enum(SAVINGS),
          wouldPay: z.enum(WOULD_PAY).nullable(),
        }),
      ])
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { error } = await rpc(context.supabase, "submit_weekly_checkin", {
      p_days_cooked: data.skipped ? null : data.daysCooked,
      p_savings: data.skipped ? null : data.savings,
      p_would_pay: data.skipped ? null : data.wouldPay,
      p_skipped: data.skipped,
    });
    if (error) throw error;
    return true;
  });

export const sendFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        text: z.string().trim().min(1).max(2000),
        rating: z.number().int().min(1).max(5).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const m = await membershipOf(sb, context.userId);
    const { error } = await sb.from("feedback").insert({
      user_id: context.userId,
      household_id: m?.household_id ?? null,
      kind: "allgemein",
      rating: data.rating,
      answer: data.text,
    });
    if (error) throw error;
    return true;
  });

// ── Admin ────────────────────────────────────────────────────────────────────

export type DashboardHousehold = {
  id: string;
  name: string | null;
  members: number;
  group: string;
  created_at: string;
  last_activity: string | null;
  plans: number;
  cooked: number;
  reservation: string | null;
};

export type Dashboard = {
  kpis: {
    signups: number;
    households: number;
    multi_member_share: number | null;
    deck_finished: number;
    planned: number;
    cooked_share: number | null;
    cooked: number;
    planned_dinners: number;
    retention: { week: number; eligible: number; active: number }[] | null;
    checkin: {
      answers: number;
      avg_days_cooked: number | null;
      savings: Record<string, number>;
      price_answers: number;
      price_yes_share: number | null;
    };
    reservations_clicked: number;
    reservations_paid: number;
  };
  funnel: { step: string; count: number }[];
  households: DashboardHousehold[];
  feedback: {
    id: string;
    kind: string;
    rating: number | null;
    answer: string | null;
    created_at: string;
    household: string | null;
  }[];
};

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

export const getAdminDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ from: date, to: date, group: z.string().max(120) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const [dash, groups] = await Promise.all([
      rpc(context.supabase, "admin_dashboard", {
        p_from: data.from,
        p_to: data.to,
        p_group: data.group,
      }),
      rpc(context.supabase, "admin_signup_groups", {}),
    ]);
    if (dash.error) throw dash.error;
    if (groups.error) throw groups.error;
    return {
      dashboard: dash.data as Dashboard,
      groups: (groups.data ?? []) as { kind: "beta" | "utm"; value: string; people: number }[],
    };
  });
