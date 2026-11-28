import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Pencil, Sparkles, Trash2, Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { deleteEraCascade, type Item, useCollection } from "@/lib/collection";
import { useMediaUrl } from "@/lib/media";
import { CollectionForm } from "@/components/collection-form";
import { allPaid, nextPaymentDate, pendingPayments, parseStages, STAGE_LABELS, totalCost, type StageKind } from "@/lib/payment-stages";
import { transportStatus } from "@/lib/transport-status";
import { joinOrigin, splitOrigin } from "@/lib/communities";
import { dueLabel, formatBRL, formatDateParts } from "@/lib/parse-expense";

export function CollectionItem({ item, userId, eraName }: { item: Item; userId: string; eraName?: string }) {
  const client = useQueryClient();
  const stages = parseStages(item.stages);
  const [editing, setEditing] = useState(false);
  const [showStages, setShowStages] = useState(false);
  const [sparkle, setSparkle] = useState(false);
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
      return kind === "item" ? itemPaid : !!next.find((s) => s.kind === kind)?.paid;
    },
    onSuccess: (nowPaid) => {
      if (nowPaid) {
        setSparkle(true);
        window.setTimeout(() => setSparkle(false), 900);
      }
      return client.invalidateQueries({ queryKey: ["collection", userId] });
    },
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
  const status = transportStatus(item.stages);
  const pending = pendingPayments(item);
  const dueDate = item.paid ? item.due_date : nextPaymentDate(item);
  const due = dueLabel(dueDate);
  const date = formatDateParts(dueDate);
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
              {(() => { const origin = splitOrigin(item.origin); return joinOrigin(origin.community, origin.ceg).replace(" :: ", " · "); })()}
              </span>
            )}
            <span
              className={`rounded-sm px-2 py-1 text-[11px] font-semibold ${item.paid ? "bg-muted text-muted-foreground" : "bg-warning/25 text-warning-foreground"}`}
            >
              {item.paid ? "Pago" : `${pending.map((s) => STAGE_LABELS[s.kind]).join(", ")} pendente`}
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
          {(() => {
            const all = [{ kind: "item" as const, amount: item.amount, paid: item.item_paid, due_date: item.due_date }, ...stages];
            const next = [...pending].sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))[0];
            return (
              <div className="relative mt-2 flex flex-wrap items-center gap-2">
                {sparkle && (
                  <Sparkles aria-hidden className="pointer-events-none absolute -top-2 left-2 size-5 animate-ping text-warning" />
                )}
                {next ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/25 px-3 py-1 text-xs font-semibold text-warning-foreground">
                      <Clock className="size-3" /> A pagar: {STAGE_LABELS[next.kind]} · {formatBRL(next.amount)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      disabled={update.isPending}
                      onClick={() => update.mutate(next.kind)}
                      className="h-7 rounded-full px-3 text-xs"
                    >
                      <Check className="size-3" /> Pago
                    </Button>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    <Check className="size-3" /> Pago · {formatBRL(totalCost(item.amount, stages))}
                  </span>
                )}
                <Button type="button" size="sm" variant="link" onClick={() => setShowStages(true)} className="h-7 px-0 text-xs" aria-label={`Situação de ${item.description}: ${status}`}>
                  <Package className="size-3" /> {status}
                </Button>
                {showStages && (
                  <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40" onClick={() => setShowStages(false)}>
                    <div
                      role="dialog"
                      aria-label={`Extrato de ${item.description}`}
                      className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 pb-8 shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
                      <div className="mb-3 flex items-center justify-between"><strong className="text-primary">{status}</strong><Button variant="ghost" size="icon" aria-label="Fechar extrato" onClick={() => setShowStages(false)}><X /></Button></div>
                      <h3 className="font-display text-xl font-semibold text-foreground">{item.description}</h3>
                      <p className="mb-3 text-xs text-muted-foreground">Situação estimada pelas cobranças; não confirma entrega.</p>
                      <p className="mb-3 text-sm text-muted-foreground">Total {formatBRL(totalCost(item.amount, stages))}</p>
                      <div className="flex flex-col gap-1">
                        {all.map((st) => (
                          <button
                            key={st.kind}
                            type="button"
                            disabled={update.isPending}
                            onClick={() => update.mutate(st.kind)}
                            className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-secondary"
                          >
                            <span className="inline-flex items-center gap-2 font-semibold">
                              {st.paid ? <Check className="size-4 text-primary" /> : <Clock className="size-4 text-muted-foreground" />}
                              {STAGE_LABELS[st.kind]}
                              {!st.paid && st.due_date && (
                                <span className="text-xs font-normal text-muted-foreground">vence {formatDateParts(st.due_date).full}</span>
                              )}
                            </span>
                            <span className={st.paid ? "text-muted-foreground line-through" : "text-foreground"}>{formatBRL(st.amount)}</span>
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">Toque numa linha para marcar ou desmarcar como pago.</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
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
