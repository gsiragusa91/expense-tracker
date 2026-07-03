import Link from "next/link";
import { redirect } from "next/navigation";
import { CategoryBadge } from "@/components/category-badge";
import { formatMoney } from "@/lib/domain/money";
import { getDashboardData } from "@/lib/server/context";

export default async function MonitorPage() {
  const data = await getDashboardData();
  if (!data) redirect("/login");
  const { summary, expenses } = data;
  const monthExpenses = expenses.filter((expense) => expense.expenseDate.startsWith(summary.month));

  return (
    <main className="desktop-shell px-6 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[var(--border)] bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--primary-strong)]">Monitor familiar</p>
            <h1 className="text-4xl font-black text-[var(--ink)]">Gastos del mes</h1>
          </div>
          <Link href="/" className="rounded-full bg-[var(--primary-strong)] px-5 py-3 font-bold text-white">
            Volver a mobile
          </Link>
        </header>

        <section className="grid gap-4 lg:grid-cols-4">
          <MonitorCard label="Total" value={formatMoney(summary.totalArs)} />
          <MonitorCard label="Tarjetas" value={formatMoney(summary.cardTotalArs)} />
          <MonitorCard label="Manual" value={formatMoney(summary.manualTotalArs)} />
          <MonitorCard label="Pendientes" value={String(summary.pendingCount)} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[24px] border border-[var(--border)] bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-2xl font-black text-[var(--ink)]">Categorias</h2>
            <div className="space-y-3">
              {summary.byCategory.map((row) => (
                <div key={row.category} className="grid grid-cols-[180px_1fr_140px] items-center gap-3">
                  <span className="font-bold text-[var(--ink)]">{row.category}</span>
                  <div className="h-4 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(row.amountArs / Math.max(...summary.byCategory.map((item) => item.amountArs), 1)) * 100}%`,
                        backgroundColor: row.color
                      }}
                    />
                  </div>
                  <span className="text-right font-black text-[var(--ink)]">{formatMoney(row.amountArs)}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[24px] border border-[var(--border)] bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-2xl font-black text-[var(--ink)]">Perfiles</h2>
            <div className="grid gap-3">
              {summary.byProfile.map((row) => (
                <div key={row.profile} className="rounded-[20px] bg-[var(--surface-soft)] p-4">
                  <p className="font-bold text-[var(--muted)]">{row.profile}</p>
                  <p className="text-3xl font-black text-[var(--ink)]">{formatMoney(row.amountArs)}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-[24px] border border-[var(--border)] bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-2xl font-black text-[var(--ink)]">Detalle mensual</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2 text-left">
              <thead className="text-sm text-[var(--muted)]">
                <tr>
                  <th>Fecha</th>
                  <th>Descripcion</th>
                  <th>Categoria</th>
                  <th>Perfil</th>
                  <th className="text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {monthExpenses.map((expense) => (
                  <tr key={expense.id} className="bg-[var(--surface-soft)]">
                    <td className="rounded-l-2xl px-3 py-3 font-semibold text-[var(--ink)]">{expense.expenseDate}</td>
                    <td className="px-3 py-3 font-bold text-[var(--ink)]">{expense.description}</td>
                    <td className="px-3 py-3"><CategoryBadge categoryId={expense.categoryId} /></td>
                    <td className="px-3 py-3 text-[var(--muted)]">{expense.ownerProfileId === "dalu" || expense.cardholderProfileId === "dalu" ? "Dalu" : "Guido"}</td>
                    <td className="rounded-r-2xl px-3 py-3 text-right font-black text-[var(--ink)]">{formatMoney(expense.amountArs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function MonitorCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[24px] border border-[var(--border)] bg-white p-5 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-3xl font-black text-[var(--ink)]">{value}</p>
    </article>
  );
}
