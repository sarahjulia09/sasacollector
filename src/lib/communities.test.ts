import { describe, expect, it } from "vitest";
import { groupByCommunity, joinOrigin, splitOrigin } from "./communities";
import type { Item } from "./collection";

const item = (origin: string | null, paid = false, amount = 10) => ({ id: Math.random().toString(), origin, paid, amount }) as unknown as Item;

describe("communities", () => {
  it("separa comunidade e CEG", () => {
    expect(splitOrigin("Nana :: Mercari 3.0")).toEqual({ community: "Nana", ceg: "Mercari 3.0" });
    expect(splitOrigin("CEG Coreia")).toEqual({ community: "CEG Coreia", ceg: "" });
  });
  it("CEG é opcional", () => {
    expect(joinOrigin("Nana", "")).toBe("Nana");
    expect(joinOrigin("Nana", "Mercari 3.0")).toBe("Nana :: Mercari 3.0");
  });
  it("agrupa itens por comunidade com filtros de CEG", () => {
    const boxes = groupByCommunity([item("Nana :: Mercari 3.0"), item("Nana :: Cacarecos Anardilyas", true), item("Nana")]);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]?.cegs).toEqual(["Cacarecos Anardilyas", "Mercari 3.0", "Sem CEG específica"]);
    expect(boxes[0]?.pending).toBe(20);
  });
});
