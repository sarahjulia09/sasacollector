import { describe, expect, it } from "vitest";
import { allPaid, parseStages, pendingCost, totalCost } from "./payment-stages";

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
