import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle, ArrowUpRight, CreditCard, Wallet } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { SpendCharts } from "@/components/spend-charts";
import { categoryById, CATEGORY_SEEDS } from "@/lib/domain/categories";
import { formatMoney } from "@/lib/domain/money";
import type { Category, DashboardSummary, DashboardView, Expense } from "@/lib/domain/types";

const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" });

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  return monthFormatter.format(new Date(Date.UTC(Number(year), Number(monthNumber) - 1, 1)));
}

function pct(current: number, previous: number) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

export function Dashboard({
  summary,
  expenses,
  availableMonths = [summary.month],
  view = "cashflow",
  categories = CATEGORY_SEEDS
}: {
  summary: DashboardSummary;
  expenses: Expense[];
  availableMonths?: string[];
  view?: DashboardView;
  categories?: Category[];
}) {
  const delta = pct(summary.totalArs, summary.previousTotalArs);
  const maxCategory = Math.max(...summary.byCategory.map((row) => row.amountArs), 1);
  const dateFor = (expense: Expense) =>
    view === "devengado" ? expense.purchaseDate ?? expense.expenseDate : expense.expenseDate;
  const makeHref = (month: string, nextView: DashboardView) => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (nextView !== "cashflow") params.set("view", nextView);
    const query = params.toString();
    return query ? `/?${query}` : "/";
  };
  const currentMonthExpenses = expenses.filter((expense) => dateFor(expense).startsWith(summary.month));
  const recent = currentMonthExpenses.slice(0, 5);

  return (
    <div className="space-y-4">
      <section className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-white p-1 shadow-sm">
        <Link
          href={makeHref(summary.month, "cashflow")}
          className={`flex-1 rounded-full px-4 py-2 text-center text-sm font-bold ${
            view === "cashflow" ? "bg-[var(--primary-strong)] text-white" : "text-[var(--muted)]"
          }`}
        >
          Cashflow
        </Link>
        <Link
          href={makeHref(summary.month, "devengado")}
          className={`flex-1 rounded-full px-4 py-2 text-center text-sm font-bold ${
            view === "devengado" ? "bg-[var(--primary-strong)] text-white" : "text-[var(--muted)]"
          }`}
        >
          Devengado
        </Link>
      </section>
      <p className="px-1 text-xs text-[var(--muted)]">
        {view === "cashflow"
          ? "Agrupado por cuándo pagás (vencimiento del resumen)."
          : "Agrupado por cuándo compraste (fecha del consumo)."}
      </p>

      <section className="rounded-[24px] border border-[var(--border)] bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold capitalize text-[var(--muted)]">{monthLabel(summary.month)}</p>
            <p className="mt-1 text-4xl font-black text-[var(--ink)]">{formatMoney(summary.totalArs)}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${delta >= 0 ? "bg-[var(--warning)]" : "bg-[var(--success)]"}`}>
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(0)}%
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {summary.byPaymentMethod.map((pm) => (
            <MiniKpi
              key={pm.method}
              icon={pm.method === "efectivo_transferencia" ? <Wallet size={18} /> : <CreditCard size={18} />}
              label={pm.label}
              value={formatMoney(pm.amountArs)}
            />
          ))}
        </div>
      </section>

      <SpendCharts expenses={expenses} month={summary.month} view={view} categories={categories} />

      <section className="flex gap-2 overflow-x-auto rounded-[20px] border border-[var(--border)] bg-white p-2 shadow-sm">
        {availableMonths.map((month) => (
          <Link
            key={month}
            href={makeHref(month, view)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold capitalize ${
              month === summary.month
                ? "bg-[var(--primary-strong)] text-white"
                : "bg-[var(--surface-soft)] text-[var(--ink)]"
            }`}
          >
            {monthLabel(month)}
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3">
        {summary.byProfile.map((row) => (
          <article key={row.profile} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <p className="text-sm font-semibold text-[var(--muted)]">{row.profile}</p>
            <p className="mt-2 text-xl font-black text-[var(--ink)]">{formatMoney(row.amountArs)}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[24px] border border-[var(--border)] bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-[var(--ink)]">
            <span aria-hidden>📊</span> Categorias
          </h2>
          <Link href="/review" className="flex items-center gap-1 text-sm font-bold text-[var(--primary-strong)]">
            Revisar <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="space-y-3">
          {summary.byCategory.map((row) => (
            <div key={row.category}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                  <CategoryIcon categoryId={row.categoryId} size={22} categories={categories} />
                  {row.category}
                </span>
                <span className="font-bold text-[var(--ink)]">{formatMoney(row.amountArs)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                <div className="h-full rounded-full" style={{ width: `${(row.amountArs / maxCategory) * 100}%`, backgroundColor: row.color }} />
              </div>
            </div>
          ))}
          {!summary.byCategory.length ? <p className="text-sm text-[var(--muted)]">Todavia no hay gastos para este mes.</p> : null}
        </div>
      </section>

      {summary.pendingCount > 0 ? (
        <Link
          href="/review"
          className="flex items-center gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--warning)]/55 p-4 text-[var(--ink)]"
        >
          <AlertCircle size={22} />
          <span className="font-bold">{summary.pendingCount} gasto(s) necesitan categoria o confirmacion</span>
        </Link>
      ) : null}

      <section className="rounded-[24px] border border-[var(--border)] bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-[var(--ink)]">
          <span aria-hidden>🕒</span> Ultimos movimientos
        </h2>
        <div className="space-y-2">
          {recent.map((expense) => (
            <div key={expense.id} className="flex items-center gap-3 rounded-2xl bg-[var(--surface-soft)] p-3">
              <CategoryIcon categoryId={expense.categoryId} size={40} categories={categories} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-[var(--ink)]">{expense.description}</p>
                <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                  {categoryById(expense.categoryId, categories).name} ·{" "}
                  {expense.ownerProfileId === "dalu" || expense.cardholderProfileId === "dalu" ? "Dalu" : "Guido"}
                </p>
              </div>
              <p className="shrink-0 font-black text-[var(--ink)]">{formatMoney(expense.amountArs)}</p>
            </div>
          ))}
          {!recent.length ? <p className="text-sm text-[var(--muted)]">Cargá un gasto manual, por voz o importá un resumen para empezar.</p> : null}
        </div>
      </section>

      <section className="rounded-[24px] border border-[var(--border)] bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-[var(--ink)]">
          <span aria-hidden>🏪</span> Top merchants
        </h2>
        <div className="flex flex-wrap gap-2">
          {summary.topMerchants.map((merchant) => (
            <span key={merchant.merchant} className="rounded-full bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--ink)]">
              {merchant.merchant} · {formatMoney(merchant.amountArs)}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function MiniKpi({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[18px] bg-[var(--surface-soft)] p-3">
      <div className="mb-2 text-[var(--primary-strong)]">{icon}</div>
      <p className="truncate text-xs font-semibold text-[var(--muted)]">{label}</p>
      <p className="truncate text-sm font-black text-[var(--ink)]">{value}</p>
    </div>
  );
}
