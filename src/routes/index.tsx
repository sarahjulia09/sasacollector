import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth-screen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "sasa collector" },
      {
        name: "description",
        content: "Criado para organizar seus gastos com álbuns e homens de papel.",
      },
      { property: "og:title", content: "sasa collector" },
      {
        property: "og:description",
        content: "Criado para organizar seus gastos com álbuns e homens de papel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AuthScreen />,
});
