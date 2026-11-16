import test from 'node:test';import assert from 'node:assert/strict';
import {percentualNpsImportacao,interpretarOcrNps,interpretarOcrNpsGeral,vincularNps,aplicarNpsImportacao} from '../pix-importacao-nps-core.js';
import {prepararLotePix} from '../pix-importacao-lote.js';
import {localizarFaixaCabecalho} from '../pix-importacao-nps-imagem.js';
const w=(text,x,y,width=50)=>({text,bbox:{x0:x,y0:y,x1:x+width,y1:y+12},confidence:95});
const header=[w('CONSULTOR',0,0),w('UNIDADE',150,0),w('AGOSTO',300,0),w('SETEMBRO',400,0),w('OUTUBRO',500,0),w('META',610,0,35),w('NOVEMBRO',650,0,80),w('NOVEMBRO',770,0,80),w('PROM.',900,0)];
const base=[{id:'t',nome:'CONSULTORA TESTE COMPLETA',filial:'ANANINDEUA',dn:'4700',cargo:'Consultor Técnico',usaNps:true},{id:'s',nome:'SUPERVISOR',filial:'ANANINDEUA',dn:'4700',cargo:'Supervisor de Assistência',usaNps:true},{id:'o',nome:'ORÇAMENTISTA',filial:'ANANINDEUA',dn:'4700',cargo:'Orçamentista / Facilitador de Negócios',usaNps:false},{id:'g',nome:'GERENTE',filial:'ANANINDEUA',dn:'4700',cargo:'Gerente',usaNps:true}];
const raw=[{nome:base[0].nome,dn:'4700',meta:91.4,realizado:-20,total:false,competencia:'2026-11',arquivo:'imagem.png'},{nome:'TOTAL',dn:'4700',meta:91.4,realizado:70.7,total:true,competencia:'2026-11',arquivo:'imagem.png'}];
const financial=(id,extra={})=>({...base.find(p=>p.id===id),funcionarioId:id,inicio:'2026-11-09',fim:'2026-11-09',meta:100,realizado:80,ticket:10,origem:id==='t'?'Individual':'Consolidado',completo:true,...extra});
test('percentuais de NPS aceitam sinal negativo, zero e vírgula; não inventam valores ausentes',()=>{assert.equal(percentualNpsImportacao('−100,0%'),-100);assert.equal(percentualNpsImportacao('-20.0%'),-20);assert.equal(percentualNpsImportacao('0%'),0);assert.equal(percentualNpsImportacao('91,4%'),91.4);for(const n of ['',null,'101%','—','abc'])assert.equal(percentualNpsImportacao(n),null);});
test('colunas vêm dos cabeçalhos do mês; ignora histórico e não confunde TOTAL com pessoa',()=>{const words=[w('CONSULTORA TESTE COMPLETA',0,40,140),w('4700',170,40,40),w('100,0%',520,40),w('91,4%',650,40),w('-20,0%',770,40),w('TOTAL',0,80),w('91,4%',650,80),w('70,7%',770,80)];const a=interpretarOcrNps(header,words,'2026-11');assert.equal(a.linhas[0].meta,91.4);assert.equal(a.linhas[0].realizado,-20);assert.equal(a.linhas.length,1);assert.equal(a.linhas.some(r=>r.total),false);assert.throws(()=>interpretarOcrNps(header,words,'2026-10'),/META OUTUBRO/);});
test('nome truncado só vincula automaticamente se prefixo longo e único na filial',()=>{const nome='CONSULTORA TESTE COM...';let a=vincularNps([{linhas:[{...raw[0],nome,truncado:true}]}],base);assert.equal(a[0].funcionarioId,'t');const duplicado={...base[0],id:'x',nome:'CONSULTORA TESTE COM OUTRO SOBRENOME'};a=vincularNps([{linhas:[{...raw[0],nome,truncado:true}]}],[...base,duplicado]);assert.equal(a[0].vinculado,false);a=vincularNps([{linhas:[{...raw[0],nome,truncado:true}]}],[...base,duplicado],{'0:0':'t'});assert.equal(a[0].funcionarioId,'t');});
test('TOTAL dos consultores é ignorado; supervisão só usa painel de unidade na S4',()=>{
 const ns=vincularNps([{linhas:raw}],base);assert.equal(ns.length,1);
 const financeiros=[financial('t'),financial('s'),financial('o')];
 for(const semana of [1,2,3,4]){const out=aplicarNpsImportacao(financeiros,ns,base,{semana});assert.equal(out[0].npsImportado.realizado,-20);assert.equal(out[1].npsImportado,undefined);assert.equal(out[2].npsImportado,undefined);}
 const painel={tipo:'geral',linhas:[{...raw[1],total:false,geral:true,origem:'painel-unidade',nome:'ANANINDEUA (DN 4700)'}]};
 const completo=vincularNps([{linhas:raw},painel],base);
 for(const semana of [1,2,3])assert.equal(aplicarNpsImportacao(financeiros,completo,base,{semana})[1].npsImportado,undefined);
 const s4=aplicarNpsImportacao(financeiros,completo,base,{semana:4});assert.equal(s4[1].npsImportado.realizado,70.7);assert.equal(s4[1].npsImportado.origem,'painel-unidade');
});
test('meses diferentes, leitura incompleta e fontes conflitantes não sobrescrevem NPS',()=>{let ns=vincularNps([{linhas:[{...raw[0],competencia:'2026-10'}]}],base);assert.equal(aplicarNpsImportacao([financial('t')],ns,base)[0].npsImportado,undefined);ns=vincularNps([{linhas:[raw[0],{...raw[0],realizado:100}]}],base);assert.equal(aplicarNpsImportacao([financial('t')],ns,base)[0].npsImportado,undefined);});
test('núcleo só recebe painel na S4 com todas as filiais, sem somar percentuais',()=>{
 const b=[...base,{id:'m',nome:'OUTRA PESSOA',filial:'MACAPA',dn:'4756',usaNps:true}];const gerente=financial('g',{nucleoFiliais:['ANANINDEUA','MACAPA']});
 const doc={tipo:'geral',linhas:[{...raw[1],total:false,geral:true,origem:'painel-unidade',nome:'ANANINDEUA (DN 4700)'}]};
 let ns=vincularNps([doc],b);assert.equal(aplicarNpsImportacao([gerente],ns,b,{semana:4})[0].npsImportado,undefined);
 doc.linhas.push({...doc.linhas[0],nome:'MACAPA (DN 4756)',dn:'4756',realizado:100});ns=vincularNps([doc],b);
 const out=aplicarNpsImportacao([gerente],ns,b,{semana:4})[0];assert.equal(out.npsImportado.realizado,100);assert.equal(out.npsImportado.meta,91.4);assert.equal(Object.keys(out.npsImportado.filiais).length,2);
 assert.equal(aplicarNpsImportacao([gerente],ns,b,{semana:3})[0].npsImportado,undefined);
});
test('grava os percentuais conferidos só em cargos elegíveis e mantém evidências e demais campos',()=>{const nps={meta:91.4,realizado:-20,competencia:'2026-11',arquivo:'nps.png',escopo:'individual'};const row=financial('t',{npsImportado:nps});const r=prepararLotePix([row],2,base,[]);assert.equal(r.lote[0].dados.metaNps,91.4);assert.equal(r.lote[0].dados.realizadoNps,-20);assert.equal(r.lote[0].dados.realizadoNpsInformado,true);assert.equal(r.lote[0].dados.importacaoPdf.nps.arquivo,'nps.png');assert.throws(()=>prepararLotePix([financial('o',{npsImportado:nps})],2,base,[]),/não permitido/);assert.throws(()=>prepararLotePix([{...row,npsImportado:{...nps,competencia:'2026-10'}}],2,base,[]),/NPS inválido/);});
test('identifica faixa de cabeçalho colorido e rejeita imagem sem cabeçalho',()=>{const data=new Uint8ClampedArray(20*30*4).fill(255);for(let y=4;y<14;y++)for(let x=0;x<20;x++){const i=(y*20+x)*4;data[i]=10;data[i+1]=50;data[i+2]=130;}assert.deepEqual(localizarFaixaCabecalho(data,20,30),{top:4,bottom:14});assert.throws(()=>localizarFaixaCabecalho(new Uint8ClampedArray(20*30*4).fill(255),20,30),/cabeçalho/);});

