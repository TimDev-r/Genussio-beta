import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Clock,
  Minus,
  Plus,
  RefreshCw,
  Repeat,
  Soup,
  Star,
  Tag,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DealBadges } from "@/components/DealBadges";
import {
  createPlan,
  moveEntry,
  updateEntry,
  type PlanEntry,
  type SwapOption,
} from "@/lib/plan.functions";
import { localizedRecipe } from "@/lib/catalog-localization";
import { startOptions } from "@/lib/plan-dates";
import { trackEvent } from "@/lib/track-event";
import { formatPrice } from "@/i18n";
import { cn } from "@/lib/utils";
import placeholder from "@/assets/recipe-placeholder.jpg";

type Translation = {
  recipe_id: string;
  locale: string;
  title: string | null;
  description: string | null;
  steps: unknown;
};

export type WeekPlanProps = {
  householdId: string;
  budget: number | null;
  entries: PlanEntry[];
  options: SwapOption[];
  listTotal: number;
  dealsUsed: number;
  translations: Translation[];
  ingredientTranslations: { ingredient_key: string; locale: string; display_name: string | null }[];
};

function dayLabel(iso: string, locale: string) {
  const d = new Date(`${iso}T12:00:00`);
  const wd = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d).replace(/\.$/, "");
  const dm = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" }).format(d);
  return `${wd}, ${dm}`;
}

