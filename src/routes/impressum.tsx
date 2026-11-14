import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/impressum")({
  head: () => ({ meta: [
    { title: "Impressum – Genussio" },
    { name: "description", content: "Impressum von Genussio." },
    { property: "og:title", content: "Impressum – Genussio" },
    { property: "og:description", content: "Impressum von Genussio." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <LegalPage titleKey="footer.imprint" />,
});
