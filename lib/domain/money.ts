import type { Currency } from "./types";

export function parseAmount(value: string): number {
  const trimmed = value.trim();
  // Nota de credito / devolucion: un token de monto solo tiene "-" cuando es negativo
  // (adelante -15,16, atras 15,16-, o despues del signo $). No hay otros guiones aca.
  const negative = trimmed.includes("-");
  const normalized = trimmed
    .replace(/-/g, "")
    .replace(/\s/g, "")
    .replace(/\$/g, "")
    .replace(/US/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -parsed : parsed;
}

export function formatMoney(value: number, currency: Currency = "ARS") {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "ARS" ? 0 : 2
  });
}

export function amountToArs(amount: number, currency: Currency, fxRate: number | null) {
  if (currency === "ARS") return amount;
  return Math.round(amount * (fxRate ?? 0) * 100) / 100;
}
