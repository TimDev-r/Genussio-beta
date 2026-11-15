import { createFileRoute } from "@tanstack/react-router";
import { HouseholdSettingsPage } from "@/components/HouseholdSettings";
import { FeedbackCard } from "@/components/FeedbackCard";
import { Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { LaunchPriceBanner } from "@/components/LaunchPriceBanner";
import { DeleteAccount } from "@/components/DeleteAccount";
import { BarChart3 } from "lucide-react";
import { getAdminAccess } from "@/lib/admin.functions";
import { householdQuery } from "@/lib/household-query";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/_authenticated/app/household")({
  loader: ({ context }) => context.queryClient.ensureQueryData(householdQuery()),
  head: () =>
    pageHead(
      "Haushalt",
      "Mitglieder, Einladungen und persönliche Essensvorlieben deines Genussio-Haushalts.",
    ),
  component: HouseholdPage,
});

function HouseholdPage() {
  const { data } = useSuspenseQuery(householdQuery());
  const me = data.membership?.user_id;
  const lastAdult = !data.members.some((m) => m.user_id && m.user_id !== me);
  return (
    <>
      <LaunchPriceBanner dismissible={false} className="mx-6 mt-6" />
      <HouseholdSettingsPage />
      <FeedbackCard />
      <AdminLink />
      <DeleteAccount lastAdult={lastAdult} />
    </>
  );
}

function AdminLink() {
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => getAdminAccess(),
    staleTime: 10 * 60_000,
  });
  if (!isAdmin) return null;
  return (
    <div className="px-6 pb-8">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground underline"
      >
        <BarChart3 className="size-4" aria-hidden />
        Admin-Dashboard
      </Link>
    </div>
  );
}
