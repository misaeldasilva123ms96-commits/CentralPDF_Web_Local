create index admin_audit_actor_idx on public.admin_audit(actor);
create index admin_notices_updated_by_idx on public.admin_notices(updated_by);
create index admin_audit_changed_at_idx on public.admin_audit(changed_at desc);
create index admin_notices_updated_at_idx on public.admin_notices(updated_at desc);
