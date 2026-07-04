import { categorizeMerchant } from "@/lib/domain/categorize";
import { amountToArs, parseAmount } from "@/lib/domain/money";
import { normalizeMerchant } from "@/lib/domain/merchants";
import { parseShortSpanishDate } from "@/lib/domain/dates";
import { reconciliationWarnings } from "./reconcile";
import type { ParsedExpenseRow, ParsedStatement, ParseStatementOptions } from "./types";

const MONTH_NAMES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12
};

function inferYear(shortDate: string, statementYear: number, statementMonth: number) {
  const monthName = shortDate.split("/")[1].toLowerCase();
  const monthNumber = {
    ene: 1,
    feb: 2,
    mar: 3,
    abr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    ago: 8,
    sep: 9,
    set: 9,
    oct: 10,
    nov: 11,
    dic: 12
  }[monthName];
  if (!monthNumber) return statementYear;
  return monthNumber > statementMonth ? statementYear - 1 : statementYear;
}

function findClosing(text: string) {
  const match = text.match(/Fecha de cierre\s+(\d{1,2}) de ([a-záéíóú]+)/i);
  if (!match) return { day: null, month: null };
  return {
    day: Number(match[1]),
    month: MONTH_NAMES[match[2].toLowerCase()] ?? null
  };
}

function findDue(text: string, statementYear: number) {
  const match = text.match(/Fecha de vencimiento\s+(\d{1,2}) de ([a-záéíóú]+)/i);
  if (!match) return null;
  const month = MONTH_NAMES[match[2].toLowerCase()];
  if (!month) return null;
  return `${statementYear}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

export function parseMercadoPagoStatement(
  text: string,
  options: ParseStatementOptions = {}
): ParsedStatement {
  const closing = findClosing(text);
  const statementYear = options.statementYear ?? new Date().getFullYear();
  const statementMonth = options.statementMonth ?? closing.month ?? new Date().getMonth() + 1;
  const fxRate = options.fxRate ?? null;
  const rows: ParsedExpenseRow[] = [];
  const warnings: string[] = [];

  const totalMatch = text.match(/Total a pagar\s+\$\s*([\d.]+,\d{2})\s+US\$\s*([\d.]+,\d{2})/i);
  const totalArs = totalMatch ? parseAmount(totalMatch[1]) : 0;
  const totalUsd = totalMatch ? parseAmount(totalMatch[2]) : 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    // El monto captura signo y simbolo ($/US$): permite notas de credito (-$ 1.234,56).
    const match = line.match(
      /^(\d{1,2}\/[a-z]{3})\s+(.+?)\s+(?:(\d+)\s+de\s+(\d+)\s+)?(\d{4,})\s+(-?\s*\$\s*-?[\d.]+,\d{2}-?)(?:\s+(-?\s*US\$\s*-?[\d.]+,\d{2}-?))?$/i
    );
    if (!match) continue;

    const [, shortDate, description, installment, installmentTotal, operationCode, amountArsRaw, amountUsdRaw] =
      match;
    const rowYear = inferYear(shortDate, statementYear, statementMonth);
    const expenseDate = parseShortSpanishDate(shortDate, rowYear);
    if (!expenseDate) {
      warnings.push(`No pude parsear la fecha de Mercado Pago: ${shortDate}`);
      continue;
    }

    const currency = amountUsdRaw ? "USD" : "ARS";
    const amountOriginal = parseAmount(amountUsdRaw ?? amountArsRaw);
    const amountArs = currency === "USD" ? amountToArs(amountOriginal, "USD", fxRate) : parseAmount(amountArsRaw);
    const merchantName = description.trim();
    const category = categorizeMerchant(merchantName, options.learnedRules);

    rows.push({
      rowKey: `mp:${expenseDate}:${operationCode}:${amountOriginal}`,
      expenseDate,
      description: merchantName,
      merchantName,
      merchantNormalized: normalizeMerchant(merchantName),
      amountOriginal,
      currency,
      fxRate: currency === "USD" ? fxRate : null,
      amountArs,
      categoryId: category.categoryId,
      confidence: category.confidence,
      reviewStatus: category.reason === "fallback" ? "pending" : "auto_categorized",
      installments: installment ? `${installment}/${installmentTotal}` : null,
      operationCode,
      cardholderProfileKey: "guido",
      include: true,
      rawLine: line
    });
  }

  const closingDate =
    closing.day && closing.month
      ? `${statementYear}-${String(closing.month).padStart(2, "0")}-${String(closing.day).padStart(2, "0")}`
      : null;

  // Neto: el total de consumos del resumen incluye las devoluciones (negativos), asi que
  // sumamos todos los consumos con su signo para que la conciliacion cierre.
  const computedConsumptionArs = rows
    .filter((row) => row.currency === "ARS")
    .reduce((sum, row) => sum + row.amountArs, 0);
  const computedConsumptionUsd = rows
    .filter((row) => row.currency === "USD")
    .reduce((sum, row) => sum + row.amountOriginal, 0);

  // Total de consumos declarado por el resumen: linea "Consumos $ X US$ Y" del Consolidado.
  const declaredMatch = text.match(/\bConsumos\s+\$\s*([\d.]+,\d{2})\s+US\$\s*([\d.]+,\d{2})/i);
  const declaredConsumptionArs = declaredMatch ? parseAmount(declaredMatch[1]) : null;
  const declaredConsumptionUsd = declaredMatch ? parseAmount(declaredMatch[2]) : null;

  warnings.push(
    ...reconciliationWarnings({
      computedArs: computedConsumptionArs,
      declaredArs: declaredConsumptionArs,
      computedUsd: computedConsumptionUsd,
      declaredUsd: declaredConsumptionUsd
    })
  );

  return {
    provider: "mercado_pago",
    statementMonth: closingDate ? closingDate.slice(0, 7) : null,
    closingDate,
    dueDate: findDue(text, statementYear),
    rows,
    totals: {
      totalArs,
      totalUsd,
      computedConsumptionArs,
      computedConsumptionUsd,
      declaredConsumptionArs,
      declaredConsumptionUsd
    },
    warnings
  };
}
