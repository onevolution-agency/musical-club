# Barrios

Cada barrio cerrado es un tenant. La migración `supabase/migrations/20261019043000_barrios_memberships_avatars.sql` agrega el modelo y deja los datos que ya existían en **El Talar**.

No la apliques al proyecto en producción hasta que el pull request esté aprobado. El archivo vive en el repo para revisarlo.

## Esquema

- `barrios`: nombre, slug, logo, activo, arancel de referencia y frecuencia (`monthly` o `biweekly`).
- `barrio_memberships`: una persona puede ser alumna, profe o admin de varios barrios. La clave es `(user_id, barrio_id)`.
- `profiles.role` suma `super_admin`. Santiago Errecalde y Gaby Bibas quedan en ese rol y, además, como admin de cada barrio de la demo para poder registrar efectivo.
- `profiles.current_barrio_id` recuerda el barrio activo. La cookie `mc_barrio` guarda el slug, o `todos` para un super admin.
- `barrio_id` es obligatorio en actividades, asignaciones, inscripciones, clases, asistencia, cuotas y pagos. En consultas es opcional.
- El slug de una actividad es único dentro del barrio, no en toda la plataforma.
- Un trigger copia el `barrio_id` del padre cuando se inserta una fila hija, así el seed y las acciones no tienen que repetirlo en cada pago o marca.

## Quién ve qué

Los helpers están en el schema `private` y las policies de RLS los usan:

- `sees_barrio`: super admin, o alguien con membresía en ese barrio.
- `is_barrio_admin`: super admin, o membresía `admin` de ese barrio.
- Un usuario autenticado lee actividades de sus barrios. El sitio público (anon) lee actividades activas de barrios activos.
- Un alumno paga solo con Mercado Pago, y solo una cuota propia de un barrio donde es alumno.
- El efectivo lo inserta un admin de ese barrio, aprobado, con `received_by` y `created_by` iguales a su usuario. No hay policy de insert para profes.
- Nadie se suma solo a un segundo barrio. Lo hace un admin al invitar o al cambiar la membresía.
- El alta pública manda `barrio_slug` en los metadatos del usuario. El trigger `handle_new_user` lo usa para crear la membresía de alumno. Ese dato no autoriza nada más.

## Avatares

El bucket `avatars` queda con lectura pública. Insertar, actualizar o borrar solo está permitido si la primera carpeta del path es `auth.uid()`. La app comprime la foto en el navegador (JPG, PNG o WebP, tope 2 MB, lado máximo 512 px) y la sube a `avatars/{userId}/avatar.jpg`.

## Cómo migrar un proyecto que ya tiene el seed

1. Aplicá `20261019043000_barrios_memberships_avatars.sql` en el SQL editor o con `supabase db push`.
2. Volvé a correr `npm run seed` (o `supabase db reset` en local). El seed es idempotente: reparte las actividades de sábado en El Talar y las de domingo en Club Nordelta, y arma las membresías.
3. Entrá con `santiago.errecalde@musicalclub.test` / `MusicalClub2026`. El tablero arranca en todos los barrios. El selector filtra uno solo.

Las cuentas y la contraseña no cambian. No hay cuentas de padres: los menores siguen siendo alumnos y el adulto queda como contacto de emergencia.
