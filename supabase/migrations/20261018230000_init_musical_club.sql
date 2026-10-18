-- Musical Club: perfiles, actividades, inscripciones, asistencia, cuotas y pagos.
-- El rol vive en public.profiles. Nunca se autoriza con user_metadata.

create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  full_name text not null default '',
  email text,
  phone text,
  dni text,
  birth_date date,
  emergency_contact text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_dni_unique on public.profiles (dni)
  where dni is not null and dni <> '';
create index profiles_role_idx on public.profiles (role);
create index profiles_email_idx on public.profiles (lower(email));

create table public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('teacher', 'admin')),
  full_name text,
  token text not null unique,
  invited_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  age_group text not null check (age_group in ('kids', 'youth_adults')),
  schedule_label text not null default '',
  weekday smallint check (weekday between 0 and 6),
  start_time time,
  end_time time,
  location text not null default '',
  capacity integer not null check (capacity > 0),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'ARS',
  billing_frequency text not null default 'monthly' check (billing_frequency in ('monthly', 'biweekly')),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_teachers (
  activity_id uuid not null references public.activities (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (activity_id, teacher_id)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'waitlist', 'cancelled', 'completed')),
  starts_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, student_id)
);

create index enrollments_student_idx on public.enrollments (student_id, status);
create index enrollments_activity_idx on public.enrollments (activity_id, status);

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  opened_by uuid not null references public.profiles (id),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'open' check (status in ('open', 'closed')),
  notes text,
  created_at timestamptz not null default now()
);

create index class_sessions_activity_idx on public.class_sessions (activity_id, starts_at desc);

create table public.attendance_marks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  enrollment_id uuid references public.enrollments (id) on delete set null,
  method text not null check (method in ('qr', 'manual')),
  marked_by uuid not null references public.profiles (id),
  marked_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create index attendance_student_idx on public.attendance_marks (student_id, marked_at desc);

create table public.fees (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  due_date date not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'ARS',
  billing_frequency text not null check (billing_frequency in ('monthly', 'biweekly')),
  status text not null default 'pending' check (status in ('pending', 'partial', 'paid', 'overdue', 'void')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, period_start)
);

create index fees_student_status_idx on public.fees (student_id, status, due_date);
create index fees_activity_idx on public.fees (activity_id, status);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  fee_id uuid not null references public.fees (id) on delete restrict,
  student_id uuid not null references public.profiles (id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'ARS',
  method text not null check (method in ('mercadopago', 'efectivo')),
  status text not null check (status in ('pending', 'approved', 'rejected', 'void')),
  paid_at timestamptz,
  received_by uuid references public.profiles (id),
  note text,
  receipt_number text,
  receipt_path text,
  mp_preference_id text,
  mp_payment_id text unique,
  mp_status text,
  checkout_url text,
  created_by uuid references public.profiles (id),
  voided_at timestamptz,
  voided_by uuid references public.profiles (id),
  void_reason text,
  created_at timestamptz not null default now()
);

create index payments_fee_idx on public.payments (fee_id, status);
create index payments_student_idx on public.payments (student_id, created_at desc);
create index payments_method_paid_idx on public.payments (method, status, paid_at);
create index payments_cash_admin_idx on public.payments (received_by, paid_at)
  where method = 'efectivo';

create table public.payment_audit (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  action text not null check (action in ('created', 'approved', 'rejected', 'voided')),
  actor_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index payment_audit_payment_idx on public.payment_audit (payment_id, created_at);

create table public.mp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  topic text,
  resource_id text,
  payload jsonb not null default '{}'::jsonb,
  result text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  community text,
  message text not null,
  created_at timestamptz not null default now(),
  constraint inquiries_name_len check (char_length(name) between 2 and 120),
  constraint inquiries_message_len check (char_length(message) between 10 and 2000)
);

create trigger profiles_updated before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger activities_updated before update on public.activities
  for each row execute function private.set_updated_at();
create trigger enrollments_updated before update on public.enrollments
  for each row execute function private.set_updated_at();
create trigger fees_updated before update on public.fees
  for each row execute function private.set_updated_at();

-- Helpers de autorización. security definer en un schema no expuesto para no recursar en RLS.

create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_role() = 'admin', false);
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

create or replace function private.teaches_activity(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.activity_teachers
    where activity_id = target and teacher_id = auth.uid()
  );
$$;

create or replace function private.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    if coalesce(auth.role(), '') = 'service_role' or private.is_admin() then
      return new;
    end if;
    raise exception 'No podés cambiar el rol';
  end if;
  return new;
end;
$$;

create trigger profiles_role_guard
  before update on public.profiles
  for each row execute function private.prevent_role_escalation();

create or replace function private.enforce_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap integer;
  used integer;
