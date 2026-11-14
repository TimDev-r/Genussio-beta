import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAdminAccess } from "@/lib/admin.functions";
import { AdminImport } from "@/components/AdminImport";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/_authenticated/admin/import")({
  beforeLoad: async () => {
    if (!(await getAdminAccess())) throw redirect({ to: "/app" });
  },
  head: () => pageHead("Inhalte importieren", "Genussio – Angebote, Rezepte und Preise verwalten."),
  component: AdminImport,
});
