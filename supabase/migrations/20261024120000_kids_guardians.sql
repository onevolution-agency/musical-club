-- Cuentas Kids (6 a 12) sin usuario de Auth.
-- No aplicar en producción desde el agente: corre esta migración al mergear.
--
-- Un kid es un perfil con el mismo id para siempre. Liberar inserta auth.users
-- con ese id y deja el historial (inscripciones, asistencia, cuotas, pagos).
-- Desvincular no borra movimientos. El rastro queda en guardian_audit.

create extension if not exists pgcrypto with schema extensions;

alter table public.profiles drop constraint if exists profiles_id_fkey;

alter table public.profiles
  add column if not exists account_kind text not null default 'user';

alter table public.profiles drop constraint if exists profiles_account_kind_check;
alter table public.profiles
  add constraint profiles_account_kind_check check (account_kind in ('user', 'kid'));

create or replace function private.delete_profile_with_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.profiles where id = old.id;
  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function private.delete_profile_with_user();

create or replace function private.kid_birth_ok(birth date)
returns boolean
language sql
stable
as $$
  select birth is not null
    and birth <= ((timezone('America/Argentina/Buenos_Aires', now()))::date - interval '6 years')
    and birth > ((timezone('America/Argentina/Buenos_Aires', now()))::date - interval '13 years');
$$;

create or replace function private.guard_profile_kind()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.account_kind is distinct from old.account_kind then
    if coalesce((select auth.role()), '') <> 'service_role'
       and coalesce(current_setting('app.kid_write', true), '') <> '1'
       and not private.is_super_admin() then
      raise exception 'No podés cambiar el tipo de cuenta';
    end if;
  end if;
  if new.account_kind = 'kid' and new.email is not null then
    raise exception 'Un kid no tiene mail';
  end if;
  if new.account_kind = 'kid' and new.role <> 'student' then
    raise exception 'Un kid es alumno';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_kind on public.profiles;
create trigger profiles_guard_kind
  before insert or update on public.profiles
  for each row execute function private.guard_profile_kind();

create table if not exists public.guardianships (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  child_id uuid not null references public.profiles (id) on delete cascade,
  barrio_id uuid not null references public.barrios (id),
  access text not null default 'manager' check (access in ('manager', 'contact')),
  created_at timestamptz not null default now(),
  unique (guardian_id, child_id)
);