begin
  if new.status not in ('active', 'pending') then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and old.status in ('active', 'pending')
     and old.activity_id = new.activity_id then
    return new;
  end if;
  select capacity into cap from public.activities where id = new.activity_id;
  select count(*) into used
  from public.enrollments
  where activity_id = new.activity_id
    and status in ('active', 'pending')
    and id is distinct from new.id;
  if used >= cap then
    raise exception 'Sin cupo' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger enrollments_capacity
  before insert or update on public.enrollments
  for each row execute function private.enforce_capacity();

create or replace function private.guard_enrollment_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or private.is_admin() then
    return new;
  end if;
  if new.student_id is distinct from old.student_id
     or new.activity_id is distinct from old.activity_id
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

create trigger enrollments_guard
  before update on public.enrollments
  for each row execute function private.guard_enrollment_update();

create or replace function private.recompute_fee(target_fee uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fee_status text;
  fee_amount integer;
  fee_due date;
  paid integer;
  today date := (timezone('America/Argentina/Buenos_Aires', now()))::date;
  new_status text;
begin
  select status, amount_cents, due_date
    into fee_status, fee_amount, fee_due
  from public.fees
  where id = target_fee
  for update;
  if not found or fee_status = 'void' then
    return;
  end if;
  select coalesce(sum(amount_cents), 0) into paid
  from public.payments
  where fee_id = target_fee and status = 'approved';
  if paid >= fee_amount then
    new_status := 'paid';
  elsif fee_due < today then
    new_status := 'overdue';
  elsif paid > 0 then
    new_status := 'partial';
  else
    new_status := 'pending';
  end if;
  update public.fees
    set status = new_status
    where id = target_fee and status is distinct from new_status;
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
  if not private.is_admin() then
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
     or new.student_id is distinct from old.student_id then
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

create trigger payments_guard
  before update on public.payments
  for each row execute function private.guard_payment_update();

create or replace function private.audit_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  action_name text;
  actor uuid;
begin
  if tg_op = 'INSERT' then
    action_name := case when new.status = 'approved' then 'approved' else 'created' end;
    actor := coalesce(new.created_by, auth.uid());
    insert into public.payment_audit (payment_id, action, actor_id, metadata)
    values (
      new.id,
      action_name,
      actor,
      jsonb_build_object(
        'method', new.method,
        'amount_cents', new.amount_cents,
        'receipt_number', new.receipt_number,
        'note', new.note,
        'status', new.status
      )
    );
    perform private.recompute_fee(new.fee_id);
    return new;
  end if;

  if new.status is distinct from old.status then
    action_name := case
      when new.status = 'void' then 'voided'
      when new.status = 'approved' then 'approved'
      when new.status = 'rejected' then 'rejected'
      else null
    end;
    if action_name is not null then
      actor := coalesce(new.voided_by, new.created_by, auth.uid());
      insert into public.payment_audit (payment_id, action, actor_id, metadata)
      values (
        new.id,
        action_name,
        actor,
        jsonb_build_object(
          'method', new.method,
          'amount_cents', new.amount_cents,
          'from', old.status,
          'to', new.status,
          'void_reason', new.void_reason,
          'mp_payment_id', new.mp_payment_id
        )
      );
    end if;
  end if;
  perform private.recompute_fee(new.fee_id);
  if new.fee_id is distinct from old.fee_id then
    perform private.recompute_fee(old.fee_id);
  end if;
  return new;
end;
$$;

create trigger payments_audit
  after insert or update on public.payments
  for each row execute function private.audit_payment();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invited_role text;
  invited_name text;
begin
  select role, full_name into invited_role, invited_name
  from public.staff_invites
  where lower(email) = lower(new.email)
    and accepted_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce(invited_role, 'student'),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), invited_name, ''),
    new.email
  );

  if invited_role is not null then
    update public.staff_invites
      set accepted_at = now()
      where lower(email) = lower(new.email)
        and accepted_at is null;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
    set email = new.email
    where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.sync_user_email();

alter table public.profiles enable row level security;
alter table public.staff_invites enable row level security;
alter table public.activities enable row level security;
alter table public.activity_teachers enable row level security;
alter table public.enrollments enable row level security;
alter table public.class_sessions enable row level security;
alter table public.attendance_marks enable row level security;
alter table public.fees enable row level security;
alter table public.payments enable row level security;
alter table public.payment_audit enable row level security;
alter table public.mp_webhook_events enable row level security;
alter table public.inquiries enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or private.is_admin()
    or (
      private.is_teacher()
      and exists (
        select 1
        from public.enrollments e
        join public.activity_teachers t on t.activity_id = e.activity_id
        where e.student_id = profiles.id
          and t.teacher_id = auth.uid()
      )
    )
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy invites_admin on public.staff_invites
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy activities_select on public.activities
  for select to anon, authenticated
  using (
    status = 'active'
    or private.is_admin()
    or private.teaches_activity(id)
  );

