-- Run only in the dedicated staging database. All fixtures roll back.
begin;
insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at) values
 ('80000000-0000-4000-8000-000000000001','authenticated','authenticated','admin-fixture@example.invalid',now(),now(),now()),
 ('80000000-0000-4000-8000-000000000002','authenticated','authenticated','ordinary-fixture@example.invalid',now(),now(),now());
insert into auth.sessions(id,user_id,created_at,updated_at) values
 ('90000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001',now(),now()),
 ('90000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000002',now(),now());
insert into private.administrators(user_id) values('80000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2","session_id":"90000000-0000-4000-8000-000000000002","user_metadata":{"admin":true}}',true);
do $$begin
 if public.admin_membership() or public.admin_access() then raise exception 'ordinary user got admin rights';end if;
 begin perform public.admin_usage_settings();raise exception 'ordinary user read settings';exception when insufficient_privilege then null;end;
 begin perform public.admin_usage_status();raise exception 'ordinary user read usage';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.admin_notices) then raise exception 'ordinary user read private notices';end if;
 begin
 insert into public.admin_notices(title,message) values('Forbidden','Forbidden');
 raise exception 'ordinary write unexpectedly succeeded';
 exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1","session_id":"90000000-0000-4000-8000-000000000001"}',true);
do $$begin if not public.admin_membership() or public.admin_access() then raise exception 'MFA gate failed';end if;
 begin perform public.admin_usage_settings(false,1);raise exception 'MFA bypass for settings';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2","session_id":"90000000-0000-4000-8000-000000000001"}',true);
do $$declare saved public.admin_notices;begin
 if not public.admin_access() then raise exception 'verified admin denied';end if;
 declare settings jsonb; before_count integer;begin
 settings:=public.admin_usage_settings();
 select count(*) into before_count from public.admin_audit;
 perform public.admin_usage_settings(not (settings->>'enabled')::boolean,(settings->>'revision')::integer);
 if (select count(*) from public.admin_audit)<>before_count+1 then raise exception 'settings audit missing';end if;
 begin perform public.admin_usage_settings(true,(settings->>'revision')::integer);raise exception 'stale settings revision accepted';exception when sqlstate 'PT409' then null;end;
 end;
 select * into saved from public.save_admin_notice(null,'Fixture draft','Fixture message','info','draft',now(),null,null);
 perform set_config('test.notice_id',saved.id::text,true);
 if saved.revision<>1 then raise exception 'incorrect first revision';end if;
 if (select count(*) from public.admin_audit where object_id=saved.id)<>1 then raise exception 'missing atomic audit';end if;
end$$;
set local role anon;
do $$begin
 if exists(select 1 from public.published_notices() where id=current_setting('test.notice_id')::uuid) then raise exception 'draft became public';end if;
 begin perform 1 from public.admin_audit;raise exception 'anonymous audit read succeeded';exception when insufficient_privilege then null;end;
 begin perform 1 from public.admin_notices;raise exception 'anonymous table read succeeded';exception when insufficient_privilege then null;end;
end$$;
set local role authenticated;
do $$declare saved public.admin_notices;begin
 select * into saved from public.save_admin_notice(current_setting('test.notice_id')::uuid,'Published fixture','Only published text','info','published',now(),null,1);
 if saved.revision<>2 then raise exception 'revision not incremented';end if;
 begin perform public.save_admin_notice(saved.id,'Stale','Stale','info','draft',now(),null,1);raise exception 'stale revision succeeded';exception when sqlstate 'PT409' then null;end;
 if (select count(*) from public.admin_audit where object_id=saved.id)<>2 then raise exception 'audit inconsistent';end if;
 perform public.save_admin_notice(saved.id,'Private revision','Still private','info','draft',now(),null,2);
end$$;
set local role anon;
do $$begin if (select count(*) from public.published_notices() where id=current_setting('test.notice_id')::uuid)<>1 then raise exception 'published projection missing';end if;
 if (select title from public.published_notices() where id=current_setting('test.notice_id')::uuid)<>'Published fixture' then raise exception 'draft replaced published snapshot';end if;end$$;
set local role authenticated;
do $$declare saved public.admin_notices;begin
 select * into saved from public.save_admin_notice(current_setting('test.notice_id')::uuid,'Private revision','Still private','info','withdrawn',now(),null,3);
 if saved.revision<>4 or saved.published_value is not null then raise exception 'withdrawal did not clear publication';end if;
 if (select count(*) from public.admin_audit where object_id=saved.id)<>4 then raise exception 'withdrawal audit missing';end if;
 if not exists(select 1 from public.admin_audit where object_id=saved.id and revision=4 and action='notice_withdrawn' and previous_value->'published_value'->>'title'='Published fixture') then raise exception 'withdrawal audit lost prior publication';end if;
end$$;
set local role anon;
do $$begin if exists(select 1 from public.published_notices() where id=current_setting('test.notice_id')::uuid) then raise exception 'withdrawn notice remained public';end if;end$$;
reset role;
delete from auth.sessions where id='90000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$begin if public.admin_access() then raise exception 'revoked session retained access';end if;if exists(select 1 from public.admin_audit) then raise exception 'revoked session read audit';end if;
 begin perform public.admin_usage_status();raise exception 'revoked session read usage';exception when insufficient_privilege then null;end;
end$$;
rollback;
select 'PASS: ordinary account, forged metadata, MFA, anonymous reads, draft privacy, published projection, revision conflict, withdrawal, atomic audit, revoked session; fixtures rolled back' as result;
