const fmt = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Sanity check: compara la suma de consumos parseados contra el total que declara el
// propio resumen. Si difieren mas que la tolerancia, devuelve un warning: es la senal
// de que se perdio (o duplico) alguna fila al parsear.
export function reconciliationWarnings(input: {
  computedArs: number;
  declaredArs: number | null;
  computedUsd: number;
  declaredUsd: number | null;
}): string[] {
  const warnings: string[] = [];
  const { computedArs, declaredArs, computedUsd, declaredUsd } = input;

  if (declaredArs !== null && Math.abs(declaredArs - computedArs) > 1) {
    const diff = Math.abs(declaredArs - computedArs);
    warnings.push(
      `⚠️ La suma de consumos ($${fmt(computedArs)}) no coincide con el total declarado por el resumen ($${fmt(declaredArs)}). Difieren $${fmt(diff)} — puede faltar o sobrar algún consumo.`
    );
  }

  if (declaredUsd !== null && Math.abs(declaredUsd - computedUsd) > 0.01) {
    warnings.push(
      `⚠️ Los consumos en dólares (US$${fmt(computedUsd)}) no coinciden con el resumen (US$${fmt(declaredUsd)}).`
    );
  }

  return warnings;
}
