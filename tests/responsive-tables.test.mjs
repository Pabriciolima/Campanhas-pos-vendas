import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const domModule=process.env.NPS_TEST_DOM_MODULE;
test('cartões preservam células e ações, atualizam rótulos e permitem trocar a visualização',{skip:!domModule},async()=>{
 const {parseHTML}=await import(domModule);const {document,window}=parseHTML('<html><body><main><section id="pix-lancamentos"><div class="table-wrap"><table><thead><tr><th>Colaborador</th><th>Total</th><th>Ações</th></tr></thead><tbody><tr><td>Ana</td><td>R$ 100,50</td><td><button id="edit">Editar</button></td></tr></tbody></table></div></section></main></body></html>');
 let observer;let mediaChange;const media={matches:true,addEventListener:(_,f)=>mediaChange=f};window.matchMedia=()=>media;
 const ctx=vm.createContext({document,window,requestAnimationFrame:f=>f(),MutationObserver:class{constructor(f){observer=f}observe(){}}});
 let edits=0;const edit=document.querySelector('#edit');edit.addEventListener('click',()=>edits++);
 vm.runInContext(readFileSync(new URL('../responsive-tables.js',import.meta.url),'utf8'),ctx);document.dispatchEvent(new window.Event('DOMContentLoaded'));
 const wrap=document.querySelector('.table-wrap');assert.equal(wrap.dataset.responsiveMode,'cards');assert.equal(document.querySelectorAll('tbody td').length,3);
 assert.equal(document.querySelector('tbody td').dataset.label,'Colaborador');assert.equal(edit,document.querySelector('#edit'));edit.click();assert.equal(edits,1);
 document.querySelector('[data-table-mode="table"]').click();assert.equal(wrap.dataset.responsiveMode,'table');media.matches=false;mediaChange();assert.equal(wrap.dataset.responsiveMode,'table');
 document.querySelector('tbody').innerHTML='<tr><td>Bia</td><td>R$ 200,25</td><td><button>Editar</button></td></tr>';observer();observer();assert.equal(document.querySelectorAll('.responsive-data-controls').length,1);assert.equal(document.querySelectorAll('td[data-label]').length,3);
 document.querySelector('[data-table-mode="cards"]').click();assert.equal(wrap.dataset.responsiveMode,'cards');
 document.querySelector('tbody').innerHTML='<tr><td colspan="3">Sem lançamentos</td></tr>';observer();assert(document.querySelector('tr.responsive-empty'));
});
