# Expense Tracker Compartido

App mobile-first para cargar, importar y analizar gastos mensuales compartidos por Guido y Dalu.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase Auth/Postgres/RLS
- OpenAI para transcripcion y extraccion de gastos por voz

## Flujos incluidos

- Login separado para Guido y Dalu, compartiendo el mismo `household_id`.
- Carga manual con ARS/USD, perfil, categoria y fuente.
- Carga por voz con `MediaRecorder`, transcripcion y pre-confirmacion editable.
- Import de PDF Mercado Pago Credito y Galicia Visa con preview editable antes de persistir.
- Dashboard mensual, revision de pendientes y monitor desktop.
- Categorizacion inicial por heuristicas y reglas aprendidas por merchant.

## Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_EXPENSE_EXTRACTION_MODEL=gpt-4o-mini
```

Sin Supabase la app corre en modo demo. Sin OpenAI, el flujo de voz devuelve un ejemplo editable para probar la UI.

## Supabase

1. Crear proyecto Supabase.
2. Crear usuarios Auth para Guido y Dalu.
3. Ejecutar `supabase/migrations/20260703170000_initial_expense_tracker.sql`.
4. Editar emails y ejecutar `supabase/seed.example.sql`.

## Desarrollo

```bash
npm install
npm run dev
npm run check
```
