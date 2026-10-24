-- Musical Club — datos de prueba. SOLO DESARROLLO.
-- Contraseña de todas las cuentas: MusicalClub2026
--
-- Idempotente: se puede correr con `supabase db reset` o `npm run seed`.
-- Reemplaza las cuatro actividades de demo y sus inscripciones, sesiones,
-- cuotas y pagos. Vuelve a dejar la contraseña documentada.
-- Responsables con login (password MusicalClub2026) y kids sin usuario:
--   carolina.herrera@musicalclub.test administra a Lola y Theo
--   diego.herrera@musicalclub.test administra a Lola
-- Lola y Theo no tienen mail ni contraseña. Lola cursa Grupo Kids.
--
-- Barrios de demo: El Talar (sábados, mensual) y Club Nordelta (domingos, cada 15 días).
-- Santiago y Gaby son super admin y ven los dos. Valentina, Lucía, Joaquín y Julieta
-- pertenecen a los dos barrios.
--
-- Super admin
--   santiago.errecalde@musicalclub.test
--   gaby.bibas@musicalclub.test
-- Profes
--   valentina.ruiz@musicalclub.test
--   mateo.alvarez@musicalclub.test
--   lucia.ferreyra@musicalclub.test
-- Alumnos (Kids, menores de 12)
--   sofia.herrera@musicalclub.test
--   benjamin.castro@musicalclub.test
--   emma.lopez@musicalclub.test
--   thiago.romero@musicalclub.test
--   olivia.suarez@musicalclub.test
--   joaquin.pereyra@musicalclub.test
--   mia.fernandez@musicalclub.test
--   santino.diaz@musicalclub.test
-- Alumnos (13+)
--   martina.gomez@musicalclub.test
--   franco.iglesias@musicalclub.test
--   camila.ortiz@musicalclub.test
--   nicolas.vega@musicalclub.test
--   julieta.paredes@musicalclub.test
--   agustin.molina@musicalclub.test
--   renata.acosta@musicalclub.test
-- Responsables
--   carolina.herrera@musicalclub.test
--   diego.herrera@musicalclub.test

create extension if not exists pgcrypto with schema extensions;

