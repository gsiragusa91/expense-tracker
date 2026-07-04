create extension if not exists pgcrypto;

create type public.expense_currency as enum ('ARS', 'USD');
create type public.expense_source_type as enum ('manual', 'voice', 'card_pdf');
create type public.expense_review_status as enum ('pending', 'auto_categorized', 'confirmed', 'excluded');
create type public.expense_statement_provider as enum ('mercado_pago', 'galicia_visa');

create table public.expense_households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.expense_household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.expense_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  profile_key text not null check (profile_key in ('guido', 'dalu')),
  display_name text not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (household_id, profile_key),
  unique (user_id)
);

create or replace function public.is_expense_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.expense_household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
  );
$$;

create table public.expense_categories (
  id text primary key,
  household_id uuid references public.expense_households(id) on delete cascade,
  name text not null,
  color text not null,
  kind text not null,
  created_at timestamptz not null default now()
);

create table public.expense_payment_sources (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.expense_households(id) on delete cascade,
  name text not null,
  source_type text not null,
  provider public.expense_statement_provider,
  owner_profile_key text check (owner_profile_key in ('guido', 'dalu')),
  created_at timestamptz not null default now()
);

create table public.expense_statement_imports (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.expense_households(id) on delete cascade,
  provider public.expense_statement_provider not null,
  statement_month text,
  closing_date date,
  due_date date,
  file_hash text not null,
  totals jsonb not null default '{}'::jsonb,
  warnings text[] not null default '{}',
  raw_rows jsonb not null default '[]'::jsonb,
  status text not null default 'previewed',
  created_by_member_id uuid references public.expense_household_members(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (household_id, provider, file_hash)
);

create table public.expense_expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.expense_households(id) on delete cascade,
  expense_date date not null,
  description text not null,
  merchant_name text not null,
  merchant_normalized text not null,
  amount_original numeric(14, 2) not null check (amount_original >= 0),
  currency public.expense_currency not null default 'ARS',
  fx_rate numeric(14, 4),
  amount_ars numeric(14, 2) not null check (amount_ars >= 0),
  category_id text,
  source_type public.expense_source_type not null,
  owner_profile_id text check (owner_profile_id in ('guido', 'dalu')),
  cardholder_profile_id text check (cardholder_profile_id in ('guido', 'dalu')),
  created_by_member_id uuid not null references public.expense_household_members(id) on delete restrict,
  statement_import_id uuid references public.expense_statement_imports(id) on delete set null,
  confidence numeric(4, 3),
  review_status public.expense_review_status not null default 'pending',
  installments text,
  operation_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expense_expenses_household_month_idx on public.expense_expenses(household_id, expense_date desc);
create index expense_expenses_merchant_idx on public.expense_expenses(household_id, merchant_normalized);
create unique index expense_expenses_import_row_idx
  on public.expense_expenses(statement_import_id, operation_code, expense_date, amount_original)
  where statement_import_id is not null and operation_code is not null;

create table public.expense_category_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.expense_households(id) on delete cascade,
  pattern text not null,
  match_type text not null default 'contains' check (match_type in ('contains', 'exact', 'regex')),
  category_id text not null,
  priority integer not null default 100,
  created_by_member_id uuid references public.expense_household_members(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (household_id, pattern, match_type)
);

create table public.expense_voice_parse_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.expense_households(id) on delete cascade,
  created_by_member_id uuid not null references public.expense_household_members(id) on delete restrict,
  transcript text not null,
  result jsonb not null default '{}'::jsonb,
  warnings text[] not null default '{}',
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.expense_monthly_fx_rates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.expense_households(id) on delete cascade,
  rate_date date not null,
  source text not null default 'mep_sell',
  rate numeric(14, 4) not null,
  edited_by_member_id uuid references public.expense_household_members(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (household_id, rate_date, source)
);

insert into public.expense_categories (id, household_id, name, color, kind) values
  ('supermercado', null, 'Supermercado', '#8ecae6', 'food'),
  ('verduleria-almacen', null, 'Verduleria / Almacen', '#95d5b2', 'food'),
  ('delivery', null, 'Delivery', '#ffd6a5', 'food'),
  ('restaurantes-cafes', null, 'Restaurantes / Cafes', '#ffcad4', 'food'),
  ('transporte', null, 'Transporte', '#bde0fe', 'transport'),
  ('nafta-peajes', null, 'Nafta / Peajes', '#a2d2ff', 'transport'),
  ('hogar-limpieza', null, 'Hogar / Limpieza', '#cdb4db', 'home'),
  ('expensas', null, 'Expensas', '#b8c0ff', 'home'),
  ('mascotas', null, 'Mascotas', '#b7e4c7', 'family'),
  ('servicios-impuestos', null, 'Servicios / Impuestos', '#bee1e6', 'services'),
  ('salud-farmacia', null, 'Salud / Farmacia', '#caffbf', 'health'),
  ('ropa', null, 'Ropa', '#ffc8dd', 'leisure'),
  ('educacion', null, 'Educacion', '#fdffb6', 'family'),
  ('ocio-suscripciones', null, 'Ocio / Suscripciones', '#d0f4de', 'leisure'),
  ('viajes', null, 'Viajes', '#caf0f8', 'leisure'),
  ('banco-comisiones', null, 'Banco / Comisiones', '#e2e2df', 'finance'),
  ('familia-bebe', null, 'Familia / Bebe', '#f1c0e8', 'family'),
  ('regalos', null, 'Regalos', '#ffc6ff', 'leisure'),
  ('otros', null, 'Otros', '#d8e2dc', 'other')
on conflict do nothing;

alter table public.expense_households enable row level security;
alter table public.expense_household_members enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expense_payment_sources enable row level security;
alter table public.expense_statement_imports enable row level security;
alter table public.expense_expenses enable row level security;
alter table public.expense_category_rules enable row level security;
alter table public.expense_voice_parse_logs enable row level security;
alter table public.expense_monthly_fx_rates enable row level security;

create policy households_select on public.expense_households
  for select using (public.is_expense_household_member(id));

create policy household_members_select on public.expense_household_members
  for select using (public.is_expense_household_member(household_id));

create policy categories_select on public.expense_categories
  for select using (household_id is null or public.is_expense_household_member(household_id));

create policy categories_manage on public.expense_categories
  for all using (household_id is not null and public.is_expense_household_member(household_id))
  with check (household_id is not null and public.is_expense_household_member(household_id));

create policy payment_sources_manage on public.expense_payment_sources
  for all using (public.is_expense_household_member(household_id))
  with check (public.is_expense_household_member(household_id));

create policy statement_imports_manage on public.expense_statement_imports
  for all using (public.is_expense_household_member(household_id))
  with check (public.is_expense_household_member(household_id));

create policy expenses_manage on public.expense_expenses
  for all using (public.is_expense_household_member(household_id))
  with check (public.is_expense_household_member(household_id));

create policy category_rules_manage on public.expense_category_rules
  for all using (public.is_expense_household_member(household_id))
  with check (public.is_expense_household_member(household_id));

create policy voice_parse_logs_manage on public.expense_voice_parse_logs
  for all using (public.is_expense_household_member(household_id))
  with check (public.is_expense_household_member(household_id));

create policy monthly_fx_rates_manage on public.expense_monthly_fx_rates
  for all using (public.is_expense_household_member(household_id))
  with check (public.is_expense_household_member(household_id));
