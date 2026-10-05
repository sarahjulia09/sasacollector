import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Mascotes SKZOO disponíveis como ícone de perfil. Valor salvo: "skzoo:<id>". */
export const SKZOO = [
  { id: "wolfchan", name: "Wolf Chan", member: "Bang Chan", emoji: "🐺" },
  { id: "leebit", name: "Leebit", member: "Lee Know", emoji: "🐰" },
  { id: "dwaekki", name: "Dwaekki", member: "Changbin", emoji: "🐷" },
  { id: "jiniret", name: "Jiniret", member: "Hyunjin", emoji: "🦦" },
  { id: "hanquokka", name: "Han Quokka", member: "Han", emoji: "🐹" },
  { id: "bbokari", name: "BbokAri", member: "Felix", emoji: "🐥" },
  { id: "puppym", name: "PuppyM", member: "Seungmin", emoji: "🐶" },
  { id: "foxiny", name: "FoxI.Ny", member: "I.N", emoji: "🦊" },
] as const;

/** Envia um arquivo para a pasta do usuário e devolve o caminho salvo. */
export async function uploadMedia(userId: string, folder: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    contentType: file.type,
  });
  if (error) throw error;
  return path;
}

/** URL temporária para exibir uma imagem privada. */
export function useMediaUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["media-url", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("media").createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function useProfile(userId: string) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
