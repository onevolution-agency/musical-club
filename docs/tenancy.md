# Barrios

Cada barrio cerrado es un tenant. La migración `supabase/migrations/20261019043000_barrios_memberships_avatars.sql` agrega el modelo y deja los datos que ya existían en **El Talar**.

Ese archivo **ya está aplicado** en el proyecto de producción. Ahí se corrió con un prefijo `service_role`, porque el backfill de `payments.barrio_id` disparaba el trigger viejo `payments_guard` (`No autorizado`) antes de que existiera `guard_payment_update`. La copia del repo ahora incluye ese claim y desactiva el trigger solo durante el `UPDATE`. El estado final es el mismo: el trigger queda habilitado y la función nueva es la que queda instalada.

No vuelvas a aplicar `20261019043000` en producción. Si el CLI marca un checksum distinto, no resetees el historial: la base ya está en el estado equivalente. La migración que sí se puede aplicar ahí es `20261019120000_rls_initplan_fk_indexes.sql`. Es idempotente y hace tres cosas:

- Deja que un profe lea los perfiles de los alumnos de su barrio. La policy anterior unía `barrio_memberships` con el RLS del propio profe, que solo ve su membresía, y la lista de la clase abierta quedaba en 0/0.
- Envuelve `auth.uid()` y `auth.role()` en `(select ...)` para el advisor de initplan.
- Agrega índices que cubren las foreign keys que el advisor marcó.

## Esquema

- `barrios`: nombre, slug, logo, activo, arancel de referencia y frecuencia (`monthly` o `biweekly`). El logo se muestra en el listado de barrios.
- `barrio_memberships`: una persona puede ser alumna, profe o admin de varios barrios. La clave es `(user_id, barrio_id)`.
- `profiles.role` suma `super_admin`. Santiago Errecalde y Gaby Bibas quedan en ese rol y, además, como admin de cada barrio de la demo para poder registrar efectivo.
- `profiles.current_barrio_id` recuerda el barrio activo. La cookie `mc_barrio` guarda el slug elegido en el alta. Sin cookie, o con el valor viejo `todos`, el barrio activo es el del perfil y, si no hay, el primero de la lista (las consultas ordenan por nombre).
- `barrio_id` es obligatorio en actividades, asignaciones, inscripciones, clases, asistencia, cuotas y pagos. En consultas es opcional.
- El slug de una actividad es único dentro del barrio, no en toda la plataforma.
- Un trigger copia el `barrio_id` del padre cuando se inserta una fila hija, así el seed y las acciones no tienen que repetirlo en cada pago o marca.

## Quién ve qué

Los helpers están en el schema `private` y las policies de RLS los usan:

- `sees_barrio`: super admin, o alguien con membresía en ese barrio.
- `is_barrio_admin`: super admin, o membresía `admin` de ese barrio.
- `can_read_profile`: la persona misma, un super admin, un admin del mismo barrio, o un profe que comparte barrio con un alumno. Es `security definer` para no depender del RLS de `barrio_memberships`.
- Un usuario autenticado lee actividades de sus barrios. El sitio público (anon) lee actividades activas de barrios activos.
- Un alumno paga solo con Mercado Pago, y solo una cuota propia de un barrio donde es alumno.
- El efectivo lo inserta un admin de ese barrio, aprobado, con `received_by` y `created_by` iguales a su usuario. No hay policy de insert para profes.
- Nadie se suma solo a un segundo barrio. Lo hace un admin al invitar o al cambiar la membresía.
- El alta pública manda `barrio_slug` en los metadatos del usuario. El trigger `handle_new_user` lo usa para crear la membresía de alumno. Ese dato no autoriza nada más.

## Avatares

El bucket `avatars` queda con lectura pública. Insertar, actualizar o borrar solo está permitido si la primera carpeta del path es el id del usuario. La app comprime la foto en el navegador (JPG, PNG o WebP, tope 2 MB, lado máximo 512 px) y la sube a `avatars/{userId}/avatar.jpg`.

## Cómo migrar un proyecto que ya tiene el seed

En producción, `20261019043000` ya corrió. Aplicá solo `20261019120000_rls_initplan_fk_indexes.sql`.

En una base nueva:

1. Aplicá las migraciones en orden (`supabase db push` en local).
2. Volvé a correr `npm run seed` (o `supabase db reset` en local). El seed es idempotente: reparte las actividades de sábado en El Talar y las de domingo en Club Nordelta, y arma las membresías. Si un barrio ya tiene `logo_url`, el seed no lo pisa.
3. Entrá con `santiago.errecalde@musicalclub.test` / `MusicalClub2026`. El tablero arranca en el barrio de su perfil (El Talar en la demo).

Las cuentas y la contraseña no cambian. No hay cuentas de padres: los menores siguen siendo alumnos y el adulto queda como contacto de emergencia.
