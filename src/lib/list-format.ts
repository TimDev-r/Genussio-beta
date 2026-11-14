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

export type ListItem = {
  id: string;
  store: string | null;
  ingredient_key: string | null;
  display_name: string | null;
  quantity: number | null;
  unit: string | null;
  quantity_text: string | null;
  aisle: string | null;
  is_deal: boolean;
  deal_price: number | null;
  est_price: number | null;
  checked: boolean;
  checked_by: string | null;
  is_custom: boolean;
  is_pantry: boolean;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 1200 g → "1,2 kg", 3 stk → "3 Stück", 250 ml → "250 ml". `pieces` gives the localized word. */
export function formatQuantity(
  quantity: number | null,
  unit: string | null,
  locale: string,
  pieces: (count: number) => string,
) {
  if (quantity == null) return "";
  const num = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);
  const u = (unit ?? "").toLowerCase();
  if (u === "g" && quantity >= 1000) return `${num(round1(quantity / 1000))} kg`;
  if (u === "ml" && quantity >= 1000) return `${num(round1(quantity / 1000))} l`;
  if (u === "stk") {
    const n = Math.ceil(quantity);
    return pieces(n);
  }
  if (u === "g" || u === "ml") return `${num(Math.round(quantity))} ${u}`;
  return u ? `${num(round1(quantity))} ${unit}` : num(round1(quantity));
}

export function aisleRank(aisle: string | null) {
  const i = AISLES.indexOf((aisle ?? "Sonstiges") as (typeof AISLES)[number]);
  return i === -1 ? AISLES.length : i;
}

export type StoreGroup = {
  store: string;
  total: number;
  aisles: { aisle: string; items: ListItem[] }[];
};

/** Groups the bought items by store, then aisle, in the household's store order. */
export function groupByStore(items: readonly ListItem[], storeOrder: readonly string[]) {
  const shop = items.filter((i) => !i.is_custom && !i.is_pantry);
  const stores = [...new Set(shop.map((i) => i.store ?? "other"))].sort((a, b) => {
    const ia = storeOrder.indexOf(a);
    const ib = storeOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
  });
  return stores.map<StoreGroup>((store) => {
    const inStore = shop.filter((i) => (i.store ?? "other") === store);
    const aisles = [...new Set(inStore.map((i) => i.aisle ?? "Sonstiges"))].sort(
      (a, b) => aisleRank(a) - aisleRank(b),
    );
    return {
      store,
      total: sumPrices(inStore),
      aisles: aisles.map((aisle) => ({
        aisle,
        items: inStore
          .filter((i) => (i.aisle ?? "Sonstiges") === aisle)
          .sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? "")),
      })),
    };
  });
}

export function sumPrices(items: readonly { est_price: number | null }[]) {
  return Math.round(items.reduce((s, i) => s + Number(i.est_price ?? 0), 0) * 100) / 100;
}

/** Plain-text list for WhatsApp: one block per store, unticked items only. */
export function shareText(
  groups: readonly StoreGroup[],
  custom: readonly ListItem[],
  labels: {
    title: string;
    store: (s: string) => string;
    name: (i: ListItem) => string;
    qty: (i: ListItem) => string;
    custom: string;
  },
) {
  const lines = [labels.title];
  for (const g of groups) {
    const open = g.aisles.flatMap((a) => a.items).filter((i) => !i.checked);
    if (!open.length) continue;
    lines.push("", `*${labels.store(g.store)}*`);
    for (const i of open) {
      const q = labels.qty(i);
      lines.push(`- ${labels.name(i)}${q ? ` (${q})` : ""}`);
    }
  }
  const openCustom = custom.filter((i) => !i.checked);
  if (openCustom.length) {
    lines.push("", `*${labels.custom}*`);
    for (const i of openCustom) lines.push(`- ${labels.name(i)}`);
  }
  return lines.join("\n");
}
