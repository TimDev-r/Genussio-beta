// Cookie consent + Meta Pixel. Nothing from Meta is loaded unless the visitor chose "Alle akzeptieren".
import { META_PIXEL_ID } from "@/config";

export type Consent = "all" | "necessary";
const KEY = "genussio_consent";
const OPEN_EVENT = "genussio:consent-open";
const CHANGE_EVENT = "genussio:consent-change";

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { choice?: string };
    return v.choice === "all" || v.choice === "necessary" ? v.choice : null;
  } catch {
    return null;
  }
}

export function saveConsent(choice: Consent) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
  } catch {
    /* private mode: the choice lasts for this page view */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: choice }));
  if (choice === "all") loadMetaPixel();
  else if (pixelLoaded) {
    // Revoking: stop sending from now on and reload so Meta's script is gone.
    window.location.reload();
  }
}

export function openConsentSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onConsentOpen(fn: () => void) {
  window.addEventListener(OPEN_EVENT, fn);
  return () => window.removeEventListener(OPEN_EVENT, fn);
}

type Fbq = ((...args: unknown[]) => void) & {
  queue?: unknown[];
  callMethod?: (...a: unknown[]) => void;
};
let pixelLoaded = false;

/** Injects Meta's standard pixel snippet. Only call after consent. */
export function loadMetaPixel() {
  if (pixelLoaded || !META_PIXEL_ID || typeof window === "undefined") return;
  if (readConsent() !== "all") return;
  pixelLoaded = true;
  const w = window as unknown as { fbq?: Fbq; _fbq?: Fbq };
  if (!w.fbq) {
    const fbq: Fbq = (...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue?.push(args);
    };
    fbq.queue = [];
    w.fbq = fbq;
    w._fbq = fbq;
    (fbq as unknown as { loaded: boolean; version: string; push: Fbq }).loaded = true;
    (fbq as unknown as { version: string }).version = "2.0";
    (fbq as unknown as { push: Fbq }).push = fbq;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
  }
  w.fbq?.("init", META_PIXEL_ID);
  w.fbq?.("track", "PageView");
}

/** Sends a standard Meta event (PageView, Lead, CompleteRegistration) if – and only if – consent was given. */
export function metaTrack(event: "PageView" | "Lead" | "CompleteRegistration") {
  if (!pixelLoaded || readConsent() !== "all") return;
  const w = window as unknown as { fbq?: Fbq };
  w.fbq?.("track", event);
}
