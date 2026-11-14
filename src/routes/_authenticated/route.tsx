import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfile } from "@/lib/profile";
import { getInitialLocale } from "@/i18n/server";
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/login", search: { redirect: location.pathname, code: "" } });
    await ensureProfile(user, getInitialLocale());
  },
  component: () => <Outlet />,
});
