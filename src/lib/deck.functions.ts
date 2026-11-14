import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type Sb = SupabaseClient<Database>;
// The deck RPCs are installed by hand (supabase/manual) and are not in the generated types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const rpc = (sb: Sb, fn: string, args: Record<string, unknown>) => (sb.rpc as any)(fn, args);

export type Vote = "like" | "nope" | "super";

export type DealBadge = {
  ingredient_key: string;
  name: string | null;
  deal_price: number;
  regular_price: number | null;
  store: string;
};

export type CardIngredient = {
  ingredient_key: string;
  display_name: string | null;
  quantity: number | null;
  unit: string | null;
};

export type DeckCard = {
  id: string;
  recipe_id: string;
  position: number;
  est_cost_per_portion: number | null;
  deal_count: number;
  source: "deal" | "favorite" | "new";
  title: string | null;
  description: string | null;
  image_url: string | null;
  prep_minutes: number | null;
  diet_tags: string[] | null;
  dealBadges: DealBadge[];
  ingredients: CardIngredient[];
};

export type DeckMember = {
  id: string;
  display_name: string | null;
  is_kid: boolean;
  user_id: string | null;
};

export type MatchCard = {
  recipe_id: string;
  like_count: number;
  super_count: number;
  likers: string[] | null;
  is_favorite: boolean;
  title: string | null;
  description: string | null;
  image_url: string | null;
  prep_minutes: number | null;
  est_cost_per_portion: number | null;
  deal_count: number;
  dealBadges: DealBadge[];
};

export async function membershipOf(sb: Sb, userId: string) {
  const { data, error } = await sb
    .from("household_members")
    .select("id,household_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function weekStartOf(sb: Sb) {
  const { data, error } = await sb.rpc("current_week_start");
  if (error) throw error;
  return data as unknown as string;
}

/** Recipe ingredients, the two best current deals per recipe, and translations. */
export async function recipeExtras(
  sb: Sb,
  householdId: string,
  weekStart: string,
  recipeIds: string[],
) {
  if (!recipeIds.length) {
    return {
      ingredients: new Map<string, CardIngredient[]>(),
      badges: new Map<string, DealBadge[]>(),
      translations: [] as Database["public"]["Tables"]["recipe_translations"]["Row"][],
      ingredientTranslations:
        [] as Database["public"]["Tables"]["ingredient_translations"]["Row"][],
    };
  }
  const weekEnd = new Date(new Date(`${weekStart}T12:00:00Z`).getTime() + 6 * 86400000)
    .toISOString()
    .slice(0, 10);
  const [
    { data: household, error: hErr },
    { data: ings, error: iErr },
    { data: trs, error: tErr },
  ] = await Promise.all([
    sb.from("households").select("stores").eq("id", householdId).single(),
    sb
      .from("recipe_ingredients")
      .select("recipe_id,ingredient_key,display_name,quantity,unit,is_pantry")
      .in("recipe_id", recipeIds)
      .order("created_at"),
    sb
      .from("recipe_translations")
      .select("recipe_id,locale,title,description,steps,created_at,updated_at")
      .in("recipe_id", recipeIds),
  ]);
  if (hErr) throw hErr;
  if (iErr) throw iErr;
  if (tErr) throw tErr;
  const keys = [...new Set((ings ?? []).map((i) => i.ingredient_key))];
  const [{ data: deals, error: dErr }, { data: itr, error: itErr }] = await Promise.all([
    keys.length
      ? sb
          .from("deals")
          .select("ingredient_key,product_name,deal_price,regular_price,store")
          .in("ingredient_key", keys)
          .in("store", household.stores)
          .lte("valid_from", weekEnd)
          .gte("valid_to", weekStart)
      : Promise.resolve({ data: [], error: null }),
    keys.length
      ? sb.from("ingredient_translations").select("*").in("ingredient_key", keys)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (dErr) throw dErr;
  if (itErr) throw itErr;

  const ingredients = new Map<string, CardIngredient[]>();
  const badges = new Map<string, DealBadge[]>();
  for (const i of ings ?? []) {
    const list = ingredients.get(i.recipe_id) ?? [];
    list.push({
      ingredient_key: i.ingredient_key,
      display_name: i.display_name,
      quantity: i.quantity,
      unit: i.unit,
    });
    ingredients.set(i.recipe_id, list);
    if (i.is_pantry) continue;
    const best = (deals ?? [])
      .filter((d) => d.ingredient_key === i.ingredient_key && d.deal_price != null && d.store)
      .sort((a, b) => Number(a.deal_price) - Number(b.deal_price))[0];
    if (!best) continue;
    const b = badges.get(i.recipe_id) ?? [];
    if (!b.some((x) => x.ingredient_key === i.ingredient_key)) {
      b.push({
        ingredient_key: i.ingredient_key,
        name: i.display_name,
        deal_price: Number(best.deal_price),
        regular_price: best.regular_price == null ? null : Number(best.regular_price),
        store: best.store as string,
      });
    }
    badges.set(i.recipe_id, b);
  }
  for (const [id, b] of badges) {
    const saving = (x: DealBadge) => (x.regular_price ?? x.deal_price) - x.deal_price;
    b.sort((x, y) => saving(y) - saving(x));
    badges.set(id, b.slice(0, 2));
  }
  return {
    ingredients,
    badges,
    translations: trs ?? [],
    ingredientTranslations: itr ?? [],
  };
}

export const getDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const m = await membershipOf(sb, context.userId);
    if (!m) {
      return {
        weekStart: null as string | null,
        householdId: null as string | null,
        myMemberId: null as string | null,
        cards: [] as DeckCard[],
        members: [] as DeckMember[],
        swipes: [] as { member_id: string; recipe_id: string; vote: Vote }[],
        translations: [] as Database["public"]["Tables"]["recipe_translations"]["Row"][],
        ingredientTranslations:
          [] as Database["public"]["Tables"]["ingredient_translations"]["Row"][],
      };
    }
    const weekStart = await weekStartOf(sb);
    const { data, error: dErr } = await rpc(sb, "generate_deck", {
      p_household_id: m.household_id,
      p_week_start: weekStart,
    });
    if (dErr) throw dErr;
    const rows = (data ?? []) as Omit<DeckCard, "dealBadges" | "ingredients">[];
    const [extras, { data: members, error: mErr }, { data: swipes, error: sErr }] =
      await Promise.all([
        recipeExtras(
          sb,
          m.household_id,
          weekStart,
          rows.map((c) => c.recipe_id),
        ),
        sb
          .from("household_members")
          .select("id,display_name,is_kid,user_id")
          .eq("household_id", m.household_id)
          .order("created_at"),
        sb
          .from("swipes")
          .select("member_id,recipe_id,vote")
          .eq("household_id", m.household_id)
          .eq("week_start", weekStart),
      ]);
    if (mErr) throw mErr;
    if (sErr) throw sErr;
    const cards: DeckCard[] = rows.map((c) => ({
      ...c,
      dealBadges: extras.badges.get(c.recipe_id) ?? [],
      ingredients: extras.ingredients.get(c.recipe_id) ?? [],
    }));
    return {
      weekStart: weekStart as string | null,
      householdId: m.household_id as string | null,
      myMemberId: m.id as string | null,
      cards,
      members: (members ?? []) as DeckMember[],
      swipes: (swipes ?? []) as { member_id: string; recipe_id: string; vote: Vote }[],
      translations: extras.translations,
      ingredientTranslations: extras.ingredientTranslations,
    };
  });

const swipeInput = z.object({
  memberId: z.string().uuid(),
  recipeId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Saves one vote. Returns whether the recipe is now a household match. */
export const saveSwipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    swipeInput.extend({ vote: z.enum(["like", "nope", "super"]) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const m = await membershipOf(sb, context.userId);
    if (!m) throw new Error("No household");
    const { error } = await sb.from("swipes").upsert(
      {
        household_id: m.household_id,
        member_id: data.memberId,
        recipe_id: data.recipeId,
        week_start: data.weekStart,
        vote: data.vote,
      },
      { onConflict: "member_id,recipe_id,week_start" },
    );
    if (error) throw error;
    if (data.vote === "nope") return { matched: false };
    const { data: matches, error: gErr } = await rpc(sb, "get_matches", {
      p_household_id: m.household_id,
      p_week_start: data.weekStart,
    });
    if (gErr) throw gErr;
    return {
      matched: ((matches ?? []) as { recipe_id: string }[]).some(
        (x) => x.recipe_id === data.recipeId,
      ),
    };
  });

export const undoSwipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => swipeInput.parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("swipes")
      .delete()
      .eq("member_id", data.memberId)
      .eq("recipe_id", data.recipeId)
      .eq("week_start", data.weekStart);
    if (error) throw error;
    return true;
  });

export const addMoreCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const m = await membershipOf(sb, context.userId);
    if (!m) throw new Error("No household");
    const { data: added, error } = await rpc(sb, "add_cards", {
      p_household_id: m.household_id,
      p_week_start: data.weekStart,
      p_count: 10,
    });
    if (error) throw error;
    return Number(added ?? 0);
  });

