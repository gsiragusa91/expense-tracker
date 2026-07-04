# Modelo de datos

Este schema esta pensado para convivir dentro del mismo proyecto Supabase que Baby's
Project. Todas las tablas, enums, funciones e indices propios usan prefijo `expense_*`
para evitar colisiones con el modelo de familia/bebe.

## Tablas principales

- `expense_households`: cuenta compartida del hogar.
- `expense_household_members`: usuarios Supabase asociados al hogar, con `profile_key` `guido` o `dalu`.
- `expense_expenses`: gasto atomico desagregado. Es la fuente principal del dashboard.
- `expense_statement_imports`: metadata del PDF importado, hash, totales, warnings y filas crudas sanitizadas.
- `expense_category_rules`: reglas aprendidas por merchant o patron.
- `expense_voice_parse_logs`: transcripciones y resultado estructurado. No guarda audio.
- `expense_monthly_fx_rates`: tasas MEP editables por fecha.

## Estados de revision

- `pending`: necesita revision humana.
- `auto_categorized`: se categorizo por regla o heuristica y puede revisarse.
- `confirmed`: confirmado por Guido o Dalu.
- `excluded`: se conserva para auditoria, pero no impacta dashboard.

## Idempotencia de imports

La tabla `expense_statement_imports` tiene unicidad por `household_id + provider + file_hash`. Reimportar el mismo archivo no duplica gastos.
