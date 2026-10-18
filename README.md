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
| `auth` | Sesión, roles, perfil |
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
3. Corré la migración `supabase/migrations/20261018230000_init_musical_club.sql` y después `supabase/seed.sql` (SQL Editor, o `supabase db push` / `supabase db reset` si usás el CLI).
4. Copiá en `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o la anon key legacy en `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `SUPABASE_SERVICE_ROLE_KEY` (solo servidor: webhook, invitar profes, generar cuotas)
5. Creá tu usuario desde `/registro` y promovelo:

```sql
update public.profiles set role = 'admin' where email = 'tu-correo@ejemplo.com';
```

6. Generá `ATTENDANCE_QR_SECRET` con `openssl rand -hex 32`.
7. Los buckets `avatars` y `receipts` se crean con la migración.

El seed publica Grupo Kids y Grupo Jóvenes y Adultos con el texto de la propuesta y precio 0. Cargá el arancel real en el backoffice antes de generar cuotas.

### Vercel

1. Importá el repo. Framework: Next.js.
2. Cargá las mismas variables de `.env.example`. `NEXT_PUBLIC_SITE_URL` tiene que ser la URL pública (canónicos, volver de Mercado Pago y webhook).
3. El service worker y el manifest se sirven desde el build. No hace falta configuración extra.

### Mercado Pago

1. En el [panel de desarrolladores](https://www.mercadopago.com.ar/developers/panel/app) creá una aplicación de Checkout Pro.
2. Para sandbox usá el access token de prueba (`TEST-...`) en `MERCADOPAGO_ACCESS_TOKEN`.
3. Configurá el webhook a `https://tu-dominio/api/webhooks/mercadopago`, evento `payment`, y copiá el secret a `MERCADOPAGO_WEBHOOK_SECRET`.
4. En local el `notification_url` no se envía si el sitio es localhost. Podés exponer el puerto con un túnel y usar esa URL como `NEXT_PUBLIC_SITE_URL`.

El alumno paga solo por Mercado Pago. El único pago manual es efectivo y lo registra un admin (monto, fecha, recibo, nota y comprobante). Queda auditoría y se puede anular. El tablero separa ingresos por medio y concilia el efectivo por admin y período.

## Scripts

```bash
npm test       # cuotas, asistencia, webhook, copy
npm run lint
npm run build
```

## Qué incluye

- Sitio público con el copy de la propuesta, fotos del brochure, SEO (metadata, Open Graph, sitemap, robots, canónicos, JSON-LD) y `/llms.txt`.
- Auth de alumnos (contraseña y magic link), perfil, inscripción, horario, cuotas y QR.
- Profes: clases asignadas, escaneo de QR con la cámara, marca manual, sin duplicados, historial.
- Admin: CRUD de actividades (Kids / 13+, horario, lugar, cupo, precio, frecuencia mensual o cada 15 días), profes, alumnos, inscripciones, sesiones, reportes, CSV.
- Pagos: preferencia de Checkout Pro, webhook con firma e idempotencia, efectivo solo admin, anulación, conciliación.

## Pendiente

- Credenciales reales de producción (Supabase, Mercado Pago y dominio).
- El primer admin se promueve a mano en SQL.
- Los precios del seed están en cero a propósito: la propuesta no publica arancel.
- No hay facturación fiscal ni recordatorios automáticos de cuota.
- Los tests cubren la lógica de dominio. No hay e2e contra un proyecto Supabase real.
- El aviso de instalación de la PWA y el service worker se registran en el build de producción.
