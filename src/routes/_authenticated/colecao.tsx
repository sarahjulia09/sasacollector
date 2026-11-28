import { createFileRoute } from '@tanstack/react-router';
import { CollectionOverview } from '@/components/collection-overview';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/_authenticated/colecao')({ head: () => pageHead('Minha coleção', 'Seus grupos e binders, com itens organizados por álbum, evento e kit.'), component: CollectionPage });
function CollectionPage() {
  const { user } = Route.useRouteContext();
  return <main className="mx-auto min-h-screen max-w-5xl px-4 pb-28 pt-8 sm:px-8"><h1 className="font-display text-4xl font-semibold text-primary">Minha coleção</h1><CollectionOverview userId={user.id} /></main>;
}
