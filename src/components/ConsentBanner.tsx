import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadMetaPixel, metaTrack, onConsentOpen, readConsent, saveConsent } from "@/lib/consent";

/** Cookie banner with two equally prominent choices, plus PageView on route changes after consent. */
export function ConsentBanner() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const first = useRef(true);

  useEffect(() => {
    const choice = readConsent();
    if (choice === null) setOpen(true);
    else if (choice === "all") loadMetaPixel();
    return onConsentOpen(() => setOpen(true));
  }, []);

  useEffect(() => {
    // loadMetaPixel already sends the first PageView
    if (first.current) {
      first.current = false;
      return;
    }
    metaTrack("PageView");
  }, [pathname]);

  if (!open) return null;
  const choose = (c: "all" | "necessary") => {
    saveConsent(c);
    setOpen(false);
  };
  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-text"
      className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-w-[480px] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="rounded-3xl border border-border bg-card p-4 shadow-pop">
        <h2 id="consent-title" className="flex items-center gap-2 font-extrabold">
          <Cookie className="size-5 text-primary" aria-hidden />
          {t("consent.title")}
        </h2>
        <p id="consent-text" className="mt-1 text-sm text-muted-foreground">
          {t("consent.text")}{" "}
          <Link to="/datenschutz" className="font-bold underline">
            {t("footer.privacy")}
          </Link>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11" onClick={() => choose("necessary")}>
            {t("consent.necessary")}
          </Button>
          <Button variant="outline" className="h-11" onClick={() => choose("all")}>
            {t("consent.all")}
          </Button>
        </div>
      </div>
    </div>
  );
}
