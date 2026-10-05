import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ImageCropper } from "@/components/image-cropper";
import { uploadMedia, useMediaUrl } from "@/lib/media";
import { parseAmount } from "@/lib/parse-expense";
import {
  DEFAULT_GROUPS,
  presetErasFor,
  presetVersionsFor,
  presetPopupsFor,
  presetFanmeetingsFor,
  presetToursFor,
  presetSeasonsGreetingsFor,
  presetMembershipKitsFor,
  slugify,
  type Group,
  type Era,
  type Item,
} from "@/lib/collection";

type ItemType = "Regular" | "POB" | "Lucky Draw" | "Merch";
const TYPES: ItemType[] = ["Regular", "POB", "Lucky Draw", "Merch"];

const schema = z.object({
  description: z.string().trim().min(1, "Informe o item ou membro.").max(120),
  groupName: z.string().trim().min(1, "Selecione um grupo.").max(80),
  eraName: z.string().trim().min(1, "Selecione um álbum, evento ou kit.").max(80),
  itemType: z.enum(["Regular", "POB", "Lucky Draw", "Merch"]),
  detail: z.string().trim().max(120),
  origin: z.string().trim().max(120),
  amount: z.number().nonnegative("Informe um valor válido."),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o prazo."),
});

export function CollectionForm({
  userId,
  groups,
  eras,
  initialGroupId,
  item,
  onClose,
}: {
  userId: string;
  groups: Group[];
  eras: Era[];
  initialGroupId?: string;
  item?: Item;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const editing = !!item;
  const [description, setDescription] = useState(item?.description ?? "");
  const [groupId, setGroupId] = useState(item?.group_id ?? initialGroupId ?? "");
  const [newGroup, setNewGroup] = useState("");
  const [eraValue, setEraValue] = useState(item?.era_id ?? "");
  const [newEra, setNewEra] = useState("");
  const [itemType, setItemType] = useState<ItemType>(
    TYPES.includes(item?.item_type as ItemType) ? (item!.item_type as ItemType) : "Regular",
  );
  const [detail, setDetail] = useState(item?.item_detail ?? "");
  const [origin, setOrigin] = useState(item?.origin ?? "");
  const [amount, setAmount] = useState(item ? String(item.amount).replace(".", ",") : "");
  const [dueDate, setDueDate] = useState(item?.due_date ?? "");
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const savedUrl = useMediaUrl(!removeImage ? item?.image_path : null);
  const shownImage = preview ?? (removeImage ? null : (savedUrl.data ?? null));

  const existingEras = (eras ?? []).filter((era) => era.group_id === groupId);
  const defaultGroups = DEFAULT_GROUPS.filter(
    (group) => !groups.some((existingGroup) => existingGroup.slug === group.slug),
  );
  const selectedGroup = groups.find((g) => g.id === groupId);
  const selectedDefaultGroup = groupId.startsWith("default:")
    ? DEFAULT_GROUPS.find((group) => group.slug === groupId.replace("default:", ""))
    : null;
  const groupName =
    groupId === "new"
      ? newGroup
      : groupId.startsWith("default:")
        ? (selectedDefaultGroup?.name ?? "")
        : (selectedGroup?.name ?? "");

  const discography = presetErasFor(groupName);
  const fanmeetings = presetFanmeetingsFor(groupName);
  const tours = presetToursFor(groupName);
  const popups = presetPopupsFor(groupName);
  const seasonsGreetings = presetSeasonsGreetingsFor(groupName);
  const membershipKits = presetMembershipKitsFor(groupName);

  const allPresetNames = new Set(
    [
      ...discography,
      ...fanmeetings,
      ...tours,
      ...popups,
      ...seasonsGreetings,
      ...membershipKits,
    ].map((n) => n.toLowerCase()),
  );

  const customEras = existingEras.filter((e) => !allPresetNames.has(e.name.toLowerCase()));

  function getEraOptionValue(name: string) {
    const match = existingEras.find((e) => e.name.toLowerCase() === name.toLowerCase());
    return match ? match.id : `preset:${name}`;
  }

  const eraName =
    eraValue === "new"
      ? newEra
      : eraValue.startsWith("preset:")
        ? eraValue.slice(7)
        : (existingEras.find((e) => e.id === eraValue)?.name ?? "");

  const isDiscographyEra = discography.some(
    (name) => name.trim().toLowerCase() === eraName.trim().toLowerCase(),
  );
  const versionsPresets = presetVersionsFor(groupName, eraName);
  const popupPresets = presetPopupsFor(groupName);
  const fanmeetingPresets = presetFanmeetingsFor(groupName);
  const tourPresets = presetToursFor(groupName);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = parseAmount(amount);
      if (parsedAmount === null) throw new Error("Informe um valor válido.");
      const values = schema.parse({
        description,
        groupName,
        eraName,
        itemType,
        detail,
        origin,
        amount: parsedAmount,
        dueDate,
      });
      let savedGroupId = groupId;
      if (groupId === "new") {
        const slug = slugify(values.groupName);
        if (!slug) throw new Error("Informe um nome de grupo com letras ou números.");
        const { data, error: groupError } = await supabase
          .from("collection_groups")
          .insert({ user_id: userId, name: values.groupName, slug })
          .select("id")
          .single();
        if (groupError || !data)
          throw new Error(
            groupError?.code === "23505"
              ? "Esse grupo já existe."
              : "Não foi possível criar o grupo.",
          );
        savedGroupId = data.id;
      }
      if (groupId.startsWith("default:")) {
        const slug = groupId.replace("default:", "");
        const groupNameToCreate =
          DEFAULT_GROUPS.find((group) => group.slug === slug)?.name ?? values.groupName;
        const { data, error: groupError } = await supabase
          .from("collection_groups")
          .insert({ user_id: userId, name: groupNameToCreate, slug })
          .select("id")
          .single();
        if (groupError || !data)
          throw new Error(
            groupError?.code === "23505"
              ? "Esse grupo já existe."
              : "Não foi possível criar o grupo.",
          );
        savedGroupId = data.id;
      }
      let savedEraId =
        groupId !== "new" && !eraValue.startsWith("preset:") && eraValue !== "new" ? eraValue : "";
      if (!savedEraId) {
        const { data, error: eraError } = await supabase
          .from("collection_eras")
          .insert({ user_id: userId, group_id: savedGroupId, name: values.eraName })
          .select("id")
          .single();
        if (eraError || !data)
          throw new Error(
            eraError?.code === "23505"
              ? "Essa categoria já existe no grupo."
              : "Não foi possível criar a categoria.",
          );
        savedEraId = data.id;
      }
      let image_path = removeImage ? null : (item?.image_path ?? null);
      if (imageFile) image_path = await uploadMedia(userId, "items", imageFile);
      const payload = {
        image_path,
        description: values.description,
        group_id: savedGroupId,
        era_id: savedEraId,
        item_type: values.itemType,
        item_detail: values.detail || null,
        origin: values.origin || null,
        amount: values.amount,
        due_date: values.dueDate,
      };
      const { error: itemError } = editing
        ? await supabase.from("expenses").update(payload).eq("id", item!.id)
        : await supabase.from("expenses").insert({ ...payload, user_id: userId });
      if (itemError) {
        const errorCode = itemError.code ? ` (${itemError.code})` : "";
        throw new Error(`Não foi possível salvar o item${errorCode}: ${itemError.message}`);
      }
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["collection", userId] });
      onClose();
    },
    onError: (err) =>
      setError(
        err instanceof z.ZodError ? (err.issues[0]?.message ?? "Confira os campos.") : err.message,
      ),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    mutation.mutate();
  }
  const input =
    "mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";
  const label = "block text-xs font-semibold text-muted-foreground";
  const title = editing ? "Editar item" : "Novo item";
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-form-title"
        className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-lg bg-card p-5 shadow-xl sm:rounded-lg sm:p-7"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="item-form-title" className="font-display text-2xl font-semibold text-primary">
            {title}
          </h2>
          <Button variant="ghost" size="icon" aria-label="Fechar" title="Fechar" onClick={onClose}>
            <X />
          </Button>
        </div>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className={`${label} sm:col-span-2`}>
            Nome do item / membro
            <input
              required
              maxLength={120}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Changbin"
              className={input}
            />
          </label>
          <label className={label}>
            Grupo
            <select
              required
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                setEraValue("");
                setDetail("");
              }}
              className={input}
            >
              <option value="">Selecione</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
              {defaultGroups.map((g) => (
                <option key={g.slug} value={`default:${g.slug}`}>
                  {g.name}
                </option>
              ))}
              <option value="new">+ Criar grupo</option>
            </select>
          </label>
          {groupId === "new" && (
            <label className={label}>
              Novo grupo
              <input
                required
                maxLength={80}
                value={newGroup}
                onChange={(e) => {
                  setNewGroup(e.target.value);
                  setEraValue("");
                  setDetail("");
                }}
                placeholder="Ex.: Stray Kids"
                className={input}
              />
            </label>
          )}
          <label className={label}>
            Álbum / Evento / Kit
            <select
              required
              value={eraValue}
              onChange={(e) => {
                setEraValue(e.target.value);
                setDetail("");
              }}
              className={input}
              disabled={!groupId}
            >
              <option value="">Selecione</option>
              {discography.length > 0 && (
                <optgroup label="Discografia">
                  {discography.map((name) => (
                    <option key={name} value={getEraOptionValue(name)}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              )}
              {fanmeetings.length > 0 && (
                <optgroup label="Fanmeetings">
                  {fanmeetings.map((name) => (
                    <option key={name} value={getEraOptionValue(name)}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              )}
              {tours.length > 0 && (
                <optgroup label="Turnês">
                  {tours.map((name) => (
                    <option key={name} value={getEraOptionValue(name)}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              )}
              {popups.length > 0 && (
                <optgroup label="Pop-ups">
                  {popups.map((name) => (
                    <option key={name} value={getEraOptionValue(name)}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              )}
              {seasonsGreetings.length > 0 && (
                <optgroup label="Seasons Greetings">
                  {seasonsGreetings.map((name) => (
                    <option key={name} value={getEraOptionValue(name)}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              )}
              {membershipKits.length > 0 && (
                <optgroup label="Membership Kits">
                  {membershipKits.map((name) => (
                    <option key={name} value={getEraOptionValue(name)}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              )}
              {customEras.length > 0 && (
                <optgroup label="Outros álbuns / eventos / kits">
                  {customEras.map((era) => (
                    <option key={era.id} value={era.id}>
                      {era.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="new">+ Outro álbum / evento / kit</option>
            </select>
          </label>
          {eraValue === "new" && (
            <label className={label}>
              Novo álbum / evento / kit
              <input
                required
                maxLength={80}
                value={newEra}
                onChange={(e) => setNewEra(e.target.value)}
                placeholder="Ex.: ATE"
                className={input}
              />
            </label>
          )}
          <label className={label}>
            Tipo de item
            <select
              value={itemType}
              onChange={(e) => {
                setItemType(e.target.value as ItemType);
                setDetail("");
              }}
              className={input}
            >
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            {isDiscographyEra ? "Versão do álbum" : "Descrição"}
            {isDiscographyEra ? (
              <select className={input} value={detail} onChange={(e) => setDetail(e.target.value)}>
                <option value="">Selecione a versão</option>
                {versionsPresets?.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                maxLength={120}
                className={input}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
              />
            )}
          </label>

          <label className={label}>
            Comunidade / CEG
            <input
              maxLength={120}
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Ex.: CEG Coreia"
              className={input}
            />
          </label>

          <label className={label}>
            Valor (R$)
            <input
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex.: 13,50"
              className={input}
            />
          </label>

          <label className={label}>
            Data / Prazo de pagamento
            <input
              required
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={input}
            />
          </label>
          <div className={`${label} sm:col-span-2`}>
            Scan / foto do item (opcional)
            <div className="mt-1 flex items-center gap-3">
              {shownImage && (
                <img
                  src={shownImage}
                  alt=""
                  className="h-28 w-20 rounded-md border border-border object-cover"
                />
              )}
              <div className="flex flex-col gap-2">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-dashed border-primary/50 px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary">
                  {shownImage ? "Trocar imagem" : "Adicionar scan"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setPendingImage(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                {shownImage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setImageFile(null);
                      setPreview(null);
                      setRemoveImage(true);
                    }}
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive sm:col-span-2">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {editing ? <Save /> : <Plus />}
              {mutation.isPending ? "Salvando…" : editing ? "Salvar alterações" : "Adicionar item"}
            </Button>
          </div>
        </form>
        {pendingImage && (
          <ImageCropper
            file={pendingImage}
            aspect={55 / 85}
            onCancel={() => setPendingImage(null)}
            onDone={(f) => {
              setPendingImage(null);
              setImageFile(f);
              setRemoveImage(false);
              setPreview(URL.createObjectURL(f));
            }}
          />
        )}
      </section>
    </div>
  );
}
