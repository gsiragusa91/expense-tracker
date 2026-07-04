-- Devengado vs percibido: guardamos la fecha de compra original (purchase_date) ademas
-- de expense_date, que para imports pasa a ser la fecha de vencimiento del resumen (cuando
-- realmente pagas = cashflow). Asi el dashboard puede agrupar por cashflow (expense_date)
-- o por devengado (purchase_date). Nullable: los gastos viejos y los manuales usan
-- expense_date como fallback.
alter table public.expense_expenses
  add column if not exists purchase_date date;
