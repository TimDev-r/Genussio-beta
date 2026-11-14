import { z } from "zod";
export const AISLES = [
  "Obst & Gemüse",
  "Fleisch & Fisch",
  "Milchprodukte",
  "Brot & Gebäck",
  "Trockenwaren",
  "Tiefkühl",
  "Gewürze & Öl",
  "Sonstiges",
] as const;
export const TRANSLATION_LOCALES = ["de-DE", "en", "it", "es"] as const;
export const importKinds = ["deals", "recipes", "prices"] as const;
export type ImportKind = (typeof importKinds)[number];
const text = z.string().trim().min(1);
const positive = z.number().finite().positive();
const store = z.enum(["spar", "billa", "hofer", "lidl"]);
const unit = z.enum(["g", "ml", "stk"]);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v);
const steps = z.array(z.object({ text, timer_minutes: positive.optional() })).min(1);
const translation = z.object({ title: text, description: text, steps });
export const recipeSchema = z.object({
  title: text,
  description: text,
  prep_minutes: positive.int(),
  base_servings: positive.int(),
  diet_tags: z.array(text),
  allergens: z.array(text),
  main_ingredient: text,
  steps,
  ingredients: z
    .array(
      z.object({
        ingredient_key: text,
        display_name: text,
        quantity: positive,
        unit,
        aisle: z.enum(AISLES),
        is_pantry: z.boolean(),
        names: z.record(z.enum(TRANSLATION_LOCALES), text).optional(),
      }),
    )
    .min(1),
  translations: z.record(z.enum(TRANSLATION_LOCALES), translation).optional(),
});
export const dealSchema = z
  .object({
    store,
    ingredient_key: text,
    product_name: text,
    deal_price: positive,
    regular_price: positive,
    package_quantity: positive,
    unit,
    valid_from: date,
    valid_to: date,
  })
  .refine((v) => v.valid_to >= v.valid_from, { path: ["valid_to"], message: "dateOrder" });
export const priceSchema = z.object({
  ingredient_key: text,
  store,
  price: positive,
  per_quantity: positive,
  unit,
});
export function validateImport(kind: ImportKind, source: string) {
  let input: unknown;
  try {
    input = JSON.parse(source);
  } catch {
    return { error: "invalidJson" as const, rows: [] };
  }
  if (!Array.isArray(input) || !input.length || input.length > 500)
    return { error: "invalidArray" as const, rows: [] };
  const schema = kind === "recipes" ? recipeSchema : kind === "deals" ? dealSchema : priceSchema;
  return {
    error: null,
    rows: input.map((row: unknown, index: number) => {
      const parsed = schema.safeParse(row);
      const missing: string[] = [];
      if (kind === "recipes" && parsed.success) {
        const recipe = recipeSchema.parse(row);
        for (const locale of TRANSLATION_LOCALES) {
          if (!recipe.translations?.[locale]) missing.push(locale);
          for (const ing of recipe.ingredients)
            if (!ing.names?.[locale]) missing.push(`${ing.ingredient_key}: ${locale}`);
        }
      }
      return {
        index,
        label:
          typeof row === "object" && row !== null
            ? String(
                "title" in row
                  ? row.title
                  : "product_name" in row
                    ? row.product_name
                    : "ingredient_key" in row
                      ? row.ingredient_key
                      : index + 1,
              )
            : String(index + 1),
        data: parsed.success ? parsed.data : null,
        errors: parsed.success
          ? []
          : parsed.error.issues.map((i) => ({
              field: i.path.join("."),
              code: i.message === "dateOrder" ? "dateOrder" : "invalidField",
            })),
        missing,
      };
    }),
  };
}
export function viennaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
