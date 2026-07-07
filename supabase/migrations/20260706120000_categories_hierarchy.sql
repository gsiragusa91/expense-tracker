-- Jerarquía de categorías (Categoría › Subcategoría) + reconciliación de naming + subcategorías
-- faltantes (consultorio, tenis). Aplica sobre expense_categories YA EXISTENTE
-- (ver 20260703170000_initial_expense_tracker.sql). Correr en el SQL Editor de Supabase
-- (corre como owner → bypassa RLS, por eso puede tocar las filas globales household_id = null).

alter table public.expense_categories
  add column if not exists parent_id  text references public.expense_categories(id) on delete set null,
  add column if not exists icon       text not null default '📦',
  add column if not exists is_active  boolean not null default true,
  add column if not exists sort_order int not null default 0;
-- 'kind' ya existe (not null); se conserva por compatibilidad.

-- 1) Categorías PADRE (globales). Sufijo -cat donde el id chocaría con una subcategoría existente.
insert into public.expense_categories (id, household_id, name, color, kind, parent_id, icon, is_active, sort_order) values
  ('super',          null, 'Super',              '#8ecae6', 'food',      null, '🛒', true, 10),
  ('gastro',         null, 'Gastronomía',        '#ffcad4', 'food',      null, '🍽️', true, 20),
  ('transporte-cat', null, 'Transporte',         '#bde0fe', 'transport', null, '🚌', true, 30),
  ('hogar',          null, 'Hogar',              '#cdb4db', 'home',      null, '🏠', true, 40),
  ('servicios',      null, 'Servicios',          '#bee1e6', 'services',  null, '💡', true, 45),
  ('salud',          null, 'Salud',              '#caffbf', 'health',    null, '💊', true, 50),
  ('familia',        null, 'Familia & Mascotas', '#f1c0e8', 'family',    null, '🐾', true, 60),
  ('educacion-cat',  null, 'Educación',          '#fdffb6', 'family',    null, '🎓', true, 70),
  ('ocio',           null, 'Ocio & Personal',    '#d0f4de', 'leisure',   null, '🎬', true, 80),
  ('finanzas',       null, 'Finanzas',           '#e2e2df', 'finance',   null, '🏦', true, 90),
  ('otros-cat',      null, 'Otros',              '#d8e2dc', 'other',     null, '📦', true, 100)
on conflict (id) do nothing;

-- 2) Subcategorías faltantes en la DB (consultorio ya lo usa el código; tenis es nueva).
insert into public.expense_categories (id, household_id, name, color, kind, parent_id, icon, is_active, sort_order) values
  ('consultorio', null, 'Consultorio', '#a3c4f3', 'health',  'salud', '🩺', true, 0),
  ('tenis',       null, 'Tenis',       '#d8f3dc', 'leisure', 'ocio',  '🎾', true, 0)
on conflict (id) do nothing;

-- 3) Reconciliar subcategorías existentes: parent_id + icon + nombre (acentos / naming del código).
update public.expense_categories as c set
  parent_id = v.parent_id,
  icon      = v.icon,
  name      = v.name
from (values
  ('supermercado',        'super',          '🛒', 'Supermercado'),
  ('verduleria-almacen',  'super',          '🥬', 'Verdulería / Almacén'),
  ('delivery',            'gastro',         '🛵', 'Delivery'),
  ('restaurantes-cafes',  'gastro',         '🍽️', 'Restaurantes / Cafés'),
  ('transporte',          'transporte-cat', '🚌', 'Transporte'),
  ('nafta-peajes',        'transporte-cat', '⛽', 'Nafta / Peajes'),
  ('hogar-limpieza',      'hogar',          '🛋️', 'Compras Hogar'),
  ('expensas',            'servicios',      '🏢', 'Expensas'),
  ('servicios-impuestos', 'servicios',      '🧾', 'Servicios / Impuestos'),
  ('salud-farmacia',      'salud',          '💊', 'Salud / Farmacia'),
  ('familia-bebe',        'familia',        '👶', 'Familia / Bebé'),
  ('mascotas',            'familia',        '🐾', 'Mascotas'),
  ('educacion',           'educacion-cat',  '🎓', 'Educación'),
  ('ropa',                'ocio',           '👕', 'Ropa'),
  ('ocio-suscripciones',  'ocio',           '🎬', 'Ocio / Suscripciones'),
  ('viajes',              'ocio',           '✈️', 'Viajes'),
  ('regalos',             'ocio',           '🎁', 'Regalos'),
  ('banco-comisiones',    'finanzas',       '🏦', 'Banco / Comisiones'),
  ('otros',               'otros-cat',      '📦', 'Otros')
) as v(id, parent_id, icon, name)
where c.id = v.id;
