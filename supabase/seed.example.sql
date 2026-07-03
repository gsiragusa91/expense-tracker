-- 1. Create the two Supabase Auth users first.
-- 2. Replace these emails with the final Guido/Dalu login emails.
-- 3. Run this seed in the SQL editor after the migration.

with household as (
  insert into public.households (name)
  values ('Guido y Dalu')
  returning id
),
members as (
  insert into public.household_members (household_id, user_id, email, profile_key, display_name)
  select household.id, auth.users.id, auth.users.email, 'guido', 'Guido'
  from household, auth.users
  where auth.users.email = 'guido@example.com'
  union all
  select household.id, auth.users.id, auth.users.email, 'dalu', 'Dalu'
  from household, auth.users
  where auth.users.email = 'dalu@example.com'
  returning household_id
)
insert into public.payment_sources (household_id, name, source_type, provider, owner_profile_key)
select distinct household_id, 'Mercado Pago Credito', 'credit_card', 'mercado_pago', 'guido'
from members
union all
select distinct household_id, 'Galicia Visa', 'credit_card', 'galicia_visa', null
from members
union all
select distinct household_id, 'Efectivo / Transferencia', 'manual', null, null
from members;
