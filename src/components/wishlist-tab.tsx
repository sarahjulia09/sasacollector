import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia, useMediaUrl } from "@/lib/media";
import type { Tables } from "@/integrations/supabase/types";

type Wish = Tables<"group_wishlists">;

function WishImage({ path, className }: { path: string; className: string }) {
  const url = useMediaUrl(path);
  return url.data ? (
    <img src={url.data} alt="" className={className} />
  ) : (
    <div className={`bg-secondary ${className}`} />
  );
}

export function WishlistTab({ userId, groupId }: { userId: string; groupId: string }) {
  const list = useQuery({
    queryKey: ["wishlist", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_wishlists")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<Wish | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const add = useMutation({
    mutationFn: async () => {
      if (!file || !title.trim()) throw new Error("Preencha título e imagem.");
      const image_path = await uploadMedia(userId, "wishlist", file);
      const { error } = await supabase.from("group_wishlists").insert({
        user_id: userId,
        group_id: groupId,
        title: title.trim().slice(0, 120),
        notes: notes.trim().slice(0, 500) || null,
        image_path,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAdding(false);
      setTitle("");
      setNotes("");
      setFile(null);
      list.refetch();
    },
  });
  const toggle = useMutation({
    mutationFn: async (w: Wish) => {
      const { error } = await supabase
        .from("group_wishlists")
        .update({ done: !w.done })
        .eq("id", w.id);
      if (error) throw error;
    },
    onSuccess: () => list.refetch(),
  });
  const remove = useMutation({
    mutationFn: async (w: Wish) => {
      const { error } = await supabase.from("group_wishlists").delete().eq("id", w.id);
      if (error) throw error;
      await supabase.storage.from("media").remove([w.image_path]);
    },
    onSuccess: () => {
      setViewing(null);
      list.refetch();
    },
  });

  const input = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

  return (
    <section className="pt-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-primary">Wishlist</p>
          <h2 className="font-display text-3xl font-semibold">Seus templates</h2>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus /> Adicionar template
        </Button>
      </div>

      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : list.data?.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.data.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setViewing(w)}
              className="overflow-hidden rounded-md border border-border bg-card text-left hover:border-primary"
            >
              <WishImage
                path={w.image_path}
                className={`aspect-[3/4] w-full object-cover ${w.done ? "opacity-50" : ""}`}
              />
              <div className="p-3">
                <p className="text-sm font-semibold">{w.title}</p>
                {w.done && <p className="mt-1 text-xs font-medium text-primary">✓ Completo</p>}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="border-y border-border py-10 text-sm text-muted-foreground">
          Nenhum template ainda. Envie a imagem do template dos photocards que você quer.
        </p>
      )}

      {adding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setAdding(false)}
        >
          <form
            className="w-full max-w-md space-y-3 rounded-md bg-card p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              add.mutate();
            }}
          >
            <h3 className="font-display text-2xl font-semibold">Novo template</h3>
            <label className="block text-sm font-medium">
              Título
              <input
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={input}
                placeholder="Ex.: Felix — ATE (POBs)"
              />
            </label>
            <label className="block text-sm font-medium">
              Imagem do template
              <input
                required
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className={input}
              />
            </label>
            <label className="block text-sm font-medium">
              Anotações (opcional)
              <textarea
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={input}
                rows={3}
              />
            </label>
            {add.isError && (
              <p className="text-sm text-destructive">{(add.error as Error).message}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={add.isPending}>
                {add.isPending ? "Enviando…" : "Salvar"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-foreground/90 p-3"
          onClick={() => setViewing(null)}
        >
          <div
            className="mb-2 flex items-center justify-between gap-2 text-background"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold">{viewing.title}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  toggle.mutate(viewing);
                  setViewing({ ...viewing, done: !viewing.done });
                }}
              >
                <Check /> {viewing.done ? "Reabrir" : "Completo"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.confirm("Excluir este template?") && remove.mutate(viewing)}
              >
                <Trash2 />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setViewing(null)}
                aria-label="Fechar"
              >
                <X />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto" onClick={(e) => e.stopPropagation()}>
            <WishImage path={viewing.image_path} className="mx-auto max-w-none w-full sm:w-auto" />
          </div>
          {viewing.notes && <p className="mt-2 text-sm text-background">{viewing.notes}</p>}
        </div>
      )}
    </section>
  );
}
