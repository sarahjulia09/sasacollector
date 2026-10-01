import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth-screen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "sasa collector — gastos e prazos" },
      {
        name: "description",
        content: "Anote gastos no formato item - valor - prazo e veja o que está pendente, ordenado por vencimento.",
      },
      { property: "og:title", content: "sasa collector" },
      {
        property: "og:description",
        content: "Criado para organizarmos nossos gastos com álbuns e homens de papel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AuthScreen />,
});
