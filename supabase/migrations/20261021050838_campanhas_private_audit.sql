-- Registro mínimo no servidor. Não inclui nomes, valores, snapshots ou endereços IP.
create schema if not exists campanhas_private;
revoke all on schema campanhas_private from public, anon, authenticated;
create table campanhas_private.audit_events (
 id bigint generated always as identity primary key,
 occurred_at timestamptz not null default clock_timestamp(),
 resource text not null,
 operation text not null check(operation in ('INSERT','UPDATE','DELETE')),
 subject_hash text not null,
 actor_id uuid,
 transaction_id bigint not null
);
alter table campanhas_private.audit_events enable row level security;
create index audit_events_occurred_at_idx on campanhas_private.audit_events(occurred_at);
create table campanhas_private.audit_settings (
 singleton boolean primary key default true check(singleton),
 pseudonym_salt text not null,
 retention_days integer check(retention_days between 1 and 3650)
);
alter table campanhas_private.audit_settings enable row level security;
-- Prazo nulo: nenhuma exclusão automática até aprovação da política de retenção.
insert into campanhas_private.audit_settings(singleton,pseudonym_salt) values(true,gen_random_uuid()::text || gen_random_uuid()::text);
create function campanhas_private.record_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare row_id text; salt text;
begin
 if TG_OP='DELETE' then row_id:=OLD.id::text; else row_id:=NEW.id::text; end if;
 select pseudonym_salt into strict salt from campanhas_private.audit_settings where singleton;
 insert into campanhas_private.audit_events(resource,operation,subject_hash,actor_id,transaction_id)
 values(TG_TABLE_NAME,TG_OP,pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(salt || ':' || TG_TABLE_NAME || ':' || row_id,'UTF8')),'hex'),auth.uid(),pg_catalog.txid_current());
 if TG_OP='DELETE' then return OLD; end if;
 return NEW;
end $$;
revoke all on function campanhas_private.record_change() from public,anon,authenticated;
revoke all on all tables in schema campanhas_private from public,anon,authenticated;
revoke all on all sequences in schema campanhas_private from public,anon,authenticated;
-- Somente tabelas deste sistema; outros projetos que compartilham o banco não são afetados.
do $$ declare t text; begin
 foreach t in array array['pix_funcionarios','pix_lancamentos','produtivos_funcionarios','produtivos_lancamentos','produtivos_evidencias','campanhas_configuracoes','crm_participantes','crm_importacoes','crm_competencias','crm_config'] loop
 if pg_catalog.to_regclass('public.'||t) is not null then
 execute pg_catalog.format('create trigger campanhas_audit_change after insert or update or delete on public.%I for each row execute function campanhas_private.record_change()',t);
 end if;
 end loop;
end $$;
