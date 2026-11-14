import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAdminAccess } from "@/lib/admin.functions";
import { AdminDashboard } from "@/components/AdminDashboard";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: async () => {
    if (!(await getAdminAccess())) throw redirect({ to: "/app" });
  },
  head: () => pageHead("Beta-Dashboard", "Genussio – Zahlen der Beta."),
  component: AdminDashboard,
});
