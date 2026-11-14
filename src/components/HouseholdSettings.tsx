import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Pencil, Trash2, Plus, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguagePicker } from "@/components/LanguagePicker";
import { HouseholdForm, MemberForm } from "./HouseholdForms";
import { HouseholdInvitation } from "./HouseholdInvitation";
import { householdQuery } from "@/lib/household-query";
import {
  saveHousehold,
  saveMember,
  addKid,
  removeKid,
  savePersonalProfile,
} from "@/lib/household.functions";
import { defaultMember, defaultHousehold, type MemberSettings } from "@/lib/household-rules";
import { supabase } from "@/integrations/supabase/client";
import { setLocale } from "@/i18n";
import { trackEvent } from "@/lib/track-event";

export function HouseholdSettingsPage() {
  const { t, i18n } = useTranslation();
  const { data } = useSuspenseQuery(householdQuery());
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [edit, setEdit] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveH = useServerFn(saveHousehold);
  const saveM = useServerFn(saveMember);
  const add = useServerFn(addKid);
  const remove = useServerFn(removeKid);
  const profile = useServerFn(savePersonalProfile);
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["household"] });
    setSaved(true);
  };
  if (!data.household || !data.membership) return null;
  const household = data.household;
  const own = data.membership;
  return (
    <div className="px-6 py-8 space-y-10">
      <header>
        <p className="font-black text-primary">{t("brand")}</p>
        <h1 className="mt-2 text-3xl font-black break-words">
          {household.name || t("nav.household")}
        </h1>
      </header>
      <section>
        <h2 className="mb-4 text-xl font-black">{t("nav.household")}</h2>
        <ul className="space-y-3">
          {data.members.map((m) => (
            <li key={m.id} className="card-soft p-4">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-extrabold">
                    {m.display_name || t("onboarding.name")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(`onboarding.diets.${m.diet}`)}
                    {m.is_kid
                      ? ` · ${t("onboarding.kid")}`
                      : m.id === own.id
                        ? ` · ${t("onboarding.you")}`
                        : ""}
                  </p>
                </div>
                {(m.is_kid || m.id === own.id) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t(edit === m.id ? "onboarding.back" : "onboarding.edit")}
                    onClick={() => setEdit(edit === m.id ? "" : m.id)}
                  >
                    {edit === m.id ? <X /> : <Pencil />}
                  </Button>
                )}
                {m.is_kid && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("onboarding.remove")}
                    onClick={() => setConfirm(m.id)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
              {confirm === m.id && (
                <div className="mt-4">
                  <p>{t("onboarding.confirmRemove")}</p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        try {
                          await remove({ data: { id: m.id } });
                          await refresh();
                          setConfirm("");
                        } catch {
                          setError(true);
                        }
                      }}
                    >
                      {t("onboarding.remove")}
                    </Button>
                    <Button variant="outline" onClick={() => setConfirm("")}>
                      {t("onboarding.back")}
                    </Button>
                  </div>
                </div>
              )}
              {edit === m.id && (
                <div className="mt-6">
                  <MemberForm
                    initial={
                      {
                        display_name: m.display_name ?? "",
                        diet: m.diet,
                        allergies: m.allergies,
                        dislikes: m.dislikes,
                      } as MemberSettings
                    }
                    isKid={m.is_kid}
                    onSave={async (settings) => {
                      await saveM({ data: { id: m.id, settings } });
                      if (m.id === own.id)
                        await profile({ data: { display_name: settings.display_name } });
                      await refresh();
                      setEdit("");
                    }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
        <Button variant="outline" className="mt-4 w-full" onClick={() => setAdding(!adding)}>
          <Plus />
          {t("onboarding.addKid")}
        </Button>
        {adding && (
          <div className="mt-6">
            <MemberForm
              initial={defaultMember}
              isKid
              onSave={async (settings) => {
                await add({ data: { householdId: household.id, settings } });
                await trackEvent("kid_added", {}, household.id);
                await refresh();
                setAdding(false);
              }}
            />
          </div>
        )}
      </section>
      <HouseholdInvitation inviteCode={household.invite_code} householdId={household.id} />
      <section>
        <h2 className="mb-5 text-xl font-black">
          {t("onboarding.stores")} &amp; {t("onboarding.budget")}
        </h2>
        <HouseholdForm
          initial={{
            name: household.name ?? "",
            stores: household.stores as typeof defaultHousehold.stores,
            weekly_budget: household.weekly_budget ?? 80,
            dinners_per_week: household.dinners_per_week,
            max_cook_minutes: household.max_cook_minutes,
          }}
          onSave={async (settings) => {
            await saveH({ data: { id: household.id, settings } });
            await refresh();
          }}
        />
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black">{t("footer.language")}</h2>
        <LanguagePicker
          onChange={(locale) => {
            setError(false);
            void profile({ data: { locale } })
              .then(async () => {
                const { error } = await supabase.auth.updateUser({ data: { locale } });
                if (error) throw error;
                setLocale(i18n, locale);
                return refresh();
              })
              .catch(() => setError(true));
          }}
        />
        {saved && (
          <p role="status" className="text-deal">
            {t("onboarding.saved")}
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive">
            {t("onboarding.error")}
          </p>
        )}
        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            await qc.cancelQueries();
            qc.clear();
            const { error } = await supabase.auth.signOut();
            if (error) {
              setError(true);
              return;
            }
            await navigate({
              to: "/login",
              search: { code: "", redirect: "/start" },
              replace: true,
            });
          }}
        >
          <LogOut />
          {t("onboarding.signOut")}
        </Button>
      </section>
    </div>
  );
}
