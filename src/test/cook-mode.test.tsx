import { act, fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { createI18n } from "@/i18n";
import { CookMode } from "@/components/CookMode";

describe("CookMode", () => {
  it("keeps a timer running across steps, rings when done, then asks for a rating", async () => {
    vi.useFakeTimers();
    const onFinished = vi.fn();
    const onRated = vi.fn();
    render(
      <I18nextProvider i18n={createI18n("de-AT")}>
        <CookMode
          title="Paprikahendl"
          steps={[
            { text: "Zwiebeln würfeln." },
            { text: "Hendl garen.", timer_minutes: 1 },
            { text: "Sauerrahm einrühren." },
          ]}
          onClose={() => undefined}
          onFinished={onFinished}
          onRated={onRated}
        />
      </I18nextProvider>,
    );
    expect(screen.getByText("Schritt 1 von 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Weiter/ }));
    fireEvent.click(screen.getByRole("button", { name: /Timer starten: 1 Minute/ }));
    fireEvent.click(screen.getByRole("button", { name: /Weiter/ }));
    expect(screen.getByText("Schritt 3 von 3")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByText(/Schritt 2 · 0:3\d/)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(31_000);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Timer fertig – Schritt 2");

    fireEvent.click(screen.getByRole("button", { name: /Fertig/ }));
    expect(onFinished).toHaveBeenCalled();
    expect(screen.getByText("Fertig! Hat's geschmeckt?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hat geschmeckt" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Lecker" } });
    fireEvent.click(screen.getByRole("button", { name: "Absenden" }));
    expect(onRated).toHaveBeenCalledWith("up", "Lecker");
    vi.useRealTimers();
  });
});
