import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { RecipeView } from "@/components/RecipeView";
import { getRecipe } from "@/lib/recipe.functions";

const recipeQuery = (id: string) =>
  queryOptions({
    queryKey: ["recipe", id],
    queryFn: () => getRecipe({ data: { id } }),
    staleTime: 0,
  });

export const Route = createFileRoute("/_authenticated/rezept/$id")({
  head: () => ({
    meta: [
      { title: "Rezept – Genussio" },
      { name: "description", content: "Genussio – euer Haushalt entscheidet gemeinsam." },
      { property: "og:title", content: "Rezept – Genussio" },
      { property: "og:description", content: "Genussio – euer Haushalt entscheidet gemeinsam." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(recipeQuery(params.id)),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(recipeQuery(id));
  return <RecipeView key={id} id={id} data={data} />;
}
