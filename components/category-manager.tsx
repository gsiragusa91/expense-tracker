import {
  createCategoryAction,
  deleteCategoryAction,
  reassignExpensesCategoryAction,
  updateCategoryAction
} from "@/app/actions";
import { CategoryOptions } from "@/components/category-options";
import { parentCategories, subcategoriesOf } from "@/lib/domain/categories";
import type { Category, Expense } from "@/lib/domain/types";

// <option>s de categorías PADRE, para elegir bajo qué padre cuelga una subcategoría.
function ParentSelect({ categories, name, defaultValue }: { categories: Category[]; name: string; defaultValue?: string }) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className="field">
      <option value="">— Categoría padre (nivel principal) —</option>
      {parentCategories(categories).map((p) => (
        <option key={p.id} value={p.id}>
          {p.icon} {p.name}
        </option>
      ))}
    </select>
  );
}

function CategoryForm({
  categories,
  action,
  category
}: {
  categories: Category[];
  action: (formData: FormData) => void;
  category?: Category;
}) {
  return (
    <form action={action} className="grid grid-cols-1 gap-2 rounded-2xl bg-[var(--surface-soft)] p-3">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <div className="flex gap-2">
        <input name="icon" defaultValue={category?.icon ?? "🏷️"} maxLength={4} className="field w-16 text-center" aria-label="Emoji" />
        <input name="name" defaultValue={category?.name ?? ""} placeholder="Nombre" className="field flex-1" required />
        <input type="color" name="color" defaultValue={category?.color ?? "#d8e2dc"} className="h-11 w-12 rounded-xl border border-[var(--line)]" aria-label="Color" />
      </div>
      <ParentSelect categories={categories} name="parentId" defaultValue={category?.parentId ?? ""} />
      <button type="submit" className="rounded-full bg-[var(--primary-strong)] px-4 py-2.5 text-sm font-bold text-white">
        {category ? "Guardar cambios" : "Crear categoría"}
      </button>
    </form>
  );
}

export function CategoryManager({
  categories,
  expenses,
  mode
}: {
  categories: Category[];
  expenses: Expense[];
  mode: "demo" | "supabase";
}) {
  // cuántos gastos usa cada categoría (para avisar antes de borrar / ofrecer reasignar)
  const usage = new Map<string, number>();
  for (const e of expenses) {
    if (!e.categoryId) continue;
    usage.set(e.categoryId, (usage.get(e.categoryId) ?? 0) + 1);
  }

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-[var(--ink)]">
          <span aria-hidden>🗂️</span> Categorías
        </h2>
      </div>

      {mode === "demo" ? (
        <p className="mb-3 rounded-[16px] bg-[var(--warning)]/55 p-3 text-xs font-semibold text-[var(--ink)]">
          Modo demo: podés ver la estructura, pero crear/editar categorías requiere Supabase.
        </p>
      ) : (
        <details className="mb-3 rounded-2xl border border-[var(--border)]">
          <summary className="cursor-pointer list-none px-3 py-2 text-sm font-bold text-[var(--primary-strong)]">
            ＋ Nueva categoría
          </summary>
          <div className="p-2">
            <CategoryForm categories={categories} action={createCategoryAction} />
          </div>
        </details>
      )}

      <div className="space-y-3">
        {parentCategories(categories).map((parent) => {
          const subs = subcategoriesOf(parent.id, categories);
          return (
            <div key={parent.id} className="rounded-2xl border border-[var(--border)] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-extrabold text-[var(--ink)]">
                  <span aria-hidden className="text-lg">{parent.icon}</span>
                  {parent.name}
                </span>
                {parent.householdId ? (
                  <EditControls categories={categories} category={parent} usageCount={usage.get(parent.id) ?? 0} />
                ) : (
                  <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                    Global
                  </span>
                )}
              </div>
              <div className="space-y-1.5 pl-2">
                {subs.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between gap-2 rounded-xl bg-[var(--surface-soft)] px-3 py-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                      <span aria-hidden>{sub.icon}</span>
                      {sub.name}
                      {usage.get(sub.id) ? (
                        <span className="text-xs font-normal text-[var(--muted)]">· {usage.get(sub.id)} gasto(s)</span>
                      ) : null}
                    </span>
                    {sub.householdId ? (
                      <EditControls categories={categories} category={sub} usageCount={usage.get(sub.id) ?? 0} />
                    ) : null}
                  </div>
                ))}
                {!subs.length ? <p className="text-xs text-[var(--muted)]">Sin subcategorías.</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Controles editar / borrar / reasignar para una categoría del hogar.
function EditControls({
  categories,
  category,
  usageCount
}: {
  categories: Category[];
  category: Category;
  usageCount: number;
}) {
  return (
    <details className="text-right">
      <summary className="cursor-pointer list-none text-xs font-bold text-[var(--primary-strong)]">Editar</summary>
      <div className="mt-2 space-y-2 text-left">
        <CategoryForm categories={categories} action={updateCategoryAction} category={category} />

        {usageCount > 0 ? (
          <form action={reassignExpensesCategoryAction} className="flex items-end gap-2 rounded-2xl bg-[var(--surface-soft)] p-3">
            <input type="hidden" name="fromId" value={category.id} />
            <label className="flex-1 text-xs font-semibold text-[var(--muted)]">
              Reasignar {usageCount} gasto(s) a…
              <select name="toId" className="field mt-1" required defaultValue="">
                <option value="" disabled>
                  Elegí destino
                </option>
                <CategoryOptions categories={categories} exclude={category.id} />
              </select>
            </label>
            <button type="submit" className="rounded-full bg-[var(--primary-strong)] px-3 py-2.5 text-xs font-bold text-white">
              Reasignar
            </button>
          </form>
        ) : (
          <form action={deleteCategoryAction}>
            <input type="hidden" name="id" value={category.id} />
            <button type="submit" className="w-full rounded-full border border-[var(--danger)] px-3 py-2 text-xs font-bold text-[var(--danger)]">
              Borrar categoría
            </button>
          </form>
        )}
      </div>
    </details>
  );
}
