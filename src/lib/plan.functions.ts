import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { membershipOf, recipeExtras, rpc, weekStartOf, type DealBadge } from "./deck.functions";
import type { ListItem } from "./list-format";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export type PlanEntry = {
  id: string;
  plan_date: string;
  recipe_id: string | null;
  servings: number;
  is_leftover_day: boolean;
  cooked_at: string | null;
  title: string | null;
  description: string | null;
  image_url: string | null;
  prep_minutes: number | null;
  est_cost_per_portion: number | null;
  dealBadges: DealBadge[];
};

export type SwapOption = {
  recipe_id: string;
  title: string | null;
  image_url: string | null;
  prep_minutes: number | null;
  est_cost_per_portion: number | null;
  is_favorite: boolean;
};

export const getPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const m = await membershipOf(sb, context.userId);
    const empty = {
      weekStart: null as string | null,
      householdId: null as string | null,
      budget: null as number | null,
      dinnersPerWeek: 5,
      entries: [] as PlanEntry[],
      options: [] as SwapOption[],
      listTotal: 0,
      dealsUsed: 0,
      translations: [] as Tables["recipe_translations"]["Row"][],
      ingredientTranslations: [] as Tables["ingredient_translations"]["Row"][],
    };
    if (!m) return empty;
    const weekStart = await weekStartOf(sb);
    const [household, entries, matches, list] = await Promise.all([
      sb
        .from("households")
        .select("weekly_budget,dinners_per_week")
        .eq("id", m.household_id)
        .single(),
      sb
        .from("meal_plan_entries")
        .select("*")
        .eq("household_id", m.household_id)
        .eq("week_start", weekStart)
        .order("plan_date"),
      rpc(sb, "get_matches", { p_household_id: m.household_id, p_week_start: weekStart }),
      sb
        .from("shopping_list_items")
        .select("*")
        .eq("household_id", m.household_id)
        .eq("week_start", weekStart),
    ]);
    if (household.error) throw household.error;
    if (entries.error) throw entries.error;
    if (matches.error) throw matches.error;
    if (list.error) throw list.error;

    const rows = entries.data ?? [];
    const recipeIds = [...new Set(rows.map((e) => e.recipe_id).filter((x): x is string => !!x))];
    const matchRows = (matches.data ?? []) as (SwapOption & { recipe_id: string })[];
    const allIds = [...new Set([...recipeIds, ...matchRows.map((x) => x.recipe_id)])];
    const [recipes, deck, extras] = await Promise.all([
      allIds.length
        ? sb.from("recipes").select("id,title,description,image_url,prep_minutes").in("id", allIds)
        : Promise.resolve({ data: [], error: null }),
      allIds.length
        ? sb
            .from("deck_items")
            .select("recipe_id,est_cost_per_portion")
            .eq("household_id", m.household_id)
            .eq("week_start", weekStart)
            .in("recipe_id", allIds)
        : Promise.resolve({ data: [], error: null }),
      recipeExtras(sb, m.household_id, weekStart, allIds),
    ]);
    if (recipes.error) throw recipes.error;
    if (deck.error) throw deck.error;
    const recipe = new Map((recipes.data ?? []).map((r) => [r.id, r]));
    const cost = new Map((deck.data ?? []).map((d) => [d.recipe_id, d.est_cost_per_portion]));
    const planned = new Set(recipeIds);
    const items = (list.data ?? []) as unknown as ListItem[];

    return {
      weekStart: weekStart as string | null,
      householdId: m.household_id as string | null,
      budget: household.data.weekly_budget == null ? null : Number(household.data.weekly_budget),
      dinnersPerWeek: household.data.dinners_per_week,
      entries: rows.map<PlanEntry>((e) => {
        const r = e.recipe_id ? recipe.get(e.recipe_id) : undefined;
        return {
          id: e.id,
          plan_date: e.plan_date as string,
          recipe_id: e.recipe_id,
          servings: e.servings ?? 1,
          is_leftover_day: e.is_leftover_day,
          cooked_at: (e as { cooked_at?: string | null }).cooked_at ?? null,
          title: r?.title ?? null,
          description: r?.description ?? null,
          image_url: r?.image_url ?? null,
          prep_minutes: r?.prep_minutes ?? null,
          est_cost_per_portion: e.recipe_id ? (cost.get(e.recipe_id) ?? null) : null,
          dealBadges: e.recipe_id ? (extras.badges.get(e.recipe_id) ?? []) : [],
        };
      }),
      options: matchRows
        .filter((x) => !planned.has(x.recipe_id))
        .map((x) => ({
          recipe_id: x.recipe_id,
          title: x.title,
          image_url: x.image_url,
          prep_minutes: x.prep_minutes,
          est_cost_per_portion: x.est_cost_per_portion,
          is_favorite: x.is_favorite,
        })),
      listTotal:
        Math.round(
          items.filter((i) => !i.is_pantry).reduce((s, i) => s + Number(i.est_price ?? 0), 0) * 100,
        ) / 100,
      dealsUsed: items.filter((i) => i.is_deal).length,
      translations: extras.translations,
      ingredientTranslations: extras.ingredientTranslations,
    };
  });

