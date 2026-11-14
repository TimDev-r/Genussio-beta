import { createFileRoute } from "@tanstack/react-router";
import { HouseholdSettingsPage } from "@/components/HouseholdSettings";
import { householdQuery } from "@/lib/household-query";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/_authenticated/app/household")({
  loader: ({ context }) => context.queryClient.ensureQueryData(householdQuery()),
  head: () =>
    pageHead(
      "Haushalt",
      "Mitglieder, Einladungen und persönliche Essensvorlieben deines Genussio-Haushalts.",
    ),
  component: HouseholdSettingsPage,
});