create policy activities_admin on public.activities
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy teachers_select on public.activity_teachers
  for select to authenticated
  using (private.is_admin() or teacher_id = auth.uid() or private.teaches_activity(activity_id));

create policy teachers_admin on public.activity_teachers
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy enrollments_select on public.enrollments
  for select to authenticated
  using (
    student_id = auth.uid()
    or private.is_admin()
    or private.teaches_activity(activity_id)
  );

create policy enrollments_insert_student on public.enrollments
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and private.current_role() = 'student'
    and status in ('pending', 'active', 'waitlist')
  );

create policy enrollments_insert_admin on public.enrollments
  for insert to authenticated
  with check (private.is_admin());

create policy enrollments_update on public.enrollments
  for update to authenticated
  using (student_id = auth.uid() or private.is_admin())
  with check (student_id = auth.uid() or private.is_admin());

create policy sessions_select on public.class_sessions
  for select to authenticated
  using (
    private.is_admin()
    or private.teaches_activity(activity_id)
    or exists (
      select 1 from public.enrollments e
      where e.activity_id = class_sessions.activity_id
        and e.student_id = auth.uid()
        and e.status in ('active', 'pending', 'completed')
    )
  );

create policy sessions_write on public.class_sessions
  for insert to authenticated
  with check (
    private.is_admin()
    or (private.is_teacher() and opened_by = auth.uid() and private.teaches_activity(activity_id))
  );

create policy sessions_update on public.class_sessions
  for update to authenticated
  using (private.is_admin() or (opened_by = auth.uid() and private.teaches_activity(activity_id)))
  with check (private.is_admin() or (opened_by = auth.uid() and private.teaches_activity(activity_id)));

create policy attendance_select on public.attendance_marks
  for select to authenticated
  using (
    student_id = auth.uid()
    or private.is_admin()
    or exists (
      select 1 from public.class_sessions s
      where s.id = attendance_marks.session_id
        and private.teaches_activity(s.activity_id)
    )
  );

create policy attendance_insert on public.attendance_marks
  for insert to authenticated
  with check (
    (
      private.is_admin()
      or exists (
        select 1
        from public.class_sessions s
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

create policy fees_select on public.fees
  for select to authenticated
  using (
    student_id = auth.uid()
    or private.is_admin()
    or private.teaches_activity(activity_id)
  );

create policy fees_admin_write on public.fees
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy payments_select on public.payments
  for select to authenticated
  using (student_id = auth.uid() or private.is_admin());

create policy payments_insert_mp on public.payments
  for insert to authenticated
  with check (
    method = 'mercadopago'
    and status = 'pending'
    and student_id = auth.uid()
    and received_by is null
    and created_by = auth.uid()
    and exists (
      select 1 from public.fees f
      where f.id = fee_id
        and f.student_id = auth.uid()
        and f.status in ('pending', 'partial', 'overdue')
    )
  );

create policy payments_insert_cash on public.payments
  for insert to authenticated
  with check (
    private.is_admin()
    and method = 'efectivo'
    and status = 'approved'
    and received_by = auth.uid()
    and created_by = auth.uid()
  );

create policy payments_update_admin on public.payments
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy audit_select_admin on public.payment_audit
  for select to authenticated
  using (private.is_admin());

create policy inquiries_insert on public.inquiries
  for insert to anon, authenticated
  with check (true);

create policy inquiries_select_admin on public.inquiries
  for select to authenticated
  using (private.is_admin());

grant usage on schema private to anon, authenticated, service_role;
grant execute on all functions in schema private to anon, authenticated, service_role;

grant select on public.activities to anon;
grant select, insert, update, delete on public.activities to authenticated, service_role;
grant select, insert, update, delete on public.profiles to authenticated, service_role;
grant select, insert, update, delete on public.staff_invites to authenticated, service_role;
grant select, insert, update, delete on public.activity_teachers to authenticated, service_role;
grant select, insert, update, delete on public.enrollments to authenticated, service_role;
grant select, insert, update, delete on public.class_sessions to authenticated, service_role;
grant select, insert, update, delete on public.attendance_marks to authenticated, service_role;
grant select, insert, update, delete on public.fees to authenticated, service_role;
grant select, insert, update, delete on public.payments to authenticated, service_role;
grant select on public.payment_audit to authenticated;
grant all on public.payment_audit to service_role;
grant all on public.mp_webhook_events to service_role;
grant insert on public.inquiries to anon, authenticated;
grant select on public.inquiries to authenticated, service_role;

revoke insert, update, delete on public.payment_audit from anon, authenticated;
revoke all on public.mp_webhook_events from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('receipts', 'receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy avatars_public_read on storage.objects
  for select to public
  using (bucket_id = 'avatars');

create policy avatars_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy receipts_admin_all on storage.objects
  for all to authenticated
  using (bucket_id = 'receipts' and private.is_admin())
  with check (bucket_id = 'receipts' and private.is_admin());

create policy receipts_student_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
