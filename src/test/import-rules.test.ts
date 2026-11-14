import { describe, it, expect } from "vitest";
import { validateImport, viennaToday, AISLES } from "@/lib/import-rules";
import { localizedRecipe, localizedIngredient } from "@/lib/catalog-localization";
const deal = {
  store: "hofer",
  ingredient_key: "huehnerkeulen",
  product_name: "Hühnerkeulen frisch 1 kg",
  deal_price: 3.99,
  regular_price: 5.99,
  package_quantity: 1000,
  unit: "g",
  valid_from: "2026-11-12",
  valid_to: "2026-11-18",
};
describe("content import rules", () => {
  it("accepts the given deal and all four stores", () => {
    for (const store of ["spar", "billa", "hofer", "lidl"])
      expect(validateImport("deals", JSON.stringify([{ ...deal, store }])).rows[0]?.errors).toEqual(
        [],
      );
  });
  it("rejects any other store", () =>
    expect(
      validateImport("deals", JSON.stringify([{ ...deal, store: "aldi" }])).rows[0]?.errors.length,
    ).toBeGreaterThan(0));
  it("accepts only g ml stk units", () => {
    for (const unit of ["g", "ml", "stk"])
      expect(validateImport("deals", JSON.stringify([{ ...deal, unit }])).rows[0]?.errors).toEqual(
        [],
      );
    expect(
      validateImport("deals", JSON.stringify([{ ...deal, unit: "kg" }])).rows[0]?.errors.length,
    ).toBeGreaterThan(0);
  });
  it("rejects zero and negative numbers", () => {
    for (const value of [0, -1])
      expect(
        validateImport("deals", JSON.stringify([{ ...deal, deal_price: value }])).rows[0]?.errors
          .length,
      ).toBeGreaterThan(0);
  });
  it("requires actual YYYY-MM-DD dates in order", () => {
    for (const valid_to of ["12/11/2026", "2026-02-30", "2026-11-01"])
      expect(
        validateImport("deals", JSON.stringify([{ ...deal, valid_to }])).rows[0]?.errors.length,
      ).toBeGreaterThan(0);
  });
  it("uses Vienna today at UTC midnight boundary", () =>
    expect(viennaToday(new Date("2026-11-12T23:30:00Z"))).toBe("2026-11-13"));
  it("validates the given price format", () =>
    expect(
      validateImport(
        "prices",
        JSON.stringify([
          {
            ingredient_key: "zwiebeln",
            store: "billa",
            price: 1.49,
            per_quantity: 1000,
            unit: "g",
          },
        ]),
      ).rows[0]?.errors,
    ).toEqual([]));
  it("rejects invalid JSON and non-list input", () => {
    expect(validateImport("prices", "{").error).toBe("invalidJson");
    expect(validateImport("prices", "{}").error).toBe("invalidArray");
  });
  it("validates database aisles and flags absent translations", () => {
    const recipe = {
      title: "Paprikahendl",
      description: "Test",
      prep_minutes: 40,
      base_servings: 4,
      diet_tags: [],
      allergens: ["Milch/Laktose"],
      main_ingredient: "huhn",
      steps: [{ text: "Cook", timer_minutes: 10 }],
      ingredients: [
        {
          ingredient_key: "huehnerkeulen",
          display_name: "Hühnerkeulen",
          quantity: 800,
          unit: "g",
          aisle: "Fleisch & Fisch",
          is_pantry: false,
        },
      ],
    };
    for (const aisle of AISLES)
      expect(
        validateImport(
          "recipes",
          JSON.stringify([{ ...recipe, ingredients: [{ ...recipe.ingredients[0], aisle }] }]),
        ).rows[0]?.errors,
      ).toEqual([]);
    expect(
      validateImport(
        "recipes",
        JSON.stringify([
          { ...recipe, ingredients: [{ ...recipe.ingredients[0], aisle: "Invalid" }] },
        ]),
      ).rows[0]?.errors.length,
    ).toBeGreaterThan(0);
    expect(validateImport("recipes", JSON.stringify([recipe])).rows[0]?.missing).toContain("en");
  });
});
describe("catalog language fallback", () => {
  it("falls back to Austrian recipe fields individually", () =>
    expect(
      localizedRecipe(
        { title: "Erdäpfelgulasch", description: "Wärmend", steps: [{ text: "Kochen" }] },
        [{ locale: "en", title: "Potato goulash", description: null, steps: null }],
        "en",
      ),
    ).toEqual({ title: "Potato goulash", description: "Wärmend", steps: [{ text: "Kochen" }] }));
  it("uses translated ingredients with Austrian fallback", () => {
    const tr = [{ ingredient_key: "erdapfel", locale: "de-DE", display_name: "Kartoffeln" }];
    expect(localizedIngredient("erdapfel", "Erdäpfel", tr, "de-DE")).toBe("Kartoffeln");
    expect(localizedIngredient("erdapfel", "Erdäpfel", tr, "it")).toBe("Erdäpfel");
  });
});
