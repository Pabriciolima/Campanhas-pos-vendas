import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {consolidar,cargoTipo,normalizar} from '../pix-importacao-core.js';
import {vincularNps,aplicarNpsImportacao,percentualNpsImportacao} from '../pix-importacao-nps-core.js';
function app(){
 const nodes=new Map();
 class El{
  constructor(){this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.dataset={};this.events={};this.classList={add(){},remove(){},toggle(){}};}
  set id(v){this._id=v;nodes.set('#'+v,this);}get id(){return this._id;}
  set innerHTML(v){this.html=v;for(const m of v.matchAll(/\bid="([^"]+)"/g))if(!nodes.has('#'+m[1]))nodes.set('#'+m[1],new El());}get innerHTML(){return this.html||'';}
  setAttribute(){}
  querySelectorAll(){return [];}replaceChildren(){this.html='';}focus(){}scrollIntoView(){}prepend(){}after(){}click(){}addEventListener(n,f){this.events[n]=f;}querySelector(){return new El();}
 }
 const panel=new El();nodes.set('#pix-lancamentos .panel',panel);nodes.set('#pixLancamentosAcoes',new El());let calls=0;let received=[];
 const ctx={document:{readyState:'complete',querySelector:s=>nodes.get(s),createElement:()=>new El(),body:{classList:{contains:()=>false}}},window:{confirmarImportacaoPix:async(rows)=>{calls++;received=rows;return {quantidade:rows.length,novos:rows.length,atualizados:0};}},consolidar,cargoTipo,normalizar,vincularNps,aplicarNpsImportacao,percentualNpsImportacao};
 vm.createContext(ctx);const src=fs.readFileSync(new URL('../pix-importacao.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');vm.runInContext(src,ctx);
 const p={id:'a',nome:'CONSULTOR A',cargo:'Consultor Técnico',filial:'ANANINDEUA',usaNps:true};const row={nome:p.nome,tipo:'tecnico',meta:100,realizado:80,ticket:20,inicio:'2026-11-09',fim:'2026-11-09'};
 function seed(){ctx.seed={base:{participantes:[p],nucleos:[]},docs:[{inicio:row.inicio,fim:row.fim,linhas:[row]}]};vm.runInContext('base=seed.base;documentos=seed.docs;recalcular();',ctx);}
 return {ctx,nodes,seed,get calls(){return calls;},get received(){return received;}};
}
test('remover e restaurar atuam só na prévia; cancelar limpa sem chamar gravação',async()=>{
 const a=app();a.seed();const area=a.nodes.get('#pixImportacaoNova');
 area.events.click({target:{closest:s=>s==='[data-pin-remover]'?{dataset:{pinRemover:'a'}}:null}});
 assert.equal(vm.runInContext('aptos().length',a.ctx),0);assert.equal(a.calls,0);
 area.events.click({target:{closest:s=>s==='[data-pin-restaurar]'?{dataset:{pinRestaurar:'a'}}:null}});
 assert.equal(vm.runInContext('aptos().length',a.ctx),1);
 await a.nodes.get('#pin-cancelar').onclick();assert.equal(vm.runInContext('documentos.length',a.ctx),0);assert.equal(area.hidden,true);assert.equal(a.calls,0);
});
test('só confirma após semana e conferência; uma confirmação salva e bloqueia nova gravação',async()=>{
 const a=app();a.seed();await a.nodes.get('#pin-confirmar').onclick();assert.equal(a.calls,0);
 a.nodes.get('#pin-semana').value='2';a.nodes.get('#pin-conferido').checked=true;
 await a.nodes.get('#pin-confirmar').onclick();assert.equal(a.calls,1);assert.equal(a.received.length,1);assert.equal(a.nodes.get('#pin-confirmar').disabled,true);
 await a.nodes.get('#pin-confirmar').onclick();assert.equal(a.calls,1);
 await a.nodes.get('#pin-cancelar').onclick();assert.equal(a.calls,1);
});
test('checkboxes são independentes nas duas ordens; atualização é opcional',()=>{
 const a=app();a.seed();const area=a.nodes.get('#pixImportacaoNova');const conferido=a.nodes.get('#pin-conferido'),atualizar=a.nodes.get('#pin-atualizar'),semana=a.nodes.get('#pin-semana');
 const change=id=>area.events.change({target:{id,dataset:{}}});
 semana.value='2';change('pin-semana');
 conferido.checked=true;change('pin-conferido');assert.equal(a.nodes.get('#pin-confirmar').disabled,false);
 atualizar.checked=true;change('pin-atualizar');assert.equal(conferido.checked,true);assert.equal(atualizar.checked,true);assert.equal(a.nodes.get('#pin-confirmar').disabled,false);
 atualizar.checked=false;change('pin-atualizar');assert.equal(conferido.checked,true);assert.equal(a.nodes.get('#pin-confirmar').disabled,false);
 conferido.checked=false;change('pin-conferido');assert.equal(a.nodes.get('#pin-confirmar').disabled,true);
 atualizar.checked=true;change('pin-atualizar');conferido.checked=true;change('pin-conferido');assert.equal(atualizar.checked,true);assert.equal(conferido.checked,true);assert.equal(a.nodes.get('#pin-confirmar').disabled,false);
 semana.value='3';change('pin-semana');assert.equal(conferido.checked,false);assert.equal(atualizar.checked,true);assert.equal(a.nodes.get('#pin-confirmar').disabled,true);
});
test('imagem exige conferência do NPS e envia valores somente após os dois aceites',async()=>{
 const a=app();a.seed();
 vm.runInContext("npsDocs=[{competencia:'2026-11',linhas:[{nome:'CONSULTOR A',dn:'',meta:91.4,realizado:-20,competencia:'2026-11',arquivo:'nps.png'}]}];recalcular();",a.ctx);
 a.nodes.get('#pin-semana').value='2';a.nodes.get('#pin-conferido').checked=true;
 vm.runInContext('atualizarAcoes()',a.ctx);assert.equal(a.nodes.get('#pin-confirmar').disabled,true);
 await a.nodes.get('#pin-confirmar').onclick();assert.equal(a.calls,0);
 a.nodes.get('#pin-nps-conferido').checked=true;vm.runInContext('atualizarAcoes()',a.ctx);assert.equal(a.nodes.get('#pin-confirmar').disabled,false);
 await a.nodes.get('#pin-confirmar').onclick();assert.equal(a.calls,1);assert.equal(a.received[0].npsImportado.meta,91.4);assert.equal(a.received[0].npsImportado.realizado,-20);
});
test('campo do painel geral aparece somente na S4 e não alimenta semanas anteriores',()=>{
 const a=app();a.seed();
 a.ctx.seed.base.participantes.push({id:'s',nome:'SUPERVISOR',cargo:'Supervisor de Assistência',filial:'ANANINDEUA',usaNps:true});
 vm.runInContext("base=seed.base;npsDocs=[{tipo:'geral',competencia:'2026-11',linhas:[{nome:'ANANINDEUA (DN 4700)',dn:'4700',meta:91.4,realizado:70.7,competencia:'2026-11',geral:true,origem:'painel-unidade',arquivo:'painel.png'}]}];",a.ctx);
 const semana=a.nodes.get('#pin-semana'),area=a.nodes.get('#pixImportacaoNova');
 for(const n of ['1','2','3']){semana.value=n;area.events.change({target:{id:'pin-semana',dataset:{}}});assert.equal(a.nodes.get('#pin-nps-geral-area').hidden,true);assert.equal(vm.runInContext("resultado.linhas.find(r=>r.funcionarioId==='s').npsImportado",a.ctx),undefined);}
 semana.value='4';area.events.change({target:{id:'pin-semana',dataset:{}}});assert.equal(a.nodes.get('#pin-nps-geral-area').hidden,false);assert.equal(vm.runInContext("resultado.linhas.find(r=>r.funcionarioId==='s').npsImportado.realizado",a.ctx),70.7);
 semana.value='2';area.events.change({target:{id:'pin-semana',dataset:{}}});assert.equal(a.nodes.get('#pin-nps-geral-area').hidden,true);assert.equal(vm.runInContext("resultado.linhas.find(r=>r.funcionarioId==='s').npsImportado",a.ctx),undefined);
});
