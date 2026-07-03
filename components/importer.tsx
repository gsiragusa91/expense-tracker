"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, FileUp, Loader2, Trash2 } from "lucide-react";
import { commitStatementImport, previewStatementImport } from "@/app/actions";
import { CATEGORY_SEEDS } from "@/lib/domain/categories";
import { formatMoney } from "@/lib/domain/money";
import type { ProfileKey, StatementProvider } from "@/lib/domain/types";
import type { ParsedExpenseRow, ParsedStatement } from "@/lib/import/types";

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No pude leer el archivo."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.readAsDataURL(file);
  });
}

export function Importer() {
  const [provider, setProvider] = useState<StatementProvider>("mercado_pago");
  const [fxRate, setFxRate] = useState("");
  const [statement, setStatement] = useState<ParsedStatement | null>(null);
  const [fileHash, setFileHash] = useState("");
  const [rows, setRows] = useState<ParsedExpenseRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onFile(file: File | null) {
    if (!file) return;
    setMessage(null);
    startTransition(async () => {
      const base64 = await fileToBase64(file);
      const result = await previewStatementImport({
        provider,
        base64,
        fileName: file.name,
        fxRate: fxRate ? Number(fxRate.replace(",", ".")) : null
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      if (!result.data) {
        setMessage("No pude armar el preview del resumen.");
        return;
      }
      setStatement(result.data.statement);
      setRows(result.data.statement.rows);
      setFileHash(result.data.fileHash);
    });
  }

  function updateRow(index: number, patch: Partial<ParsedExpenseRow>) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function commit() {
    if (!statement || !fileHash) return;
    startTransition(async () => {
      const result = await commitStatementImport({ provider, fileHash, statement, rows });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(result.data?.duplicate ? "Ese resumen ya estaba importado." : `${result.data?.count ?? 0} consumos importados.`);
    });
  }

  const includedTotal = rows.filter((row) => row.include).reduce((sum, row) => sum + row.amountArs, 0);

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-[var(--border)] bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary-strong)]">Importar PDF</p>
        <h2 className="text-2xl font-black text-[var(--ink)]">Resumen de tarjeta</h2>
        <div className="mt-4 grid grid-cols-1 gap-3">
          <label className="block text-sm font-bold text-[var(--ink)]">
            Proveedor
            <select value={provider} onChange={(event) => setProvider(event.target.value as StatementProvider)} className="field mt-1">
              <option value="mercado_pago">Mercado Pago credito</option>
              <option value="galicia_visa">Galicia Visa</option>
            </select>
          </label>
          <label className="block text-sm font-bold text-[var(--ink)]">
            Dolar MEP venta
            <input value={fxRate} onChange={(event) => setFxRate(event.target.value)} inputMode="decimal" className="field mt-1" placeholder="Auto si se deja vacio" />
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[20px] border border-dashed border-[var(--primary-strong)] bg-[var(--surface-soft)] px-4 py-8 text-center font-bold text-[var(--primary-strong)]">
            {isPending ? <Loader2 className="animate-spin" size={22} /> : <FileUp size={22} />}
            <span>{isPending ? "Leyendo PDF..." : "Seleccionar PDF"}</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={(event) => void onFile(event.target.files?.[0] ?? null)} />
          </label>
        </div>
      </section>

      {message ? <p className="rounded-[20px] bg-[var(--warning)]/55 p-4 text-sm font-semibold text-[var(--ink)]">{message}</p> : null}

      {statement ? (
        <section className="space-y-3 rounded-[24px] border border-[var(--border)] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-[var(--ink)]">Preview editable</h3>
              <p className="text-sm text-[var(--muted)]">
                {rows.length} filas · incluidas {rows.filter((row) => row.include).length} · {formatMoney(includedTotal)}
              </p>
            </div>
            <button
              type="button"
              onClick={commit}
              disabled={isPending}
              className="flex shrink-0 items-center gap-2 rounded-full bg-[var(--primary-strong)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              <CheckCircle2 size={18} />
              Confirmar
            </button>
          </div>

          {statement.warnings.length ? (
            <div className="rounded-2xl bg-[var(--warning)]/45 p-3 text-sm text-[var(--ink)]">
              {statement.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          <div className="space-y-2">
            {rows.map((row, index) => (
              <article key={row.rowKey} className={`rounded-[20px] border p-3 ${row.include ? "border-[var(--border)] bg-[var(--surface-soft)]" : "border-transparent bg-slate-100 opacity-60"}`}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-[var(--ink)]">{row.description}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {row.expenseDate} · {row.currency} {row.amountOriginal.toLocaleString("es-AR")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateRow(index, { include: !row.include })}
                    className="grid size-10 place-items-center rounded-full bg-white text-[var(--danger)]"
                    aria-label={row.include ? "Excluir gasto" : "Incluir gasto"}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={row.categoryId ?? ""} onChange={(event) => updateRow(index, { categoryId: event.target.value || null, reviewStatus: event.target.value ? "auto_categorized" : "pending" })} className="field">
                    <option value="">Sin categoria</option>
                    {CATEGORY_SEEDS.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <select value={row.cardholderProfileKey ?? "guido"} onChange={(event) => updateRow(index, { cardholderProfileKey: event.target.value as ProfileKey })} className="field">
                    <option value="guido">Guido</option>
                    <option value="dalu">Dalu</option>
                  </select>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
