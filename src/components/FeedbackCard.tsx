import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquare, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendFeedback } from "@/lib/feedback.functions";
import { cn } from "@/lib/utils";

/** "Feedback geben" in the Haushalt tab: free text plus an optional 1–5 rating. */
export function FeedbackCard() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  if (!open) {
    return (
      <div className="px-6 pb-8">
        <Button
          variant="outline"
          className="h-12 w-full"
          onClick={() => {
            setOpen(true);
            setState("idle");
          }}
        >
          <MessageSquare />
          {t("feedback.open")}
        </Button>
        {state === "sent" && (
          <p role="status" className="mt-2 text-center text-sm font-bold text-deal">
            {t("feedback.thanks")}
          </p>
        )}
      </div>
    );
  }

  return (
    <section className="mx-6 mb-8 rounded-3xl border border-border bg-card p-4 shadow-card">
      <h2 className="font-extrabold">{t("feedback.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("feedback.intro")}</p>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label={t("feedback.rating")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={t("feedback.stars", { count: n })}
            onClick={() => setRating(rating === n ? null : n)}
            className="p-1"
          >
            <Star
              className={cn(
                "size-7",
                rating !== null && n <= rating ? "fill-primary text-primary" : "text-border",
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        value={text}
        maxLength={2000}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("feedback.placeholder")}
        aria-label={t("feedback.placeholder")}
        className="mt-3 min-h-28"
      />
      {state === "error" && (
        <p role="alert" className="mt-2 text-sm font-bold text-destructive">
          {t("feedback.error")}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <Button
          className="flex-1"
          disabled={!text.trim() || state === "busy"}
          onClick={async () => {
            setState("busy");
            try {
              await sendFeedback({ data: { text: text.trim(), rating } });
              setText("");
              setRating(null);
              setOpen(false);
              setState("sent");
            } catch {
              setState("error");
            }
          }}
        >
          {t("feedback.send")}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          {t("feedback.cancel")}
        </Button>
      </div>
    </section>
  );
}
