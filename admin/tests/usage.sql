-- Dedicated staging only. All metrics, settings and identities roll back.
begin;
do $$begin
 perform set_config('test.completed',coalesce((select completed::text from public.admin_daily_metrics where day=(now() at time zone 'utc')::date and tool='merge'),'0'),true);
end$$;
set local role anon;
do $$begin
 begin perform public.ingest_admin_usage('73000000-0000-4000-8000-000000000001','[]',true);raise exception 'anonymous ingestion allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
-- Test uses the existing configuration inside a rollback transaction.
update private.usage_settings set enabled=true;
set local role service_role;
select public.ingest_admin_usage('73000000-0000-4000-8000-000000000001','[{"id":"74000000-0000-4000-8000-000000000001","tool":"merge","result":"completed"}]',true);
select public.ingest_admin_usage('73000000-0000-4000-8000-000000000001','[{"id":"74000000-0000-4000-8000-000000000001","tool":"merge","result":"completed"}]',true);
reset role;
do $$begin
 if (select completed from public.admin_daily_metrics where day=(now() at time zone 'utc')::date and tool='merge')<>current_setting('test.completed')::integer+1 then raise exception 'duplicate event counted';end if;
end$$;
update private.usage_tabs set requests=720 where id='73000000-0000-4000-8000-000000000001';
set local role service_role;
do $$begin begin perform public.ingest_admin_usage('73000000-0000-4000-8000-000000000001','[]',true);raise exception 'tab cap ignored';exception when sqlstate 'PT429' then null;end;end$$;
reset role;
update private.usage_budget set requests=5000 where day=(now() at time zone 'utc')::date;
set local role service_role;
do $$begin begin perform public.ingest_admin_usage('73000000-0000-4000-8000-000000000002','[]',true);raise exception 'global cap ignored';exception when sqlstate 'PT429' then null;end;end$$;
reset role;
update private.usage_settings set enabled=false;
set local role service_role;
do $$begin begin perform public.ingest_admin_usage('73000000-0000-4000-8000-000000000002','[]',true);raise exception 'pause ignored';exception when sqlstate 'PT503' then null;end;end$$;
reset role;
insert into private.usage_events values('74000000-0000-4000-8000-000000000002',now()-interval '8 days');
set local role service_role;
select public.cleanup_admin_usage();
reset role;
do $$begin if exists(select 1 from private.usage_events where id='74000000-0000-4000-8000-000000000002') then raise exception 'retention failed';end if;end$$;
rollback;
select 'PASS: no anonymous database ingestion, event deduplication, tab/global caps, global pause, retention; all fixtures rolled back' as result;