create table if not exists public.guardian_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  child_id uuid not null references public.profiles (id) on delete cascade,
  barrio_id uuid not null references public.barrios (id),
  invited_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.guardian_audit (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles (id) on delete cascade,
  guardian_id uuid references public.profiles (id) on delete set null,
  actor_id uuid references public.profiles (id) on delete set null,
  barrio_id uuid references public.barrios (id),
  action text not null check (action in ('create', 'link', 'unlink', 'release')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists guardianships_child_idx on public.guardianships (child_id);
create index if not exists guardianships_guardian_idx on public.guardianships (guardian_id);
create index if not exists guardian_invites_email_idx on public.guardian_invites (lower(email));
create index if not exists guardian_audit_child_idx on public.guardian_audit (child_id);

create or replace function private.manages_child(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.guardianships g
    where g.child_id = target
      and g.guardian_id = (select auth.uid())
      and g.access = 'manager'
      and private.sees_barrio(g.barrio_id)
  );
$$;

create or replace function private.child_barrio(target uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select g.barrio_id
  from public.guardianships g
  where g.child_id = target
  order by case when g.access = 'manager' then 0 else 1 end, g.created_at
  limit 1;
$$;

create or replace function private.can_read_profile(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target = (select auth.uid())
    or private.is_super_admin()
    or exists (
      select 1
      from public.barrio_memberships mine
      join public.barrio_memberships theirs on theirs.barrio_id = mine.barrio_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id = target
        and (
          mine.role = 'admin'
          or (mine.role = 'teacher' and theirs.role = 'student')
        )
    )
    or exists (
      select 1
      from public.guardianships g
      where g.child_id = target
        and g.guardian_id = (select auth.uid())
        and private.sees_barrio(g.barrio_id)
    )
    or exists (
      select 1
      from public.guardianships mine
      join public.guardianships theirs on theirs.child_id = mine.child_id
      where mine.guardian_id = (select auth.uid())
        and theirs.guardian_id = target
        and private.sees_barrio(mine.barrio_id)
    );
$$;

create or replace function private.accept_guardian_invites(uid uuid, mail text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.guardian_invites;
begin
  if mail is null or uid is null then
    return;
  end if;
  for invite in
    select * from public.guardian_invites
    where lower(email) = lower(mail) and accepted_at is null
  loop
    if not exists (
      select 1 from public.barrio_memberships m
      where m.user_id = uid and m.barrio_id = invite.barrio_id
    ) then
      insert into public.barrio_memberships (user_id, barrio_id, role)
      values (uid, invite.barrio_id, 'student');
    end if;
    insert into public.guardianships (guardian_id, child_id, barrio_id, access)
    values (uid, invite.child_id, invite.barrio_id, 'manager')
    on conflict (guardian_id, child_id) do update
      set access = 'manager', barrio_id = excluded.barrio_id;
    insert into public.guardian_audit (child_id, guardian_id, actor_id, barrio_id, action, note)
    values (invite.child_id, uid, uid, invite.barrio_id, 'link', invite.email);
    update public.guardian_invites set accepted_at = now() where id = invite.id;
  end loop;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invited_role text;
  invited_name text;
  invited_barrio uuid;
  chosen uuid;
begin
  if exists (select 1 from public.profiles where id = new.id) then
    perform set_config('app.kid_write', '1', true);
    update public.profiles
      set email = new.email,
          account_kind = 'user',
          full_name = coalesce(nullif(full_name, ''), nullif(new.raw_user_meta_data ->> 'full_name', ''), full_name)
      where id = new.id;
    perform private.accept_guardian_invites(new.id, new.email);
    return new;
  end if;

  select role, full_name, barrio_id into invited_role, invited_name, invited_barrio
  from public.staff_invites
  where lower(email) = lower(new.email)
    and accepted_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if invited_role is null and nullif(new.raw_user_meta_data ->> 'barrio_slug', '') is not null then
    select id into chosen
    from public.barrios
    where slug = new.raw_user_meta_data ->> 'barrio_slug'
      and active
    limit 1;
  end if;

  insert into public.profiles (id, role, full_name, email, current_barrio_id)
  values (
    new.id,
    coalesce(invited_role, 'student'),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), invited_name, ''),
    new.email,
    coalesce(invited_barrio, chosen)
  );

  if invited_role is not null and invited_barrio is not null then
    insert into public.barrio_memberships (user_id, barrio_id, role)
    values (new.id, invited_barrio, invited_role)
    on conflict (user_id, barrio_id) do nothing;
  elsif chosen is not null then
    insert into public.barrio_memberships (user_id, barrio_id, role)
    values (new.id, chosen, 'student')
    on conflict (user_id, barrio_id) do nothing;
  end if;

  if invited_role is not null then
    update public.staff_invites
      set accepted_at = now()
      where lower(email) = lower(new.email)
        and accepted_at is null;
  end if;

  perform private.accept_guardian_invites(new.id, new.email);
  return new;
end;
$$;

create or replace function private.assert_child_access(target uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  barrio uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'No autorizado';
  end if;
  if not exists (select 1 from public.profiles where id = target and account_kind = 'kid') then
    raise exception 'No encontramos a ese chico';
  end if;
  barrio := private.child_barrio(target);
  if barrio is null then
    select m.barrio_id into barrio
    from public.barrio_memberships m
    where m.user_id = target and m.role = 'student'
    limit 1;
  end if;
  if not (private.manages_child(target) or private.is_barrio_admin(barrio)) then
    raise exception 'No autorizado';
  end if;
  return barrio;
end;
$$;

create or replace function public.create_child(
  first_name text,
  last_name text,
  birth_date date,
  barrio_id uuid,
  guardian_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  child uuid := extensions.gen_random_uuid();
  guardian uuid := coalesce(guardian_id, (select auth.uid()));
  name text;
begin
  if (select auth.uid()) is null or not private.sees_barrio(barrio_id) then
    raise exception 'No autorizado';
  end if;
  if guardian is distinct from (select auth.uid()) and not private.is_barrio_admin(barrio_id) then
    raise exception 'No autorizado';
  end if;
  if not exists (
    select 1 from public.profiles where id = guardian and account_kind = 'user'
  ) then
    raise exception 'Ese responsable no tiene cuenta';
  end if;
  if not private.kid_birth_ok(birth_date) then
    raise exception 'La edad tiene que ser de 6 a 12.';
  end if;
  if char_length(trim(coalesce(first_name, ''))) < 1 or char_length(trim(coalesce(last_name, ''))) < 1 then
    raise exception 'Completá nombre y apellido.';
  end if;
  name := trim(first_name) || ' ' || trim(last_name);

  insert into public.profiles (id, role, full_name, email, birth_date, account_kind, current_barrio_id)
  values (child, 'student', name, null, create_child.birth_date, 'kid', create_child.barrio_id);

  insert into public.barrio_memberships (user_id, barrio_id, role)
  values (child, create_child.barrio_id, 'student')
  on conflict (user_id, barrio_id) do nothing;

  if not exists (
    select 1 from public.barrio_memberships m
    where m.user_id = guardian and m.barrio_id = create_child.barrio_id
  ) then
    insert into public.barrio_memberships (user_id, barrio_id, role)
    values (guardian, create_child.barrio_id, 'student');
  end if;

  insert into public.guardianships (guardian_id, child_id, barrio_id, access)
  values (guardian, child, create_child.barrio_id, 'manager');

  insert into public.guardian_audit (child_id, guardian_id, actor_id, barrio_id, action, note)
  values
    (child, guardian, (select auth.uid()), create_child.barrio_id, 'create', name),
    (child, guardian, (select auth.uid()), create_child.barrio_id, 'link', null);
  return child;
end;
$$;

create or replace function public.update_child(
  child_id uuid,
  first_name text,
  last_name text,
  birth_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_birth date;
begin
  perform private.assert_child_access(child_id);
  select profiles.birth_date into current_birth from public.profiles where id = child_id;
  if update_child.birth_date is distinct from current_birth and not private.kid_birth_ok(update_child.birth_date) then
    raise exception 'La edad tiene que ser de 6 a 12.';
  end if;
  if char_length(trim(coalesce(first_name, ''))) < 1 or char_length(trim(coalesce(last_name, ''))) < 1 then
    raise exception 'Completá nombre y apellido.';
  end if;
  update public.profiles
    set full_name = trim(first_name) || ' ' || trim(last_name),
        birth_date = update_child.birth_date
    where id = child_id and account_kind = 'kid';
end;
$$;

create or replace function public.invite_guardian(child_id uuid, email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  barrio uuid;
  mail text := lower(trim(coalesce(email, '')));
  existing uuid;
begin
  barrio := private.assert_child_access(child_id);
  if position('@' in mail) < 2 then
    raise exception 'El mail no es válido.';
  end if;
  select id into existing from public.profiles where lower(profiles.email) = mail limit 1;
  if existing is not null then
    if exists (select 1 from public.profiles where id = existing and account_kind = 'kid') then
      raise exception 'Ese mail es de un kid';
    end if;
    if not exists (
      select 1 from public.barrio_memberships m
      where m.user_id = existing and m.barrio_id = barrio
    ) then
      insert into public.barrio_memberships (user_id, barrio_id, role)
      values (existing, barrio, 'student');
    end if;
    insert into public.guardianships (guardian_id, child_id, barrio_id, access)
    values (existing, child_id, barrio, 'manager')
    on conflict (guardian_id, child_id) do update
      set access = 'manager', barrio_id = excluded.barrio_id;
    insert into public.guardian_audit (child_id, guardian_id, actor_id, barrio_id, action, note)
    values (child_id, existing, (select auth.uid()), barrio, 'link', mail);
    return;
  end if;
  if exists (
    select 1 from public.guardian_invites
    where guardian_invites.child_id = invite_guardian.child_id
      and lower(guardian_invites.email) = mail
      and accepted_at is null
  ) then
    return;
  end if;
  insert into public.guardian_invites (email, child_id, barrio_id, invited_by)
  values (mail, child_id, barrio, (select auth.uid()));
  insert into public.guardian_audit (child_id, actor_id, barrio_id, action, note)
  values (child_id, (select auth.uid()), barrio, 'link', mail);
end;
$$;

create or replace function public.unlink_guardian(child_id uuid, guardian_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  barrio uuid;
  link_access text;
  managers int;
begin
  if (select auth.uid()) is null then
    raise exception 'No autorizado';
  end if;
  select g.barrio_id, g.access into barrio, link_access
  from public.guardianships g
  where g.child_id = unlink_guardian.child_id
    and g.guardian_id = unlink_guardian.guardian_id;
  if barrio is null then
    raise exception 'No encontramos ese vínculo';
  end if;
  if not (
    private.manages_child(child_id)
    or private.is_barrio_admin(barrio)
    or (select auth.uid()) = unlink_guardian.guardian_id
  ) then
    raise exception 'No autorizado';
  end if;
  if link_access = 'manager' then
    select count(*) into managers
    from public.guardianships g
    where g.child_id = unlink_guardian.child_id and g.access = 'manager';
    if managers <= 1 and not private.is_barrio_admin(barrio) then
      raise exception 'Tiene que quedar un responsable';
    end if;
  end if;
  insert into public.guardian_audit (child_id, guardian_id, actor_id, barrio_id, action)
  values (child_id, unlink_guardian.guardian_id, (select auth.uid()), barrio, 'unlink');
  delete from public.guardianships g
  where g.child_id = unlink_guardian.child_id
    and g.guardian_id = unlink_guardian.guardian_id;
end;
$$;

create or replace function public.release_child(child_id uuid, email text, password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  barrio uuid;
  mail text := lower(trim(coalesce(email, '')));
  secret text;
  child uuid := child_id;
begin
  barrio := private.assert_child_access(child);
  if position('@' in mail) < 2 then
    raise exception 'El mail no es válido.';
  end if;
  if exists (select 1 from auth.users where lower(auth.users.email) = mail)
     or exists (
       select 1 from public.profiles
       where lower(profiles.email) = mail and profiles.id <> child
     ) then
    raise exception 'Ese mail ya tiene cuenta';
  end if;
  if char_length(coalesce(password, '')) > 0 and char_length(password) < 8 then
    raise exception 'La contraseña tiene que tener 8 caracteres.';
  end if;
  secret := case
    when char_length(coalesce(password, '')) = 0 then gen_random_uuid()::text
    else password
  end;

  perform set_config('app.kid_write', '1', true);

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
  values (
    '00000000-0000-0000-0000-000000000000',
    child,
    'authenticated',
    'authenticated',
    mail,
    extensions.crypt(secret, extensions.gen_salt('bf')),
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
    jsonb_build_object('full_name', (select full_name from public.profiles where id = child)),
    now(),
    now(),
    false,
    false
  );

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
  values (
    gen_random_uuid(),
    child,
    jsonb_build_object('sub', child::text, 'email', mail, 'email_verified', true),
    'email',
    child::text,
    now(),
    now(),
    now()
  );

  update public.guardianships
    set access = 'contact'
    where guardianships.child_id = child and access = 'manager';

  insert into public.guardian_audit (child_id, actor_id, barrio_id, action, note)
  values (child, (select auth.uid()), barrio, 'release', mail);
end;
$$;

revoke all on function public.create_child(text, text, date, uuid, uuid) from public;
revoke all on function public.update_child(uuid, text, text, date) from public;
revoke all on function public.invite_guardian(uuid, text) from public;
revoke all on function public.unlink_guardian(uuid, uuid) from public;
revoke all on function public.release_child(uuid, text, text) from public;

grant execute on function public.create_child(text, text, date, uuid, uuid) to authenticated;
grant execute on function public.update_child(uuid, text, text, date) to authenticated;
grant execute on function public.invite_guardian(uuid, text) to authenticated;
grant execute on function public.unlink_guardian(uuid, uuid) to authenticated;
grant execute on function public.release_child(uuid, text, text) to authenticated;

alter table public.guardianships enable row level security;
alter table public.guardian_invites enable row level security;
alter table public.guardian_audit enable row level security;

drop policy if exists guardianships_select on public.guardianships;
create policy guardianships_select on public.guardianships
  for select to authenticated
  using (
    guardian_id = (select auth.uid())
    or private.is_barrio_admin(barrio_id)
    or exists (
      select 1
      from public.enrollments e
      where e.student_id = guardianships.child_id
        and e.status in ('active', 'pending', 'completed')
        and private.teaches_activity(e.activity_id)
    )
  );

drop policy if exists guardian_invites_select on public.guardian_invites;
create policy guardian_invites_select on public.guardian_invites
  for select to authenticated
  using (
    invited_by = (select auth.uid())
    or private.is_barrio_admin(barrio_id)
  );

drop policy if exists guardian_audit_select on public.guardian_audit;
create policy guardian_audit_select on public.guardian_audit
  for select to authenticated
  using (
    actor_id = (select auth.uid())
    or guardian_id = (select auth.uid())
    or private.is_barrio_admin(barrio_id)
    or exists (
      select 1 from public.guardianships g
      where g.child_id = guardian_audit.child_id
        and g.guardian_id = (select auth.uid())
    )
  );

drop policy if exists enrollments_select on public.enrollments;
create policy enrollments_select on public.enrollments
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or private.manages_child(student_id)
    or private.is_barrio_admin(barrio_id)
    or private.teaches_activity(activity_id)
  );

drop policy if exists enrollments_insert_student on public.enrollments;
create policy enrollments_insert_student on public.enrollments
  for insert to authenticated
  with check (
    (
      student_id = (select auth.uid())
      or (
        private.manages_child(student_id)
        and exists (
          select 1 from public.guardianships g
          where g.child_id = student_id
            and g.guardian_id = (select auth.uid())
            and g.access = 'manager'
            and g.barrio_id = enrollments.barrio_id
        )
      )
    )
    and private.membership_role(barrio_id) = 'student'
    and status in ('pending', 'active', 'waitlist')
  );

drop policy if exists enrollments_update on public.enrollments;
create policy enrollments_update on public.enrollments
  for update to authenticated
  using (
    student_id = (select auth.uid())
    or private.manages_child(student_id)
    or private.is_barrio_admin(barrio_id)
  )
  with check (
    student_id = (select auth.uid())
    or private.manages_child(student_id)
    or private.is_barrio_admin(barrio_id)
  );

drop policy if exists sessions_select on public.class_sessions;
create policy sessions_select on public.class_sessions
  for select to authenticated
  using (
    private.is_barrio_admin(barrio_id)
    or private.teaches_activity(activity_id)
    or exists (
      select 1 from public.enrollments e
      where e.activity_id = class_sessions.activity_id
        and (
          e.student_id = (select auth.uid())
          or private.manages_child(e.student_id)
        )
        and e.status in ('active', 'pending', 'completed')
    )
  );

drop policy if exists attendance_select on public.attendance_marks;
create policy attendance_select on public.attendance_marks
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or private.manages_child(student_id)
    or private.is_barrio_admin(barrio_id)
    or exists (
      select 1 from public.class_sessions s
      where s.id = attendance_marks.session_id
        and private.teaches_activity(s.activity_id)
    )
  );

drop policy if exists fees_select on public.fees;
create policy fees_select on public.fees
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or private.manages_child(student_id)
    or private.is_barrio_admin(barrio_id)
    or private.teaches_activity(activity_id)
  );

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or private.manages_child(student_id)
    or private.is_barrio_admin(barrio_id)
  );

drop policy if exists payments_insert_mp on public.payments;
create policy payments_insert_mp on public.payments
  for insert to authenticated
  with check (
    method = 'mercadopago'
    and status = 'pending'
    and received_by is null
    and created_by = (select auth.uid())
    and (
      (
        student_id = (select auth.uid())
        and private.membership_role(barrio_id) = 'student'
      )
      or private.manages_child(student_id)
    )
    and exists (
      select 1 from public.fees f
      where f.id = fee_id
        and f.student_id = payments.student_id
        and f.barrio_id = payments.barrio_id
        and f.status in ('pending', 'partial', 'overdue')
    )
  );
