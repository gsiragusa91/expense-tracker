import { parentCategories, subcategoriesOf } from "@/lib/domain/categories";
import type { Category } from "@/lib/domain/types";

// Opciones de un <select> de SUBCATEGORÍAS, agrupadas por su categoría padre con <optgroup>.
// `exclude` saca una subcategoría (ej. la propia, al reasignar).
export function CategoryOptions({ categories, exclude }: { categories: Category[]; exclude?: string }) {
  return (
    <>
      {parentCategories(categories).map((parent) => {
        const subs = subcategoriesOf(parent.id, categories).filter((s) => s.id !== exclude);
        if (!subs.length) return null;
        return (
          <optgroup key={parent.id} label={`${parent.icon} ${parent.name}`}>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}
