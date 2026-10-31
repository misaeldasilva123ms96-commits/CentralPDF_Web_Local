alter table public.admin_notices add column published_value jsonb;
create or replace function private.notice_before_write() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not private.is_admin() then raise insufficient_privilege;end if;
 new.updated_at=now();new.updated_by=auth.uid();
 if tg_op='INSERT' then new.revision=1;new.published_value=null;
 else
  new.id=old.id;new.revision=old.revision+1;
  if new.state='published' then
   new.published_value=jsonb_build_object('title',new.title,'message',new.message,'level',new.level,'starts_at',new.starts_at,'ends_at',new.ends_at,'revision',new.revision);
  elsif new.state='withdrawn' then new.published_value=null;
  else new.published_value=old.published_value;end if;
 end if;
 return new;
end;$$;
create or replace function private.published_notices() returns table(id uuid,title text,message text,level text,revision integer)
language sql stable security definer set search_path='' as $$
 select n.id,n.published_value->>'title',n.published_value->>'message',n.published_value->>'level',(n.published_value->>'revision')::integer
 from public.admin_notices n
 where n.published_value is not null
 and (n.published_value->>'starts_at')::timestamptz<=now()
 and ((n.published_value->>'ends_at') is null or (n.published_value->>'ends_at')::timestamptz>now())
 order by n.updated_at desc limit 3;
$$;
