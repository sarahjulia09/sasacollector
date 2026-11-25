import { useState } from "react";
import { ArrowLeft, Package } from "lucide-react";
import { CollectionItem } from "@/components/collection-item";
import type { Era, Item } from "@/lib/collection";
import { cegOf, groupByCommunity } from "@/lib/communities";
import { formatBRL } from "@/lib/parse-expense";
import { pendingFirst } from "@/lib/pending-items";

export function CommunitiesTab({ items, eras, userId }: { items: Item[]; eras: Era[]; userId: string }) {
  const boxes = groupByCommunity(items);
  const [open, setOpen] = useState<string | null>(null);
  const [ceg, setCeg] = useState<string>("all");
  const box = boxes.find((b) => b.name === open);

  if (!boxes.length)
    return <p className="py-10 text-sm text-muted-foreground">Nenhum item cadastrado neste grupo ainda.</p>;

  if (box) {
    const list = [...box.items.filter((i) => ceg === "all" || cegOf(i) === ceg)].sort(pendingFirst);
    return (
      <div className="pt-6">
        <button
          onClick={() => { setOpen(null); setCeg("all"); }}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Todas as comunidades
        </button>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-2 border-b border-border pb-3">
          <h2 className="font-display text-3xl font-semibold">{box.name}</h2>
          <p className="text-sm text-muted-foreground">
            Pendente <strong className="text-primary">{formatBRL(box.pending)}</strong> · Total {formatBRL(box.total)}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por CEG">
          {["all", ...box.cegs].map((c) => (
            <button
              key={c}
              onClick={() => setCeg(c)}
              aria-pressed={ceg === c}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${ceg === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary"}`}
            >
              {c === "all" ? "Todas" : c}
            </button>
          ))}
        </div>
        <div className="mt-4">
          {list.map((item) => (
            <CollectionItem
              key={item.id}
              item={item}
              userId={userId}
              eraName={eras.find((e) => e.id === item.era_id)?.name ?? "Sem álbum / evento / kit"}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-3">
      {boxes.map((b) => (
        <button
          key={b.name}
          onClick={() => setOpen(b.name)}
          className="flex min-h-32 flex-col justify-between rounded-md border border-border bg-card p-5 text-left transition-colors hover:border-primary"
        >
          <div className="flex items-start gap-2">
            <Package className="mt-1 size-4 shrink-0 text-primary" />
            <div>
              <h3 className="font-display text-xl font-semibold">{b.name}</h3>
              <p className="text-xs text-muted-foreground">
                {b.items.length} {b.items.length === 1 ? "item" : "itens"} · {b.cegs.length} {b.cegs.length === 1 ? "CEG" : "CEGs"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm">
            Pendente <strong className="text-primary">{formatBRL(b.pending)}</strong>
          </p>
        </button>
      ))}
    </div>
  );
}
