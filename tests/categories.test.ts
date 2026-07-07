import test from "node:test";
import assert from "node:assert/strict";
import { parentOf, parentCategories, subcategoriesOf } from "@/lib/domain/categories";
import { buildDashboardSummary } from "@/lib/server/demo-data";
import type { Expense } from "@/lib/domain/types";

function mkExpense(partial: Partial<Expense> & { categoryId: string; amountArs: number }): Expense {
  return {
    id: Math.random().toString(36).slice(2),
    createdAt: "2026-05-15T00:00:00.000Z",
    createdByMemberId: "m1",
    expenseDate: "2026-05-15",
    description: "x",
    merchantName: "x",
    merchantNormalized: "X",
    amountOriginal: partial.amountArs,
    currency: "ARS",
    fxRate: null,
    sourceType: "manual",
    paymentMethod: "efectivo_transferencia",
    ownerProfileId: "guido",
    confidence: 1,
    reviewStatus: "confirmed",
    ...partial
  } as Expense;
}

test("parentOf sube una subcategoría a su categoría padre", () => {
  assert.equal(parentOf("supermercado").id, "super");
  assert.equal(parentOf("tenis").id, "ocio");
  assert.equal(parentOf("educacion").id, "educacion-cat");
});

test("parentOf es idempotente sobre un padre y cae a Otros ante ids desconocidos", () => {
  assert.equal(parentOf("super").id, "super");
  assert.equal(parentOf(null).id, "otros-cat");
  assert.equal(parentOf("no-existe").id, "otros-cat");
});

test("los padres no cuelgan de nadie y las subs sí", () => {
  const parents = parentCategories();
  assert.ok(parents.every((c) => c.parentId === null));
  assert.ok(parents.some((c) => c.id === "super"));
  const superSubs = subcategoriesOf("super");
  assert.deepEqual(
    superSubs.map((s) => s.id).sort(),
    ["supermercado", "verduleria-almacen"]
  );
});

test("buildDashboardSummary agrupa por categoría padre y conserva el total", () => {
  const expenses = [
    mkExpense({ categoryId: "supermercado", amountArs: 1000 }),
    mkExpense({ categoryId: "verduleria-almacen", amountArs: 500 }),
    mkExpense({ categoryId: "delivery", amountArs: 300 })
  ];
  const summary = buildDashboardSummary(expenses, "2026-05", "cashflow");

  const superRow = summary.byCategory.find((r) => r.categoryId === "super");
  const gastroRow = summary.byCategory.find((r) => r.categoryId === "gastro");
  assert.equal(superRow?.amountArs, 1500); // 1000 + 500 bajo "Super"
  assert.equal(gastroRow?.amountArs, 300); // delivery bajo "Gastronomía"
  assert.equal(summary.totalArs, 1800); // el total no cambia
  // No debe aparecer la subcategoría suelta como fila
  assert.equal(summary.byCategory.find((r) => r.categoryId === "supermercado"), undefined);
});
