import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CalendarDays, Clock, Heart, Star } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { DealBadges } from "@/components/DealBadges";
import { Button } from "@/components/ui/button";
import { matchesQuery } from "@/lib/deck-query";
import { localizedRecipe } from "@/lib/catalog-localization";
import { formatPrice } from "@/i18n";
import placeholder from "@/assets/recipe-placeholder.jpg";

export const Route = createFileRoute("/_authenticated/app/matches")({
  head: () => ({
    meta: [
      { title: "Matches – Genussio" },
      { name: "description", content: "Genussio – euer Haushalt entscheidet gemeinsam." },
      { property: "og:title", content: "Matches – Genussio" },
      { property: "og:description", content: "Genussio – euer Haushalt entscheidet gemeinsam." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(matchesQuery()),
  component: Page,
});

function Page() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { data } = useSuspenseQuery(matchesQuery());
  const count = data.matches.length;
  const missing = Math.max(0, data.dinnersPerWeek - count);

  if (count === 0) {
    return (
      <EmptyState icon={Heart} title={t("empty.matches.title")} text={t("empty.matches.text")} />
    );
  }

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
      <h1 className="text-xl font-extrabold">{t("matches.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("matches.count", { count })}</p>

      <div className="mt-4 rounded-3xl border border-border bg-card p-4">
        {missing === 0 ? (
          <Button asChild size="lg" className="h-14 w-full text-base">
            <Link to="/app/plan">
              <CalendarDays />
              {t("matches.makePlan")}
            </Link>
          </Button>
        ) : (
          <>
            <p className="font-bold">{t("matches.missing", { count: missing })}</p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={data.dinnersPerWeek}
              aria-valuenow={count}
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(count / Math.max(1, data.dinnersPerWeek)) * 100}%` }}
              />
            </div>
            <Link
              to="/app/plan"
              className="mt-3 inline-block text-sm font-bold text-primary underline"
            >
              {t("matches.planAnyway")}
            </Link>
          </>
        )}
      </div>

      <ul className="mt-4 space-y-3">
        {data.matches.map((m) => {
          const r = localizedRecipe(
            { ...m, steps: null },
            data.translations.filter((x) => x.recipe_id === m.recipe_id),
            lang,
          );
          return (
            <li
              key={m.recipe_id}
              className="overflow-hidden rounded-3xl border border-border bg-card shadow-card"
            >
              <div className="relative">
                <Link to="/rezept/$id" params={{ id: m.recipe_id }} tabIndex={-1}>
                  <img
                    src={m.image_url || placeholder}
                    alt=""
                    className="aspect-[16/9] w-full object-cover"
                  />
                </Link>
                {m.is_favorite && (
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-extrabold text-primary-foreground">
                    <Star className="size-3.5 fill-current" aria-hidden />
                    {t("matches.favorite")}
                  </span>
                )}
              </div>
              <div className="space-y-2 p-4">
                <h2 className="text-lg leading-tight font-extrabold">
                  <Link to="/rezept/$id" params={{ id: m.recipe_id }} className="hover:underline">
                    {r.title}
                  </Link>
                </h2>
                <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                  {m.prep_minutes != null && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" aria-hidden />
                      {t("deck.minutes", { count: m.prep_minutes })}
                    </span>
                  )}
                  {m.est_cost_per_portion != null && (
                    <span>
                      {t("deck.perPortionApprox", {
                        price: formatPrice(Number(m.est_cost_per_portion), lang),
                      })}
                    </span>
                  )}
                </p>
                {m.likers && m.likers.length > 0 && (
                  <p className="inline-flex items-center gap-1.5 text-sm font-bold">
                    <Heart className="size-4 fill-deal text-deal" aria-hidden />
                    {t("matches.likedBy", { names: m.likers.join(", ") })}
                  </p>
                )}
                <DealBadges
                  badges={m.dealBadges}
                  ingredientTranslations={data.ingredientTranslations}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
