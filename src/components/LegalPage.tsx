import { Fragment, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "./SiteFooter";
import { legalTexts } from "@/content/legal";

/** Minimal formatter for the pasted legal texts: headings, lists, paragraphs, **bold**, links. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|https?:\/\/\S+|[\w.+-]+@[\w-]+\.[\w.]+)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^https?:\/\//.test(part))
      return (
        <a key={i} href={part} className="underline" target="_blank" rel="noreferrer">
          {part}
        </a>
      );
    if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(part))
      return (
        <a key={i} href={`mailto:${part}`} className="underline">
          {part}
        </a>
      );
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function LegalText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <div className="space-y-4 leading-relaxed">
      {blocks.map((block, i) => {
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        const first = lines[0] ?? "";
        if (first.startsWith("## "))
          return (
            <Fragment key={i}>
              <h2 className="pt-2 text-xl font-black">{first.slice(3)}</h2>
              {lines.length > 1 && <p>{inline(lines.slice(1).join(" "))}</p>}
            </Fragment>
          );
        if (lines.every((l) => l.startsWith("- ")))
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.slice(2))}</li>
              ))}
            </ul>
          );
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function LegalPage({
  titleKey,
  page,
}: {
  titleKey: string;
  page: "impressum" | "datenschutz";
}) {
  const { t, i18n } = useTranslation();
  const texts = legalTexts[page];
  const german = i18n.language.startsWith("de");
  const showEnglish = !german && texts.en.trim() !== "";
  const text = showEnglish ? texts.en : texts.de;
  return (
    <div className="app-frame flex flex-col">
      <main className="flex-1 px-6 pt-8">
        <Link to="/" className="tap inline-flex items-center gap-2 font-bold text-primary">
          <ArrowLeft className="size-5" aria-hidden /> {t("legal.back")}
        </Link>
        <h1 className="mt-6 text-3xl font-black">{t(titleKey)}</h1>
        {!german && text.trim() && (
          <p className="mt-4 rounded-2xl bg-muted p-3 text-sm">{t("legal.germanBinding")}</p>
        )}
        <div className="mt-6" lang={showEnglish ? "en" : "de"}>
          {text.trim() ? (
            <LegalText text={text} />
          ) : (
            <p className="text-muted-foreground">{t("legal.comingSoon")}</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
