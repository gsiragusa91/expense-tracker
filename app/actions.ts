"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { categorizeMerchant } from "@/lib/domain/categorize";
import { todayISO } from "@/lib/domain/dates";
import { amountToArs } from "@/lib/domain/money";
import { normalizeMerchant } from "@/lib/domain/merchants";
import type {
  Currency,
  ExpenseDraft,
  ProfileKey,
  ReviewStatus,
  StatementProvider
} from "@/lib/domain/types";
import { providerToPaymentMethod, sanitizePaymentMethod } from "@/lib/domain/payment";
import { parseGaliciaVisaStatement } from "@/lib/import/galicia";
import { parseMercadoPagoStatement } from "@/lib/import/mercado-pago";
import { extractPdfTextFromBytes } from "@/lib/import/pdf-text";
import type { ParsedExpenseRow, ParsedStatement } from "@/lib/import/types";
import { loadCategoryRules } from "@/lib/server/category-rules";
import { getAppContext } from "@/lib/server/context";
import { getMepSellRate } from "@/lib/server/fx";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type ActionState<T = unknown> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string };

type PreviewPayload = {
  provider: StatementProvider;
  base64: string;
  fileName: string;
  fxRate?: number | null;
  statementYear?: number;
  statementMonth?: number;
};

type CommitPayload = {
  provider: StatementProvider;
  fileHash: string;
  statement: ParsedStatement;
  rows: ParsedExpenseRow[];
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formNumber(formData: FormData, key: string) {
  const value = formString(formData, key);
  if (!value) return null;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeProfile(value: string | null | undefined, fallback: ProfileKey): ProfileKey {
  return value === "dalu" || value === "guido" ? value : fallback;
}

function sanitizeReviewStatus(value: string | null | undefined): ReviewStatus {
  if (value === "pending" || value === "auto_categorized" || value === "excluded") return value;
  return "confirmed";
}

function normalizeDraftForInsert(draft: ExpenseDraft, householdId: string, memberId: string) {
  return {
    household_id: householdId,
    expense_date: draft.expenseDate,
    purchase_date: draft.purchaseDate ?? draft.expenseDate,
    description: draft.description,
    merchant_name: draft.merchantName,
    merchant_normalized: draft.merchantNormalized || normalizeMerchant(draft.merchantName),
    amount_original: draft.amountOriginal,
    currency: draft.currency,
    fx_rate: draft.fxRate,
    amount_ars: draft.amountArs,
    category_id: draft.categoryId,
    source_type: draft.sourceType,
    payment_method: draft.paymentMethod ?? "efectivo_transferencia",
    owner_profile_id: draft.ownerProfileId,
    cardholder_profile_id: draft.cardholderProfileId ?? null,
    created_by_member_id: memberId,
    confidence: draft.confidence,
    review_status: draft.reviewStatus,
    installments: draft.installments ?? null,
    operation_code: draft.operationCode ?? null,
    notes: draft.notes ?? null
  };
}

function revalidateApp() {
  revalidatePath("/");
  revalidatePath("/manual");
  revalidatePath("/import");
  revalidatePath("/review");
  revalidatePath("/monitor");
}

export async function signInAction(formData: FormData) {
  const email = formString(formData, "email");
  const password = formString(formData, "password");
  if (!isSupabaseConfigured()) redirect("/");

  const supabase = await createClient();
  if (!supabase) redirect("/login?error=config");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/login");
}

export async function confirmExpenseDrafts(drafts: ExpenseDraft[]): Promise<ActionState<{ count: number }>> {
  const context = await getAppContext();
  if (context.mode === "unauthenticated") return { ok: false, error: "Necesitás iniciar sesión." };
  if (context.mode === "demo") {
    return { ok: true, data: { count: drafts.length }, message: "Modo demo: preconfirmación validada." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase no está configurado." };

  const rows = drafts
    .filter((draft) => draft.reviewStatus !== "excluded")
    .map((draft) => normalizeDraftForInsert(draft, context.member.householdId, context.member.id));
  if (!rows.length) return { ok: false, error: "No hay gastos para guardar." };

  const { error } = await supabase.from("expense_expenses").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidateApp();
  return { ok: true, data: { count: rows.length } };
}

export async function createManualExpense(formData: FormData) {
  const context = await getAppContext();
  if (context.mode === "unauthenticated") redirect("/login");

  const amountOriginal = formNumber(formData, "amountOriginal") ?? 0;
  const currency: Currency = formString(formData, "currency") === "USD" ? "USD" : "ARS";
  const explicitFx = formNumber(formData, "fxRate");
  const fxRate = currency === "USD" ? explicitFx ?? (await getMepSellRate(todayISO())) : null;
  const description = formString(formData, "description") || "Gasto manual";
  const merchantName = formString(formData, "merchantName") || description;
  const learnedRules =
    context.mode === "supabase" ? await loadCategoryRules(context.member.householdId) : [];
  const categoryId =
    formString(formData, "categoryId") || categorizeMerchant(merchantName, learnedRules).categoryId;
  const memberProfile = context.member.profileKey;
  const ownerProfileId = sanitizeProfile(formString(formData, "ownerProfileId"), memberProfile);
  const paymentMethod = sanitizePaymentMethod(formString(formData, "paymentMethod"));
  const amountArs = amountToArs(amountOriginal, currency, fxRate);

  const draft: ExpenseDraft = {
    expenseDate: formString(formData, "expenseDate") || todayISO(),
    description,
    merchantName,
    merchantNormalized: normalizeMerchant(merchantName),
    amountOriginal,
    currency,
    fxRate,
    amountArs,
    categoryId,
    sourceType: "manual",
    paymentMethod,
    ownerProfileId,
    confidence: categoryId ? 1 : 0,
    reviewStatus: categoryId ? "confirmed" : "pending",
    notes: formString(formData, "notes") || undefined
  };

  await confirmExpenseDrafts([draft]);
  redirect("/review?created=1");
}

export async function previewStatementImport(
  payload: PreviewPayload
): Promise<ActionState<{ statement: ParsedStatement; fileHash: string }>> {
  try {
    const bytes = Buffer.from(payload.base64, "base64");
    const fileHash = crypto.createHash("sha256").update(bytes).digest("hex");
    const text = await extractPdfTextFromBytes(bytes);
    const fxRate = payload.fxRate ?? (await getMepSellRate(todayISO()));
    const context = await getAppContext();
    const learnedRules =
      context.mode === "supabase" ? await loadCategoryRules(context.member.householdId) : [];
    const parseOptions = {
      fxRate,
      statementYear: payload.statementYear,
      statementMonth: payload.statementMonth,
      learnedRules
    };
    const statement =
      payload.provider === "mercado_pago"
        ? parseMercadoPagoStatement(text, parseOptions)
        : parseGaliciaVisaStatement(text, parseOptions);

    if (!statement.rows.length) {
      statement.warnings.push(`No se encontraron consumos en ${payload.fileName}.`);
    }

    return { ok: true, data: { statement, fileHash } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No pude leer el PDF."
    };
  }
}

export async function commitStatementImport(
  payload: CommitPayload
): Promise<ActionState<{ count: number; duplicate: boolean }>> {
  const context = await getAppContext();
  if (context.mode === "unauthenticated") return { ok: false, error: "Necesitás iniciar sesión." };
  const includedRows = payload.rows.filter((row) => row.include);
  if (!includedRows.length) return { ok: false, error: "No hay consumos incluidos para importar." };

  if (context.mode === "demo") {
    return {
      ok: true,
      data: { count: includedRows.length, duplicate: false },
      message: "Modo demo: import validado sin persistir."
    };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase no está configurado." };

  const duplicate = await supabase
    .from("expense_statement_imports")
    .select("id")
    .eq("household_id", context.member.householdId)
    .eq("provider", payload.provider)
    .eq("file_hash", payload.fileHash)
    .maybeSingle();
  if (duplicate.data?.id) return { ok: true, data: { count: 0, duplicate: true } };

  const importRes = await supabase
    .from("expense_statement_imports")
    .insert({
      household_id: context.member.householdId,
      provider: payload.provider,
      statement_month: payload.statement.statementMonth,
      closing_date: payload.statement.closingDate,
      due_date: payload.statement.dueDate,
      file_hash: payload.fileHash,
      totals: payload.statement.totals,
      warnings: payload.statement.warnings,
      raw_rows: includedRows,
      status: "confirmed",
      created_by_member_id: context.member.id
    })
    .select("id")
    .single();

  if (importRes.error || !importRes.data) {
    return { ok: false, error: importRes.error?.message ?? "No pude crear el import." };
  }

  const rows = includedRows.map((row) => ({
    ...normalizeDraftForInsert(
      {
        // Cashflow: fecha en que pagás el resumen (vencimiento). Fallbacks: cierre, mes, compra.
        expenseDate:
          payload.statement.dueDate ??
          payload.statement.closingDate ??
          (payload.statement.statementMonth ? `${payload.statement.statementMonth}-01` : row.expenseDate),
        // Devengado: fecha de compra original del consumo.
        purchaseDate: row.expenseDate,
        description: row.description,
        merchantName: row.merchantName,
        merchantNormalized: row.merchantNormalized,
        amountOriginal: row.amountOriginal,
        currency: row.currency,
        fxRate: row.fxRate,
        amountArs: row.amountArs,
        categoryId: row.categoryId,
        sourceType: "card_pdf",
        paymentMethod: providerToPaymentMethod(payload.provider),
        ownerProfileId: row.cardholderProfileKey ?? context.member.profileKey,
        cardholderProfileId: row.cardholderProfileKey,
        confidence: row.confidence,
        reviewStatus: row.categoryId ? row.reviewStatus : "pending",
        installments: row.installments,
        operationCode: row.operationCode,
        notes: `Consumo original ${row.expenseDate}`
      },
      context.member.householdId,
      context.member.id
    ),
    statement_import_id: importRes.data.id
  }));

  const { error } = await supabase.from("expense_expenses").insert(rows);
  if (error) return { ok: false, error: error.message };

  // Feedback loop desde el preview: aprendemos SOLO las correcciones. Si la categoria
  // que dejaste difiere de la que el categorizador habria sugerido (con las reglas
  // actuales), guardamos una regla merchant -> categoria para los proximos imports.
  const learnedRules = await loadCategoryRules(context.member.householdId);
  const seen = new Set<string>();
  const newRules: Array<{
    household_id: string;
    pattern: string;
    match_type: "contains";
    category_id: string;
    priority: number;
    created_by_member_id: string;
  }> = [];
  for (const row of includedRows) {
    if (!row.categoryId || !row.merchantNormalized) continue;
    if (seen.has(row.merchantNormalized)) continue;
    if (categorizeMerchant(row.merchantName, learnedRules).categoryId === row.categoryId) continue;
    seen.add(row.merchantNormalized);
    newRules.push({
      household_id: context.member.householdId,
      pattern: row.merchantNormalized,
      match_type: "contains",
      category_id: row.categoryId,
      priority: 100,
      created_by_member_id: context.member.id
    });
  }
  if (newRules.length) {
    await supabase
      .from("expense_category_rules")
      .upsert(newRules, { onConflict: "household_id,pattern,match_type" });
  }

  revalidateApp();
  return { ok: true, data: { count: rows.length, duplicate: false } };
}

export async function updateExpenseReviewAction(formData: FormData) {
  const context = await getAppContext();
  if (context.mode !== "supabase") redirect("/review");
  const supabase = await createClient();
  if (!supabase) redirect("/review");

  const id = formString(formData, "id");
  const categoryId = formString(formData, "categoryId") || null;
  const reviewStatus = sanitizeReviewStatus(formString(formData, "reviewStatus"));
  const learn = formString(formData, "learn") === "on";
  const merchantNormalized = formString(formData, "merchantNormalized");

  await supabase
    .from("expense_expenses")
    .update({ category_id: categoryId, review_status: reviewStatus, confidence: categoryId ? 1 : null })
    .eq("household_id", context.member.householdId)
    .eq("id", id);

  if (learn && categoryId && merchantNormalized) {
    await supabase.from("expense_category_rules").upsert(
      {
        household_id: context.member.householdId,
        pattern: merchantNormalized,
        match_type: "contains",
        category_id: categoryId,
        priority: 100,
        created_by_member_id: context.member.id
      },
      { onConflict: "household_id,pattern,match_type" }
    );
  }

  revalidateApp();
  redirect("/review?saved=1");
}

// slug estable a partir del nombre (minúsculas, sin acentos, guiones).
function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "cat"
  );
}

// Crea una categoría (padre si parentId vacío) o subcategoría en el hogar del usuario.
export async function createCategoryAction(formData: FormData) {
  const context = await getAppContext();
  if (context.mode !== "supabase") redirect("/review");
  const supabase = await createClient();
  if (!supabase) redirect("/review");

  const name = formString(formData, "name");
  if (!name) redirect("/review?catError=nombre");
  const color = formString(formData, "color") || "#d8e2dc";
  const icon = formString(formData, "icon") || "🏷️";
  const parentId = formString(formData, "parentId") || null;
  // id global-único: slug + sufijo aleatorio (evita choques con globales y entre hogares).
  const id = `${slugify(name)}-${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`;

  const { error } = await supabase.from("expense_categories").insert({
    id,
    household_id: context.member.householdId,
    name,
    color,
    kind: "other",
    parent_id: parentId,
    icon,
    is_active: true,
    sort_order: 0
  });
  if (error) redirect(`/review?catError=${encodeURIComponent(error.message)}`);

  revalidateApp();
  redirect("/review?catSaved=1");
}

// Edita nombre/color/ícono/padre de una categoría del hogar (RLS bloquea las globales).
export async function updateCategoryAction(formData: FormData) {
  const context = await getAppContext();
  if (context.mode !== "supabase") redirect("/review");
  const supabase = await createClient();
  if (!supabase) redirect("/review");

  const id = formString(formData, "id");
  const name = formString(formData, "name");
  if (!id || !name) redirect("/review?catError=nombre");
  const color = formString(formData, "color") || "#d8e2dc";
  const icon = formString(formData, "icon") || "🏷️";
  const parentId = formString(formData, "parentId") || null;

  const { error } = await supabase
    .from("expense_categories")
    .update({ name, color, icon, parent_id: parentId })
    .eq("household_id", context.member.householdId)
    .eq("id", id);
  if (error) redirect(`/review?catError=${encodeURIComponent(error.message)}`);

  revalidateApp();
  redirect("/review?catSaved=1");
}

// Soft-delete: is_active=false. Exige reasignar antes si tiene gastos asociados.
export async function deleteCategoryAction(formData: FormData) {
  const context = await getAppContext();
  if (context.mode !== "supabase") redirect("/review");
  const supabase = await createClient();
  if (!supabase) redirect("/review");

  const id = formString(formData, "id");
  if (!id) redirect("/review");

  const used = await supabase
    .from("expense_expenses")
    .select("id", { count: "exact", head: true })
    .eq("household_id", context.member.householdId)
    .eq("category_id", id);
  if ((used.count ?? 0) > 0) redirect("/review?catError=reasigna-primero");

  const { error } = await supabase
    .from("expense_categories")
    .update({ is_active: false })
    .eq("household_id", context.member.householdId)
    .eq("id", id);
  if (error) redirect(`/review?catError=${encodeURIComponent(error.message)}`);

  revalidateApp();
  redirect("/review?catSaved=1");
}

// Reasigna en bloque todos los gastos de una subcategoría a otra.
export async function reassignExpensesCategoryAction(formData: FormData) {
  const context = await getAppContext();
  if (context.mode !== "supabase") redirect("/review");
  const supabase = await createClient();
  if (!supabase) redirect("/review");

  const fromId = formString(formData, "fromId");
  const toId = formString(formData, "toId");
  if (!fromId || !toId || fromId === toId) redirect("/review?catError=reasignar");

  const { error } = await supabase
    .from("expense_expenses")
    .update({ category_id: toId })
    .eq("household_id", context.member.householdId)
    .eq("category_id", fromId);
  if (error) redirect(`/review?catError=${encodeURIComponent(error.message)}`);

  revalidateApp();
  redirect("/review?catSaved=1");
}
