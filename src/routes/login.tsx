import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Mail, ArrowRight } from "lucide-react";
import { captureAttribution } from "@/lib/attribution";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguagePicker } from "@/components/LanguagePicker";
import { useSession } from "@/lib/session";
import { safeReturnPath } from "@/lib/household-rules";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s["code"] === "string" ? s["code"] : "",
    redirect: safeReturnPath(s["redirect"]),
  }),
  head: () => pageHead("Anmelden", "Melde dich mit Google oder einem E-Mail-Link bei Genussio an."),
  component: Login,
});
function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, ready, error: sessionError } = useSession();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    captureAttribution(window.location.search);
    if (new URLSearchParams(window.location.hash.slice(1)).has("error")) setError(true);
  }, []);
  useEffect(() => {
    if (ready && user) {
      const target = safeReturnPath(search.redirect);
      if (target.startsWith("/join/"))
        void navigate({
          to: "/join/$inviteCode",
          params: { inviteCode: target.slice(6) },
          replace: true,
        });
      else void navigate({ to: "/start", replace: true });
    }
  }, [user, ready, navigate, search.redirect]);
  const redirectTo = () => {
    const target = safeReturnPath(search.redirect);
    return window.location.origin + (target.startsWith("/join/") ? target : "/login");
  };
  async function emailSignIn(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const result = sent
        ? await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: "email" })
        : await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: { emailRedirectTo: redirectTo(), data: { locale: i18n.language } },
          });
      if (result.error) throw result.error;
      if (!sent) setSent(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  async function googleSignIn() {
    setBusy(true);
    setError(false);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) {
      setError(true);
      setBusy(false);
    }
  }
  return (
    <div className="app-frame px-6 py-8">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="tap inline-flex items-center text-primary"
          aria-label={t("legal.back")}
        >
          <ArrowLeft />
        </Link>
        <LanguagePicker />
      </div>
      <p className="mt-10 text-2xl font-black text-primary">{t("brand")}</p>
      <h1 className="mt-3 text-3xl font-black">{t("login.title")}</h1>
      <div className="mt-8 space-y-6">
        <Button
          className="google-button w-full"
          disabled={busy}
          onClick={() => void googleSignIn()}
        >
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
            />
          </svg>
          {t("onboarding.google")}
        </Button>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {t("onboarding.orEmail")}
          <span className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={emailSignIn} className="space-y-4">
          <label className="block font-bold" htmlFor="email">
            {t("onboarding.email")}
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            disabled={sent}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12"
          />
          {sent && (
            <>
              <p role="status" className="rounded-2xl bg-deal-soft p-4 font-semibold text-deal">
                {t("onboarding.sent")}
              </p>
              <label htmlFor="otp" className="block font-bold">
                {t("onboarding.code")}
              </label>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="h-12 text-center text-xl"
              />
            </>
          )}
          {(error || sessionError) && (
            <p role="alert" className="text-destructive">
              {t("onboarding.error")}
            </p>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {sent ? <ArrowRight /> : <Mail />}
            {t(busy ? "onboarding.loading" : sent ? "onboarding.verify" : "onboarding.send")}
          </Button>
          {sent && (
            <div className="flex flex-wrap justify-between">
              <Button
                variant="ghost"
                onClick={async () => {
                  setBusy(true);
                  const { error } = await supabase.auth.signInWithOtp({
                    email,
                    options: { emailRedirectTo: redirectTo(), data: { locale: i18n.language } },
                  });
                  setError(Boolean(error));
                  setBusy(false);
                }}
                disabled={busy}
              >
                {t("onboarding.resend")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSent(false);
                  setCode("");
                }}
              >
                {t("onboarding.changeEmail")}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
