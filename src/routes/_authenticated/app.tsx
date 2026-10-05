import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, FolderHeart, Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollectionForm } from "@/components/collection-form";
import { CollectionItem } from "@/components/collection-item";
import { useCollection } from "@/lib/collection";
import { dueLabel, formatBRL } from "@/lib/parse-expense";
import { supabase } from "@/integrations/supabase/client";
import { ProfileAvatarButton } from "@/components/profile-avatar";
import { CoverImage } from "@/components/group-cover";

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
  const client = useQueryClient();
  const navigate = useNavigate();
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
      amount: pending.reduce((n, i) => n + i.amount, 0),
      tone: "text-primary",
    },
    {
      label: "Atrasados",
      amount: pending
        .filter((i) => dueLabel(i.due_date).tone === "overdue")
        .reduce((n, i) => n + i.amount, 0),
      tone: "text-destructive",
    },
    {
      label: "Próximos 7 dias",
      amount: pending
        .filter((i) => dueLabel(i.due_date).tone === "soon")
        .reduce((n, i) => n + i.amount, 0),
      tone: "text-foreground",
    },
    { label: "Total", amount: items.reduce((n, i) => n + i.amount, 0), tone: "text-primary" },
  ];
  const ungrouped = items.filter((i) => !i.group_id);

  async function signOut() {
    await client.cancelQueries();
    client.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-8 sm:pt-12">
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
          <div className="flex items-center gap-2">
            <ProfileAvatarButton
              userId={user.id}
              username={String(user.user_metadata?.["username"] ?? "você")}
            />
            <Button variant="ghost" size="sm" onClick={signOut} title="Sair da conta">
              <LogOut /> Sair
            </Button>
          </div>
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

        <section className="pt-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-primary">Coleção</p>
              <h2 className="font-display text-3xl font-semibold">Meus grupos</h2>
            </div>
            <Button onClick={() => setAdding(true)}>
              <Plus /> Novo item
            </Button>
          </div>

          {query.isLoading ? (
            <p className="py-10 text-sm text-muted-foreground">Carregando coleção…</p>
          ) : query.isError ? (
            <p role="alert" className="py-8 text-destructive">
              Não foi possível carregar sua coleção.{" "}
              <Button variant="link" onClick={() => query.refetch()}>
                Tentar novamente
              </Button>
            </p>
          ) : groupsWithItems.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groupsWithItems.map((g) => {
                const groupItems = items.filter((i) => i.group_id === g.id);

                return (
                  <div
                    key={g.id}
                    className="group flex min-h-44 flex-col justify-between overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {g.cover_url && <CoverImage path={g.cover_url} className="h-28 w-full" />}
                    <div className="flex items-start justify-between p-5">
                      <Link
                        to="/grupo/$slug"
                        params={{ slug: g.slug }}
                        className="flex flex-1 flex-col"
                      >
                        <div className="flex items-start justify-between">
                          <FolderHeart className="size-7 text-primary" aria-hidden />
                          <ArrowRight
                            className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1"
                            aria-hidden
                          />
                        </div>

                        <div>
                          <h3 className="mt-5 font-display text-2xl font-semibold text-foreground">
                            {g.name}
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            <span>
                              {groupItems.length} {groupItems.length === 1 ? "item" : "itens"}
                            </span>
                            <strong className="text-primary">
                              {formatBRL(groupItems.reduce((n, i) => n + i.amount, 0))}
                            </strong>
                          </div>
                        </div>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border-y border-border py-12">
              <FolderHeart className="mb-3 size-7 text-primary" />
              <h3 className="font-display text-xl font-semibold">Sua coleção começa aqui.</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Adicione um item para criar seu primeiro grupo.
              </p>
            </div>
          )}
        </section>

        {ungrouped.length > 0 && (
          <section className="pt-10">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold">Itens anteriores</h2>
              <span className="text-xs text-muted-foreground">{ungrouped.length} sem grupo</span>
            </div>
            <div className="border-t border-border">
              {ungrouped.map((i) => (
                <CollectionItem key={i.id} item={i} userId={user.id} />
              ))}
            </div>
          </section>
        )}
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
