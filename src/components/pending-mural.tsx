import { useState } from 'react';
import { CalendarClock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollectionItem } from '@/components/collection-item';
import { pendingMuralItems } from '@/lib/pending-items';
import { pendingCost, parseStages } from '@/lib/payment-stages';
import { formatBRL } from '@/lib/parse-expense';
import type { Item, Group, Era } from '@/lib/collection';
export function PendingMural({ userId, items, groups, eras, loading, failed }: { userId: string; items: Item[]; groups: Group[]; eras: Era[]; loading: boolean; failed: boolean }) {
  const [groupId, setGroupId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const all = pendingMuralItems(items, groupId, true);
  const visible = pendingMuralItems(items, groupId, expanded);
  const relevant = groups.filter((g) => items.some((i) => !i.paid && i.group_id === g.id));
  return <section aria-labelledby="pending-title" className="mt-8 border-t-2 border-primary pt-5">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="pending-title" className="flex items-center gap-2 font-display text-2xl font-semibold text-primary"><CalendarClock className="size-5" />Mural de pendências</h2><span className="text-xs text-muted-foreground">{all.length} pendentes · <strong className="text-primary">{formatBRL(all.reduce((n,i) => n + pendingCost(i.amount,i.item_paid,parseStages(i.stages)),0))}</strong></span></div>
    <div className="my-4 flex flex-wrap gap-2" aria-label="Filtrar pendências por grupo">
      <Button size="sm" variant={groupId === null ? 'default' : 'outline'} aria-pressed={groupId === null} onClick={() => { setGroupId(null); setExpanded(false); }}>Todos</Button>
      {relevant.map((g) => <Button size="sm" key={g.id} variant={groupId === g.id ? 'default' : 'outline'} aria-pressed={groupId === g.id} onClick={() => { setGroupId(g.id); setExpanded(false); }}>{g.name}</Button>)}
    </div>
    {loading ? <p className="py-6 text-sm text-muted-foreground">Carregando pendências…</p> : failed ? <p role="alert" className="py-6 text-sm text-destructive">Não foi possível carregar as pendências.</p> : visible.length ? <div className="border-t border-border">{visible.map((item) => <CollectionItem key={item.id} item={item} userId={userId} eraName={eras.find((e) => e.id === item.era_id)?.name ?? "Sem álbum / evento / kit"} />)}</div> : <p className="py-6 text-sm text-muted-foreground">Nenhum pagamento pendente! O bolso descansa até o próximo frete surpresa (ou taxa da receita).</p>}
    {all.length > 5 && <Button variant="outline" className="mt-3 w-full" onClick={() => setExpanded(!expanded)}>{expanded ? <ChevronUp /> : <ChevronDown />}{expanded ? 'Mostrar só 5' : `Ver todos (${all.length})`}</Button>}
  </section>;
}
