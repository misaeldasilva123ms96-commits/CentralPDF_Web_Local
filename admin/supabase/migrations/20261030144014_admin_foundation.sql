-- Dedicated CentralPDF staging project only. No document bytes, names or identities of visitors.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, anon;
create table private.administrators(user_id uuid primary key references auth.users(id) on delete cascade, enabled boolean not null default true);
alter table private.administrators enable row level security;
revoke all on private.administrators from anon, authenticated;

-- Fixed-search-path definer helpers: identity is always auth.uid(), never a caller-supplied ID.
create function private.is_member() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null
 and exists(select 1 from private.administrators a where a.user_id=auth.uid() and a.enabled)
 and exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null)
 and exists(select 1 from auth.sessions s where s.id::text=auth.jwt()->>'session_id' and s.user_id=auth.uid() and (s.not_after is null or s.not_after>now()));
$$;
create function private.is_admin() returns boolean language sql stable security invoker set search_path='' as $$
 select private.is_member() and coalesce(auth.jwt()->>'aal','')='aal2';
$$;
revoke all on function private.is_member(),private.is_admin() from public,anon;
grant execute on function private.is_member(),private.is_admin() to authenticated;
create function public.admin_membership() returns boolean language sql stable security invoker set search_path='' as $$ select private.is_member(); $$;
create function public.admin_access() returns boolean language sql stable security invoker set search_path='' as $$ select private.is_admin(); $$;
revoke all on function public.admin_membership(),public.admin_access() from public,anon;
grant execute on function public.admin_membership(),public.admin_access() to authenticated;

create table public.admin_notices(
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(title) between 1 and 80),
 message text not null check(length(message) between 1 and 240),
 level text not null default 'info' check(level in ('info','warning')),
 state text not null default 'draft' check(state in ('draft','published','withdrawn')),
 starts_at timestamptz not null default now(), ends_at timestamptz,
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now(),
 updated_by uuid not null default auth.uid() references auth.users(id),
 check(ends_at is null or ends_at>starts_at)
);
create table public.admin_audit(
 id bigint generated always as identity primary key,
 actor uuid not null references auth.users(id),
 action text not null,
 object_id uuid,
 revision integer,
 previous_value jsonb,
 changed_at timestamptz not null default now()
);
create table public.admin_daily_metrics(
 day date not null,tool text not null,
 completed integer not null default 0 check(completed>=0),
 failed integer not null default 0 check(failed>=0),
 primary key(day,tool)
);
-- No ingestion is enabled in this first staging release.
alter table public.admin_notices enable row level security;
alter table public.admin_audit enable row level security;
alter table public.admin_daily_metrics enable row level security;
revoke all on public.admin_notices,public.admin_audit,public.admin_daily_metrics from public,anon,authenticated;
grant select,insert,update on public.admin_notices to authenticated;
grant select on public.admin_audit,public.admin_daily_metrics to authenticated;
create policy admin_notices_read on public.admin_notices for select to authenticated using((select private.is_admin()));
create policy admin_notices_insert on public.admin_notices for insert to authenticated with check((select private.is_admin()));
create policy admin_notices_update on public.admin_notices for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy admin_audit_read on public.admin_audit for select to authenticated using((select private.is_admin()));
create policy admin_metrics_read on public.admin_daily_metrics for select to authenticated using((select private.is_admin()));

create function private.notice_before_write() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not private.is_admin() then raise insufficient_privilege; end if;
 new.updated_at=now();new.updated_by=auth.uid();
 if tg_op='INSERT' then new.revision=1; else new.id=old.id;new.revision=old.revision+1; end if;
 return new;
end;$$;
create function private.notice_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin() then raise insufficient_privilege; end if;
 insert into public.admin_audit(actor,action,object_id,revision,previous_value)
 values(auth.uid(),case when tg_op='INSERT' then 'notice_created' else 'notice_'||new.state end,new.id,new.revision,case when tg_op='UPDATE' then to_jsonb(old) else null end);
 return new;
end;$$;
revoke all on function private.notice_before_write(),private.notice_audit() from public,anon,authenticated;
create trigger notice_before_write before insert or update on public.admin_notices for each row execute function private.notice_before_write();
create trigger notice_audit after insert or update on public.admin_notices for each row execute function private.notice_audit();

-- This RPC uses invoker privileges/RLS and checks revision while holding the row lock.
create function public.save_admin_notice(p_id uuid,p_title text,p_message text,p_level text,p_state text,p_starts_at timestamptz,p_ends_at timestamptz,p_revision integer)
returns public.admin_notices language plpgsql security invoker set search_path='' as $$
declare result public.admin_notices;begin
 if not private.is_admin() then raise insufficient_privilege;end if;
 if p_id is null then
  if p_state<>'draft' then raise check_violation;end if;
  insert into public.admin_notices(title,message,level,state,starts_at,ends_at) values(p_title,p_message,p_level,'draft',p_starts_at,p_ends_at) returning * into result;
 else
  update public.admin_notices set title=p_title,message=p_message,level=p_level,state=p_state,starts_at=p_starts_at,ends_at=p_ends_at where id=p_id and revision=p_revision returning * into result;
  if result.id is null then raise exception 'revision_conflict' using errcode='40001';end if;
 end if;
 return result;end;$$;
revoke all on function public.save_admin_notice(uuid,text,text,text,text,timestamptz,timestamptz,integer) from public,anon;
grant execute on function public.save_admin_notice(uuid,text,text,text,text,timestamptz,timestamptz,integer) to authenticated;

-- Narrow public projection: no drafts, audit fields, authors or private settings.
create function private.published_notices() returns table(id uuid,title text,message text,level text,revision integer)
language sql stable security definer set search_path='' as $$
 select n.id,n.title,n.message,n.level,n.revision from public.admin_notices n where n.state='published' and n.starts_at<=now() and (n.ends_at is null or n.ends_at>now()) order by n.updated_at desc limit 3;
$$;
revoke all on function private.published_notices() from public;
grant execute on function private.published_notices() to anon,authenticated;
create function public.published_notices() returns table(id uuid,title text,message text,level text,revision integer)
language sql stable security invoker set search_path='' as $$ select * from private.published_notices(); $$;
revoke all on function public.published_notices() from public;
grant execute on function public.published_notices() to anon,authenticated;
