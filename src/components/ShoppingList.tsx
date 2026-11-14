import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Eye, EyeOff, Plus, Share2, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addCustomItem, removeCustomItem, toggleItem } from "@/lib/plan.functions";
import {
  formatQuantity,
  groupByStore,
  shareText,
  sumPrices,
  type ListItem,
} from "@/lib/list-format";
import { localizedIngredient } from "@/lib/catalog-localization";
import { initials } from "@/lib/swipe-rules";
import { trackEvent } from "@/lib/track-event";
import { formatPrice } from "@/i18n";
import { cn } from "@/lib/utils";

export type ShoppingListProps = {
  householdId: string;
  stores: string[];
  items: ListItem[];
  members: { id: string; display_name: string | null }[];
  ingredientTranslations: { ingredient_key: string; locale: string; display_name: string | null }[];
};

const HIDE_KEY = "genussio.list.hideDone";

export function ShoppingList(props: ShoppingListProps) {
  const { householdId, stores, members, ingredientTranslations } = props;
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const queryClient = useQueryClient();

  // Optimistic ticks: id → checked, until the server data catches up.
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const items = useMemo(
    () => props.items.map((i) => (i.id in local ? { ...i, checked: local[i.id] as boolean } : i)),
    [props.items, local],
  );
  useEffect(() => setLocal({}), [props.items]);

  const [hideDone, setHideDone] = useState(false);
  useEffect(() => {
    try {
      setHideDone(localStorage.getItem(HIDE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);
  const [newItem, setNewItem] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    void trackEvent("list_opened", { items: props.items.length }, householdId);
  }, [householdId, props.items.length]);

  const memberById = new Map(members.map((m) => [m.id, m]));
  const name = (i: ListItem) =>
    i.ingredient_key
      ? localizedIngredient(i.ingredient_key, i.display_name, ingredientTranslations, lang)
      : (i.display_name ?? "");
  const qty = (i: ListItem) =>
    i.is_custom
      ? ""
      : formatQuantity(i.quantity, i.unit, lang, (count) => t("list.pieces", { count }));
  const storeName = (s: string) =>
    s === "other" ? t("list.otherStore") : t(`onboarding.storeNames.${s}`, { defaultValue: s });

  const groups = groupByStore(items, stores);
  const custom = items.filter((i) => i.is_custom);
  const pantry = items.filter((i) => i.is_pantry);
  const total = sumPrices(items.filter((i) => !i.is_pantry && !i.is_custom));
  const shown = (i: ListItem) => !hideDone || !i.checked;
  const doneCount = items.filter((i) => i.checked && !i.is_pantry).length;
  const openCount = items.filter((i) => !i.is_pantry).length;

  async function toggle(i: ListItem) {
    const next = !i.checked;
    setLocal((l) => ({ ...l, [i.id]: next }));
    try {
      await toggleItem({ data: { id: i.id, checked: next } });
      if (next)
        void trackEvent(
          "item_checked",
          { is_deal: i.is_deal, is_custom: i.is_custom },
          householdId,
        );
      void queryClient.invalidateQueries({ queryKey: ["list"] });
    } catch {
      setLocal((l) => ({ ...l, [i.id]: !next }));
      setNotice(t("list.error"));
    }
  }

  async function add() {
    const value = newItem.trim();
    if (!value) return;
    setBusy(true);
    try {
      await addCustomItem({ data: { name: value } });
      setNewItem("");
      void trackEvent("custom_item_added", {}, householdId);
      await queryClient.invalidateQueries({ queryKey: ["list"] });
    } catch {
      setNotice(t("list.error"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(i: ListItem) {
    try {
      await removeCustomItem({ data: { id: i.id } });
      await queryClient.invalidateQueries({ queryKey: ["list"] });
    } catch {
      setNotice(t("list.error"));
    }
  }

  async function share() {
    const text = shareText(groups, custom, {
      title: t("list.shareTitle"),
      store: storeName,
      name,
      qty,
      custom: t("list.custom"),
    });
    void trackEvent("list_shared", {}, householdId);
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch {
      /* cancelled or unsupported: fall back to copy */
    }
    try {
      await navigator.clipboard.writeText(text);
      setNotice(t("list.copied"));
    } catch {
      setNotice(t("list.error"));
    }
  }

  const row = (i: ListItem) => {
    const checker = i.checked && i.checked_by ? memberById.get(i.checked_by) : undefined;
    return (
      <li key={i.id} className="flex items-center gap-3 py-2.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={i.checked}
          aria-label={name(i)}
          onClick={() => void toggle(i)}
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
            i.checked ? "border-deal bg-deal text-deal-foreground" : "border-border bg-card",
          )}
        >
          {i.checked && <Check className="size-4" strokeWidth={3} />}
        </button>
        <div className={cn("min-w-0 flex-1", i.checked && "text-muted-foreground line-through")}>
          <p className="truncate font-bold">{name(i)}</p>
          {(qty(i) || i.is_deal) && (
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground no-underline">
              {qty(i) && <span>{qty(i)}</span>}
              {i.is_deal && i.deal_price != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-deal-soft px-2 py-0.5 text-xs font-bold text-deal">
                  <Tag className="size-3" aria-hidden />
                  {t("list.deal", { price: formatPrice(i.deal_price, lang) })}
                </span>
              )}
            </p>
          )}
        </div>
        {checker && (
          <span
            title={checker.display_name ?? ""}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-extrabold text-primary"
          >
            {initials(checker.display_name)}
          </span>
        )}
        {i.est_price != null && !i.is_custom && (
          <span className={cn("shrink-0 text-sm font-bold", i.checked && "text-muted-foreground")}>
            {formatPrice(i.est_price, lang)}
          </span>
        )}
        {i.is_custom && (
          <button
            type="button"
            aria-label={t("list.remove")}
            onClick={() => void remove(i)}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col">
      <section className="mt-4 flex items-end justify-between gap-3 rounded-3xl border border-border bg-card p-4 shadow-card">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase">{t("list.total")}</p>
          <p className="text-2xl font-extrabold">{formatPrice(total, lang)}</p>
          <p className="text-sm text-muted-foreground">
            {t("list.progress", { done: doneCount, total: openCount })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button size="sm" variant="outline" onClick={() => void share()}>
            <Share2 />
            {t("list.share")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const next = !hideDone;
              setHideDone(next);
              try {
                localStorage.setItem(HIDE_KEY, next ? "1" : "0");
              } catch {
                /* ignore */
              }
            }}
          >
            {hideDone ? <Eye /> : <EyeOff />}
            {hideDone ? t("list.showDone") : t("list.hideDone")}
          </Button>
        </div>
      </section>
      {notice && (
        <p role="status" className="mt-2 text-center text-sm font-bold text-muted-foreground">
          {notice}
        </p>
      )}

      {groups.map((g) => (
        <section key={g.store} className="mt-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-extrabold">{storeName(g.store)}</h2>
            <span className="text-sm font-bold text-muted-foreground">
              {formatPrice(g.total, lang)}
            </span>
          </div>
          {g.aisles.map((a) => {
            const visible = a.items.filter(shown);
            if (!visible.length) return null;
            return (
              <div
                key={a.aisle}
                className="mt-2 rounded-3xl border border-border bg-card px-4 py-1"
              >
                <h3 className="pt-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  {t(`list.aisles.${a.aisle}`, { defaultValue: a.aisle })}
                </h3>
                <ul className="divide-y divide-border">{visible.map(row)}</ul>
              </div>
            );
          })}
        </section>
      ))}

      <section className="mt-5">
        <h2 className="text-lg font-extrabold">{t("list.custom")}</h2>
        {custom.filter(shown).length > 0 && (
          <div className="mt-2 rounded-3xl border border-border bg-card px-4 py-1">
            <ul className="divide-y divide-border">{custom.filter(shown).map(row)}</ul>
          </div>
        )}
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <Input
            value={newItem}
            maxLength={80}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={t("list.addPlaceholder")}
            aria-label={t("list.addPlaceholder")}
            className="h-11"
          />
          <Button type="submit" className="h-11" disabled={busy || !newItem.trim()}>
            <Plus />
            {t("list.add")}
          </Button>
        </form>
      </section>

      {pantry.length > 0 && (
        <details className="group mt-5 rounded-3xl border border-border bg-card px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between font-extrabold">
            {t("list.pantry")}
            <ChevronDown
              className="size-5 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="mt-1 text-sm text-muted-foreground">{t("list.pantryText")}</p>
          <ul className="divide-y divide-border">{pantry.filter(shown).map(row)}</ul>
        </details>
      )}
    </div>
  );
}
