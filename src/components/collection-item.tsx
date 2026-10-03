import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { deleteEraCascade, type Item, useCollection } from "@/lib/collection";
import { CollectionForm } from "@/components/collection-form";
import { dueLabel, formatBRL, formatDateParts } from "@/lib/parse-expense";

export function CollectionItem({ item, userId }: { item: Item; userId: string }) {
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const collection = useCollection(userId);
  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expenses").update({ paid: !item.paid }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["collection", userId] }),
  });
  const remove = useMutation({
    mutationFn: async () => {
      const { error: itemError } = await supabase.from("expenses").delete().eq("id", item.id).eq("user_id", userId);
      if (itemError) throw itemError;

      if (!item.era_id) return;

      const { data: remaining, error: remainingError } = await supabase
        .from("expenses")
        .select("id")
        .eq("era_id", item.era_id)
        .eq("user_id", userId)
        .limit(1);

      if (remainingError) throw remainingError;
      if (!remaining || remaining.length === 0) {
        await deleteEraCascade(item.era_id, userId);
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["collection", userId] }),
  });
  const due = dueLabel(item.due_date);
  const date = formatDateParts(item.due_date);
  return <article className="border-b border-border py-4 last:border-b-0">
    <div className="flex items-start gap-3">
      <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-md bg-secondary text-secondary-foreground"><strong className="font-display text-lg leading-none">{date.day}</strong><span className="text-[10px] uppercase">{date.monthShort}</span></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1"><h4 className="break-words font-semibold text-foreground">{item.description}</h4><strong className="font-display text-lg text-primary">{formatBRL(item.amount)}</strong></div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.item_type && <span className="rounded-sm bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">{item.item_type}</span>}
          {item.item_detail && <span className="rounded-sm bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground">{item.item_detail}</span>}
          {item.origin && <span className="rounded-sm border border-border px-2 py-1 text-[11px] font-medium text-foreground">{item.origin}</span>}
          <span className={`rounded-sm px-2 py-1 text-[11px] font-semibold ${item.paid ? "bg-muted text-muted-foreground" : "bg-warning/25 text-warning-foreground"}`}>{item.paid ? "Pago" : "Pendente"}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className={`text-xs ${!item.paid && due.tone === "overdue" ? "text-destructive" : "text-muted-foreground"}`}>{item.paid ? `Prazo ${date.full}` : `${due.text} · ${date.full}`}</p>
          <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setEditing(true)} title="Editar item" aria-label={`Editar ${item.description}`}><Pencil /></Button><Button size="sm" variant="ghost" disabled={update.isPending} onClick={() => update.mutate()} title={item.paid ? "Marcar como pendente" : "Marcar como pago"} aria-label={item.paid ? "Marcar como pendente" : "Marcar como pago"}>{item.paid ? <RotateCcw /> : <Check />}</Button><Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => { if (window.confirm(`Excluir ${item.description}?`)) remove.mutate(); }} title="Excluir item" aria-label={`Excluir ${item.description}`}><Trash2 /></Button></div>
        </div>
        {(update.isError || remove.isError) && <p role="alert" className="mt-1 text-xs text-destructive">Não foi possível atualizar. Tente novamente.</p>}
      </div>
    </div>
    {editing && <CollectionForm userId={userId} groups={collection.data?.groups ?? []} eras={collection.data?.eras ?? []} item={item} onClose={() => setEditing(false)} />}
  </article>;
}
