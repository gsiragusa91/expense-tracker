-- Medio de pago del gasto: TCMP (Mercado Pago Crédito), Galicia (Visa) o
-- Efectivo/Transferencia. Se deriva por default (tarjetas del resumen según el
-- provider; manual/voz = efectivo/transferencia) pero es editable y persiste.
alter table public.expense_expenses
  add column if not exists payment_method text
  check (payment_method in ('tcmp', 'galicia', 'efectivo_transferencia'));

-- Backfill 1: tarjetas importadas → según el provider del resumen.
update public.expense_expenses e
set payment_method = case si.provider
  when 'mercado_pago' then 'tcmp'
  when 'galicia_visa' then 'galicia'
  else 'efectivo_transferencia'
end
from public.expense_statement_imports si
where e.statement_import_id = si.id
  and e.payment_method is null;

-- Backfill 2: resto (manual, voz, o sin import) → efectivo/transferencia.
update public.expense_expenses
set payment_method = 'efectivo_transferencia'
where payment_method is null;
