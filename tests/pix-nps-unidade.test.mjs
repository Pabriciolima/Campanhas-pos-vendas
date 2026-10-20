import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { chaveNpsUnidade, avaliarNpsUnidade, percentualNpsUnidade, mensagemNpsUnidade } from '../pix-nps-unidade-core.js';

test('filial e competência são isoladas; zero e números negativos não viram pendência', () => {
  assert.equal(chaveNpsUnidade('  Jiparaná ', '2026-10'), chaveNpsUnidade('JIPARANA', '2026-10'));
  assert.notEqual(chaveNpsUnidade('BELEM', '2026-10'), chaveNpsUnidade('BELEM', '2026-11'));
  assert.notEqual(chaveNpsUnidade('BELEM', '2026-10'), chaveNpsUnidade('MARABA', '2026-10'));
  assert.equal(chaveNpsUnidade('BELEM','2026-13'),'');
  for (const value of ['',null,undefined,'inválido',101,-101,Infinity]) assert.equal(percentualNpsUnidade(value),null);
  assert.equal(percentualNpsUnidade('89,99'),89.99);
  assert.equal(avaliarNpsUnidade({meta:90,realizado:90}).atingiu,true);
  assert.equal(avaliarNpsUnidade({meta:90,realizado:89.99}).atingiu,false);
  assert.equal(avaliarNpsUnidade({meta:90,realizado:0}).status,'NAO_ATINGIDO');
  assert.equal(avaliarNpsUnidade({meta:90,realizado:-20}).status,'NAO_ATINGIDO');
  assert.equal(avaliarNpsUnidade({meta:90,realizado:''}).status,'PENDENTE');
  assert.equal(avaliarNpsUnidade({meta:90,realizado:95},{erro:true}).atingiu,false);
});
function motor() {
  const estados=new Map();
  const doc={querySelector:()=>null,addEventListener(){}};
  const window={addEventListener(){},setTimeout,clearTimeout};
  const ctx={document:doc,window,console:{info(){},warn(){},error(){}},firestore:{},supabase:{},collection:()=>({}),localStorage:{getItem:()=>null,setItem(){}},setTimeout,clearTimeout,mensagemNpsUnidade,
    criarNpsUnidadePix:()=>({avaliar:(f,c)=>avaliarNpsUnidade(estados.get(chaveNpsUnidade(f,c))),atualizarResumo(){},carregar:async()=>{},iniciar:async()=>{}})};
  vm.createContext(ctx);
  const source=fs.readFileSync(new URL('../pix-presidente.js',import.meta.url),'utf8').replace(/^import\s[\s\S]*?;\n/gm,'');
  vm.runInContext(source+'\nglobalThis.fixture={estadoPix,calcularPix};',ctx);
  return {...ctx.fixture,window,estados};
}
const lancamento=(id,semana,filial='BELEM',extra={})=>({id:id+'-'+semana,funcionarioId:id,nome:id,filial,cargo:'Consultor Técnico',competencia:'2026-10',semana,metaSemanal:100,realizadoSemanal:100,ticketMedio:8100,ticketMedioInformado:true,metaNps:90,realizadoNps:95,realizadoNpsInformado:true,osAbertaPercentual:0,osAbertaInformada:true,datasAvaliadas:['2026-10-'+String(1+(semana-1)*7).padStart(2,'0')],diasCalendario:{['2026-10-'+String(1+(semana-1)*7).padStart(2,'0')]:{realizado:100}},...extra});
function seed(m){m.estadoPix.funcionarios=[{id:'A',nome:'A',cargo:'Consultor Técnico',filial:'BELEM'},{id:'B',nome:'B',cargo:'Gerente',filial:'BELEM'},{id:'C',nome:'C',cargo:'Consultor Técnico',filial:'MARABA'}];m.estadoPix.lancamentos=['A','B','C'].flatMap(id=>[1,2,3,4].map(w=>lancamento(id,w,id==='C'?'MARABA':'BELEM')));}
test('trava da filial zera o cofrinho de todos sem modificar base, faixa ou reservas',()=>{
 const m=motor();seed(m);m.estados.set(chaveNpsUnidade('BELEM','2026-10'),{meta:90,realizado:90});m.estados.set(chaveNpsUnidade('MARABA','2026-10'),{meta:90,realizado:95});
 for(const id of ['A','B']){
  const l=m.estadoPix.lancamentos.find(x=>x.funcionarioId===id&&x.semana===4),ok=m.calcularPix(l);
  assert.equal(ok.bonusNps,1000);assert.equal(ok.npsCofrinhoStatus,'LIBERADO');
  m.estados.set(chaveNpsUnidade('BELEM','2026-10'),{meta:90,realizado:89.99});
  const no=m.calcularPix(l);assert.equal(no.bonusNps,0);assert.equal(no.npsCofrinhoStatus,'BLOQUEADO PELA FILIAL');assert.equal(no.bonusBase,ok.bonusBase);assert.equal(no.bonusFaixa,ok.bonusFaixa);assert.equal(ok.bonusFinal-no.bonusFinal,1000);assert.match(no.observacao,/zerado para todos/);
  m.estados.set(chaveNpsUnidade('BELEM','2026-10'),{meta:90,realizado:90});
 }
 assert.equal(m.calcularPix(lancamento('C',4,'MARABA')).bonusNps,1000);
 m.estados.clear();assert.equal(m.calcularPix(lancamento('A',4)).bonusNps,0);assert.equal(m.calcularPix(lancamento('A',4)).npsCofrinhoStatus,'AGUARDANDO NPS DA FILIAL');
 assert.equal(m.calcularPix(lancamento('A',1)).bonusNps,0);assert.equal(m.calcularPix(lancamento('A',1)).npsCofrinhoPotencial,750);
});
test('regras individuais e O.S. continuam valendo, e períodos anteriores são preservados',()=>{
 const m=motor();seed(m);m.estados.set(chaveNpsUnidade('BELEM','2026-10'),{meta:90,realizado:95});
 assert.equal(m.calcularPix(lancamento('A',4,'BELEM',{realizadoNps:89})).bonusNps,0);
 assert.equal(m.calcularPix(lancamento('A',4,'BELEM',{realizadoNps:95,realizadoNpsInformado:false})).bonusNps,0);
 const os=m.calcularPix(lancamento('A',4,'BELEM',{osAbertaPercentual:29}));assert.equal(os.bonusNps,1000);assert.equal(os.penalidade,os.subtotal*.5);assert.equal(os.bonusFinal,os.subtotal*.5);
 const below=m.calcularPix(lancamento('A',4,'BELEM',{metaSemanal:200}));assert.equal(below.bonusBase,0);assert.equal(below.bonusFaixa,0);assert.equal(below.bonusNps,1000);
 m.estados.clear();const old=m.calcularPix(lancamento('A',4,'BELEM',{competencia:'2026-09'}));assert.equal(old.exigeNpsUnidade,false);assert.equal(old.bonusNps,1000);
 const novembro=m.calcularPix(lancamento('A',4,'BELEM',{competencia:'2026-11'}));assert.equal(novembro.bonusNps,0);
});
test('relatório histórico usa as quatro semanas fornecidas e restaura o estado da tela',()=>{
 const m=motor();seed(m);m.estados.set(chaveNpsUnidade('BELEM','2026-10'),{meta:90,realizado:90});
 const all=m.estadoPix.lancamentos,semana4=lancamento('A',4);m.estadoPix.lancamentos=[];
 const total=m.window.calcularPagamentoPixHistorico(semana4,all);assert.equal(total,2700);assert.equal(m.estadoPix.lancamentos.length,0);
 m.estados.set(chaveNpsUnidade('BELEM','2026-10'),{meta:90,realizado:80});assert.equal(m.window.calcularPagamentoPixHistorico(semana4,all),1700);
});

 test('metas variáveis por filial e mês, sem alvo implícito de 90%',()=>{
 const m=motor();seed(m);
 m.estados.set(chaveNpsUnidade('BELEM','2026-10'),{meta:85,realizado:86});
 m.estadoPix.lancamentos=m.estadoPix.lancamentos.map(l=>({...l,metaNps:80,realizadoNps:81}));
 assert.equal(m.calcularPix(lancamento('A',4,'BELEM',{metaNps:80,realizadoNps:81})).bonusNps,1000);
 m.estados.set(chaveNpsUnidade('MARABA','2026-10'),{meta:95,realizado:94});
 assert.equal(m.calcularPix(lancamento('C',4,'MARABA',{metaNps:80,realizadoNps:81})).bonusNps,0);
 m.estados.set(chaveNpsUnidade('BELEM','2026-11'),{meta:98,realizado:97});
 assert.equal(m.calcularPix(lancamento('A',4,'BELEM',{competencia:'2026-11',metaNps:80,realizadoNps:81})).bonusNps,0);
 assert.equal(avaliarNpsUnidade({realizado:95}).status,'PENDENTE');
 assert.equal(m.calcularPix(lancamento('A',4,'BELEM',{metaNps:85,realizadoNps:84})).bonusNps,0);
 });
