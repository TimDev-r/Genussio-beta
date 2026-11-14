import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/app/matches")({
  head: () => ({
    meta: [
      { title: "Matches – Genussio" },
      { name: "description", content: "Genussio – euer Haushalt entscheidet gemeinsam." },
      { property: "og:title", content: "Matches – Genussio" },
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
    <EmptyState icon={Heart} title={t("empty.matches.title")} text={t("empty.matches.text")} />
  );
}
