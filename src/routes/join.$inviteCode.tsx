import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, ArrowRight } from "lucide-react";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MemberForm } from "@/components/HouseholdForms";
import { defaultMember } from "@/lib/household-rules";
import { saveMember, savePersonalProfile } from "@/lib/household.functions";
import { pageHead } from "@/lib/page-head";
import { trackEvent } from "@/lib/track-event";

export const Route = createFileRoute("/join/$inviteCode")({
  head: () =>
    pageHead(
      "Haushaltseinladung",
      "Tritt deinem Haushalt bei und entscheidet gemeinsam, was es zum Essen gibt.",
    ),
  component: Join,
});
function Join() {
  const { t } = useTranslation();
  const { inviteCode } = Route.useParams();
  const { user, ready, error: sessionError } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const save = useServerFn(saveMember);
  const saveProfile = useServerFn(savePersonalProfile);
  const [memberId, setMemberId] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data, isPending, isError } = useQuery({
    queryKey: ["invite", inviteCode, user?.id],
    enabled: ready && Boolean(user),
    queryFn: async () => {
      const { data: name, error } = await supabase.rpc("invite_household_name", {
        p_invite_code: inviteCode,
      });
      if (error) throw error;
      const { data: membership, error: memberError } = await supabase
        .from("household_members")
        .select("*")
        .eq("user_id", user?.id ?? "")
        .maybeSingle();
      if (memberError) throw memberError;
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user?.id ?? "")
        .maybeSingle();
      if (profileError) throw profileError;
      return { name, membership, profile };
    },
  });
  return (
    <div className="app-frame px-6 py-8">
      <Link to="/" className="text-2xl font-black text-primary">
        {t("brand")}
      </Link>
      <Users className="mt-10 size-12 text-deal" aria-hidden />
      {!ready ? (
        <p className="mt-5">{t("onboarding.loading")}</p>
      ) : !user ? (
        <>
          <h1 className="my-6 text-3xl font-black">{t("onboarding.join")}</h1>
          <Button asChild className="w-full" size="lg">
            <Link to="/login" search={{ redirect: `/join/${inviteCode}`, code: "" }}>
              {t("login.title")}
              <ArrowRight />
            </Link>
          </Button>
        </>
      ) : isPending ? (
        <p className="mt-6">{t("onboarding.loading")}</p>
      ) : isError || data?.name == null ? (
        <p className="mt-6" role="alert">
          {t(isError ? "onboarding.error" : "onboarding.invalidInvite")}
        </p>
      ) : (
        <>
          <h1 className="my-6 text-2xl font-black">
            {t("onboarding.invite", { name: data.name })}
          </h1>
          {memberId ? (
            <MemberForm
              initial={{ ...defaultMember, display_name: data.profile?.display_name ?? "" }}
              submitKey="onboarding.finish"
              onSave={async (settings) => {
                await save({ data: { id: memberId, settings } });
                await saveProfile({ data: { display_name: settings.display_name } });
                await qc.invalidateQueries({ queryKey: ["household"] });
                await navigate({ to: "/app", replace: true });
              }}
            />
          ) : (
            <Button
              className="w-full"
              size="lg"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(false);
                try {
                  const { data: id, error } = await supabase.rpc("join_household", {
                    p_invite_code: inviteCode,
                  });
                  if (error) throw error;
                  const { data: m, error: mError } = await supabase
                    .from("household_members")
                    .select("id")
                    .eq("household_id", id)
                    .eq("user_id", user.id)
                    .single();
                  if (mError) throw mError;
                  if (!data.membership) await trackEvent("member_joined", {}, id);
                  setMemberId(m.id);
                  await qc.invalidateQueries({ queryKey: ["household"] });
                } catch {
                  setError(true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t(busy ? "onboarding.loading" : "onboarding.join")}
              <ArrowRight />
            </Button>
          )}
        </>
      )}
      {(error || sessionError) && (
        <p role="alert" className="mt-4 text-destructive">
          {t("onboarding.error")}
        </p>
      )}
    </div>
  );
}
