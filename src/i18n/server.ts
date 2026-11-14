import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie, getRequestHeader } from "@tanstack/react-start/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, detectLocale, isLocale, parseAcceptLanguage, type Locale } from "./index";

/** Server: saved cookie, else browser Accept-Language. Client: the language already on the page. */
export const getInitialLocale = createIsomorphicFn()
  .server((): Locale => {
    const saved = getCookie(LOCALE_COOKIE);
    if (isLocale(saved)) return saved;
    const langs = parseAcceptLanguage(getRequestHeader("accept-language"));
    return langs.length ? detectLocale(langs) : DEFAULT_LOCALE;
  })
  .client((): Locale => {
    const lang = document.documentElement.lang;
    return isLocale(lang) ? lang : DEFAULT_LOCALE;
  });
