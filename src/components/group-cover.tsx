import { useState } from "react";
import { ImageCropper } from "@/components/image-cropper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia, useMediaUrl } from "@/lib/media";

export function CoverImage({ path, className = "" }: { path: string | null; className?: string }) {
  const url = useMediaUrl(path);
  if (!path || !url.data) return <div className={`bg-secondary ${className}`} />;
  return <img src={url.data} alt="" className={`object-cover ${className}`} />;
}

export function CoverUploadButton({ userId, groupId }: { userId: string; groupId: string }) {
  const client = useQueryClient();
  const [pending, setPending] = useState<File | null>(null);
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const path = await uploadMedia(userId, "covers", file);
      const { error } = await supabase.from("collection_groups").update({ cover_url: path }).eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["collection", userId] }),
  });
  return (
    <>
    {pending && (
      <ImageCropper file={pending} aspect={16 / 9} onCancel={() => setPending(null)} onDone={(f) => { setPending(null); upload.mutate(f); }} />
    )}
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-card/90 px-3 py-2 text-sm font-medium text-foreground shadow hover:bg-card">
      <ImagePlus className="size-4" />
      {upload.isPending ? "Enviando…" : "Alterar capa"}
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
    </>
  );
}