test('validação de gravação rejeita NPS geral fora da S4 e TOTAL como fonte',()=>{
 const nps={meta:91.4,realizado:70.7,competencia:'2026-11',escopo:'filial',origem:'painel-unidade'};
 for(const semana of [1,2,3])assert.throws(()=>prepararLotePix([financial('s',{npsImportado:nps})],semana,base,[]),/S4/);
 assert.equal(prepararLotePix([financial('s',{npsImportado:nps})],4,base,[]).lote[0].dados.realizadoNps,70.7);
 assert.throws(()=>prepararLotePix([financial('s',{npsImportado:{...nps,origem:'total-consultores'}})],4,base,[]),/painel/);
});
test('painel identifica META e REALIZ., ignora consolidado e respeita grupos declarados',()=>{
 const h=[w('CONCESSIONÁRIA',0,0,200),w('META',350,20,60),w('REALIZ.',450,20,60),w('GERADO',560,0,70)];
 const b=[w('CUIABÁ + SINOP (DN 4738)',0,60,250),w('81,7',350,60),w('86,7',450,60),w('CONSOLIDADO DIESEL',0,100,200),w('100',350,100),w('83,9',450,100)];
 const d=interpretarOcrNpsGeral(h,b,'2026-11');assert.equal(d.linhas.length,1);assert.equal(d.linhas[0].meta,81.7);assert.equal(d.linhas[0].realizado,86.7);
 const ps=[{id:'c',nome:'C',filial:'CUIABÁ',dn:'4738'},{id:'s',nome:'S',filial:'SINOP',dn:'1928'}];
 assert.deepEqual(vincularNps([d],ps)[0].filiais,['CUIABÁ','SINOP']);
});
