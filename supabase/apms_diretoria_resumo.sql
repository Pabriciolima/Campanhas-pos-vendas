-- Publicação intencional de totais APMs para o BI sem login, autorizada em 27/11/2026.
-- Não publica contratos, vendedores, gerentes, clientes, usuários ou evidências.
begin;
create table public.apms_diretoria_resumo (
 competencia date not null,
 apm text not null,
 apm_nome text not null,
 filial_id text not null,
 filial_nome text not null,
 uf text not null,
 contratos integer not null check (contratos >= 0),
 valor_apm numeric(16,2) not null check (valor_apm >= 0),
 data_inicio date not null,
 atualizado_em timestamptz not null default now(),
 primary key (competencia,apm,filial_id)
);
alter table public.apms_diretoria_resumo enable row level security;
revoke all on public.apms_diretoria_resumo from public,anon,authenticated;
grant select on public.apms_diretoria_resumo to anon,authenticated;
create policy apms_diretoria_totais_leitura on public.apms_diretoria_resumo
 for select to anon,authenticated using (true);

-- Atualização privada por gatilho: sem endpoint público com privilégio elevado.
create function fat_private.apms_recalcular_resumo_diretoria()
 returns trigger language plpgsql security definer set search_path = '' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(102734,271126);
 delete from public.apms_diretoria_resumo;
 insert into public.apms_diretoria_resumo
 (competencia,apm,apm_nome,filial_id,filial_nome,uf,contratos,valor_apm,data_inicio,atualizado_em)
 select c.competence,c.consultant,
 case c.consultant when 'RENAN' then 'Renan' when 'DANIELA' then 'Daniela' when 'LUANA' then 'Luana' when 'CAROLINY' then 'Caroliny' else c.consultant end,
 coalesce(c.branch_id,'nao-identificada'),coalesce(b.name,'Filial não identificada'),coalesce(b.state,c.state,''),
 count(*)::integer,sum(c.apm_amount),min((c.created_at at time zone 'America/Sao_Paulo')::date),now()
 from public.apms_campaign_claims c
 left join public.apms_campaign_branches b on b.id=c.branch_id
 group by c.competence,c.consultant,c.branch_id,b.name,b.state,coalesce(b.state,c.state,'');
 return null;
end;
$$;
revoke all on function fat_private.apms_recalcular_resumo_diretoria() from public,anon,authenticated;
create trigger apms_diretoria_claims_resumo
 after insert or update or delete on public.apms_campaign_claims
 for each statement execute function fat_private.apms_recalcular_resumo_diretoria();
create trigger apms_diretoria_filiais_resumo
 after insert or update or delete on public.apms_campaign_branches
 for each statement execute function fat_private.apms_recalcular_resumo_diretoria();

-- Carga inicial, somente a parcela apm_amount. Não altera os contratos de origem.
insert into public.apms_diretoria_resumo
 (competencia,apm,apm_nome,filial_id,filial_nome,uf,contratos,valor_apm,data_inicio)
 select c.competence,c.consultant,
 case c.consultant when 'RENAN' then 'Renan' when 'DANIELA' then 'Daniela' when 'LUANA' then 'Luana' when 'CAROLINY' then 'Caroliny' else c.consultant end,
 coalesce(c.branch_id,'nao-identificada'),coalesce(b.name,'Filial não identificada'),coalesce(b.state,c.state,''),
 count(*)::integer,sum(c.apm_amount),min((c.created_at at time zone 'America/Sao_Paulo')::date)
 from public.apms_campaign_claims c
 left join public.apms_campaign_branches b on b.id=c.branch_id
 group by c.competence,c.consultant,c.branch_id,b.name,b.state,coalesce(b.state,c.state,'');
comment on table public.apms_diretoria_resumo is 'Totais públicos APMs por mês/filial para BI sem login, por autorização de negócio. Contratos e PDFs permanecem sob RLS.';
commit;
