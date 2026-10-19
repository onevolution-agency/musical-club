# Musical Club

Plataforma del taller de teatro, canto y danza para countries y barrios cerrados. Dirección artística: Santiago Errecalde. Producción ejecutiva: Gaby Bibas.

El sitio público usa el copy de los PDF (`musical-club-original` como fuente y `musical-club-propuesta` como jerarquía visual). La interfaz de la app está en español rioplatense (voseo).

## Stack

- Next.js (App Router) + TypeScript, pensado para Vercel
- Supabase: Postgres, Auth, Storage y RLS (`supabase/migrations`, `supabase/seed.sql`)
- Mercado Pago Checkout Pro (sandbox con el access token de prueba)
- PWA: manifest, íconos, service worker, página offline y aviso de instalación

## Módulos

Cada feature vive en `src/modules/<nombre>` con dominio puro, validación zod, acceso a datos y server actions. La UI de cada rol está en `src/app`.

| Módulo | Qué cubre |
| --- | --- |
| `cms` | Copy, JSON-LD, contacto |
| `auth` | Sesión, roles, perfil y foto |
| `barrios` | Tenants, membresías y arancel de referencia |
| `activities` | Grupos, horario, cupo, precio, frecuencia |
| `enrollments` | Inscripción, espera, baja |
| `students` | Área del alumno (perfil, horario, QR) |
| `teachers` | Invitaciones y roles |
| `attendance` | Sesión, QR y lista manual sin duplicados |
| `payments` | Cuotas, Mercado Pago y efectivo |
| `dashboard` | Ingresos, mora, asistencia, conciliación |

### Cómo agregar un módulo

1. Creá `src/modules/<nombre>/` con `domain.ts` (lógica pura y testeable), `schemas.ts` (zod), `queries`/`actions` si habla con Supabase, y la UI en `src/app`.
2. Sumá las tablas en una migración nueva de `supabase/migrations`. Activá RLS y escribí policies. No uses `user_metadata` para autorizar: el rol está en `public.profiles` y los helpers viven en el schema `private`.
3. Si hace falta una variable, documentala en `.env.example` sin secretos.
4. Registrá el módulo en `src/modules/registry.ts` y, si corresponde, en la navegación de `src/components/shell/app-shell.tsx`.
5. Agregá tests de la lógica en `domain.test.ts` y corré `npm test`.

## Puesta en marcha

```bash
cp .env.example .env.local
npm install
npm run dev
```

### Supabase

