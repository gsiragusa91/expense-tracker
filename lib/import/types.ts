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
};
