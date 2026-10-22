import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarNpsUnidadePix } from '../pix-nps-unidade.js';
// This integration suite receives a DOM implementation through NPS_TEST_DOM_MODULE.
// Run: NPS_TEST_DOM_MODULE=/absolute/path/to/linkedom/esm/index.js node --test tests/pix-nps-unidade-storage.test.mjs
const domModule = process.env.NPS_TEST_DOM_MODULE;
test('gravação compartilhada, concorrência, rede e campos pendentes', { skip: !domModule }, async () => {
 const {parseHTML,HTMLFormElement,HTMLElement,HTMLSelectElement}=await import(domModule);
 const {document,window}=parseHTML('<html><body><section id="pixPresidente" class="active"><p data-pix-nps-unidade-resumo></p><button data-abrir-nps-unidade>Abrir</button></section></body></html>');
 globalThis.document=document;globalThis.window=window;globalThis.CustomEvent=window.CustomEvent;
 const intervals=[];window.setInterval=fn=>{intervals.push(fn);return 1};
 HTMLElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLElement.prototype.close=function(){this.removeAttribute('open')};
 Object.defineProperty(HTMLElement.prototype,'elements',{get(){const result={};for(const e of this.querySelectorAll('[name]'))result[e.getAttribute('name')]=e;return result;}});
 Object.defineProperty(HTMLSelectElement.prototype,'value',{get(){return this._testValue||''},set(v){this._testValue=v},configurable:true});
 const rows=new Map(),alerts=[];let offline=false,locked=false;
 class Q {
  constructor(){this.filters=[];this.op='read'} select(){return this}like(){return this}eq(k,v){this.filters.push([k,v]);return this}is(k,v){return this.eq(k,v)}insert(p){this.op='insert';this.p=p;return this}update(p){this.op='update';this.p=p;return this}
  then(done){if(offline)return Promise.resolve({error:new Error('offline')}).then(done);if(this.op==='read')return Promise.resolve({data:[...rows.values()]}).then(done);if(this.op==='insert'&&rows.has(this.p.id))return Promise.resolve({error:{code:'23505',message:'conflict'}}).then(done);if(this.op==='update'){const r=rows.get(this.p.id);if(!r||this.filters.some(([k,v])=>r[k]!==v))return Promise.resolve({data:[]}).then(done);}rows.set(this.p.id,this.p);return Promise.resolve({data:[this.p]}).then(done);}
 }
 const canal={on(){return this},subscribe(){return this},async send(){return 'ok'}};
 let changes=0;
 const api=criarNpsUnidadePix({supabase:{from:()=>new Q(),channel:()=>canal},filiais:()=>['BELEM','MARABA'],competencia:()=> '2026-11',filialAtual:()=> 'BELEM',bloqueado:()=>locked,alertar:async t=>alerts.push(t),aoAtualizar:()=>{changes++;}});
 await api.iniciar();await api.abrir();
 const dlg=document.querySelector('dialog'),form=dlg.querySelector('form');
 // Linkedom does not implement form controls completely. Model their value and elements semantics.
 const fields={};for(const e of form.querySelectorAll('[name]')){fields[e.getAttribute('name')]=e; if(e.tagName==='SELECT')Object.defineProperty(e,'value',{value:'BELEM',writable:true,configurable:true});}
 Object.defineProperty(form,'elements',{value:fields,configurable:true});
 assert.equal(fields.meta.value,'');
 fields.filial.value='BELEM';fields.competencia.value='2026-11';fields.meta.value='90';fields.realizado.value='89';
 const tick=()=>new Promise(r=>setTimeout(r,0));const submit=async()=>{form.dispatchEvent(new window.Event('submit',{cancelable:true}));await tick();await tick();};
 const configuredMeta=fields.meta.value;fields.meta.value='';await submit();assert.equal(rows.size,0);fields.meta.value=configuredMeta;
 await submit();assert.equal(rows.size,1);assert.equal(api.avaliar('BELEM','2026-11').status,'NAO_ATINGIDO');assert.equal(api.avaliar('MARABA','2026-11').status,'PENDENTE');
 // Dois colaboradores da mesma filial exibem a mesma configuração, sem duplicar o registro.
 const holder=document.createElement('div');holder.innerHTML=api.blocoLancamento('BELEM','2026-11')+api.blocoLancamento('BELEM','2026-11')+api.blocoLancamento('MARABA','2026-11');document.body.appendChild(holder);
 api.vincularBotoes(holder);api.vincularBotoes(holder);api.atualizarResumo();
 assert.equal(holder.querySelectorAll('[data-nps-geral-realizado]')[0].textContent,'89%');
 assert.equal(holder.querySelectorAll('[data-nps-geral-realizado]')[1].textContent,'89%');
 // O botão usa a filial do colaborador aberto, e não o filtro geral da tabela.
 holder.querySelectorAll('[data-abrir-nps-unidade]')[2].dispatchEvent(new window.Event('click'));
 await tick();await tick();assert.equal(fields.filial.value,'MARABA');assert.equal(fields.meta.value,'');

 await api.abrir();
 assert.equal(fields.meta.readOnly,true);fields.realizado.value='99';await submit();assert.equal([...rows.values()][0].dados.realizado,89);
 const unlock=()=>{fields.senhaEdicao.value='123321';dlg.querySelector('[data-nps-desbloquear]').dispatchEvent(new window.Event('click'));};
 fields.senhaEdicao.value='errada';dlg.querySelector('[data-nps-desbloquear]').dispatchEvent(new window.Event('click'));assert.equal(fields.meta.readOnly,true);assert.equal(fields.senhaEdicao.value,'');
 unlock();assert.equal(fields.meta.readOnly,false);
 fields.filial.value='MARABA';fields.filial.dispatchEvent(new window.Event('change',{bubbles:true}));assert.equal(fields.meta.readOnly,false);
 fields.filial.value='BELEM';fields.filial.dispatchEvent(new window.Event('change',{bubbles:true}));assert.equal(fields.meta.readOnly,true);unlock();fields.realizado.value='90';await submit();assert.equal(rows.size,1);assert.equal(api.avaliar('BELEM','2026-11').atingiu,true);api.atualizarResumo();assert.equal(holder.querySelectorAll('[data-nps-geral-realizado]')[1].textContent,'90%');
 await api.abrir();assert.equal(fields.meta.readOnly,true);unlock();const saved=[...rows.values()][0];rows.set(saved.id,{...saved,updated_at:'outro-usuario',dados:{...saved.dados,realizado:80}});fields.realizado.value='95';await submit();assert(alerts.some(t=>t.includes('outro usuário')));assert.equal(rows.get(saved.id).dados.realizado,80);
 await api.abrir();locked=true;fields.realizado.value='99';await submit();assert(alerts.some(t=>t.includes('bloqueados')));assert.equal(rows.get(saved.id).dados.realizado,80);locked=false;
 offline=true;await assert.rejects(api.carregar());assert.equal(api.avaliar('BELEM','2026-11').status,'ERRO');offline=false;
 await api.abrir();unlock();fields.realizado.value='';await submit();assert.equal(api.avaliar('BELEM','2026-11').status,'PENDENTE');assert.equal(rows.get(saved.id).dados.realizado,null);assert(changes>=5);
});
