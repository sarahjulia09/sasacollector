import { describe, expect, it } from "vitest";
import { allPaid, missingStages, parseStages, pendingCost, scopeOf, totalCost } from "./payment-stages";

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
  it("nacional requires Frete nacional only", () => {
    expect(missingStages("nacional", [])).toEqual(["Frete nacional"]);
    expect(missingStages("nacional", ["frete_nac"])).toEqual([]);
  });
  it("internacional requires Frete 1, Taxa and Frete 2", () => {
    expect(missingStages("internacional", ["frete1"])).toEqual(["Taxa", "Frete 2"]);
  });
  it("detects nacional from its stages", () => {
    expect(scopeOf([{ kind: "frete_gom" }])).toBe("nacional");
    expect(scopeOf([{ kind: "taxa" }])).toBe("internacional");
  });
});
