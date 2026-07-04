import { categorizeMerchant } from "@/lib/domain/categorize";
import { parseGaliciaDate } from "@/lib/domain/dates";
import { amountToArs, parseAmount } from "@/lib/domain/money";
import { normalizeMerchant } from "@/lib/domain/merchants";
import type { ParsedExpenseRow, ParsedStatement, ParseStatementOptions } from "./types";

const LINE_RE = /^(\d{2}-\d{2}-\d{2})\s+(.*)$/;
const TOTAL_CARD_RE = /^TARJETA\s+\d+\s+Total Consumos de\s+(.+?)\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})/i;

function cleanReference(value: string) {
  return value.replace(/^[*K]\s+/, "").trim();
}

function parseConsumptionLine(line: string) {
  const dateMatch = line.match(LINE_RE);
  if (!dateMatch) return null;
  const [, rawDate, rest] = dateMatch;
  const expenseDate = parseGaliciaDate(rawDate);
  if (!expenseDate) return null;

  if (/TRANSFERENCIA DEUDA|SU PAGO EN PESOS/i.test(rest)) return null;

  const usdMatch = rest.match(/^(.*?)\s*USD\s+([\d.]+,\d{2})\s+(\d{4,})\s+([\d.]+,\d{2})\s*$/i);
  if (usdMatch) {
    const [, reference, usdAmount, operationCode] = usdMatch;
    return {
      expenseDate,
      description: cleanReference(reference),
      installments: null,
      operationCode,
      amountOriginal: parseAmount(usdAmount),
      amountArs: 0,
      currency: "USD" as const
    };
  }

  const arsMatch = rest.match(/^(.*?)\s+(?:(\d{2}\/\d{2})\s+)?(\d{4,})\s+([\d.]+,\d{2})\s*$/);
  if (!arsMatch) return null;
  const [, reference, installments, operationCode, amountRaw] = arsMatch;
  return {
    expenseDate,
    description: cleanReference(reference),
    installments: installments ?? null,
    operationCode,
    amountOriginal: parseAmount(amountRaw),
    amountArs: parseAmount(amountRaw),
    currency: "ARS" as const
  };
}

function isFinanceCharge(description: string) {
  return /INTERESES|IVA|IIBB|RG 5617|RG 4240/i.test(description);
}

function profileAfterTotalName(name: string) {
  if (/GUIDO/i.test(name)) return "dalu";
  return null;
}

export function parseGaliciaVisaStatement(
  text: string,
  options: ParseStatementOptions = {}
): ParsedStatement {
  const fxRate = options.fxRate ?? null;
  const rows: ParsedExpenseRow[] = [];
  const warnings: string[] = [];
  let currentProfile: "guido" | "dalu" | null = "guido";
  let inConsumptionDetail = false;
  let reachedTotals = false;
  let totalArs = 0;
  let totalUsd = 0;
  let closingDate: string | null = null;
  let dueDate: string | null = null;

  const headerDates = text.match(/(\d{2}-[A-Za-z]{3}-\d{2})\s+(\d{2}-[A-Za-z]{3}-\d{2})\s+(\d{2}-[A-Za-z]{3}-\d{2})\s+(\d{2}-[A-Za-z]{3}-\d{2})/);
  if (headerDates) {
    closingDate = parseLooseGaliciaHeaderDate(headerDates[3]);
    dueDate = parseLooseGaliciaHeaderDate(headerDates[4]);
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/\s+/g, " ");
    if (!line) continue;
    if (/DETALLE DEL CONSUMO/i.test(line)) {
      inConsumptionDetail = true;
      continue;
    }
    if (/TOTAL A PAGAR/i.test(line)) {
      reachedTotals = true;
      const match = line.match(/TOTAL A PAGAR\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})/i);
      if (match) {
        totalArs = parseAmount(match[1]);
        totalUsd = parseAmount(match[2]);
      }
      continue;
    }
    if (!inConsumptionDetail || reachedTotals) continue;

    const totalCard = line.match(TOTAL_CARD_RE);
    if (totalCard) {
      currentProfile = profileAfterTotalName(totalCard[1]) as "dalu" | null;
      continue;
    }

    const parsed = parseConsumptionLine(line);
    if (!parsed) continue;

    const category = categorizeMerchant(parsed.description, options.learnedRules);
    const finance = isFinanceCharge(parsed.description);
    const categoryId = finance ? "banco-comisiones" : category.categoryId;
    const amountArs = parsed.currency === "USD" ? amountToArs(parsed.amountOriginal, "USD", fxRate) : parsed.amountArs;

    rows.push({
      rowKey: `galicia:${parsed.expenseDate}:${parsed.operationCode}:${parsed.amountOriginal}`,
      expenseDate: parsed.expenseDate,
      description: parsed.description,
      merchantName: parsed.description,
      merchantNormalized: normalizeMerchant(parsed.description),
      amountOriginal: parsed.amountOriginal,
      currency: parsed.currency,
      amountArs,
      fxRate: parsed.currency === "USD" ? fxRate : null,
      categoryId,
      confidence: finance ? 0.95 : category.confidence,
      reviewStatus: category.reason === "fallback" && !finance ? "pending" : "auto_categorized",
      installments: parsed.installments,
      operationCode: parsed.operationCode,
      cardholderProfileKey: finance ? null : currentProfile,
      include: true,
      rawLine: line
    });
  }

  const computedConsumptionArs = rows
    .filter((row) => row.currency === "ARS")
    .reduce((sum, row) => sum + row.amountArs, 0);
  const computedConsumptionUsd = rows
    .filter((row) => row.currency === "USD")
    .reduce((sum, row) => sum + row.amountOriginal, 0);

  if (!rows.length) warnings.push("No se detectaron consumos en el resumen Galicia.");

  return {
    provider: "galicia_visa",
    statementMonth: closingDate ? closingDate.slice(0, 7) : null,
    closingDate,
    dueDate,
    rows,
    totals: {
      totalArs,
      totalUsd,
      computedConsumptionArs,
      computedConsumptionUsd
    },
    warnings
  };
}

function parseLooseGaliciaHeaderDate(value: string) {
  const months: Record<string, string> = {
    Ene: "01",
    Feb: "02",
    Mar: "03",
    Abr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Ago: "08",
    Sep: "09",
    Set: "09",
    Oct: "10",
    Nov: "11",
    Dic: "12"
  };
  const match = value.match(/^(\d{2})-([A-Za-z]{3})-(\d{2})$/);
  if (!match) return null;
  const [, day, monthName, year] = match;
  const month = months[monthName];
  return month ? `20${year}-${month}-${day}` : null;
}
