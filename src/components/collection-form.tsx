import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { parseAmount } from "@/lib/parse-expense";
import { slugify, type Group, type Era } from "@/lib/collection";

const schema = z.object({
  description: z.string().trim().min(1, "Informe o item ou membro.").max(120),
  groupName: z.string().trim().min(1, "Selecione um grupo.").max(80),
  eraName: z.string().trim().min(1, "Selecione uma era.").max(80),
  itemType: z.enum(["Álbum PC", "POB", "Lucky Draw", "Merch"]),
  detail: z.string().trim().max(120),
  origin: z.string().trim().max(120),
  amount: z.number().nonnegative("Informe um valor válido."),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o prazo."),
});

export function CollectionForm({ userId, groups, eras, initialGroupId, onClose }: {
  userId: string; groups: Group[]; eras: Era[]; initialGroupId?: string; onClose: () => void;
}) {
  const client = useQueryClient();
  const [description, setDescription] = useState("");
  const [groupId, setGroupId] = useState(initialGroupId ?? "");
  const [newGroup, setNewGroup] = useState("");
  const [eraId, setEraId] = useState("");
  const [newEra, setNewEra] = useState("");
  const [itemType, setItemType] = useState<"Álbum PC" | "POB" | "Lucky Draw" | "Merch">("Álbum PC");
  const [detail, setDetail] = useState("");
  const [origin, setOrigin] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const selectedGroup = groups.find((g) => g.id === groupId);
  const availableEras = eras.filter((e) => e.group_id === groupId);
  const mutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = parseAmount(amount);
      const values = schema.parse({
        description, groupName: groupId === "new" ? newGroup : selectedGroup?.name ?? "",
        eraName: eraId === "new" || groupId === "new" ? newEra : availableEras.find((e) => e.id === eraId)?.name ?? "",
        itemType, detail, origin, amount: parsedAmount, dueDate,
      });
      let savedGroupId = groupId;
      if (groupId === "new") {
        const slug = slugify(values.groupName);
        if (!slug) throw new Error("Informe um nome de grupo com letras ou números.");
        const { data, error: groupError } = await supabase.from("collection_groups")
          .insert({ user_id: userId, name: values.groupName, slug }).select("id").single();
        if (groupError || !data) throw new Error(groupError?.code === "23505" ? "Esse grupo já existe." : "Não foi possível criar o grupo.");
        savedGroupId = data.id;
      }
      let savedEraId = eraId;
      if (eraId === "new" || groupId === "new") {
        const { data, error: eraError } = await supabase.from("collection_eras")
          .insert({ user_id: userId, group_id: savedGroupId, name: values.eraName }).select("id").single();
        if (eraError || !data) throw new Error(eraError?.code === "23505" ? "Essa era já existe no grupo." : "Não foi possível criar a era.");
        savedEraId = data.id;
      }
      const { error: itemError } = await supabase.from("expenses").insert({
        user_id: userId, description: values.description, group_id: savedGroupId,
        era_id: savedEraId, item_type: values.itemType, item_detail: values.detail || null,
        origin: values.origin || null, amount: values.amount, due_date: values.dueDate,
      });
      if (itemError) throw new Error("Não foi possível salvar o item. Tente novamente.");
    },
    onSuccess: () => { client.invalidateQueries({ queryKey: ["collection", userId] }); onClose(); },
    onError: (err) => setError(err instanceof z.ZodError ? err.issues[0]?.message ?? "Confira os campos." : err.message),
  });
  function submit(event: FormEvent) { event.preventDefault(); setError(""); mutation.mutate(); }
  const input = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";
  const label = "block text-xs font-semibold text-muted-foreground";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 sm:items-center sm:p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="new-item-title" className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-lg bg-card p-5 shadow-xl sm:rounded-lg sm:p-7">
        <div className="mb-5 flex items-center justify-between"><h2 id="new-item-title" className="font-display text-2xl font-semibold text-primary">Novo item</h2><Button variant="ghost" size="icon" aria-label="Fechar" title="Fechar" onClick={onClose}><X /></Button></div>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className={`${label} sm:col-span-2`}>Nome do item / membro<input required maxLength={120} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Changbin" className={input} /></label>
          <label className={label}>Grupo<select required value={groupId} onChange={(e) => { setGroupId(e.target.value); setEraId(""); }} className={input}><option value="">Selecione</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}<option value="new">+ Criar grupo</option></select></label>
          {groupId === "new" && <label className={label}>Novo grupo<input required maxLength={80} value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="Ex.: Stray Kids" className={input} /></label>}
          <label className={label}>Era / Álbum<select required value={groupId === "new" ? "new" : eraId} onChange={(e) => setEraId(e.target.value)} className={input} disabled={!groupId}><option value="">Selecione</option>{availableEras.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}<option value="new">+ Criar era</option></select></label>
          {(eraId === "new" || groupId === "new") && <label className={label}>Nova era<input required maxLength={80} value={newEra} onChange={(e) => setNewEra(e.target.value)} placeholder="Ex.: ATE" className={input} /></label>}
          <label className={label}>Tipo de item<select value={itemType} onChange={(e) => { setItemType(e.target.value as typeof itemType); setDetail(""); }} className={input}><option>Álbum PC</option><option>POB</option><option>Lucky Draw</option><option>Merch</option></select></label>
          {itemType !== "Merch" && <label className={label}>{itemType === "Álbum PC" ? "Versão do álbum" : "Loja / Evento"}<input maxLength={120} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={itemType === "Álbum PC" ? "Ex.: Limited" : "Ex.: Soundwave 1.0"} className={input} /></label>}
          <label className={label}>Origem / Comunidade / CEG<input maxLength={120} value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Ex.: CEG Coreia" className={input} /></label>
          <label className={label}>Valor (R$)<input required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex.: 13,50 reais" className={input} /></label>
          <label className={label}>Data / Prazo de pagamento<input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={input} /></label>
          {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={mutation.isPending}><Plus />{mutation.isPending ? "Salvando…" : "Adicionar item"}</Button></div>
        </form>
      </section>
    </div>
  );
}
