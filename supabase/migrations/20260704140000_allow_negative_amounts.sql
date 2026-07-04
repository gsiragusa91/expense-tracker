-- Notas de credito / devoluciones: un consumo puede ser negativo (ej. reintegro de
-- Amazon). Sacamos los checks >= 0 para poder registrarlos; netean el gasto del mes y
-- permiten que la conciliacion cierre. El resto de la logica de negativos vive en los
-- parsers (captura del signo) y en la reconciliacion (consumos brutos vs positivos).
alter table public.expense_expenses drop constraint if exists expense_expenses_amount_ars_check;
alter table public.expense_expenses drop constraint if exists expense_expenses_amount_original_check;
