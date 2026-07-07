# Brief de mejoras — Expense Tracker (dashboard + categorías)

> Documento de instrucciones para ejecutar con Claude Code.
> Autor del pedido: Guido. Redactado desde una revisión del código actual.

## Contexto del stack (lo que ya existe)

- **Framework:** Next.js (App Router) + React + Tailwind. TypeScript.
- **Backend:** Supabase (Postgres). Hay un modo `demo` (datos locales) y un modo `supabase`
  (usuario autenticado). Ver `lib/server/context.ts`.
- **Categorías:** hoy están **hardcodeadas** en `lib/domain/categories.ts` como el array
  `CATEGORY_SEEDS`. Cada categoría tiene `{ id, name, color, icon, kind }`. El campo `kind`
  (`food | transport | home | health | services | family | leisure | finance | other`) ya es,
  de hecho, un **proto-agrupador** — lo vamos a formalizar como "Categoría" (nivel padre).
- **Dashboard:** `components/dashboard.tsx` arma la vista; el resumen se calcula en
  `lib/server/demo-data.ts` (`buildDashboardSummary`) y se sirve desde `getDashboardData`
  en `lib/server/context.ts`. Los gráficos (evolución + torta + desglose) están en
  `components/spend-charts.tsx` (componente `"use client"`).
- **Revisar:** `app/review/page.tsx` + `components/review-list.tsx`. Las ediciones de gastos
  pasan por la server action `updateExpenseReviewAction` en `app/actions.ts`.
- **Tipos:** `lib/domain/types.ts` (`Expense`, `Category`, `DashboardSummary`, `DashboardView`).
- **Gasto (dato clave):** cada `Expense` guarda `categoryId` = **subcategoría** (ej.
  `supermercado`). Un gasto NO guarda la categoría-madre; ésta se **deriva** desde la subcategoría.

### Decisiones ya tomadas (no re-preguntar)

1. **Punto 2 (Categoría › Subcategoría):** modelar la jerarquía con una **columna real en DB**
   (`parent_id` en la tabla de categorías) **+ derivación al leer** (el gasto sigue guardando la
   subcategoría; el padre se calcula al vuelo). Los gráficos y detalles muestran la **CATEGORÍA (padre)**.
2. **Punto 4 (crear/editar categorías):** **CRUD completo en Supabase**. Las categorías dejan de
   estar hardcodeadas y pasan a una tabla. El usuario puede crear/editar/borrar categorías y
   subcategorías desde "Revisar", y reasignar gastos ya cargados. "Tenis" es el primer caso real.
3. **Orden de ejecución:** los puntos comparten cimientos, así que hay que hacerlos en este orden:
   **A (fundacional: categorías a DB + jerarquía) → 4 (CRUD UI) → 2 (mostrar padre) → 1 + 3 (gráficos).**

---

## FASE A — Fundacional: usar la tabla de categorías + jerarquía (habilita #2 y #4)

**Objetivo:** que la app lea las categorías desde la DB (hoy no lo hace) y sumarles dos niveles
(Categoría padre → Subcategoría), sin romper los gastos ya cargados.

> ⚠️ **Contexto importante que hay que respetar:** la tabla `expense_categories` **YA EXISTE**
> (definida en `supabase/migrations/20260703170000_initial_expense_tracker.sql`, líneas ~42-49)
> con columnas `id, household_id, name, color, kind, created_at`. Ya está **seedeada** con 19
> categorías globales (`household_id = null`) y ya tiene las **políticas RLS correctas**:
> `categories_select` (ve las globales + las de su hogar) y `categories_manage` (solo edita las de
> su propio `household_id`). **El problema real:** la app **ignora esta tabla** — `getAppContext`
> en `lib/server/context.ts` devuelve `CATEGORY_SEEDS` (hardcode). Además hay **drift** entre el
> hardcode y el seed de la DB: el código tiene `consultorio` (que NO está en el seed de la DB) y
> los nombres/íconos difieren (ej. DB `'Hogar / Limpieza'` vs código `'Compras Hogar'`, y la DB
> no guarda `icon`). Hay que reconciliar esto.

### A.1 — Migración de esquema (ALTER, no CREATE)

Crear una migración nueva en `supabase/migrations/` (seguir el patrón de nombre con timestamp,
ej. `20260706120000_categories_hierarchy.sql`). Debe **alterar** la tabla existente:

```sql
alter table public.expense_categories
  add column if not exists parent_id  text references public.expense_categories(id) on delete set null,
  add column if not exists icon       text not null default '📦',
  add column if not exists is_active  boolean not null default true,
  add column if not exists sort_order int not null default 0;
-- 'kind' ya existe (not null); se conserva por compatibilidad.
```

