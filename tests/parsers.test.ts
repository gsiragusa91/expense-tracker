import test from "node:test";
import assert from "node:assert/strict";
import { categorizeMerchant } from "@/lib/domain/categorize";
import { parseGaliciaVisaStatement } from "@/lib/import/galicia";
import { parseMercadoPagoStatement } from "@/lib/import/mercado-pago";

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

test("categorization includes Expensas as first-class seed", () => {
  const result = categorizeMerchant("Administracion consorcio expensas edificio");

  assert.equal(result.categoryId, "expensas");
  assert.ok(result.confidence >= 0.8);
});
