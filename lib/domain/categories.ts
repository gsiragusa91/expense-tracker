import type { Category } from "./types";

export const CATEGORY_SEEDS: Category[] = [
  { id: "supermercado", name: "Supermercado", color: "#8ecae6", kind: "food" },
  { id: "verduleria-almacen", name: "Verdulería / Almacén", color: "#95d5b2", kind: "food" },
  { id: "delivery", name: "Delivery", color: "#ffd6a5", kind: "food" },
  { id: "restaurantes-cafes", name: "Restaurantes / Cafés", color: "#ffcad4", kind: "food" },
  { id: "transporte", name: "Transporte", color: "#bde0fe", kind: "transport" },
  { id: "nafta-peajes", name: "Nafta / Peajes", color: "#a2d2ff", kind: "transport" },
  { id: "hogar-limpieza", name: "Compras Hogar", color: "#cdb4db", kind: "home" },
  { id: "expensas", name: "Expensas", color: "#b8c0ff", kind: "home" },
  { id: "mascotas", name: "Mascotas", color: "#b7e4c7", kind: "family" },
  { id: "servicios-impuestos", name: "Servicios / Impuestos", color: "#bee1e6", kind: "services" },
  { id: "salud-farmacia", name: "Salud / Farmacia", color: "#caffbf", kind: "health" },
  { id: "consultorio", name: "Consultorio", color: "#a3c4f3", kind: "health" },
  { id: "ropa", name: "Ropa", color: "#ffc8dd", kind: "leisure" },
  { id: "educacion", name: "Educación", color: "#fdffb6", kind: "family" },
  { id: "ocio-suscripciones", name: "Ocio / Suscripciones", color: "#d0f4de", kind: "leisure" },
  { id: "viajes", name: "Viajes", color: "#caf0f8", kind: "leisure" },
  { id: "banco-comisiones", name: "Banco / Comisiones", color: "#e2e2df", kind: "finance" },
  { id: "familia-bebe", name: "Familia / Bebé", color: "#f1c0e8", kind: "family" },
  { id: "regalos", name: "Regalos", color: "#ffc6ff", kind: "leisure" },
  { id: "otros", name: "Otros", color: "#d8e2dc", kind: "other" }
];

export function categoryById(id: string | null | undefined) {
  return CATEGORY_SEEDS.find((category) => category.id === id) ?? CATEGORY_SEEDS.at(-1)!;
}
