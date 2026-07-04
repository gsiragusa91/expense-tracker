import { normalizeMerchant, normalizeText } from "./merchants";

export type CategoryRule = {
  id?: string;
  pattern: string;
  categoryId: string;
  matchType: "exact" | "contains";
  priority?: number;
};

export type Categorization = {
  categoryId: string | null;
  confidence: number;
  reason: "rule" | "seed" | "fallback";
};

const SEED_RULES: CategoryRule[] = [
  { pattern: "COTO", categoryId: "supermercado", matchType: "contains" },
  { pattern: "CARREFOUR", categoryId: "supermercado", matchType: "contains" },
  { pattern: "DIA", categoryId: "supermercado", matchType: "exact" },
  { pattern: "PESCE", categoryId: "verduleria-almacen", matchType: "contains" },
  { pattern: "OPEN25", categoryId: "verduleria-almacen", matchType: "contains" },
  { pattern: "FARMACITY", categoryId: "salud-farmacia", matchType: "contains" },
  { pattern: "FARMACIA", categoryId: "salud-farmacia", matchType: "contains" },
  { pattern: "ORTOTEK", categoryId: "consultorio", matchType: "contains" },
  { pattern: "ORTHODENT", categoryId: "consultorio", matchType: "contains" },
  { pattern: "ORTOD", categoryId: "consultorio", matchType: "contains" },
  { pattern: "ORT.", categoryId: "consultorio", matchType: "contains" },
  { pattern: "SOC ARG DE ORT", categoryId: "consultorio", matchType: "contains" },
  { pattern: "RAPPI", categoryId: "delivery", matchType: "contains" },
  { pattern: "PEDIDOSYA", categoryId: "delivery", matchType: "contains" },
  { pattern: "PROPINA RAPPI", categoryId: "delivery", matchType: "contains" },
  { pattern: "RONDA", categoryId: "restaurantes-cafes", matchType: "contains" },
  { pattern: "KOKO BAO", categoryId: "restaurantes-cafes", matchType: "contains" },
  { pattern: "ENCOMBO", categoryId: "restaurantes-cafes", matchType: "contains" },
  { pattern: "GREENEAT", categoryId: "restaurantes-cafes", matchType: "contains" },
  { pattern: "LAPARRILLA", categoryId: "restaurantes-cafes", matchType: "contains" },
  { pattern: "PARRILLA", categoryId: "restaurantes-cafes", matchType: "contains" },
  { pattern: "MONJU", categoryId: "restaurantes-cafes", matchType: "contains" },
  { pattern: "NACHA", categoryId: "restaurantes-cafes", matchType: "contains" },
  { pattern: "CENTRO ASTURIANO", categoryId: "restaurantes-cafes", matchType: "contains" },
  { pattern: "UBER", categoryId: "transporte", matchType: "contains" },
  { pattern: "CABIFY", categoryId: "transporte", matchType: "contains" },
  { pattern: "DIDI", categoryId: "transporte", matchType: "contains" },
  { pattern: "AUTOPISTAS", categoryId: "nafta-peajes", matchType: "contains" },
  { pattern: "EDENOR", categoryId: "servicios-impuestos", matchType: "contains" },
  { pattern: "PERSONAL", categoryId: "servicios-impuestos", matchType: "contains" },
  { pattern: "MOVISTAR AREN", categoryId: "ocio-suscripciones", matchType: "contains" },
  { pattern: "MOVISTAR", categoryId: "servicios-impuestos", matchType: "contains" },
  { pattern: "NETFLIX", categoryId: "ocio-suscripciones", matchType: "contains" },
  { pattern: "YOUTUBE", categoryId: "ocio-suscripciones", matchType: "contains" },
  { pattern: "CRUNCHYROLL", categoryId: "ocio-suscripciones", matchType: "contains" },
  { pattern: "BANCHERO", categoryId: "hogar-limpieza", matchType: "contains" },
  { pattern: "MERCADOLIBRE", categoryId: "hogar-limpieza", matchType: "contains" },
  { pattern: "MELI", categoryId: "hogar-limpieza", matchType: "contains" },
  { pattern: "FRAVEGA", categoryId: "hogar-limpieza", matchType: "contains" },
  { pattern: "MUEBLES", categoryId: "hogar-limpieza", matchType: "contains" },
  { pattern: "INOMAX", categoryId: "hogar-limpieza", matchType: "contains" },
  { pattern: "COLORIN", categoryId: "hogar-limpieza", matchType: "contains" },
  { pattern: "DECONILOS", categoryId: "hogar-limpieza", matchType: "contains" },
  { pattern: "CATYCAN", categoryId: "mascotas", matchType: "contains" },
  { pattern: "ASICS", categoryId: "ropa", matchType: "contains" },
  { pattern: "LENCERIA", categoryId: "ropa", matchType: "contains" },
  { pattern: "SLICEDEPORTES", categoryId: "ropa", matchType: "contains" },
  { pattern: "ROSACREATIONS", categoryId: "ropa", matchType: "contains" },
  { pattern: "GALLERYGANG", categoryId: "ropa", matchType: "contains" },
  { pattern: "PIAF", categoryId: "ropa", matchType: "contains" },
  { pattern: "PUMA", categoryId: "ropa", matchType: "contains" },
  { pattern: "BENSIMON", categoryId: "ropa", matchType: "contains" },
  { pattern: "DEXTER", categoryId: "ropa", matchType: "contains" },
  { pattern: "OSADIA", categoryId: "ropa", matchType: "contains" },
  { pattern: "LAZARO", categoryId: "ropa", matchType: "contains" },
  { pattern: "BAIRESDEPORTE", categoryId: "ropa", matchType: "contains" },
  { pattern: "MIMOCO", categoryId: "familia-bebe", matchType: "contains" },
  { pattern: "MATERNELLE", categoryId: "familia-bebe", matchType: "contains" },
  { pattern: "EXPENSAS", categoryId: "expensas", matchType: "contains" },
  { pattern: "ADMINISTRACION", categoryId: "expensas", matchType: "contains" },
  { pattern: "INTERESES", categoryId: "banco-comisiones", matchType: "contains" },
  { pattern: "IVA", categoryId: "banco-comisiones", matchType: "contains" },
  { pattern: "IIBB", categoryId: "banco-comisiones", matchType: "contains" },
  { pattern: "DB RG", categoryId: "banco-comisiones", matchType: "contains" }
];

function matchesRule(merchant: string, rule: CategoryRule) {
  const pattern = normalizeText(rule.pattern);
  if (rule.matchType === "exact") return merchant === pattern;
  return merchant.includes(pattern);
}

export function categorizeMerchant(
  merchantName: string,
  learnedRules: CategoryRule[] = []
): Categorization {
  const merchant = normalizeMerchant(merchantName);
  const sortedRules = [...learnedRules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  for (const rule of sortedRules) {
    if (matchesRule(merchant, rule)) {
      return { categoryId: rule.categoryId, confidence: 0.98, reason: "rule" };
    }
  }

  for (const rule of SEED_RULES) {
    if (matchesRule(merchant, rule)) {
      return { categoryId: rule.categoryId, confidence: 0.82, reason: "seed" };
    }
  }

  // Sin match: dejamos la categoria vacia ("Sin asignar") para que el usuario la
  // asigne a mano. Antes forzabamos "Otros", lo que ensuciaba los datos.
  return { categoryId: null, confidence: 0, reason: "fallback" };
}
