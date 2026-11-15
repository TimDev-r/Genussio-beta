import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Sparkles, X } from "lucide-react";
import { reservationQuery } from "@/lib/reservation-query";
import { formatPrice } from "@/i18n";
import { LAUNCH_PRICE } from "@/config";
import { cn } from "@/lib/utils";

const HIDE_KEY = "genussio_launch_banner_hidden";
const HIDE_DAYS = 7;

/** Friendly pointer to /gruenderpreis for households without a reservation. */
export function LaunchPriceBanner({
  requirePlan = false,
  dismissible = true,
  className,
}: {
  requirePlan?: boolean;
  dismissible?: boolean;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const { data } = useQuery(reservationQuery());
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(HIDE_KEY) ?? 0);
      setHidden(Date.now() < until);
    } catch {
      setHidden(false);
    }
  }, []);

  if ((dismissible && hidden) || !data?.householdId || data.status !== null) return null;
  if (requirePlan && !data.hasPlan) return null;
  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-3xl bg-primary-soft p-4 text-foreground",
        className,
      )}
    >
      <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1 pr-6">
        <p className="font-extrabold">{t("launch.bannerTitle")}</p>
        <p className="text-sm">
          {t("launch.bannerText", { price: formatPrice(LAUNCH_PRICE, i18n.language) })}
        </p>
        <Link
          to="/gruenderpreis"
          className="mt-2 inline-block text-sm font-extrabold text-primary underline"
        >
          {t("launch.bannerCta")}
        </Link>
      </div>
      {dismissible && (
        <button
          type="button"
          aria-label={t("launch.bannerHide")}
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_DAYS * 86400000));
            } catch {
              /* ignore */
            }
          }}
          className="absolute top-3 right-3 p-1 text-muted-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
