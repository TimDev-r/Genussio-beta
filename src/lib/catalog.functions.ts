import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export const getCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    async function recipes() {
      const rows = [];
      for (let start = 0; ; start += 500) {
        const { data, error } = await supabase
          .from("recipes")
          .select("*,recipe_ingredients(*),recipe_translations(*)")
          .order("id")
          .range(start, start + 499);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 500) return rows;
      }
    }
    async function translations() {
      const rows = [];
      for (let start = 0; ; start += 500) {
        const { data, error } = await supabase
          .from("ingredient_translations")
          .select("*")
          .order("ingredient_key")
          .order("locale")
          .range(start, start + 499);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 500) return rows;
      }
    }
    async function deals() {
      const rows = [];
      for (let start = 0; ; start += 500) {
        const { data, error } = await supabase
          .from("deals")
          .select("*")
          .order("id")
          .range(start, start + 499);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 500) return rows;
      }
    }
    const [recipeRows, ingredientTranslations, dealRows] = await Promise.all([
      recipes(),
      translations(),
      deals(),
    ]);
    return { recipes: recipeRows, ingredientTranslations, deals: dealRows };
  });
