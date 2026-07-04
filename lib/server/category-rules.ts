import type { CategoryRule } from "@/lib/domain/categorize";
import { createClient } from "@/lib/supabase/server";

// Carga las reglas de categorizacion aprendidas del hogar (las que se guardan cuando
// el usuario corrige una categoria con "aprender"). Se pasan a categorizeMerchant para
// que las correcciones pasadas se apliquen a los imports nuevos: eso cierra el feedback
// loop. Solo devolvemos las que categorizeMerchant sabe evaluar (contains/exact).
export async function loadCategoryRules(householdId: string): Promise<CategoryRule[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("expense_category_rules")
    .select("id, pattern, match_type, category_id, priority")
    .eq("household_id", householdId);

  if (error || !data) return [];

  return data
    .filter((row) => row.match_type === "contains" || row.match_type === "exact")
    .map((row) => ({
      id: String(row.id),
      pattern: String(row.pattern),
      categoryId: String(row.category_id),
      matchType: row.match_type === "exact" ? ("exact" as const) : ("contains" as const),
      priority: typeof row.priority === "number" ? row.priority : 100
    }));
}
