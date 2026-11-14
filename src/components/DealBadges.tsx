import { useTranslation } from "react-i18next";
import { Tag } from "lucide-react";
import type { DealBadge } from "@/lib/deck.functions";
import { localizedIngredient } from "@/lib/catalog-localization";
import { formatPrice } from "@/i18n";

type IngredientTranslation = {
  ingredient_key: string;
  locale: string;
  display_name: string | null;
};

export function DealBadges({
  badges,
  ingredientTranslations = [],
}: {
  badges: DealBadge[];
  ingredientTranslations?: readonly IngredientTranslation[];
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  if (!badges.length) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {badges.map((b) => {
        const item = localizedIngredient(b.ingredient_key, b.name, ingredientTranslations, lang);
        const store = t(`onboarding.storeNames.${b.store}`, { defaultValue: b.store });
        const price = formatPrice(b.deal_price, lang);
        return (
          <li
            key={b.ingredient_key}
            className="inline-flex w-fit max-w-full items-start gap-1.5 rounded-xl bg-deal-soft px-2.5 py-1 text-xs font-bold text-deal"
          >
            <Tag className="mt-0.5 size-3 shrink-0" aria-hidden />
            <span>
              {b.regular_price != null && b.regular_price > b.deal_price
                ? t("deck.dealBadge", {
                    item,
                    price,
                    regular: formatPrice(b.regular_price, lang),
                    store,
                  })
                : t("deck.dealBadgeShort", { item, price, store })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