do $seed$
declare
  today date := (timezone('America/Argentina/Buenos_Aires', now()))::date;
  month0 date := date_trunc('month', today::timestamp)::date;
  month_2 date := (month0 - interval '2 months')::date;
  month_1 date := (month0 - interval '1 month')::date;
  month1 date := (month0 + interval '1 month')::date;
  bio3 date := today + 3;
  bio2 date := bio3 - 15;
  bio1 date := bio2 - 15;
  bio0 date := bio1 - 15;
  santiago uuid := 'a1111111-1111-4111-8111-000000000001';
  gaby uuid := 'a1111111-1111-4111-8111-000000000002';
  class_row record;
  fee_row record;
  base date;
  class_date date;
  weeks_ago int;
  starts timestamptz;
  session_id uuid;
  mark_student uuid;
  enrollment_id uuid;
  idx int;
  student_count int;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);

  insert into public.barrios (id, slug, name, logo_url, active, default_price_cents, default_billing_frequency)
  values
    ('b1000000-0000-4000-8000-000000000001', 'el-talar', 'El Talar', '/icons/icon-192.png', true, 4500000, 'monthly'),
    ('b1000000-0000-4000-8000-000000000002', 'club-nordelta', 'Club Nordelta', '/icons/icon-on-red-192.png', true, 2400000, 'biweekly')
  on conflict (slug) do update set
    name = excluded.name,
    active = excluded.active,
    default_price_cents = excluded.default_price_cents,
    default_billing_frequency = excluded.default_billing_frequency,
    logo_url = coalesce(public.barrios.logo_url, excluded.logo_url);

  drop table if exists seed_people;
  create temp table seed_people (
    id uuid primary key,
    email text not null unique,
    full_name text not null,
    role text not null,
    phone text,
    dni text,
    birth_date date,
    emergency_contact text
  );

  insert into seed_people (id, email, full_name, role, phone, dni, birth_date, emergency_contact) values
    (santiago, 'santiago.errecalde@musicalclub.test', 'Santiago Errecalde', 'admin', '+54 9 11 4000-0001', null, null, null),
    (gaby, 'gaby.bibas@musicalclub.test', 'Gaby Bibas', 'admin', '+54 9 11 4000-0002', null, null, null),
    ('b1111111-1111-4111-8111-000000000001', 'valentina.ruiz@musicalclub.test', 'Valentina Ruiz', 'teacher', '+54 9 11 4000-0011', '90111001', '1990-03-12', null),
    ('b1111111-1111-4111-8111-000000000002', 'mateo.alvarez@musicalclub.test', 'Mateo Álvarez', 'teacher', '+54 9 11 4000-0012', '90111002', '1988-11-02', null),
    ('b1111111-1111-4111-8111-000000000003', 'lucia.ferreyra@musicalclub.test', 'Lucía Ferreyra', 'teacher', '+54 9 11 4000-0013', '90111003', '1993-06-27', null),
    ('c1111111-1111-4111-8111-000000000001', 'sofia.herrera@musicalclub.test', 'Sofía Herrera', 'student', '+54 9 11 5000-0001', '90112001', (today - interval '10 years')::date, 'Carolina Herrera (mamá) · +54 9 11 5555-0101'),
    ('c1111111-1111-4111-8111-000000000002', 'benjamin.castro@musicalclub.test', 'Benjamín Castro', 'student', '+54 9 11 5000-0002', '90112002', (today - interval '9 years')::date, 'Diego Castro (papá) · +54 9 11 5555-0102'),
    ('c1111111-1111-4111-8111-000000000003', 'emma.lopez@musicalclub.test', 'Emma López', 'student', '+54 9 11 5000-0003', '90112003', (today - interval '11 years')::date, 'Paula López (mamá) · +54 9 11 5555-0103'),
    ('c1111111-1111-4111-8111-000000000004', 'thiago.romero@musicalclub.test', 'Thiago Romero', 'student', '+54 9 11 5000-0004', '90112004', (today - interval '8 years')::date, 'Martín Romero (papá) · +54 9 11 5555-0104'),
    ('c1111111-1111-4111-8111-000000000005', 'olivia.suarez@musicalclub.test', 'Olivia Suárez', 'student', '+54 9 11 5000-0005', '90112005', (today - interval '10 years 4 months')::date, 'Ana Suárez (mamá) · +54 9 11 5555-0105'),
    ('c1111111-1111-4111-8111-000000000006', 'joaquin.pereyra@musicalclub.test', 'Joaquín Pereyra', 'student', '+54 9 11 5000-0006', '90112006', (today - interval '11 years 7 months')::date, 'Luis Pereyra (papá) · +54 9 11 5555-0106'),
    ('c1111111-1111-4111-8111-000000000007', 'mia.fernandez@musicalclub.test', 'Mía Fernández', 'student', '+54 9 11 5000-0007', '90112007', (today - interval '8 years 5 months')::date, 'Carla Fernández (mamá) · +54 9 11 5555-0107'),
    ('c1111111-1111-4111-8111-000000000008', 'santino.diaz@musicalclub.test', 'Santino Díaz', 'student', '+54 9 11 5000-0008', '90112008', (today - interval '9 years 6 months')::date, 'Pablo Díaz (papá) · +54 9 11 5555-0108'),
    ('c2222222-2222-4222-8222-000000000001', 'martina.gomez@musicalclub.test', 'Martina Gómez', 'student', '+54 9 11 5000-0101', '90113001', (today - interval '15 years')::date, 'Laura Gómez (mamá) · +54 9 11 5555-0201'),
    ('c2222222-2222-4222-8222-000000000002', 'franco.iglesias@musicalclub.test', 'Franco Iglesias', 'student', '+54 9 11 5000-0102', '90113002', (today - interval '17 years')::date, 'Hugo Iglesias (papá) · +54 9 11 5555-0202'),
    ('c2222222-2222-4222-8222-000000000003', 'camila.ortiz@musicalclub.test', 'Camila Ortiz', 'student', '+54 9 11 5000-0103', '90113003', (today - interval '28 years')::date, null),
    ('c2222222-2222-4222-8222-000000000004', 'nicolas.vega@musicalclub.test', 'Nicolás Vega', 'student', '+54 9 11 5000-0104', '90113004', (today - interval '22 years')::date, null),
    ('c2222222-2222-4222-8222-000000000005', 'julieta.paredes@musicalclub.test', 'Julieta Paredes', 'student', '+54 9 11 5000-0105', '90113005', (today - interval '34 years')::date, null),
    ('c2222222-2222-4222-8222-000000000006', 'agustin.molina@musicalclub.test', 'Agustín Molina', 'student', '+54 9 11 5000-0106', '90113006', (today - interval '14 years')::date, 'Verónica Molina (mamá) · +54 9 11 5555-0206'),
    ('c2222222-2222-4222-8222-000000000007', 'renata.acosta@musicalclub.test', 'Renata Acosta', 'student', '+54 9 11 5000-0107', '90113007', (today - interval '39 years')::date, null),
    ('d3333333-3333-4333-8333-000000000001', 'carolina.herrera@musicalclub.test', 'Carolina Herrera', 'student', '+54 9 11 5555-0101', '27111001', (today - interval '38 years')::date, null),
    ('d3333333-3333-4333-8333-000000000002', 'diego.herrera@musicalclub.test', 'Diego Herrera', 'student', '+54 9 11 5555-0190', '27111002', (today - interval '40 years')::date, null);

  if exists (
    select 1
    from auth.users u
    join seed_people p on lower(u.email) = p.email and u.id <> p.id
  ) then
    raise exception 'Hay un usuario con mail de demo y otro id. Corré supabase db reset o borrá esas cuentas.';
  end if;

  insert into public.staff_invites (email, role, full_name, token, expires_at, barrio_id)
  select p.email, p.role, p.full_name, 'seed-' || p.id::text, now() + interval '365 days', 'b1000000-0000-4000-8000-000000000001'
  from seed_people p
  where p.role in ('admin', 'teacher')
    and not exists (select 1 from auth.users u where u.id = p.id)
    and not exists (select 1 from public.staff_invites i where i.token = 'seed-' || p.id::text);

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    recovery_token,
    phone_change,
    phone_change_token,
    reauthentication_token,
    email_change_confirm_status,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  )
  select
    '00000000-0000-0000-0000-000000000000',
    p.id,
    'authenticated',
    'authenticated',
    p.email,
    extensions.crypt('MusicalClub2026', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    0,
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p.full_name),
    now(),
    now(),
    false,
    false
  from seed_people p
  where not exists (select 1 from auth.users u where u.id = p.id);

  update auth.users u
  set
    encrypted_password = extensions.crypt('MusicalClub2026', extensions.gen_salt('bf')),
    email_confirmed_at = coalesce(u.email_confirmed_at, now()),
    confirmation_token = coalesce(u.confirmation_token, ''),
    email_change = coalesce(u.email_change, ''),
    email_change_token_new = coalesce(u.email_change_token_new, ''),
    email_change_token_current = coalesce(u.email_change_token_current, ''),
    recovery_token = coalesce(u.recovery_token, ''),
    phone_change = coalesce(u.phone_change, ''),
    phone_change_token = coalesce(u.phone_change_token, ''),
    reauthentication_token = coalesce(u.reauthentication_token, ''),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = jsonb_build_object('full_name', p.full_name),
    updated_at = now()
  from seed_people p
  where u.id = p.id;

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  select
    gen_random_uuid(),
    u.id,
    jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
    'email',
    u.id::text,
    now(),
    now(),
    now()
  from auth.users u
  join seed_people p on p.id = u.id
  where not exists (
    select 1 from auth.identities i
    where i.user_id = u.id and i.provider = 'email'
  );

  insert into public.profiles (id, role, full_name, email)
  select p.id, p.role, p.full_name, p.email
  from seed_people p
  where not exists (select 1 from public.profiles pr where pr.id = p.id);

  update public.profiles pr
  set
    role = case
      when lower(p.email) in ('santiago.errecalde@musicalclub.test', 'gaby.bibas@musicalclub.test') then 'super_admin'
      else p.role
    end,
    full_name = p.full_name,
    email = p.email,
    phone = p.phone,
    dni = p.dni,
    birth_date = p.birth_date,
    emergency_contact = p.emergency_contact,
    current_barrio_id = case
      when p.email in (
        'mia.fernandez@musicalclub.test',
        'santino.diaz@musicalclub.test',
        'agustin.molina@musicalclub.test',
        'renata.acosta@musicalclub.test'
      ) then 'b1000000-0000-4000-8000-000000000002'::uuid
      else 'b1000000-0000-4000-8000-000000000001'::uuid
    end
  from seed_people p
  where pr.id = p.id;

  delete from public.barrio_memberships where user_id in (select id from seed_people);

  insert into public.barrio_memberships (user_id, barrio_id, role)
  select
    p.id,
    'b1000000-0000-4000-8000-000000000001',
    case when p.email in ('santiago.errecalde@musicalclub.test', 'gaby.bibas@musicalclub.test') then 'admin' else p.role end
  from seed_people p
  where p.email not in (
    'mia.fernandez@musicalclub.test',
    'santino.diaz@musicalclub.test',
    'agustin.molina@musicalclub.test',
    'renata.acosta@musicalclub.test'
  );

  insert into public.barrio_memberships (user_id, barrio_id, role)
  select
    p.id,
    'b1000000-0000-4000-8000-000000000002',
    case when p.email in ('santiago.errecalde@musicalclub.test', 'gaby.bibas@musicalclub.test') then 'admin' else p.role end
  from seed_people p
  where p.email in (
    'santiago.errecalde@musicalclub.test',
    'gaby.bibas@musicalclub.test',
    'valentina.ruiz@musicalclub.test',
    'lucia.ferreyra@musicalclub.test',
    'joaquin.pereyra@musicalclub.test',
    'mia.fernandez@musicalclub.test',
    'santino.diaz@musicalclub.test',
    'julieta.paredes@musicalclub.test',
    'agustin.molina@musicalclub.test',
    'renata.acosta@musicalclub.test'
  );

  insert into public.profiles (id, role, full_name, email, birth_date, account_kind, current_barrio_id)
  values
    (
      'd4444444-4444-4444-8444-000000000001',
      'student',
      'Lola Herrera',
      null,
      (today - interval '8 years')::date,
      'kid',
      'b1000000-0000-4000-8000-000000000001'
    ),
    (
      'd4444444-4444-4444-8444-000000000002',
      'student',
      'Theo Herrera',
      null,
      (today - interval '6 years')::date,
      'kid',
      'b1000000-0000-4000-8000-000000000001'
    )
  on conflict (id) do update set
    full_name = excluded.full_name,
    birth_date = excluded.birth_date
  where public.profiles.account_kind = 'kid';

  insert into public.barrio_memberships (user_id, barrio_id, role)
  values
    ('d4444444-4444-4444-8444-000000000001', 'b1000000-0000-4000-8000-000000000001', 'student'),
    ('d4444444-4444-4444-8444-000000000002', 'b1000000-0000-4000-8000-000000000001', 'student')
  on conflict (user_id, barrio_id) do nothing;

  insert into public.guardianships (guardian_id, child_id, barrio_id, access)
  values
    ('d3333333-3333-4333-8333-000000000001', 'd4444444-4444-4444-8444-000000000001', 'b1000000-0000-4000-8000-000000000001', 'manager'),
    ('d3333333-3333-4333-8333-000000000002', 'd4444444-4444-4444-8444-000000000001', 'b1000000-0000-4000-8000-000000000001', 'manager'),
    ('d3333333-3333-4333-8333-000000000001', 'd4444444-4444-4444-8444-000000000002', 'b1000000-0000-4000-8000-000000000001', 'manager')
  on conflict (guardian_id, child_id) do nothing;

  insert into public.guardian_audit (child_id, guardian_id, actor_id, barrio_id, action, note)
  select v.child_id, v.guardian_id, v.guardian_id, v.barrio_id, 'create', v.note
  from (
    values
      ('d4444444-4444-4444-8444-000000000001'::uuid, 'd3333333-3333-4333-8333-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000001'::uuid, 'Lola Herrera'),
      ('d4444444-4444-4444-8444-000000000002'::uuid, 'd3333333-3333-4333-8333-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000001'::uuid, 'Theo Herrera')
  ) as v(child_id, guardian_id, barrio_id, note)
  where not exists (
    select 1 from public.guardian_audit a
    where a.child_id = v.child_id and a.action = 'create'
  );

  delete from public.payments pay
  using public.fees f, public.activities a
  where pay.fee_id = f.id
    and f.activity_id = a.id
    and a.slug in ('grupo-kids', 'grupo-kids-domingo', 'jovenes-y-adultos', 'jovenes-domingo');

  delete from public.payments
  where student_id in (select id from seed_people);

  delete from public.activities
  where slug in ('grupo-kids', 'grupo-kids-domingo', 'jovenes-y-adultos', 'jovenes-domingo');

  insert into public.activities (
    id, barrio_id, slug, name, description, age_group, schedule_label, weekday, start_time, end_time,
    location, capacity, price_cents, currency, billing_frequency, status
  ) values
    (
      'd1111111-1111-4111-8111-000000000001',
      'b1000000-0000-4000-8000-000000000001',
      'grupo-kids',
      'Grupo Kids',
      'Grupo Kids: Niños y niñas hasta los 12 años.',
      'kids',
      'Sábados de 10:00 a 12:30',
      6,
      '10:00',
      '12:30',
      'Salón del Club House',
      16,
      4500000,
      'ARS',
      'monthly',
      'active'
    ),
    (
      'd1111111-1111-4111-8111-000000000002',
      'b1000000-0000-4000-8000-000000000002',
      'grupo-kids-domingo',
      'Grupo Kids · Domingos',
      'Grupo Kids: Niños y niñas hasta los 12 años.',
      'kids',
      'Domingos de 11:00 a 13:30',
      0,
      '11:00',
      '13:30',
      'Gimnasio',
      12,
      2400000,
      'ARS',
      'biweekly',
      'active'
    ),
    (
      'd1111111-1111-4111-8111-000000000003',
      'b1000000-0000-4000-8000-000000000001',
      'jovenes-y-adultos',
      'Grupo Jóvenes y Adultos',
      'Grupo Jóvenes y Adultos: A partir de 13 años (sin límite de edad).',
      'youth_adults',
      'Sábados de 16:00 a 18:30',
      6,
      '16:00',
      '18:30',
      'SUM cerrado',
      5,
      5600000,
      'ARS',
      'monthly',
      'active'
    ),
    (
      'd1111111-1111-4111-8111-000000000004',
      'b1000000-0000-4000-8000-000000000002',
      'jovenes-domingo',
      'Grupo Jóvenes y Adultos · Domingos',
      'Grupo Jóvenes y Adultos: A partir de 13 años (sin límite de edad).',
      'youth_adults',
      'Domingos de 17:00 a 19:30',
      0,
      '17:00',
      '19:30',
      'Salón del Club House',
      14,
      3200000,
      'ARS',
      'biweekly',
      'active'
    );

  insert into public.activity_teachers (activity_id, teacher_id) values
    ('d1111111-1111-4111-8111-000000000001', 'b1111111-1111-4111-8111-000000000001'),
    ('d1111111-1111-4111-8111-000000000002', 'b1111111-1111-4111-8111-000000000001'),
    ('d1111111-1111-4111-8111-000000000003', 'b1111111-1111-4111-8111-000000000002'),
    ('d1111111-1111-4111-8111-000000000003', 'b1111111-1111-4111-8111-000000000003'),
    ('d1111111-1111-4111-8111-000000000004', 'b1111111-1111-4111-8111-000000000003');

  insert into public.enrollments (activity_id, student_id, status, starts_on, notes)
  select 'd1111111-1111-4111-8111-000000000001', p.id, 'active', month_2, null
  from seed_people p
  where p.email in (
    'sofia.herrera@musicalclub.test',
    'benjamin.castro@musicalclub.test',
    'emma.lopez@musicalclub.test',
    'thiago.romero@musicalclub.test',
    'olivia.suarez@musicalclub.test',
    'joaquin.pereyra@musicalclub.test'
  );

  insert into public.enrollments (activity_id, student_id, status, starts_on, notes)
  values (
    'd1111111-1111-4111-8111-000000000001',
    'd4444444-4444-4444-8444-000000000001',
    'active',
    month_2,
    null
  );

  insert into public.enrollments (activity_id, student_id, status, starts_on, notes)
  select 'd1111111-1111-4111-8111-000000000002', p.id, 'active', bio0, null
  from seed_people p
  where p.email in (
    'joaquin.pereyra@musicalclub.test',
    'mia.fernandez@musicalclub.test',
    'santino.diaz@musicalclub.test'
  );

  insert into public.enrollments (activity_id, student_id, status, starts_on, notes)
  select 'd1111111-1111-4111-8111-000000000003', p.id, 'active', month_2, null
  from seed_people p
  where p.email in (
    'martina.gomez@musicalclub.test',
    'franco.iglesias@musicalclub.test',
    'camila.ortiz@musicalclub.test',
    'nicolas.vega@musicalclub.test',
    'julieta.paredes@musicalclub.test'
  );

  insert into public.enrollments (activity_id, student_id, status, starts_on, notes)
  values (
    'd1111111-1111-4111-8111-000000000003',
    'c2222222-2222-4222-8222-000000000007',
    'waitlist',
    month_2,
    'Lista de espera: el sábado está completo.'
  );

  insert into public.enrollments (activity_id, student_id, status, starts_on, notes)
  select 'd1111111-1111-4111-8111-000000000004', p.id, 'active', bio0, null
  from seed_people p
  where p.email in (
    'julieta.paredes@musicalclub.test',
    'agustin.molina@musicalclub.test',
    'renata.acosta@musicalclub.test'
  );

  drop table if exists seed_classes;
  create temp table seed_classes (
    activity_id uuid,
    teacher_id uuid,
    weekday int,
    start_time time,
    students uuid[]
  );

  insert into seed_classes (activity_id, teacher_id, weekday, start_time, students)
  select
    a.id,
    case a.slug
      when 'grupo-kids' then 'b1111111-1111-4111-8111-000000000001'::uuid
      when 'grupo-kids-domingo' then 'b1111111-1111-4111-8111-000000000001'::uuid
      when 'jovenes-y-adultos' then 'b1111111-1111-4111-8111-000000000002'::uuid
      else 'b1111111-1111-4111-8111-000000000003'::uuid
    end,
    a.weekday,
    a.start_time,
    (
      select coalesce(array_agg(e.student_id order by pr.full_name), '{}')
      from public.enrollments e
      join public.profiles pr on pr.id = e.student_id
      where e.activity_id = a.id and e.status = 'active'
    )
  from public.activities a
  where a.slug in ('grupo-kids', 'grupo-kids-domingo', 'jovenes-y-adultos', 'jovenes-domingo');

  for class_row in select * from seed_classes loop
    base := today - ((extract(dow from today)::int - class_row.weekday + 7) % 7);
    student_count := coalesce(array_length(class_row.students, 1), 0);
    foreach class_date in array (
      case
        when base < today then array[base - 21, base - 14, base - 7, base, base + 7]
        else array[base - 21, base - 14, base - 7, base]
      end
    )
    loop
      weeks_ago := (base - class_date) / 7;
      starts := (class_date::timestamp + class_row.start_time) at time zone 'America/Argentina/Buenos_Aires';
      insert into public.class_sessions (activity_id, opened_by, starts_at, ends_at, status, notes)
      values (
        class_row.activity_id,
        class_row.teacher_id,
        starts,
        case when class_date < today then starts + interval '2 hours 30 minutes' else null end,
        case when class_date < today then 'closed' else 'open' end,
        case
          when class_date < today then 'Clase cerrada. Ensayo del cuadro del mes.'
          else 'Lista abierta para tomar asistencia.'
        end
      )
      returning id into session_id;

      for idx in 1..student_count loop
        if class_date < today and (idx + weeks_ago) % 4 = 0 then
          continue;
        end if;
        if class_date >= today and idx > 2 then
          continue;
        end if;
        mark_student := class_row.students[idx];
        select e.id into enrollment_id
        from public.enrollments e
        where e.activity_id = class_row.activity_id
          and e.student_id = mark_student
          and e.status = 'active';
        insert into public.attendance_marks (session_id, student_id, enrollment_id, method, marked_by, marked_at)
        values (
          session_id,
          mark_student,
          enrollment_id,
          case when idx % 2 = 0 then 'qr' else 'manual' end,
          class_row.teacher_id,
          starts + (idx || ' minutes')::interval
        );
      end loop;
    end loop;
  end loop;

  drop table if exists seed_periods;
  create temp table seed_periods (
    activity_slug text,
    period_index int,
    period_start date,
    period_end date,
    due_date date
  );

  insert into seed_periods (activity_slug, period_index, period_start, period_end, due_date)
  select monthly.slug, monthly.p_idx, monthly.p_start, (monthly.p_start + interval '1 month' - interval '1 day')::date, monthly.p_start
  from (values
    ('grupo-kids', 0, month_2),
    ('grupo-kids', 1, month_1),
    ('grupo-kids', 2, month0),
    ('grupo-kids', 3, month1),
    ('jovenes-y-adultos', 0, month_2),
    ('jovenes-y-adultos', 1, month_1),
    ('jovenes-y-adultos', 2, month0),
    ('jovenes-y-adultos', 3, month1)
  ) as monthly(slug, p_idx, p_start);

  insert into seed_periods (activity_slug, period_index, period_start, period_end, due_date)
  select biweekly.slug, biweekly.p_idx, biweekly.p_start, biweekly.p_start + 14, biweekly.p_start
  from (values
    ('grupo-kids-domingo', 0, bio0),
    ('grupo-kids-domingo', 1, bio1),
    ('grupo-kids-domingo', 2, bio2),
    ('grupo-kids-domingo', 3, bio3),
    ('jovenes-domingo', 0, bio0),
    ('jovenes-domingo', 1, bio1),
    ('jovenes-domingo', 2, bio2),
    ('jovenes-domingo', 3, bio3)
  ) as biweekly(slug, p_idx, p_start);

  insert into public.fees (
    enrollment_id, student_id, activity_id, period_start, period_end, due_date,
    amount_cents, currency, billing_frequency, status
  )
  select
    e.id,
    e.student_id,
    e.activity_id,
    per.period_start,
    per.period_end,
    per.due_date,
    a.price_cents,
    'ARS',
    a.billing_frequency,
    'pending'
  from public.enrollments e
  join public.activities a on a.id = e.activity_id
  join seed_periods per on per.activity_slug = a.slug
  where e.status = 'active';

  drop table if exists seed_pay;
  create temp table seed_pay (
    email text,
    slug text,
    period_index int,
    pay_kind text,
    receipt text
  );

  insert into seed_pay (email, slug, period_index, pay_kind, receipt) values
    ('sofia.herrera@musicalclub.test', 'grupo-kids', 0, 'mp', null),
    ('sofia.herrera@musicalclub.test', 'grupo-kids', 1, 'mp', null),
    ('sofia.herrera@musicalclub.test', 'grupo-kids', 2, 'mp_today', null),
    ('benjamin.castro@musicalclub.test', 'grupo-kids', 0, 'mp', null),
    ('emma.lopez@musicalclub.test', 'grupo-kids', 0, 'mp', null),
    ('emma.lopez@musicalclub.test', 'grupo-kids', 1, 'cash_gaby', 'REC-1101'),
    ('thiago.romero@musicalclub.test', 'grupo-kids', 0, 'mp', null),
    ('thiago.romero@musicalclub.test', 'grupo-kids', 1, 'void_santiago', 'REC-1048'),
    ('olivia.suarez@musicalclub.test', 'grupo-kids', 0, 'mp', null),
    ('olivia.suarez@musicalclub.test', 'grupo-kids', 1, 'mp', null),
    ('olivia.suarez@musicalclub.test', 'grupo-kids', 3, 'partial_santiago', 'REC-2201'),
    ('joaquin.pereyra@musicalclub.test', 'grupo-kids', 0, 'mp', null),
    ('joaquin.pereyra@musicalclub.test', 'grupo-kids', 1, 'cash_santiago', 'REC-1102'),
    ('joaquin.pereyra@musicalclub.test', 'grupo-kids', 2, 'mp_today', null),
    ('joaquin.pereyra@musicalclub.test', 'grupo-kids-domingo', 0, 'mp', null),
    ('joaquin.pereyra@musicalclub.test', 'grupo-kids-domingo', 1, 'cash_santiago', 'REC-1103'),
    ('mia.fernandez@musicalclub.test', 'grupo-kids-domingo', 0, 'mp', null),
    ('mia.fernandez@musicalclub.test', 'grupo-kids-domingo', 2, 'rejected', null),
    ('santino.diaz@musicalclub.test', 'grupo-kids-domingo', 0, 'cash_gaby', 'REC-1104'),
    ('santino.diaz@musicalclub.test', 'grupo-kids-domingo', 1, 'mp', null),
    ('martina.gomez@musicalclub.test', 'jovenes-y-adultos', 0, 'mp', null),
    ('martina.gomez@musicalclub.test', 'jovenes-y-adultos', 1, 'mp', null),
    ('martina.gomez@musicalclub.test', 'jovenes-y-adultos', 2, 'mp_today', null),
    ('franco.iglesias@musicalclub.test', 'jovenes-y-adultos', 0, 'mp', null),
    ('camila.ortiz@musicalclub.test', 'jovenes-y-adultos', 0, 'cash_gaby', 'REC-1105'),
    ('camila.ortiz@musicalclub.test', 'jovenes-y-adultos', 1, 'mp', null),
    ('nicolas.vega@musicalclub.test', 'jovenes-y-adultos', 0, 'mp', null),
    ('nicolas.vega@musicalclub.test', 'jovenes-y-adultos', 1, 'cash_santiago', 'REC-1106'),
    ('julieta.paredes@musicalclub.test', 'jovenes-y-adultos', 0, 'mp', null),
    ('julieta.paredes@musicalclub.test', 'jovenes-y-adultos', 1, 'mp', null),
    ('julieta.paredes@musicalclub.test', 'jovenes-y-adultos', 2, 'mp_today', null),
    ('julieta.paredes@musicalclub.test', 'jovenes-domingo', 0, 'mp', null),
    ('julieta.paredes@musicalclub.test', 'jovenes-domingo', 1, 'cash_gaby', 'REC-1107'),
    ('agustin.molina@musicalclub.test', 'jovenes-domingo', 0, 'mp', null),
    ('renata.acosta@musicalclub.test', 'jovenes-domingo', 0, 'mp', null),
    ('renata.acosta@musicalclub.test', 'jovenes-domingo', 1, 'cash_santiago', 'REC-1108');

  insert into public.payments (
    fee_id,
    student_id,
    amount_cents,
    currency,
    method,
    status,
    paid_at,
    received_by,
    note,
    receipt_number,
    mp_preference_id,
    mp_payment_id,
    mp_status,
    created_by
  )
  select
    f.id,
    f.student_id,
    case when pay.pay_kind = 'partial_santiago' then f.amount_cents / 2 else f.amount_cents end,
    'ARS',
    case when pay.pay_kind in ('mp', 'mp_today', 'rejected') then 'mercadopago' else 'efectivo' end,
    case when pay.pay_kind = 'rejected' then 'rejected' else 'approved' end,
    case
      when pay.pay_kind = 'rejected' then null
      when pay.pay_kind in ('mp_today', 'cash_santiago', 'cash_gaby', 'partial_santiago', 'void_santiago')
        then (today::timestamp + time '18:05') at time zone 'America/Argentina/Buenos_Aires'
      else ((least(f.due_date + 2, today))::timestamp + time '11:20') at time zone 'America/Argentina/Buenos_Aires'
    end,
    case
      when pay.pay_kind in ('cash_santiago', 'partial_santiago', 'void_santiago') then santiago
      when pay.pay_kind = 'cash_gaby' then gaby
      else null
    end,
    case
      when pay.pay_kind in ('cash_santiago', 'cash_gaby', 'partial_santiago', 'void_santiago') then 'Abonó en efectivo en el Club House'
      when pay.pay_kind = 'rejected' then 'El medio de pago fue rechazado'
      else null
    end,
    pay.receipt,
    case when pay.pay_kind in ('mp', 'mp_today', 'rejected') then 'seed-pref-' || substr(md5(f.id::text), 1, 12) else null end,
    case when pay.pay_kind in ('mp', 'mp_today', 'rejected') then 'seed-mp-' || substr(md5(f.id::text || pay.pay_kind), 1, 16) else null end,
    case
      when pay.pay_kind = 'rejected' then 'rejected'
      when pay.pay_kind in ('mp', 'mp_today') then 'approved'
      else null
    end,
    case
      when pay.pay_kind in ('cash_santiago', 'partial_santiago', 'void_santiago') then santiago
      when pay.pay_kind = 'cash_gaby' then gaby
      else f.student_id
    end
  from seed_pay pay
  join seed_people person_row on person_row.email = pay.email
  join public.activities a on a.slug = pay.slug
  join seed_periods per on per.activity_slug = pay.slug and per.period_index = pay.period_index
  join public.fees f
    on f.student_id = person_row.id
   and f.activity_id = a.id
   and f.period_start = per.period_start;

  for fee_row in
    select f.id
    from public.fees f
    join public.activities a on a.id = f.activity_id
    where a.slug in ('grupo-kids', 'grupo-kids-domingo', 'jovenes-y-adultos', 'jovenes-domingo')
  loop
    perform private.recompute_fee(fee_row.id);
  end loop;

  update public.payments
  set
    status = 'void',
    voided_by = santiago,
    void_reason = 'Recibo duplicado, se anula este registro.',
    voided_at = now()
  where receipt_number = 'REC-1048'
    and status = 'approved';

  delete from public.inquiries
  where email in ('carolina.herrera@country-demo.test', 'administracion@losalamos-demo.test');

  insert into public.inquiries (name, email, phone, community, message, created_at) values
    (
      'Carolina Herrera',
      'carolina.herrera@country-demo.test',
      '+54 9 11 5555-0101',
      'Country San Isidro',
      'Hola, quiero sumar a Sofía al Grupo Kids de los sábados. ¿El encuentro sigue siendo en el salón del Club House?',
      now() - interval '6 days'
    ),
    (
      'Administración Los Álamos',
      'administracion@losalamos-demo.test',
      '+54 9 11 4444-0900',
      'Barrio Cerrado Los Álamos',
      'Nos interesa incorporar Musical Club como actividad del fin de semana para propietarios e invitados. ¿Nos pueden pasar la modalidad institucional?',
      now() - interval '1 day'
    );
end
$seed$;
