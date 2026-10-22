import test from 'node:test';import assert from 'node:assert/strict';
import {preencherParticipantes,PARTICIPANTES_REFERENCIA} from '../garantia-participantes-base.js';
import {vazio,mesclar,chavePessoa} from '../garantia-dados.js';
test('cadastro contém os 31 participantes e somente dados cadastrais',()=>{
 assert.equal(PARTICIPANTES_REFERENCIA.length,31);const counts={};for(const p of PARTICIPANTES_REFERENCIA){counts[p.perfil]=(counts[p.perfil]||0)+1;assert(!Object.hasOwn(p,'referencia'));assert(!Object.hasOwn(p,'bonus'));assert(!Object.hasOwn(p,'aegCorrecao'));assert(!p.nome.includes('FÉRIAS'));assert(!p.nome.includes('experiencia'));}
 assert.deepEqual(counts,{localAssist:9,localAux:12,admPv:1,assistente:2,analista:5,lider:1,supervisora:1});
});
test('preenchimento inicial é idempotente, normaliza filiais e não cria dados financeiros',()=>{
 const first=preencherParticipantes(vazio(),'2026-10');assert.equal(first.adicionados,31);assert.equal(first.estado.competencias['2026-10'].participantes.length,31);assert.deepEqual(first.estado.competencias['2026-10'].metricas,{});assert.equal(preencherParticipantes(first.estado,'2026-10').alterado,false);
 assert(first.estado.competencias['2026-10'].participantes.some(p=>p.filial==='ANANINDEUA'));assert(first.estado.competencias['2026-10'].participantes.some(p=>p.filial==='SÃO LUIS'));
 assert.equal(preencherParticipantes(first.estado,'2026-08').alterado,false);
});
test('cadastro existente, dados, conferências e observações são preservados',()=>{
 const p={...PARTICIPANTES_REFERENCIA[0],filial:'ANANINDEUA',observacao:'Texto do usuário'};
 const initial=mesclar(vazio(),{competencia:'2026-09',participantes:[p],metricas:{ANANINDEUA:{osAbertas:5}}});initial.competencias['2026-09'].validados[chavePessoa(p)]={total:123};const seeded=preencherParticipantes(initial,'2026-09');assert.equal(seeded.adicionados,30);assert.equal(seeded.estado.competencias['2026-09'].participantes.find(x=>x.nome===p.nome).observacao,'Texto do usuário');assert.equal(seeded.estado.competencias['2026-09'].metricas.ANANINDEUA.osAbertas,5);assert.equal(seeded.estado.competencias['2026-09'].validados[chavePessoa(p)].total,123);
});
test('importação posterior com anotações no nome atualiza a mesma pessoa',()=>{
 const base=preencherParticipantes(vazio(),'2026-09').estado;const original=PARTICIPANTES_REFERENCIA.find(p=>p.filial==='Vilhena'&&p.perfil==='localAssist');assert(original);const imported={...original,nome:original.nome+' (FÉRIAS)',filial:'VILHENA'};const updated=mesclar(base,{competencia:'2026-09',participantes:[imported]});assert.equal(updated.competencias['2026-09'].participantes.length,31);
});
