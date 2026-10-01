import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth-screen";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "sasa collector — Entrar" },
      {
        name: "description",
        content: "Entre com seu nome de usuário para anotar gastos e ver o que está pendente.",
      },
      { property: "og:title", content: "sasa collector — Entrar" },
      {
        property: "og:description",
        content: "Entre com seu nome de usuário para anotar gastos e ver o que está pendente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AuthScreen />,
});
