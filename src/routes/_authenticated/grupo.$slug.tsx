import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Plus, Layers3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollectionForm } from "@/components/collection-form";
import { CollectionItem } from "@/components/collection-item";
import { deleteEraCascade, deleteGroupCascade, useCollection } from "@/lib/collection";
import { formatBRL } from "@/lib/parse-expense";

export const Route = createFileRoute("/_authenticated/grupo/$slug")({
  head: () => ({
    meta: [
      { title: "Binder do grupo — sasa collector" },
      {
        name: "description",
        content: "Photocards e merchs organizados por álbum, evento ou kit, com valores e prazos.",
      },
      { property: "og:title", content: "Binder do grupo — sasa collector" },
      {
        property: "og:description",
        content: "Photocards e merchs organizados por álbum, evento ou kit, com valores e prazos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GroupPage,
});

function GroupPage() {
  const { slug } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const query = useCollection(user.id);
  const [adding, setAdding] = useState(false);
  const data = query.data;
  const group = data?.groups.find((g) => g.slug === slug);
  const deleteEra = useMutation({
    mutationFn: async (eraId: string) => deleteEraCascade(eraId, user.id),
    onSuccess: () => query.refetch(),
  });
  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => deleteGroupCascade(groupId, user.id),
    onSuccess: () => {
      query.refetch();
      navigate({ to: "/app" });
    },
  });
  const groupItems = data?.items.filter((i) => i.group_id === group?.id) ?? [];
  const eras = data?.eras.filter((e) => e.group_id === group?.id) ?? [];
  const sections = eras.map((era) => ({
    id: era.id,
    name: era.name,
    items: groupItems.filter((i) => i.era_id === era.id),
  }));
  const withoutEra = groupItems.filter((i) => !i.era_id);
  if (withoutEra.length)
    sections.push({ id: "other", name: "Sem álbum / evento / kit", items: withoutEra });
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-8 sm:pt-12">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Voltar ao menu principal
        </Link>
        {query.isLoading ? (
          <p className="py-10 text-muted-foreground">Carregando grupo…</p>
        ) : query.isError ? (
          <p role="alert" className="py-10 text-destructive">
            Não foi possível carregar o grupo.{" "}
            <Button variant="link" onClick={() => query.refetch()}>
              Tentar novamente
            </Button>
          </p>
        ) : !group ? (
          <div className="py-16">
            <h1 className="font-display text-3xl">Grupo não encontrado</h1>
          </div>
        ) : (
          <>
            <header className="mt-8 border-b border-border pb-7">
              <p className="mb-2 text-xs font-semibold uppercase text-primary">Binder / Grupo</p>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="font-display text-4xl font-semibold text-foreground sm:text-5xl">
                    {group.name}
                  </h1>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {groupItems.length}{" "}
                    {groupItems.length === 1 ? "item cadastrado" : "itens cadastrados"} ·{" "}
                    {eras.length} {eras.length === 1 ? "categoria" : "categorias"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => setAdding(true)}>
                    <Plus /> Novo item
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Excluir o grupo ${group.name}? Todos os itens e categorias deste grupo serão removidos.`,
                        )
                      )
                        deleteGroup.mutate(group.id);
                    }}
                  >
                    <Trash2 className="size-4" /> Excluir grupo
                  </Button>
                </div>
              </div>
            </header>
            <div className="flex flex-wrap gap-8 border-b border-border py-6">
              <div>
                <p className="text-xs text-muted-foreground">Total no grupo</p>
                <p className="mt-1 font-display text-2xl font-semibold text-primary">
                  {formatBRL(groupItems.reduce((n, i) => n + i.amount, 0))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendente</p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  {formatBRL(groupItems.filter((i) => !i.paid).reduce((n, i) => n + i.amount, 0))}
                </p>
              </div>
            </div>
            {sections.length ? (
              sections.map((section) => (
                <section key={section.id} className="pt-10">
                  <div className="flex flex-wrap items-end justify-between gap-2 border-b border-primary/25 pb-3">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-primary">
                        Álbum / Evento / Kits
                      </p>
                      <h2 className="font-display text-3xl font-semibold">{section.name}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {section.items.length} pcs / itens <span aria-hidden>·</span>{" "}
                        <strong className="text-foreground">
                          {formatBRL(section.items.reduce((n, i) => n + i.amount, 0))}
                        </strong>
                      </p>
                      {section.id !== "other" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Excluir categoria"
                          aria-label={`Excluir categoria ${section.name}`}
                          disabled={deleteEra.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Excluir a categoria ${section.name}? Todos os itens dessa categoria serão removidos.`,
                              )
                            )
                              deleteEra.mutate(section.id);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {section.items.length ? (
                    section.items.map((i) => (
                      <CollectionItem key={i.id} item={i} userId={user.id} />
                    ))
                  ) : (
                    <p className="py-8 text-sm text-muted-foreground">
                      Nenhum item nesta categoria ainda.
                    </p>
                  )}
                </section>
              ))
            ) : (
              <div className="py-16">
                <Layers3 className="mb-3 size-7 text-primary" />
                <h2 className="font-display text-xl font-semibold">
                  Este binder ainda está vazio.
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Adicione um item para começar.</p>
              </div>
            )}
            {adding && (
              <CollectionForm
                userId={user.id}
                groups={data?.groups ?? []}
                eras={data?.eras ?? []}
                initialGroupId={group.id}
                onClose={() => setAdding(false)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
