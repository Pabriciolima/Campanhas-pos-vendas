-- Limpeza exclusiva de logs mínimos, executável apenas pelo administrador do banco.
create function campanhas_private.purge_expired_audit() returns bigint language plpgsql security invoker set search_path='' as $$
declare days integer; removed bigint;
begin
 select retention_days into days from campanhas_private.audit_settings where singleton;
 if days is null then return 0; end if;
 delete from campanhas_private.audit_events where occurred_at < pg_catalog.now()-pg_catalog.make_interval(days=>days);
 get diagnostics removed=row_count;
 return removed;
end $$;
revoke all on function campanhas_private.purge_expired_audit() from public,anon,authenticated;