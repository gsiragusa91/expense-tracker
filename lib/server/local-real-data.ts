import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Expense } from "@/lib/domain/types";

const LOCAL_REAL_DATA_PATH = path.join(process.cwd(), "data", "local-real-expenses.json");

function isExpense(value: unknown): value is Expense {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.expenseDate === "string" &&
    typeof record.description === "string" &&
    typeof record.amountArs === "number" &&
    (record.currency === "ARS" || record.currency === "USD")
  );
}

export async function loadLocalRealExpenses(): Promise<Expense[]> {
  if (process.env.EXPENSE_TRACKER_DISABLE_LOCAL_REAL_DATA === "1") return [];

  try {
    const raw = await readFile(LOCAL_REAL_DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isExpense);
  } catch {
    return [];
  }
}
