import { describe, expect, it } from "vitest";
import {
  formatQuantity,
  groupByStore,
  shareText,
  sumPrices,
  type ListItem,
} from "@/lib/list-format";

const pieces = (n: number) => `${n} Stück`;
const item = (p: Partial<ListItem>): ListItem => ({
  id: Math.random().toString(),
  store: "hofer",
  ingredient_key: "x",
  display_name: "X",
  quantity: 1,
  unit: "g",
  quantity_text: null,
  aisle: "Sonstiges",
  is_deal: false,
  deal_price: null,
  est_price: 1,
  checked: false,
  checked_by: null,
  is_custom: false,
  is_pantry: false,
  ...p,
});

describe("formatQuantity", () => {
  it("turns grams into kilos", () =>
    expect(formatQuantity(1200, "g", "de-AT", pieces)).toBe("1,2 kg"));
  it("keeps small grams", () => expect(formatQuantity(250, "g", "de-AT", pieces)).toBe("250 g"));
  it("turns ml into litres", () => expect(formatQuantity(1500, "ml", "en", pieces)).toBe("1.5 l"));
  it("counts pieces", () => expect(formatQuantity(2.5, "stk", "de-AT", pieces)).toBe("3 Stück"));
  it("handles no quantity", () => expect(formatQuantity(null, "g", "de-AT", pieces)).toBe(""));
});

describe("groupByStore", () => {
  const items = [
    item({ store: "lidl", aisle: "Trockenwaren", display_name: "Reis", est_price: 0.5 }),
    item({ store: "hofer", aisle: "Tiefkühl", display_name: "Erbsen", est_price: 1 }),
    item({ store: "hofer", aisle: "Obst & Gemüse", display_name: "Zwiebeln", est_price: 0.25 }),
    item({ store: null, is_pantry: true, display_name: "Salz" }),
    item({ store: null, is_custom: true, display_name: "Klopapier" }),
  ];
  it("orders stores by the household's choice and aisles by the shop walk", () => {
    const g = groupByStore(items, ["spar", "hofer", "lidl"]);
    expect(g.map((x) => x.store)).toEqual(["hofer", "lidl"]);
    expect(g[0]?.aisles.map((a) => a.aisle)).toEqual(["Obst & Gemüse", "Tiefkühl"]);
    expect(g[0]?.total).toBe(1.25);
  });
  it("leaves pantry and custom items out", () => {
    const names = groupByStore(items, []).flatMap((g) =>
      g.aisles.flatMap((a) => a.items.map((i) => i.display_name)),
    );
    expect(names).not.toContain("Salz");
    expect(names).not.toContain("Klopapier");
  });
  it("sums prices", () =>
    expect(sumPrices([{ est_price: 0.1 }, { est_price: 0.2 }, { est_price: null }])).toBe(0.3));
});

describe("shareText", () => {
  it("lists open items per store and custom items", () => {
    const items = [
      item({ store: "hofer", display_name: "Zwiebeln", quantity: 1200 }),
      item({ store: "hofer", display_name: "Reis", checked: true }),
    ];
    const text = shareText(
      groupByStore(items, ["hofer"]),
      [item({ is_custom: true, display_name: "Klopapier" })],
      {
        title: "Einkaufsliste",
        store: (s) => s.toUpperCase(),
        name: (i) => i.display_name ?? "",
        qty: (i) => formatQuantity(i.quantity, i.unit, "de-AT", pieces),
        custom: "Eigene Artikel",
      },
    );
    expect(text).toBe(
      "Einkaufsliste\n\n*HOFER*\n- Zwiebeln (1,2 kg)\n\n*Eigene Artikel*\n- Klopapier",
    );
  });
});

import { isoLocal, startOptions } from "@/lib/plan-dates";
describe("plan start options", () => {
  it("today, tomorrow and next Monday", () => {
    // Saturday 14 Nov 2026
    const o = startOptions(new Date(2026, 10, 14, 18, 0));
    expect(o.map((x) => x.date)).toEqual(["2026-11-14", "2026-11-15", "2026-11-16"]);
  });
  it("on a Monday, next Monday is a week later", () => {
    expect(startOptions(new Date(2026, 10, 16, 9, 0))[2].date).toBe("2026-11-23");
  });
  it("formats local dates", () => expect(isoLocal(new Date(2026, 0, 5))).toBe("2026-01-05"));
});

import i18nDefault from "@/i18n";
describe("de-DE deal wording", () => {
  it("says Angebot in Germany and Aktion in Austria", async () => {
    await i18nDefault.changeLanguage("de-DE");
    expect(i18nDefault.t("deck.source.deal")).toBe("Angebot");
    expect(i18nDefault.t("plan.leftovers")).toBe("Resteessen");
    await i18nDefault.changeLanguage("de-AT");
    expect(i18nDefault.t("deck.source.deal")).toBe("Aktion");
  });
});
