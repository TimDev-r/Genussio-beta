import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Clock, SearchX } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { DeckAdjustedNote } from "@/components/DeckAdjustedNote";
import { getDeck, weekRange } from "@/lib/deck.functions";
import { householdQuery } from "@/lib/household-query";
import { localizedRecipe } from "@/lib/catalog-localization";
import { formatPrice } from "@/i18n";
import placeholder from "@/assets/recipe-placeholder.jpg";

const deckQuery = () => queryOptions({ queryKey: ["deck"], queryFn: () => getDeck() });

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Swipen – Genussio" },
      { name: "description", content: "Genussio – euer Haushalt entscheidet gemeinsam." },
      { property: "og:title", content: "Swipen – Genussio" },
      { property: "og:description", content: "Genussio – euer Haushalt entscheidet gemeinsam." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(deckQuery()),
  component: Page,
});

function Page() {
  const { t, i18n } = useTranslation();
  const { data } = useSuspenseQuery(deckQuery());
  const { data: householdData } = useSuspenseQuery(householdQuery());
  const lang = i18n.language;
  return (
    <div className="flex flex-1 flex-col px-4 pt-6">
      {householdData.household && <DeckAdjustedNote householdId={householdData.household.id} />}
      {data.weekStart && (
        <h1 className="text-xl font-extrabold">{t("deck.week", weekRange(data.weekStart, lang))}</h1>
      )}
      {data.cards.length === 0 ? (
        <EmptyState icon={SearchX} title={t("deck.emptyTitle")} text={t("deck.emptyText")} />
      ) : (
        <ul className="mt-4 space-y-3">
          {data.cards.map((c) => {
            const r = localizedRecipe({ ...c, steps: null }, data.translations.filter((x) => x.recipe_id === c.recipe_id), lang);
            return (
              <li key={c.id} className="flex gap-3 overflow-hidden rounded-2xl border border-border bg-card p-2">
                <img src={c.image_url || placeholder} alt="" className="size-20 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                    {t(`deck.source.${c.source}`)}
                  </span>
                  <p className="mt-1 truncate font-bold">{r.title}</p>
                  <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                    {c.prep_minutes != null && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" aria-hidden />
                        {t("deck.minutes", { count: c.prep_minutes })}
                      </span>
                    )}
                    {c.est_cost_per_portion != null && (
                      <span>{t("deck.perPortion", { price: formatPrice(Number(c.est_cost_per_portion), lang) })}</span>
                    )}
                    {c.deal_count > 0 && <span>{t("deck.deals", { count: c.deal_count })}</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
