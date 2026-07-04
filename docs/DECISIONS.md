# Decisiones cerradas

- Stack: Next.js App Router, TypeScript, Tailwind, Supabase y Vercel.
- Auth: dos usuarios de Supabase, Guido y Dalu, unidos por el mismo `household_id`.
- La auditoria guarda `created_by_member_id`, `owner_profile_id` y, para tarjetas, `cardholder_profile_id`.
- La categoria `Expensas` forma parte del seed inicial.
- Los gastos de tarjeta cuentan en el mes del resumen donde aparecen.
- Manual y voz se reservan para gastos fuera de tarjeta: efectivo, transferencias, debito u otros.
- La voz nunca persiste directo. Siempre abre una pre-confirmacion editable.
- Cada cuota cuenta como gasto del mes en que aparece en el resumen.
- USD guarda monto original, tasa y monto ARS. La tasa default viene de MEP venta y se puede editar antes de confirmar.

## UI

- Shell mobile-first de maximo 430px, centrado en desktop.
- Monitor desktop ancho en `/monitor`.
- Header superior con hogar, perfil activo, monitor, ajustes y logout.
- Nav inferior flotante: Inicio, Cargar, microfono central, Importar, Revisar.
- Paleta pastel clara con base azul suave.

## Deploy y entorno

- Repo: `gsiragusa91/expense-tracker`.
- Vercel: `https://expense-tracker-siragusa.vercel.app/`.
- Supabase: se reutiliza el proyecto de Baby's Project (`xqnvzqnyykiyzktkwogl`) como subproyecto.
- Auth final: `guido.siragusa@gmail.com` y `dalubeche@gmail.com`.
- Migracion y seed remoto: aplicados.

## Pendientes

- Cargar datos reales de PDFs en Supabase cuando Guido autorice explicitamente la subida de transacciones financieras reales.
- Validar E2E productivo con datos reales.
- Iterar categorizacion aprendida desde la pantalla `Revisar`.
- Completar settings, fuentes de pago y edicion de tasa MEP.
