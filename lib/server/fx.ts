export async function fetchMepRate(dateISO: string): Promise<{ rate: number | null; source: string }> {
  const datePath = dateISO.replaceAll("-", "/");
  try {
    const historical = await fetch(
      `https://api.argentinadatos.com/v1/cotizaciones/dolares/bolsa/${datePath}`,
      { next: { revalidate: 60 * 60 * 12 } }
    );
    if (historical.ok) {
      const body = (await historical.json()) as { venta?: unknown };
      if (typeof body.venta === "number") return { rate: body.venta, source: "argentinadatos" };
    }
  } catch {
    // Fallback below.
  }

  try {
    const current = await fetch("https://dolarapi.com/v1/dolares/bolsa", {
      next: { revalidate: 60 * 30 }
    });
    if (current.ok) {
      const body = (await current.json()) as { venta?: unknown };
      if (typeof body.venta === "number") return { rate: body.venta, source: "dolarapi" };
    }
  } catch {
    // Manual rate is required if both public APIs fail.
  }

  return { rate: null, source: "manual_required" };
}

export async function getMepSellRate(dateISO: string) {
  const { rate } = await fetchMepRate(dateISO);
  return rate;
}
