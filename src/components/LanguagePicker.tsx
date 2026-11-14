import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { LOCALES, setLocale, type Locale } from "@/i18n";

export function LanguagePicker({ onChange }: { onChange?: (locale: Locale) => void }) {
  const { t, i18n } = useTranslation();
  return (
    <label className="tap inline-flex items-center gap-2 rounded-2xl border border-input bg-card px-3 text-sm font-semibold">
      <Globe className="size-4 text-primary" aria-hidden />
      <span className="sr-only">{t("footer.language")}</span>
      <select
        aria-label={t("footer.language")}
        className="tap bg-transparent outline-none"
        value={i18n.language}
        onChange={(e) => {
          const locale = e.target.value as Locale;
          if (onChange) onChange(locale);
          else setLocale(i18n, locale);
        }}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {t(`languages.${l}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
