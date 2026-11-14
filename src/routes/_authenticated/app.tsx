import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CalendarDays, Flame, Heart, Home, ShoppingCart } from "lucide-react";

import { householdQuery } from "@/lib/household-query";
import { MatchWatcher } from "@/components/MatchWatcher";
export const Route = createFileRoute("/_authenticated/app")({
  beforeLoad: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData(householdQuery());
    if (!data.membership) throw redirect({ to: "/start" });
  },
  component: AppShell,
});

const tabs = [
  { to: "/app", key: "swipe", icon: Flame, exact: true },
  { to: "/app/matches", key: "matches", icon: Heart },
  { to: "/app/plan", key: "plan", icon: CalendarDays },
  { to: "/app/list", key: "list", icon: ShoppingCart },
  { to: "/app/household", key: "household", icon: Home },
] as const;

function AppShell() {
  const { t } = useTranslation();
  const { data } = useSuspenseQuery(householdQuery());
  return (
    <div className="app-frame flex flex-col pb-20">
      {data.household && <MatchWatcher householdId={data.household.id} />}
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-[480px] border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-5">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <Link
                to={tab.to}
                activeOptions={{ exact: "exact" in tab }}
                className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground data-[status=active]:text-primary"
              >
                <tab.icon className="size-6" aria-hidden />
                <span className="truncate">{t(`nav.${tab.key}`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
