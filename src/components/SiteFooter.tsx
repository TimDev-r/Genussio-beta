import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LanguagePicker } from "./LanguagePicker";
import { openConsentSettings } from "@/lib/consent";

/** Legal links, cookie settings and the beta disclaimer. `compact` is the in-app version. */
export function LegalLinks({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <nav className={`flex flex-wrap gap-x-2 font-semibold text-foreground ${className}`}>
      <Link to="/impressum" className="tap inline-flex items-center px-2">
        {t("footer.imprint")}
      </Link>
      <Link to="/datenschutz" className="tap inline-flex items-center px-2">
        {t("footer.privacy")}
      </Link>
      <button
        type="button"
        onClick={openConsentSettings}
        className="tap inline-flex items-center px-2"
      >
        {t("footer.cookies")}
      </button>
      <a href="mailto:hallo@genussio.at" className="tap inline-flex items-center px-2">
        {t("footer.contact")}
      </a>
    </nav>
  );
}

export function BetaDisclaimer({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return <p className={`text-xs text-muted-foreground ${className}`}>{t("footer.disclaimer")}</p>;
}

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-12 border-t border-border px-6 py-8 text-sm text-muted-foreground">
      <LegalLinks />
      <BetaDisclaimer className="mt-4 px-2" />
      <div className="mt-4 flex items-center justify-between gap-4">
        <LanguagePicker />
        <span>{t("footer.rights", { year: new Date().getFullYear() })}</span>
      </div>
    </footer>
  );
}

export function AppFooter() {
  return (
    <footer className="mt-6 border-t border-border px-4 py-5 text-xs">
      <LegalLinks className="text-muted-foreground" />
      <BetaDisclaimer className="mt-2 px-2" />
    </footer>
  );
}
