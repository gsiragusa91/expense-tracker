export type Currency = "ARS" | "USD";
export type ExpenseSourceType = "manual" | "voice" | "card_pdf";
export type ReviewStatus = "pending" | "auto_categorized" | "confirmed" | "excluded";
export type StatementProvider = "mercado_pago" | "galicia_visa";

export type ProfileKey = "guido" | "dalu";

// Vista del dashboard: cashflow agrupa por cuándo pagás (expenseDate = vencimiento);
// devengado agrupa por cuándo compraste (purchaseDate).
export type DashboardView = "cashflow" | "devengado";

export type HouseholdMember = {
  id: string;
  email: string;
  profileKey: ProfileKey;
  displayName: string;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  kind:
    | "food"
    | "home"
    | "transport"
    | "health"
    | "services"
    | "family"
    | "leisure"
    | "finance"
    | "other";
};

export type ExpenseDraft = {
  id?: string;
  expenseDate: string;
  // Fecha de compra original (devengado). expenseDate = fecha de cashflow (vencimiento del
  // resumen para imports; misma fecha que la compra para gastos manuales/voz).
  purchaseDate?: string | null;
  description: string;
  merchantName: string;
  merchantNormalized: string;
  amountOriginal: number;
  currency: Currency;
  fxRate: number | null;
  amountArs: number;
  categoryId: string | null;
  sourceType: ExpenseSourceType;
  ownerProfileId: string | null;
  cardholderProfileId?: string | null;
  notes?: string;
  confidence: number | null;
  reviewStatus: ReviewStatus;
  installments?: string | null;
  operationCode?: string | null;
};

export type Expense = ExpenseDraft & {
  id: string;
  createdAt: string;
  createdByMemberId: string;
  statementImportId?: string | null;
};

export type DashboardSummary = {
  month: string;
  totalArs: number;
  previousTotalArs: number;
  cardTotalArs: number;
  manualTotalArs: number;
  voiceTotalArs: number;
  pendingCount: number;
  byCategory: Array<{ category: string; color: string; amountArs: number }>;
  byProfile: Array<{ profile: string; amountArs: number }>;
  topMerchants: Array<{ merchant: string; amountArs: number }>;
};
