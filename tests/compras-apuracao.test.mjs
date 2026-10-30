import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {calcularDisponibilidadeCasa,parcelaCasa} from '../compras-apuracao.js';
import {calcularObsolescenciaCasa,consolidarMetricasCasas} from '../compras-obsolescencia.js';
import {calcularOsResponsavel} from '../compras-os.js';
const POLITICA={disponibilidadeA:{meta:95,bonus:300},disponibilidadeB:{meta:90,bonus:300},controleOs:{meta:10,bonus:300},obsolescencia:{bonusMaximo:300}};
test('cada casa ganha A e B de forma independente e exige o percentual exato',()=>{
 assert.equal(calcularDisponibilidadeCasa({disponibilidadeA:95,disponibilidadeB:90},POLITICA).bonusDisponibilidade,600);
 assert.equal(calcularDisponibilidadeCasa({disponibilidadeA:94.9999,disponibilidadeB:89.9999},POLITICA).bonusDisponibilidade,0);
 assert.equal(calcularDisponibilidadeCasa({disponibilidadeA:null,disponibilidadeB:90},POLITICA).bonusDisponibilidade,300);
 for(const v of [null,undefined,NaN,Infinity,101,'95'])assert.equal(calcularDisponibilidadeCasa({disponibilidadeA:v},POLITICA).bonusA,0);
});
const source=readFileSync(new URL('../compras-module.js',import.meta.url),'utf8');
const start=source.indexOf('function calcularApuracaoResponsavel('),end=source.indexOf('\nfunction chaveAjusteApuracao(',start);
const calc=vm.runInNewContext(source.slice(start,end)+';calcularApuracaoResponsavel',{
 POLITICA,calcularOsResponsavel,calcularDisponibilidadeCasa,parcelaCasa,calcularObsolescenciaCasa,consolidarMetricasCasas,casaEquipeCompras:()=>null,competenciaAnterior:()=> '2026-09',
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
test('respeita mês e vínculos; percentual global antigo não bonifica todas as casas',()=>{
 const r=calc(pessoa,'2026-10',[casa('Casa 1',null,90),casa('Casa 2',100,100,{competencia:'2026-09'}),casa('Casa fora',100,100),{competencia:'2026-10',aplicacaoGlobal:true,controleOs:10}]);
 assert.equal(r.bonusA,0);assert.equal(r.bonusB,100);assert.equal(r.bonusOs,0);assert.equal(r.bonusTotal,100);assert.equal(r.totalMetasPossiveis,6);
});

test('casas sem dados mantêm sua parcela reservada; não divide apenas pelas vencedoras',()=>{const r=calc(pessoa,'2026-10',[casa('Casa 1',100,100)]);assert.equal(r.quantidadeCasasRateio,3);assert.equal(r.bonusA,100);assert.equal(r.bonusB,100);assert.equal(r.detalhesCasasDisponibilidade.length,3);assert.equal(r.detalhesCasasDisponibilidade[1].bonusDisponibilidade,0);assert.equal(r.detalhesCasasDisponibilidade[1].parcelaA,100);assert.equal(r.status,'PARCIAL');});
test('rateio fecha em R$300 para 6, 7 ou 9 casas e varia no máximo um centavo',()=>{for(const n of [6,7,9]){const parcelas=Array.from({length:n},(_,i)=>parcelaCasa(300,n,i));assert.equal(Math.round(parcelas.reduce((a,b)=>a+b,0)*100),30000);assert(Math.max(...parcelas)-Math.min(...parcelas)<0.01001);}assert.equal(parcelaCasa(300,0,0),0);});

test('obsoletos: qualquer redução paga a parcela; soma até R$300 e preserva A/B',()=>{const atual=pessoa.unidades.map(u=>casa(u,95,90,{indiceObsolescencia:45}));const anterior=pessoa.unidades.map(unidade=>({competencia:'2026-09',unidade,indiceObsolescencia:48}));const r=calc(pessoa,'2026-10',[...atual,...anterior]);assert.equal(r.bonusObsolescencia,300);assert.equal(r.bonusA,300);assert.equal(r.bonusB,300);assert.equal(r.bonusTotal,900);assert.equal(r.detalhesUnidades[0].bonusObsolescencia,100);});
test('obsoletos: sem mês anterior, mês antigo ou casa ausente não bonificam',()=>{const atual=casa('Casa 1',95,90,{indiceObsolescencia:45});for(const registros of [[atual],[atual,{competencia:'2026-08',unidade:'Casa 1',indiceObsolescencia:48}],[atual,{competencia:'2026-09',unidade:'Casa 2',indiceObsolescencia:48}]]){const r=calc(pessoa,'2026-10',registros);assert.equal(r.bonusObsolescencia,0);assert.match(r.detalhesUnidades[0].statusObsolescencia,/SEM PLANILHA DO MÊS ANTERIOR/);}});
test('apuração junta disponibilidade e obsoleto em documentos separados da mesma casa',()=>{const r=calc(pessoa,'2026-10',[casa('Casa 1',95,90),{competencia:'2026-10',unidade:'Casa 1',indiceObsolescencia:45},{competencia:'2026-09',unidade:'Casa 1',indiceObsolescencia:48}]);assert.equal(r.bonusA,100);assert.equal(r.bonusB,100);assert.equal(r.bonusObsolescencia,100);assert.equal(r.quantidadeUnidades,1);});

test('O.S. regional: média até 10% com todas as casas paga R$300, uma única vez',()=>{const rs=pessoa.unidades.map((u,i)=>casa(u,0,0,{controleOs:[0,10,20][i],totalOs:10,aguardandoCompras:i}));const r=calc(pessoa,'2026-10',rs);assert.equal(r.controleOs,10);assert.equal(r.osCompleto,true);assert.equal(r.bonusOs,300);assert.equal(r.bonusTotal,300);const parcial=calc(pessoa,'2026-10',rs.slice(0,2));assert.equal(parcial.controleOs,5);assert.equal(parcial.osCompleto,false);assert.equal(parcial.bonusOs,0);});
