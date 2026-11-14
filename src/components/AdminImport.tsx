import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Check, Upload, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { importKinds, validateImport, type ImportKind } from "@/lib/import-rules";
import { importContent, deleteExpiredDeals, saveRecipeImage } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { LanguagePicker } from "./LanguagePicker";
import { useQuery } from "@tanstack/react-query";
import { getCatalog } from "@/lib/catalog.functions";
import { localizedIngredient, localizedRecipe } from "@/lib/catalog-localization";
import placeholder from "@/assets/recipe-placeholder.jpg";

export function AdminImport() {
  const { t, i18n } = useTranslation();
  const fetchCatalog = useServerFn(getCatalog);
  const catalog = useQuery({ queryKey: ["admin-catalog"], queryFn: () => fetchCatalog() });
  const [kind, setKind] = useState<ImportKind>("deals");
  const [sources, setSources] = useState<Record<ImportKind, string>>({
    deals: "",
    recipes: "",
    prices: "",
  });
  const [preview, setPreview] = useState<ReturnType<typeof validateImport> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<{ id: string; title: string }[]>([]);
  const runImport = useServerFn(importContent),
    removeExpired = useServerFn(deleteExpiredDeals),
    saveImage = useServerFn(saveRecipeImage);

  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await catalog.refetch();
    } catch (error) {
      setMessage(
        t("admin.saveFailed", {
          lng: "de-AT",
          reason: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  function uploadPhoto(recipeId: string, file: File) {
    void perform(async () => {
      if (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setMessage(
          t("admin.saveFailed", {
            lng: "de-AT",
            reason: t("admin.badImage", { lng: "de-AT" }),
          }),
        );
        return;
      }
      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = `${recipeId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("recipe-images").upload(path, file);
      if (error) {
        setMessage(t("admin.uploadFailed", { lng: "de-AT", reason: error.message }));
        return;
      }
      try {
        await saveImage({ data: { id: recipeId, path } });
      } catch (error) {
        await supabase.storage.from("recipe-images").remove([path]);
        setMessage(
          t("admin.saveFailed", {
            lng: "de-AT",
            reason: error instanceof Error ? error.message : String(error),
          }),
        );
        return;
      }
      setMessage(t("admin.imageSaved", { lng: "de-AT" }));
    });
  }

  const canImport =
    preview && !preview.error && preview.rows.length > 0 && preview.rows.every((row) => !row.errors.length);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[480px] px-5 py-6">
      <header className="mb-6 flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link to="/app">
            <ArrowLeft />
            {t("admin.back")}
          </Link>
        </Button>
        <LanguagePicker />
      </header>
      <h1 className="mb-6 text-2xl font-extrabold">{t("admin.title")}</h1>
      <Tabs
        value={kind}
        onValueChange={(value) => {
          if (importKinds.includes(value as ImportKind)) {
            setKind(value as ImportKind);
            setPreview(null);
            setMessage("");
            setSaved([]);
          }
        }}
      >
        <TabsList className="grid h-12 w-full grid-cols-3">
          {importKinds.map((value) => (
            <TabsTrigger key={value} value={value} disabled={busy}>
              {t(`admin.${value}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <label className="mt-6 block text-sm font-bold" htmlFor="import-json">
        {t("admin.json")}
      </label>
      <Textarea
        id="import-json"
        value={sources[kind]}
        disabled={busy}
        spellCheck={false}
        className="mt-2 min-h-64 font-mono text-sm"
        onChange={(event) => {
          setSources({ ...sources, [kind]: event.target.value });
          setPreview(null);
          setSaved([]);
          setMessage("");
        }}
      />
      <div className="my-4 flex gap-3">
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            setPreview(validateImport(kind, sources[kind]));
            setMessage("");
          }}
        >
          <Check />
          {t("admin.check")}
        </Button>
        <Button
          disabled={busy || !canImport}
          onClick={() =>
            void perform(async () => {
              const result = await runImport({ data: { kind, source: sources[kind] } });
              setSaved(result.saved);
              setMessage(t("admin.success", { count: result.count }));
              setPreview(null);
            })
          }
        >
          <Upload />
          {t(busy ? "admin.working" : "admin.import")}
        </Button>
      </div>
      {preview?.error && (
        <p role="alert" className="text-destructive">
          {t(`admin.${preview.error}`)}
        </p>
      )}
      {preview && preview.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">{t("admin.row")}</th>
                <th className="p-2">{t("admin.item")}</th>
                <th className="p-2">{t("admin.status")}</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row.index} className="border-b align-top">
                  <td className="p-2">{row.index + 1}</td>
                  <td className="max-w-40 break-words p-2">
                    {row.label}
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
                      {JSON.stringify(row.data, null, 2)}
                    </pre>
                  </td>
                  <td className="max-w-40 break-words p-2">
                    {row.errors.length
                      ? row.errors.map((error, i) => (
                          <p className="text-destructive" key={i}>
                            {error.field}: {t(`admin.${error.code}`, { lng: "de-AT" })}
                          </p>
                        ))
                      : t("admin.valid")}
                    {row.missing.length > 0 && (
                      <p className="mt-2 text-muted-foreground">
                        {t("admin.missing")}: {row.missing.join(", ")}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {message && (
        <p role="status" className="my-4 break-words">
          {message}
        </p>
      )}
      {kind === "recipes" && (
        <div className="my-6 space-y-5">
          {catalog.data?.recipes.map((source) => {
            const recipe = localizedRecipe(source, source.recipe_translations, i18n.language);
            return (
              <details key={recipe.id} className="border-b pb-4">
                <summary className="flex cursor-pointer items-center gap-3 font-bold">
                  <img
                    src={recipe.image_url || placeholder}
                    alt=""
                    loading="lazy"
                    width={48}
                    height={48}
                    className="size-12 shrink-0 rounded-lg object-cover"
                  />
                  {recipe.title}
                </summary>
                <img
                  src={recipe.image_url || placeholder}
                  alt=""
                  loading="lazy"
                  width={768}
                  height={768}
                  className="my-3 aspect-square w-full rounded-2xl object-cover"
                />
                <p>{recipe.description}</p>
                <ul className="my-3 list-disc pl-5">
                  {recipe.recipe_ingredients.map((ing) => (
                    <li key={ing.id}>
                      {ing.quantity} {ing.unit}{" "}
                      {localizedIngredient(
                        ing.ingredient_key,
                        ing.display_name,
                        catalog.data?.ingredientTranslations ?? [],
                        i18n.language,
                      )}
                    </li>
                  ))}
                </ul>
                <ol className="list-decimal space-y-2 pl-5">
                  {Array.isArray(recipe.steps) &&
                    recipe.steps.map((step, index) => (
                      <li key={index}>
                        {typeof step === "object" && step !== null && "text" in step ? String(step["text"]) : ""}
                      </li>
                    ))}
                </ol>
                <Button asChild variant="outline" className="mt-3">
                  <label className={busy ? "pointer-events-none opacity-50" : "cursor-pointer"}>
                    <Upload />
                    {t("admin.upload")}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={busy}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) uploadPhoto(recipe.id, file);
                      }}
                    />
                  </label>
                </Button>
              </details>
            );
          })}
        </div>
      )}
      {kind === "deals" && (
        <ul className="my-6 space-y-3">
          {catalog.data?.deals.map((deal) => (
            <li key={deal.id} className="border-b pb-3">
              <p className="font-bold">{deal.product_name}</p>
              <p className="text-sm text-muted-foreground">
                {localizedIngredient(
                  deal.ingredient_key ?? "",
                  catalog.data?.ingredientTranslations.find(
                    (tr) => tr.ingredient_key === deal.ingredient_key && tr.locale === "de-AT",
                  )?.display_name ?? null,
                  catalog.data?.ingredientTranslations ?? [],
                  i18n.language,
                )}{" "}
                · {deal.store}
              </p>
            </li>
          ))}
        </ul>
      )}
      {saved.map((recipe) => (
        <div key={recipe.id} className="my-4 border-b py-3">
          <p className="mb-2 font-bold">{recipe.title}</p>
          <label className="block">
            <span className="text-sm">{t("admin.upload")}</span>
            <input
              className="mt-2 block w-full text-sm"
              disabled={busy}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label={`${t("admin.upload")}: ${recipe.title}`}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) uploadPhoto(recipe.id, file);
              }}
            />
          </label>
        </div>
      ))}
      {kind === "deals" && (
        <Button
          variant="outline"
          disabled={busy}
          className="mt-6 h-auto min-h-11 w-full whitespace-normal"
          onClick={() => {
            if (window.confirm(t("admin.confirm")))
              void perform(async () => {
                const count = await removeExpired();
                setMessage(t("admin.deleted", { count }));
              });
          }}
        >
          <Trash2 />
          {t("admin.clear")}
        </Button>
      )}
    </main>
  );
}
