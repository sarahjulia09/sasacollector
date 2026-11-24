export type StageKind = "frete1" | "taxa" | "frete2";
export type Stage = { kind: StageKind; amount: number; due_date: string | null; paid: boolean };

export const STAGE_LABELS: Record<StageKind | "item", string> = {
  item: "Item",
  frete1: "Frete 1",
  taxa: "Taxa",
  frete2: "Frete 2",
};
export const STAGE_ORDER: StageKind[] = ["frete1", "taxa", "frete2"];

export function parseStages(raw: unknown): Stage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Stage => !!s && typeof s === "object" && STAGE_ORDER.includes((s as Stage).kind))
    .map((s) => ({ kind: s.kind, amount: Number(s.amount) || 0, due_date: s.due_date ?? null, paid: !!s.paid }))
    .sort((a, b) => STAGE_ORDER.indexOf(a.kind) - STAGE_ORDER.indexOf(b.kind));
}

/** Item fully paid only when the item stage and every active extra stage are paid. */
export function allPaid(itemPaid: boolean, stages: Stage[]) {
  return itemPaid && stages.every((s) => s.paid);
}

export function totalCost(amount: number, stages: Stage[]) {
  return amount + stages.reduce((n, s) => n + s.amount, 0);
}

export function pendingCost(amount: number, itemPaid: boolean, stages: Stage[]) {
  return (itemPaid ? 0 : amount) + stages.filter((s) => !s.paid).reduce((n, s) => n + s.amount, 0);
}