- `parent_id = null` ⇒ la fila es una **Categoría (padre)**.
- `parent_id != null` ⇒ la fila es una **Subcategoría** que cuelga de ese padre.
- `household_id = null` ⇒ categoría **global** (base); con `household_id` ⇒ categoría propia del hogar.
  Al leer, unir globales + las del hogar (la policy `categories_select` ya lo permite).
- **No hace falta tocar RLS**: `categories_select` y `categories_manage` ya cubren exactamente el
  modelo pedido (ver la migración inicial). Verificar que sigan aplicando tras el ALTER.

### A.2 — Seed de la jerarquía + reconciliación

En la misma migración: (a) `insert` de los **padres** nuevos; (b) `update` de cada subcategoría
existente para setear su `parent_id` e `icon`; (c) sumar las que faltan en la DB (`consultorio` y
la nueva `tenis`); (d) reconciliar nombres con el código (ej. `hogar-limpieza` → `'Compras Hogar'`).
Usar exactamente los `id` que ya están en la DB / en `CATEGORY_SEEDS` como subcategorías, para no
romper los `category_id` ya guardados en `expense_expenses`. Los íconos salen de `CATEGORY_SEEDS`
(la DB hoy no los tiene).

**Taxonomía propuesta (EDITABLE — Guido, ajustá nombres/colores/asignación antes de correr):**

| Categoría (padre) | id padre    | Subcategorías (id actuales)                                                        |
|-------------------|-------------|------------------------------------------------------------------------------------|
| Super             | `super`     | `supermercado`, `verduleria-almacen`                                               |
| Gastronomía       | `gastro`    | `delivery`, `restaurantes-cafes`                                                   |
| Transporte        | `transporte-cat` | `transporte`, `nafta-peajes`                                                  |
| Hogar             | `hogar`     | `hogar-limpieza`, `expensas`, `servicios-impuestos`                                |
| Salud             | `salud`     | `salud-farmacia`, `consultorio`                                                    |
| Familia & Mascotas| `familia`   | `familia-bebe`, `mascotas`, `educacion`                                            |
| Ocio & Personal   | `ocio`      | `ropa`, `ocio-suscripciones`, `viajes`, `regalos`, `tenis` (nueva)                 |
| Finanzas          | `finanzas`  | `banco-comisiones`                                                                 |
| Otros             | `otros-cat` | `otros`                                                                            |

> Nota: los `id` de padre llevan sufijo (`transporte-cat`, `otros-cat`) para no chocar con las
> subcategorías `transporte` y `otros` que ya existen. Si preferís, renombrá.

Agregar además la **subcategoría nueva** `tenis` (`{ name: "Tenis", icon: "🎾", parent_id: "ocio" }`,
color a elección).

### A.3 — Cargar categorías desde la DB (reemplazar el hardcode)

- Convertir `lib/domain/categories.ts`: `CATEGORY_SEEDS` deja de ser la fuente de verdad en
  runtime. Mantener el array **solo como fallback del modo demo / seed inicial**.
- Extender `getAppContext` (`lib/server/context.ts`) para que en modo `supabase` traiga las
  categorías del hogar (globales + propias) desde `expense_categories`, y en modo demo use el seed.
  El `AppContext` ya expone `categories` — ahora debe venir de la DB.
- Crear helpers en `lib/domain/categories.ts`:
  - `categoryById(id)` (ya existe) → adaptarlo para recibir la lista dinámica.
  - `parentOf(categoryId, categories)` → devuelve la Categoría padre de una subcategoría.
  - `parentCategories(categories)` y `subcategoriesOf(parentId, categories)`.
- **"Mapeo derivado":** cuando un gasto tiene `categoryId = 'supermercado'`, la app debe poder
  resolver su padre `'super'` para agrupar. Esa resolución es la parte "derivada" del punto 2.

**Criterios de aceptación FASE A**
- La app arranca en modo supabase leyendo categorías desde la tabla, sin romper gastos existentes.
- Los `category_id` de los gastos ya cargados siguen siendo válidos (apuntan a subcategorías).
- Existe `parentOf()` y se puede obtener el padre de cualquier subcategoría.
- `tenis` existe como subcategoría bajo `Ocio & Personal`.

---

## PUNTO 4 — Crear / editar categorías desde "Revisar" (CRUD)

