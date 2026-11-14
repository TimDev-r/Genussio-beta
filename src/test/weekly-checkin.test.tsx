import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { createI18n } from "@/i18n";

const submitCheckIn = vi.fn(async (_: unknown) => true);
vi.mock("@/lib/feedback.functions", () => ({
  SAVINGS: ["nichts", "bis10", "10bis20", "20bis40", "mehr40"],
  WOULD_PAY: ["ja", "vielleicht", "nein"],
  getCheckIn: async () => ({
    due: true,
    weekStart: "2026-11-09",
    askPrice: true,
    householdId: "h",
  }),
  submitCheckIn: (a: unknown) => submitCheckIn(a),
}));
vi.mock("@/lib/track-event", () => ({ trackEvent: vi.fn(async () => undefined) }));

const { WeeklyCheckIn } = await import("@/components/WeeklyCheckIn");

describe("WeeklyCheckIn", () => {
  it("needs all answers incl. the price question, then saves them", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <I18nextProvider i18n={createI18n("de-AT")}>
          <WeeklyCheckIn />
        </I18nextProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Kurzer Wochen-Check-in")).toBeInTheDocument();
    const send = screen.getByRole("button", { name: "Absenden" });
    expect(send).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    fireEvent.click(screen.getByRole("button", { name: "10 bis 20 €" }));
    expect(send).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Ja" }));
    await act(async () => {
      fireEvent.click(send);
    });
    expect(submitCheckIn).toHaveBeenCalledWith({
      data: { skipped: false, daysCooked: 4, savings: "10bis20", wouldPay: "ja" },
    });
    expect(screen.getByText("Danke fürs Mitmachen!")).toBeInTheDocument();
  });
});
