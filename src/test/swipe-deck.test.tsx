import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "@/i18n";
import type { DeckCard, DeckMember } from "@/lib/deck.functions";

const saveSwipe = vi.fn(async (_: unknown) => ({ matched: false }));
const undoSwipe = vi.fn(async (_: unknown) => true);
const addMoreCards = vi.fn(async (_: unknown) => 0);
vi.mock("@/lib/deck.functions", () => ({
  saveSwipe: (a: unknown) => saveSwipe(a),
  undoSwipe: (a: unknown) => undoSwipe(a),
  addMoreCards: (a: unknown) => addMoreCards(a),
}));
vi.mock("@/lib/track-event", () => ({ trackEvent: vi.fn(async () => undefined) }));

const { SwipeDeck } = await import("@/components/SwipeDeck");

const card = (n: number): DeckCard => ({
  id: `d${n}`,
  recipe_id: `00000000-0000-0000-0000-00000000000${n}`,
  position: n,
  est_cost_per_portion: 2.1,
  deal_count: 1,
  source: "deal",
  title: `Gericht ${n}`,
  description: null,
  image_url: null,
  prep_minutes: 30,
  diet_tags: ["vegan"],
  dealBadges: [
    {
      ingredient_key: "huhn",
      name: "Hühnerkeulen",
      deal_price: 3.99,
      regular_price: 5.99,
      store: "hofer",
    },
  ],
  ingredients: [{ ingredient_key: "huhn", display_name: "Hühnerkeulen", quantity: 800, unit: "g" }],
});

const members: DeckMember[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    display_name: "Egor",
    is_kid: false,
    user_id: "u1",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    display_name: "Timur",
    is_kid: false,
    user_id: "u2",
  },
  { id: "33333333-3333-3333-3333-333333333333", display_name: "Mia", is_kid: true, user_id: null },
];

function renderDeck() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={createI18n("de-AT")}>
        <SwipeDeck
          weekStart="2026-11-09"
          householdId="44444444-4444-4444-4444-444444444444"
          myMemberId={members[0]!.id}
          cards={[card(1), card(2)]}
          members={members}
          swipes={[]}
          translations={[]}
          ingredientTranslations={[]}
        />
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("SwipeDeck", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    saveSwipe.mockClear();
  });

  it("shows the card with price, deal badge and progress", () => {
    renderDeck();
    expect(screen.getByText("1 von 2")).toBeInTheDocument();
    expect(screen.getAllByText("Gericht 1").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Hühnerkeulen: €\s3,99 statt €\s5,99 bei Hofer/)[0],
    ).toBeInTheDocument();
    expect(screen.getAllByText(/ca\. €\s2,10 pro Portion/)[0]).toBeInTheDocument();
  });

  it("other adults can't be picked, kids can", () => {
    renderDeck();
    expect(screen.getByRole("button", { name: /Timur/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Mia/ })).toBeEnabled();
  });

  it("like button saves the vote and moves to the next card, then shows done", async () => {
    renderDeck();
    fireEvent.click(screen.getByRole("button", { name: "Mag ich" }));
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(saveSwipe).toHaveBeenCalledWith({
      data: expect.objectContaining({ vote: "like", memberId: members[0]!.id }),
    });
    expect(screen.getByText("2 von 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mag ich nicht" }));
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText("Fertig!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mehr Karten/ })).toBeInTheDocument();
  });

  it("tapping the card shows the ingredients", () => {
    renderDeck();
    const cardEl = screen.getByRole("group");
    fireEvent.pointerDown(cardEl, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(cardEl, { clientX: 10, clientY: 10, pointerId: 1 });
    expect(screen.getByText("Zutaten")).toBeInTheDocument();
  });
});
