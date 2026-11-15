import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/datenschutz")({
  head: () => ({
    meta: [
      { title: "Datenschutz – Genussio" },
      { name: "description", content: "Datenschutzerklärung von Genussio." },
      { property: "og:title", content: "Datenschutz – Genussio" },
      { property: "og:description", content: "Datenschutzerklärung von Genussio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <LegalPage titleKey="footer.privacy" page="datenschutz" />,
});
