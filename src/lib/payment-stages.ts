export type StageKind = "frete1" | "taxa" | "frete2" | "frete_nac" | "frete_gom";
export type Stage = { kind: StageKind; amount: number; due_date: string | null; paid: boolean };
export type PurchaseScope = "nacional" | "internacional";

export const STAGE_LABELS: Record<StageKind | "item", string> = {
  item: "Item",
  frete1: "Frete 1",
  taxa: "Taxa",
  frete2: "Frete 2",
  frete_nac: "Frete nacional",
  frete_gom: "Frete entre GOMs",
};
export const STAGE_ORDER: StageKind[] = ["frete1", "taxa", "frete2", "frete_nac", "frete_gom"];

/** Extra charges can be added when their amounts become known. */
export const SCOPE_STAGES: Record<PurchaseScope, { required: StageKind[]; optional: StageKind[] }> = {
  nacional: { required: [], optional: ["frete_nac", "frete_gom"] },
  internacional: { required: [], optional: ["frete1", "taxa", "frete2"] },
};

export function scopeOf(stages: { kind: StageKind }[]): PurchaseScope {
  return stages.some((s) => s.kind === "frete_nac" || s.kind === "frete_gom") ? "nacional" : "internacional";
}

/** Labels of required stages missing for the chosen purchase type. */
export function missingStages(scope: PurchaseScope, kinds: StageKind[]) {
  return SCOPE_STAGES[scope].required.filter((k) => !kinds.includes(k)).map((k) => STAGE_LABELS[k]);
}

export function parseStages(raw: unknown): Stage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Stage => !!s && typeof s === "object" && STAGE_ORDER.includes((s as Stage).kind))
    .map((s) => ({ kind: s.kind, amount: Number(s.amount) || 0, due_date: s.due_date ?? null, paid: !!s.paid }))
    .filter((s) => s.amount > 0 || s.paid || !!s.due_date)
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

export function pendingPayments(item: { amount: number; item_paid: boolean; due_date: string | null; stages: unknown }) {
  return [
    ...(!item.item_paid ? [{ kind: "item" as const, amount: item.amount, due_date: item.due_date, paid: false }] : []),
    ...parseStages(item.stages).filter((s) => !s.paid),
  ];
}

export function nextPaymentDate(item: Parameters<typeof pendingPayments>[0]) {
  return pendingPayments(item).map((s) => s.due_date).filter((date): date is string => !!date).sort()[0] ?? null;
}
