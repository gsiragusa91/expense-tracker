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

La app esta preparada para vivir como subproyecto dentro del Supabase de Baby's Project.
Por eso toda la base usa prefijo `expense_*`: comparte Auth, Postgres y env vars, pero no
mezcla tablas con el dominio de Baby.

1. Usar el proyecto Supabase ya linkeado en Baby's Project.
2. Crear usuarios Auth para `guido.siragusa@gmail.com` y `dalubeche@gmail.com`.
3. Ejecutar `supabase/migrations/20260703170000_initial_expense_tracker.sql`.
4. Ejecutar `supabase/seed.example.sql`.

## Desarrollo

```bash
npm install
npm run dev
npm run check
```

Si `npm install` falla por DNS/VPN/registry en esta maquina, usar el fallback local que replica
lo que hicimos con Baby's Project y PachitApp:

```bash
npm run bootstrap:local
npm run dev
```

Ese fallback copia `node_modules` desde proyectos vecinos del playground. Sirve para desarrollo
local, pero no reemplaza el lockfile definitivo. Cuando npm vuelva a resolver bien:

```bash
npm install --package-lock-only --ignore-scripts --include=optional
npm run check
```

`pdfjs-dist` es opcional para que la app pueda correr sin esa dependencia durante el fallback;
el import real de PDFs necesita instalarla.
