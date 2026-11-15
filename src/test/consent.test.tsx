import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { paymentUrl } from "@/lib/payment-url";
import { LegalText } from "@/components/LegalPage";

vi.mock("@/config", () => ({ META_PIXEL_ID: "1234567890" }));

const metaScripts = () =>
  [...document.querySelectorAll("script")].filter((s) => s.src.includes("facebook"));

describe("consent", () => {
  it("loads nothing from Meta with 'Nur notwendige', and the pixel after 'Alle akzeptieren'", async () => {
    const consent = await import("@/lib/consent");
    localStorage.clear();
    consent.loadMetaPixel();
    expect(metaScripts()).toHaveLength(0);
    consent.saveConsent("necessary");
    consent.metaTrack("Lead");
    expect(metaScripts()).toHaveLength(0);
    expect((window as unknown as { fbq?: unknown }).fbq).toBeUndefined();
    expect(consent.readConsent()).toBe("necessary");

    consent.saveConsent("all");
    expect(metaScripts()).toHaveLength(1);
    expect(typeof (window as unknown as { fbq?: unknown }).fbq).toBe("function");
  });
});

describe("paymentUrl", () => {
  it("prefills email and household reference", () => {
    const url = new URL(paymentUrl("https://buy.stripe.com/test_abc", "a+b@x.at", "hh-1"));
    expect(url.searchParams.get("prefilled_email")).toBe("a+b@x.at");
    expect(url.searchParams.get("client_reference_id")).toBe("hh-1");
  });
});

describe("LegalText", () => {
  it("renders headings, lists, bold and emails", () => {
    render(
      <LegalText
        text={"## Kontakt\nE-Mail: hallo@genussio.at\n\n- eins\n- **zwei**\n\nNormaler Absatz"}
      />,
    );
    expect(screen.getByRole("heading", { name: "Kontakt" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "hallo@genussio.at" })).toHaveAttribute(
      "href",
      "mailto:hallo@genussio.at",
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("zwei").tagName).toBe("STRONG");
  });
});
