-- Idempotent follow-up. Safe to apply on a database that already ran
-- 20261019043000_barrios_memberships_avatars.sql, including production.
-- Do not re-apply that earlier file there. Its history checksum may differ
-- from this repo copy, and the live schema already matches its end state.
--
-- 1. Teacher class rosters. profiles_select joined barrio_memberships under
--    the caller's RLS, and teachers can only read their own membership. The
--    join returned nothing, so an open roster showed 0 alumnos. can_read_profile
--    is security definer and keeps the same rule.
-- 2. Wrap auth helpers in a scalar subquery for the initplan advisor.
-- 3. Covering indexes for foreign keys the advisor flagged.


create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function private.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_role() = 'teacher', false);
$$;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = (select auth.uid())), false);
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
    where user_id = (select auth.uid()) and barrio_id = target
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
    where user_id = (select auth.uid()) and barrio_id = target and role = 'admin'
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
  where user_id = (select auth.uid()) and barrio_id = target;
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
    where user_id = (select auth.uid()) and role = 'admin'
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
      and t.teacher_id = (select auth.uid())
      and private.sees_barrio(a.barrio_id)
  );
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
    );
$$;

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
  if coalesce((select auth.role()), '') = 'service_role' or private.is_super_admin() or new.current_barrio_id is null then
    return new;
  end if;
  if not private.sees_barrio(new.current_barrio_id) then
    raise exception 'No pertenecés a ese barrio';
  end if;
  return new;
end;
$$;

create or replace function private.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    if coalesce((select auth.role()), '') = 'service_role' or private.is_super_admin() then
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
  if coalesce((select auth.role()), '') = 'service_role' or private.is_barrio_admin(coalesce(new.barrio_id, old.barrio_id)) then
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
  if coalesce((select auth.role()), '') = 'service_role' then
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
  if new.voided_by is distinct from (select auth.uid()) then
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

grant execute on function private.can_read_profile(uuid) to anon, authenticated, service_role;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (private.can_read_profile(id));

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
    user_id = (select auth.uid())
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
    student_id = (select auth.uid())
    or private.is_barrio_admin(barrio_id)
    or private.teaches_activity(activity_id)
  );

drop policy if exists enrollments_insert_student on public.enrollments;
create policy enrollments_insert_student on public.enrollments
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
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
  using (student_id = (select auth.uid()) or private.is_barrio_admin(barrio_id))
  with check (student_id = (select auth.uid()) or private.is_barrio_admin(barrio_id));

drop policy if exists sessions_select on public.class_sessions;
create policy sessions_select on public.class_sessions
  for select to authenticated
  using (
    private.is_barrio_admin(barrio_id)
    or private.teaches_activity(activity_id)
    or exists (
      select 1 from public.enrollments e
      where e.activity_id = class_sessions.activity_id
        and e.student_id = (select auth.uid())
        and e.status in ('active', 'pending', 'completed')
    )
  );

drop policy if exists sessions_write on public.class_sessions;
create policy sessions_write on public.class_sessions
  for insert to authenticated
  with check (
    private.is_barrio_admin(barrio_id)
    or (private.membership_role(barrio_id) = 'teacher' and opened_by = (select auth.uid()) and private.teaches_activity(activity_id))
  );

drop policy if exists sessions_update on public.class_sessions;
create policy sessions_update on public.class_sessions
  for update to authenticated
  using (private.is_barrio_admin(barrio_id) or (opened_by = (select auth.uid()) and private.teaches_activity(activity_id)))
  with check (private.is_barrio_admin(barrio_id) or (opened_by = (select auth.uid()) and private.teaches_activity(activity_id)));

drop policy if exists attendance_select on public.attendance_marks;
create policy attendance_select on public.attendance_marks
  for select to authenticated
  using (
    student_id = (select auth.uid())
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
    student_id = (select auth.uid())
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
  using (student_id = (select auth.uid()) or private.is_barrio_admin(barrio_id));

drop policy if exists payments_insert_mp on public.payments;
create policy payments_insert_mp on public.payments
  for insert to authenticated
  with check (
    method = 'mercadopago'
    and status = 'pending'
    and student_id = (select auth.uid())
    and received_by is null
    and created_by = (select auth.uid())
    and private.membership_role(barrio_id) = 'student'
    and exists (
      select 1 from public.fees f
      where f.id = fee_id
        and f.student_id = (select auth.uid())
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
    and received_by = (select auth.uid())
    and created_by = (select auth.uid())
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
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

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
        where mine.user_id = (select auth.uid())
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
        where mine.user_id = (select auth.uid())
          and mine.role = 'admin'
      )
    )
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists receipts_student_read on storage.objects;
create policy receipts_student_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create index if not exists profiles_current_barrio_idx on public.profiles (current_barrio_id);
create index if not exists staff_invites_invited_by_idx on public.staff_invites (invited_by);
create index if not exists staff_invites_barrio_idx on public.staff_invites (barrio_id);
create index if not exists activity_teachers_teacher_idx on public.activity_teachers (teacher_id);
create index if not exists activity_teachers_barrio_idx on public.activity_teachers (barrio_id);
create index if not exists class_sessions_opened_by_idx on public.class_sessions (opened_by);
create index if not exists attendance_enrollment_idx on public.attendance_marks (enrollment_id);
create index if not exists attendance_marked_by_idx on public.attendance_marks (marked_by);
create index if not exists attendance_barrio_idx on public.attendance_marks (barrio_id);
create index if not exists fees_enrollment_idx on public.fees (enrollment_id);
create index if not exists payments_created_by_idx on public.payments (created_by);
create index if not exists payments_voided_by_idx on public.payments (voided_by);
create index if not exists payments_received_by_idx on public.payments (received_by);
create index if not exists inquiries_barrio_idx on public.inquiries (barrio_id);
