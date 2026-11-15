import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BellRing, Check, CreditCard, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppFooter } from "@/components/SiteFooter";
import { saveReservation } from "@/lib/reservation.functions";
import { reservationQuery } from "@/lib/reservation-query";
import { paymentUrl } from "@/lib/payment-url";
import { trackEvent } from "@/lib/track-event";
import { useSession } from "@/lib/session";
import { formatPrice } from "@/i18n";
import { LAUNCH_PRICE, REGULAR_PRICE, STRIPE_PAYMENT_LINK } from "@/config";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/gruenderpreis/")({
  head: () => pageHead("Gründerpreis", "Das erste Jahr Genussio für 29,99 € statt 39,99 €."),
  loader: ({ context }) => context.queryClient.ensureQueryData(reservationQuery()),
  component: Page,
});

function Page() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(reservationQuery());
  const [busy, setBusy] = useState<"pay" | "reserve" | null>(null);
  const [error, setError] = useState("");
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current || !data.householdId) return;
    viewed.current = true;
    void trackEvent("reservation_page_viewed", { status: data.status }, data.householdId);
  }, [data]);

  if (!data.householdId) {
    return (
      <div className="app-frame px-6 py-8">
        <p>{t("launch.noHousehold")}</p>
        <Button asChild className="mt-4">
          <Link to="/start">{t("launch.toStart")}</Link>
        </Button>
      </div>
    );
  }
  const householdId = data.householdId;
  const paid = data.status === "bezahlt";

  async function pay() {
    setBusy("pay");
    setError("");
    try {
      await saveReservation({ data: { status: "geklickt" } });
      await trackEvent("reservation_paid_clicked", {}, householdId);
      window.location.href = paymentUrl(STRIPE_PAYMENT_LINK, user?.email, householdId);
    } catch {
      setError(t("launch.error"));
      setBusy(null);
    }
  }

  async function reserve() {
    setBusy("reserve");
    setError("");
    try {
      await saveReservation({ data: { status: "vorgemerkt" } });
      await trackEvent("reservation_saved", {}, householdId);
      await queryClient.invalidateQueries({ queryKey: ["reservation"] });
      void navigate({ to: "/gruenderpreis/danke", search: { art: "vorgemerkt" } });
    } catch {
      setError(t("launch.error"));
      setBusy(null);
    }
  }

  return (
    <div className="app-frame flex flex-col">
      <main className="flex-1 px-6 pt-6 pb-8">
        <Link
          to="/app/household"
          className="tap inline-flex items-center gap-2 font-bold text-primary"
        >
          <ArrowLeft className="size-5" aria-hidden />
          {t("launch.back")}
        </Link>
        <p className="mt-6 text-sm font-extrabold tracking-wide text-primary uppercase">
          {t("launch.kicker")}
        </p>
        <h1 className="mt-1 text-3xl leading-tight font-black">{t("launch.title")}</h1>
        <div className="mt-4 flex items-end gap-3">
          <span className="text-4xl font-black">{formatPrice(LAUNCH_PRICE, lang)}</span>
          <span className="pb-1 text-lg text-muted-foreground line-through">
            {formatPrice(REGULAR_PRICE, lang)}
          </span>
          <span className="pb-1.5 text-sm font-bold text-muted-foreground">
            {t("launch.perYear")}
          </span>
        </div>
        <p className="mt-4 leading-relaxed">{t("launch.explain")}</p>
        <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-deal">
          <Users className="size-4" aria-hidden />
          {t("launch.wholeHousehold")}
        </p>

        {paid ? (
          <div className="mt-6 flex items-center gap-3 rounded-3xl bg-deal-soft p-4 font-bold text-deal">
            <Check className="size-6 shrink-0" strokeWidth={3} aria-hidden />
            {t("launch.alreadyPaid")}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl border-2 border-primary bg-card p-4 shadow-card">
              <Button
                size="lg"
                className="h-14 w-full text-base"
                disabled={busy !== null || !STRIPE_PAYMENT_LINK}
                onClick={() => void pay()}
              >
                <CreditCard />
                {t("launch.payNow", { price: formatPrice(LAUNCH_PRICE, lang) })}
              </Button>
              <p className="mt-2 text-center text-sm text-muted-foreground">{t("launch.refund")}</p>
              {!STRIPE_PAYMENT_LINK && (
                <p className="mt-2 text-center text-xs font-bold text-destructive">
                  {t("launch.noLink")}
                </p>
              )}
            </div>
            <div className="rounded-3xl border border-border bg-card p-4">
              {data.status === "vorgemerkt" ? (
                <p className="flex items-center gap-2 font-bold text-deal">
                  <Check className="size-5" strokeWidth={3} aria-hidden />
                  {t("launch.alreadyReserved")}
                </p>
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 w-full text-base"
                  disabled={busy !== null}
                  onClick={() => void reserve()}
                >
                  <BellRing />
                  {t("launch.reserve")}
                </Button>
              )}
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {t("launch.reserveText")}
              </p>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 text-center font-bold text-destructive">
            {error}
          </p>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
