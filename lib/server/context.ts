import { CATEGORY_SEEDS } from "@/lib/domain/categories";
import { monthKey } from "@/lib/domain/dates";
import type { DashboardView, Expense, HouseholdMember } from "@/lib/domain/types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { DEMO_EXPENSES, DEMO_MEMBER, buildDashboardSummary, latestExpenseMonth, viewDate } from "./demo-data";
import { loadLocalRealExpenses } from "./local-real-data";

export type AppContext =
  | {
      mode: "demo";
      member: HouseholdMember;
      expenses: Expense[];
      categories: typeof CATEGORY_SEEDS;
    }
  | {
      mode: "supabase";
      member: HouseholdMember & { householdId: string };
      expenses: Expense[];
      categories: typeof CATEGORY_SEEDS;
    }
  | { mode: "unauthenticated" };

function mapExpense(row: Record<string, unknown>): Expense {
  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    createdByMemberId: String(row.created_by_member_id),
    expenseDate: String(row.expense_date),
    purchaseDate: row.purchase_date == null ? null : String(row.purchase_date),
    description: String(row.description),
    merchantName: String(row.merchant_name),
    merchantNormalized: String(row.merchant_normalized),
    amountOriginal: Number(row.amount_original),
    currency: row.currency === "USD" ? "USD" : "ARS",
    fxRate: row.fx_rate == null ? null : Number(row.fx_rate),
    amountArs: Number(row.amount_ars),
    categoryId: typeof row.category_id === "string" ? row.category_id : null,
    sourceType: row.source_type as Expense["sourceType"],
    paymentMethod: (row.payment_method as Expense["paymentMethod"]) ?? "efectivo_transferencia",
    ownerProfileId: typeof row.owner_profile_id === "string" ? row.owner_profile_id : null,
    cardholderProfileId:
      typeof row.cardholder_profile_id === "string" ? row.cardholder_profile_id : null,
    statementImportId:
      typeof row.statement_import_id === "string" ? row.statement_import_id : null,
    confidence: row.confidence == null ? null : Number(row.confidence),
    reviewStatus: row.review_status as Expense["reviewStatus"],
    installments: typeof row.installments === "string" ? row.installments : null,
    operationCode: typeof row.operation_code === "string" ? row.operation_code : null,
    notes: typeof row.notes === "string" ? row.notes : undefined
  };
}

export async function getAppContext(): Promise<AppContext> {
  if (!isSupabaseConfigured()) {
    const localRealExpenses = await loadLocalRealExpenses();
    return {
      mode: "demo",
      member: DEMO_MEMBER,
      expenses: localRealExpenses.length ? localRealExpenses : DEMO_EXPENSES,
      categories: CATEGORY_SEEDS
    };
  }

  const supabase = await createClient();
  if (!supabase) return { mode: "unauthenticated" };

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { mode: "unauthenticated" };

  const memberRes = await supabase
    .from("expense_household_members")
    .select("id, household_id, email, profile_key, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberRes.error || !memberRes.data) return { mode: "unauthenticated" };

  const expensesRes = await supabase
    .from("expense_expenses")
    .select("*")
    .eq("household_id", memberRes.data.household_id)
    .order("expense_date", { ascending: false })
    .limit(500);

  const member = {
    id: String(memberRes.data.id),
    householdId: String(memberRes.data.household_id),
    email: String(memberRes.data.email),
    profileKey: memberRes.data.profile_key === "dalu" ? "dalu" : "guido",
    displayName: String(memberRes.data.display_name)
  } as const;

  return {
    mode: "supabase",
    member,
    expenses: (expensesRes.data ?? []).map((row) => mapExpense(row as Record<string, unknown>)),
    categories: CATEGORY_SEEDS
  };
}

export async function getDashboardData(month?: string, view: DashboardView = "cashflow") {
  const context = await getAppContext();
  if (context.mode === "unauthenticated") return null;
  const selectedMonth = month ?? latestExpenseMonth(context.expenses, view);
  const availableMonths = Array.from(
    new Set(
      context.expenses
        .filter((expense) => expense.reviewStatus !== "excluded")
        .map((expense) => monthKey(viewDate(expense, view)))
    )
  ).sort((a, b) => b.localeCompare(a));
  return {
    ...context,
    view,
    summary: buildDashboardSummary(context.expenses, selectedMonth, view),
    availableMonths
  };
}
