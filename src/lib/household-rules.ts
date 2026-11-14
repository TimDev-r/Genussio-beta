import { z } from "zod";

export const STORES = ["spar", "billa", "hofer", "lidl"] as const;
export const ALLERGENS = [
  "gluten",
  "crustaceans",
  "eggs",
  "fish",
  "peanuts",
  "soy",
  "milk",
  "nuts",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
  "lupin",
  "molluscs",
] as const;
export const COOK_TIMES = [20, 30, 45, 60] as const;
export const householdSchema = z.object({
  name: z.string().trim().min(1).max(100),
  stores: z.array(z.enum(STORES)).min(1),
  weekly_budget: z.number().min(30).max(200),
  dinners_per_week: z.number().int().min(3).max(7),
  max_cook_minutes: z.number().refine((v) => COOK_TIMES.some((t) => t === v)),
});
export type HouseholdSettings = z.infer<typeof householdSchema>;
export const memberSchema = z.object({
  display_name: z.string().trim().min(1).max(100),
  diet: z.enum(["alles", "vegetarisch", "vegan"]),
  allergies: z.array(z.enum(ALLERGENS)),
  dislikes: z.array(z.string().trim().min(1).max(80)).max(50),
});
export type MemberSettings = z.infer<typeof memberSchema>;
export const defaultHousehold: HouseholdSettings = {
  name: "",
  stores: [...STORES],
  weekly_budget: 80,
  dinners_per_week: 5,
  max_cook_minutes: 45,
};
export const defaultMember: MemberSettings = {
  display_name: "",
  diet: "alles",
  allergies: [],
  dislikes: [],
};
export function safeReturnPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return "/start";
  if (/^\/join\/[A-Za-z0-9-]+$/.test(value)) return value;
  return "/start";
}
