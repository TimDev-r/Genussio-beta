export function localizedRecipe<
  T extends { title: string | null; description: string | null; steps: unknown },
>(
  recipe: T,
  translations: readonly {
    locale: string;
    title: string | null;
    description: string | null;
    steps: unknown;
  }[],
  locale: string,
) {
  const tr = translations.find((t) => t.locale === locale);
  return {
    ...recipe,
    title: tr?.title || recipe.title,
    description: tr?.description || recipe.description,
    steps: tr?.steps ?? recipe.steps,
  };
}
export function localizedIngredient(
  key: string,
  fallback: string | null,
  translations: readonly { ingredient_key: string; locale: string; display_name: string | null }[],
  locale: string,
) {
  return (
    translations.find((t) => t.ingredient_key === key && t.locale === locale)?.display_name ||
    fallback ||
    key
  );
}