export const getMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const m = await membershipOf(sb, context.userId);
    if (!m) {
      return {
        householdId: null as string | null,
        weekStart: null as string | null,
        dinnersPerWeek: 5,
        matches: [] as MatchCard[],
        translations: [] as Database["public"]["Tables"]["recipe_translations"]["Row"][],
        ingredientTranslations:
          [] as Database["public"]["Tables"]["ingredient_translations"]["Row"][],
      };
    }
    const weekStart = await weekStartOf(sb);
    const [{ data, error }, { data: household, error: hErr }] = await Promise.all([
      rpc(sb, "get_matches", { p_household_id: m.household_id, p_week_start: weekStart }),
      sb.from("households").select("dinners_per_week").eq("id", m.household_id).single(),
    ]);
    if (error) throw error;
    if (hErr) throw hErr;
    const rows = (data ?? []) as Omit<MatchCard, "dealBadges">[];
    const extras = await recipeExtras(
      sb,
      m.household_id,
      weekStart,
      rows.map((r) => r.recipe_id),
    );
    return {
      householdId: m.household_id as string | null,
      weekStart: weekStart as string | null,
      dinnersPerWeek: household.dinners_per_week,
      matches: rows.map((r) => ({ ...r, dealBadges: extras.badges.get(r.recipe_id) ?? [] })),
      translations: extras.translations,
      ingredientTranslations: extras.ingredientTranslations,
    };
  });

/** "16. bis 22. November" style range parts for a Monday week start (YYYY-MM-DD). */
export function weekRange(weekStart: string, locale: string) {
  const start = new Date(`${weekStart}T12:00:00Z`);
  const end = new Date(start.getTime() + 6 * 86400000);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const fmt = (d: Date, month: boolean) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      ...(month ? { month: "long" } : {}),
      timeZone: "UTC",
    }).format(d);
  const dayOnly = () =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" })
      .formatToParts(start)
      .filter((p) => p.type !== "month")
      .map((p) => p.value)
      .join("")
      .replace(/\s*(de|of)?\s*$/, "")
      .trim();
  return { from: sameMonth ? dayOnly() : fmt(start, true), to: fmt(end, true) };
}
