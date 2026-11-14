import i18n, { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import deAT from "./locales/de-AT";
import deDE from "./locales/de-DE";
import en from "./locales/en";
import it from "./locales/it";
import es from "./locales/es";
import { adminMessages } from "./admin";

const resources = Object.fromEntries(LOCALE_RESOURCES());
function LOCALE_RESOURCES() {
  return Object.entries({ "de-AT": deAT, "de-DE": deDE, en, it, es }).map(([locale, messages]) => [
    locale,
    { translation: { ...messages, admin: adminMessages[locale as keyof typeof adminMessages] } },
  ]);
}

export const LOCALES = ["de-AT", "de-DE", "en", "it", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "de-AT";
const STORAGE_KEY = "genussio.locale";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LOCALE,
    fallbackLng: { "de-DE": ["de-AT"], default: ["de-AT"] },
    supportedLngs: [...LOCALES],
    load: "currentOnly",
    interpolation: { escapeValue: false },
    initImmediate: false,
  } as Parameters<typeof i18n.init>[0]);
}

/** Maps browser languages to a supported locale. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const raw of languages) {
    const [lang, region] = raw.split("-").map((p) => p.toLowerCase());
    if (lang === "de") return region === "de" ? "de-DE" : "de-AT";
    if (lang === "it") return "it";
    if (lang === "es") return "es";
    if (lang) return "en";
  }
  return DEFAULT_LOCALE;
}

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export const LOCALE_COOKIE = "genussio_locale";

/** One i18n instance per render tree so SSR requests never share a language. */
export function createI18n(lng: Locale) {
  const instance = createInstance();
  void instance.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: { "de-DE": ["de-AT"], default: ["de-AT"] },
    supportedLngs: [...LOCALES],
    load: "currentOnly",
    interpolation: { escapeValue: false },
    initImmediate: false,
  } as Parameters<typeof instance.init>[0]);
  return instance;
}

/** Parses an Accept-Language header into ordered language tags. */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((p) => {
      const [tag, q] = p.trim().split(";q=");
      return { tag, q: q ? Number(q) : 1 };
    })
    .filter((x): x is { tag: string; q: number } => !!x.tag && x.tag !== "*")
    .sort((a, b) => b.q - a.q)
    .map((x) => x.tag as string);
}

/** Saves the choice (localStorage + cookie for SSR) and switches language. Browser only. */
export function setLocale(instance: typeof i18n, locale: Locale) {
  localStorage.setItem(STORAGE_KEY, locale);
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  void instance.changeLanguage(locale);
}

/** First visit: remember the detected locale. Call from useEffect. */
export function rememberLocale(locale: Locale) {
  if (!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, locale);
  if (!document.cookie.includes(`${LOCALE_COOKIE}=`)) {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }
}

export const formatPrice = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(value);
export const formatDate = (
  date: Date,
  locale: string,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
) => new Intl.DateTimeFormat(locale, opts).format(date);
export const formatNumber = (value: number, locale: string) =>
  new Intl.NumberFormat(locale).format(value);

export default i18n;
