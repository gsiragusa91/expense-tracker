# Modelo de datos

## Tablas principales

- `households`: cuenta compartida del hogar.
- `household_members`: usuarios Supabase asociados al hogar, con `profile_key` `guido` o `dalu`.
- `expenses`: gasto atomico desagregado. Es la fuente principal del dashboard.
- `statement_imports`: metadata del PDF importado, hash, totales, warnings y filas crudas sanitizadas.
- `category_rules`: reglas aprendidas por merchant o patron.
- `voice_parse_logs`: transcripciones y resultado estructurado. No guarda audio.
- `monthly_fx_rates`: tasas MEP editables por fecha.

## Estados de revision

- `pending`: necesita revision humana.
- `auto_categorized`: se categorizo por regla o heuristica y puede revisarse.
- `confirmed`: confirmado por Guido o Dalu.
- `excluded`: se conserva para auditoria, pero no impacta dashboard.

## Idempotencia de imports

La tabla `statement_imports` tiene unicidad por `household_id + provider + file_hash`. Reimportar el mismo archivo no duplica gastos.
