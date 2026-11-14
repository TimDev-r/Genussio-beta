import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n, { createI18n, rememberLocale } from "../i18n";
import { getInitialLocale } from "../i18n/server";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfile } from "@/lib/profile";
import { SessionContext } from "@/lib/session";
import { isLocale, setLocale } from "@/i18n";

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("notFound.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("notFound.text")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("notFound.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const { t } = i18n;
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("error.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("error.text")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("error.retry")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("notFound.home")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    // Replace these placeholders with the app's name and description when first building the app.
    // Each content route, / included, must still set its own head(). Never add og:image or
    // twitter:image here: every page without its own would inherit the root's preview image.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Genussio" },
      {
        name: "description",
        content: "Gemeinsam swipen, was es zum Essen gibt – mit den Angeboten der Woche.",
      },
      { name: "author", content: "Genussio" },
      { property: "og:title", content: "Genussio" },
      {
        property: "og:description",
        content: "Gemeinsam swipen, was es zum Essen gibt – mit den Angeboten der Woche.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Google+Sans:wght@500&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  loader: () => ({ locale: getInitialLocale() }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const locale = Route.useLoaderData()?.locale ?? "de-AT";
  return (
    <html lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  const { locale } = Route.useLoaderData();
  const [instance] = useState(() => createI18n(locale));
  const router = useRouter();
  const [sessionState, setSessionState] = useState<{
    user: User | null;
    ready: boolean;
    error: boolean;
  }>({ user: null, ready: false, error: false });

  useEffect(() => {
    let live = true;
    let generation = 0;
    const refresh = async (invalidate = false) => {
      const current = ++generation;
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error && user) throw error;
        if (user) {
          const active = isLocale(instance.language) ? instance.language : locale;
          const profile = await ensureProfile(user, active);
          if (live && current === generation && isLocale(profile.locale))
            setLocale(instance, profile.locale);
        }
        if (!live || current !== generation) return;
        setSessionState({ user, ready: true, error: false });
        if (invalidate) {
          await router.invalidate();
          await queryClient.invalidateQueries();
        }
      } catch {
        if (live && current === generation)
          setSessionState({ user: null, ready: true, error: true });
      }
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        generation++;
        setSessionState({ user: null, ready: true, error: false });
        void router.invalidate();
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        setTimeout(() => {
          if (live) void refresh(true);
        }, 0);
      }
    });
    void refresh();
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, [instance, locale, router, queryClient]);

  useEffect(() => {
    const apply = (lng: string) => {
      document.documentElement.lang = lng;
      document.title = instance.t("meta.title");
    };
    rememberLocale(locale);
    instance.on("languageChanged", apply);
    apply(instance.language);
    return () => instance.off("languageChanged", apply);
  }, [instance, locale]);

  return (
    <I18nextProvider i18n={instance}>
      <QueryClientProvider client={queryClient}>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <SessionContext.Provider value={sessionState}>
          <Outlet />
        </SessionContext.Provider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
