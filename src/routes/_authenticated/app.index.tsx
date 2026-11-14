import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { DeckAdjustedNote } from "@/components/DeckAdjustedNote";
import { SwipeDeck } from "@/components/SwipeDeck";
import { weekRange } from "@/lib/deck.functions";
import { deckQuery } from "@/lib/deck-query";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Swipen – Genussio" },
      { name: "description", content: "Genussio – euer Haushalt entscheidet gemeinsam." },
      { property: "og:title", content: "Swipen – Genussio" },
      { property: "og:description", content: "Genussio – euer Haushalt entscheidet gemeinsam." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(deckQuery()),
  component: Page,
});

function Page() {
  const { t, i18n } = useTranslation();
  const { data } = useSuspenseQuery(deckQuery());
  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
      {data.householdId && <DeckAdjustedNote householdId={data.householdId} />}
      {data.weekStart && (
        <h1 className="text-xl font-extrabold">
          {t("deck.week", weekRange(data.weekStart, i18n.language))}
        </h1>
      )}
      {data.cards.length === 0 || !data.weekStart || !data.householdId || !data.myMemberId ? (
        <EmptyState icon={SearchX} title={t("deck.emptyTitle")} text={t("deck.emptyText")} />
      ) : (
        <SwipeDeck
          weekStart={data.weekStart}
          householdId={data.householdId}
          myMemberId={data.myMemberId}
          cards={data.cards}
          members={data.members}
          swipes={data.swipes}
          translations={data.translations}
          ingredientTranslations={data.ingredientTranslations}
        />
      )}
    </div>
  );
}
