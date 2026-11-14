import { describe, expect, it } from "vitest";
import { allergenKey, formatAmount, formatTimer, scaleQuantity } from "@/lib/recipe-format";

describe("scaleQuantity", () => {
  it("halves from 4 to 2 servings", () => expect(scaleQuantity(800, 4, 2)).toBe(400));
  it("keeps null", () => expect(scaleQuantity(null, 4, 2)).toBeNull());
});

describe("formatAmount", () => {
  it("rounds grams", () => expect(formatAmount(512, "g", "de-AT")).toBe("510 g"));
  it("small grams in steps of 5", () => expect(formatAmount(12, "g", "de-AT")).toBe("10 g"));
  it("kilos", () => expect(formatAmount(1250, "g", "de-AT")).toBe("1,3 kg"));
  it("pieces with fractions", () => expect(formatAmount(1.5, "stk", "de-AT")).toBe("1½"));
  it("spoons", () => expect(formatAmount(0.5, "EL", "de-AT")).toBe("½ EL"));
  it("whole numbers", () => expect(formatAmount(2, "TL", "de-AT")).toBe("2 TL"));
  it("rounds up close to the next whole", () =>
    expect(formatAmount(2.9, "stk", "de-AT")).toBe("3"));
});

describe("allergenKey", () => {
  it("maps labels to keys", () =>
    expect(allergenKey("Milch/Laktose", { gluten: "Gluten", milk: "Milch/Laktose" })).toBe("milk"));
  it("unknown label", () => expect(allergenKey("Banane", { milk: "Milch/Laktose" })).toBeNull());
});

describe("formatTimer", () => {
  it("minutes and seconds", () => expect(formatTimer(90_500)).toBe("1:31"));
  it("never negative", () => expect(formatTimer(-5)).toBe("0:00"));
});
