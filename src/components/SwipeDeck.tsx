import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, Clock, Heart, Plus, RotateCcw, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DealBadges } from "@/components/DealBadges";
import {
  addMoreCards,
  saveSwipe,
  undoSwipe,
  type DeckCard,
  type DeckMember,
  type Vote,
} from "@/lib/deck.functions";
import {
  applySwipe,
  canSwipeFor,
  initials,
  memberDone,
  remainingCards,
  removeSwipe,
  swipedCount,
  voteFromDrag,
  type SwipeRow,
} from "@/lib/swipe-rules";
import { localizedIngredient, localizedRecipe } from "@/lib/catalog-localization";
import { trackEvent } from "@/lib/track-event";
import { formatPrice } from "@/i18n";
import { formatAmount } from "@/lib/recipe-format";
import { cn } from "@/lib/utils";
import placeholder from "@/assets/recipe-placeholder.jpg";

type Translation = {
  recipe_id: string;
  locale: string;
  title: string | null;
  description: string | null;
  steps: unknown;
};
type IngredientTranslation = {
  ingredient_key: string;
  locale: string;
  display_name: string | null;
};

export type SwipeDeckProps = {
  weekStart: string;
  householdId: string;
  myMemberId: string;
  cards: DeckCard[];
  members: DeckMember[];
  swipes: SwipeRow[];
  translations: Translation[];
  ingredientTranslations: IngredientTranslation[];
};

const FLY_MS = 220;

