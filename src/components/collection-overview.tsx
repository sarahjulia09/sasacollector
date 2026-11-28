import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, FolderHeart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollectionForm } from "@/components/collection-form";
import { CollectionItem } from "@/components/collection-item";
import { CoverImage } from "@/components/group-cover";
import { useCollection } from "@/lib/collection";
import { formatBRL } from "@/lib/parse-expense";
import { parseStages, totalCost } from "@/lib/payment-stages";
export function CollectionOverview({ userId }: { userId: string }) {
  const query = useCollection(userId);
  const data = query.data;
  const items = data?.items ?? [];
  const groupsWithItems = (data?.groups ?? []).filter((g) => items.some((i) => i.group_id === g.id));
  const ungrouped = items.filter((i) => !i.group_id);
  const [adding, setAdding] = useState(false);
  return <>        <section className="pt-10">
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
                    {g.cover_url && <CoverImage path={g.cover_url} className="h-44 w-full" />}
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
                              {formatBRL(groupItems.reduce((n, i) => n + totalCost(i.amount, parseStages(i.stages)), 0))}
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
                <CollectionItem key={i.id} item={i} userId={userId} />
              ))}
            </div>
          </section>
        )}

    {adding && <CollectionForm userId={userId} groups={data?.groups ?? []} eras={data?.eras ?? []} onClose={() => setAdding(false)} />}
  </>;
}
