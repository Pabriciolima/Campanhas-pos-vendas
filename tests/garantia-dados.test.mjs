import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {numero,filial,vazio,mesclar,apurarPessoa,escopoPessoa,importarOriginal,lerCsv,chavePessoa} from '../garantia-dados.js';
const local={nome:'Pessoa Teste',perfil:'localAssist',filial:'ANANINDEUA'};
const metrics={osAbertas:100,osFechadas:100,malote:100,devolutivas:0,osDevolutivasBase:100,frete:0,divergencia:0,nfPendentes:0,sgPendentes:0};
const mes=(changes={},p=local)=>({metricas:{[escopoPessoa(p)]:{...metrics,...changes}},participantes:[p],validados:{},fontes:[]});
test('normalização de filiais, decimais brasileiros, zeros e ausências',()=>{assert.equal(filial('Belém'),'ANANINDEUA');assert.equal(filial('São Luís'),'SÃO LUIS');assert.equal(filial('Ji Paraná'),'JIPARANÁ');assert.equal(numero('R$ 1.234,56'),1234.56);assert.equal(numero(''),null);assert.equal(numero('NA'),null);assert.equal(numero('0'),0);assert.equal(numero(true),null);});
test('local: limites de volume, percentual real, gatilhos e multas',()=>{
 for(const [q,assist,aux] of [[100,300,300],[101,353.5,252.5],[300,1050,750],[301,903,602],[400,1200,800],[401,1203,802]]){
 for(const [perfil,expected] of [['localAssist',assist],['localAux',aux]]){const p={...local,perfil};assert.equal(apurarPessoa(p,mes({osFechadas:q,osAbertas:q},p)).total,expected);}}
 assert.equal(apurarPessoa(local,mes({osFechadas:80})).total,240);assert.equal(apurarPessoa(local,mes({osFechadas:79})).total,0);assert.equal(apurarPessoa(local,mes({malote:74.99})).total,0);
 assert.equal(apurarPessoa(local,mes({devolutivas:6})).total,210);assert.equal(apurarPessoa(local,mes({devolutivas:5})).total,300);
 assert.equal(apurarPessoa(local,mes({divergencia:5})).total,300);assert.equal(apurarPessoa(local,mes({divergencia:5.01,frete:2,nfPendentes:1,sgPendentes:1,devolutivas:6})).total,30);
 assert.equal(apurarPessoa(local,mes({frete:null})).total,null);
});
test('analista: extra exige todas as unidades, não apenas a média; erros cancelam extra',()=>{
 const p={nome:'Analista Teste',perfil:'analista',unidades:['A','B']};const central={osAbertas:100,osFechadas:120,valorFaturado:100,valorRecebido:120,insercao:100,sgPosicao:100,errosValidos:0};let m={metricas:{[escopoPessoa(p)]:central,A:{...central},B:{...central}},validados:{}};
 assert.equal(apurarPessoa(p,m).total,1800);m.metricas.B.valorRecebido=99;assert.equal(apurarPessoa(p,m).total,1200);m.metricas.B.valorRecebido=120;m.metricas[escopoPessoa(p)].errosValidos=5;assert.equal(apurarPessoa(p,m).total,840);delete m.metricas.B;assert.equal(apurarPessoa(p,m).total,null);
});
test('importação parcial preserva demais campos, invalida conferências e isola meses',()=>{
 let s=mesclar(vazio(),{competencia:'2026-09',metricas:{A:{osAbertas:100,valorFaturado:500}},participantes:[local]});s.competencias['2026-09'].validados.x={total:1};const next=mesclar(s,{competencia:'2026-09',metricas:{A:{valorRecebido:450}}});assert.equal(next.competencias['2026-09'].metricas.A.osAbertas,100);assert.deepEqual(next.competencias['2026-09'].validados,{});assert.equal(s.competencias['2026-09'].metricas.A.valorRecebido,undefined);
 const other=mesclar(next,{competencia:'2026-10',metricas:{A:{valorFaturado:100}}});assert.equal(other.competencias['2026-09'].metricas.A.valorFaturado,500);
 assert.throws(()=>mesclar(other,{competencia:'2026-10',participantes:[local,local]}),/duplicado/);
 assert.throws(()=>mesclar(other,{competencia:'2026-10',metricas:JSON.parse('{"__proto__":{"polluted":true}}')}),/inválida/);
});
test('CSV lê aspas, separadores e quebras dentro de células',()=>{assert.deepEqual(lerCsv('nome;valor\r\n"Teste; Pessoa";"1.234,50"\r\n'),[['nome','valor'],['Teste; Pessoa','1.234,50']]);assert.throws(()=>lerCsv('a;b\n"x'),/aspas/);});
test('arquivo real: todas as abas são analisadas sem publicar dados pessoais nas fixtures',{skip:!process.env.GARANTIA_WORKBOOK_JSON},()=>{
 const source=JSON.parse(fs.readFileSync(process.env.GARANTIA_WORKBOOK_JSON,'utf8'));const wb={SheetNames:Object.keys(source),Sheets:Object.fromEntries(Object.entries(source).map(([name,cells])=>[name,Object.fromEntries(Object.entries(cells).map(([addr,c])=>[addr,{v:c.v,t:c.t,f:c.f}]))]))};
 const lote=importarOriginal(wb,'2026-09');assert.equal(lote.participantes.length,31);assert.equal(lote.metricas.GERAL.osFechadas,2132);assert(lote.avisos.some(v=>v.includes('#REF!')));assert.equal(lote.participantes.filter(p=>p.perfil==='analista').length,5);assert.throws(()=>importarOriginal(wb,'2026-10'),/Competência/);
 const state=mesclar(vazio(),{...lote,arquivo:'origem.xlsx'}),m=state.competencias['2026-09'];const central=m.participantes.filter(p=>p.perfil==='assistente').map(p=>apurarPessoa(p,m));assert.deepEqual(central.map(r=>r.total),[920,845]);assert.equal(m.participantes.filter(p=>p.perfil==='lider').map(p=>apurarPessoa(p,m))[0].total,2100);
 // A equipe local abaixo do mínimo de faturamento diverge corretamente do histórico.
 const conferido=structuredClone(m);for(const v of Object.values(conferido.metricas))for(const k of ['devolutivas','frete','divergencia','nfPendentes','sgPendentes'])if(v[k]===null)v[k]=0;assert(conferido.participantes.filter(p=>p.perfil==='localAux').map(p=>apurarPessoa(p,conferido)).some(r=>r.total===0&&r.divergente));
 assert.equal(m.participantes.filter(p=>p.perfil==='localAux').length,12);
});
test('alterar filial invalida consolidados dependentes, sem reutilizar uma apuração antiga',()=>{
 const a={nome:'Analista',perfil:'analista',filial:'CENTRAL',unidades:['A']};let s=mesclar(vazio(),{competencia:'2026-09',metricas:{A:{valorFaturado:100},GERAL:{valorFaturado:100},[escopoPessoa(a)]:{valorFaturado:100}},participantes:[a]});
 s=mesclar(s,{competencia:'2026-09',metricas:{A:{valorFaturado:200}}});assert.equal(s.competencias['2026-09'].metricas.GERAL.desatualizado,true);assert.equal(s.competencias['2026-09'].metricas[escopoPessoa(a)].desatualizado,true);assert(apurarPessoa(a,s.competencias['2026-09']).pendencias.some(p=>p.includes('desatualizado')));
 const refreshed=mesclar(s,{competencia:'2026-09',completo:true,metricas:{GERAL:{valorFaturado:200}}});assert.equal(refreshed.competencias['2026-09'].metricas.GERAL.desatualizado,false);
});
test('percentual novo de inserção não fica oculto por amostra antiga; entradas inválidas são rejeitadas',()=>{
 let s=mesclar(vazio(),{competencia:'2026-09',metricas:{A:{insercao:100,insercaoC:4,insercaoNC:0}}});s=mesclar(s,{competencia:'2026-09',metricas:{A:{insercao:80}}});assert.equal(s.competencias['2026-09'].metricas.A.insercaoC,null);
 assert.throws(()=>mesclar(s,{competencia:'2026-09',metricas:{A:{aegCorrecao:101}}}),/Percentual/);assert.throws(()=>mesclar(s,{competencia:'2026-09',metricas:{A:{devolutivas:1.5}}}),/inteira/);assert.throws(()=>mesclar(s,{competencia:'__proto__',metricas:{}}),/Competência/);
});

test('mínimo local de 80% não admite arredondamento nem exceção da referência Excel',()=>{for(const perfil of ['localAssist','localAux','admPv']){const p={...local,perfil,conferirReferencia:true,referencia:198.53};const r=apurarPessoa(p,mes({osFechadas:7353,osAbertas:10000},p));assert.equal(r.total,0);assert.equal(r.status,'NÃO HABILITADO');assert.equal(r.referencia,198.53);assert.equal(r.divergente,true);assert.equal(apurarPessoa(p,mes({osFechadas:799999,osAbertas:1000000},p)).total,0);const at=apurarPessoa({...p,conferirReferencia:false},mes({osFechadas:80,osAbertas:100},p));assert.equal(at.total,240);assert.equal(at.status,'EM CONFERÊNCIA');assert.equal(apurarPessoa(p,mes({osFechadas:79,frete:null},p)).total,null);}});