export function SwipeDeck(props: SwipeDeckProps) {
  const { weekStart, householdId, myMemberId, cards, members } = props;
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Local copy of the votes so the stack reacts instantly; server data wins once it arrives,
  // except for votes still being saved.
  const pending = useRef(new Map<string, SwipeRow | null>());
  const [swipes, setSwipes] = useState<SwipeRow[]>(props.swipes);
  useEffect(() => {
    let next: SwipeRow[] = props.swipes;
    for (const [key, row] of pending.current) {
      const [memberId = "", recipeId = ""] = key.split(":");
      next = row ? applySwipe(next, row) : removeSwipe(next, memberId, recipeId);
    }
    setSwipes(next);
  }, [props.swipes]);

  const [memberId, setMemberId] = useState(myMemberId);
  const [history, setHistory] = useState<{ memberId: string; recipeId: string }[]>([]);
  const [error, setError] = useState("");
  const [moreState, setMoreState] = useState<"idle" | "busy" | "none">("idle");
  const started = useRef(new Set<string>());

  const remaining = useMemo(
    () => remainingCards(cards, swipes, memberId),
    [cards, swipes, memberId],
  );
  const done = swipedCount(cards, swipes, memberId);
  const member = members.find((m) => m.id === memberId);
  const top = remaining[0];
  const next = remaining[1];
  const lastUndo = [...history].reverse().find((h) => h.memberId === memberId);

  function refreshShared() {
    void queryClient.invalidateQueries({ queryKey: ["matches"] });
  }

  async function vote(card: DeckCard, v: Vote) {
    const key = `${memberId}:${card.recipe_id}`;
    const row: SwipeRow = { member_id: memberId, recipe_id: card.recipe_id, vote: v };
    const forMember = memberId;
    pending.current.set(key, row);
    setSwipes((s) => applySwipe(s, row));
    setHistory((h) => [...h, { memberId: forMember, recipeId: card.recipe_id }]);
    setError("");
    const kid = !!members.find((m) => m.id === forMember)?.is_kid;
    if (!started.current.has(forMember)) {
      started.current.add(forMember);
      void trackEvent("swipe_started", { member_id: forMember, is_kid: kid }, householdId);
    }
    if (swipedCount(cards, applySwipe(swipes, row), forMember) >= cards.length) {
      void trackEvent("deck_completed", { member_id: forMember, is_kid: kid }, householdId);
    }
    try {
      const res = await saveSwipe({
        data: { memberId: forMember, recipeId: card.recipe_id, weekStart, vote: v },
      });
      if (res.matched) {
        void trackEvent("match_created", { recipe_id: card.recipe_id }, householdId);
      }
      refreshShared();
    } catch {
      setSwipes((s) => removeSwipe(s, forMember, card.recipe_id));
      setHistory((h) =>
        h.filter((x) => !(x.memberId === forMember && x.recipeId === card.recipe_id)),
      );
      setError(t("deck.saveError"));
    } finally {
      pending.current.delete(key);
    }
  }

  async function undo() {
    if (!lastUndo) return;
    const { memberId: m, recipeId } = lastUndo;
    const key = `${m}:${recipeId}`;
    const before = swipes.find((s) => s.member_id === m && s.recipe_id === recipeId);
    pending.current.set(key, null);
    setSwipes((s) => removeSwipe(s, m, recipeId));
    setHistory((h) => {
      const i = h.lastIndexOf(lastUndo);
      return h.filter((_, idx) => idx !== i);
    });
    try {
      await undoSwipe({ data: { memberId: m, recipeId, weekStart } });
      refreshShared();
    } catch {
      if (before) setSwipes((s) => applySwipe(s, before));
      setError(t("deck.saveError"));
    } finally {
      pending.current.delete(key);
    }
  }

  async function moreCards() {
    setMoreState("busy");
    void trackEvent("more_cards_requested", { member_id: memberId }, householdId);
    try {
      const added = await addMoreCards({ data: { weekStart } });
      await queryClient.invalidateQueries({ queryKey: ["deck"] });
      setMoreState(added > 0 ? "idle" : "none");
    } catch {
      setMoreState("idle");
      setError(t("deck.saveError"));
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <MemberPicker
        members={members}
        myMemberId={myMemberId}
        selected={memberId}
        cards={cards}
        swipes={swipes}
        onSelect={(id) => {
          setMemberId(id);
          setMoreState("idle");
        }}
      />

      {top ? (
        <>
          <p
            className="mt-3 text-center text-sm font-bold text-muted-foreground"
            aria-live="polite"
          >
            {t("deck.progress", { current: done + 1, total: cards.length })}
          </p>
          <div className="relative mt-2 h-[clamp(300px,calc(100dvh-27.5rem),540px)] w-full">
            {next && (
              <div className="absolute inset-0 translate-y-3 scale-[0.96] opacity-70" aria-hidden>
                <CardFace card={next} {...props} />
              </div>
            )}
            <DraggableCard key={`${memberId}:${top.recipe_id}`} onVote={(v) => void vote(top, v)}>
              {(showIngredients) => (
                <CardFace card={top} {...props} showIngredients={showIngredients} interactive />
              )}
            </DraggableCard>
          </div>
          <VoteButtons
            onVote={(v) => {
              window.dispatchEvent(new CustomEvent("genussio:fly", { detail: v }));
            }}
            onUndo={lastUndo ? () => void undo() : undefined}
          />
        </>
      ) : (
        <DoneView
          memberName={member?.display_name ?? ""}
          members={members}
          cards={cards}
          swipes={swipes}
          moreState={moreState}
          onMore={() => void moreCards()}
          onUndo={lastUndo ? () => void undo() : undefined}
        />
      )}
      {error && (
        <p role="alert" className="mt-3 text-center text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function MemberPicker({
  members,
  myMemberId,
  selected,
  cards,
  swipes,
  onSelect,
}: {
  members: DeckMember[];
  myMemberId: string;
  selected: string;
  cards: DeckCard[];
  swipes: SwipeRow[];
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const hasKids = members.some((m) => m.is_kid);
  return (
    <section className="mt-3" aria-label={t("deck.whoSwipes")}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-extrabold">{t("deck.whoSwipes")}</h2>
        {hasKids && <span className="text-xs text-muted-foreground">{t("deck.passPhone")}</span>}
      </div>
      <ul className="-mx-1 mt-1 flex gap-2 overflow-x-auto px-1 pt-1.5 pb-1">
        {members.map((m) => {
          const allowed = canSwipeFor(m, myMemberId);
          const isDone = memberDone(cards, swipes, m.id);
          const name = m.id === myMemberId ? t("onboarding.you") : m.display_name || "?";
          return (
            <li key={m.id}>
              <button
                type="button"
                disabled={!allowed}
                aria-pressed={selected === m.id}
                title={allowed ? undefined : t("deck.ownPhone")}
                onClick={() => onSelect(m.id)}
                className="flex w-16 flex-col items-center gap-1 disabled:opacity-50"
              >
                <span
                  className={cn(
                    "relative flex size-11 items-center justify-center rounded-full bg-primary-soft text-sm font-extrabold text-primary",
                    selected === m.id && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                >
                  {initials(m.display_name)}
                  {isDone && (
                    <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-deal text-deal-foreground">
                      <Check className="size-3" strokeWidth={3} aria-label={t("deck.statusDone")} />
                    </span>
                  )}
                </span>
                <span className="w-full truncate text-center text-xs font-bold">{name}</span>
                {m.is_kid && (
                  <span className="-mt-1 text-[10px] text-muted-foreground">
                    {t("onboarding.kid")}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Pointer-driven drag; also listens for the button-triggered "fly" so both animate the same. */
function DraggableCard({
  onVote,
  children,
}: {
  onVote: (v: Vote) => void;
  children: (showIngredients: boolean) => ReactNode;
}) {
  const { t } = useTranslation();
  const [pos, setPos] = useState({ dx: 0, dy: 0 });
  const [dragging, setDragging] = useState(false);
  const [flying, setFlying] = useState<Vote | null>(null);
  const [showIngredients, setShowIngredients] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const voted = useRef(false);

  function fly(v: Vote) {
    if (voted.current) return;
    voted.current = true;
    setFlying(v);
    window.setTimeout(() => onVote(v), FLY_MS);
  }

  useEffect(() => {
    const handler = (e: Event) => fly((e as CustomEvent<Vote>).detail);
    window.addEventListener("genussio:fly", handler);
    return () => window.removeEventListener("genussio:fly", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function down(e: ReactPointerEvent<HTMLDivElement>) {
    if (flying) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* some browsers refuse capture for synthetic pointers; dragging still works */
    }
    setDragging(true);
  }
  function move(e: ReactPointerEvent<HTMLDivElement>) {
    if (!start.current || start.current.id !== e.pointerId) return;
    setPos({ dx: e.clientX - start.current.x, dy: e.clientY - start.current.y });
  }
  function up(e: ReactPointerEvent<HTMLDivElement>) {
    if (!start.current || start.current.id !== e.pointerId) return;
    start.current = null;
    setDragging(false);
    const v = voteFromDrag(pos.dx, pos.dy);
    if (v) return fly(v);
    if (Math.abs(pos.dx) < 8 && Math.abs(pos.dy) < 8) setShowIngredients((s) => !s);
    setPos({ dx: 0, dy: 0 });
  }

  const target =
    flying === "like"
      ? { dx: 600, dy: pos.dy }
      : flying === "nope"
        ? { dx: -600, dy: pos.dy }
        : flying === "super"
          ? { dx: pos.dx, dy: -900 }
          : pos;
  const hint = flying ?? voteFromDrag(pos.dx, pos.dy, 40);
  const strength = flying ? 1 : Math.min(1, Math.max(Math.abs(pos.dx), -pos.dy) / 120);

  return (
    <div
      role="group"
      aria-roledescription={t("deck.cardRole")}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") fly("like");
        else if (e.key === "ArrowLeft") fly("nope");
        else if (e.key === "ArrowUp") fly("super");
        else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setShowIngredients((s) => !s);
        }
      }}
      tabIndex={0}
      className="absolute inset-0 cursor-grab touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      style={{
        transform: `translate(${target.dx}px, ${target.dy}px) rotate(${target.dx / 18}deg)`,
        transition: dragging ? "none" : `transform ${FLY_MS}ms ease-out`,
      }}
    >
      {children(showIngredients)}
      {hint && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-6 rounded-xl border-4 px-3 py-1 text-2xl font-extrabold uppercase tracking-wider",
            hint === "like" && "left-5 -rotate-12 border-deal text-deal",
            hint === "nope" && "right-5 rotate-12 border-destructive text-destructive",
            hint === "super" && "left-1/2 -translate-x-1/2 border-primary text-primary",
          )}
          style={{ opacity: strength }}
        >
          {t(`deck.stamp.${hint}`)}
        </span>
      )}
    </div>
  );
}

function CardFace({
  card,
  translations,
  ingredientTranslations,
  showIngredients = false,
  interactive = false,
}: SwipeDeckProps & { card: DeckCard; showIngredients?: boolean; interactive?: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const r = localizedRecipe(
    { ...card, steps: null },
    translations.filter((x) => x.recipe_id === card.recipe_id),
    lang,
  );
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card">
      {showIngredients ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <h3 className="text-lg font-extrabold">{t("deck.ingredients")}</h3>
          <ul className="mt-3 space-y-1.5">
            {card.ingredients.map((ing) => (
              <li
                key={ing.ingredient_key}
                className="flex justify-between gap-3 border-b border-border pb-1.5"
              >
                <span>
                  {localizedIngredient(
                    ing.ingredient_key,
                    ing.display_name,
                    ingredientTranslations,
                    lang,
                  )}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {formatAmount(ing.quantity, ing.unit, lang)}
                </span>
              </li>
            ))}
          </ul>
          <Link
            to="/rezept/$id"
            params={{ id: card.recipe_id }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary underline"
          >
            {t("deck.fullRecipe")}
          </Link>
        </div>
      ) : (
        <img
          src={card.image_url || placeholder}
          alt=""
          draggable={false}
          className="min-h-0 w-full flex-1 object-cover"
        />
      )}
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
            {t(`deck.source.${card.source}`)}
          </span>
          {(card.diet_tags ?? [])
            .filter((d) => d === "vegan" || d === "vegetarisch")
            .map((d) => (
              <span
                key={d}
                className="rounded-full bg-deal-soft px-2 py-0.5 text-xs font-bold text-deal"
              >
                {t(`onboarding.diets.${d}`)}
              </span>
            ))}
        </div>
        <h2 className="text-xl leading-tight font-extrabold">{r.title}</h2>
        <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
          {card.prep_minutes != null && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {t("deck.minutes", { count: card.prep_minutes })}
            </span>
          )}
          {card.est_cost_per_portion != null && (
            <span>
              {t("deck.perPortionApprox", {
                price: formatPrice(Number(card.est_cost_per_portion), lang),
              })}
            </span>
          )}
        </p>
        {!showIngredients && (
          <DealBadges badges={card.dealBadges} ingredientTranslations={ingredientTranslations} />
        )}
        {interactive && (
          <p className="text-xs text-muted-foreground">
            {showIngredients ? t("deck.tapForPhoto") : t("deck.tapForIngredients")}
          </p>
        )}
      </div>
    </article>
  );
}

function VoteButtons({
  onVote,
  onUndo,
}: {
  onVote: (v: Vote) => void;
  onUndo: (() => void) | undefined;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-4 flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={onUndo}
        disabled={!onUndo}
        aria-label={t("deck.undo")}
        className="flex size-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-card disabled:opacity-40"
      >
        <RotateCcw className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => onVote("nope")}
        aria-label={t("deck.nope")}
        className="flex size-16 items-center justify-center rounded-full border-2 border-destructive bg-card text-destructive shadow-card active:scale-95"
      >
        <X className="size-8" strokeWidth={3} />
      </button>
      <button
        type="button"
        onClick={() => onVote("super")}
        aria-label={t("deck.super")}
        className="flex size-12 items-center justify-center rounded-full border-2 border-primary bg-card text-primary shadow-card active:scale-95"
      >
        <Star className="size-6" strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={() => onVote("like")}
        aria-label={t("deck.like")}
        className="flex size-16 items-center justify-center rounded-full border-2 border-deal bg-card text-deal shadow-card active:scale-95"
      >
        <Heart className="size-8" strokeWidth={3} />
      </button>
    </div>
  );
}

function DoneView({
  members,
  cards,
  swipes,
  moreState,
  onMore,
  onUndo,
}: {
  memberName: string;
  members: DeckMember[];
  cards: DeckCard[];
  swipes: SwipeRow[];
  moreState: "idle" | "busy" | "none";
  onMore: () => void;
  onUndo: (() => void) | undefined;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-8 flex flex-col items-center text-center">
      <div className="flex size-20 items-center justify-center rounded-[24px] bg-deal-soft text-deal">
        <Check className="size-10" strokeWidth={3} aria-hidden />
      </div>
      <h2 className="mt-4 text-2xl font-extrabold">{t("deck.doneTitle")}</h2>
      <p className="mt-1 max-w-xs text-muted-foreground">{t("deck.doneText")}</p>
      <ul className="mt-5 w-full max-w-xs space-y-2 text-left">
        {members.map((m) => {
          const isDone = memberDone(cards, swipes, m.id);
          const open = cards.length - swipedCount(cards, swipes, m.id);
          return (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-xs font-extrabold text-primary">
                {initials(m.display_name)}
              </span>
              <span className="flex-1 truncate font-bold">{m.display_name || "?"}</span>
              {isDone ? (
                <span className="inline-flex items-center gap-1 text-sm font-bold text-deal">
                  <Check className="size-4" strokeWidth={3} aria-hidden />
                  {t("deck.statusDone")}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {t("deck.statusOpen", { count: open })}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex gap-3">
        {onUndo && (
          <Button variant="outline" onClick={onUndo}>
            <RotateCcw />
            {t("deck.undo")}
          </Button>
        )}
        <Button onClick={onMore} disabled={moreState === "busy"}>
          <Plus />
          {t("deck.moreCards")}
        </Button>
      </div>
      {moreState === "none" && (
        <p className="mt-3 text-sm text-muted-foreground">{t("deck.noMoreCards")}</p>
      )}
    </div>
  );
}
