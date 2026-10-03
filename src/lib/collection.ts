import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Group = Tables<"collection_groups">;
export type Era = Tables<"collection_eras">;
export type Item = Tables<"expenses">;

export const DEFAULT_GROUPS = [
  { name: "Stray Kids", slug: "stray-kids" },
  { name: "P1Harmony", slug: "p1harmony" },
] as const;

/** Eras pré-definidas por grupo (chave = slug do grupo), da mais recente para a mais antiga. */
export const PRESET_ERAS: Record<string, string[]> = {
  "stray-kids": [
    "THIS & THAT","HOLLOW","KARMA", "HOP", "GIANT", "ATE", "ROCK-STAR", "SOCIAL PATH", "5-STAR", "THE SOUND", "MAXIDENT",
    "CIRCUS", "ODDINARY", "Christmas EveL", "NOEASY", "SKZ2021", "ALL IN", "IN LIFE", "GO LIVE",
    "Clé : LEVANTER", "Clé 2 : Yellow Wood", "Clé 1 : MIROH", "I am YOU", "I am WHO", "I am NOT", "Mixtape",
  ],
  "p1harmony": [
    "UNIQUE JAPAN EDITION","UNIQUE", "DUH!", "SAD SONG", "Killin' It", "HARMONY : SET IN", "HARMONY : ALL IN", "HARMONY : ZERO IN",
    "DISHARMONY : FIND OUT", "DISHARMONY : BREAK OUT", "DISHARMONY : STAND OUT",
    "Love & P1ece : The Best of P1Harmony",
  ],
};
/** Versões dos álbuns pré-definidas. */
export const PRESET_VERSIONS: Record<string, Record<string, string[]>> = {
  "stray-kids": {
    "THIS & THAT": ["THIS Ver.", "THAT Ver.", "TRUCK Ver.", "FANS Ver.", "& Ver."],
    "HOLLOW": ["Limited Ver. A", "Limited Ver. B", "Regular Ver.", "FC Member Ver."],
    "KARMA": ["Karma Ver.", "Accident Ver."],
    "HOP": ["SKZHOP Ver.", "ACCORDION Ver.", "Platform Album NEMO Ver."],
    "GIANT": ["Limited Ver. A", "Limited Ver. B", "Regular Ver.", "Member Ver."],
    "ATE": ["Ate Ver.", "Chk Chk Ver.", "Boom Ver.", "Accordion Ver.", "Letter Ver.", "Platform Album NEMO Ver."],
    "ROCK-STAR": ["ROCK Ver.", "STAR Ver.", "POSTCARD Ver.", "LIMITED STAR Ver.", "HEADLINER Ver."],
    "SOCIAL PATH": ["Limited Ver. A", "Limited Ver. B", "Regular Ver.", "FC Member Ver."],
    "5-STAR": ["VER. A", "VER. B", "VER. C", "LIMITED VER.", "DIGIPACK Ver."],
    "THE SOUND": ["Limited Ver. A", "Limited Ver. B", "Regular Ver.", "FC Member Ver."],
    "MAXIDENT": ["T-CRUSH Ver.", "HEART Ver.", "GO Ver. (Limited)", "CASE Ver."],
    "CIRCUS": ["Limited Ver. A", "Limited Ver. B", "Regular Ver.", "FC Member Ver."],
    "ODDINARY": ["SCANNING Ver.", "MASK OFF Ver.", "FRANKENSTEIN Ver. (Limited)", "JEWEL CASE Ver."],
    "Christmas EveL": ["Limited Ver.", "Standard Ver."],
    "NOEASY": ["A Type", "B Type", "Limited Ver.", "Jewel Case Ver."],
    "SKZ2021": ["Digital Album"],
    "ALL IN": ["Limited Ver. A", "Limited Ver. B", "Limited Ver. C", "Regular Ver."],
    "IN LIFE": ["A Type", "B Type"],
    "GO LIVE": ["A Type", "B Type", "C Type", "Limited Ver."],
    "Clé : LEVANTER": ["CLE Ver.", "LEVANTER Ver.", "Limited Ver."],
    "Clé 2 : Yellow Wood": ["CLE Ver.", "YELLOW WOOD Ver.", "Limited Ver."],
    "Clé 1 : MIROH": ["MIROH Ver.", "CLE Ver.", "Limited Ver."],
    "I am YOU": ["I am Ver.", "YOU Ver."],
    "I am WHO": ["I am Ver.", "WHO Ver."],
    "I am NOT": ["I am Ver.", "NOT Ver."],
    "Mixtape": ["Standard Ver."]
  },
  "p1harmony": {
    "UNIQUE JAPAN EDITION": ["A Ver.", "B Ver.", "C Ver."],
    "UNIQUE": ["A Ver.", "B Ver.", "C Ver.", "Compact Ver.", "Light Ver.", "FaNCy Ver."],
    "DUH!": ["D Ver.", "U Ver.", "H Ver.", "Compact Ver.", "PLVE Ver.", "Nemo Ver."],
    "SAD SONG": ["SAD Ver.", "SONG Ver.", "Platform Album NEMO Ver."],
    "Killin' It": ["Super Ver.", "Main Ver.", "Platform Album NEMO Ver."],
    "HARMONY : SET IN": ["SET IN Ver.", "STEP IN Ver.", "GROW IN Ver."],
    "HARMONY : ALL IN": ["ALL IN Ver.", "FLOW IN Ver.", "STAY IN Ver."],
    "DISHARMONY : FIND OUT": ["FIND OUT Ver.", "WORLD Ver.", "TRACK Ver."],
    "DISHARMONY : BREAK OUT": ["BREAK OUT Ver.", "FREAK OUT Ver."],
    "DISHARMONY : STAND OUT": ["STAND OUT Ver."],
    "Love & P1ece : The Best of P1Harmony": ["Standard Ver."]
  }
}