1. Creá un proyecto en [Supabase](https://supabase.com).
2. En Authentication → URL configuration, el Site URL es tu dominio y el redirect adicional es `https://tu-dominio/auth/callback` (en local, `http://localhost:3000/auth/callback`).
3. Corré las migraciones en orden: `supabase/migrations/20261018230000_init_musical_club.sql` y después `supabase/migrations/20261019043000_barrios_memberships_avatars.sql`. Si el proyecto ya tiene datos, la segunda migración los deja en el barrio El Talar. Después corré `supabase/seed.sql` para repartir la demo entre El Talar y Club Nordelta. El detalle está en `docs/tenancy.md`.
4. Copiá en `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o la anon key legacy en `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `SUPABASE_SERVICE_ROLE_KEY` (solo servidor: webhook, invitar profes, generar cuotas)
5. Creá tu usuario desde `/registro` y promovelo:

```sql
update public.profiles set role = 'admin' where email = 'tu-correo@ejemplo.com';
```

6. Generá `ATTENDANCE_QR_SECRET` con `openssl rand -hex 32`.
7. Los buckets `avatars` (lectura pública, cada usuario escribe solo su carpeta) y `receipts` se crean con las migraciones.
8. Cargá los datos de prueba (abajo). El seed deja aranceles de ejemplo; antes de producción reemplazalos por los importes reales.

### Datos de prueba

`supabase db reset` corre `supabase/seed.sql`. También podés repetirlo sin bajar la base:

```bash
npm run seed
```

En local el script usa `postgresql://postgres:postgres@127.0.0.1:54322/postgres` (el Postgres de `supabase start`). Para un proyecto remoto definí `DATABASE_URL` con la connection string de Postgres. El archivo es idempotente: vuelve a crear las actividades de demo, las inscripciones, las sesiones, las cuotas y los pagos, y restablece la contraseña documentada. Hay que correrlo después de la migración de barrios.

Todas las cuentas usan la misma contraseña, **solo desarrollo**: `MusicalClub2026`

| Rol | Email | Barrio |
| --- | --- | --- |
| Super admin | `santiago.errecalde@musicalclub.test` | El Talar y Club Nordelta |
| Super admin | `gaby.bibas@musicalclub.test` | El Talar y Club Nordelta |
| Profe (Kids sábado y domingo) | `valentina.ruiz@musicalclub.test` | Los dos |
| Profe (Jóvenes sábado) | `mateo.alvarez@musicalclub.test` | El Talar |
| Profe (Jóvenes sábado y domingo) | `lucia.ferreyra@musicalclub.test` | Los dos |
| Alumno Kids | `sofia.herrera@musicalclub.test`, `benjamin.castro@musicalclub.test`, `emma.lopez@musicalclub.test`, `thiago.romero@musicalclub.test`, `olivia.suarez@musicalclub.test`, `joaquin.pereyra@musicalclub.test`, `mia.fernandez@musicalclub.test`, `santino.diaz@musicalclub.test` |
| Alumno 13+ | `martina.gomez@musicalclub.test`, `franco.iglesias@musicalclub.test`, `camila.ortiz@musicalclub.test`, `nicolas.vega@musicalclub.test`, `julieta.paredes@musicalclub.test`, `agustin.molina@musicalclub.test`, `renata.acosta@musicalclub.test` |

No hay cuentas de padres: cada menor entra con su usuario y el adulto figura como contacto de emergencia. Las edades se calculan al correr el seed para que Kids siga teniendo menos de 12 y el otro grupo 13 o más.

El Talar tiene los sábados (Kids mensual y Jóvenes mensual, con lista de espera). Club Nordelta tiene los domingos (Kids y Jóvenes, cada 15 días). Joaquín cursa Kids en los dos barrios y Julieta cursa Jóvenes en los dos. El selector del sitio y de la app guarda la elección en la cookie `mc_barrio` y en el perfil. Santiago y Gaby pueden ver todos los barrios juntos: el tablero muestra el ingreso de cada uno y el total.

En cuotas hay pagos acreditados por Mercado Pago, efectivo con recibo (lo reciben Santiago o Gaby), pendientes, vencidas, un parcial y un efectivo anulado (`REC-1048`). Sofía tiene el mes pago por Mercado Pago; Benjamín y Franco tienen mora; Thiago tiene el efectivo anulado; Olivia tiene un pago parcial del período que viene; Renata está en lista de espera el sábado y activa el domingo.

### Vercel

1. Importá el repo. Framework: Next.js.
2. Cargá las mismas variables de `.env.example`. `NEXT_PUBLIC_SITE_URL` tiene que ser la URL pública (canónicos, volver de Mercado Pago y webhook).
3. El service worker y el manifest se sirven desde el build. No hace falta configuración extra.

### Mercado Pago

1. En el [panel de desarrolladores](https://www.mercadopago.com.ar/developers/panel/app) creá una aplicación de Checkout Pro.
2. Para sandbox usá el access token de prueba (`TEST-...`) en `MERCADOPAGO_ACCESS_TOKEN`.
3. Configurá el webhook a `https://tu-dominio/api/webhooks/mercadopago`, evento `payment`, y copiá el secret a `MERCADOPAGO_WEBHOOK_SECRET`.
4. En local el `notification_url` no se envía si el sitio es localhost. Podés exponer el puerto con un túnel y usar esa URL como `NEXT_PUBLIC_SITE_URL`.

El alumno paga solo por Mercado Pago. El único pago manual es efectivo y lo registra un admin del barrio (monto, fecha, recibo, nota y comprobante). Un profe no registra pagos. Queda auditoría y se puede anular. El tablero separa ingresos por medio, por barrio y en total, y concilia el efectivo por admin y período.

## Scripts

```bash
npm test       # cuotas, asistencia, webhook, copy
npm run lint
npm run build
npm run seed   # datos de prueba; también los corre supabase db reset
```

## Qué incluye

- Sitio público con el copy de la propuesta, ilustraciones propias (blanco, negro y rojo), SEO (metadata, Open Graph, sitemap, robots, canónicos, JSON-LD) y `/llms.txt`.
- Multi-barrio: cada barrio ve sus actividades, inscripciones, cuotas, pagos y asistencia. El alta de alumno pide el barrio.
- Auth de alumnos (contraseña y magic link), perfil con foto, inscripción, horario, cuotas y QR.
- Profes: clases asignadas, escaneo de QR con la foto del alumno, marca manual, sin duplicados, historial.
- Admin de barrio y super admin: barrios, actividades (Kids / 13+, horario, lugar, cupo, precio, frecuencia mensual o cada 15 días), profes, alumnos, inscripciones, sesiones, reportes, CSV.
- Pagos: preferencia de Checkout Pro, webhook con firma e idempotencia, efectivo solo admin, anulación, conciliación.
- Seed de desarrollo con cuentas de cada rol, actividades, asistencia y cuotas en varios estados.

## Pendiente

- Credenciales reales de producción (Supabase, Mercado Pago y dominio).
- En producción el primer admin se promueve a mano en SQL. El seed solo crea admins de prueba.
- Los precios del seed son importes de ejemplo. La propuesta no publica arancel: cambialos antes de cobrar.
- No hay facturación fiscal ni recordatorios automáticos de cuota.
- Los tests cubren la lógica de dominio. No hay e2e contra un proyecto Supabase real.
- El aviso de instalación de la PWA y el service worker se registran en el build de producción.
