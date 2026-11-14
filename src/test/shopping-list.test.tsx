import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { createI18n } from "@/i18n";
import type { ListItem } from "@/lib/list-format";

const toggleItem = vi.fn(async (_: unknown) => true);
vi.mock("@/lib/plan.functions", () => ({
  toggleItem: (a: unknown) => toggleItem(a),
  addCustomItem: vi.fn(async () => true),
  removeCustomItem: vi.fn(async () => true),
}));
vi.mock("@/lib/track-event", () => ({ trackEvent: vi.fn(async () => undefined) }));

const { ShoppingList } = await import("@/components/ShoppingList");

const item = (p: Partial<ListItem>): ListItem => ({
  id: "00000000-0000-0000-0000-000000000001",
  store: "hofer",
  ingredient_key: "zwiebeln",
  display_name: "Zwiebeln",
  quantity: 1200,
  unit: "g",
  quantity_text: null,
  aisle: "Obst & Gemüse",
  is_deal: false,
  deal_price: null,
  est_price: 1.37,
  checked: false,
  checked_by: null,
  is_custom: false,
  is_pantry: false,
  ...p,
});

describe("ShoppingList", () => {
  it("groups by store, formats quantities and ticks items", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <I18nextProvider i18n={createI18n("de-AT")}>
          <ShoppingList
            householdId="h"
            stores={["hofer"]}
            members={[{ id: "m1", display_name: "Timur Ahmed" }]}
            ingredientTranslations={[]}
            items={[
              item({}),
              item({
                id: "00000000-0000-0000-0000-000000000002",
                ingredient_key: "salz",
                display_name: "Salz",
                is_pantry: true,
                store: null,
              }),
              item({
                id: "00000000-0000-0000-0000-000000000003",
                ingredient_key: "milch",
                display_name: "Milch",
                checked: true,
                checked_by: "m1",
                aisle: "Milchprodukte",
              }),
            ]}
          />
        </I18nextProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByRole("heading", { name: "Hofer" })).toBeInTheDocument();
    expect(screen.getAllByText("1,2 kg").length).toBeGreaterThan(0);
    expect(screen.getByText("TA")).toBeInTheDocument();
    expect(screen.getByText("Hast du das zu Hause?")).toBeInTheDocument();
    const box = screen.getByRole("checkbox", { name: "Zwiebeln" });
    await act(async () => {
      fireEvent.click(box);
    });
    expect(toggleItem).toHaveBeenCalledWith({
      data: { id: "00000000-0000-0000-0000-000000000001", checked: true },
    });
    expect(box).toHaveAttribute("aria-checked", "true");
  });
});
