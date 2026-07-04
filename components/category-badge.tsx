import { categoryById } from "@/lib/domain/categories";

export function CategoryBadge({ categoryId }: { categoryId: string | null }) {
  const category = categoryId ? categoryById(categoryId) : null;
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: category?.color ?? "#eef6ff",
        borderColor: "#d8e7f5",
        color: "#213547"
      }}
    >
      {category?.name ?? "Sin asignar"}
    </span>
  );
}
