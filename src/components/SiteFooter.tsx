import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LanguagePicker } from "./LanguagePicker";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-12 border-t border-border px-6 py-8 text-sm text-muted-foreground">
      <nav className="flex flex-wrap gap-x-2 font-semibold text-foreground">
        <Link to="/impressum" className="tap inline-flex items-center px-2">{t("footer.imprint")}</Link>
        <Link to="/datenschutz" className="tap inline-flex items-center px-2">{t("footer.privacy")}</Link>
        <a href="mailto:hallo@genussio.at" className="tap inline-flex items-center px-2">{t("footer.contact")}</a>
      </nav>
      <div className="mt-4 flex items-center justify-between gap-4">
        <LanguagePicker />
        <span>{t("footer.rights", { year: new Date().getFullYear() })}</span>
      </div>
    </footer>
  );
}
