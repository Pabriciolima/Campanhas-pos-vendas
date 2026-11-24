import test from 'node:test';import assert from 'node:assert/strict';
import {numeroBR,cargoTipo,analisarPaginas,consolidar} from '../pix-importacao-core.js';
const inicio='2026-11-09',fim=inicio;
const pessoa=(id,nome,cargo,filial='ANANINDEUA')=>({id,nome,cargo,filial,ativo:true});
const row=(nome,tipo,meta,realizado,ticket=null,margem=null)=>({nome,tipo,meta,realizado,ticket,margem,inicio,fim});
const doc=(linhas)=>({inicio,fim,linhas});
const base=[pessoa('t','Técnica A','Consultor Técnico'),pessoa('b','Balcão B','Consultor Peças Balcão'),pessoa('s','Supervisora','Supervisor de Assistência'),pessoa('o','Orçamento','Orçamentista / Facilitador de Negócios'),pessoa('p','Peças','Supervisor Peças'),pessoa('g','Gerente','Gerente')];
const docs=[doc([row('Tecnica A','tecnico',100,80,10)]),doc([row('BALCÃO B','balcao',200,90,null,30),row('Técnica A','balcao',500,999,null,40)])];
test('lê reais, percentuais, zero e rejeita valores inválidos',()=>{assert.equal(numeroBR('R$ 1.234,56'),1234.56);assert.equal(numeroBR('% 35,12'),35.12);assert.equal(numeroBR('0,00'),0);assert.equal(numeroBR(''),null);assert.equal(numeroBR('Nome'),null);assert.equal(cargoTipo('Supervisor de Atendimento Técnico'),'supervisor-tecnico');});
test('vincula pelo nome/cargo; não conta técnico duas vezes no relatório de peças',()=>{const r=consolidar(docs,base);assert.equal(r.pendencias.length,0);assert.equal(r.ignorados.length,1);const g=r.linhas.find(r=>r.funcionarioId==='g');assert.equal(g.realizado,170);assert.equal(g.meta,300);assert.equal(g.ticket,10);const s=r.linhas.find(r=>r.funcionarioId==='s');const o=r.linhas.find(r=>r.funcionarioId==='o');assert.equal(s.meta,o.meta);assert.equal(s.realizado,o.realizado);assert.equal(s.ticket,o.ticket);assert.equal(r.linhas.find(r=>r.funcionarioId==='p').margem,30);});
test('calcula médias dos supervisores e mantém totais financeiros sem somar consolidados',()=>{const b=[...base,pessoa('t2','Técnico B','Consultor Técnico'),pessoa('b2','Balcão C','Consultor Peças Balcão')];const d=[...docs,doc([row('Técnico B','tecnico',50,40,20),row('Balcão C','balcao',50,20,null,40)])];const r=consolidar(d,b);assert.equal(r.linhas.find(r=>r.funcionarioId==='s').ticket,15);assert.equal(r.linhas.find(r=>r.funcionarioId==='p').margem,35);assert.equal(r.linhas.find(r=>r.funcionarioId==='g').realizado,230);});
test('gerência reconhece setores zerados sem adicionar dias e metas dos ausentes',()=>{const n=[{nome:'Gerente',filiais:['ANANINDEUA','MACAPA']}];let r=consolidar(docs,base,n);assert.equal(r.linhas.find(r=>r.funcionarioId==='g').completo,false);const b=[...base,pessoa('tm','Técnico M','Consultor Técnico','MACAPÁ'),pessoa('bm','Balcão M','Consultor Peças Balcão','MACAPÁ')];r=consolidar([...docs,doc([row('Técnico M','tecnico',100,0,0),row('Balcão M','balcao',200,0,null,0)])],b,n);const g=r.linhas.find(r=>r.funcionarioId==='g');assert.equal(g.completo,true);assert.equal(g.meta,300);assert.equal(g.realizado,170);});
test('nomes ambíguos não adivinham filial; vínculo explícito resolve; inativos são excluídos',()=>{const b=[...base,pessoa('dup','Técnica A','Consultor Técnico','MACAPÁ')];const r=consolidar(docs,b);assert.equal(r.pendencias.length,2);const resolved=consolidar(docs,b,[],{'0:0':'t','1:1':'t'});assert.equal(resolved.pendencias.length,0);assert.equal(resolved.linhas.find(r=>r.funcionarioId==='t').filial,'ANANINDEUA');const inativos=base.map(p=>p.id==='t'?{...p,ativo:false}:p);assert(consolidar(docs,inativos).pendencias.length>0);});
test('fora da campanha só é descartado com escolha explícita; períodos diferentes e duplicações bloqueiam',()=>{const extra=doc([row('Desconhecido','balcao',1,1,null,10)]);assert.equal(consolidar([...docs,extra],base).pendencias.length,1);assert.equal(consolidar([...docs,extra],base,[],{'2:0':'__ignorar__'}).pendencias.length,0);assert.throws(()=>consolidar([docs[0],docs[0]],base),/duplicada/);assert.throws(()=>consolidar([docs[0],{...docs[1],inicio:'2026-11-10'}],base),/datas diferentes/);});
function item(str,x,y,width=20){return {str,transform:[4,0,0,4,x,y],width};}
test('parser preserva colunas vazias: ticket é a coluna 7; meta soma M.O. e peças; ignora total e rodapé',()=>{
 const h=['Vendedor','Vlr. Acumulado','Vlr. Franquia','Vlr. Dia','Vlr. Franquia','Vlr. Total','Ticket Médio','Objetivo M.O.','Vlr. M.O.','Dif. M.O.','Objetivo Peças','Vlr. Peças'].map((s,i)=>item(s,i*50,500));
 const r=[item('TÉCNICA A',0,490),item('1.000,00',250,490),item('250,00',300,490),item('400,00',350,490),item('600,00',500,490)];
 const p={items:[item('Consultor Técnico - O.S. Faturadas - Data Ref.: 09/11/2026 a 09/11/2026',0,540),...h,...r,item('4',0,480),item('9.999,00',250,480),item('AUTOR DO RELATORIO',0,20)]};
 const parsed=analisarPaginas([p]);assert.equal(parsed.linhas.length,1);assert.equal(parsed.linhas[0].ticket,250);assert.equal(parsed.linhas[0].realizado,1000);assert.equal(parsed.linhas[0].meta,1000);
});
test('parser de balcão usa % Rent. e não rentabilidade monetária',()=>{const p={items:[item('Venda de Peças por Vendedor - Data Ref.: 09/11/2026 a 09/11/2026',0,540),...['Vendedor','Valor Venda','Objetivo','Rent.','% Rent.','Obj. Luc.'].map((s,i)=>item(s,i*100,500)),item('BALCAO B',0,490),item('R$ 300,00',100,490),item('R$ 400,00',200,490),item('R$ 90,00',300,490),item('% 30,00',400,490)]};const parsed=analisarPaginas([p]);assert.equal(parsed.linhas[0].margem,30);assert.equal(parsed.linhas[0].meta,400);assert.equal(parsed.linhas[0].realizado,300);});

