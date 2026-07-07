export type Currency = "ARS" | "USD";
export type ExpenseSourceType = "manual" | "voice" | "card_pdf";
export type ReviewStatus = "pending" | "auto_categorized" | "confirmed" | "excluded";
export type StatementProvider = "mercado_pago" | "galicia_visa";
export type PaymentMethod = "tcmp" | "galicia" | "efectivo_transferencia";

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
  // Emoji que identifica visualmente la categoría (estilo "emoji cálido").
  icon: string;
  // Jerarquía Categoría › Subcategoría. parentId === null ⇒ la fila es una Categoría (padre);
  // parentId !== null ⇒ es una Subcategoría que cuelga de ese padre. Un gasto guarda SIEMPRE
  // el id de una subcategoría; el padre se deriva con parentOf().
  parentId: string | null;
  // Soft-delete: las categorías borradas quedan is_active=false para no romper gastos históricos.
  isActive: boolean;
  // household_id de la fila en DB. null/undefined ⇒ categoría GLOBAL (no editable por el usuario);
  // con valor ⇒ categoría propia del hogar (editable/borrable). Ausente en el seed demo.
  householdId?: string | null;
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
  paymentMethod?: PaymentMethod;
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
  byCategory: Array<{ categoryId: string; category: string; color: string; amountArs: number }>;
  byPaymentMethod: Array<{ method: PaymentMethod; label: string; amountArs: number }>;
  byProfile: Array<{ profile: string; amountArs: number }>;
  topMerchants: Array<{ merchant: string; amountArs: number }>;
};
