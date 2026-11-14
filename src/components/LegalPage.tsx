import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "./SiteFooter";

export function LegalPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <div className="app-frame flex flex-col">
      <main className="flex-1 px-6 pt-8">
        <Link to="/" className="tap inline-flex items-center gap-2 font-bold text-primary">
          <ArrowLeft className="size-5" aria-hidden /> {t("legal.back")}
        </Link>
        <h1 className="mt-6 text-3xl font-black">{t(titleKey)}</h1>
        <p className="mt-4 text-muted-foreground">{t("legal.comingSoon")}</p>
      </main>
      <SiteFooter />
    </div>
  );
}