test('médias excluem colaboradores sem movimento e respeitam a filial',()=>{
 const b=[...base,pessoa('t2','Técnico B','Consultor Técnico'),pessoa('t3','Técnico Zero','Consultor Técnico'),pessoa('b2','Balcão Zero','Consultor Peças Balcão'),pessoa('tm','Técnico Macapá','Consultor Técnico','MACAPÁ')];
 const d=[...docs,doc([row('Técnico B','tecnico',50,40,20),row('Técnico Zero','tecnico',0,0,0),row('Balcão Zero','balcao',0,0,null,0),row('Técnico Macapá','tecnico',500,500,900)])];
 const r=consolidar(d,b),s=r.linhas.find(r=>r.funcionarioId==='s'),p=r.linhas.find(r=>r.funcionarioId==='p');
 assert.equal(s.ticket,15);assert.equal(s.meta,150);assert.equal(s.realizado,120);assert.equal(p.margem,30);
});
test('remover e restaurar consultor recalcula a média do supervisor',()=>{
 const b=[...base,pessoa('t2','Técnico B','Consultor Técnico')],d=[...docs,doc([row('Técnico B','tecnico',50,40,20)])],excluidos=new Set(['t']);
 assert.equal(consolidar(d,b,[],{},excluidos).linhas.find(r=>r.funcionarioId==='s').ticket,20);
 excluidos.clear();assert.equal(consolidar(d,b,[],{},excluidos).linhas.find(r=>r.funcionarioId==='s').ticket,15);
});
test('média técnica é arredondada somente após somar os tickets',()=>{
 const b=[...base,pessoa('t2','Técnico B','Consultor Técnico'),pessoa('t3','Técnico C','Consultor Técnico')];
 const d=[doc([row('Tecnica A','tecnico',1,1,100),row('Técnico B','tecnico',1,1,100),row('Técnico C','tecnico',1,1,101)])];
 assert.equal(consolidar(d,b).linhas.find(r=>r.funcionarioId==='s').ticket,100.33);
});
