import { describe, expect, it } from "vitest";
import { allPaid, missingStages, nextPaymentDate, parseStages, pendingCost, scopeOf, totalCost } from "./payment-stages";

const stages = parseStages([
  { kind: "taxa", amount: 12, due_date: null, paid: false },
  { kind: "frete1", amount: 18, due_date: null, paid: true },
]);

describe("payment stages", () => {
  it("orders Frete 1 before Taxa", () => expect(stages.map((s) => s.kind)).toEqual(["frete1", "taxa"]));
  it("is only fully paid when every active stage is paid", () => {
    expect(allPaid(true, stages)).toBe(false);
    expect(allPaid(true, [])).toBe(true);
  });
  it("sums total and pending values", () => {
    expect(totalCost(45, stages)).toBe(75);
    expect(pendingCost(45, true, stages)).toBe(12);
  });
});

describe("purchase types", () => {
  it("nacional can be saved before shipping is charged", () => {
    expect(missingStages("nacional", [])).toEqual([]);
    expect(missingStages("nacional", ["frete_nac"])).toEqual([]);
  });
  it("internacional can be saved before shipping and taxes are charged", () => {
    expect(missingStages("internacional", [])).toEqual([]);
  });
  it("detects nacional from its stages", () => {
    expect(scopeOf([{ kind: "frete_gom" }])).toBe("nacional");
    expect(scopeOf([{ kind: "taxa" }])).toBe("internacional");
  });
});

it("ignores uncharged placeholders without discarding real charges", () => {
  const active = parseStages([
    { kind: "frete1", amount: 0, due_date: null, paid: false },
    { kind: "taxa", amount: 12, due_date: null, paid: false },
    { kind: "frete2", amount: 0, due_date: "2026-11-30", paid: false },
    { kind: "frete_nac", amount: 0, due_date: null, paid: true },
  ]);
  expect(active.map((s) => s.kind)).toEqual(["taxa", "frete2", "frete_nac"]);
  expect(allPaid(true, parseStages([{ kind: "frete1", amount: 0, paid: false }]))).toBe(true);
  expect(pendingCost(45, true, active)).toBe(12);
});

it("uses the unpaid charge deadline rather than the already-paid item deadline", () => {
  expect(nextPaymentDate({ amount: 45, item_paid: true, due_date: "2026-11-01", stages: [
    { kind: "frete1", amount: 18, due_date: "2026-11-30", paid: false },
  ] })).toBe("2026-11-30");
});
