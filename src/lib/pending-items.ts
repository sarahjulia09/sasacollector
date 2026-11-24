type DueItem = { paid: boolean; due_date: string | null };

export function pendingFirst(a: DueItem, b: DueItem) {
  if (a.paid !== b.paid) return a.paid ? 1 : -1;
  if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
  if (a.due_date) return -1;
  if (b.due_date) return 1;
  return 0;
}

export function pendingItemsByDueDate<T extends DueItem>(items: readonly T[]): T[] {
  return items.filter((item) => !item.paid).sort(pendingFirst);
}