**Objetivo:** que el usuario cree una categoría o subcategoría nueva, edite una existente y
reasigne gastos previos, **sin tocar código**. (CRUD = Create, Read, Update, Delete).

### 4.1 — Server actions (en `app/actions.ts`)

Crear acciones nuevas, en el mismo estilo que `updateExpenseReviewAction` (validar contexto
supabase, usar `createClient`, `revalidateApp()` al final):

- `createCategoryAction(formData)`: crea fila en `expense_categories` con `household_id` del
  usuario. Campos: `name`, `color`, `icon`, `parentId` (null si es un padre nuevo). Genera un
  `id` slug a partir del nombre (normalizar: minúsculas, sin acentos, guiones). Validar que no
  choque con un id existente.
- `updateCategoryAction(formData)`: edita `name/color/icon/parentId/is_active` de una categoría
  del hogar. **No** permitir editar seeds globales (o permitir clonarlos al hogar antes de editar
  — decisión de implementación; lo simple es: solo se editan las del propio `household_id`).
- `deleteCategoryAction(formData)`: soft-delete (`is_active = false`) para no romper gastos que la
  referencian. Si tiene gastos asociados, exigir reasignar primero (ver 4.3).
- `reassignExpensesCategoryAction(formData)`: mueve todos los gastos de una subcategoría a otra
  (`update expense_expenses set category_id = :destino where category_id = :origen and household_id = :hh`).

### 4.2 — UI del editor de categorías (en `app/review/page.tsx` / nuevo componente)

- Agregar en "Revisar" una sección o pestaña **"Categorías"** (además de la lista de gastos actual).
- Mostrar las categorías agrupadas por padre (árbol de 2 niveles), reutilizando `CategoryIcon`
  y `CategoryBadge`.
- Botón **"Nueva categoría"** que abre un form con: nombre, ícono (emoji), color, y selector de
  **Categoría padre** (o "es una categoría nueva de nivel padre").
- Cada categoría existente: botón **editar** (mismos campos) y **borrar** (con confirmación).
- El editor debe funcionar tanto para **subcategoría** como para **Categoría padre**.

### 4.3 — Reasignar gastos previos

- En el editor de cada categoría, mostrar cuántos gastos la usan y ofrecer **"Reasignar a…"**
  (dispara `reassignExpensesCategoryAction`).
- El `<select>` de categoría del form de edición de gasto en `components/review-list.tsx` debe
  pasar a listar las categorías **desde la DB** (hoy mapea `CATEGORY_SEEDS`), agrupadas por padre
  con `<optgroup>`.

**Criterios de aceptación PUNTO 4**
- Desde "Revisar" puedo crear "Tenis" (o cualquier otra) eligiendo su categoría padre, y aparece
  al instante en el `<select>` de gastos y en los gráficos.
- Puedo editar el nombre/color/ícono de una categoría y se refleja en todo el dashboard.
- Puedo reasignar en bloque los gastos de una subcategoría a otra.
- Borrar una categoría no rompe gastos históricos (soft-delete + reasignación).

---

## PUNTO 2 — Mostrar la CATEGORÍA (padre) en gráficos y detalles

**Objetivo:** los gráficos y el resumen agrupan por **Categoría padre** (Super, Transporte…),
no por subcategoría. El dato crudo sigue siendo la subcategoría.

### Qué tocar

- `lib/server/demo-data.ts` → `buildDashboardSummary`: hoy arma `byCategory` iterando
  `CATEGORY_SEEDS` por `categoryId`. Cambiar para **agrupar por `parentOf(expense.categoryId)`**.
  El tipo `DashboardSummary.byCategory` puede mantener su forma (`{ categoryId, category, color,
  amountArs }`) pero `categoryId`/`category`/`color` ahora refieren al **padre**.
- `components/spend-charts.tsx`: hoy usa `CATEGORY_SEEDS` y agrupa por `e.categoryId`. Cambiar
  `keyFor`, `seriesLabel`, `seriesColor` y el cálculo de `stacked`/`pie`/`windowTotals` para que
  la **serie sea la Categoría padre**. Recibir la lista de categorías dinámica por props (o por
  contexto) en vez de importar el array estático.
- El **desglose** (sección de abajo de `spend-charts.tsx`) puede seguir mostrando el detalle a
  nivel gasto, pero la etiqueta de agrupación y el filtro deben ser por **padre**. Opcional:
  permitir "profundizar" a subcategoría dentro de un padre seleccionado (nice-to-have, no requerido).

**Criterios de aceptación PUNTO 2**
- La torta "Categorías del mes" y la barra de "Categorías" del dashboard muestran ~8 clusters
  (Super, Transporte, Hogar…), no 20 items.
