import { describe, expect, it } from "vitest";
import i18n, { detectLocale, formatDate, formatPrice } from "@/i18n";

describe("locale detection", () => {
  it("German in Austria → de-AT", () => expect(detectLocale(["de-AT"])).toBe("de-AT"));
  it("German without region → de-AT", () => expect(detectLocale(["de"])).toBe("de-AT"));
  it("German in Germany → de-DE", () => expect(detectLocale(["de-DE"])).toBe("de-DE"));
  it("Italian → it", () => expect(detectLocale(["it-IT"])).toBe("it"));
  it("Spanish → es", () => expect(detectLocale(["es-MX"])).toBe("es"));
  it("others → en", () => expect(detectLocale(["fr-FR"])).toBe("en"));
});

describe("formatting", () => {
  it("de-AT shows Jänner", () => expect(formatDate(new Date(2026, 0, 5), "de-AT")).toContain("Jänner"));
  it("prices in euros", () => expect(formatPrice(2.4, "en")).toContain("€"));
});

describe("de-DE", () => {
  it("overrides Austrian words and falls back to de-AT", async () => {
    await i18n.changeLanguage("de-DE");
    expect(i18n.t("landing.sampleDish")).toBe("Kartoffelgulasch mit Tomaten");
    expect(i18n.t("nav.plan")).toBe("Wochenplan");
    await i18n.changeLanguage("de-AT");
    expect(i18n.t("landing.sampleDish")).toContain("Erdäpfel");
  });
});

import { parseAcceptLanguage } from "@/i18n";
describe("accept-language", () => {
  it("orders by quality", () => expect(parseAcceptLanguage("en;q=0.5,de-DE")).toEqual(["de-DE", "en"]));
});
