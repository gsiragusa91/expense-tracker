import { categoryById, CATEGORY_SEEDS } from "@/lib/domain/categories";
import type { Category } from "@/lib/domain/types";

// Estilo "emoji cálido": el emoji de la categoría dentro de una burbuja neutra.
// El tamaño de fuente se deriva del `size` para que el emoji quede proporcionado.
export function CategoryIcon({
  categoryId,
  size = 40,
  categories = CATEGORY_SEEDS
}: {
  categoryId: string | null;
  size?: number;
  categories?: Category[];
}) {
  const category = categoryId ? categoryById(categoryId, categories) : null;
  const emoji = category?.icon ?? "💸";

  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-[14px] border border-[var(--border)] bg-[var(--surface-soft)]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.52), lineHeight: 1 }}
      aria-hidden
    >
      {emoji}
    </span>
  );
}
