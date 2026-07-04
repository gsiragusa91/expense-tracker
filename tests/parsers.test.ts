import test from "node:test";
import assert from "node:assert/strict";
import { categorizeMerchant } from "@/lib/domain/categorize";
import { parseGaliciaVisaStatement } from "@/lib/import/galicia";
import { parseMercadoPagoStatement } from "@/lib/import/mercado-pago";
import { cleanEnvValue } from "@/lib/supabase/env";

function buildMpFixture() {
  const lines = [
    "Fecha de cierre 30 de mayo",
    "Fecha de vencimiento 10 de junio",
    "01/may RAPPI 1 de 3 100001 $ 10.000,00",
    "02/may EXPENSAS EDIFICIO 100002 $ 10.000,00"
  ];
  for (let index = 3; index <= 37; index += 1) {
    const day = ((index - 1) % 28) + 1;
    lines.push(`${String(day).padStart(2, "0")}/may COTO CICSA 10${String(index).padStart(4, "0")} $ 10.000,00`);
  }
  lines.push("30/may FARMACITY 109999 $ 1.003.475,59");
  lines.push("Total a pagar $ 1.373.475,59 US$ 0,00");
  return lines.join("\n");
}

test("Mercado Pago parser detects 38 consumptions and expected ARS subtotal", () => {
  const statement = parseMercadoPagoStatement(buildMpFixture(), { statementYear: 2026, statementMonth: 5 });

  assert.equal(statement.provider, "mercado_pago");
  assert.equal(statement.rows.length, 38);
  assert.equal(statement.totals.totalArs, 1373475.59);
  assert.equal(Number(statement.totals.computedConsumptionArs.toFixed(2)), 1373475.59);
  assert.equal(statement.rows[0].installments, "1/3");
  assert.equal(statement.rows[0].categoryId, "delivery");
  assert.equal(statement.rows[1].categoryId, "expensas");
});

test("Galicia Visa parser keeps Guido and Dalu blocks and USD totals", () => {
  const fixture = [
    "DETALLE DEL CONSUMO",
    "29-04-26 COTO CICSA 123456 100.000,00",
    "30-04-26 NETFLIX USD 13,38 999999 13,38",
    "TARJETA 5683 Total Consumos de GUIDO MART SIRAGUSA 824.111,27 13,38",
    "01-05-26 RAPPI 234567 200.000,00",
    "02-05-26 INTERESES FINANCIACION 345678 10.000,00",
    "TARJETA 0098 Total Consumos de DALILA G BRZEZINSKI 756.628,80 0,00",
    "TOTAL A PAGAR 1.574.332,95 13,38"
  ].join("\n");

  const statement = parseGaliciaVisaStatement(fixture, { fxRate: 1200 });

  assert.equal(statement.provider, "galicia_visa");
  assert.equal(statement.totals.totalArs, 1574332.95);
  assert.equal(statement.totals.totalUsd, 13.38);
  assert.equal(statement.rows[0].cardholderProfileKey, "guido");
  assert.equal(statement.rows[1].currency, "USD");
  assert.equal(statement.rows[1].amountArs, 16056);
  assert.equal(statement.rows[2].cardholderProfileKey, "dalu");
  assert.equal(statement.rows[3].categoryId, "banco-comisiones");
  assert.equal(statement.rows[3].cardholderProfileKey, null);
});

test("sanity check flags a statement whose consumos don't add up", () => {
  const balanced = [
    "Fecha de cierre 30 de mayo",
    "01/may RAPPI 100001 $ 10.000,00",
    "02/may COTO 100002 $ 20.000,00",
    "Consumos $ 30.000,00 US$ 0,00",
    "Total a pagar $ 30.000,00 US$ 0,00"
  ].join("\n");
  const ok = parseMercadoPagoStatement(balanced, { statementYear: 2026, statementMonth: 5 });
  assert.equal(ok.totals.declaredConsumptionArs, 30000);
  assert.ok(!ok.warnings.some((warning) => warning.includes("no coincide")));

  const missing = [
    "Fecha de cierre 30 de mayo",
    "01/may RAPPI 100001 $ 10.000,00",
    "Consumos $ 30.000,00 US$ 0,00",
    "Total a pagar $ 30.000,00 US$ 0,00"
  ].join("\n");
  const bad = parseMercadoPagoStatement(missing, { statementYear: 2026, statementMonth: 5 });
  assert.ok(bad.warnings.some((warning) => warning.includes("no coincide")));
});

test("captures credit notes as negative and reconciles on gross consumos", () => {
  const fixture = [
    "DETALLE DEL CONSUMO",
    "01-03-26 K COMERCIO UNO 111111 100.000,00",
    "02-03-26 K DEVOLUCION SA 222222 -30.000,00",
    "03-03-26 K NETFLIX USD 10,72 333333 10,72",
    "04-03-26 K AMAZON PRIME USD -15,16 444444 -15,16",
    "TARJETA 5683 Total Consumos de GUIDO MART SIRAGUSA 100.000,00 10,72",
    "TOTAL A PAGAR 100.000,00 10,72"
  ].join("\n");
  const st = parseGaliciaVisaStatement(fixture, { fxRate: 1000 });

  const dev = st.rows.find((row) => row.merchantName.includes("DEVOLUCION"));
  assert.equal(dev?.amountArs, -30000);
  const amazon = st.rows.find((row) => row.merchantName.includes("AMAZON"));
  assert.equal(amazon?.currency, "USD");
  assert.equal(amazon?.amountOriginal, -15.16);
  // consumos brutos: ARS 100.000 y USD 10,72 -> cuadra, sin warning de conciliacion
  assert.ok(!st.warnings.some((w) => w.toLowerCase().includes("no coincide")));
});

test("more specific learned rule wins over a broader one", () => {
  const rules = [
    { pattern: "PASEO", categoryId: "transporte", matchType: "contains" as const, priority: 100 },
    { pattern: "PASEO RONDA", categoryId: "restaurantes-cafes", matchType: "contains" as const, priority: 100 }
  ];
  assert.equal(categorizeMerchant("PASEO RONDA", rules).categoryId, "restaurantes-cafes");
  assert.equal(categorizeMerchant("PASEO DEL BAJO", rules).categoryId, "transporte");
});

test("categorization includes Expensas as first-class seed", () => {
  const result = categorizeMerchant("Administracion consorcio expensas edificio");

  assert.equal(result.categoryId, "expensas");
  assert.ok(result.confidence >= 0.8);
});

test("Supabase env cleanup tolerates common Vercel paste mistakes", () => {
  assert.equal(cleanEnvValue(" 'abc.def.ghi' "), "abc.def.ghi");
  assert.equal(cleanEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY=abc.def.ghi"), "abc.def.ghi");
  assert.equal(cleanEnvValue("  https://demo.supabase.co  "), "https://demo.supabase.co");
});
