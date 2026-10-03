import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Group = Tables<"collection_groups">;
export type Era = Tables<"collection_eras">;
export type Item = Tables<"expenses">;

/** Eras pré-definidas por grupo (chave = slug do grupo), da mais recente para a mais antiga. */
export const PRESET_ERAS: Record<string, string[]> = {
  "stray-kids": [
    "KARMA", "HOP", "GIANT", "ATE", "ROCK-STAR", "SOCIAL PATH", "5-STAR", "THE SOUND", "MAXIDENT",
    "CIRCUS", "ODDINARY", "Christmas EveL", "NOEASY", "SKZ2021", "ALL IN", "IN LIFE", "GO LIVE",
    "Clé : LEVANTER", "Clé 2 : Yellow Wood", "Clé 1 : MIROH", "I am YOU", "I am WHO", "I am NOT", "Mixtape",
  ],
};

/** Pop-up stores e fanmeetings por grupo, do mais recente para o mais antigo. */
export const PRESET_EVENTS: Record<string, string[]> = {
  "stray-kids": [
    "Fanmeeting: STAY in Our Little House",
    "Fanmeeting: SKZ 5'CLOCK",
    "Fanmeeting: SKZ TOY WORLD",
    "Pop-up: SKZOO Magic School",
    "Pop-up: HOP",
    "Pop-up: ATE",
    "Fanmeeting: SKZ'S MAGIC SCHOOL",
    "Pop-up: THE VICTORY (Japão)",
    "Pop-up: THE VICTORY",
    "Fanmeeting: PILOT : FOR ★★★★★",
    "Fanmeeting: 2nd #LoveSTAY 'SKZ'S CHOCOLATE FACTORY'",
    "Fanmeeting: STAYing Home Meeting",
    "Fanmeeting: 1st #LoveSTAY 'SKZ-X'",
  ],
};

export function presetErasFor(groupName: string) {
  return PRESET_ERAS[slugify(groupName)] ?? [];
}

export function presetEventsFor(groupName: string) {
  return PRESET_EVENTS[slugify(groupName)] ?? [];
}

export function useCollection(userId: string) {
  return useQuery({
    queryKey: ["collection", userId],
    queryFn: async () => {
      const [g, e, i] = await Promise.all([
        supabase.from("collection_groups").select("*").order("name"),
        supabase.from("collection_eras").select("*").order("name"),
        supabase.from("expenses").select("*").order("due_date"),
      ]);
      if (g.error || e.error || i.error) throw g.error ?? e.error ?? i.error;
      return { groups: g.data as Group[], eras: e.data as Era[], items: i.data as Item[] };
    },
  });
}

export function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
