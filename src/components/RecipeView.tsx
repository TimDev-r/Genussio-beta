import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, ChefHat, Clock, Minus, Plus, SearchX, Tag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { CookMode } from "@/components/CookMode";
import { setCooked, type getRecipe, type RecipeStep } from "@/lib/recipe.functions";
import { localizedIngredient, localizedRecipe } from "@/lib/catalog-localization";
import { allergenKey, formatAmount, scaleQuantity } from "@/lib/recipe-format";
import { trackEvent } from "@/lib/track-event";
import { formatPrice } from "@/i18n";
import deAT from "@/i18n/locales/de-AT";
import placeholder from "@/assets/recipe-placeholder.jpg";

export type RecipeData = Awaited<ReturnType<typeof getRecipe>>;

export function RecipeView({ id, data }: { id: string; data: RecipeData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [servings, setServings] = useState(data?.defaultServings ?? 4);
  const [cooking, setCooking] = useState(false);
  const viewed = useRef(false);

  useEffect(() => {
    if (!data || viewed.current) return;
    viewed.current = true;
    void trackEvent("recipe_viewed", { recipe_id: id }, data.householdId ?? undefined);
  }, [data, id]);

  const back = () => {
    if (window.history.length > 1) router.history.back();
    else void router.navigate({ to: "/app/plan" });
  };

  if (!data) {
    return (
      <div className="app-frame flex flex-col items-center">
        <EmptyState icon={SearchX} title={t("recipe.notFound")} text="" />
        <Button asChild>
          <Link to="/app">{t("recipe.toApp")}</Link>
        </Button>
      </div>
    );
  }

  const { recipe, ingredients } = data;
  const r = localizedRecipe(recipe, data.translations, lang);
  // Translated steps may lack timers; keep the timer from the original step at the same position.
  const translated = Array.isArray(r.steps) ? (r.steps as RecipeStep[]) : [];
  const steps: RecipeStep[] = translated.length
    ? translated.map((s, i) => ({
        text: s.text,
        timer_minutes: s.timer_minutes ?? recipe.steps[i]?.timer_minutes,
      }))
    : recipe.steps;
  const base = recipe.base_servings || 4;
  const allergenLabels = deAT.onboarding.allergen as Record<string, string>;
  const toBuy = ingredients.filter((i) => !i.is_pantry);
  const pantry = ingredients.filter((i) => i.is_pantry);

  const ingredientRow = (i: (typeof ingredients)[number]) => (
    <li key={i.id} className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="font-bold">
          {localizedIngredient(i.ingredient_key, i.display_name, data.ingredientTranslations, lang)}
        </p>
        {i.deal && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-deal-soft px-2 py-0.5 text-xs font-bold text-deal">
            <Tag className="size-3" aria-hidden />
            {t("deck.dealBadgeShort", {
              item: t("recipe.deal"),
              price: formatPrice(i.deal.deal_price, lang),
              store: t(`onboarding.storeNames.${i.deal.store}`, { defaultValue: i.deal.store }),
            })}
          </span>
        )}
      </div>
      <span className="shrink-0 font-bold text-muted-foreground tabular-nums">
        {formatAmount(scaleQuantity(i.quantity, base, servings), i.unit, lang)}
      </span>
    </li>
  );

  async function markCooked() {
    if (data?.entry && !data.entry.cooked_at) {
      try {
        await setCooked({ data: { entryId: data.entry.id, cooked: true } });
        void queryClient.invalidateQueries({ queryKey: ["plan"] });
        void queryClient.invalidateQueries({ queryKey: ["recipe", id] });
      } catch {
        /* the rating still counts */
      }
    }
  }

  return (
    <div className="app-frame flex flex-col pb-28">
      <div className="relative">
        <img
          src={recipe.image_url || placeholder}
          alt=""
          className="aspect-[4/3] w-full object-cover"
        />
        <button
          type="button"
          onClick={back}
          aria-label={t("recipe.back")}
          className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 flex size-11 items-center justify-center rounded-full bg-card/95 shadow-card"
        >
          <ArrowLeft className="size-5" />
        </button>
        {data.entry?.cooked_at && (
          <span className="absolute right-4 bottom-4 inline-flex items-center gap-1 rounded-full bg-deal px-3 py-1 text-sm font-extrabold text-deal-foreground">
            <Check className="size-4" strokeWidth={3} aria-hidden />
            {t("plan.cooked")}
          </span>
        )}
      </div>

      <div className="px-4 pt-5">
        <h1 className="text-2xl leading-tight font-extrabold">{r.title}</h1>
        {r.description && <p className="mt-2 text-muted-foreground">{r.description}</p>}
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-muted-foreground">
          {recipe.prep_minutes != null && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-4" aria-hidden />
              {t("deck.minutes", { count: recipe.prep_minutes })}
            </span>
          )}
          {data.costPerPortion != null && (
            <span>
              {t("deck.perPortionApprox", { price: formatPrice(data.costPerPortion, lang) })}
            </span>
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(recipe.diet_tags ?? [])
            .filter((d) => d === "vegan" || d === "vegetarisch")
            .map((d) => (
              <span
                key={d}
                className="rounded-full bg-deal-soft px-2.5 py-0.5 text-xs font-bold text-deal"
              >
                {t(`onboarding.diets.${d}`)}
              </span>
            ))}
          {(recipe.allergens ?? []).map((a) => {
            const key = allergenKey(a, allergenLabels);
            return (
              <span
                key={a}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground"
              >
                {key ? t(`onboarding.allergen.${key}`) : a}
              </span>
            );
          })}
        </div>

        <section className="mt-6 rounded-3xl border border-border bg-card px-4 py-3 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">{t("deck.ingredients")}</h2>
            <div className="flex items-center gap-1" role="group" aria-label={t("plan.servings")}>
              <Users className="mr-1 size-4 text-muted-foreground" aria-hidden />
              <button
                type="button"
                aria-label={t("plan.lessServings")}
                disabled={servings <= 1}
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                className="flex size-9 items-center justify-center rounded-full border border-border disabled:opacity-30"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-16 text-center font-extrabold" aria-live="polite">
                {t("recipe.servings", { count: servings })}
              </span>
              <button
                type="button"
                aria-label={t("plan.moreServings")}
                disabled={servings >= 12}
                onClick={() => setServings((s) => Math.min(12, s + 1))}
                className="flex size-9 items-center justify-center rounded-full border border-border disabled:opacity-30"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
          <ul className="mt-1 divide-y divide-border">{toBuy.map(ingredientRow)}</ul>
          {pantry.length > 0 && (
            <>
              <h3 className="mt-3 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                {t("recipe.pantry")}
              </h3>
              <ul className="divide-y divide-border">{pantry.map(ingredientRow)}</ul>
            </>
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-extrabold">{t("recipe.steps")}</h2>
          <ol className="mt-3 space-y-4">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="pt-1">
                  <p>{s.text}</p>
                  {s.timer_minutes ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-primary">
                      <Clock className="size-3.5" aria-hidden />
                      {t("deck.minutes", { count: s.timer_minutes })}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {steps.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[480px] bg-gradient-to-t from-background via-background to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            size="lg"
            className="h-14 w-full text-lg"
            onClick={() => {
              setCooking(true);
              void trackEvent(
                "cook_mode_started",
                { recipe_id: id },
                data.householdId ?? undefined,
              );
            }}
          >
            <ChefHat />
            {t("recipe.cookNow")}
          </Button>
        </div>
      )}

      {cooking && (
        <CookMode
          title={r.title ?? ""}
          steps={steps}
          onClose={() => setCooking(false)}
          onFinished={() => {
            void trackEvent(
              "recipe_cooked",
              { recipe_id: id, in_plan: !!data.entry },
              data.householdId ?? undefined,
            );
            void markCooked();
          }}
          onRated={(rating, comment) =>
            void trackEvent(
              "recipe_rated",
              { recipe_id: id, rating, comment },
              data.householdId ?? undefined,
            )
          }
        />
      )}
    </div>
  );
}
