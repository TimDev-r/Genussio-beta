import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { ShoppingList } from "@/components/ShoppingList";
import { listQuery } from "@/lib/plan-query";

export const Route = createFileRoute("/_authenticated/app/list")({
  head: () => ({
    meta: [
      { title: "Einkaufsliste – Genussio" },
      { name: "description", content: "Genussio – euer Haushalt entscheidet gemeinsam." },
      { property: "og:title", content: "Einkaufsliste – Genussio" },
      { property: "og:description", content: "Genussio – euer Haushalt entscheidet gemeinsam." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(listQuery()),
  component: Page,
});

function Page() {
  const { t } = useTranslation();
  const { data } = useSuspenseQuery(listQuery());
  if (!data.householdId || data.items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center pb-8">
        <EmptyState icon={ShoppingCart} title={t("empty.list.title")} text={t("empty.list.text")} />
        <Button asChild>
          <Link to="/app/plan">{t("list.toPlan")}</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
      <h1 className="text-xl font-extrabold">{t("list.title")}</h1>
      <ShoppingList
        householdId={data.householdId}
        stores={data.stores}
        items={data.items}
        members={data.members}
        ingredientTranslations={data.ingredientTranslations}
      />
    </div>
  );
}
