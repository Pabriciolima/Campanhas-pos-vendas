import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMPANHAS,perfilDiretoria,centavos,registroFinanceiro,consolidarInvestimento,dadosDemonstracao} from '../diretoria/core.mjs';
import {lerTudo} from '../diretoria/pagination.mjs';
const fontes=CAMPANHAS.map(c=>({id:c.id,status:'ok'}));
const reg=(extra={},valor=10)=>registroFinanceiro('pix',{id:'1',competencia:'2026-11',semana:1,...extra},valor);
test('visibilidade Abel, nome completo, expiração e usuários comuns',()=>{
 const agora=100000,p={nome:' Abel ',filial:'ANANINDEUA',expiresAt:agora+1000};
 assert.equal(perfilDiretoria(p,agora),true);assert.equal(perfilDiretoria({...p,nome:'Abel Silva'},agora),true);
 for(const nome of ['Abelardo','Isabel','Pabricio',''])assert.equal(perfilDiretoria({...p,nome},agora),false);
 assert.equal(perfilDiretoria({...p,expiresAt:agora},agora),false);assert.equal(perfilDiretoria(null,agora),false);
});
test('dinheiro em centavos e rejeição de dados ausentes ou inválidos',()=>{
 assert.equal(centavos(1.23),123);for(const v of [null,undefined,'',-1,NaN,Infinity])assert.equal(centavos(v),null);
 assert.equal(consolidarInvestimento([reg({},.1),reg({id:'2'},.2)],fontes,{base:'apurado'}).totalCentavos,30);
});
test('habilitado e validado não significam pago; somente confirmação explícita',()=>{
 assert.equal(reg({status:'HABILITADO'}).pago,0);assert.equal(reg({status:'VALIDADO'}).pago,0);
 assert.equal(reg({pago:true,valorPago:7}).pago,700);assert.equal(reg({statusPagamento:'PAGO'}).pago,1000);
 assert.equal(consolidarInvestimento([reg()],fontes).totalCentavos,0);
 assert.equal(consolidarInvestimento([reg()],fontes,{base:'apurado'}).totalCentavos,1000);
});
test('não inclui réplicas ou lixeira',()=>{assert.equal(reg({replicaNucleo:true}),null);assert.equal(reg({deleted_at:'2026-11-01'}),null);assert.equal(reg({competencia:'2026-13'}),null);});
test('deduplica núcleo e mantém a atualização mais recente',()=>{
 const a=reg({id:'a',nome:'Gestor',nucleoFiliais:['B','A'],updated_at:'2026-11-01'},100);
 const b=reg({id:'b',nome:'Gestor',nucleoFiliais:['A','B'],updated_at:'2026-11-02'},200);
 assert.equal(consolidarInvestimento([a,b],fontes,{base:'apurado'}).totalCentavos,20000);
});
test('filtros históricos, ciclos semanais e percentuais',()=>{
 const rs=[reg({pago:true},100),reg({id:'2',semana:2,pago:true},200),reg({id:'3',competencia:'2025-10',pago:true},50)];
 const r=consolidarInvestimento(rs,fontes,{ano:'2026',mes:'11'});assert.equal(r.totalCentavos,30000);assert.equal(r.linhas[0].ciclos,2);assert.equal(r.lider.participacao,100);assert.deepEqual(r.anos,['2026','2025']);
});
test('fontes indisponíveis são separadas de campanhas sem valores',()=>{
 const r=consolidarInvestimento([],fontes.map(f=>f.id==='garantia'?{...f,status:'protegido'}:f));assert.equal(r.cobertura,CAMPANHAS.length-1);assert.equal(r.linhas.find(l=>l.id==='garantia').disponivel,false);assert.equal(r.linhas[0].disponivel,true);
});
test('demonstração fica independente dos registros oficiais',()=>{
 const d=dadosDemonstracao();assert.equal(d.demo,true);assert.equal(d.registros.length,CAMPANHAS.length*6);assert.ok(consolidarInvestimento(d.registros,d.fontes).totalCentavos>0);assert.equal(consolidarInvestimento([],fontes).totalCentavos,0);
});
test('consulta paginada carrega além do limite de mil registros',async()=>{
 const todos=Array.from({length:1201},(_,id)=>({id}));let pages=0;
 const client={from:()=>({select:()=>({order:()=>({range:(a,b)=>{pages++;return Promise.resolve({data:todos.slice(a,b+1),error:null});}})})})};
 assert.equal((await lerTudo(client,'tabela')).length,1201);assert.equal(pages,3);
});
test('falhas de leitura não se transformam em histórico vazio',async()=>{
 const client={from:()=>({select:()=>({order:()=>({range:async()=>({data:null,error:Error('RLS')})})})})};await assert.rejects(()=>lerTudo(client,'tabela'),/RLS/);
});
