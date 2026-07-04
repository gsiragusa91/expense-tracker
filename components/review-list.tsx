import { updateExpenseReviewAction } from "@/app/actions";
import { CategoryBadge } from "@/components/category-badge";
import { CATEGORY_SEEDS } from "@/lib/domain/categories";
import { formatMoney } from "@/lib/domain/money";
import type { Expense } from "@/lib/domain/types";

export function ReviewList({ expenses, mode }: { expenses: Expense[]; mode: "demo" | "supabase" }) {
  const sorted = [...expenses].sort((a, b) => {
    const aPending = a.reviewStatus === "pending" ? 0 : 1;
    const bPending = b.reviewStatus === "pending" ? 0 : 1;
    return aPending - bPending || b.expenseDate.localeCompare(a.expenseDate);
  });

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-[var(--border)] bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary-strong)]">Revisar</p>
        <h2 className="text-2xl font-black text-[var(--ink)]">Categorias y reglas</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Cuando corregís un merchant y activás aprendizaje, el proximo import puede aplicar esa regla automaticamente.
        </p>
      </section>

      {mode === "demo" ? (
        <p className="rounded-[20px] bg-[var(--warning)]/55 p-4 text-sm font-semibold text-[var(--ink)]">
          Modo demo: podés ver el flujo, pero las ediciones se guardan cuando conectes Supabase.
        </p>
      ) : null}

      <div className="space-y-3">
        {sorted.map((expense) => (
          <form key={expense.id} action={updateExpenseReviewAction} className="rounded-[22px] border border-[var(--border)] bg-white p-4 shadow-sm">
            <input type="hidden" name="id" value={expense.id} />
            <input type="hidden" name="merchantNormalized" value={expense.merchantNormalized} />
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-[var(--ink)]">{expense.description}</p>
                <p className="text-sm text-[var(--muted)]">
                  {expense.expenseDate} · {expense.sourceType} · {expense.ownerProfileId === "dalu" || expense.cardholderProfileId === "dalu" ? "Dalu" : "Guido"}
                </p>
              </div>
              <p className="shrink-0 text-lg font-black text-[var(--ink)]">{formatMoney(expense.amountArs)}</p>
            </div>
            <div className="mb-3 flex items-center gap-2">
              <CategoryBadge categoryId={expense.categoryId} />
              <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-bold text-[var(--muted)]">
                {expense.reviewStatus}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <select name="categoryId" defaultValue={expense.categoryId ?? ""} className="field">
                <option value="">Sin asignar</option>
                {CATEGORY_SEEDS.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select name="reviewStatus" defaultValue={expense.reviewStatus} className="field">
                <option value="pending">Sin revisar</option>
                <option value="auto_categorized">Auto-categorizado</option>
                <option value="confirmed">Confirmado</option>
                <option value="excluded">Excluido</option>
              </select>
              <label className="flex items-center gap-2 rounded-2xl bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--ink)]">
                <input type="checkbox" name="learn" className="size-4 accent-[var(--primary-strong)]" defaultChecked={expense.reviewStatus === "pending"} />
                Aprender regla para este merchant
              </label>
              <button type="submit" className="rounded-full bg-[var(--primary-strong)] px-4 py-3 font-bold text-white">
                Guardar ajuste
              </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
