-- Keep elevated implementations outside the exposed API schema.
alter function public.admin_usage_status() set schema private;
alter function public.admin_usage_settings(boolean,integer) set schema private;
create function public.admin_usage_status() returns jsonb language sql security invoker set search_path='' as $$ select private.admin_usage_status(); $$;
create function public.admin_usage_settings(p_enabled boolean default null,p_revision integer default null) returns jsonb language sql security invoker set search_path='' as $$ select private.admin_usage_settings(p_enabled,p_revision); $$;
revoke all on function public.admin_usage_status(),public.admin_usage_settings(boolean,integer) from public,anon;
grant execute on function public.admin_usage_status(),public.admin_usage_settings(boolean,integer) to authenticated;
