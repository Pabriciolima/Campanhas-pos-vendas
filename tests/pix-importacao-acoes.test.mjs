import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {consolidar,cargoTipo,normalizar} from '../pix-importacao-core.js';
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
 const ctx={document:{readyState:'complete',querySelector:s=>nodes.get(s),createElement:()=>new El(),body:{classList:{contains:()=>false}}},window:{confirmarImportacaoPix:async(rows)=>{calls++;received=rows;return {quantidade:rows.length,novos:rows.length,atualizados:0};}},consolidar,cargoTipo,normalizar};
 vm.createContext(ctx);const src=fs.readFileSync(new URL('../pix-importacao.js',import.meta.url),'utf8').replace(/^import .*?;\n/,'');vm.runInContext(src,ctx);
 const p={id:'a',nome:'CONSULTOR A',cargo:'Consultor Técnico',filial:'ANANINDEUA'};const row={nome:p.nome,tipo:'tecnico',meta:100,realizado:80,ticket:20,inicio:'2026-11-09',fim:'2026-11-09'};
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
