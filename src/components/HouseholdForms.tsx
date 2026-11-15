import { trackEvent } from "@/lib/track-event";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  ALLERGENS,
  STORES,
  COOK_TIMES,
  householdSchema,
  memberSchema,
  type HouseholdSettings,
  type MemberSettings,
} from "@/lib/household-rules";
import { formatPrice, formatNumber } from "@/i18n";

export function HouseholdForm({
  initial,
  betaCode,
  onSave,
  submitKey = "onboarding.save",
}: {
  initial: HouseholdSettings;
  betaCode?: string;
  onSave: (settings: HouseholdSettings, code: string) => Promise<void>;
  submitKey?: string;
}) {
  const { t, i18n } = useTranslation();
  const [value, setValue] = useState(initial);
  const [code, setCode] = useState(betaCode ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(householdSchema.parse(value), code);
    } catch (e) {
      setError(
        e &&
          typeof e === "object" &&
          "message" in e &&
          typeof e.message === "string" &&
          e.message.startsWith("Bitte")
          ? e.message
          : t("onboarding.error"),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-6">
      <label className="block font-bold">
        {t("onboarding.householdName")}
        <Input
          className="mt-2 h-12"
          maxLength={100}
          required
          value={value.name}
          onChange={(e) => setValue({ ...value, name: e.target.value })}
        />
      </label>
      {betaCode !== undefined && (
        <label className="block font-bold">
          {t("onboarding.betaCode")}
          <Input
            className="mt-2 h-12"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
      )}
      <fieldset>
        <legend className="mb-3 font-bold">{t("onboarding.stores")}</legend>
        <div className="flex flex-wrap gap-2">
          {STORES.map((store) => (
            <Button
              key={store}
              type="button"
              variant={value.stores.includes(store) ? "default" : "outline"}
              aria-pressed={value.stores.includes(store)}
              onClick={() =>
                setValue({
                  ...value,
                  stores: value.stores.includes(store)
                    ? value.stores.filter((s) => s !== store)
                    : [...value.stores, store],
                })
              }
            >
              {t(`onboarding.storeNames.${store}`)}
            </Button>
          ))}
        </div>
      </fieldset>
      <div>
        <div className="mb-4 flex justify-between font-bold">
          <label htmlFor="budget">{t("onboarding.budget")}</label>
          <output>{formatPrice(value.weekly_budget, i18n.language)}</output>
        </div>
        <Slider
          id="budget"
          aria-label={t("onboarding.budget")}
          min={30}
          max={200}
          step={1}
          value={[value.weekly_budget]}
          onValueChange={(v) => setValue({ ...value, weekly_budget: v[0] ?? 80 })}
        />
        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          <span>{formatPrice(30, i18n.language)}</span>
          <span>{formatPrice(200, i18n.language)}</span>
        </div>
      </div>
      <label className="block font-bold">
        {t("onboarding.dinners")}
        <Input
          type="number"
          min={3}
          max={7}
          className="mt-2 h-12"
          value={value.dinners_per_week}
          onChange={(e) => setValue({ ...value, dinners_per_week: Number(e.target.value) })}
        />
      </label>
      <fieldset>
        <legend className="mb-3 font-bold">{t("onboarding.cookTime")}</legend>
        <div className="grid grid-cols-4 gap-2">
          {COOK_TIMES.map((n) => (
            <Button
              key={n}
              type="button"
              aria-label={t("onboarding.minutes", { count: n })}
              aria-pressed={value.max_cook_minutes === n}
              variant={value.max_cook_minutes === n ? "default" : "outline"}
              onClick={() => setValue({ ...value, max_cook_minutes: n })}
            >
              {formatNumber(n, i18n.language)}
            </Button>
          ))}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <Button className="w-full" type="submit" size="lg" disabled={busy || !value.stores.length}>
        <Save />
        {t(busy ? "onboarding.loading" : submitKey)}
      </Button>
    </form>
  );
}
export function MemberForm({
  initial,
  onSave,
  isKid = false,
  submitKey = "onboarding.save",
}: {
  initial: MemberSettings;
  onSave: (settings: MemberSettings) => Promise<void>;
  isKid?: boolean;
  submitKey?: string;
}) {
  const { t } = useTranslation();
  const [v, setV] = useState(initial);
  const [dislike, setDislike] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  // Allergies are health data (Art. 9 GDPR): saving them needs an explicit opt-in.
  const [allergyConsent, setAllergyConsent] = useState(initial.allergies.length > 0);
  const needsConsent = v.allergies.length > 0 && !allergyConsent;
  const add = () => {
    const d = dislike.trim();
    if (d && !v.dislikes.includes(d)) setV({ ...v, dislikes: [...v.dislikes, d] });
    setDislike("");
  };
  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(false);
        if (needsConsent) return;
        try {
          await onSave(memberSchema.parse(v));
          if (v.allergies.length > 0)
            void trackEvent("allergy_consent_given", { allergies: v.allergies.length });
        } catch {
          setError(true);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block font-bold">
        {t("onboarding.name")}
        <Input
          required
          maxLength={100}
          className="mt-2 h-12"
          value={v.display_name}
          onChange={(e) => setV({ ...v, display_name: e.target.value })}
        />
      </label>
      <fieldset>
        <legend className="mb-3 font-bold">{t("onboarding.diet")}</legend>
        <div className="flex flex-wrap gap-2">
          {(["alles", "vegetarisch", "vegan"] as const).map((d) => (
            <Button
              key={d}
              type="button"
              variant={v.diet === d ? "default" : "outline"}
              aria-pressed={v.diet === d}
              onClick={() => setV({ ...v, diet: d })}
            >
              {t(`onboarding.diets.${d}`)}
            </Button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 font-bold">{t("onboarding.allergies")}</legend>
        <div className="flex flex-wrap gap-2">
          {ALLERGENS.map((a) => (
            <Button
              key={a}
              type="button"
              variant={v.allergies.includes(a) ? "default" : "outline"}
              aria-pressed={v.allergies.includes(a)}
              onClick={() =>
                setV({
                  ...v,
                  allergies: v.allergies.includes(a)
                    ? v.allergies.filter((x) => x !== a)
                    : [...v.allergies, a],
                })
              }
            >
              {t(`onboarding.allergen.${a}`)}
            </Button>
          ))}
        </div>
        {v.allergies.length > 0 && (
          <label className="mt-3 flex items-start gap-3 rounded-2xl bg-muted p-3 text-sm">
            <input
              type="checkbox"
              required
              checked={allergyConsent}
              onChange={(e) => setAllergyConsent(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]"
            />
            <span>
              {t("onboarding.allergyConsent")}{" "}
              <a
                href="/datenschutz"
                target="_blank"
                rel="noreferrer"
                className="font-bold underline"
              >
                {t("footer.privacy")}
              </a>
            </span>
          </label>
        )}
      </fieldset>
      {!isKid && (
        <div>
          <label htmlFor="dislikes" className="font-bold">
            {t("onboarding.dislikes")}
          </label>
          <div className="mt-2 flex gap-2">
            <Input
              id="dislikes"
              maxLength={80}
              value={dislike}
              onChange={(e) => setDislike(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <Button type="button" size="icon" aria-label={t("onboarding.addDislike")} onClick={add}>
              <Plus />
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {v.dislikes.map((d) => (
              <Button
                key={d}
                type="button"
                variant="secondary"
                onClick={() => setV({ ...v, dislikes: v.dislikes.filter((x) => x !== d) })}
              >
                {d}
                <X className="size-3" />
              </Button>
            ))}
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {t("onboarding.error")}
        </p>
      )}
      <Button className="w-full" size="lg" disabled={busy} type="submit">
        <Save />
        {t(busy ? "onboarding.loading" : submitKey)}
      </Button>
    </form>
  );
}