/** Pop-up stores por grupo, do mais recente para o mais antigo. */
export const PRESET_POPUPS: Record<string, string[]> = {
  "stray-kids": [
    "SKZOO EVERYWHERE ALL AROUND THE WORLD",
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

export function presetVersionsFor(groupName: string, eraName: string) {
  return PRESET_VERSIONS[slugify(groupName)]?.[eraName] ?? [];
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

export async function deleteEraCascade(eraId: string, userId: string) {
  const { error: expenseError } = await supabase.from("expenses").delete().eq("era_id", eraId).eq("user_id", userId);
  if (expenseError) throw expenseError;

  const { error: eraError } = await supabase.from("collection_eras").delete().eq("id", eraId).eq("user_id", userId);
  if (eraError) throw eraError;
}

export async function deleteGroupCascade(groupId: string, userId: string) {
  const { error: expensesError } = await supabase.from("expenses").delete().eq("group_id", groupId).eq("user_id", userId);
  if (expensesError) throw expensesError;

  const { error: erasError } = await supabase.from("collection_eras").delete().eq("group_id", groupId).eq("user_id", userId);
  if (erasError) throw erasError;

  const { error: groupError } = await supabase.from("collection_groups").delete().eq("id", groupId).eq("user_id", userId);
  if (groupError) throw groupError;
}

export function useCollection(userId: string) {
  return useQuery({
    queryKey: ["collection", userId],
    queryFn: async () => {
      const { data: groupsData, error: groupsError } = await supabase.from("collection_groups").select("*").order("name");
      if (groupsError) throw groupsError;

      const groups = groupsData ?? [];

      const [e, i] = await Promise.all([
        supabase.from("collection_eras").select("*").order("name"),
        supabase.from("expenses").select("*").order("due_date"),
      ]);
      if (e.error || i.error) throw e.error ?? i.error;
      return { groups: groups as Group[], eras: e.data as Era[], items: i.data as Item[] };
    },
  });
}

export function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
