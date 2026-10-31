-- Consent is enforced by the client; anonymous counters remain untrusted estimates.
create table private.usage_events(id uuid primary key,created_at timestamptz not null default now());
create index usage_events_created on private.usage_events(created_at);
create table private.usage_tabs(id uuid primary key,day date not null,last_seen timestamptz not null,requests integer not null default 0);
create index usage_tabs_seen on private.usage_tabs(last_seen);
create table private.usage_budget(day date primary key,requests integer not null);
create table private.usage_settings(singleton boolean primary key default true check(singleton),enabled boolean not null default true,revision integer not null default 1);
insert into private.usage_settings(singleton) values(true);
alter table private.usage_events enable row level security;
alter table private.usage_tabs enable row level security;
alter table private.usage_budget enable row level security;
alter table private.usage_settings enable row level security;
revoke all on private.usage_events,private.usage_tabs,private.usage_budget from public,anon,authenticated;
revoke all on private.usage_settings from public,anon,authenticated;

create function public.ingest_admin_usage(p_tab uuid,p_events jsonb,p_active boolean)
returns void language plpgsql security definer set search_path='' as $$
declare e jsonb; inserted integer; today date=(now() at time zone 'utc')::date;
begin
 if not (select enabled from private.usage_settings) then raise sqlstate 'PT503' using message='collection_paused';end if;
 if jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>10 then raise check_violation;end if;
 perform pg_advisory_xact_lock(72106311);
 insert into private.usage_budget values(today,0) on conflict do nothing;
 if (select requests from private.usage_budget where day=today)>=5000 then raise sqlstate 'PT429' using message='usage_budget_exceeded';end if;
 insert into private.usage_tabs values(p_tab,today,now(),0) on conflict(id) do update set
 requests=case when private.usage_tabs.day=today then private.usage_tabs.requests else 0 end,day=today;
 if (select requests from private.usage_tabs where id=p_tab)>=720 then raise sqlstate 'PT429' using message='tab_budget_exceeded';end if;
 update private.usage_budget set requests=requests+1 where day=today;
 update private.usage_tabs set requests=requests+1,last_seen=case when p_active then now() else '-infinity'::timestamptz end where id=p_tab;
 for e in select * from jsonb_array_elements(p_events) loop
  if not (e->>'tool'=any(array['organize','editPdf','merge','split','extract','rotate','watermark','pageNumbers','imagesToPdf','imageConvert','compress','pdfToImage','crop','metadata','normalize','pdfToText','ocr','compare','redact','formBuilder','signPdf','pdfToOffice','documentsToPdf','extractImages','archivePdf','documentAssistant','structuredExtraction','documentAudit','classifyRename','protect','unlock','diagnose','repairAdvanced','flattenForms'])) or e->>'result' not in ('completed','failed') then raise check_violation;end if;
  insert into private.usage_events(id) values((e->>'id')::uuid) on conflict do nothing;
  get diagnostics inserted=row_count;
  if inserted=1 then
   insert into public.admin_daily_metrics(day,tool,completed,failed) values(today,e->>'tool',(e->>'result'='completed')::integer,(e->>'result'='failed')::integer)
   on conflict(day,tool) do update set completed=admin_daily_metrics.completed+excluded.completed,failed=admin_daily_metrics.failed+excluded.failed;
  end if;
 end loop;
end;$$;
revoke all on function public.ingest_admin_usage(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.ingest_admin_usage(uuid,jsonb,boolean) to service_role;

create function public.admin_usage_status() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin() then raise insufficient_privilege;end if;
 return jsonb_build_object('enabled',(select enabled from private.usage_settings),'activeSessions',(select count(*) from private.usage_tabs where last_seen>now()-interval '3 minutes'),
 'budgetUsed',coalesce((select requests from private.usage_budget where day=(now() at time zone 'utc')::date),0),'budgetLimit',5000);
end;$$;
revoke all on function public.admin_usage_status() from public,anon;
grant execute on function public.admin_usage_status() to authenticated;

create function public.admin_usage_settings(p_enabled boolean default null,p_revision integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare previous jsonb; current_revision integer;
begin
 if not private.is_admin() then raise insufficient_privilege;end if;
 select to_jsonb(s) into previous from private.usage_settings s for update;
 if p_enabled is not null then
  update private.usage_settings set enabled=p_enabled,revision=revision+1 where revision=p_revision returning revision into current_revision;
  if current_revision is null then raise sqlstate 'PT409' using message='revision_conflict';end if;
  insert into public.admin_audit(actor,action,revision,previous_value) values(auth.uid(),case when p_enabled then 'usage_collection_enabled' else 'usage_collection_disabled' end,current_revision,previous);
 end if;
 return (select jsonb_build_object('enabled',enabled,'revision',revision) from private.usage_settings);
end;$$;
revoke all on function public.admin_usage_settings(boolean,integer) from public,anon;
grant execute on function public.admin_usage_settings(boolean,integer) to authenticated;

create function public.cleanup_admin_usage() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from private.usage_events where created_at<now()-interval '7 days';
 delete from private.usage_tabs where day<(now() at time zone 'utc')::date-1;
 delete from private.usage_budget where day<(now() at time zone 'utc')::date-7;
 delete from public.admin_daily_metrics where day<(now() at time zone 'utc')::date-90;
 delete from public.admin_audit where changed_at<now()-interval '180 days';
end;$$;
revoke all on function public.cleanup_admin_usage() from public,anon,authenticated;
grant execute on function public.cleanup_admin_usage() to service_role;
