import test from 'node:test';import assert from 'node:assert/strict';
import {importarRecebimento,competenciaValor} from '../garantia-recebimento.js';
import {vazio,mesclar,escopoPessoa} from '../garantia-dados.js';
const names=['BELÉM','TERESINA','URUÇUÍ','SÃO LUIZ','BACABAL','CUIABÁ','SINOP','RONDONÓPOLIS','ÁGUA BOA','MACAPÁ','PORTO VELHO','JI-PARANÁ','VILHENA'];
function sheet(ano=2026,mult=1){const s={I5:{v:'CRÉDITO LÍQUIDO'},H5:{v:'CRÉDITO BRUTO'},A37:{v:'segunda-feira, 14 de setembro de '+ano}};names.forEach((nome,i)=>{s['A'+(i+6)]={v:'DN '+(4700+i)+' - DIESEL '+nome};s['I'+(i+6)]={v:(i+1)*mult};s['H'+(i+6)]={v:999999}});s.A19={v:'TOTAL'};s.I19={v:91*mult};s.A39={v:'DN 4700 - DIESEL BELÉM'};s.I39={v:123456};return s;}
const wb=()=>({SheetNames:['Outubro','Setembro','BD Garantia'],Sheets:{Outubro:sheet(2026,100),Setembro:sheet(), 'BD Garantia':{A1:{v:'Outra base'}}}});
test('setembro importa só crédito líquido do resumo, nunca outubro, bruto ou semanais',()=>{const lote=importarRecebimento(wb(),'2026-09');assert.equal(lote.metricas.ANANINDEUA.valorRecebido,1);assert.equal(lote.metricas.GERAL.valorRecebido,91);assert.equal(Object.keys(lote.metricas).length,14);assert.equal(lote.metricas.ANANINDEUA.valorFaturado,undefined);});
test('competência, ano, total, duplicidades, erros e ausências são validados',()=>{
 assert.throws(()=>importarRecebimento(wb(),'2026-08'),/única aba/);let w=wb();w.Sheets.Setembro=sheet(2025);assert.throws(()=>importarRecebimento(w,'2026-09'),/ano identificado/);w=wb();delete w.Sheets.Setembro.A37;assert.throws(()=>importarRecebimento(w,'2026-09'),/identifica o ano/);
 w=wb();w.Sheets.Setembro.I19.v=90;assert.throws(()=>importarRecebimento(w,'2026-09'),/não confere/);w=wb();w.Sheets.Setembro.I6={v:23,t:'e'};assert.throws(()=>importarRecebimento(w,'2026-09'),/com erro/);w=wb();w.Sheets.Setembro.I6={v:null};assert.throws(()=>importarRecebimento(w,'2026-09'),/ausente/);w=wb();w.Sheets.Setembro.A7.v=w.Sheets.Setembro.A6.v;assert.throws(()=>importarRecebimento(w,'2026-09'),/duplicada/);
});
test('atualiza só recebimento da competência e consolida unidades dos analistas',()=>{
 const p={nome:'Analista',perfil:'analista',filial:'CENTRAL',unidades:['ANANINDEUA','TERESINA']};const s=mesclar(vazio(),{competencia:'2026-09',participantes:[p],metricas:{ANANINDEUA:{valorFaturado:123,osAbertas:100,insercao:85},GERAL:{valorFaturado:1000},[escopoPessoa(p)]:{valorFaturado:300}}});const lote=importarRecebimento(wb(),'2026-09',[p]);assert.equal(lote.metricas[escopoPessoa(p)].valorRecebido,3);const next=mesclar(s,lote);assert.equal(next.competencias['2026-09'].metricas.ANANINDEUA.valorFaturado,123);assert.equal(next.competencias['2026-09'].metricas.ANANINDEUA.insercao,85);assert.equal(next.competencias['2026-09'].metricas.GERAL.valorRecebido,91);assert.equal(next.competencias['2026-10'],undefined);
});
test('datas numéricas de Excel são aceitas; formato monetário Red não é data',()=>{
 const w=wb();delete w.Sheets.Setembro.A37;w.Sheets.Setembro.F37={v:46279,z:'dddd, d "de" mmmm "de" yyyy'}; // ano 2026
 w.Sheets.Setembro.H6={v:40000,z:'[Red]R$ #,##0.00'};assert.equal(importarRecebimento(w,'2026-09').metricas.GERAL.valorRecebido,91);
});
test('consolidado já desatualizado não é liberado por um ajuste isolado de recebimento',()=>{
 let s=mesclar(vazio(),{competencia:'2026-09',metricas:{ANANINDEUA:{valorFaturado:100},GERAL:{valorFaturado:100}}});s=mesclar(s,{competencia:'2026-09',metricas:{ANANINDEUA:{valorFaturado:200}}});assert.equal(s.competencias['2026-09'].metricas.GERAL.desatualizado,true);s=mesclar(s,importarRecebimento(wb(),'2026-09'));assert.equal(s.competencias['2026-09'].metricas.GERAL.desatualizado,true);
});
test('normalização de competência para importação tabular',()=>{assert.equal(competenciaValor('setembro/2026'),'2026-09');assert.equal(competenciaValor('09/2026'),'2026-09');assert.equal(competenciaValor('2026-09'),'2026-09');assert.equal(competenciaValor('2026-13'),null);});
