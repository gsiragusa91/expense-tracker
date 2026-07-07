import { categoryById, CATEGORY_SEEDS } from "@/lib/domain/categories";
import type { Category } from "@/lib/domain/types";

export function CategoryBadge({
  categoryId,
  categories = CATEGORY_SEEDS
}: {
  categoryId: string | null;
  categories?: Category[];
}) {
  const category = categoryId ? categoryById(categoryId, categories) : null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: category?.color ?? "#eef6ff",
        borderColor: "#d8e7f5",
        color: "#213547"
      }}
    >
      <span aria-hidden>{category?.icon ?? "🏷️"}</span>
      {category?.name ?? "Sin asignar"}
    </span>
  );
}
