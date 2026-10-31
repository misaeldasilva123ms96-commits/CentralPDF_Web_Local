-- A stale edit is an HTTP conflict, not a retryable transaction failure.
-- Preserve the existing invoker/RLS checks and optimistic update predicate.
create or replace function public.save_admin_notice(p_id uuid,p_title text,p_message text,p_level text,p_state text,p_starts_at timestamptz,p_ends_at timestamptz,p_revision integer)
returns public.admin_notices language plpgsql security invoker set search_path='' as $$
declare result public.admin_notices;begin
 if not private.is_admin() then raise insufficient_privilege;end if;
 if p_id is null then
  if p_state<>'draft' then raise check_violation;end if;
  insert into public.admin_notices(title,message,level,state,starts_at,ends_at) values(p_title,p_message,p_level,'draft',p_starts_at,p_ends_at) returning * into result;
 else
  update public.admin_notices set title=p_title,message=p_message,level=p_level,state=p_state,starts_at=p_starts_at,ends_at=p_ends_at where id=p_id and revision=p_revision returning * into result;
  if result.id is null then raise exception 'revision_conflict' using errcode='PT409';end if;
 end if;
 return result;end;$$;
