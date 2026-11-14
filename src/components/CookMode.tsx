import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BellRing,
  ChevronLeft,
  ChevronRight,
  Sun,
  ThumbsDown,
  ThumbsUp,
  Timer,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatTimer } from "@/lib/recipe-format";
import type { RecipeStep } from "@/lib/recipe.functions";
import { cn } from "@/lib/utils";

type RunningTimer = { step: number; endsAt: number; done: boolean };

/** Keeps the screen on while cooking (Screen Wake Lock API), re-acquired after tab switches. */
function useWakeLock() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    type Sentinel = {
      release: () => Promise<void>;
      addEventListener: (e: string, f: () => void) => void;
    };
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<Sentinel> };
    };
    if (!nav.wakeLock) return;
    let lock: Sentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock = await nav.wakeLock!.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        setActive(true);
        lock.addEventListener("release", () => setActive(false));
      } catch {
        setActive(false);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, []);
  return active;
}

/** Three short beeps via Web Audio, plus vibration where supported. */
function alarm(ctx: AudioContext | null) {
  try {
    navigator.vibrate?.([300, 150, 300, 150, 300]);
  } catch {
    /* not supported */
  }
  if (!ctx) return;
  try {
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t0 = ctx.currentTime + i * 0.45;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
      osc.start(t0);
      osc.stop(t0 + 0.32);
    }
  } catch {
    /* audio blocked */
  }
}

