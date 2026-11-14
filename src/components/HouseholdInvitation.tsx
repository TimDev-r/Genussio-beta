import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Share2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/track-event";

export function HouseholdInvitation({
  inviteCode,
  householdId,
}: {
  inviteCode: string;
  householdId: string;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    setUrl(`${window.location.origin}/join/${inviteCode}`);
  }, [inviteCode]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      await trackEvent("invite_shared", { via: "copy" }, householdId);
    } catch {
      setError(true);
    }
  }
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-black">{t("onboarding.others")}</h2>
      <p className="break-all text-sm text-primary">{url}</p>
      {url && (
        <div className="flex justify-center rounded-2xl bg-card py-5">
          <QRCodeSVG value={url} size={176} title={t("onboarding.share")} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => void copy()}>
          <Copy />
          {t(copied ? "onboarding.copied" : "onboarding.copy")}
        </Button>
        <Button
          onClick={async () => {
            try {
              if (navigator.share) {
                await navigator.share({ title: t("brand"), url });
                await trackEvent("invite_shared", { via: "native" }, householdId);
              } else await copy();
            } catch (e) {
              if (!(e instanceof DOMException && e.name === "AbortError")) setError(true);
            }
          }}
        >
          <Share2 />
          {t("onboarding.share")}
        </Button>
      </div>
      <Button variant="outline" className="w-full" asChild>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noreferrer"
          onClick={() => void trackEvent("invite_shared", { via: "whatsapp" }, householdId)}
        >
          <MessageCircle />
          {t("onboarding.whatsapp")}
        </a>
      </Button>
      {error && (
        <p role="alert" className="text-destructive">
          {t("onboarding.error")}
        </p>
      )}
    </section>
  );
}
