import { nextPaymentDate } from "./payment-stages";

type DueItem = { paid: boolean; due_date: string | null; amount?: number; item_paid?: boolean; stages?: unknown };

function deadline(item: DueItem) {
  return typeof item.item_paid === "boolean" && typeof item.amount === "number"
    ? nextPaymentDate({ ...item, amount: item.amount, item_paid: item.item_paid })
    : item.due_date;
}

export function pendingFirst(a: DueItem, b: DueItem) {
  if (a.paid !== b.paid) return a.paid ? 1 : -1;
  const da = deadline(a);
  const db = deadline(b);
  if (da && db) return da.localeCompare(db);
  if (da) return -1;
  if (db) return 1;
  return 0;
}

export function pendingItemsByDueDate<T extends DueItem>(items: readonly T[]): T[] {
  return items.filter((item) => !item.paid).sort(pendingFirst);
}