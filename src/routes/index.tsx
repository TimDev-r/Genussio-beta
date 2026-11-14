import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Sparkles, ShoppingBasket, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SiteFooter } from "@/components/SiteFooter";
import { captureAttribution, saveBetaCode } from "@/lib/attribution";
import { formatPrice } from "@/i18n";
import { useSession } from "@/lib/session";

const TITLE = "Genussio – Schluss mit: Was essen wir heute?";
const DESC =
  "Swipt gemeinsam durch Gerichte aus den Angeboten der Woche – für Wochenplan und Einkaufsliste bei Spar, Billa, Hofer und Lidl.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const a = captureAttribution(window.location.search);
    if (new URLSearchParams(window.location.search).get("code") && a.code) setCode(a.code);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (!c) return setError(true);
    saveBetaCode(c);
    void navigate({ to: "/login", search: { code: c, redirect: "/start" } });
  };

  const steps = [
    { icon: Users, title: t("landing.step1"), text: t("landing.step1Text") },
    { icon: Heart, title: t("landing.step2"), text: t("landing.step2Text") },
    { icon: ShoppingBasket, title: t("landing.step3"), text: t("landing.step3Text") },
  ];

  return (
    <div className="app-frame flex flex-col">
      <header className="flex items-center justify-between px-6 pt-6">
        <span className="text-2xl font-black text-primary">{t("brand")}</span>
        <Button variant="ghost" onClick={() => void navigate({ to: user ? "/app" : "/login" })}>
          {t(user ? "nav.swipe" : "login.title")}
        </Button>
      </header>

      <main className="px-6">
        <section className="pt-8">
          <h1 className="text-4xl font-black leading-tight">{t("landing.headline")}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{t("landing.subline")}</p>

          <div className="relative mx-auto mt-8 h-56 w-full max-w-xs" aria-hidden>
            <div className="card-soft absolute inset-x-6 top-4 h-48 rotate-6 bg-primary-soft" />
            <div className="card-soft absolute inset-x-0 top-0 flex h-48 -rotate-2 flex-col justify-end overflow-hidden bg-primary p-5 text-primary-foreground">
              <span className="w-fit rounded-full bg-deal px-3 py-1 text-xs font-bold text-deal-foreground">
                {t("landing.sampleDeal")} ·{" "}
                {t("landing.sampleSave", { amount: formatPrice(2.4, i18n.language) })}
              </span>
              <p className="mt-2 text-xl font-extrabold">{t("landing.sampleDish")}</p>
            </div>
            <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-4">
              <span className="card-soft flex size-12 items-center justify-center rounded-full text-muted-foreground">
                <X />
              </span>
              <span className="flex size-12 items-center justify-center rounded-full bg-deal text-deal-foreground shadow-[var(--shadow-card)]">
                <Heart />
              </span>
            </div>
          </div>
        </section>

        <form onSubmit={submit} className="card-soft mt-10 p-5">
          <label htmlFor="beta-code" className="font-extrabold">
            {t("landing.codeLabel")}
          </label>
          <Input
            id="beta-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(false);
            }}
            placeholder={t("landing.codePlaceholder")}
            aria-invalid={error}
            className="mt-2 h-12 rounded-2xl text-base"
          />
          {error && (
            <p className="mt-2 text-sm font-semibold text-destructive">
              {t("landing.codeRequired")}
            </p>
          )}
          <Button type="submit" variant="hero" size="lg" className="mt-4 w-full">
            <Sparkles /> {t("landing.join")}
          </Button>
          <p className="mt-3 text-center text-sm font-bold text-deal">{t("landing.freeNote")}</p>
        </form>

        <section className="mt-12">
          <h2 className="text-2xl font-black">{t("landing.howTitle")}</h2>
          <ol className="mt-4 space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="card-soft flex gap-4 p-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <s.icon aria-hidden />
                </span>
                <div>
                  <p className="font-extrabold">
                    {i + 1}. {s.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-black">{t("landing.faqTitle")}</h2>
          <Accordion type="single" collapsible className="mt-2">
            {[1, 2, 3, 4].map((n) => (
              <AccordionItem key={n} value={`q${n}`}>
                <AccordionTrigger className="tap text-left text-base font-bold">
                  {t(`landing.faq.q${n}`)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t(`landing.faq.a${n}`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
