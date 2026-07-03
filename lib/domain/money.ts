import type { Currency } from "./types";

export function parseAmount(value: string): number {
  const normalized = value
    .trim()
    .replace(/\s/g, "")
    .replace(/\$/g, "")
    .replace(/US/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
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
