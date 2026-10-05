import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ImageCropper } from "@/components/image-cropper";
import { SKZOO, uploadMedia, useMediaUrl, useProfile } from "@/lib/media";

export function AvatarImage({ value, size = 40 }: { value: string | null | undefined; size?: number }) {
  const isUpload = !!value && !value.startsWith("skzoo:");
  const url = useMediaUrl(isUpload ? value : null);
  const mascot = value?.startsWith("skzoo:") ? SKZOO.find((m) => `skzoo:${m.id}` === value) : null;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-card"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {isUpload && url.data ? (
        <img src={url.data} alt="" className="size-full object-cover" />
      ) : mascot ? (
        <span aria-hidden>{mascot.emoji}</span>
      ) : (
        <span aria-hidden>🐺</span>
      )}
    </span>
  );
}

export function ProfileAvatarButton({ userId, username }: { userId: string; username: string }) {
  const profile = useProfile(userId);
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<File | null>(null);
  const save = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase.from("profiles").update({ avatar_url: value }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["profile", userId] });
      setOpen(false);
    },
  });
  const upload = useMutation({
    mutationFn: async (file: File) => save.mutateAsync(await uploadMedia(userId, "avatar", file)),
  });
  const current = profile.data?.avatar_url;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full pr-3 text-sm font-medium hover:bg-secondary"
        title="Alterar ícone do perfil"
      >
        <AvatarImage value={current} size={40} />
        <span>@{username}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-md bg-card p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">Seu ícone</h2>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fechar">
                <X />
              </Button>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase text-primary">SKZOO</p>
            <div className="grid grid-cols-4 gap-3">
              {SKZOO.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={save.isPending}
                  onClick={() => save.mutate(`skzoo:${m.id}`)}
                  className={`flex flex-col items-center gap-1 rounded-md border p-2 text-xs hover:border-primary ${current === `skzoo:${m.id}` ? "border-primary bg-secondary" : "border-border"}`}
                >
                  <span className="text-3xl" aria-hidden>{m.emoji}</span>
                  <span className="font-medium">{m.name}</span>
                </button>
              ))}
            </div>
            <p className="mb-2 mt-5 text-xs font-semibold uppercase text-primary">Sua foto</p>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary/50 p-4 text-sm hover:bg-secondary">
              <Upload className="size-4" />
              {upload.isPending ? "Enviando…" : "Enviar foto da galeria"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPending(f);
                  e.target.value = "";
                }}
              />
            </label>
            {(save.isError || upload.isError) && (
              <p className="mt-3 text-sm text-destructive">Não foi possível salvar. Tente novamente.</p>
            )}
          </div>
        </div>
      )}
      {pending && (
        <ImageCropper file={pending} aspect={1} round onCancel={() => setPending(null)} onDone={(f) => { setPending(null); upload.mutate(f); }} />
      )}
    </>
  );
}
