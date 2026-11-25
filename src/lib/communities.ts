import type { Item } from "@/lib/collection";

/** Comunidade e CEG ficam juntas em expenses.origin como "Comunidade :: CEG". */
const SEP = " :: ";
export const NO_COMMUNITY = "Sem comunidade";
export const NO_CEG = "Sem CEG específica";

export function splitOrigin(origin: string | null | undefined): { community: string; ceg: string } {
  const raw = (origin ?? "").trim();
  const idx = raw.indexOf("::");
  if (idx < 0) return { community: raw, ceg: "" };
  return { community: raw.slice(0, idx).trim(), ceg: raw.slice(idx + 2).trim() };
}

export function joinOrigin(community: string, ceg: string): string {
  const c = community.trim();
  const g = ceg.trim();
  if (!g) return c;
  return `${c || NO_COMMUNITY}${SEP}${g}`;
}

export type CommunityBox = {
  name: string;
  items: Item[];
  cegs: string[];
  pending: number;
  total: number;
};

export function groupByCommunity(items: Item[]): CommunityBox[] {
  const map = new Map<string, Item[]>();
  for (const item of items) {
    const name = splitOrigin(item.origin).community || NO_COMMUNITY;
    map.set(name, [...(map.get(name) ?? []), item]);
  }
  return [...map.entries()]
    .map(([name, list]) => {
      const cegs = [...new Set(list.map((i) => splitOrigin(i.origin).ceg || NO_CEG))].sort((a, b) =>
        a === NO_CEG ? 1 : b === NO_CEG ? -1 : a.localeCompare(b),
      );
      return {
        name,
        items: list,
        cegs,
        pending: list.filter((i) => !i.paid).reduce((n, i) => n + i.amount, 0),
        total: list.reduce((n, i) => n + i.amount, 0),
      };
    })
    .sort((a, b) => (b.pending > 0 ? 1 : 0) - (a.pending > 0 ? 1 : 0) || a.name.localeCompare(b.name));
}

export function cegOf(item: Item): string {
  return splitOrigin(item.origin).ceg || NO_CEG;
}
