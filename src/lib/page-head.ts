export function pageHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} – Genussio` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} – Genussio` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
