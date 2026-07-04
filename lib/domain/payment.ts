import type { PaymentMethod, StatementProvider } from "./types";

// Orden fijo para mostrar el desglose en el dashboard y los selects.
export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "tcmp", label: "TCMP" },
  { value: "galicia", label: "Galicia" },
  { value: "efectivo_transferencia", label: "Efectivo / Transferencia" }
];

export function paymentMethodLabel(method: PaymentMethod | null | undefined) {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? "Efectivo / Transferencia";
}

// Default derivado: las tarjetas importadas heredan el medio de pago del resumen.
export function providerToPaymentMethod(provider: StatementProvider | null | undefined): PaymentMethod {
  if (provider === "mercado_pago") return "tcmp";
  if (provider === "galicia_visa") return "galicia";
  return "efectivo_transferencia";
}

export function sanitizePaymentMethod(
  value: string | null | undefined,
  fallback: PaymentMethod = "efectivo_transferencia"
): PaymentMethod {
  return value === "tcmp" || value === "galicia" || value === "efectivo_transferencia" ? value : fallback;
}
