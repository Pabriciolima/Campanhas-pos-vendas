-- Inclui todas as parcelas da campanha, mantendo somente totais agregados sem login.
begin;
alter table public.apms_diretoria_resumo
 add column valor_vendedor numeric(16,2) not null default 0 check (valor_vendedor >= 0),
 add column valor_gerente numeric(16,2) not null default 0 check (valor_gerente >= 0);
create or replace function fat_private.apms_recalcular_resumo_diretoria()
 returns trigger language plpgsql security definer set search_path = '' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(102734,271126);
 delete from public.apms_diretoria_resumo;
 insert into public.apms_diretoria_resumo
 (competencia,apm,apm_nome,filial_id,filial_nome,uf,contratos,valor_apm,valor_vendedor,valor_gerente,data_inicio,atualizado_em)
 select c.competence,c.consultant,
 case c.consultant when 'RENAN' then 'Renan' when 'DANIELA' then 'Daniela' when 'LUANA' then 'Luana' when 'CAROLINY' then 'Caroliny' else c.consultant end,
 coalesce(c.branch_id,'nao-identificada'),coalesce(b.name,'Filial não identificada'),coalesce(b.state,c.state,''),
 count(*)::integer,sum(c.apm_amount),sum(c.seller_amount),sum(c.manager_amount),min((c.created_at at time zone 'America/Sao_Paulo')::date),now()
 from public.apms_campaign_claims c
 left join public.apms_campaign_branches b on b.id=c.branch_id
 group by c.competence,c.consultant,c.branch_id,b.name,b.state,coalesce(b.state,c.state,'');
 return null;
end;
$$;
revoke all on function fat_private.apms_recalcular_resumo_diretoria() from public,anon,authenticated;
-- Recalcula o histórico pelo gatilho, sem alterar cadastros nem contratos.
update public.apms_campaign_branches set name=name where false;
comment on table public.apms_diretoria_resumo is 'Totais públicos mensais por APM/filial: parcela APM, vendedor e gerente. Contratos e PDFs permanecem protegidos.';
commit;
