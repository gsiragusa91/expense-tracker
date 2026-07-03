const PREFIXES = [
  /^MERPAGO\*/i,
  /^MP\*/i,
  /^PAYU\*AR\*/i,
  /^DLO\*/i,
  /^GOOGLE \*/i,
  /^WWW\./i
];

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9* ._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMerchant(value: string) {
  let normalized = normalizeText(value);
  for (const prefix of PREFIXES) {
    normalized = normalized.replace(prefix, "");
  }
  return normalized
    .replace(/\b\d{4,}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