- Los montos por padre = suma de sus subcategorías. La suma total no cambia.

---

## PUNTO 1 — Monto nominal al filtrar + filtrar evolución y desglose

**Estado actual:** en `spend-charts.tsx` ya existe `selected` (al clickear una categoría se
resaltan sus slices/bandas y el desglose se filtra). **Falta**: mostrar el monto nominal de forma
prominente y filtrar de verdad la evolución.

**Objetivo:** al filtrar una categoría (padre), ver **cuánto representa en $**, y que el gráfico de
evolución y el desglose muestren solo esa categoría.

### Qué tocar (`components/spend-charts.tsx`)

- Al haber `selected`, mostrar el **monto nominal** de esa categoría en el mes (no solo el %).
  Sugerencia: en el centro del donut, cuando hay filtro, mostrar el nombre + `$ monto` de la
  categoría seleccionada en lugar del total; y/o un chip destacado arriba del desglose.
- **Evolución filtrada:** cuando hay `selected`, el gráfico de evolución debe mostrar el histórico
  **solo de esa categoría** (ej. una única banda/línea con su color), no el apilado completo con
  las demás atenuadas. Al limpiar el filtro, vuelve al apilado.
- El **desglose** ya filtra por `selected` — verificar que siga andando con el nuevo agrupamiento
  por padre.
- El filtro debe ser **compartido**: seleccionar en la torta filtra evolución + desglose, y
  viceversa (un único estado `selected`).

**Criterios de aceptación PUNTO 1**
- Al tocar "Transporte" veo su **monto en $** del mes, y la evolución pasa a mostrar solo el
  histórico de Transporte.
- "Limpiar filtro" restaura torta, evolución y desglose.

---

## PUNTO 3 — Evolución interactiva con tooltip (total + detalle por categoría)

**Estado actual:** el área apilada en `spend-charts.tsx` no tiene hover ni tooltip.

**Objetivo:** poder posicionarse sobre cada mes y ver, **en modo etiqueta/tooltip**, el **total del
mes** y el **detalle por categoría (padre)**. Y que el filtro por categoría (punto 1) también
aplique a este gráfico.

### Qué tocar (`components/spend-charts.tsx`)

- Agregar interacción de hover sobre el SVG del área apilada: detectar el mes más cercano a la
  posición del cursor (usar la escala `x(i)` ya existente) y renderizar:
  - una **línea guía vertical** en ese mes,
  - un **tooltip** con: el mes, el **total** (`formatMoney`) y el **desglose por categoría padre**
    (nombre + color + monto), ordenado de mayor a menor.
- En mobile (la app es mobile-first), soportar **tap/touch** además de mouse: al tocar un mes se
  fija el tooltip; tocar afuera lo cierra.
- Respetar el filtro `selected`: si hay una categoría seleccionada, el tooltip muestra solo esa
  categoría (coherente con punto 1).
- El detalle por categoría del tooltip sale del array `stacked` (que ya tiene `values` por serie
  y `total` por mes) — reutilizarlo, adaptado al agrupamiento por padre.

**Criterios de aceptación PUNTO 3**
- Al pasar el mouse / tocar un mes, aparece un tooltip con total del mes + montos por categoría.
- Funciona en desktop (hover) y mobile (tap).
- Con un filtro de categoría activo, el tooltip refleja solo esa categoría.

---

## Verificación final (pedirle a Claude Code que la haga)

1. `npm run build` (o el script de build del repo) sin errores de tipos.
2. Correr los tests existentes (`tests/`) y agregar, como mínimo, un test de `parentOf()` y del
   nuevo agrupamiento por padre en `buildDashboardSummary`.
3. Probar el flujo completo en modo supabase: crear "Tenis", asignarle un gasto, verlo agrupado
   bajo "Ocio & Personal", filtrarlo y ver su monto + evolución.
4. Confirmar que los gastos históricos no cambiaron de monto ni total.

## Notas para Guido (modo aprendizaje — opcional)

Este brief está escrito para que Claude Code lo ejecute de una. Si querés aprender mientras se
construye (contrato de enseñanza del playground), pedile que trabaje en **modo andamiaje**: que te
explique cada bloque antes, que vos escribas las partes clave (ej. la función `parentOf` o el
`buildDashboardSummary` reagrupado) y que él revise. Buen punto de entrada para entender:
_estado en React_ (`selected`), _server actions_ (el CRUD) y _joins/relaciones_ en SQL (la jerarquía).
