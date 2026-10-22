import test from 'node:test';
import assert from 'node:assert/strict';
import {calcularGarantia} from '../garantia-core.js';
const dados={perfil:'assistente',osFechadas:10000,osFaturadas:10000,valorFaturado:10000,valorRecebido:10000,insercao:100,aeg:0,chamevolks:0,erros:0,malote:100};
const calc=patch=>calcularGarantia({...dados,...patch});
const item=(r,id)=>r.itens.find(i=>i.id===id).valor;
test('assistente: teto R$700, Chamevolks individual e penalidade sobre o total',()=>{
 assert.equal(calc({}).total,700);assert.equal(calc({chamevolks:4}).total,800);
 assert.equal(calc({chamevolks:4,erros:4.99}).total,800);
 assert.equal(calc({chamevolks:4,erros:5}).total,560);
 assert.equal(calc({chamevolks:4,erros:5.01}).penalidade,240);
});
test('limites das faixas de faturamento e recebimento',()=>{
 for(const [percent,af,ar,lr] of [[79.99,0,0,0],[80,150,75,400],[89.99,150,75,400],[90,170,100,500],[99.99,170,100,500],[100,200,150,600],[110,200,150,600]]){
 const a=calc({osFaturadas:Math.round(percent*100),valorRecebido:percent*100});assert.equal(item(a,'faturamento'),af);assert.equal(item(a,'recebimento'),ar);
 assert.equal(item(calc({perfil:'lider',valorRecebido:percent*100}),'recebimento'),lr);
 }
});
test('inserção e malote usam a maior faixa, sem somar faixas',()=>{
 for(const [percent,a,l] of [[74.99,0,0],[75,75,400],[79.99,75,400],[80,100,500],[99.99,100,500],[100,150,600],[105,150,600]]){
 assert.equal(item(calc({insercao:percent}),'insercao'),a);
 const r=calc({perfil:'lider',insercao:percent,malote:percent});assert.equal(item(r,'insercao'),l);assert.equal(item(r,'malote'),l);
 }
});
test('AEG exige não conformidade abaixo de 5%, sem penalidade adicional própria',()=>{
 assert.equal(item(calc({aeg:4.99}),'aeg'),200);assert.equal(item(calc({aeg:5}),'aeg'),0);assert.equal(calc({aeg:5}).total,500);
});
test('liderança e supervisora recebem individualmente; extra em blocos completos',()=>{
 for(const perfil of ['lider','supervisora'])for(const [percent,extra] of [[100,0],[100.01,0],[104.99,0],[105,150],[109.99,150],[110,300],[115,450]]){
 const r=calc({perfil,valorRecebido:percent*100});assert.equal(item(r,'extra'),extra);assert.equal(r.total,2400+extra);assert(!r.itens.some(i=>i.id==='aeg'||i.id==='chamevolks'));
 }
 assert.equal(calc({perfil:'lider',valorRecebido:11000,erros:5}).total,1890);
});
test('dados faltantes ou inválidos não viram uma premiação de zero',()=>{
 for(const patch of [{osFechadas:0},{valorFaturado:0},{insercao:''},{erros:null},{aeg:-1},{chamevolks:1.5},{osFaturadas:NaN},{valorRecebido:Infinity},{erros:101},{perfil:'outro'}]){
 const r=calc(patch);assert.equal(r.completo,false);assert.equal(r.total,null);assert(r.pendencias.length>0);
 }
 assert.equal(calc({chamevolks:0,aeg:0,erros:0}).completo,true);
});
test('indicadores são independentes e o motor não altera os dados de entrada',()=>{
 const original=Object.freeze({...dados,osFaturadas:0,valorRecebido:0,insercao:0,chamevolks:2});const r=calcularGarantia(original);assert.equal(r.total,250);assert.equal(original.chamevolks,2);
 // Consolidação ponderada: 80 O.S. faturadas / 100 fechadas = 80%.
 assert.equal(item(calc({osFaturadas:80,osFechadas:100}),'faturamento'),150);
});
