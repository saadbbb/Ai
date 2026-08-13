import { describe, expect, it, vi } from "vitest";
import { decrementStock, restockOrderItems } from "./stock";

/**
 * Drizzle's query builder is a thenable chain (`.where(...)` can be awaited
 * directly, or chained further into `.limit()`/`.returning()`). This stub
 * mimics that shape closely enough to exercise decrementStock/restockOrderItems'
 * actual branching without needing a real Postgres transaction (this codebase
 * has no test-database infra — every other test mocks at the repository
 * boundary; these two functions sit one layer below that, directly on `tx`).
 */
function chain<T>(result: T) {
  const node: Record<string, unknown> = {};
  for (const method of ["from", "where", "set", "values"]) {
    node[method] = vi.fn(() => node);
  }
  node.limit = vi.fn(() => Promise.resolve(result));
  node.returning = vi.fn(() => Promise.resolve(result));
  node.then = (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return node;
}

function makeTx(steps: { select?: unknown[]; update?: unknown[] }[]) {
  const selectResults = steps.map((step) => step.select ?? []);
  const updateResults = steps.map((step) => step.update ?? []);
  const select = vi.fn();
  const update = vi.fn();
  selectResults.forEach((result) => select.mockReturnValueOnce(chain(result)));
  updateResults.forEach((result) => update.mockReturnValueOnce(chain(result)));
  return { select, update } as never;
}

describe("decrementStock", () => {
  it("skips products that don't have quantity tracking enabled — never touches update", async () => {
    const tx = makeTx([{ select: [{ trackQuantity: false }] }]);

    const result = await decrementStock(tx, "workspace-1", [{ productId: "p1", quantity: 2 }]);

    expect(result).toEqual({ ok: true, insufficientProductIds: [] });
    expect((tx as { update: ReturnType<typeof vi.fn> }).update).not.toHaveBeenCalled();
  });

  it("skips items with zero or negative quantity", async () => {
    const tx = makeTx([]);

    const result = await decrementStock(tx, "workspace-1", [{ productId: "p1", quantity: 0 }]);

    expect(result).toEqual({ ok: true, insufficientProductIds: [] });
    expect((tx as { select: ReturnType<typeof vi.fn> }).select).not.toHaveBeenCalled();
  });

  it("succeeds when the guarded UPDATE affects a row (enough stock)", async () => {
    const tx = makeTx([{ select: [{ trackQuantity: true }], update: [{ id: "p1" }] }]);

    const result = await decrementStock(tx, "workspace-1", [{ productId: "p1", quantity: 2 }]);

    expect(result).toEqual({ ok: true, insufficientProductIds: [] });
  });

  it("reports insufficient stock when the guarded UPDATE affects no rows", async () => {
    const tx = makeTx([{ select: [{ trackQuantity: true }], update: [] }]);

    const result = await decrementStock(tx, "workspace-1", [{ productId: "p1", quantity: 999 }]);

    expect(result).toEqual({ ok: false, insufficientProductIds: ["p1"] });
  });

  it("evaluates every item even after one is insufficient, collecting all shortfalls", async () => {
    const tx = makeTx([
      { select: [{ trackQuantity: true }], update: [] },
      { select: [{ trackQuantity: true }], update: [{ id: "p2" }] },
    ]);

    const result = await decrementStock(tx, "workspace-1", [
      { productId: "p1", quantity: 999 },
      { productId: "p2", quantity: 1 },
    ]);

    expect(result).toEqual({ ok: false, insufficientProductIds: ["p1"] });
  });
});

describe("restockOrderItems", () => {
  it("restocks only line items that have a productId and a positive quantity", async () => {
    const items = [
      { productId: "p1", quantity: 2 },
      { productId: null, quantity: 1 },
      { productId: "p2", quantity: 0 },
    ];
    const select = vi.fn(() => chain(items));
    const update = vi.fn(() => chain([]));
    const tx = { select, update } as never;

    await restockOrderItems(tx, "workspace-1", "order-1");

    expect(update).toHaveBeenCalledTimes(1);
  });
});
