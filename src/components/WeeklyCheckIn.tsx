import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MessageCircleHeart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCheckIn, SAVINGS, submitCheckIn, WOULD_PAY } from "@/lib/feedback.functions";
import { trackEvent } from "@/lib/track-event";
import { LaunchPriceBanner } from "@/components/LaunchPriceBanner";
import { cn } from "@/lib/utils";

const DAYS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-full border-2 px-3 text-sm font-bold transition-colors [.grid_&]:px-0",
        selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
      )}
    >
      {children}
    </button>
  );
}

/** Weekly check-in card: shown from Sunday on, once per person and week, skippable. */
export function WeeklyCheckIn() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["checkin"],
    queryFn: () => getCheckIn(),
    staleTime: 5 * 60_000,
  });
  const [days, setDays] = useState<number | null>(null);
  const [savings, setSavings] = useState<(typeof SAVINGS)[number] | null>(null);
  const [pay, setPay] = useState<(typeof WOULD_PAY)[number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!data?.due) return null;
  if (done) {
    const interested = pay === "ja" || pay === "vielleicht";
    return (
      <div className="mx-4 mt-4 space-y-3">
        <div role="status" className="rounded-3xl bg-deal-soft p-4 font-bold text-deal">
          {t("checkin.thanks")}
        </div>
        {interested && <LaunchPriceBanner dismissible={false} />}
      </div>
    );
  }

  const ready = days !== null && savings !== null && (!data.askPrice || pay !== null);

  async function send(skipped: boolean) {
    setBusy(true);
    setError("");
    try {
      if (skipped) await submitCheckIn({ data: { skipped: true } });
      else if (days !== null && savings)
        await submitCheckIn({
          data: {
            skipped: false,
            daysCooked: days,
            savings,
            wouldPay: data?.askPrice ? pay : null,
          },
        });
      void trackEvent(
        skipped ? "checkin_skipped" : "checkin_answered",
        { week_start: data?.weekStart ?? null },
        data?.householdId ?? undefined,
      );
      if (skipped) {
        queryClient.setQueryData(["checkin"], { ...data, due: false });
      } else {
        setDone(true);
        // Keep the launch-price pointer visible for interested households; otherwise fade out.
        if (!(pay === "ja" || pay === "vielleicht"))
          window.setTimeout(
            () => queryClient.setQueryData(["checkin"], { ...data, due: false }),
            2500,
          );
      }
    } catch {
      setError(t("checkin.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="checkin-title"
      className="mx-4 mt-4 rounded-3xl border-2 border-primary/30 bg-card p-4 shadow-card"
    >
      <div className="flex items-start gap-3">
        <MessageCircleHeart className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
        <div className="flex-1">
          <h2 id="checkin-title" className="font-extrabold">
            {t("checkin.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("checkin.intro")}</p>
        </div>
        <button
          type="button"
          aria-label={t("checkin.skip")}
          disabled={busy}
          onClick={() => void send(true)}
          className="-m-1 p-1 text-muted-foreground"
        >
          <X className="size-5" />
        </button>
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-bold">{t("checkin.daysQuestion")}</legend>
        <div className="mt-2 grid grid-cols-8 gap-1.5">
          {DAYS.map((d) => (
            <Choice key={d} selected={days === d} onClick={() => setDays(d)}>
              {d}
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-sm font-bold">{t("checkin.savingsQuestion")}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {SAVINGS.map((s) => (
            <Choice key={s} selected={savings === s} onClick={() => setSavings(s)}>
              {t(`checkin.savings.${s}`)}
            </Choice>
          ))}
        </div>
      </fieldset>

      {data.askPrice && (
        <fieldset className="mt-4">
          <legend className="text-sm font-bold">{t("checkin.priceQuestion")}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {WOULD_PAY.map((p) => (
              <Choice key={p} selected={pay === p} onClick={() => setPay(p)}>
                {t(`checkin.pay.${p}`)}
              </Choice>
            ))}
          </div>
        </fieldset>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm font-bold text-destructive">
          {error}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" disabled={!ready || busy} onClick={() => void send(false)}>
          {t("checkin.send")}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => void send(true)}>
          {t("checkin.skip")}
        </Button>
      </div>
    </section>
  );
}
