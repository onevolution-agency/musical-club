-- Seguimiento de adolescentes (13 a 17), con consentimiento.
-- No aplicar en producción desde el agente: corre esta migración al mergear.
--
-- El responsable ve clases, asistencia y cuotas, y puede pagar por Mercado Pago.
-- No edita datos ni entra a la cuenta. A los 18 el seguimiento se cierra.
-- Nada se borra: el vínculo queda con ended_at y el rastro en guardian_audit.

alter table public.guardianships drop constraint if exists guardianships_access_check;
alter table public.guardianships
  add constraint guardianships_access_check check (access in ('manager', 'contact', 'follow'));

alter table public.guardianships
  add column if not exists ended_at timestamptz;

alter table public.guardianships
  add column if not exists notify boolean not null default true;

alter table public.barrios
  add column if not exists teen_can_unfollow boolean not null default true;

alter table public.guardian_audit drop constraint if exists guardian_audit_action_check;
alter table public.guardian_audit
  add constraint guardian_audit_action_check
  check (action in ('create', 'link', 'unlink', 'release', 'request', 'accept', 'decline', 'end'));

create table if not exists public.follow_requests (
  id uuid primary key default gen_random_uuid(),
  teen_id uuid not null references public.profiles (id) on delete cascade,
  guardian_id uuid references public.profiles (id) on delete set null,
  email text not null,
  barrio_id uuid not null references public.barrios (id),
  direction text not null check (direction in ('teen_invite', 'guardian_request')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'ended')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.guardian_notices (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  child_id uuid not null references public.profiles (id) on delete cascade,
  barrio_id uuid not null references public.barrios (id),
  kind text not null check (kind in ('absence', 'overdue')),
  source_id uuid not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (guardian_id, kind, source_id)
);

create index if not exists follow_requests_teen_idx on public.follow_requests (teen_id);
create index if not exists follow_requests_guardian_idx on public.follow_requests (guardian_id);
create index if not exists follow_requests_email_idx on public.follow_requests (lower(email));
create index if not exists guardian_notices_guardian_idx on public.guardian_notices (guardian_id);

create or replace function private.teen_birth_ok(birth date)
returns boolean
language sql
stable
as $$
  select birth is not null
    and birth <= ((timezone('America/Argentina/Buenos_Aires', now()))::date - interval '13 years')
    and birth > ((timezone('America/Argentina/Buenos_Aires', now()))::date - interval '18 years');
$$;

create or replace function private.turned_eighteen(birth date)
returns boolean
language sql
stable
as $$
  select birth is not null
    and birth <= ((timezone('America/Argentina/Buenos_Aires', now()))::date - interval '18 years');
$$;

create or replace function private.follows_child(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.guardianships g
    join public.profiles p on p.id = g.child_id
    where g.child_id = target
      and g.guardian_id = (select auth.uid())
      and g.access = 'follow'
      and g.ended_at is null
      and private.sees_barrio(g.barrio_id)
      and p.account_kind = 'user'
      and not private.turned_eighteen(p.birth_date)
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
    )
    or exists (
      select 1
      from public.guardianships g
      join public.profiles p on p.id = g.child_id
      where g.child_id = target
        and g.guardian_id = (select auth.uid())
        and private.sees_barrio(g.barrio_id)
        and (
          g.access <> 'follow'
          or (g.ended_at is null and not private.turned_eighteen(p.birth_date))
        )
    )
    or exists (
      select 1
      from public.guardianships mine
      join public.guardianships theirs on theirs.child_id = mine.child_id
      join public.profiles child on child.id = mine.child_id
      where mine.guardian_id = (select auth.uid())
        and theirs.guardian_id = target
        and private.sees_barrio(mine.barrio_id)
        and (
          mine.access <> 'follow'
          or (mine.ended_at is null and not private.turned_eighteen(child.birth_date))
        )
    )
    or exists (
      select 1
      from public.guardianships g
      join public.profiles child on child.id = g.child_id
      where g.child_id = (select auth.uid())
        and g.guardian_id = target
        and g.access = 'follow'
        and g.ended_at is null
        and private.sees_barrio(g.barrio_id)
        and not private.turned_eighteen(child.birth_date)
    )
    or exists (
      select 1
      from public.follow_requests r
      where r.status = 'pending'
        and (
          (
            r.teen_id = target
            and (
              r.guardian_id = (select auth.uid())
              or exists (
                select 1
                from public.profiles me
                where me.id = (select auth.uid())
                  and lower(me.email) = lower(r.email)
              )
            )
          )
          or (r.guardian_id = target and r.teen_id = (select auth.uid()))
        )
    );
$$;

create or replace function private.attach_follow_invites()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.follow_requests
    set guardian_id = new.id
    where guardian_id is null
      and status = 'pending'
      and direction = 'teen_invite'
      and lower(email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_follow on auth.users;
create trigger on_auth_user_follow
  after insert on auth.users
  for each row execute function private.attach_follow_invites();

create or replace function public.expire_follows()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  row record;
begin
  for row in
    select g.id, g.child_id, g.guardian_id, g.barrio_id
    from public.guardianships g
    join public.profiles p on p.id = g.child_id
    where g.access = 'follow'
      and g.ended_at is null
      and private.turned_eighteen(p.birth_date)
  loop
    update public.guardianships set ended_at = now() where id = row.id and ended_at is null;
    insert into public.guardian_audit (child_id, guardian_id, actor_id, barrio_id, action, note)
    values (row.child_id, row.guardian_id, (select auth.uid()), row.barrio_id, 'end', '18');
  end loop;
end;
$$;

create or replace function public.refresh_follow_notices()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.expire_follows();
  insert into public.guardian_notices (guardian_id, child_id, barrio_id, kind, source_id)
  select g.guardian_id, g.child_id, g.barrio_id, 'absence', s.id
  from public.guardianships g
  join public.enrollments e
    on e.student_id = g.child_id
   and e.barrio_id = g.barrio_id
   and e.status = 'active'
  join public.class_sessions s on s.activity_id = e.activity_id and s.status = 'closed'
  where g.guardian_id = (select auth.uid())
    and g.access = 'follow'
    and g.ended_at is null
    and g.notify
    and s.starts_at > now() - interval '60 days'
    and not exists (
      select 1 from public.attendance_marks m
      where m.session_id = s.id and m.student_id = g.child_id
    )
  on conflict (guardian_id, kind, source_id) do nothing;

  insert into public.guardian_notices (guardian_id, child_id, barrio_id, kind, source_id)
  select g.guardian_id, g.child_id, g.barrio_id, 'overdue', f.id
  from public.guardianships g
  join public.fees f
    on f.student_id = g.child_id
   and f.barrio_id = g.barrio_id
   and f.status = 'overdue'
  where g.guardian_id = (select auth.uid())
    and g.access = 'follow'
    and g.ended_at is null
    and g.notify
  on conflict (guardian_id, kind, source_id) do nothing;
end;
$$;

create or replace function private.open_follow(teen uuid, guardian uuid, barrio uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.teen_birth_ok((select birth_date from public.profiles where id = teen)) then
    raise exception 'La edad tiene que ser de 13 a 17.';
  end if;
  if not exists (
    select 1 from public.profiles where id = teen and account_kind = 'user' and role = 'student'
  ) then
    raise exception 'No encontramos a ese adolescente';
  end if;
  if not exists (
    select 1 from public.profiles where id = guardian and account_kind = 'user'
  ) then
    raise exception 'Ese responsable no tiene cuenta';
  end if;
  if teen = guardian then
    raise exception 'No autorizado';
  end if;
  if not exists (
    select 1 from public.barrio_memberships m
    where m.user_id = teen and m.barrio_id = barrio and m.role = 'student'
  ) then
    raise exception 'No está en ese barrio';
  end if;
  insert into public.guardianships (guardian_id, child_id, barrio_id, access, ended_at, notify)
  values (guardian, teen, barrio, 'follow', null, true)
  on conflict (guardian_id, child_id) do update
    set access = 'follow',
        barrio_id = excluded.barrio_id,
        ended_at = null
    where public.guardianships.access is distinct from 'manager';
  if not exists (
    select 1 from public.guardianships g
    where g.guardian_id = guardian and g.child_id = teen and g.access = 'follow' and g.ended_at is null
  ) then
    raise exception 'No autorizado';
  end if;
end;
$$;

create or replace function public.invite_follower(email text, barrio_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  mail text := lower(trim(coalesce(email, '')));
  teen uuid := (select auth.uid());
  guardian uuid;
begin
  if teen is null or not private.sees_barrio(invite_follower.barrio_id) then
    raise exception 'No autorizado';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = teen and p.account_kind = 'user' and private.teen_birth_ok(p.birth_date)
  ) then
    raise exception 'La edad tiene que ser de 13 a 17.';
  end if;
  if not exists (
    select 1 from public.barrio_memberships m
    where m.user_id = teen and m.barrio_id = invite_follower.barrio_id and m.role = 'student'
  ) then
    raise exception 'No autorizado';
  end if;
  if position('@' in mail) < 2 then
    raise exception 'El mail no es válido.';
  end if;
  if exists (select 1 from public.profiles p where p.id = teen and lower(p.email) = mail) then
    raise exception 'No autorizado';
  end if;
  select id into guardian from public.profiles where lower(profiles.email) = mail and account_kind = 'user' limit 1;
  if guardian is not null and exists (
    select 1 from public.guardianships g
    where g.child_id = teen and g.guardian_id = guardian and g.access = 'follow' and g.ended_at is null
  ) then
    raise exception 'Ya lo sigue';
  end if;
  if exists (
    select 1 from public.follow_requests r
    where r.teen_id = teen
      and r.barrio_id = invite_follower.barrio_id
      and r.direction = 'teen_invite'
      and r.status = 'pending'
      and lower(r.email) = mail
  ) then
    return;
  end if;
  insert into public.follow_requests (teen_id, guardian_id, email, barrio_id, direction)
  values (teen, guardian, mail, invite_follower.barrio_id, 'teen_invite');
  insert into public.guardian_audit (child_id, guardian_id, actor_id, barrio_id, action, note)
  values (teen, guardian, teen, invite_follower.barrio_id, 'request', mail);
end;
$$;

create or replace function public.request_follow(email text, barrio_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  mail text := lower(trim(coalesce(email, '')));
  guardian uuid := (select auth.uid());
  teen uuid;
begin
  if guardian is null or not private.sees_barrio(request_follow.barrio_id) then
    raise exception 'No autorizado';
  end if;
  if not exists (select 1 from public.profiles p where p.id = guardian and p.account_kind = 'user') then
    raise exception 'No autorizado';
  end if;
  if position('@' in mail) < 2 then
    raise exception 'El mail no es válido.';
  end if;
  select id into teen
  from public.profiles
  where lower(profiles.email) = mail and account_kind = 'user'
  limit 1;
  if teen is null or not private.teen_birth_ok((select birth_date from public.profiles where id = teen)) then
    raise exception 'La edad tiene que ser de 13 a 17.';
  end if;
  if teen = guardian then
    raise exception 'No autorizado';
  end if;
  if not exists (
    select 1 from public.barrio_memberships m
    where m.user_id = teen and m.barrio_id = request_follow.barrio_id and m.role = 'student'
  ) then
    raise exception 'No está en ese barrio';
  end if;
  if exists (
    select 1 from public.guardianships g
    where g.child_id = teen and g.guardian_id = guardian and g.access = 'follow' and g.ended_at is null
  ) then
    raise exception 'Ya lo sigue';
  end if;
  if exists (
    select 1 from public.follow_requests r
    where r.teen_id = teen and r.guardian_id = guardian and r.status = 'pending' and r.direction = 'guardian_request'
  ) then
    return;
  end if;
  insert into public.follow_requests (teen_id, guardian_id, email, barrio_id, direction)
  values (teen, guardian, mail, request_follow.barrio_id, 'guardian_request');
  insert into public.guardian_audit (child_id, guardian_id, actor_id, barrio_id, action, note)
  values (teen, guardian, guardian, request_follow.barrio_id, 'request', mail);
end;
$$;

create or replace function public.resolve_follow(request_id uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.follow_requests;
  caller uuid := (select auth.uid());
  caller_mail text;
begin
  if caller is null then
    raise exception 'No autorizado';
  end if;
  select * into req from public.follow_requests where id = request_id and status = 'pending';
  if req.id is null then
    raise exception 'No encontramos ese pedido';
  end if;
  select lower(email) into caller_mail from public.profiles where id = caller;
  if req.direction = 'teen_invite' then
    if req.guardian_id is distinct from caller and lower(req.email) is distinct from caller_mail then
      raise exception 'No autorizado';
    end if;
    if req.guardian_id is null then
      update public.follow_requests set guardian_id = caller where id = req.id;
      req.guardian_id := caller;
    end if;
  elsif req.teen_id is distinct from caller then
    raise exception 'No autorizado';
  end if;
  if not accept then
    update public.follow_requests set status = 'declined', resolved_at = now() where id = req.id;
    insert into public.guardian_audit (child_id, guardian_id, actor_id, barrio_id, action, note)
    values (req.teen_id, req.guardian_id, caller, req.barrio_id, 'decline', req.email);
    return;
  end if;
  perform private.open_follow(req.teen_id, req.guardian_id, req.barrio_id);
  update public.follow_requests set status = 'accepted', resolved_at = now(), guardian_id = req.guardian_id where id = req.id;
  insert into public.guardian_audit (child_id, guardian_id, actor_id, barrio_id, action, note)
  values
    (req.teen_id, req.guardian_id, caller, req.barrio_id, 'accept', req.email),
    (req.teen_id, req.guardian_id, caller, req.barrio_id, 'link', req.email);
end;
$$;

create or replace function public.end_follow(child_id uuid, guardian_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  barrio uuid;
  caller uuid := (select auth.uid());
begin
  select g.barrio_id into barrio
  from public.guardianships g
  where g.child_id = end_follow.child_id
    and g.guardian_id = end_follow.guardian_id
    and g.access = 'follow'
    and g.ended_at is null;
  if barrio is null then
    raise exception 'No encontramos ese vínculo';
  end if;
  if caller = end_follow.child_id then
    if not coalesce((select teen_can_unfollow from public.barrios where id = barrio), false) then
      raise exception 'No podés quitar el seguimiento';
    end if;
  elsif not private.is_barrio_admin(barrio) then
    raise exception 'No autorizado';
  end if;
  update public.guardianships
    set ended_at = now()
    where child_id = end_follow.child_id
      and guardian_id = end_follow.guardian_id
      and access = 'follow'
      and ended_at is null;
  insert into public.guardian_audit (child_id, guardian_id, actor_id, barrio_id, action)
  values (end_follow.child_id, end_follow.guardian_id, caller, barrio, 'end');
end;
$$;

create or replace function public.admin_link_follow(teen_id uuid, email text, barrio_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  mail text := lower(trim(coalesce(email, '')));
  guardian uuid;
begin
  if not private.is_barrio_admin(admin_link_follow.barrio_id) then
    raise exception 'No autorizado';
  end if;
  select id into guardian
  from public.profiles
  where lower(profiles.email) = mail and account_kind = 'user'
  limit 1;
  if guardian is null then
    raise exception 'Ese responsable no tiene cuenta';
  end if;
  perform private.open_follow(teen_id, guardian, admin_link_follow.barrio_id);
  update public.follow_requests
    set status = 'accepted', resolved_at = now()
    where follow_requests.teen_id = admin_link_follow.teen_id
      and follow_requests.guardian_id = guardian
      and status = 'pending';
  insert into public.guardian_audit (child_id, guardian_id, actor_id, barrio_id, action, note)
  values (teen_id, guardian, (select auth.uid()), admin_link_follow.barrio_id, 'link', mail);
end;
$$;

create or replace function public.set_follow_notify(child_id uuid, enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.follows_child(child_id) then
    raise exception 'No autorizado';
  end if;
  update public.guardianships
    set notify = coalesce(enabled, false)
    where guardian_id = (select auth.uid())
      and child_id = set_follow_notify.child_id
      and access = 'follow'
      and ended_at is null;
end;
$$;

create or replace function public.mark_notice_read(notice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.guardian_notices
    set read_at = coalesce(read_at, now())
    where id = notice_id
      and guardian_id = (select auth.uid());
end;
$$;

revoke all on function public.expire_follows() from public;
revoke all on function public.refresh_follow_notices() from public;
revoke all on function public.invite_follower(text, uuid) from public;
revoke all on function public.request_follow(text, uuid) from public;
revoke all on function public.resolve_follow(uuid, boolean) from public;
revoke all on function public.end_follow(uuid, uuid) from public;
revoke all on function public.admin_link_follow(uuid, text, uuid) from public;
revoke all on function public.set_follow_notify(uuid, boolean) from public;
revoke all on function public.mark_notice_read(uuid) from public;

grant execute on function public.expire_follows() to authenticated;
grant execute on function public.refresh_follow_notices() to authenticated;
grant execute on function public.invite_follower(text, uuid) to authenticated;
grant execute on function public.request_follow(text, uuid) to authenticated;
grant execute on function public.resolve_follow(uuid, boolean) to authenticated;
grant execute on function public.end_follow(uuid, uuid) to authenticated;
grant execute on function public.admin_link_follow(uuid, text, uuid) to authenticated;
grant execute on function public.set_follow_notify(uuid, boolean) to authenticated;
grant execute on function public.mark_notice_read(uuid) to authenticated;

grant execute on function private.follows_child(uuid) to anon, authenticated, service_role;
grant execute on function private.teen_birth_ok(date) to authenticated, service_role;
grant execute on function private.turned_eighteen(date) to authenticated, service_role;

drop policy if exists guardianships_select on public.guardianships;
create policy guardianships_select on public.guardianships
  for select to authenticated
  using (
    guardian_id = (select auth.uid())
    or child_id = (select auth.uid())
    or private.is_barrio_admin(barrio_id)
    or exists (
      select 1
      from public.enrollments e
      where e.student_id = guardianships.child_id
        and e.status in ('active', 'pending', 'completed')
        and private.teaches_activity(e.activity_id)
    )
  );

alter table public.follow_requests enable row level security;
alter table public.guardian_notices enable row level security;

drop policy if exists follow_requests_select on public.follow_requests;
create policy follow_requests_select on public.follow_requests
  for select to authenticated
  using (
    teen_id = (select auth.uid())
    or guardian_id = (select auth.uid())
    or private.is_barrio_admin(barrio_id)
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and lower(p.email) = lower(follow_requests.email)
    )
  );

drop policy if exists guardian_notices_select on public.guardian_notices;
create policy guardian_notices_select on public.guardian_notices
  for select to authenticated
  using (
    guardian_id = (select auth.uid())
    or private.is_barrio_admin(barrio_id)
  );

drop policy if exists enrollments_select on public.enrollments;
create policy enrollments_select on public.enrollments
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or private.manages_child(student_id)
    or private.follows_child(student_id)
    or private.is_barrio_admin(barrio_id)
    or private.teaches_activity(activity_id)
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
          or private.follows_child(e.student_id)
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
    or private.follows_child(student_id)
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
    or private.follows_child(student_id)
    or private.is_barrio_admin(barrio_id)
    or private.teaches_activity(activity_id)
  );

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or private.manages_child(student_id)
    or private.follows_child(student_id)
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
      or private.follows_child(student_id)
    )
    and exists (
      select 1 from public.fees f
      where f.id = fee_id
        and f.student_id = payments.student_id
        and f.barrio_id = payments.barrio_id
        and f.status in ('pending', 'partial', 'overdue')
    )
  );
