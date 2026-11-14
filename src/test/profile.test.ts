import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), updateUser: vi.fn(), event: vi.fn(), attribution: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }), upsert: (value: unknown) => { mocks.write(value); return { select: () => ({ maybeSingle: async () => ({ data: { id: "u1", locale: "it", display_name: "Jo" }, error: null }) }) }; } }), auth: { updateUser: mocks.updateUser } } }));
vi.mock("@/lib/track-event", () => ({ trackEvent: mocks.event }));
vi.mock("@/lib/attribution", () => ({ readAttribution: mocks.attribution }));
import { ensureProfile } from "@/lib/profile";
const user = (provider: string, metadata = {}) => ({ id: "u1", app_metadata: { provider }, user_metadata: metadata }) as User;
beforeEach(() => { vi.clearAllMocks(); mocks.read.mockResolvedValue({ data: null, error: null }); mocks.updateUser.mockResolvedValue({ error: null }); mocks.attribution.mockReturnValue({}); });
describe("first sign-in profile", () => {
  it("records beta and UTM attribution with ads source", async () => {
    mocks.attribution.mockReturnValue({ code: "BETA", utm_source: "ig", utm_medium: "social", utm_campaign: "autumn" });
    await ensureProfile(user("email", { locale: "it" }), "de-AT");
    expect(mocks.write).toHaveBeenCalledWith(expect.objectContaining({ beta_code: "BETA", utm_source: "ig", utm_medium: "social", utm_campaign: "autumn", signup_source: "ads", locale: "it" }));
    expect(mocks.event).toHaveBeenCalledWith("signed_up", { method: "email" });
  });
  it("uses einladung when no utm_source exists", async () => {
    await ensureProfile(user("email"), "es");
    expect(mocks.write).toHaveBeenCalledWith(expect.objectContaining({ signup_source: "einladung", locale: "es" }));
  });
  it("stores Google name and active language in profile and metadata", async () => {
    await ensureProfile(user("google", { full_name: "Jo Rossi" }), "it");
    expect(mocks.write).toHaveBeenCalledWith(expect.objectContaining({ display_name: "Jo Rossi", locale: "it" }));
    expect(mocks.updateUser).toHaveBeenCalledWith({ data: { locale: "it" } });
    expect(mocks.event).toHaveBeenCalledWith("signed_up", { method: "google" });
  });
  it("does not overwrite existing attribution or language on later login", async () => {
    mocks.read.mockResolvedValue({ data: { id: "u1", locale: "en", display_name: "Jo" }, error: null });
    await ensureProfile(user("google"), "it");
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.event).not.toHaveBeenCalled();
  });
});