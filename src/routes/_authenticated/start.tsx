import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Home, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HouseholdForm, MemberForm } from "@/components/HouseholdForms";
import { HouseholdInvitation } from "@/components/HouseholdInvitation";
import { householdQuery } from "@/lib/household-query";
import { defaultHousehold, defaultMember } from "@/lib/household-rules";
import { savePersonalProfile, saveMember, addKid } from "@/lib/household.functions";
import { readAttribution } from "@/lib/attribution";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/page-head";
import { trackEvent } from "@/lib/track-event";
import { metaTrack } from "@/lib/consent";

export const Route = createFileRoute("/_authenticated/start")({
  loader: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData(householdQuery());
    if (data.membership) throw redirect({ to: "/app" });
    return data;
  },
  head: () =>
    pageHead("Dein Start", "Erstelle deinen Genussio-Haushalt oder tritt über eine Einladung bei."),
  component: Start,
});
function Start() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(householdQuery());
  const [step, setStep] = useState(
    data.membership ? (data.membership.display_name ? "done" : "diet") : "name",
  );
  const [name, setName] = useState(data.profile?.display_name ?? "");
  const [invite, setInvite] = useState("");
  const [beta] = useState(() => readAttribution().code ?? "");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [kid, setKid] = useState(false);
  const saveProfile = useServerFn(savePersonalProfile);
  const saveOwn = useServerFn(saveMember);
  const createKid = useServerFn(addKid);
  const refresh = () => qc.invalidateQueries({ queryKey: ["household"] });
  if (step === "done")
    return (
      <div className="app-frame p-6">
        <Button
          className="w-full"
          size="lg"
          onClick={() => void navigate({ to: "/app", replace: true })}
        >
          {t("onboarding.finish")}
          <ArrowRight />
        </Button>
      </div>
    );
  return (
    <div className="app-frame px-6 py-8">
      <p className="text-2xl font-black text-primary">{t("brand")}</p>
      <div className="my-6 flex items-center gap-3">
        {step !== "name" && step !== "share" && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("onboarding.back")}
            onClick={() => setStep(step === "choice" ? "name" : "choice")}
          >
            <ArrowLeft />
          </Button>
        )}
        <h1 className="text-2xl font-black">
          {t(
            step === "name"
              ? "onboarding.name"
              : step === "choice"
                ? "nav.household"
                : step === "create"
                  ? "onboarding.create"
                  : step === "join"
                    ? "onboarding.join"
                    : step === "diet"
                      ? "onboarding.diet"
                      : "nav.household",
          )}
        </h1>
      </div>
      {step === "name" && (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(false);
            try {
              await saveProfile({ data: { display_name: name } });
              setStep("choice");
            } catch {
              setError(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input
            aria-label={t("onboarding.name")}
            required
            maxLength={100}
            className="h-14 text-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button className="w-full" size="lg" disabled={busy}>
            {t("onboarding.next")}
            <ArrowRight />
          </Button>
        </form>
      )}
      {step === "choice" && (
        <div className="space-y-3">
          <Button className="w-full justify-start" size="lg" onClick={() => setStep("create")}>
            <Home />
            {t("onboarding.create")}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            size="lg"
            onClick={() => setStep("join")}
          >
            <Users />
            {t("onboarding.join")}
          </Button>
        </div>
      )}
      {step === "create" && (
        <HouseholdForm
          initial={defaultHousehold}
          betaCode={beta}
          submitKey="onboarding.next"
          onSave={async (settings, code) => {
            const { data: id, error } = await supabase.rpc("create_household", {
              p_name: settings.name,
              p_beta_code: code,
              p_stores: settings.stores,
              p_weekly_budget: settings.weekly_budget,
              p_dinners_per_week: settings.dinners_per_week,
              p_max_cook_minutes: settings.max_cook_minutes,
            });
            if (error) throw error;
            await trackEvent("household_created", {}, id);
            metaTrack("CompleteRegistration");
            await refresh();
            setStep("diet");
          }}
        />
      )}
      {step === "join" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({
              to: "/join/$inviteCode",
              params: { inviteCode: invite.trim().toUpperCase() },
            });
          }}
        >
          <label className="block font-bold">
            {t("onboarding.inviteCode")}
            <Input
              required
              pattern="[A-Za-z0-9]{8}"
              className="mt-2 h-12"
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
            />
          </label>
          <Button className="w-full" size="lg">
            {t("onboarding.next")}
            <ArrowRight />
          </Button>
        </form>
      )}
      {step === "diet" && data.membership && (
        <MemberForm
          initial={{ ...defaultMember, display_name: name || data.profile?.display_name || "" }}
          submitKey="onboarding.next"
          onSave={async (settings) => {
            await saveOwn({ data: { id: data.membership?.id ?? "", settings } });
            await saveProfile({ data: { display_name: settings.display_name } });
            await refresh();
            setStep("share");
          }}
        />
      )}
      {step === "share" && data.household && (
        <div className="space-y-8">
          <HouseholdInvitation
            inviteCode={data.household.invite_code}
            householdId={data.household.id}
          />
          <Button variant="outline" className="w-full" onClick={() => setKid(!kid)}>
            <Plus />
            {t("onboarding.addKid")}
          </Button>
          {kid && (
            <MemberForm
              key={String(kid)}
              initial={defaultMember}
              isKid
              onSave={async (settings) => {
                await createKid({ data: { householdId: data.household?.id ?? "", settings } });
                await trackEvent("kid_added", {}, data.household?.id);
                await refresh();
                setKid(false);
              }}
            />
          )}
          {data.members
            .filter((m) => m.is_kid)
            .map((m) => (
              <p key={m.id} className="font-bold">
                {m.display_name}
              </p>
            ))}
          <Button
            className="w-full"
            size="lg"
            onClick={() => void navigate({ to: "/app", replace: true })}
          >
            {t("onboarding.finish")}
            <ArrowRight />
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 text-destructive">
          {t("onboarding.error")}
        </p>
      )}
    </div>
  );
}
