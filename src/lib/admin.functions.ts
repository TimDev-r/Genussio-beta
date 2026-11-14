import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  importKinds,
  validateImport,
  recipeSchema,
  priceSchema,
  dealSchema,
  viennaToday,
} from "./import-rules";
export const getAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("is_admin");
    if (error) throw error;
    return data === true;
  });
export const importContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ kind: z.enum(importKinds), source: z.string().max(2_000_000) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: admin, error: accessError } = await context.supabase.rpc("is_admin");
    if (accessError || !admin) throw new Error("Forbidden");
    const result = validateImport(data.kind, data.source);
    if (result.error || result.rows.some((row) => row.errors.length))
      throw new Error("Invalid import");
    const saved: { title: string; id: string }[] = [];
    if (data.kind === "recipes")
      for (const row of result.rows) {
        const recipe = recipeSchema.parse(row.data);
        const { data: id, error } = await context.supabase.rpc("import_recipe", {
          p_recipe: JSON.parse(JSON.stringify(recipe)),
        });
        if (error) throw error;
        saved.push({ title: recipe.title, id });
      }
    else if (data.kind === "deals") {
      const { error } = await context.supabase
        .from("deals")
        .insert(result.rows.map((row) => dealSchema.parse(row.data)));
      if (error) throw error;
    } else {
      const { error } = await context.supabase.from("ingredient_prices").upsert(
        result.rows.map((row) => priceSchema.parse(row.data)),
        { onConflict: "ingredient_key,store" },
      );
      if (error) throw error;
    }
    return { count: result.rows.length, saved };
  });
export const deleteExpiredDeals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin, error: accessError } = await context.supabase.rpc("is_admin");
    if (accessError || !admin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("deals")
      .delete()
      .lt("valid_to", viennaToday())
      .select("id");
    if (error) throw error;
    return data.length;
  });
export const saveRecipeImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        path: z.string().regex(/^[a-f0-9-]+\/[a-f0-9-]+\.(jpg|png|webp)$/),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: admin, error: accessError } = await context.supabase.rpc("is_admin");
    if (accessError || !admin) throw new Error("Forbidden");
    if (!data.path.startsWith(`${data.id}/`)) throw new Error("Invalid path");
    const url = `${import.meta.env["VITE_SUPABASE_URL"]}/storage/v1/object/public/recipe-images/${data.path}`;
    const { error } = await context.supabase
      .from("recipes")
      .update({ image_url: url })
      .eq("id", data.id)
      .select("id")
      .single();
    if (error) throw error;
    return url;
  });
