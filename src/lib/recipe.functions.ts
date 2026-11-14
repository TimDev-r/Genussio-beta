import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { membershipOf, weekStartOf } from "./deck.functions";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];

export type RecipeStep = { text: string; timer_minutes?: number | undefined };

export type RecipeIngredientView = {
  id: string;
  ingredient_key: string;
  display_name: string | null;
  quantity: number | null;
  unit: string | null;
  is_pantry: boolean;
  deal: { deal_price: number; regular_price: number | null; store: string } | null;
};

export const getRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const m = await membershipOf(sb, context.userId);
    const weekStart = await weekStartOf(sb);
    const [recipe, ings, trs] = await Promise.all([
      sb
        .from("recipes")
        .select(
          "id,title,description,image_url,prep_minutes,base_servings,diet_tags,allergens,steps",
        )
        .eq("id", data.id)
        .maybeSingle(),
      sb
        .from("recipe_ingredients")
        .select("id,ingredient_key,display_name,quantity,unit,is_pantry")
        .eq("recipe_id", data.id)
        .order("created_at"),
      sb.from("recipe_translations").select("*").eq("recipe_id", data.id),
    ]);
    if (recipe.error) throw recipe.error;
    if (ings.error) throw ings.error;
    if (trs.error) throw trs.error;
    if (!recipe.data) return null;

    const keys = [...new Set((ings.data ?? []).map((i) => i.ingredient_key))];
    let stores: string[] = [];
    let membersCount = recipe.data.base_servings;
    let costPerPortion: number | null = null;
    let entry: { id: string; servings: number | null; cooked_at: string | null } | null = null;
    if (m) {
      const [hh, members, deck, plan] = await Promise.all([
        sb.from("households").select("stores").eq("id", m.household_id).single(),
        sb
          .from("household_members")
          .select("id", { count: "exact", head: true })
          .eq("household_id", m.household_id),
        sb
          .from("deck_items")
          .select("est_cost_per_portion")
          .eq("household_id", m.household_id)
          .eq("week_start", weekStart)
          .eq("recipe_id", data.id)
          .maybeSingle(),
        sb
          .from("meal_plan_entries")
          .select("*")
          .eq("household_id", m.household_id)
          .eq("week_start", weekStart)
          .eq("recipe_id", data.id)
          .order("plan_date")
          .limit(1)
          .maybeSingle(),
      ]);
      if (hh.error) throw hh.error;
      if (plan.error) throw plan.error;
      stores = hh.data.stores;
      membersCount = members.count ?? membersCount;
      costPerPortion =
        deck.data?.est_cost_per_portion == null ? null : Number(deck.data.est_cost_per_portion);
      const p = plan.data as
        (Tables["meal_plan_entries"]["Row"] & { cooked_at?: string | null }) | null;
      entry = p ? { id: p.id, servings: p.servings, cooked_at: p.cooked_at ?? null } : null;
    }

    const weekEnd = new Date(new Date(`${weekStart}T12:00:00Z`).getTime() + 6 * 86400000)
      .toISOString()
      .slice(0, 10);
    const [deals, itr] = await Promise.all([
      keys.length && stores.length
        ? sb
            .from("deals")
            .select("ingredient_key,deal_price,regular_price,store")
            .in("ingredient_key", keys)
            .in("store", stores)
            .lte("valid_from", weekEnd)
            .gte("valid_to", weekStart)
        : Promise.resolve({ data: [], error: null }),
      keys.length
        ? sb.from("ingredient_translations").select("*").in("ingredient_key", keys)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (deals.error) throw deals.error;
    if (itr.error) throw itr.error;

    const best = new Map<
      string,
      { deal_price: number; regular_price: number | null; store: string }
    >();
    for (const d of deals.data ?? []) {
      if (d.deal_price == null || !d.store || !d.ingredient_key) continue;
      const cur = best.get(d.ingredient_key);
      if (!cur || Number(d.deal_price) < cur.deal_price) {
        best.set(d.ingredient_key, {
          deal_price: Number(d.deal_price),
          regular_price: d.regular_price == null ? null : Number(d.regular_price),
          store: d.store,
        });
      }
    }

    const steps = (Array.isArray(recipe.data.steps) ? recipe.data.steps : []) as RecipeStep[];
    return {
      recipe: { ...recipe.data, steps },
      ingredients: (ings.data ?? []).map<RecipeIngredientView>((i) => ({
        ...i,
        quantity: i.quantity == null ? null : Number(i.quantity),
        deal: i.is_pantry ? null : (best.get(i.ingredient_key) ?? null),
      })),
      translations: trs.data ?? [],
      ingredientTranslations: itr.data ?? [],
      householdId: (m?.household_id ?? null) as string | null,
      defaultServings: entry?.servings ?? membersCount,
      costPerPortion,
      entry,
    };
  });

export const setCooked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ entryId: z.string().uuid(), cooked: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("meal_plan_entries")
      // cooked_at is added by the prompt 8 SQL and isn't in the generated types yet
      .update({ cooked_at: data.cooked ? new Date().toISOString() : null } as never)
      .eq("id", data.entryId)
      .select("id")
      .single();
    if (error) throw error;
    return true;
  });
