import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { PlanStart, WeekPlan } from "@/components/WeekPlan";
import { planQuery } from "@/lib/plan-query";

export const Route = createFileRoute("/_authenticated/app/plan")({
  head: () => ({
    meta: [
      { title: "Wochenplan – Genussio" },
      { name: "description", content: "Genussio – euer Haushalt entscheidet gemeinsam." },
      { property: "og:title", content: "Wochenplan – Genussio" },
      { property: "og:description", content: "Genussio – euer Haushalt entscheidet gemeinsam." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(planQuery()),
  component: Page,
});

function Page() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(planQuery());
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["plan"] });
    void queryClient.invalidateQueries({ queryKey: ["list"] });
  };

  if (!data.householdId) {
    return (
      <EmptyState icon={CalendarDays} title={t("empty.plan.title")} text={t("empty.plan.text")} />
    );
  }

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
      <h1 className="text-xl font-extrabold">{t("plan.title")}</h1>
      {data.entries.length > 0 ? (
        <WeekPlan
          householdId={data.householdId}
          budget={data.budget}
          entries={data.entries}
          options={data.options}
          listTotal={data.listTotal}
          dealsUsed={data.dealsUsed}
          translations={data.translations}
          ingredientTranslations={data.ingredientTranslations}
        />
      ) : data.options.length === 0 ? (
        <div className="flex flex-1 flex-col items-center">
          <EmptyState
            icon={CalendarDays}
            title={t("empty.plan.title")}
            text={t("plan.noMatches")}
          />
          <Button asChild>
            <Link to="/app">{t("plan.toSwipe")}</Link>
          </Button>
        </div>
      ) : (
        <PlanStart
          matchCount={data.options.length}
          householdId={data.householdId}
          onPlanned={refresh}
        />
      )}
    </div>
  );
}
