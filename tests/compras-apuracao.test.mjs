import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {calcularDisponibilidadeCasa,parcelaCasa} from '../compras-apuracao.js';
const POLITICA={disponibilidadeA:{meta:95,bonus:300},disponibilidadeB:{meta:90,bonus:300},controleOs:{meta:10,bonus:300}};
test('cada casa ganha A e B de forma independente e exige o percentual exato',()=>{
 assert.equal(calcularDisponibilidadeCasa({disponibilidadeA:95,disponibilidadeB:90},POLITICA).bonusDisponibilidade,600);
 assert.equal(calcularDisponibilidadeCasa({disponibilidadeA:94.9999,disponibilidadeB:89.9999},POLITICA).bonusDisponibilidade,0);
 assert.equal(calcularDisponibilidadeCasa({disponibilidadeA:null,disponibilidadeB:90},POLITICA).bonusDisponibilidade,300);
 for(const v of [null,undefined,NaN,Infinity,101,'95'])assert.equal(calcularDisponibilidadeCasa({disponibilidadeA:v},POLITICA).bonusA,0);
});
const source=readFileSync(new URL('../compras-module.js',import.meta.url),'utf8');
const start=source.indexOf('function calcularApuracaoResponsavel('),end=source.indexOf('\nfunction chaveAjusteApuracao(',start);
const calc=vm.runInNewContext(source.slice(start,end)+';calcularApuracaoResponsavel',{
 POLITICA,calcularDisponibilidadeCasa,casaEquipeCompras:()=>null,competenciaAnterior:()=> '2026-09',
 indicadorEhGlobal:r=>r.aplicacaoGlobal===true,indicadorInvalidoParaApuracao:()=>false,
 unidadeCorresponde:(p,r)=>p.unidades.includes(r.unidade),normalizar:s=>String(s).toUpperCase(),
 calcularBonusObsolescencia:()=>({bonus:0,reducao:null,reducaoBonificada:0,status:'SEM HISTÓRICO',possuiHistorico:false}),
 somar:xs=>xs.reduce((a,b)=>a+b,0),media:xs=>{const v=xs.filter(n=>n!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;}
});
const pessoa={id:'teste',nome:'Analista',unidades:['Casa 1','Casa 2','Casa 3']};
const casa=(unidade,a,b,extra={})=>({competencia:'2026-10',unidade,nucleo:'Mesmo núcleo',disponibilidadeA:a,disponibilidadeB:b,...extra});
test('divide a verba pelas casas cadastradas e paga apenas as parcelas atingidas',()=>{
 const r=calc(pessoa,'2026-10',[casa('Casa 1',95,90),casa('Casa 2',99,99),casa('Casa 3',94,89)]);
 assert.equal(r.bonusA,200);assert.equal(r.bonusB,200);assert.equal(r.bonusTotal,400);
 assert.equal(r.casasAtingiramA,2);assert.equal(r.casasAtingiramB,2);
 assert.equal(r.indicadoresAtingidos,4);assert.equal(r.totalMetasPossiveis,6);assert.equal(r.status,'PARCIAL');
 assert.equal(r.detalhesCasasDisponibilidade[2].bonusDisponibilidade,0);
});
test('casa abaixo da meta não perde nem ganha por influência de outra casa',()=>{
 const r=calc(pessoa,'2026-10',[casa('Casa 1',100,100),casa('Casa 2',94.999,89.999)]);
 assert.equal(r.bonusTotal,200);assert(r.detalhesUnidades[0].atingiuA);assert(!r.detalhesUnidades[1].atingiuA);
});
test('respeita mês, vínculos e B sem A; mantém controle de OS como política separada',()=>{
 const r=calc(pessoa,'2026-10',[casa('Casa 1',null,90),casa('Casa 2',100,100,{competencia:'2026-09'}),casa('Casa fora',100,100),{competencia:'2026-10',aplicacaoGlobal:true,controleOs:10}]);
 assert.equal(r.bonusA,0);assert.equal(r.bonusB,100);assert.equal(r.bonusOs,300);assert.equal(r.bonusTotal,400);assert.equal(r.totalMetasPossiveis,7);
});

test('casas sem dados mantêm sua parcela reservada; não divide apenas pelas vencedoras',()=>{const r=calc(pessoa,'2026-10',[casa('Casa 1',100,100)]);assert.equal(r.quantidadeCasasRateio,3);assert.equal(r.bonusA,100);assert.equal(r.bonusB,100);assert.equal(r.detalhesCasasDisponibilidade.length,3);assert.equal(r.detalhesCasasDisponibilidade[1].bonusDisponibilidade,0);assert.equal(r.detalhesCasasDisponibilidade[1].parcelaA,100);assert.equal(r.status,'PARCIAL');});
test('rateio fecha em R$300 para 6, 7 ou 9 casas e varia no máximo um centavo',()=>{for(const n of [6,7,9]){const parcelas=Array.from({length:n},(_,i)=>parcelaCasa(300,n,i));assert.equal(Math.round(parcelas.reduce((a,b)=>a+b,0)*100),30000);assert(Math.max(...parcelas)-Math.min(...parcelas)<0.01001);}assert.equal(parcelaCasa(300,0,0),0);});