export const createPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ startDate: date, replace: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const m = await membershipOf(sb, context.userId);
    if (!m) throw new Error("No household");
    const weekStart = await weekStartOf(sb);
    const { data: count, error } = await rpc(sb, "create_plan", {
      p_household_id: m.household_id,
      p_week_start: weekStart,
      p_start_date: data.startDate,
      p_replace: data.replace,
    });
    if (error) {
      if (String(error.message).includes("plan_exists"))
        return { status: "exists" as const, count: 0 };
      throw error;
    }
    return { status: "ok" as const, count: Number(count ?? 0) };
  });

export const updateEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        recipeId: z.string().uuid().optional(),
        leftover: z.boolean().optional(),
        servings: z.number().int().min(1).max(12).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const patch: { recipe_id?: string | null; is_leftover_day?: boolean; servings?: number } = {};
    if (data.recipeId !== undefined) {
      patch.recipe_id = data.recipeId;
      patch.is_leftover_day = false;
    }
    if (data.leftover === true) {
      patch.is_leftover_day = true;
      patch.recipe_id = null;
    }
    if (data.servings !== undefined) patch.servings = data.servings;
    const { error } = await context.supabase
      .from("meal_plan_entries")
      .update(patch)
      .eq("id", data.id)
      .select("id")
      .single();
    if (error) throw error;
    return true;
  });

/** Moves a day up or down by swapping its date with the neighbouring day. */
export const moveEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.string().uuid(), direction: z.union([z.literal(-1), z.literal(1)]) })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: me, error } = await sb
      .from("meal_plan_entries")
      .select("id,household_id,week_start,plan_date")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    const { data: all, error: aErr } = await sb
      .from("meal_plan_entries")
      .select("id,plan_date")
      .eq("household_id", me.household_id)
      .eq("week_start", me.week_start)
      .order("plan_date");
    if (aErr) throw aErr;
    const i = (all ?? []).findIndex((e) => e.id === me.id);
    const other = all?.[i + data.direction];
    if (!other) return false;
    const a = await sb
      .from("meal_plan_entries")
      .update({ plan_date: other.plan_date })
      .eq("id", me.id);
    if (a.error) throw a.error;
    const b = await sb
      .from("meal_plan_entries")
      .update({ plan_date: me.plan_date })
      .eq("id", other.id);
    if (b.error) throw b.error;
    return true;
  });

export const getList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const m = await membershipOf(sb, context.userId);
    if (!m) {
      return {
        weekStart: null as string | null,
        householdId: null as string | null,
        myMemberId: null as string | null,
        stores: [] as string[],
        items: [] as ListItem[],
        members: [] as { id: string; display_name: string | null }[],
        ingredientTranslations: [] as {
          ingredient_key: string;
          locale: string;
          display_name: string | null;
        }[],
      };
    }
    const weekStart = await weekStartOf(sb);
    const [items, members, household] = await Promise.all([
      sb
        .from("shopping_list_items")
        .select("*")
        .eq("household_id", m.household_id)
        .eq("week_start", weekStart)
        .order("created_at"),
      sb.from("household_members").select("id,display_name").eq("household_id", m.household_id),
      sb.from("households").select("stores").eq("id", m.household_id).single(),
    ]);
    if (items.error) throw items.error;
    if (members.error) throw members.error;
    if (household.error) throw household.error;
    const rows = (items.data ?? []) as unknown as ListItem[];
    const keys = [...new Set(rows.map((i) => i.ingredient_key).filter((k): k is string => !!k))];
    const tr = keys.length
      ? await sb
          .from("ingredient_translations")
          .select("ingredient_key,locale,display_name")
          .in("ingredient_key", keys)
      : { data: [], error: null };
    if (tr.error) throw tr.error;
    return {
      weekStart: weekStart as string | null,
      householdId: m.household_id as string | null,
      myMemberId: m.id as string | null,
      stores: household.data.stores,
      items: rows.map((i) => ({
        ...i,
        quantity: i.quantity == null ? null : Number(i.quantity),
        est_price: i.est_price == null ? null : Number(i.est_price),
        deal_price: i.deal_price == null ? null : Number(i.deal_price),
      })),
      members: members.data ?? [],
      ingredientTranslations: tr.data ?? [],
    };
  });

export const toggleItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), checked: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const m = await membershipOf(sb, context.userId);
    if (!m) throw new Error("No household");
    const { error } = await sb
      .from("shopping_list_items")
      .update({ checked: data.checked, checked_by: data.checked ? m.id : null })
      .eq("id", data.id)
      .select("id")
      .single();
    if (error) throw error;
    return true;
  });

export const addCustomItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ name: z.string().trim().min(1).max(80) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const m = await membershipOf(sb, context.userId);
    if (!m) throw new Error("No household");
    const weekStart = await weekStartOf(sb);
    const { error } = await sb.from("shopping_list_items").insert({
      household_id: m.household_id,
      week_start: weekStart,
      display_name: data.name,
      is_custom: true,
      aisle: "Sonstiges",
    });
    if (error) throw error;
    return true;
  });

export const removeCustomItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("shopping_list_items")
      .delete()
      .eq("id", data.id)
      .eq("is_custom", true);
    if (error) throw error;
    return true;
  });
