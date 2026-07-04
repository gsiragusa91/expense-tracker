"use client";

import { useState, useTransition } from "react";
import { Check, Trash2, X } from "lucide-react";
import { confirmExpenseDrafts } from "@/app/actions";
import { CATEGORY_SEEDS } from "@/lib/domain/categories";
import { amountToArs } from "@/lib/domain/money";
import type { Currency, ExpenseDraft, ProfileKey } from "@/lib/domain/types";

type Props = {
  open: boolean;
  drafts: ExpenseDraft[];
  title?: string;
  onClose: () => void;
  onConfirmed?: () => void;
};

function patchAmount(row: ExpenseDraft, amountOriginal: number, currency: Currency, fxRate: number | null) {
  return {
    ...row,
    amountOriginal,
    currency,
    fxRate: currency === "USD" ? fxRate : null,
    amountArs: amountToArs(amountOriginal, currency, currency === "USD" ? fxRate : null)
  };
}

export function ExpenseConfirmationSheet({ open, drafts, title = "Confirmar gastos", onClose, onConfirmed }: Props) {
  const [rows, setRows] = useState(drafts);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  function updateRow(index: number, patch: Partial<ExpenseDraft>) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  function submit() {
    startTransition(async () => {
      const result = await confirmExpenseDrafts(rows);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(result.message ?? `${result.data?.count ?? rows.length} gasto(s) guardado(s).`);
      onConfirmed?.();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#213547]/30 px-3 pb-3 backdrop-blur-sm">
      <section className="max-h-[88vh] w-full max-w-[430px] overflow-hidden rounded-t-[28px] border border-[var(--border)] bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary-strong)]">
              Pre-confirmacion
            </p>
            <h2 className="text-xl font-bold text-[var(--ink)]">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full bg-[var(--surface-soft)] text-[var(--ink)]"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </header>

        <div className="max-h-[62vh] space-y-3 overflow-y-auto px-4 py-4">
          {rows.map((row, index) => (
            <article key={row.id ?? index} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)] p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <input
                  value={row.description}
                  onChange={(event) => updateRow(index, { description: event.target.value, merchantName: event.target.value })}
                  className="field min-h-0 flex-1 py-2 text-base font-bold"
                  aria-label="Descripcion"
                />
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="grid size-10 place-items-center rounded-full bg-white text-[var(--danger)]"
                  aria-label="Eliminar gasto"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-[var(--muted)]">
                  Monto
                  <input
                    inputMode="decimal"
                    value={row.amountOriginal}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((currentRow, rowIndex) =>
                          rowIndex === index
                            ? patchAmount(currentRow, Number(event.target.value) || 0, currentRow.currency, currentRow.fxRate)
                            : currentRow
                        )
                      )
                    }
                    className="field mt-1"
                  />
                </label>
                <label className="text-xs font-semibold text-[var(--muted)]">
                  Moneda
                  <select
                    value={row.currency}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((currentRow, rowIndex) =>
                          rowIndex === index
                            ? patchAmount(currentRow, currentRow.amountOriginal, event.target.value as Currency, currentRow.fxRate)
                            : currentRow
                        )
                      )
                    }
                    className="field mt-1"
                  >
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-[var(--muted)]">
                  Fecha
                  <input
                    type="date"
                    value={row.expenseDate}
                    onChange={(event) => updateRow(index, { expenseDate: event.target.value })}
                    className="field mt-1"
                  />
                </label>
                <label className="text-xs font-semibold text-[var(--muted)]">
                  Perfil
                  <select
                    value={row.ownerProfileId ?? "guido"}
                    onChange={(event) => updateRow(index, { ownerProfileId: event.target.value as ProfileKey })}
                    className="field mt-1"
                  >
                    <option value="guido">Guido</option>
                    <option value="dalu">Dalu</option>
                  </select>
                </label>
                <label className="col-span-2 text-xs font-semibold text-[var(--muted)]">
                  Categoria
                  <select
                    value={row.categoryId ?? ""}
                    onChange={(event) => updateRow(index, { categoryId: event.target.value || null })}
                    className="field mt-1"
                  >
                    <option value="">Sin asignar</option>
                    {CATEGORY_SEEDS.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </article>
          ))}
          {!rows.length ? <p className="rounded-2xl bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted)]">No quedan gastos para confirmar.</p> : null}
        </div>

        <footer className="space-y-3 border-t border-[var(--border)] px-5 py-4">
          {message ? <p className="rounded-2xl bg-[var(--warning)]/45 px-3 py-2 text-sm text-[var(--ink)]">{message}</p> : null}
          <button
            type="button"
            onClick={submit}
            disabled={isPending || !rows.length}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary-strong)] px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            <Check size={20} />
            {isPending ? "Guardando..." : "Confirmar gastos"}
          </button>
        </footer>
      </section>
    </div>
  );
}
