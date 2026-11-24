import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { deleteEraCascade, type Item, useCollection } from "@/lib/collection";
import { useMediaUrl } from "@/lib/media";
import { CollectionForm } from "@/components/collection-form";
import { allPaid, parseStages, STAGE_LABELS, totalCost, type StageKind } from "@/lib/payment-stages";
import { dueLabel, formatBRL, formatDateParts } from "@/lib/parse-expense";

export function CollectionItem({ item, userId, eraName }: { item: Item; userId: string; eraName?: string }) {
  const client = useQueryClient();
  const stages = parseStages(item.stages);
  const [editing, setEditing] = useState(false);
  const collection = useCollection(userId);
  const update = useMutation({
    mutationFn: async (kind: StageKind | "item") => {
      const itemPaid = kind === "item" ? !item.item_paid : item.item_paid;
      const next = stages.map((s) => (s.kind === kind ? { ...s, paid: !s.paid } : s));
      const { error } = await supabase
        .from("expenses")
        .update({ item_paid: itemPaid, stages: next, paid: allPaid(itemPaid, next) })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["collection", userId] }),
  });
  const remove = useMutation({
    mutationFn: async () => {
      const { error: itemError } = await supabase
        .from("expenses")
        .delete()
        .eq("id", item.id)
        .eq("user_id", userId);
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
  const scan = useMediaUrl(item.image_path);
  const [zoomed, setZoomed] = useState(false);
  const due = dueLabel(item.due_date);
  const date = formatDateParts(item.due_date);
  return (
    <article className="border-b border-border py-4 last:border-b-0">
      {zoomed && scan.data && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 p-4"
          onClick={() => setZoomed(false)}
        >
          <img
            src={scan.data}
            alt={item.description}
            className="max-h-[90vh] max-w-full rounded-md"
          />
        </div>
      )}
      <div className="flex items-start gap-3">
        {scan.data && (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            title="Ver scan"
            className="shrink-0"
          >
            <img
              src={scan.data}
              alt=""
              className="h-auto w-auto max-h-16 max-w-24 rounded-md border border-border object-contain"
            />
          </button>
        )}
        <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <strong className="font-display text-lg leading-none">{date.day}</strong>
          <span className="text-[10px] uppercase">{date.monthShort}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <h4 className="break-words font-semibold text-foreground">{item.description}</h4>
            <strong className="font-display text-lg text-primary" title="Custo total">
              {formatBRL(totalCost(item.amount, stages))}
            </strong>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {eraName && (
              <span className="max-w-full break-words rounded-sm border border-primary/30 px-2 py-1 text-[11px] font-semibold text-primary">
                {eraName}
              </span>
            )}
            {item.item_type && (
              <span className="rounded-sm bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                {item.item_type}
              </span>
            )}
            {item.item_detail && (
              <span className="rounded-sm bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground">
                {item.item_detail}
              </span>
            )}
            {item.origin && (
              <span className="rounded-sm border border-border px-2 py-1 text-[11px] font-medium text-foreground">
                {item.origin}
              </span>
            )}
            <span
              className={`rounded-sm px-2 py-1 text-[11px] font-semibold ${item.paid ? "bg-muted text-muted-foreground" : "bg-warning/25 text-warning-foreground"}`}
            >
              {item.paid ? "Pago" : "Pendente"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p
              className={`text-xs ${!item.paid && due.tone === "overdue" ? "text-destructive" : "text-muted-foreground"}`}
            >
              {item.paid ? `Prazo ${date.full}` : `${due.text} · ${date.full}`}
            </p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(true)}
                title="Editar item"
                aria-label={`Editar ${item.description}`}
              >
                <Pencil />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(`Excluir ${item.description}?`)) remove.mutate();
                }}
                title="Excluir item"
                aria-label={`Excluir ${item.description}`}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[{ kind: "item" as const, amount: item.amount, paid: item.item_paid }, ...stages].map((s) => (
              <button
                key={s.kind}
                type="button"
                disabled={update.isPending}
                onClick={() => update.mutate(s.kind)}
                title={s.paid ? "Marcar como pendente" : "Marcar como pago"}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${s.paid ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary"}`}
              >
                {s.paid ? <Check className="size-3" /> : <Clock className="size-3" />}
                {STAGE_LABELS[s.kind]}: {formatBRL(s.amount)}
              </button>
            ))}
          </div>
          {(update.isError || remove.isError) && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              Não foi possível atualizar. Tente novamente.
            </p>
          )}
        </div>
      </div>
      {editing && (
        <CollectionForm
          userId={userId}
          groups={collection.data?.groups ?? []}
          eras={collection.data?.eras ?? []}
          item={item}
          onClose={() => setEditing(false)}
        />
      )}
    </article>
  );
}
