"use client";

import { useMemo, useRef, useState } from "react";
import { CATEGORY_SEEDS, parentOf } from "@/lib/domain/categories";
import { formatMoney } from "@/lib/domain/money";
import type { Category, DashboardView, Expense } from "@/lib/domain/types";

// "Resto": bucket visual del área apilada (top-5 padres + el resto). No confundir con la
// categoría real "Otros" (id otros-cat), que sí aparece por separado en la torta.
const RESTO_KEY = "__resto__";
const RESTO_COLOR = "#c9d3da";
const TOP_N = 5;

function lastMonths(endMonth: string, n: number): string[] {
  const [y, m] = endMonth.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
function shortMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1))
    .toLocaleDateString("es-AR", { month: "short", timeZone: "UTC" })
    .replace(".", "");
}

export function SpendCharts({
  expenses,
  month,
  view,
  categories = CATEGORY_SEEDS
}: {
  expenses: Expense[];
  month: string;
  view: DashboardView;
  categories?: Category[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const seriesLabel = (key: string) => (key === RESTO_KEY ? "Resto" : catById.get(key)?.name ?? "Sin categoría");
  const seriesColor = (key: string) => (key === RESTO_KEY ? RESTO_COLOR : catById.get(key)?.color ?? RESTO_COLOR);

  const dateFor = (e: Expense) => (view === "devengado" ? e.purchaseDate ?? e.expenseDate : e.expenseDate);
  // Agrupamos SIEMPRE por categoría padre: el gasto guarda la subcategoría; parentOf la sube.
  const parentKey = (e: Expense) => parentOf(e.categoryId, categories).id;

  const { months, topKeys, stacked, maxTotal, pie, pieTotal, selectedSeries, maxSelected } = useMemo(() => {
    const months = lastMonths(month, 6);
    const monthSet = new Set(months);
    const active = expenses.filter((e) => e.reviewStatus !== "excluded");

    // total por PADRE en la ventana de 6 meses → top N + "resto"
    const windowTotals = new Map<string, number>();
    for (const e of active) {
      if (!monthSet.has(dateFor(e).slice(0, 7))) continue;
      const id = parentKey(e);
      windowTotals.set(id, (windowTotals.get(id) ?? 0) + e.amountArs);
    }
    const ranked = [...windowTotals.entries()].sort((a, b) => b[1] - a[1]);
    const topIds = ranked.slice(0, TOP_N).map(([id]) => id);
    const topKeys = [...topIds, RESTO_KEY];
    const toKey = (id: string) => (topIds.includes(id) ? id : RESTO_KEY);

    // apilado: por mes, monto por serie (padre)
    const stacked = months.map((mo) => {
      const row: Record<string, number> = {};
      for (const k of topKeys) row[k] = 0;
      for (const e of active) {
        if (dateFor(e).slice(0, 7) !== mo) continue;
        row[toKey(parentKey(e))] += e.amountArs;
      }
      return { month: mo, values: row, total: Object.values(row).reduce((s, v) => s + v, 0) };
    });
    const maxTotal = Math.max(...stacked.map((s) => s.total), 1);

    // torta: mes en curso por PADRE (todos los que tengan monto)
    const pieMap = new Map<string, number>();
    for (const e of active) {
      if (dateFor(e).slice(0, 7) !== month) continue;
      const id = parentKey(e);
      pieMap.set(id, (pieMap.get(id) ?? 0) + e.amountArs);
    }
    const pie = [...pieMap.entries()].map(([key, amount]) => ({ key, amount })).sort((a, b) => b.amount - a.amount);
    const pieTotal = pie.reduce((s, p) => s + p.amount, 0);

    // serie del padre SELECCIONADO por mes (evolución filtrada) — directa, sin bucketeo
    const selectedSeries = months.map((mo) => {
      if (!selected) return 0;
      let sum = 0;
      for (const e of active) {
        if (dateFor(e).slice(0, 7) !== mo) continue;
        if (parentKey(e) !== selected) continue;
        sum += e.amountArs;
      }
      return sum;
    });
    const maxSelected = Math.max(...selectedSeries, 1);

    return { months, topKeys, stacked, maxTotal, pie, pieTotal, selectedSeries, maxSelected };
  }, [expenses, month, view, selected, categories]);

  // desglose (mes en curso), filtrado por padre seleccionado + rango de fechas
  const breakdown = useMemo(() => {
    return expenses
      .filter((e) => e.reviewStatus !== "excluded")
      .filter((e) => dateFor(e).slice(0, 7) === month)
      .filter((e) => (selected ? parentKey(e) === selected : true))
      .filter((e) => (from ? dateFor(e) >= from : true))
      .filter((e) => (to ? dateFor(e) <= to : true))
      .sort((a, b) => b.amountArs - a.amountArs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, month, view, selected, from, to, categories]);

  // ---- geometría del área apilada ----
  const W = 320;
  const H = 170;
  const padL = 6;
  const padR = 6;
  const padT = 10;
  const padB = 22;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const x = (i: number) => padL + (months.length === 1 ? plotW / 2 : (i / (months.length - 1)) * plotW);
  const evoMax = selected ? maxSelected : maxTotal;
  const y = (v: number) => padT + (1 - v / evoMax) * plotH;

  // bandas apiladas (sin filtro) o una única banda (con filtro por padre)
  const running = months.map(() => 0);
  const stackedBands = topKeys.map((key) => {
    const topPts: string[] = [];
    const botPts: string[] = [];
    stacked.forEach((s, i) => {
      const bottom = running[i];
      const top = bottom + (s.values[key] ?? 0);
      botPts.push(`${x(i)},${y(bottom)}`);
      topPts.push(`${x(i)},${y(top)}`);
      running[i] = top;
    });
    return { key, poly: [...topPts, ...botPts.reverse()].join(" ") };
  });
  const selectedBand = selected
    ? {
        key: selected,
        poly: [
          ...months.map((_, i) => `${x(i)},${y(selectedSeries[i])}`),
          ...months.map((_, i) => `${x(i)},${y(0)}`).reverse()
        ].join(" ")
      }
    : null;

  const toggle = (key: string) => setSelected((cur) => (cur === key ? null : key));

  // ---- geometría de la torta (donut) ----
  const R = 70;
  const cx = 80;
  const cy = 80;
  const inner = 40;
  let acc = 0;
  const arcs = pie.map((slice) => {
    const startAngle = (acc / (pieTotal || 1)) * Math.PI * 2 - Math.PI / 2;
    acc += slice.amount;
    const endAngle = (acc / (pieTotal || 1)) * Math.PI * 2 - Math.PI / 2;
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    const p = (ang: number, r: number) => `${cx + r * Math.cos(ang)},${cy + r * Math.sin(ang)}`;
    const d = `M ${p(startAngle, R)} A ${R} ${R} 0 ${large} 1 ${p(endAngle, R)} L ${p(endAngle, inner)} A ${inner} ${inner} 0 ${large} 0 ${p(startAngle, inner)} Z`;
    return { key: slice.key, d, amount: slice.amount };
  });

  const dim = (key: string) => selected !== null && selected !== key;
  const selectedAmount = selected ? pie.find((s) => s.key === selected)?.amount ?? 0 : 0;

  // ---- tooltip de la evolución (hover desktop + tap mobile) ----
  function idxFromClientX(clientX: number): number | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return null;
    const localX = ((clientX - rect.left) * W) / rect.width;
    const i = Math.round(((localX - padL) / plotW) * (months.length - 1));
    return Math.max(0, Math.min(months.length - 1, i));
  }
  const tip =
    hoverIdx !== null
      ? {
          month: months[hoverIdx],
          total: selected ? selectedSeries[hoverIdx] : stacked[hoverIdx].total,
          rows: (selected
            ? [{ key: selected, amount: selectedSeries[hoverIdx] }]
            : topKeys.map((k) => ({ key: k, amount: stacked[hoverIdx].values[k] ?? 0 }))
          )
            .filter((r) => r.amount > 0)
            .sort((a, b) => b.amount - a.amount)
        }
      : null;

  if (!stacked.some((s) => s.total > 0) && pieTotal === 0) {
    return (
      <section className="rounded-[24px] border border-[var(--border)] bg-white p-4 text-sm text-[var(--muted)] shadow-sm">
        Todavía no hay gastos suficientes para graficar.
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* Evolución mensual — área apilada (o filtrada por padre) con tooltip */}
      <div className="rounded-[24px] border border-[var(--border)] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold text-[var(--ink)]">
            Evolución mensual{selected ? ` · ${seriesLabel(selected)}` : ""}
          </h2>
          {selected ? (
            <button type="button" onClick={() => setSelected(null)} className="text-xs font-bold text-[var(--primary-strong)]">
              Limpiar filtro
            </button>
          ) : null}
        </div>
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full touch-none"
            role="img"
            aria-label="Evolución de gastos por mes"
            onMouseMove={(e) => setHoverIdx(idxFromClientX(e.clientX))}
            onMouseLeave={() => setHoverIdx(null)}
            onTouchStart={(e) => setHoverIdx(idxFromClientX(e.touches[0].clientX))}
            onTouchMove={(e) => setHoverIdx(idxFromClientX(e.touches[0].clientX))}
            onTouchEnd={() => setHoverIdx(null)}
          >
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <line key={f} x1={padL} x2={W - padR} y1={y(evoMax * f)} y2={y(evoMax * f)} stroke="var(--line)" strokeWidth={0.5} />
            ))}
            {selectedBand ? (
              <polygon points={selectedBand.poly} fill={seriesColor(selectedBand.key)} opacity={0.92} />
            ) : (
              stackedBands.map((b) => (
                <polygon
                  key={b.key}
                  points={b.poly}
                  fill={seriesColor(b.key)}
                  opacity={0.92}
                  onClick={() => toggle(b.key)}
                  style={{ cursor: "pointer" }}
                />
              ))
            )}
            {hoverIdx !== null ? (
              <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={padT} y2={H - padB} stroke="var(--primary-strong)" strokeWidth={1} strokeDasharray="3 3" />
            ) : null}
            {months.map((mo, i) => (
              <text key={mo} x={x(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="var(--muted)">
                {shortMonth(mo)}
              </text>
            ))}
          </svg>
          {tip ? (
            <div
              className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-xl border border-[var(--border)] bg-white/95 p-2 text-[11px] shadow-lg backdrop-blur"
              style={{ left: `${Math.min(80, Math.max(20, (x(hoverIdx!) / W) * 100))}%`, minWidth: 120, maxWidth: 180 }}
            >
              <p className="mb-1 font-bold capitalize text-[var(--ink)]">
                {shortMonth(tip.month)} · {formatMoney(tip.total)}
              </p>
              <div className="space-y-0.5">
                {tip.rows.map((r) => (
                  <div key={r.key} className="flex items-center gap-1.5">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: seriesColor(r.key) }} />
                    <span className="flex-1 truncate text-[var(--muted)]">{seriesLabel(r.key)}</span>
                    <span className="font-semibold text-[var(--ink)]">{formatMoney(r.amount)}</span>
                  </div>
                ))}
                {!tip.rows.length ? <span className="text-[var(--muted)]">Sin gastos</span> : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Torta del mes + leyenda clickeable */}
      <div className="rounded-[24px] border border-[var(--border)] bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-extrabold text-[var(--ink)]">Categorías del mes</h2>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0" role="img" aria-label="Distribución por categoría">
            {arcs.map((a) => (
              <path
                key={a.key}
                d={a.d}
                fill={seriesColor(a.key)}
                opacity={dim(a.key) ? 0.25 : 1}
                onClick={() => toggle(a.key)}
                style={{ cursor: "pointer" }}
              />
            ))}
            {selected ? (
              <>
                <text x="80" y="72" textAnchor="middle" fontSize={9} fill="var(--muted)">{seriesLabel(selected)}</text>
                <text x="80" y="88" textAnchor="middle" fontSize={13} fontWeight="800" fill="var(--ink)">{formatMoney(selectedAmount)}</text>
                <text x="80" y="101" textAnchor="middle" fontSize={8} fill="var(--muted)">
                  {Math.round((selectedAmount / (pieTotal || 1)) * 100)}% del mes
                </text>
              </>
            ) : (
              <>
                <text x="80" y="76" textAnchor="middle" fontSize={10} fill="var(--muted)">Total</text>
                <text x="80" y="92" textAnchor="middle" fontSize={13} fontWeight="800" fill="var(--ink)">{formatMoney(pieTotal)}</text>
              </>
            )}
          </svg>
          <div className="flex w-full flex-wrap gap-2">
            {pie.map((slice) => (
              <button
                key={slice.key}
                type="button"
                onClick={() => toggle(slice.key)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  selected === slice.key ? "border-[var(--primary-strong)] bg-[var(--primary-tint)]" : "border-[var(--border)] bg-[var(--surface-soft)]"
                } ${dim(slice.key) ? "opacity-50" : ""}`}
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: seriesColor(slice.key) }} />
                {seriesLabel(slice.key)}
                <span className="text-[var(--muted)]">{Math.round((slice.amount / (pieTotal || 1)) * 100)}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desglose filtrable */}
      <div className="rounded-[24px] border border-[var(--border)] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold text-[var(--ink)]">
            Desglose{selected ? ` · ${seriesLabel(selected)}` : ""}
          </h2>
          {selected ? (
            <span className="rounded-full bg-[var(--primary-tint)] px-3 py-1 text-xs font-black text-[var(--primary-ink)]">
              {formatMoney(selectedAmount)}
            </span>
          ) : null}
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-[var(--muted)]">
            Desde
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="field mt-1" />
          </label>
          <label className="text-xs font-semibold text-[var(--muted)]">
            Hasta
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="field mt-1" />
          </label>
        </div>
        <div className="space-y-2">
          {breakdown.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-soft)] p-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-[var(--ink)]">{e.description}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  <span className="size-2 rounded-full" style={{ backgroundColor: seriesColor(parentKey(e)) }} />
                  {catById.get(e.categoryId ?? "")?.name ?? "Sin categoría"} · {dateFor(e)}
                </p>
              </div>
              <p className="shrink-0 font-black text-[var(--ink)]">{formatMoney(e.amountArs)}</p>
            </div>
          ))}
          {!breakdown.length ? <p className="text-sm text-[var(--muted)]">No hay gastos con esos filtros.</p> : null}
        </div>
      </div>
    </section>
  );
}
