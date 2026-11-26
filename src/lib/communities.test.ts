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
  it("separa cadastros antigos na primeira barra sem recadastrar", () => {
    expect(splitOrigin(" Nana / Mercari 3.0 ")).toEqual({ community: "Nana", ceg: "Mercari 3.0" });
    expect(splitOrigin("Bia / Batch 2 / Coreia")).toEqual({ community: "Bia", ceg: "Batch 2 / Coreia" });
    expect(splitOrigin("Nana :: Mercari / 3.0")).toEqual({ community: "Nana", ceg: "Mercari / 3.0" });
  });
  it("soma apenas cobranças pendentes, não o item já pago", () => {
    const purchase = { ...item("Nana / Mercari 3.0", false, 45), item_paid: true,
      stages: [{ kind: "frete1", amount: 18, paid: false, due_date: null }] } as Item;
    expect(groupByCommunity([purchase])[0]?.pending).toBe(18);
    expect(groupByCommunity([purchase])[0]?.total).toBe(63);
  });
  it("agrupa itens por comunidade com filtros de CEG", () => {
    const boxes = groupByCommunity([item("Nana :: Mercari 3.0"), item("Nana :: Cacarecos Anardilyas", true), item("Nana")]);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]?.cegs).toEqual(["Cacarecos Anardilyas", "Mercari 3.0", "Sem CEG específica"]);
    expect(boxes[0]?.pending).toBe(20);
  });
});
