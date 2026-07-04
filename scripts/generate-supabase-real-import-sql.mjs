import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

function parseOptions(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=");
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const nextValue = argv[index + 1];

    if (inlineValue !== undefined) {
      options[key] = inlineValue;
    } else if (nextValue && !nextValue.startsWith("--")) {
      options[key] = nextValue;
      index += 1;
    } else {
      options[key] = "true";
    }
  }

  return options;
}

const options = parseOptions(process.argv.slice(2));
const inputPath = options.input ?? "data/local-real-expenses.json";
const outputPath = options.output ?? "/tmp/expense-real-import.sql";
const householdId = options.householdId ?? process.env.EXPENSE_HOUSEHOLD_ID;
const createdByMemberId = options.createdByMemberId ?? process.env.EXPENSE_CREATED_BY_MEMBER_ID;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!householdId || !uuidPattern.test(householdId)) {
  throw new Error("Missing or invalid --household-id / EXPENSE_HOUSEHOLD_ID");
}

if (!createdByMemberId || !uuidPattern.test(createdByMemberId)) {
  throw new Error("Missing or invalid --created-by-member-id / EXPENSE_CREATED_BY_MEMBER_ID");
}

const expenses = JSON.parse(await readFile(inputPath, "utf8"));

if (!Array.isArray(expenses)) {
  throw new Error(`Expected ${inputPath} to be an array of expenses`);
}

const importDefinitions = [
  {
    key: "mercado_pago-2026-06",
    provider: "mercado_pago",
    statementMonth: "2026-06",
    closingDate: "2026-06-05",
    dueDate: "2026-06-10",
    totals: {
      totalArs: 1373475.59,
      totalUsd: 0,
      computedConsumptionArs: 1373475.59,
      computedConsumptionUsd: 0,
      dashboardAmountArs: 1373475.59
    }
  },
  {
    key: "galicia_visa-2026-05",
    provider: "galicia_visa",
    statementMonth: "2026-05",
    closingDate: "2026-05-28",
    dueDate: "2026-06-05",
    totals: {
      totalArs: 1574332.95,
      totalUsd: 13.38,
      computedConsumptionArs: 1580740.07,
      computedConsumptionUsd: 13.38,
      dashboardAmountArs: 1596796.07,
      fxRate: 1200
    }
  }
];

const imports = importDefinitions.map((entry) => {
  const rows = expenses.filter((expense) => expense.statementImportId === entry.key);

  if (rows.length === 0) {
    throw new Error(`No rows found for import ${entry.key}`);
  }

  return {
    ...entry,
    fileHash: `seed-${entry.key}-${crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex").slice(0, 16)}`,
    rawRows: rows
  };
});

const rowsForDb = expenses.map((expense) => ({
  statementImportKey: expense.statementImportId,
  expenseDate: expense.expenseDate,
  description: expense.description,
  merchantName: expense.merchantName,
  merchantNormalized: expense.merchantNormalized,
  amountOriginal: expense.amountOriginal,
  currency: expense.currency,
  fxRate: expense.fxRate,
  amountArs: expense.amountArs,
  categoryId: expense.categoryId,
  sourceType: expense.sourceType,
  ownerProfileId: expense.ownerProfileId,
  cardholderProfileId: expense.cardholderProfileId,
  confidence: expense.confidence,
  reviewStatus: expense.reviewStatus,
  installments: expense.installments,
  operationCode: expense.operationCode,
  notes: expense.notes
}));

function dollarJson(value) {
  return `$expense_json$${JSON.stringify(value)}$expense_json$::jsonb`;
}

const sql = `begin;

with import_payload as (
  select *
  from jsonb_to_recordset(${dollarJson(imports)}) as x(
    key text,
    provider text,
    "statementMonth" text,
    "closingDate" date,
    "dueDate" date,
    "fileHash" text,
    totals jsonb,
    "rawRows" jsonb
  )
),
upserted_imports as (
  insert into public.expense_statement_imports (
    household_id,
    provider,
    statement_month,
    closing_date,
    due_date,
    file_hash,
    totals,
    warnings,
    raw_rows,
    status,
    created_by_member_id
  )
  select
    '${householdId}'::uuid,
    provider::public.expense_statement_provider,
    "statementMonth",
    "closingDate",
    "dueDate",
    "fileHash",
    totals,
    array['Carga inicial desde PDFs reales compartidos por Guido']::text[],
    "rawRows",
    'confirmed',
    '${createdByMemberId}'::uuid
  from import_payload
  on conflict (household_id, provider, file_hash)
  do update set status = public.expense_statement_imports.status
  returning id, provider, statement_month
),
expense_payload as (
  select *
  from jsonb_to_recordset(${dollarJson(rowsForDb)}) as x(
    "statementImportKey" text,
    "expenseDate" date,
    description text,
    "merchantName" text,
    "merchantNormalized" text,
    "amountOriginal" numeric,
    currency text,
    "fxRate" numeric,
    "amountArs" numeric,
    "categoryId" text,
    "sourceType" text,
    "ownerProfileId" text,
    "cardholderProfileId" text,
    confidence numeric,
    "reviewStatus" text,
    installments text,
    "operationCode" text,
    notes text
  )
)
insert into public.expense_expenses (
  household_id,
  expense_date,
  description,
  merchant_name,
  merchant_normalized,
  amount_original,
  currency,
  fx_rate,
  amount_ars,
  category_id,
  source_type,
  owner_profile_id,
  cardholder_profile_id,
  created_by_member_id,
  statement_import_id,
  confidence,
  review_status,
  installments,
  operation_code,
  notes
)
select
  '${householdId}'::uuid,
  e."expenseDate",
  e.description,
  e."merchantName",
  e."merchantNormalized",
  e."amountOriginal",
  e.currency::public.expense_currency,
  e."fxRate",
  e."amountArs",
  e."categoryId",
  e."sourceType"::public.expense_source_type,
  e."ownerProfileId",
  e."cardholderProfileId",
  '${createdByMemberId}'::uuid,
  i.id,
  e.confidence,
  e."reviewStatus"::public.expense_review_status,
  e.installments,
  e."operationCode",
  e.notes
from expense_payload e
join import_payload p on p.key = e."statementImportKey"
join upserted_imports i
  on i.provider = p.provider::public.expense_statement_provider
 and i.statement_month = p."statementMonth"
on conflict do nothing;

commit;
`;

await writeFile(outputPath, sql, "utf8");

console.log(JSON.stringify({
  outputPath,
  imports: imports.length,
  expenses: rowsForDb.length,
  statementImports: imports.map((entry) => ({
    key: entry.key,
    rows: entry.rawRows.length,
    fileHash: entry.fileHash
  }))
}, null, 2));
