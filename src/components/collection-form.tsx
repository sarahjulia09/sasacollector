import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { parseAmount } from "@/lib/parse-expense";
import { presetErasFor, presetVersionsFor, presetPopupsFor, presetFanmeetingsFor, presetToursFor, slugify, type Group, type Era, type Item } from "@/lib/collection";

type ItemType = "Álbum PC" | "POB" | "Lucky Draw" | "Merch";
const TYPES: ItemType[] = ["Álbum PC", "POB", "Lucky Draw", "Merch"];

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

export function CollectionForm({ userId, groups, eras, initialGroupId, item, onClose }: {
  userId: string; groups: Group[]; eras: Era[]; initialGroupId?: string; item?: Item; onClose: () => void;
}) {
  const client = useQueryClient();
  const editing = !!item;
  const [description, setDescription] = useState(item?.description ?? "");
  const [groupId, setGroupId] = useState(item?.group_id ?? initialGroupId ?? "");
  const [newGroup, setNewGroup] = useState("");
  const [eraValue, setEraValue] = useState(item?.era_id ?? "");
  const [newEra, setNewEra] = useState("");
  const [itemType, setItemType] = useState<ItemType>(TYPES.includes(item?.item_type as ItemType) ? (item!.item_type as ItemType) : "Álbum PC");
  const [detail, setDetail] = useState(item?.item_detail ?? "");
  const [origin, setOrigin] = useState(item?.origin ?? "");
  const [amount, setAmount] = useState(item ? String(item.amount).replace(".", ",") : "");
  const [dueDate, setDueDate] = useState(item?.due_date ?? "");
  const [error, setError] = useState("");
  const [albumVersion, setAlbumVersion] = useState("");

  const selectedGroup = groups.find((g) => g.id === groupId);
  const groupName = groupId === "new" ? newGroup : selectedGroup?.name ?? "";
  const existingEras = groupId === "new" ? [] : eras.filter((e) => e.group_id === groupId);
  const existingNames = new Set(existingEras.map((e) => e.name.toLowerCase()));
  const notYetSaved = (list: string[]) => list.filter((n) => !existingNames.has(n.toLowerCase()));
  const presets = notYetSaved(presetErasFor(groupName));

// 1. Mova a definição do eraName para aqui cima
  const eraName = eraValue === "new" ? newEra
  : eraValue.startsWith("preset:") ? eraValue.slice(7)
  : existingEras.find((e) => e.id === eraValue)?.name ?? "";
// 2. Agora já pode usar o eraName para ir buscar as versões corretas
  const versionsPresets = notYetSaved(presetVersionsFor(groupName, eraName));
  const popupPresets = notYetSaved(presetPopupsFor(groupName));
  const fanmeetingPresets = notYetSaved(presetFanmeetingsFor(groupName));
  const tourPresets = notYetSaved(presetToursFor(groupName));
  const eraName = eraValue === "new" ? newEra
    : eraValue.startsWith("preset:") ? eraValue.slice(7)
    : existingEras.find((e) => e.id === eraValue)?.name ?? "";

  const mutation = useMutation({
    mutationFn: async () => {
      const values = schema.parse({ description, groupName, eraName, itemType, detail, origin, amount: parseAmount(amount), dueDate });
      let savedGroupId = groupId;
      if (groupId === "new") {
        const slug = slugify(values.groupName);
        if (!slug) throw new Error("Informe um nome de grupo com letras ou números.");
        const { data, error: groupError } = await supabase.from("collection_groups")
          .insert({ user_id: userId, name: values.groupName, slug }).select("id").single();
        if (groupError || !data) throw new Error(groupError?.code === "23505" ? "Esse grupo já existe." : "Não foi possível criar o grupo.");
        savedGroupId = data.id;
      }
      let savedEraId = groupId !== "new" && !eraValue.startsWith("preset:") && eraValue !== "new" ? eraValue : "";
      if (!savedEraId) {
        const { data, error: eraError } = await supabase.from("collection_eras")
          .insert({ user_id: userId, group_id: savedGroupId, name: values.eraName }).select("id").single();
        if (eraError || !data) throw new Error(eraError?.code === "23505" ? "Essa era já existe no grupo." : "Não foi possível criar a era.");
        savedEraId = data.id;
      }
      const payload = {
        description: values.description, group_id: savedGroupId, era_id: savedEraId,
        item_type: values.itemType, item_detail: values.detail || null, origin: values.origin || null,
        amount: values.amount, due_date: values.dueDate,
      };
      const { error: itemError } = editing
        ? await supabase.from("expenses").update(payload).eq("id", item!.id)
        : await supabase.from("expenses").insert({ ...payload, user_id: userId });
      if (itemError) throw new Error("Não foi possível salvar o item. Tente novamente.");
    },
    onSuccess: () => { client.invalidateQueries({ queryKey: ["collection", userId] }); onClose(); },
    onError: (err) => setError(err instanceof z.ZodError ? err.issues[0]?.message ?? "Confira os campos." : err.message),
  });
  function submit(event: FormEvent) { event.preventDefault(); setError(""); mutation.mutate(); }
  const input = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";
  const label = "block text-xs font-semibold text-muted-foreground";
  const title = editing ? "Editar item" : "Novo item";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 sm:items-center sm:p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="item-form-title" className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-lg bg-card p-5 shadow-xl sm:rounded-lg sm:p-7">
        <div className="mb-5 flex items-center justify-between"><h2 id="item-form-title" className="font-display text-2xl font-semibold text-primary">{title}</h2><Button variant="ghost" size="icon" aria-label="Fechar" title="Fechar" onClick={onClose}><X /></Button></div>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className={`${label} sm:col-span-2`}>Nome do item / membro<input required maxLength={120} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Changbin" className={input} /></label>
          <label className={label}>Grupo<select required value={groupId} onChange={(e) => { setGroupId(e.target.value); setEraValue(""); }} className={input}><option value="">Selecione</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}<option value="new">+ Criar grupo</option></select></label>
          {groupId === "new" && <label className={label}>Novo grupo<input required maxLength={80} value={newGroup} onChange={(e) => { setNewGroup(e.target.value); setEraValue(""); }} placeholder="Ex.: Stray Kids" className={input} /></label>}
          <label className={label}>Era / Álbum<select required value={eraValue} onChange={(e) => setEraValue(e.target.value)} className={input} disabled={!groupId}>
            <option value="">Selecione</option>
            {existingEras.length > 0 && <optgroup label="Suas eras">{existingEras.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>}
            {presets.length > 0 && <optgroup label="Discografia">{presets.map((n) => <option key={n} value={`preset:${n}`}>{n}</option>)}</optgroup>}
            {fanmeetingPresets.length > 0 && <optgroup label="Fanmeetings">{fanmeetingPresets.map((n) => <option key={n} value={`preset:${n}`}>{n}</option>)}</optgroup>}
            {tourPresets.length > 0 && <optgroup label="Turnês">{tourPresets.map((n) => <option key={n} value={`preset:${n}`}>{n}</option>)}</optgroup>}
            {popupPresets.length > 0 && <optgroup label="Pop-ups">{popupPresets.map((n) => <option key={n} value={`preset:${n}`}>{n}</option>)}</optgroup>}
            <option value="new">+ Outra era</option>
          </select></label>
          {eraValue === "new" && <label className={label}>Nova era<input required maxLength={80} value={newEra} onChange={(e) => setNewEra(e.target.value)} placeholder="Ex.: ATE" className={input} /></label>}
          <label className={label}>Tipo de item<select value={itemType} onChange={(e) => setItemType(e.target.value as ItemType)} className={input}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          {itemType !== "Merch" && <label className={label}>{itemType === "Álbum PC" ? "Versão do álbum" : "Descrição"}<select className={input} value={version} onChange={(e) => setVersion(e.target.value)}><option value="">Selecione a versão</option>{versionsPresets.map((v) => (<option key={v} value={v}>{v}</option>))}</select></label>}          <label className={label}>Origem / Comunidade / CEG<input maxLength={120} value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Ex.: CEG Coreia" className={input} /></label>
          <label className={label}>Valor (R$)<input required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex.: 13,50 reais" className={input} /></label>
          <label className={label}>Data / Prazo de pagamento<input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={input} /></label>
          {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={mutation.isPending}>{editing ? <Save /> : <Plus />}{mutation.isPending ? "Salvando…" : editing ? "Salvar alterações" : "Adicionar item"}</Button></div>
        </form>
      </section>
    </div>
  );
}
