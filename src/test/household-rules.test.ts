import { describe, it, expect } from "vitest";
import {
  ALLERGENS,
  householdSchema,
  defaultHousehold,
  memberSchema,
  defaultMember,
  safeReturnPath,
} from "@/lib/household-rules";
describe("household settings", () => {
  it("requires at least one of Spar, Billa, Hofer and Lidl", () => {
    expect(
      householdSchema.safeParse({ ...defaultHousehold, name: "Home", stores: [] }).success,
    ).toBe(false);
    expect(
      householdSchema.safeParse({ ...defaultHousehold, name: "Home", stores: ["other"] }).success,
    ).toBe(false);
    expect(
      householdSchema.safeParse({ ...defaultHousehold, name: "Home", stores: ["spar"] }).success,
    ).toBe(true);
  });
  it("limits budget to 30–200 euros", () => {
    for (const n of [29, 201])
      expect(
        householdSchema.safeParse({ ...defaultHousehold, name: "Home", weekly_budget: n }).success,
      ).toBe(false);
    for (const n of [30, 200])
      expect(
        householdSchema.safeParse({ ...defaultHousehold, name: "Home", weekly_budget: n }).success,
      ).toBe(true);
  });
  it("limits dinners to whole numbers 3–7", () => {
    for (const n of [2, 8, 3.5])
      expect(
        householdSchema.safeParse({ ...defaultHousehold, name: "Home", dinners_per_week: n })
          .success,
      ).toBe(false);
    for (const n of [3, 7])
      expect(
        householdSchema.safeParse({ ...defaultHousehold, name: "Home", dinners_per_week: n })
          .success,
      ).toBe(true);
  });
  it("allows only cooking times 20,30,45,60", () => {
    for (const n of [20, 30, 45, 60])
      expect(
        householdSchema.safeParse({ ...defaultHousehold, name: "Home", max_cook_minutes: n })
          .success,
      ).toBe(true);
    expect(
      householdSchema.safeParse({ ...defaultHousehold, name: "Home", max_cook_minutes: 40 })
        .success,
    ).toBe(false);
  });
  it("supports the 14 EU allergens and the three diets", () => {
    expect(ALLERGENS).toHaveLength(14);
    for (const diet of ["alles", "vegetarisch", "vegan"])
      expect(
        memberSchema.safeParse({
          ...defaultMember,
          display_name: "Jo",
          diet,
          allergies: [...ALLERGENS],
        }).success,
      ).toBe(true);
    expect(
      memberSchema.safeParse({ ...defaultMember, display_name: "Jo", diet: "other" }).success,
    ).toBe(false);
  });
  it("returns to invite links but never external origins", () => {
    expect(safeReturnPath("/join/ABC12345")).toBe("/join/ABC12345");
    for (const path of ["https://evil.test", "//evil.test", "/\\evil.test", "/login"])
      expect(safeReturnPath(path)).toBe("/start");
  });
});

import { weekRange } from "@/lib/deck.functions";
describe("deck week label", () => {
  it("formats Monday 16 Nov 2026 as 16. bis 22. November", () => {
    expect(weekRange("2026-11-16", "de-AT")).toEqual({ from: "16.", to: "22. November" });
  });
});
