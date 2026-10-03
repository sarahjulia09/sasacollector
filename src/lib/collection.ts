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
  "p1harmony": [
    "UNIQUE", "DUH!", "SAD SONG", "Killin' It", "HARMONY : SET IN", "HARMONY : ALL IN", "HARMONY : ZERO IN",
    "DISHARMONY : FIND OUT", "DISHARMONY : BREAK OUT", "DISHARMONY : STAND OUT",
    "Love & P1ece : The Best of P1Harmony",
  ],
};

/** Pop-up stores por grupo, do mais recente para o mais antigo. */
export const PRESET_POPUPS: Record<string, string[]> = {
  "stray-kids": [
    "SKZOO Magic School",
    "HOP",
    "ATE",
    "THE VICTORY (Japão)",
    "THE VICTORY",
  ],
  "p1harmony": [
    "hello82 Tour Merch POP-UP",
    "P1Harmony : EX POP-UP",
  ],
};

/** Fanmeetings por grupo, do mais recente para o mais antigo. */
export const PRESET_FANMEETINGS: Record<string, string[]> = {
  "stray-kids": [
    "STAY in Our Little House",
    "SKZ 5'CLOCK",
    "SKZ TOY WORLD",
    "SKZ'S MAGIC SCHOOL",
    "PILOT : FOR ★★★★★",
    "2nd #LoveSTAY 'SKZ'S CHOCOLATE FACTORY'",
    "STAYing Home Meeting",
    "1st #LoveSTAY 'SKZ-X'",
  ],
  "p1harmony": [
    "P1uspace H : Horror Haven",
  ],
};

/** Turnês / concerts por grupo, do mais recente para o mais antigo. */
export const PRESET_TOURS: Record<string, string[]> = {
  "p1harmony": [
    "P1ustage H : MOST WANTED",
    "P1ustage H : UTOP1A",
    "P1ustage H : PEACE",
  ],
};

export function presetErasFor(groupName: string) {
  return PRESET_ERAS[slugify(groupName)] ?? [];
}

export function presetPopupsFor(groupName: string) {
  return PRESET_POPUPS[slugify(groupName)] ?? [];
}

export function presetFanmeetingsFor(groupName: string) {
  return PRESET_FANMEETINGS[slugify(groupName)] ?? [];
}

export function presetToursFor(groupName: string) {
  return PRESET_TOURS[slugify(groupName)] ?? [];
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
