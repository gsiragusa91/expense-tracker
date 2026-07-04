import type { CategoryRule } from "@/lib/domain/categorize";
import type { Currency, ProfileKey, ReviewStatus, StatementProvider } from "@/lib/domain/types";

export type ParsedExpenseRow = {
  rowKey: string;
  expenseDate: string;
  description: string;
  merchantName: string;
  merchantNormalized: string;
  amountOriginal: number;
  currency: Currency;
  amountArs: number;
  fxRate: number | null;
  categoryId: string | null;
  confidence: number;
  reviewStatus: ReviewStatus;
  installments: string | null;
  operationCode: string | null;
  cardholderProfileKey: ProfileKey | null;
  include: boolean;
  rawLine: string;
};

export type StatementTotals = {
  totalArs: number;
  totalUsd: number;
  computedConsumptionArs: number;
  computedConsumptionUsd: number;
  // Total de consumos que el propio resumen declara (para el sanity check).
  declaredConsumptionArs: number | null;
  declaredConsumptionUsd: number | null;
};

export type ParsedStatement = {
  provider: StatementProvider;
  statementMonth: string | null;
  closingDate: string | null;
  dueDate: string | null;
  rows: ParsedExpenseRow[];
  totals: StatementTotals;
  warnings: string[];
};

export type ParseStatementOptions = {
  statementYear?: number;
  statementMonth?: number;
  fxRate?: number | null;
  learnedRules?: CategoryRule[];
};
