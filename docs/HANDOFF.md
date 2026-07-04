# Handoff - Expense Tracker Compartido

Ultima actualizacion: 2026-07-04.

## Estado actual

- Repo app: `gsiragusa91/expense-tracker`.
- App local: `http://localhost:3040`.
- Deploy Vercel: `https://expense-tracker-siragusa.vercel.app/`.
- Supabase: usa el proyecto de Baby's Project como subproyecto, con tablas `expense_*`.
- Auth: existen dos logins separados, `guido.siragusa@gmail.com` y `dalubeche@gmail.com`, compartiendo el mismo hogar.
- Login: validado por Guido.
- Schema remoto: migracion aplicada en Supabase.
- Seed remoto: hogar, miembros, payment sources y categorias aplicado. Incluye `Expensas`.
- GitHub: cambios base pusheados a `main`.

## Que esta construido

- Shell mobile-first con header superior y nav inferior tipo Baby's Project.
- Nav inferior: `Inicio`, `Cargar`, microfono central, `Importar`, `Revisar`.
- Paleta pastel clara con azules suaves.
- Dashboard mensual, selector historico y vista `/monitor` desktop.
- Carga manual con fecha, monto, moneda, categoria, fuente, perfil y notas.
- Flujo de voz con `MediaRecorder`, transcripcion OpenAI y pre-confirmacion editable.
- Import de PDFs con preview editable antes de persistir.
- Parsers para Mercado Pago Credito y Galicia Visa.
- Modelo Supabase con RLS e idempotencia de import.
- Categorias seed y reglas de categorizacion por merchant/patron.
- Bootstrap local de dependencias para esquivar fallas de `npm install` en la maquina.

## Datos reales parseados

Los PDFs compartidos ya fueron parseados localmente, pero los datos reales no se commitean.

- Archivo local ignorado por Git: `data/local-real-expenses.json`.
- Total gastos parseados: 97.
- Mercado Pago: 38 consumos, resumen `2026-06`, cierre `2026-06-05`, subtotal ARS `1.373.475,59`.
- Galicia Visa: 59 filas, resumen `2026-05`, cierre `2026-05-28`, total resumen ARS `1.574.332,95`, total USD `13,38`.
- Galicia para dashboard con USD convertido a MEP `1200`: ARS `1.596.796,07`.
- Perfiles Galicia: Guido ARS `840.167,27`, Dalu ARS `756.628,80`.

Nota de privacidad: subir estos gastos a Supabase/Vercel implica enviar transacciones financieras reales a un servicio externo. En esta sesion la carga remota quedo bloqueada hasta recibir autorizacion explicita de Guido.

## Como cargar los PDFs reales cuando Guido autorice

Confirmar primero que el usuario acepta subir los datos financieros reales a Supabase. Texto sugerido:

```text
Si, autorizo cargar a Supabase los 97 gastos reales parseados de mis PDFs de Mercado Pago y Galicia.
```

Luego generar el SQL desde el JSON local ignorado:

```bash
EXPENSE_HOUSEHOLD_ID="c47fcf32-d065-4dfc-afcd-b2d8ce9d726f" \
EXPENSE_CREATED_BY_MEMBER_ID="7754825b-6d11-45c9-b417-2a1fc6c5672f" \
npm run seed:real-sql
```

Esto genera `/tmp/expense-real-import.sql`. Aplicarlo desde el repo de Baby's Project, que es el Supabase linkeado:

```bash
cd "/Users/gsiragusa/Pachita Playground/Baby's Project"
supabase db query --linked --file /tmp/expense-real-import.sql
```

Verificar despues:

```bash
supabase db query --linked --file /tmp/expense-verify.sql
```

Donde `/tmp/expense-verify.sql` puede contener:

```sql
select count(*) as expenses from public.expense_expenses;
select provider, statement_month, status from public.expense_statement_imports order by created_at desc;
```

## Variables de entorno

Expense Tracker usa las mismas credenciales de Supabase que Baby's Project.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xqnvzqnyykiyzktkwogl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key del proyecto Baby>
OPENAI_API_KEY=<OpenAI key>
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_EXPENSE_EXTRACTION_MODEL=gpt-4o-mini
```

En Vercel deben estar cargadas para Production. Localmente van en `.env.local`.

## Comandos utiles

```bash
npm run bootstrap:local
npm run dev
npm run check
```

`npm run bootstrap:local` copia `node_modules` desde proyectos vecinos si el registry falla. Cuando npm vuelva a funcionar normalmente, regenerar lockfile con:

```bash
npm install --package-lock-only --ignore-scripts --include=optional
```

## Verificacion hecha

- `npm run check` paso antes del deploy base.
- Parsers validados contra los extractos reales.
- Dataset real generado con los totales esperados.
- Login validado manualmente por Guido.
- Deploy Vercel informado por Guido.

## Pendientes funcionales

- Cargar los 97 gastos reales en Supabase despues de autorizacion explicita.
- Probar E2E productivo: login Guido, dashboard con datos reales, revisar categorias, cambiar alguna categoria y confirmar regla.
- Probar login Dalu y validar que ve el mismo hogar, pero sus cargas quedan con su `created_by_member_id`.
- Probar flujo voz real con `OPENAI_API_KEY` productiva.
- Probar import PDF desde UI contra los PDFs originales si vuelven a estar disponibles. Los paths de pasteboard originales ya no existen; queda el texto extraido y el JSON parseado.
- Agregar UI para editar tasa USD/MEP antes de confirmar import.
- Completar aprendizaje de reglas desde la edicion de categoria en `Revisar`.
- Agregar pantalla de settings para payment sources y logout mas visible.
- Endurecer parser Galicia para todos los formatos de impuestos/intereses antes de usarlo como flujo definitivo mensual.
- Decidir si los impuestos/intereses de tarjeta quedan incluidos como gastos propios o se muestran como ajuste financiero separado.

## Riesgos y notas

- `data/local-real-expenses.json` contiene informacion financiera real y esta ignorado por Git.
- No commitear SQL generado desde datos reales.
- `next-env.d.ts` puede cambiar entre `.next/types` y `.next/dev/types` cuando se corre Next localmente; no incluir ese cambio si aparece solo por dev server.
- El plugin de Vercel se instalo con `npx plugins add vercel/vercel-plugin`, pero puede requerir reiniciar Codex para exponer herramientas nuevas.
