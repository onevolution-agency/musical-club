-- Actividades de referencia. El precio queda en 0 hasta que la administración lo cargue:
-- la propuesta no publica un arancel. Las frases salen del PDF, sin reescritura.

insert into public.activities (
  slug, name, description, age_group, schedule_label, location, capacity,
  price_cents, currency, billing_frequency, status
) values
(
  'grupo-kids',
  'Grupo Kids',
  'Grupo Kids: Niños y niñas hasta los 12 años.',
  'kids',
  '1 encuentro semanal, a elección de la administración (Sábados o Domingos).',
  'Salón del Club House, Gimnasio o SUM cerrado.',
  24,
  0,
  'ARS',
  'monthly',
  'active'
),
(
  'jovenes-y-adultos',
  'Grupo Jóvenes y Adultos',
  'Grupo Jóvenes y Adultos: A partir de 13 años (sin límite de edad).',
  'youth_adults',
  '1 encuentro semanal, a elección de la administración (Sábados o Domingos).',
  'Salón del Club House, Gimnasio o SUM cerrado.',
  24,
  0,
  'ARS',
  'monthly',
  'active'
)
on conflict (slug) do nothing;

-- Primer admin, después de crear el usuario en Authentication:
-- update public.profiles set role = 'admin' where email = 'tu-correo@ejemplo.com';
