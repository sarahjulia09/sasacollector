import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, MousePointer2, Trash2, X, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaUrl } from '@/lib/media';
import { supabase } from '@/integrations/supabase/client';
import { WISH_STATUSES, markerPosition, wishProgress, type WishStatus } from '@/lib/wishlist-pins';
import type { Tables } from '@/integrations/supabase/types';
type Pin = Tables<'wishlist_pins'>;
const tones: Record<string, string> = { WTB: 'bg-wish-wtb text-wish-wtb-foreground', OTW: 'bg-wish-otw text-wish-otw-foreground', HAVE: 'bg-wish-have text-wish-have-foreground' };
export function WishlistTemplate({ userId, wish }: { userId: string; wish: Tables<'group_wishlists'> }) {
  const image = useMediaUrl(wish.image_path);
  const client = useQueryClient();
  const [filter, setFilter] = useState<WishStatus | 'Todos'>('Todos');
  const [placing, setPlacing] = useState(false);
  const [newStatus, setNewStatus] = useState<WishStatus>('WTB');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const pins = useQuery({ queryKey: ['wishlist-pins', userId, wish.id], queryFn: async () => {
    const { data, error } = await supabase.from('wishlist_pins').select('*').eq('wishlist_id', wish.id).eq('user_id', userId).order('created_at');
    if (error) throw error;
    return data;
  } });
  const change = useMutation({ mutationFn: async (action: { kind: 'add'; x: number; y: number; status: WishStatus } | { kind: 'update'; id: string; status: WishStatus } | { kind: 'delete'; id: string }) => {
    const result = action.kind === 'add' ? await supabase.from('wishlist_pins').insert({ wishlist_id: wish.id, user_id: userId, x: action.x, y: action.y, status: action.status }) : action.kind === 'update' ? await supabase.from('wishlist_pins').update({ status: action.status }).eq('id', action.id).eq('user_id', userId) : await supabase.from('wishlist_pins').delete().eq('id', action.id).eq('user_id', userId);
    if (result.error) throw result.error;
  }, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['wishlist-pins', userId, wish.id] }); } });
  const all = pins.data ?? [];
  const visible = all.filter((p) => filter === 'Todos' || p.status === filter);
  const selected = all.find((p) => p.id === selectedId);
  const progress = wishProgress(all);
  function addAt(x: number, y: number) { if (placing && !change.isPending && pins.isSuccess) change.mutate({ kind: 'add', x, y, status: newStatus }); }
  return <div className="flex min-h-0 flex-1 flex-col gap-3">
    <div className="flex flex-wrap items-center gap-2"><Button size="sm" variant={placing ? 'default' : 'outline'} disabled={pins.isError || pins.isLoading} aria-pressed={placing} onClick={() => { setPlacing(!placing); setSelectedId(null); }}>{placing ? <Plus /> : <MousePointer2 />}{placing ? 'Adicionar marcador' : 'Selecionar'}</Button>{placing && <select aria-label="Status do novo marcador" value={newStatus} onChange={(e) => { const value = e.target.value; if (WISH_STATUSES.some((s) => s === value)) setNewStatus(value as WishStatus); }} className="h-8 rounded-md border border-input bg-background px-2 text-xs">{WISH_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>}<label className="ml-auto flex items-center gap-2 text-xs"><ZoomIn className="size-4" /><input aria-label="Zoom do template" type="range" min={100} max={250} step={25} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-20 accent-primary" /><span className="w-10">{zoom}%</span></label></div>
    <div className="flex flex-wrap gap-2" aria-label="Filtrar marcadores">{(['Todos', ...WISH_STATUSES] as const).map((s) => <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} aria-pressed={filter === s} onClick={() => setFilter(s)}>{s}{s !== 'Todos' && ` (${all.filter((p) => p.status === s).length})`}</Button>)}</div>
    <div className="flex items-center gap-3 text-xs"><span>{progress.have} de {progress.total} na coleção</span><progress aria-label="Progresso da wishlist" max={100} value={progress.percent} className="h-2 flex-1 accent-primary" /><strong>{progress.percent}%</strong></div>
    {pins.isError && <p role="alert" className="text-sm text-destructive">Não foi possível carregar as marcações. <Button size="sm" variant="link" onClick={() => pins.refetch()}>Tentar novamente</Button></p>}
    {change.isError && <p role="alert" className="text-sm text-destructive">Não foi possível salvar a marcação. Tente novamente.</p>}
    {selected && <div className="flex flex-wrap items-center gap-2 border-y border-border py-2" aria-label="Editar marcador">{WISH_STATUSES.map((s) => <Button key={s} size="sm" variant={selected.status === s ? 'default' : 'outline'} disabled={change.isPending} onClick={() => change.mutate({ kind: 'update', id: selected.id, status: s })}>{s}</Button>)}<Button size="icon" variant="ghost" disabled={change.isPending} aria-label="Excluir marcador" onClick={() => change.mutate({ kind: 'delete', id: selected.id })}><Trash2 /></Button><Button size="icon" variant="ghost" aria-label="Fechar marcador" onClick={() => setSelectedId(null)}><X /></Button></div>}
    <div className="min-h-0 flex-1 overflow-auto rounded-md bg-secondary">
      {image.data ? <div className="relative mx-auto" style={{ width: `${zoom}%` }}>
        <img src={image.data} alt={wish.title} draggable={false} className={`block h-auto w-full ${placing ? 'cursor-crosshair' : ''}`} onClick={(e) => { const pos = markerPosition(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect()); addAt(pos.x, pos.y); }} />
        {placing && <Button variant="ghost" className="sr-only" onClick={() => addAt(0.5, 0.5)}>Adicionar marcador no centro</Button>}
        {visible.map((pin: Pin, index) => <Button key={pin.id} size="icon" aria-label={`Marcador ${index + 1}: ${pin.status}`} aria-pressed={selectedId === pin.id} disabled={change.isPending} onClick={() => { setSelectedId(pin.id); setPlacing(false); }} className={`absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card text-[9px] shadow-sm ${tones[pin.status] ?? ''} ${selectedId === pin.id ? 'ring-2 ring-primary ring-offset-2' : ''}`} style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}>{pin.status === 'HAVE' ? '✓' : pin.status}</Button>)}
      </div> : <p className="py-12 text-center text-sm text-muted-foreground">{image.isError ? 'Não foi possível carregar a imagem.' : 'Carregando imagem…'}</p>}
    </div>
  </div>;
}
