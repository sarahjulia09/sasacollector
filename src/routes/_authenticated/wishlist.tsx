import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useCollection } from '@/lib/collection';
import { WishlistTab } from '@/components/wishlist-tab';
import { Button } from '@/components/ui/button';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/_authenticated/wishlist')({ head: () => pageHead('Minha wishlist', 'Templates e prioridades da sua coleção, com marcações WTB, OTW e HAVE.'), component: WishlistPage });
function WishlistPage() {
  const { user } = Route.useRouteContext();
  const collection = useCollection(user.id);
  const [selected, setSelected] = useState<string | null>(null);
  const groups = collection.data?.groups ?? [];
  const groupId = selected ?? groups[0]?.id;
  return <main className="mx-auto min-h-screen max-w-4xl px-4 pb-28 pt-8 sm:px-8"><h1 className="font-display text-4xl font-semibold text-primary">Minha wishlist</h1><div className="mt-5 flex flex-wrap gap-2">{groups.map((g) => <Button key={g.id} size="sm" variant={groupId === g.id ? 'default' : 'outline'} aria-pressed={groupId === g.id} onClick={() => setSelected(g.id)}>{g.name}</Button>)}</div>{collection.isLoading ? <p className="py-8">Carregando…</p> : collection.isError ? <p role="alert" className="py-8 text-destructive">Não foi possível carregar os grupos.</p> : groupId ? <WishlistTab key={groupId} userId={user.id} groupId={groupId} /> : <p className="py-10 text-sm text-muted-foreground">Nenhum template por aqui. Jura que não tem nenhum pc que não sai da sua cabeça?</p>}</main>;
}
