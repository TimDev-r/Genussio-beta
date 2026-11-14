/** Scales a recipe quantity from its base servings to the chosen servings. */
export function scaleQuantity(quantity: number | null, baseServings: number, servings: number) {
  if (quantity == null) return null;
  return (quantity * servings) / Math.max(1, baseServings);
}

/** Kitchen-friendly amounts: 512 g → "510 g", 1.5 stk → "1½", 0.25 TL → "¼ TL". */
export function formatAmount(quantity: number | null, unit: string | null, locale: string) {
  if (quantity == null) return "";
  const u = (unit ?? "").trim();
  const lower = u.toLowerCase();
  const num = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);
  if (lower === "g" || lower === "ml") {
    if (quantity >= 1000)
      return `${num(Math.round(quantity / 100) / 10)} ${lower === "g" ? "kg" : "l"}`;
    const step = quantity >= 100 ? 10 : 5;
    return `${num(Math.max(step, Math.round(quantity / step) * step))} ${lower}`;
  }
  const whole = Math.floor(quantity + 1e-9);
  const frac = quantity - whole;
  const fractions: [number, string][] = [
    [0, ""],
    [0.25, "¼"],
    [1 / 3, "⅓"],
    [0.5, "½"],
    [2 / 3, "⅔"],
    [0.75, "¾"],
    [1, ""],
  ];
  const [value, glyph] = fractions.reduce((best, f) =>
    Math.abs(f[0] - frac) < Math.abs(best[0] - frac) ? f : best,
  );
  const w = value === 1 ? whole + 1 : whole;
  let text = w > 0 ? `${w}${glyph}` : glyph || "0";
  if (lower === "stk") text = text === "0" ? "¼" : text;
  const shownUnit = lower === "stk" ? "" : u;
  return shownUnit ? `${text} ${shownUnit}` : text;
}

/** "Milch/Laktose" (label stored on recipes) → "milk" (key used in translations). */
export function allergenKey(label: string, labels: Record<string, string>) {
  const l = label.trim().toLowerCase();
  return Object.keys(labels).find((k) => labels[k]?.toLowerCase() === l) ?? null;
}

export function formatTimer(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
