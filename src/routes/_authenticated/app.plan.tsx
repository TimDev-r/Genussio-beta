import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/app/plan")({
  head: () => ({
    meta: [
      { title: "Wochenplan – Genussio" },
      { name: "description", content: "Genussio – euer Haushalt entscheidet gemeinsam." },
      { property: "og:title", content: "Wochenplan – Genussio" },
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
    <EmptyState icon={CalendarDays} title={t("empty.plan.title")} text={t("empty.plan.text")} />
  );
}
