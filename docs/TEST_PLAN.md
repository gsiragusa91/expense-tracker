# Test plan

- Parsers:
  - Mercado Pago: detectar cierre/vencimiento, cuotas, operacion, ARS/USD y subtotal.
  - Galicia Visa: detectar bloques Guido/Dalu, consumos, USD, impuestos/intereses y total.
- Manual:
  - ARS con categoria explicita.
  - USD con tasa editable.
  - Default de perfil segun login.
- Voz:
  - Un gasto.
  - Varios gastos.
  - Pre-confirmacion editable antes de persistir.
- Import:
  - Preview editable.
  - Exclusion de filas.
  - Idempotencia por hash.
- UI:
  - Nav inferior con 4 tabs + microfono central.
  - Bottom sheets de voz y confirmacion.
  - Monitor desktop en layout ancho.
- Reglas:
  - Recategorizar un merchant y aprender regla.
  - Aplicar regla en imports siguientes.

## E2E productivo pendiente

- Login Guido en `https://expense-tracker-siragusa.vercel.app/`.
- Cargar los PDFs reales parseados a Supabase, previa autorizacion explicita.
- Verificar dashboard con 97 gastos: 38 de Mercado Pago y 59 de Galicia.
- Editar categorias de algunos pendientes y confirmar que quedan persistidas.
- Login Dalu y verificar mismo hogar con autoria separada.
- Grabar un gasto por voz, revisar pre-confirmacion, editar una fila y confirmar.