export function PlanStart({
  matchCount,
  onPlanned,
  householdId,
  compact = false,
}: {
  matchCount: number;
  onPlanned: () => void;
  householdId: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);

  async function run(date: string, replace: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await createPlan({ data: { startDate: date, replace } });
      if (res.status === "exists") {
        setConfirm(date);
        return;
      }
      void trackEvent(
        "plan_created",
        { start_date: date, dinners: res.count, replaced: replace },
        householdId,
      );
      onPlanned();
    } catch {
      setError(t("plan.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={cn(!compact && "mt-4 rounded-3xl border border-border bg-card p-5 shadow-card")}
    >
      <h2 className="text-lg font-extrabold">{t("plan.startQuestion")}</h2>
      {!compact && (
        <p className="mt-1 text-sm text-muted-foreground">
          {t("plan.startHint", { count: matchCount })}
        </p>
      )}
      <div className="mt-4 grid gap-2">
        {startOptions().map((o) => (
          <Button
            key={o.key}
            variant={o.key === "today" ? "default" : "outline"}
            className="h-12 justify-start text-base"
            disabled={busy}
            onClick={() => void run(o.date, false)}
          >
            <CalendarDays />
            {t(`plan.start.${o.key}`)}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm font-bold text-destructive">
          {error}
        </p>
      )}
      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("plan.replaceTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("plan.replaceText")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("plan.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const d = confirm;
                setConfirm(null);
                if (d) void run(d, true);
              }}
            >
              {t("plan.replace")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export function WeekPlan(props: WeekPlanProps) {
  const { householdId, budget, entries, options, listTotal, dealsUsed, translations } = props;
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const queryClient = useQueryClient();
  const [swapFor, setSwapFor] = useState<PlanEntry | null>(null);
  const [replan, setReplan] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["plan"] }),
      queryClient.invalidateQueries({ queryKey: ["list"] }),
    ]);

  async function change(id: string, action: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    setError("");
    try {
      await fn();
      void trackEvent("plan_changed", { action }, householdId);
      await refresh();
    } catch {
      setError(t("plan.error"));
    } finally {
      setBusyId(null);
    }
  }

  const title = (recipeId: string | null, fallback: string | null) =>
    recipeId
      ? localizedRecipe(
          { title: fallback, description: null, steps: null },
          translations.filter((x) => x.recipe_id === recipeId),
          lang,
        ).title
      : fallback;

  const overBudget = budget != null && listTotal > budget;

  return (
    <div className="flex flex-col">
      <section className="mt-4 grid grid-cols-2 gap-3">
        <div
          className={cn(
            "rounded-3xl border border-border bg-card p-4",
            overBudget && "border-destructive",
          )}
        >
          <p className="text-xs font-bold text-muted-foreground uppercase">{t("plan.weekCost")}</p>
          <p className="mt-1 text-xl leading-tight font-extrabold">
            {t("plan.totalLine", { total: formatPrice(listTotal, lang) })}
          </p>
          {budget != null && (
            <p
              className={cn(
                "text-sm text-muted-foreground",
                overBudget && "font-bold text-destructive",
              )}
            >
              {t("plan.budgetLine", { budget: formatPrice(budget, lang) })}
            </p>
          )}
        </div>
        <div className="rounded-3xl border border-border bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase">
            {t("plan.dealsTitle")}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-lg font-extrabold text-deal">
            <Tag className="size-4" aria-hidden />
            {t("plan.dealsUsed", { count: dealsUsed })}
          </p>
        </div>
      </section>

      <ul className="mt-4 space-y-3">
        {entries.map((e, i) => {
          const busy = busyId === e.id;
          const name = title(e.recipe_id, e.title);
          return (
            <li
              key={e.id}
              className={cn(
                "overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-opacity",
                busy && "opacity-60",
              )}
            >
              <div className="flex items-center justify-between px-4 pt-3">
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-primary">
                  {dayLabel(e.plan_date, lang)}
                </h2>
                <div className="flex gap-1">
                  <IconButton
                    label={t("plan.moveUp")}
                    disabled={i === 0 || busy}
                    onClick={() =>
                      void change(e.id, "move", () =>
                        moveEntry({ data: { id: e.id, direction: -1 } }),
                      )
                    }
                  >
                    <ArrowUp />
                  </IconButton>
                  <IconButton
                    label={t("plan.moveDown")}
                    disabled={i === entries.length - 1 || busy}
                    onClick={() =>
                      void change(e.id, "move", () =>
                        moveEntry({ data: { id: e.id, direction: 1 } }),
                      )
                    }
                  >
                    <ArrowDown />
                  </IconButton>
                </div>
              </div>

              {e.is_leftover_day ? (
                <div className="flex items-center gap-3 p-4">
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Soup className="size-8" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">{t("plan.leftovers")}</p>
                    <p className="text-sm text-muted-foreground">{t("plan.leftoversText")}</p>
                  </div>
                </div>
              ) : e.recipe_id ? (
                <div className="flex gap-3 p-4">
                  <img
                    src={e.image_url || placeholder}
                    alt=""
                    className="size-20 shrink-0 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="leading-tight font-extrabold">{name}</p>
                    <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                      {e.prep_minutes != null && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" aria-hidden />
                          {t("deck.minutes", { count: e.prep_minutes })}
                        </span>
                      )}
                      {e.est_cost_per_portion != null && (
                        <span>
                          {t("plan.dayCost", {
                            price: formatPrice(Number(e.est_cost_per_portion) * e.servings, lang),
                          })}
                        </span>
                      )}
                    </p>
                    <DealBadges
                      badges={e.dealBadges.slice(0, 1)}
                      ingredientTranslations={props.ingredientTranslations}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <p className="font-extrabold">{t("plan.emptyDay")}</p>
                  <p className="text-sm text-muted-foreground">{t("plan.emptyDayText")}</p>
                </div>
              )}

              <div className="flex items-center gap-1 border-t border-border px-2 py-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-2"
                  disabled={busy}
                  onClick={() => setSwapFor(e)}
                >
                  <Repeat />
                  {e.recipe_id ? t("plan.swap") : t("plan.choose")}
                </Button>
                {!e.is_leftover_day && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-2"
                    disabled={busy}
                    onClick={() =>
                      void change(e.id, "leftovers", () =>
                        updateEntry({ data: { id: e.id, leftover: true } }),
                      )
                    }
                  >
                    <Soup />
                    {t("plan.leftovers")}
                  </Button>
                )}
                {!e.is_leftover_day && e.recipe_id && (
                  <div className="ml-auto flex items-center" aria-label={t("plan.servings")}>
                    <Users className="size-4 text-muted-foreground" aria-hidden />
                    <IconButton
                      label={t("plan.lessServings")}
                      disabled={busy || e.servings <= 1}
                      onClick={() =>
                        void change(e.id, "servings", () =>
                          updateEntry({ data: { id: e.id, servings: e.servings - 1 } }),
                        )
                      }
                    >
                      <Minus />
                    </IconButton>
                    <span className="w-4 text-center font-extrabold" aria-live="polite">
                      {e.servings}
                    </span>
                    <IconButton
                      label={t("plan.moreServings")}
                      disabled={busy || e.servings >= 12}
                      onClick={() =>
                        void change(e.id, "servings", () =>
                          updateEntry({ data: { id: e.id, servings: e.servings + 1 } }),
                        )
                      }
                    >
                      <Plus />
                    </IconButton>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="alert" className="mt-3 text-center text-sm font-bold text-destructive">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col items-center gap-3">
        <Button asChild size="lg" className="h-12 w-full">
          <Link to="/app/list">{t("plan.toList")}</Link>
        </Button>
        <Button variant="ghost" onClick={() => setReplan((r) => !r)}>
          <RefreshCw />
          {t("plan.replan")}
        </Button>
        {replan && (
          <div className="w-full rounded-3xl border border-border bg-card p-4">
            <PlanStart
              compact
              matchCount={options.length + entries.length}
              householdId={householdId}
              onPlanned={() => {
                setReplan(false);
                void refresh();
              }}
            />
          </div>
        )}
      </div>

      <Dialog open={swapFor !== null} onOpenChange={(o) => !o && setSwapFor(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("plan.swapTitle")}</DialogTitle>
            <DialogDescription>{t("plan.swapText")}</DialogDescription>
          </DialogHeader>
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("plan.noOptions")}{" "}
              <Link to="/app" className="font-bold text-primary underline">
                {t("plan.toSwipe")}
              </Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {options.map((o) => (
                <li key={o.recipe_id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl border border-border p-2 text-left hover:bg-muted"
                    onClick={() => {
                      const entry = swapFor;
                      setSwapFor(null);
                      if (entry)
                        void change(entry.id, "swap", () =>
                          updateEntry({ data: { id: entry.id, recipeId: o.recipe_id } }),
                        );
                    }}
                  >
                    <img
                      src={o.image_url || placeholder}
                      alt=""
                      className="size-14 rounded-xl object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 font-bold">
                        {o.is_favorite && (
                          <Star className="size-3.5 fill-primary text-primary" aria-hidden />
                        )}
                        <span className="truncate">{title(o.recipe_id, o.title)}</span>
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {o.prep_minutes != null && t("deck.minutes", { count: o.prep_minutes })}
                        {o.est_cost_per_portion != null &&
                          ` · ${t("deck.perPortion", { price: formatPrice(Number(o.est_cost_per_portion), lang) })}`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-30 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