export function CookMode({
  title,
  steps,
  onClose,
  onFinished,
  onRated,
}: {
  title: string;
  steps: RecipeStep[];
  onClose: () => void;
  onFinished: () => void;
  onRated: (rating: "up" | "down", comment: string) => void;
}) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timers, setTimers] = useState<RunningTimer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const wakeLock = useWakeLock();

  useEffect(() => {
    if (!timers.some((x) => !x.done)) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [timers]);

  useEffect(() => {
    const due = timers.filter((x) => !x.done && x.endsAt <= now);
    if (!due.length) return;
    setTimers((all) => all.map((x) => (due.includes(x) ? { ...x, done: true } : x)));
    alarm(audio.current);
  }, [now, timers]);

  function startTimer(step: number, minutes: number) {
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!audio.current && Ctx) audio.current = new Ctx();
      void audio.current?.resume();
    } catch {
      /* no audio */
    }
    setNow(Date.now());
    setTimers((all) => [
      ...all.filter((x) => x.step !== step),
      { step, endsAt: Date.now() + minutes * 60_000, done: false },
    ]);
  }

  const step = steps[index];
  const ringing = timers.filter((x) => x.done);
  const running = timers.filter((x) => !x.done);
  const thisTimer = timers.find((x) => x.step === index);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label={t("cook.title")}
    >
      <header className="mx-auto flex w-full max-w-[480px] items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("cook.close")}
          className="flex size-11 items-center justify-center rounded-full bg-card text-muted-foreground shadow-card"
        >
          <X className="size-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-center font-extrabold">{title}</p>
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-full",
            wakeLock ? "text-primary" : "text-muted-foreground/40",
          )}
          title={wakeLock ? t("cook.screenOn") : t("cook.screenOff")}
          aria-label={wakeLock ? t("cook.screenOn") : t("cook.screenOff")}
        >
          <Sun className="size-5" />
        </span>
      </header>

      {ringing.map((x) => (
        <div
          key={x.step}
          role="alert"
          className="mx-auto mt-3 flex w-[calc(100%-2rem)] max-w-[448px] items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-pop"
        >
          <BellRing className="size-6 shrink-0 animate-bounce" aria-hidden />
          <p className="flex-1 font-extrabold">{t("cook.timerDone", { step: x.step + 1 })}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setTimers((all) => all.filter((y) => y !== x))}
          >
            {t("cook.ok")}
          </Button>
        </div>
      ))}
      {running.length > 0 && (
        <div className="mx-auto mt-3 flex w-full max-w-[480px] flex-wrap gap-2 px-4">
          {running.map((x) => (
            <button
              type="button"
              key={x.step}
              onClick={() => {
                setFinished(false);
                setIndex(x.step);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-extrabold text-primary"
            >
              <Timer className="size-4" aria-hidden />
              {t("cook.stepShort", { step: x.step + 1 })} · {formatTimer(x.endsAt - now)}
            </button>
          ))}
        </div>
      )}

      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col overflow-y-auto px-5 py-6">
        {!finished && step ? (
          <>
            <p
              className="text-sm font-extrabold tracking-wide text-primary uppercase"
              aria-live="polite"
            >
              {t("cook.step", { current: index + 1, total: steps.length })}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${((index + 1) / steps.length) * 100}%` }}
              />
            </div>
            <p className="mt-6 text-[1.6rem] leading-snug font-bold">{step.text}</p>
            {step.timer_minutes ? (
              <div className="mt-6">
                {thisTimer && !thisTimer.done ? (
                  <div className="flex items-center gap-3 rounded-3xl bg-primary-soft p-4 text-primary">
                    <Timer className="size-7" aria-hidden />
                    <span className="text-3xl font-extrabold tabular-nums">
                      {formatTimer(thisTimer.endsAt - now)}
                    </span>
                    <Button
                      variant="ghost"
                      className="ml-auto"
                      onClick={() => setTimers((all) => all.filter((y) => y !== thisTimer))}
                    >
                      {t("cook.stopTimer")}
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 w-full text-base"
                    onClick={() => startTimer(index, step.timer_minutes!)}
                  >
                    <Timer />
                    {t("cook.startTimer", { count: step.timer_minutes })}
                  </Button>
                )}
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center text-center">
            <p className="mt-6 text-5xl" aria-hidden>
              🍽️
            </p>
            <h2 className="mt-4 text-3xl font-extrabold">{t("cook.doneTitle")}</h2>
            {saved ? (
              <p className="mt-4 text-muted-foreground">{t("cook.thanks")}</p>
            ) : (
              <>
                <div className="mt-6 flex gap-4">
                  <button
                    type="button"
                    aria-pressed={rating === "up"}
                    aria-label={t("cook.liked")}
                    onClick={() => setRating("up")}
                    className={cn(
                      "flex size-20 items-center justify-center rounded-full border-2 bg-card shadow-card",
                      rating === "up"
                        ? "border-deal bg-deal-soft text-deal"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    <ThumbsUp className="size-9" />
                  </button>
                  <button
                    type="button"
                    aria-pressed={rating === "down"}
                    aria-label={t("cook.disliked")}
                    onClick={() => setRating("down")}
                    className={cn(
                      "flex size-20 items-center justify-center rounded-full border-2 bg-card shadow-card",
                      rating === "down"
                        ? "border-destructive text-destructive"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    <ThumbsDown className="size-9" />
                  </button>
                </div>
                <Textarea
                  value={comment}
                  maxLength={500}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t("cook.commentPlaceholder")}
                  aria-label={t("cook.commentPlaceholder")}
                  className="mt-5 min-h-24"
                />
                <Button
                  size="lg"
                  className="mt-4 h-14 w-full text-base"
                  disabled={!rating}
                  onClick={() => {
                    if (!rating) return;
                    onRated(rating, comment.trim());
                    setSaved(true);
                  }}
                >
                  {t("cook.send")}
                </Button>
              </>
            )}
            <Button variant="ghost" className="mt-3" onClick={onClose}>
              {t("cook.backToRecipe")}
            </Button>
          </div>
        )}
      </main>

      {!finished && (
        <footer className="mx-auto grid w-full max-w-[480px] grid-cols-2 gap-3 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            size="lg"
            variant="outline"
            className="h-20 text-lg"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="size-6" />
            {t("cook.back")}
          </Button>
          <Button
            size="lg"
            className="h-20 text-lg"
            onClick={() => {
              if (index < steps.length - 1) setIndex((i) => i + 1);
              else {
                setFinished(true);
                onFinished();
              }
            }}
          >
            {index < steps.length - 1 ? t("cook.next") : t("cook.finish")}
            <ChevronRight className="size-6" />
          </Button>
        </footer>
      )}
    </div>
  );
}
