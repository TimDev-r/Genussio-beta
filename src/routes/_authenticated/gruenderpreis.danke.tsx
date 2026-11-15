import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppFooter } from "@/components/SiteFooter";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/gruenderpreis/danke")({
  validateSearch: (search: Record<string, unknown>) => ({
    art: search["art"] === "vorgemerkt" ? ("vorgemerkt" as const) : ("bezahlt" as const),
  }),
  head: () => pageHead("Danke!", "Euer Gründerpreis ist gesichert."),
  component: Page,
});

function Page() {
  const { t } = useTranslation();
  const { art } = Route.useSearch();
  const queryClient = useQueryClient();
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["reservation"] });
  }, [queryClient]);
  return (
    <div className="app-frame flex flex-col">
      <main className="flex flex-1 flex-col items-center px-6 pt-16 pb-8 text-center">
        <div className="flex size-20 items-center justify-center rounded-[24px] bg-primary-soft text-primary">
          <PartyPopper className="size-10" aria-hidden />
        </div>
        <h1 className="mt-6 text-3xl font-black">{t("launch.thanksTitle")}</h1>
        <p className="mt-3 max-w-sm leading-relaxed text-muted-foreground">
          {art === "vorgemerkt" ? t("launch.thanksReserved") : t("launch.thanksPaid")}
        </p>
        <ul className="mt-6 w-full max-w-sm space-y-2 text-left text-sm">
          <li className="rounded-2xl bg-card p-3">{t("launch.next1")}</li>
          <li className="rounded-2xl bg-card p-3">{t("launch.next2")}</li>
          <li className="rounded-2xl bg-card p-3">{t("launch.next3")}</li>
        </ul>
        <Button asChild size="lg" className="mt-8 h-12 w-full max-w-sm">
          <Link to="/app">{t("launch.toApp")}</Link>
        </Button>
      </main>
      <AppFooter />
    </div>
  );
}
