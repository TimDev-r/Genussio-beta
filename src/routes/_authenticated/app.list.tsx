import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

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
  component: Page,
});

function Page() {
  const { t } = useTranslation();
  return (
    <EmptyState icon={ShoppingCart} title={t("empty.list.title")} text={t("empty.list.text")} />
  );
}
