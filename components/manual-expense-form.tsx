"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useFormStatus } from "react-dom";
import { createManualExpense } from "@/app/actions";
import { CATEGORY_SEEDS } from "@/lib/domain/categories";
import { todayISO } from "@/lib/domain/dates";
import { PAYMENT_METHODS } from "@/lib/domain/payment";
import type { HouseholdMember } from "@/lib/domain/types";

export function ManualExpenseForm({ member }: { member: HouseholdMember }) {
  const [currency, setCurrency] = useState("ARS");

  return (
    <form action={createManualExpense} className="space-y-4 rounded-[24px] border border-[var(--border)] bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary-strong)]">Carga manual</p>
        <h2 className="text-2xl font-black text-[var(--ink)]">Nuevo gasto</h2>
      </div>

      <label className="block text-sm font-bold text-[var(--ink)]">
        Descripcion
        <input name="description" className="field mt-1" placeholder="Verduleria, expensas, supermercado..." required />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold text-[var(--ink)]">
          Monto
          <input name="amountOriginal" inputMode="decimal" className="field mt-1" placeholder="0" required />
        </label>
        <label className="block text-sm font-bold text-[var(--ink)]">
          Moneda
          <select name="currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className="field mt-1">
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
        </label>
      </div>

      {currency === "USD" ? (
        <label className="block text-sm font-bold text-[var(--ink)]">
          Dolar MEP venta
          <input name="fxRate" inputMode="decimal" className="field mt-1" placeholder="Editable antes de guardar" />
        </label>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold text-[var(--ink)]">
          Fecha
          <input name="expenseDate" type="date" defaultValue={todayISO()} className="field mt-1" required />
        </label>
        <label className="block text-sm font-bold text-[var(--ink)]">
          Perfil
          <select name="ownerProfileId" defaultValue={member.profileKey} className="field mt-1">
            <option value="guido">Guido</option>
            <option value="dalu">Dalu</option>
          </select>
        </label>
      </div>

      <label className="block text-sm font-bold text-[var(--ink)]">
        Categoria
        <select name="categoryId" className="field mt-1" defaultValue="">
          <option value="">Inferir automaticamente</option>
          {CATEGORY_SEEDS.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-bold text-[var(--ink)]">
        Medio de pago
        <select name="paymentMethod" className="field mt-1" defaultValue="efectivo_transferencia">
          {PAYMENT_METHODS.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-bold text-[var(--ink)]">
        Notas
        <textarea name="notes" className="field mt-1 min-h-24" placeholder="Opcional" />
      </label>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary-strong)] px-4 py-3 font-bold text-white disabled:opacity-50"
    >
      <Save size={20} />
      {pending ? "Guardando..." : "Guardar gasto"}
    </button>
  );
}
