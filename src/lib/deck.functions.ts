import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
};

export const getDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const { data: m, error } = await sb
      .from("household_members")
      .select("household_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!m) return { weekStart: null, cards: [] as DeckCard[], translations: [] };
    const { data: week, error: wErr } = await sb.rpc("current_week_start");
    if (wErr) throw wErr;
    const weekStart = week as unknown as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: dErr } = await (sb.rpc as any)("generate_deck", {
      p_household_id: m.household_id,
      p_week_start: weekStart,
    });
    if (dErr) throw dErr;
    const cards = (data ?? []) as DeckCard[];
    const ids = cards.map((c) => c.recipe_id);
    const { data: translations, error: tErr } = ids.length
      ? await sb.from("recipe_translations").select("recipe_id,locale,title,description,steps").in("recipe_id", ids)
      : { data: [], error: null };
    if (tErr) throw tErr;
    return { weekStart, cards, translations: translations ?? [] };
  });

/** "16. bis 22. November" style range parts for a Monday week start (YYYY-MM-DD). */
export function weekRange(weekStart: string, locale: string) {
  const start = new Date(`${weekStart}T12:00:00Z`);
  const end = new Date(start.getTime() + 6 * 86400000);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const fmt = (d: Date, month: boolean) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", ...(month ? { month: "long" } : {}), timeZone: "UTC" }).format(d);
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
