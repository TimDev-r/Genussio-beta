// Mounted once in the app shell: listens for household swipes and deck changes in real time,
// keeps the Swipen and Matches data fresh, and celebrates every new match on every phone.
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { matchesQuery } from "@/lib/deck-query";
import { localizedRecipe } from "@/lib/catalog-localization";

export function MatchWatcher({ householdId }: { householdId: string }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useQuery(matchesQuery());
  const known = useRef<Set<string> | null>(null);
  const [celebrate, setCelebrate] = useState<string | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const refresh = (keys: string[][]) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
      }, 400);
    };
    const filter = `household_id=eq.${householdId}`;
    const channel = supabase
      .channel(`household-${householdId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "swipes", filter }, () =>
        refresh([["matches"], ["deck"]]),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "deck_items", filter }, () =>
        refresh([["matches"], ["deck"], ["deck-adjusted-at"]]),
      )
      .subscribe();
    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [householdId, queryClient]);

  useEffect(() => {
    if (!data) return;
    const ids = new Set(data.matches.map((m) => m.recipe_id));
    if (known.current) {
      const fresh = data.matches.find((m) => !known.current?.has(m.recipe_id));
      if (fresh) {
        const r = localizedRecipe(
          { ...fresh, steps: null },
          data.translations.filter((x) => x.recipe_id === fresh.recipe_id),
          i18n.language,
        );
        setCelebrate(r.title ?? "");
      }
    }
    known.current = ids;
  }, [data, i18n.language]);

  useEffect(() => {
    if (celebrate === null) return;
    const timer = window.setTimeout(() => setCelebrate(null), 2800);
    return () => window.clearTimeout(timer);
  }, [celebrate]);

  if (celebrate === null) return null;
  return (
    <div
      role="status"
      aria-live="assertive"
      onClick={() => setCelebrate(null)}
      className="fixed inset-x-0 top-0 z-50 mx-auto flex max-w-[480px] justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))]"
    >
      <div className="flex animate-in items-center gap-3 rounded-3xl bg-primary px-5 py-4 text-primary-foreground shadow-pop fade-in slide-in-from-top-4 zoom-in-95">
        <Heart className="size-8 shrink-0 fill-current" aria-hidden />
        <div>
          <p className="text-lg leading-tight font-extrabold">{t("matches.celebrateTitle")}</p>
          <p className="text-sm font-bold">{t("matches.celebrate", { title: celebrate })}</p>
        </div>
      </div>
    </div>
  );
}
