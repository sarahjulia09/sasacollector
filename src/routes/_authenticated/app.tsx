import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, FolderHeart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollectionForm } from "@/components/collection-form";
import { useCollection } from "@/lib/collection";
import { dueLabel, formatBRL } from "@/lib/parse-expense";
import { PendingMural } from "@/components/pending-mural";
import { pendingCost, pendingPayments, parseStages, totalCost } from "@/lib/payment-stages";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Meus binders — sasa collector" },
      {
        name: "description",
        content: "Acompanhe seus gastos e organize photocards e merchs por grupo.",
      },
      { property: "og:title", content: "Meus binders — sasa collector" },
      {
        property: "og:description",
        content: "Acompanhe seus gastos e organize photocards e merchs por grupo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const query = useCollection(user.id);
  const [adding, setAdding] = useState(false);
  const data = query.data;
  const items = data?.items ?? [];
  const groupsWithItems = (data?.groups ?? []).filter((group) =>
    items.some((item) => item.group_id === group.id),
  );
  const pending = items.filter((i) => !i.paid);
  const metrics = [
    {
      label: "Total pendente",
      amount: pending.reduce((n, i) => n + pendingCost(i.amount, i.item_paid, parseStages(i.stages)), 0),
      tone: "text-primary",
    },
    {
      label: "Atrasados",
      amount: pending.flatMap(pendingPayments)
        .filter((i) => dueLabel(i.due_date).tone === "overdue")
        .reduce((n, i) => n + i.amount, 0),
      tone: "text-destructive",
    },
    {
      label: "Próximos 7 dias",
      amount: pending.flatMap(pendingPayments)
        .filter((i) => dueLabel(i.due_date).tone === "soon")
        .reduce((n, i) => n + i.amount, 0),
      tone: "text-foreground",
    },
    { label: "Total", amount: items.reduce((n, i) => n + totalCost(i.amount, parseStages(i.stages)), 0), tone: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-8 sm:pt-12">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-7">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Sua coleção · suas contas
            </p>
            <h1 className="font-display text-4xl font-semibold text-primary sm:text-5xl">
              sasa collector
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              all you need is love, dream$ and $kz
            </p>
          </div>
          <Button onClick={() => setAdding(true)}><Plus /> Novo item</Button>
        </header>

        <section className="pt-8" aria-label="Resumo financeiro">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold">Visão geral</h2>
            <span className="text-xs text-muted-foreground">
              {pending.length} pendente{pending.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="min-w-0 rounded-md border border-border bg-card p-3 sm:p-4"
              >
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p
                  className={`mt-3 break-words font-display text-xl font-semibold sm:text-2xl ${m.tone}`}
                >
                  {formatBRL(m.amount)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <PendingMural userId={user.id} items={items} groups={data?.groups ?? []} eras={data?.eras ?? []} loading={query.isLoading} failed={query.isError} />
        <section className="pt-10"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl font-semibold">Meus grupos</h2><Button asChild variant="link"><Link to="/colecao">Ver coleção <ArrowRight /></Link></Button></div><div className="flex flex-wrap gap-2">{groupsWithItems.map((g) => <Button key={g.id} asChild variant="outline"><Link to="/grupo/$slug" params={{ slug: g.slug }}><FolderHeart />{g.name}</Link></Button>)}</div></section>
      </main>

      {adding && (
        <CollectionForm
          userId={user.id}
          groups={data?.groups ?? []}
          eras={data?.eras ?? []}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}
