-- Multi-tenant barrios, memberships, and avatar storage rules.
-- Backfills existing rows into El Talar. Do not apply this file to production
-- until the pull request is approved.

create table public.barrios (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  active boolean not null default true,
  default_price_cents integer not null default 0 check (default_price_cents >= 0),
  default_billing_frequency text not null default 'monthly' check (default_billing_frequency in ('monthly', 'biweekly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger barrios_updated before update on public.barrios
  for each row execute function private.set_updated_at();

insert into public.barrios (id, slug, name, active, default_price_cents, default_billing_frequency)
values ('b1000000-0000-4000-8000-000000000001', 'el-talar', 'El Talar', true, 4500000, 'monthly')
on conflict (slug) do nothing;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student', 'teacher', 'admin', 'super_admin'));

alter table public.profiles
  add column if not exists current_barrio_id uuid references public.barrios (id) on delete set null;

create table public.barrio_memberships (
  user_id uuid not null references public.profiles (id) on delete cascade,
  barrio_id uuid not null references public.barrios (id) on delete cascade,
  role text not null check (role in ('student', 'teacher', 'admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, barrio_id)
);

create index barrio_memberships_barrio_idx on public.barrio_memberships (barrio_id, role);

alter table public.staff_invites
  add column if not exists barrio_id uuid references public.barrios (id) on delete set null;

alter table public.activities add column if not exists barrio_id uuid references public.barrios (id);
alter table public.activity_teachers add column if not exists barrio_id uuid references public.barrios (id);
alter table public.enrollments add column if not exists barrio_id uuid references public.barrios (id);
alter table public.class_sessions add column if not exists barrio_id uuid references public.barrios (id);
alter table public.attendance_marks add column if not exists barrio_id uuid references public.barrios (id);
alter table public.fees add column if not exists barrio_id uuid references public.barrios (id);
alter table public.payments add column if not exists barrio_id uuid references public.barrios (id);
alter table public.inquiries add column if not exists barrio_id uuid references public.barrios (id) on delete set null;

update public.activities set barrio_id = 'b1000000-0000-4000-8000-000000000001' where barrio_id is null;
update public.activity_teachers t
  set barrio_id = a.barrio_id
  from public.activities a
  where t.activity_id = a.id and t.barrio_id is null;
update public.enrollments e
  set barrio_id = a.barrio_id
  from public.activities a
  where e.activity_id = a.id and e.barrio_id is null;
update public.class_sessions s
  set barrio_id = a.barrio_id
  from public.activities a
  where s.activity_id = a.id and s.barrio_id is null;
update public.attendance_marks m
  set barrio_id = s.barrio_id
  from public.class_sessions s
  where m.session_id = s.id and m.barrio_id is null;
update public.fees f
  set barrio_id = e.barrio_id
  from public.enrollments e
  where f.enrollment_id = e.id and f.barrio_id is null;
update public.payments p
  set barrio_id = f.barrio_id
  from public.fees f
  where p.fee_id = f.id and p.barrio_id is null;

alter table public.activities alter column barrio_id set not null;
alter table public.activity_teachers alter column barrio_id set not null;
alter table public.enrollments alter column barrio_id set not null;
alter table public.class_sessions alter column barrio_id set not null;
alter table public.attendance_marks alter column barrio_id set not null;
alter table public.fees alter column barrio_id set not null;
alter table public.payments alter column barrio_id set not null;

alter table public.activities drop constraint if exists activities_slug_key;
create unique index if not exists activities_barrio_slug_uidx on public.activities (barrio_id, slug);
create index if not exists activities_barrio_idx on public.activities (barrio_id, status);
create index if not exists enrollments_barrio_idx on public.enrollments (barrio_id, status);
create index if not exists fees_barrio_idx on public.fees (barrio_id, status);
create index if not exists payments_barrio_idx on public.payments (barrio_id, method, status);
create index if not exists sessions_barrio_idx on public.class_sessions (barrio_id, starts_at desc);

insert into public.barrio_memberships (user_id, barrio_id, role)
select id, 'b1000000-0000-4000-8000-000000000001',
  case when role = 'super_admin' then 'admin' else role end
from public.profiles
on conflict (user_id, barrio_id) do nothing;

update public.profiles
set role = 'super_admin'
where lower(email) in ('santiago.errecalde@musicalclub.test', 'gaby.bibas@musicalclub.test');

update public.profiles
set current_barrio_id = 'b1000000-0000-4000-8000-000000000001'
where current_barrio_id is null;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function private.sees_barrio(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin() or exists (
    select 1 from public.barrio_memberships
    where user_id = auth.uid() and barrio_id = target
  );
$$;

create or replace function private.is_barrio_admin(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin() or exists (
    select 1 from public.barrio_memberships
    where user_id = auth.uid() and barrio_id = target and role = 'admin'
  );
$$;

create or replace function private.membership_role(target uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.barrio_memberships
  where user_id = auth.uid() and barrio_id = target;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin() or exists (
    select 1 from public.barrio_memberships
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function private.teaches_activity(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.activity_teachers t
    join public.activities a on a.id = t.activity_id
    where t.activity_id = target
      and t.teacher_id = auth.uid()
      and private.sees_barrio(a.barrio_id)
  );
$$;

create or replace function private.stamp_activity_barrio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.barrio_id is null then
    select barrio_id into new.barrio_id from public.activities where id = new.activity_id;
  end if;
  return new;
end;
$$;

create or replace function private.stamp_enrollment_barrio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.barrio_id is null then
    select barrio_id into new.barrio_id from public.enrollments where id = new.enrollment_id;
  end if;
  return new;
end;
$$;

create or replace function private.stamp_fee_barrio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.barrio_id is null then
    select barrio_id into new.barrio_id from public.fees where id = new.fee_id;
  end if;
  return new;
end;
$$;

create or replace function private.stamp_session_barrio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.barrio_id is null then
    select barrio_id into new.barrio_id from public.class_sessions where id = new.session_id;
  end if;
  return new;
end;
$$;

drop trigger if exists activity_teachers_barrio on public.activity_teachers;
create trigger activity_teachers_barrio before insert on public.activity_teachers
  for each row execute function private.stamp_activity_barrio();
drop trigger if exists enrollments_barrio on public.enrollments;
create trigger enrollments_barrio before insert on public.enrollments
  for each row execute function private.stamp_activity_barrio();
drop trigger if exists sessions_barrio on public.class_sessions;
create trigger sessions_barrio before insert on public.class_sessions
  for each row execute function private.stamp_activity_barrio();
drop trigger if exists fees_barrio on public.fees;
create trigger fees_barrio before insert on public.fees
  for each row execute function private.stamp_enrollment_barrio();
drop trigger if exists payments_barrio on public.payments;
create trigger payments_barrio before insert on public.payments
  for each row execute function private.stamp_fee_barrio();
drop trigger if exists attendance_barrio on public.attendance_marks;
create trigger attendance_barrio before insert on public.attendance_marks
  for each row execute function private.stamp_session_barrio();

create or replace function private.guard_current_barrio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.current_barrio_id is not distinct from old.current_barrio_id then
    return new;
  end if;
  if coalesce(auth.role(), '') = 'service_role' or private.is_super_admin() or new.current_barrio_id is null then
    return new;
  end if;
  if not private.sees_barrio(new.current_barrio_id) then
    raise exception 'No pertenecés a ese barrio';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_barrio_guard on public.profiles;
create trigger profiles_barrio_guard
  before update on public.profiles
  for each row execute function private.guard_current_barrio();

create or replace function private.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    if coalesce(auth.role(), '') = 'service_role' or private.is_super_admin() then
      return new;
    end if;
    raise exception 'No podés cambiar el rol';
  end if;
  return new;
end;
$$;

create or replace function private.guard_enrollment_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or private.is_barrio_admin(coalesce(new.barrio_id, old.barrio_id)) then
    return new;
  end if;
  if new.student_id is distinct from old.student_id
     or new.activity_id is distinct from old.activity_id
     or new.barrio_id is distinct from old.barrio_id
     or new.starts_on is distinct from old.starts_on
     or new.notes is distinct from old.notes then
    raise exception 'No podés modificar esa inscripción';
  end if;
  if new.status is distinct from old.status and new.status <> 'cancelled' then
    raise exception 'Solo podés cancelar tu inscripción';
  end if;
  return new;
end;
$$;

create or replace function private.guard_payment_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if not private.is_barrio_admin(old.barrio_id) then
    raise exception 'No autorizado';
  end if;
  if old.status = 'void' then
    raise exception 'El pago ya está anulado';
  end if;
  if new.status <> 'void' then
    raise exception 'Solo se puede anular el pago';
  end if;
  if new.method is distinct from old.method
     or new.amount_cents is distinct from old.amount_cents
     or new.fee_id is distinct from old.fee_id
     or new.student_id is distinct from old.student_id
     or new.barrio_id is distinct from old.barrio_id then
    raise exception 'No se puede modificar el pago';
  end if;
  if new.voided_by is distinct from auth.uid() then
    raise exception 'El admin que anula tiene que quedar registrado';
  end if;
  if new.void_reason is null or char_length(trim(new.void_reason)) < 3 then
    raise exception 'Indicá el motivo de la anulación';
  end if;
  if new.voided_at is null then
    new.voided_at := now();
  end if;
  return new;
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
  return new;
end;
$$;

alter table public.barrios enable row level security;
alter table public.barrio_memberships enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or private.is_super_admin()
    or exists (
      select 1
      from public.barrio_memberships mine
      join public.barrio_memberships theirs on theirs.barrio_id = mine.barrio_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profiles.id
        and (mine.role = 'admin' or (mine.role = 'teacher' and theirs.role = 'student'))
    )
  );

drop policy if exists barrios_select on public.barrios;
create policy barrios_select on public.barrios
  for select to anon, authenticated
  using (active or private.is_super_admin() or private.sees_barrio(id));

drop policy if exists barrios_insert on public.barrios;
create policy barrios_insert on public.barrios
  for insert to authenticated
  with check (private.is_super_admin());

drop policy if exists barrios_update on public.barrios;
create policy barrios_update on public.barrios
  for update to authenticated
  using (private.is_barrio_admin(id))
  with check (private.is_barrio_admin(id));

drop policy if exists barrios_delete on public.barrios;
create policy barrios_delete on public.barrios
  for delete to authenticated
  using (private.is_super_admin());

drop policy if exists memberships_select on public.barrio_memberships;
create policy memberships_select on public.barrio_memberships
  for select to authenticated
  using (
    user_id = auth.uid()
    or private.is_barrio_admin(barrio_id)
  );

drop policy if exists memberships_write on public.barrio_memberships;
create policy memberships_write on public.barrio_memberships
  for all to authenticated
  using (private.is_barrio_admin(barrio_id))
  with check (private.is_barrio_admin(barrio_id) and role in ('student', 'teacher', 'admin'));

drop policy if exists invites_admin on public.staff_invites;
create policy invites_admin on public.staff_invites
  for all to authenticated
  using (barrio_id is not null and private.is_barrio_admin(barrio_id))
  with check (barrio_id is not null and private.is_barrio_admin(barrio_id) and role in ('teacher', 'admin'));

drop policy if exists activities_select on public.activities;
create policy activities_select on public.activities
  for select to anon
  using (
    status = 'active'
    and exists (select 1 from public.barrios b where b.id = activities.barrio_id and b.active)
  );

drop policy if exists activities_select_auth on public.activities;
create policy activities_select_auth on public.activities
  for select to authenticated
  using (private.sees_barrio(barrio_id) or private.teaches_activity(id) or private.is_barrio_admin(barrio_id));

drop policy if exists activities_admin on public.activities;
create policy activities_admin on public.activities
  for all to authenticated
  using (private.is_barrio_admin(barrio_id))
  with check (private.is_barrio_admin(barrio_id));

drop policy if exists teachers_select on public.activity_teachers;
create policy teachers_select on public.activity_teachers
  for select to authenticated
  using (private.sees_barrio(barrio_id));

drop policy if exists teachers_admin on public.activity_teachers;
create policy teachers_admin on public.activity_teachers
  for all to authenticated
  using (private.is_barrio_admin(barrio_id))
  with check (private.is_barrio_admin(barrio_id));

drop policy if exists enrollments_select on public.enrollments;
create policy enrollments_select on public.enrollments
  for select to authenticated
  using (
    student_id = auth.uid()
    or private.is_barrio_admin(barrio_id)
    or private.teaches_activity(activity_id)
  );

drop policy if exists enrollments_insert_student on public.enrollments;
create policy enrollments_insert_student on public.enrollments
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and private.membership_role(barrio_id) = 'student'
    and status in ('pending', 'active', 'waitlist')
  );

drop policy if exists enrollments_insert_admin on public.enrollments;
create policy enrollments_insert_admin on public.enrollments
  for insert to authenticated
  with check (private.is_barrio_admin(barrio_id));

drop policy if exists enrollments_update on public.enrollments;
create policy enrollments_update on public.enrollments
  for update to authenticated
  using (student_id = auth.uid() or private.is_barrio_admin(barrio_id))
  with check (student_id = auth.uid() or private.is_barrio_admin(barrio_id));

drop policy if exists sessions_select on public.class_sessions;
create policy sessions_select on public.class_sessions
  for select to authenticated
  using (
    private.is_barrio_admin(barrio_id)
    or private.teaches_activity(activity_id)
    or exists (
      select 1 from public.enrollments e
      where e.activity_id = class_sessions.activity_id
        and e.student_id = auth.uid()
        and e.status in ('active', 'pending', 'completed')
    )
  );

drop policy if exists sessions_write on public.class_sessions;
create policy sessions_write on public.class_sessions
  for insert to authenticated
  with check (
    private.is_barrio_admin(barrio_id)
    or (private.membership_role(barrio_id) = 'teacher' and opened_by = auth.uid() and private.teaches_activity(activity_id))
  );

drop policy if exists sessions_update on public.class_sessions;
create policy sessions_update on public.class_sessions
  for update to authenticated
  using (private.is_barrio_admin(barrio_id) or (opened_by = auth.uid() and private.teaches_activity(activity_id)))
  with check (private.is_barrio_admin(barrio_id) or (opened_by = auth.uid() and private.teaches_activity(activity_id)));

drop policy if exists attendance_select on public.attendance_marks;
create policy attendance_select on public.attendance_marks
  for select to authenticated
  using (
    student_id = auth.uid()
    or private.is_barrio_admin(barrio_id)
    or exists (
      select 1 from public.class_sessions s
      where s.id = attendance_marks.session_id
        and private.teaches_activity(s.activity_id)
    )
  );

drop policy if exists attendance_insert on public.attendance_marks;
create policy attendance_insert on public.attendance_marks
  for insert to authenticated
  with check (
    (
      private.is_barrio_admin(barrio_id)
      or exists (
        select 1 from public.class_sessions s
        where s.id = session_id
          and s.status = 'open'
          and private.teaches_activity(s.activity_id)
      )
    )
    and exists (
      select 1
      from public.class_sessions s
      join public.enrollments e on e.activity_id = s.activity_id
      where s.id = session_id
        and e.student_id = attendance_marks.student_id
        and e.status = 'active'
    )
  );

drop policy if exists fees_select on public.fees;
create policy fees_select on public.fees
  for select to authenticated
  using (
    student_id = auth.uid()
    or private.is_barrio_admin(barrio_id)
    or private.teaches_activity(activity_id)
  );

drop policy if exists fees_admin_write on public.fees;
create policy fees_admin_write on public.fees
  for all to authenticated
  using (private.is_barrio_admin(barrio_id))
  with check (private.is_barrio_admin(barrio_id));

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select to authenticated
  using (student_id = auth.uid() or private.is_barrio_admin(barrio_id));

drop policy if exists payments_insert_mp on public.payments;
create policy payments_insert_mp on public.payments
  for insert to authenticated
  with check (
    method = 'mercadopago'
    and status = 'pending'
    and student_id = auth.uid()
    and received_by is null
    and created_by = auth.uid()
    and private.membership_role(barrio_id) = 'student'
    and exists (
      select 1 from public.fees f
      where f.id = fee_id
        and f.student_id = auth.uid()
        and f.barrio_id = payments.barrio_id
        and f.status in ('pending', 'partial', 'overdue')
    )
  );

drop policy if exists payments_insert_cash on public.payments;
create policy payments_insert_cash on public.payments
  for insert to authenticated
  with check (
    private.is_barrio_admin(barrio_id)
    and method = 'efectivo'
    and status = 'approved'
    and received_by = auth.uid()
    and created_by = auth.uid()
  );

drop policy if exists payments_update_admin on public.payments;
create policy payments_update_admin on public.payments
  for update to authenticated
  using (private.is_barrio_admin(barrio_id))
  with check (private.is_barrio_admin(barrio_id));

drop policy if exists audit_select_admin on public.payment_audit;
create policy audit_select_admin on public.payment_audit
  for select to authenticated
  using (
    exists (
      select 1 from public.payments p
      where p.id = payment_audit.payment_id
        and private.is_barrio_admin(p.barrio_id)
    )
  );

drop policy if exists inquiries_select_admin on public.inquiries;
create policy inquiries_select_admin on public.inquiries
  for select to authenticated
  using (
    private.is_super_admin()
    or (barrio_id is not null and private.is_barrio_admin(barrio_id))
  );

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists avatars_owner_insert on storage.objects;
create policy avatars_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists receipts_admin_all on storage.objects;
create policy receipts_admin_all on storage.objects
  for all to authenticated
  using (
    bucket_id = 'receipts'
    and (
      private.is_super_admin()
      or exists (
        select 1 from public.barrio_memberships mine
        join public.barrio_memberships student
          on student.barrio_id = mine.barrio_id
         and student.role = 'student'
         and student.user_id::text = (storage.foldername(name))[1]
        where mine.user_id = auth.uid()
          and mine.role = 'admin'
      )
    )
  )
  with check (
    bucket_id = 'receipts'
    and (
      private.is_super_admin()
      or exists (
        select 1 from public.barrio_memberships mine
        join public.barrio_memberships student
          on student.barrio_id = mine.barrio_id
         and student.role = 'student'
         and student.user_id::text = (storage.foldername(name))[1]
        where mine.user_id = auth.uid()
          and mine.role = 'admin'
      )
    )
  );

grant select on public.barrios to anon, authenticated, service_role;
grant insert, update, delete on public.barrios to authenticated, service_role;
grant select, insert, update, delete on public.barrio_memberships to authenticated, service_role;
