// Shows "Eure Karten wurden an die neuen Einstellungen angepasst." once on the
// Swipen tab after the deck was adjusted to new settings. Tap × to hide it.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function DeckAdjustedNote({ householdId }: { householdId: string }) {
  const { t } = useTranslation();
  const storageKey = `genussio_deck_seen_${householdId}`;
  const [seen, setSeen] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSeen(localStorage.getItem(storageKey));
    } catch {
      /* private mode: just show the note */
    }
  }, [storageKey]);

  const { data: adjustedAt } = useQuery({
    queryKey: ["deck-adjusted-at", householdId],
    queryFn: async () => {
      const { data } = await supabase
        .from("households")
        .select("deck_adjusted_at")
        .eq("id", householdId)
        .single();
      return (data as { deck_adjusted_at: string | null } | null)?.deck_adjusted_at ?? null;
    },
    refetchOnMount: "always",
  });

  if (!adjustedAt || (seen && new Date(seen) >= new Date(adjustedAt))) return null;

  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-2xl border border-border bg-primary-soft px-4 py-3 text-sm"
    >
      <p className="flex-1">{t("deck.adjusted")}</p>
      <button
        type="button"
        aria-label={t("deck.adjustedDismiss")}
        className="-m-1 p-1 text-muted-foreground"
        onClick={() => {
          try {
            localStorage.setItem(storageKey, adjustedAt);
          } catch {
            /* ignore */
          }
          setSeen(adjustedAt);
        }}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
