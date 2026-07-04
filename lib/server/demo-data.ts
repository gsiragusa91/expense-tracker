import { CATEGORY_SEEDS } from "@/lib/domain/categories";
import type { DashboardSummary, DashboardView, Expense, HouseholdMember } from "@/lib/domain/types";
import { monthKey, todayISO } from "@/lib/domain/dates";

export const DEMO_MEMBER: HouseholdMember = {
  id: "member-demo-guido",
  email: "guido@example.com",
  profileKey: "guido",
  displayName: "Guido"
};

export const DEMO_EXPENSES: Expense[] = [
  {
    id: "demo-1",
    createdAt: new Date().toISOString(),
    createdByMemberId: "member-demo-guido",
    expenseDate: todayISO(),
    description: "COTO",
    merchantName: "COTO",
    merchantNormalized: "COTO",
    amountOriginal: 49752,
    currency: "ARS",
    fxRate: null,
    amountArs: 49752,
    categoryId: "supermercado",
    sourceType: "card_pdf",
    ownerProfileId: "guido",
    cardholderProfileId: "guido",
    confidence: 0.78,
    reviewStatus: "auto_categorized",
    installments: null,
    operationCode: "354165"
  },
  {
    id: "demo-2",
    createdAt: new Date().toISOString(),
    createdByMemberId: "member-demo-guido",
    expenseDate: todayISO(),
    description: "Expensas edificio",
    merchantName: "Expensas edificio",
    merchantNormalized: "EXPENSAS EDIFICIO",
    amountOriginal: 185000,
    currency: "ARS",
    fxRate: null,
    amountArs: 185000,
    categoryId: "expensas",
    sourceType: "manual",
    ownerProfileId: "guido",
    confidence: 1,
    reviewStatus: "confirmed"
  },
  {
    id: "demo-3",
    createdAt: new Date().toISOString(),
    createdByMemberId: "member-demo-guido",
    expenseDate: todayISO(),
    description: "RAPPI",
    merchantName: "RAPPI",
    merchantNormalized: "RAPPI",
    amountOriginal: 14451,
    currency: "ARS",
    fxRate: null,
    amountArs: 14451,
    categoryId: "delivery",
    sourceType: "voice",
    ownerProfileId: "dalu",
    confidence: 0.94,
    reviewStatus: "confirmed"
  }
];

// La fecha con la que agrupamos segun la vista: cashflow = expenseDate (vencimiento),
// devengado = purchaseDate (fecha de compra; cae a expenseDate si falta).
export function viewDate(expense: Expense, view: DashboardView) {
  return view === "devengado" ? expense.purchaseDate ?? expense.expenseDate : expense.expenseDate;
}

export function buildDashboardSummary(
  expenses: Expense[],
  month = monthKey(todayISO()),
  view: DashboardView = "cashflow"
): DashboardSummary {
  const inMonth = expenses.filter(
    (expense) => monthKey(viewDate(expense, view)) === month && expense.reviewStatus !== "excluded"
  );
  const totalArs = inMonth.reduce((sum, expense) => sum + expense.amountArs, 0);
  const byCategory = CATEGORY_SEEDS.map((category) => ({
    category: category.name,
    color: category.color,
    amountArs: inMonth
      .filter((expense) => expense.categoryId === category.id)
      .reduce((sum, expense) => sum + expense.amountArs, 0)
  })).filter((row) => row.amountArs > 0);
  const byProfile = ["guido", "dalu"].map((profile) => ({
    profile: profile === "guido" ? "Guido" : "Dalu",
    amountArs: inMonth
      .filter((expense) => expense.ownerProfileId === profile || expense.cardholderProfileId === profile)
      .reduce((sum, expense) => sum + expense.amountArs, 0)
  }));
  const merchantTotals = new Map<string, number>();
  for (const expense of inMonth) {
    merchantTotals.set(expense.merchantName, (merchantTotals.get(expense.merchantName) ?? 0) + expense.amountArs);
  }

  return {
    month,
    totalArs,
    previousTotalArs: totalArs * 0.88,
    cardTotalArs: inMonth
      .filter((expense) => expense.sourceType === "card_pdf")
      .reduce((sum, expense) => sum + expense.amountArs, 0),
    manualTotalArs: inMonth
      .filter((expense) => expense.sourceType === "manual")
      .reduce((sum, expense) => sum + expense.amountArs, 0),
    voiceTotalArs: inMonth
      .filter((expense) => expense.sourceType === "voice")
      .reduce((sum, expense) => sum + expense.amountArs, 0),
    pendingCount: inMonth.filter((expense) => expense.reviewStatus === "pending").length,
    byCategory: byCategory.sort((a, b) => b.amountArs - a.amountArs).slice(0, 6),
    byProfile,
    topMerchants: [...merchantTotals.entries()]
      .map(([merchant, amountArs]) => ({ merchant, amountArs }))
      .sort((a, b) => b.amountArs - a.amountArs)
      .slice(0, 5)
  };
}

export function latestExpenseMonth(expenses: Expense[], view: DashboardView = "cashflow") {
  const months = expenses
    .filter((expense) => expense.reviewStatus !== "excluded")
    .map((expense) => monthKey(viewDate(expense, view)))
    .sort((a, b) => b.localeCompare(a));
  return months[0] ?? monthKey(todayISO());
}
