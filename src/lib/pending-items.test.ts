import { test } from "node:test";
import assert from "node:assert/strict";
import { pendingItemsByDueDate } from "./pending-items";

test("pending mural includes events and albums together, earliest deadline first", () => {
  const items = [
    { id: "album", era: "HOP", paid: false, due_date: "2026-11-30" },
    { id: "popup", era: "SKZOO Magic School", paid: false, due_date: "2026-11-25" },
    { id: "overdue", era: "ATE", paid: false, due_date: "2026-11-20" },
  ];
  assert.deepEqual(pendingItemsByDueDate(items).map((item) => item.id), ["overdue", "popup", "album"]);
  assert.deepEqual(items.map((item) => item.id), ["album", "popup", "overdue"]);
});

test("paid items disappear from the mural without removing them from the collection", () => {
  const items = [
    { id: "paid", paid: true, due_date: "2026-11-20" },
    { id: "pending", paid: false, due_date: "2026-11-25" },
  ];
  assert.deepEqual(pendingItemsByDueDate(items).map((item) => item.id), ["pending"]);
  assert.equal(items.length, 2);
});

test("items without deadlines stay visible after dated pending items", () => {
  assert.deepEqual(pendingItemsByDueDate([
    { id: "undated", paid: false, due_date: null },
    { id: "dated", paid: false, due_date: "2026-11-25" },
  ]).map((item) => item.id), ["dated", "undated"]);
});

test("paid item dates do not outrank an earlier shipping charge", () => {
  const items = [
    { id: "later-shipping", paid: false, amount: 45, item_paid: true, due_date: "2026-11-01", stages: [
      { kind: "frete1", amount: 18, due_date: "2026-11-30", paid: false },
    ] },
    { id: "earlier-item", paid: false, amount: 20, item_paid: false, due_date: "2026-11-28", stages: [] },
  ];
  assert.deepEqual(pendingItemsByDueDate(items).map((item) => item.id), ["earlier-item", "later-shipping"]);
});