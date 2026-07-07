import type { Category } from "./types";

// Fuente de verdad para el MODO DEMO y como fallback/seed inicial. En modo supabase las
// categorías se leen desde la tabla `expense_categories` (ver getAppContext). Dos niveles:
// - parentId === null ⇒ Categoría (padre)
// - parentId !== null ⇒ Subcategoría (lo que guarda cada gasto en categoryId)
export const CATEGORY_SEEDS: Category[] = [
  // ── Categorías padre ────────────────────────────────────────────────
  { id: "super", name: "Super", color: "#8ecae6", icon: "🛒", parentId: null, isActive: true, kind: "food" },
  { id: "gastro", name: "Gastronomía", color: "#ffcad4", icon: "🍽️", parentId: null, isActive: true, kind: "food" },
  { id: "transporte-cat", name: "Transporte", color: "#bde0fe", icon: "🚌", parentId: null, isActive: true, kind: "transport" },
  { id: "hogar", name: "Hogar", color: "#cdb4db", icon: "🏠", parentId: null, isActive: true, kind: "home" },
  { id: "servicios", name: "Servicios", color: "#bee1e6", icon: "💡", parentId: null, isActive: true, kind: "services" },
  { id: "salud", name: "Salud", color: "#caffbf", icon: "💊", parentId: null, isActive: true, kind: "health" },
  { id: "familia", name: "Familia & Mascotas", color: "#f1c0e8", icon: "🐾", parentId: null, isActive: true, kind: "family" },
  { id: "educacion-cat", name: "Educación", color: "#fdffb6", icon: "🎓", parentId: null, isActive: true, kind: "family" },
  { id: "ocio", name: "Ocio & Personal", color: "#d0f4de", icon: "🎬", parentId: null, isActive: true, kind: "leisure" },
  { id: "finanzas", name: "Finanzas", color: "#e2e2df", icon: "🏦", parentId: null, isActive: true, kind: "finance" },
  { id: "otros-cat", name: "Otros", color: "#d8e2dc", icon: "📦", parentId: null, isActive: true, kind: "other" },

  // ── Subcategorías (id existentes; NO cambiar: los gastos ya los referencian) ──
  { id: "supermercado", name: "Supermercado", color: "#8ecae6", icon: "🛒", parentId: "super", isActive: true, kind: "food" },
  { id: "verduleria-almacen", name: "Verdulería / Almacén", color: "#95d5b2", icon: "🥬", parentId: "super", isActive: true, kind: "food" },
  { id: "delivery", name: "Delivery", color: "#ffd6a5", icon: "🛵", parentId: "gastro", isActive: true, kind: "food" },
  { id: "restaurantes-cafes", name: "Restaurantes / Cafés", color: "#ffcad4", icon: "🍽️", parentId: "gastro", isActive: true, kind: "food" },
  { id: "transporte", name: "Transporte", color: "#bde0fe", icon: "🚌", parentId: "transporte-cat", isActive: true, kind: "transport" },
  { id: "nafta-peajes", name: "Nafta / Peajes", color: "#a2d2ff", icon: "⛽", parentId: "transporte-cat", isActive: true, kind: "transport" },
  { id: "hogar-limpieza", name: "Compras Hogar", color: "#cdb4db", icon: "🛋️", parentId: "hogar", isActive: true, kind: "home" },
  { id: "expensas", name: "Expensas", color: "#b8c0ff", icon: "🏢", parentId: "servicios", isActive: true, kind: "home" },
  { id: "servicios-impuestos", name: "Servicios / Impuestos", color: "#bee1e6", icon: "🧾", parentId: "servicios", isActive: true, kind: "services" },
  { id: "salud-farmacia", name: "Salud / Farmacia", color: "#caffbf", icon: "💊", parentId: "salud", isActive: true, kind: "health" },
  { id: "consultorio", name: "Consultorio", color: "#a3c4f3", icon: "🩺", parentId: "salud", isActive: true, kind: "health" },
  { id: "familia-bebe", name: "Familia / Bebé", color: "#f1c0e8", icon: "👶", parentId: "familia", isActive: true, kind: "family" },
  { id: "mascotas", name: "Mascotas", color: "#b7e4c7", icon: "🐾", parentId: "familia", isActive: true, kind: "family" },
  { id: "educacion", name: "Educación", color: "#fdffb6", icon: "🎓", parentId: "educacion-cat", isActive: true, kind: "family" },
  { id: "ropa", name: "Ropa", color: "#ffc8dd", icon: "👕", parentId: "ocio", isActive: true, kind: "leisure" },
  { id: "ocio-suscripciones", name: "Ocio / Suscripciones", color: "#d0f4de", icon: "🎬", parentId: "ocio", isActive: true, kind: "leisure" },
  { id: "viajes", name: "Viajes", color: "#caf0f8", icon: "✈️", parentId: "ocio", isActive: true, kind: "leisure" },
  { id: "regalos", name: "Regalos", color: "#ffc6ff", icon: "🎁", parentId: "ocio", isActive: true, kind: "leisure" },
  { id: "tenis", name: "Tenis", color: "#d8f3dc", icon: "🎾", parentId: "ocio", isActive: true, kind: "leisure" },
  { id: "banco-comisiones", name: "Banco / Comisiones", color: "#e2e2df", icon: "🏦", parentId: "finanzas", isActive: true, kind: "finance" },
  { id: "otros", name: "Otros", color: "#d8e2dc", icon: "📦", parentId: "otros-cat", isActive: true, kind: "other" }
];

// Devuelve la categoría por id sobre la lista dada (por defecto el seed). Si no existe,
// cae a "Otros" (subcategoría) del seed para no romper el render.
export function categoryById(id: string | null | undefined, categories: Category[] = CATEGORY_SEEDS) {
  return (
    categories.find((category) => category.id === id) ??
    categories.find((category) => category.id === "otros") ??
    CATEGORY_SEEDS.at(-1)!
  );
}

// Categoría PADRE de una subcategoría. Si le pasás un id que ya es padre, se devuelve a sí
// mismo (idempotente para agrupar). Si no se resuelve, cae a "Otros" padre.
export function parentOf(categoryId: string | null | undefined, categories: Category[] = CATEGORY_SEEDS): Category {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return categories.find((c) => c.id === "otros-cat") ?? CATEGORY_SEEDS[9];
  if (category.parentId === null) return category;
  return (
    categories.find((c) => c.id === category.parentId) ??
    categories.find((c) => c.id === "otros-cat") ??
    CATEGORY_SEEDS[9]
  );
}

// Solo las categorías padre activas (para selects y agrupaciones).
export function parentCategories(categories: Category[] = CATEGORY_SEEDS): Category[] {
  return categories.filter((c) => c.parentId === null && c.isActive);
}

// Subcategorías activas de un padre dado.
export function subcategoriesOf(parentId: string, categories: Category[] = CATEGORY_SEEDS): Category[] {
  return categories.filter((c) => c.parentId === parentId && c.isActive);
}
