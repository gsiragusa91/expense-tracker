import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseGaliciaVisaStatement } from "@/lib/import/galicia";
import { parseMercadoPagoStatement } from "@/lib/import/mercado-pago";
import type { ParsedExpenseRow, ParsedStatement } from "@/lib/import/types";
import type { Expense, StatementProvider } from "@/lib/domain/types";

const ROOT = process.cwd();

function argValue(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function statementRowsToExpenses({
  provider,
  statement,
  rows
}: {
  provider: StatementProvider;
  statement: ParsedStatement;
  rows: ParsedExpenseRow[];
}): Expense[] {
  const accountingDate = statement.closingDate ?? `${statement.statementMonth ?? "2026-05"}-01`;
  return rows
    .filter((row) => row.include)
    .map((row, index) => ({
      id: `${provider}-${row.rowKey}-${index}`,
      createdAt: new Date("2026-07-03T00:00:00.000Z").toISOString(),
      createdByMemberId: "member-demo-guido",
      statementImportId: `${provider}-${statement.statementMonth ?? "unknown"}`,
      expenseDate: accountingDate,
      description: row.description,
      merchantName: row.merchantName,
      merchantNormalized: row.merchantNormalized,
      amountOriginal: row.amountOriginal,
      currency: row.currency,
      fxRate: row.fxRate,
      amountArs: row.amountArs,
      categoryId: row.categoryId,
      sourceType: "card_pdf",
      ownerProfileId: row.cardholderProfileKey ?? "guido",
      cardholderProfileId: row.cardholderProfileKey,
      confidence: row.confidence,
      reviewStatus: row.reviewStatus,
      installments: row.installments,
      operationCode: row.operationCode,
      notes:
        `${provider === "mercado_pago" ? "Import real Mercado Pago Mayo 2026" : "Import real Galicia Mayo 2026"} ` +
        `· consumo original ${row.expenseDate}`
    }));
}

const mpTextPath = argValue("mp-text");
const galiciaTextPath = argValue("galicia-text");
if (!mpTextPath || !galiciaTextPath) {
  throw new Error("Usage: node --loader ./tests/ts-loader.mjs scripts/generate-local-real-data.ts --mp-text=/tmp/mp.txt --galicia-text=/tmp/galicia.txt");
}

const mpText = await readFile(mpTextPath, "utf8");
const galiciaText = await readFile(galiciaTextPath, "utf8");
const mp = parseMercadoPagoStatement(mpText, { statementYear: 2026, statementMonth: 5 });
const galicia = parseGaliciaVisaStatement(galiciaText, { fxRate: Number(argValue("fx-rate") ?? 1200) });
const expenses = [
  ...statementRowsToExpenses({ provider: "mercado_pago", statement: mp, rows: mp.rows }),
  ...statementRowsToExpenses({ provider: "galicia_visa", statement: galicia, rows: galicia.rows })
];

const outputPath = path.join(ROOT, "data", "local-real-expenses.json");
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(expenses, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify({
    outputPath,
    expenses: expenses.length,
    mercadoPagoRows: mp.rows.length,
    mercadoPagoTotalArs: mp.totals.totalArs,
    galiciaRows: galicia.rows.length,
    galiciaTotalArs: galicia.totals.totalArs,
    galiciaTotalUsd: galicia.totals.totalUsd
  })
);
