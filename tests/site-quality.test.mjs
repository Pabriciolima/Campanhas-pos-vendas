import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const domModule=process.env.NPS_TEST_DOM_MODULE;
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,0));
async function fixture(markup=source('index.html')){
 const {parseHTML}=await import(domModule);const {document,window}=parseHTML(markup);
 const timers=new Map();let timerId=0;
 const ctx=vm.createContext({document,window,console,MutationObserver:class{observe(){}},setTimeout:fn=>{timers.set(++timerId,fn);return timerId},clearTimeout:id=>timers.delete(id)});
 return {document,window,ctx,timers};
}
test('metadados, favicon, destino de acessibilidade e 404',()=>{
 const html=source('index.html');assert.match(html,/<meta name="description"/);assert.match(html,/rel="icon" href="\/favicon.svg"/);
 assert.match(html,/id="conteudoPrincipal" tabindex="-1"/);assert.match(source('favicon.svg'),/<svg/);
 assert.match(source('404.html'),/href="\/"/);assert.match(source('404.html'),/name="robots" content="noindex"/);
});
test('marca navega sem recarregar e preserva diálogo aberto',{skip:!domModule},async()=>{
 const {document,window,ctx}=await fixture();let calls=0;
 window.menuCampanhas={abrirProdutivos:p=>{assert.equal(p,'dashboard');calls++}};
 vm.runInContext(source('site-quality.js'),ctx);document.dispatchEvent(new window.Event('DOMContentLoaded'));
 const logo=document.querySelector('.brand-home');logo.dispatchEvent(new window.Event('click',{bubbles:true,cancelable:true}));assert.equal(calls,1);
 document.querySelector('dialog').setAttribute('open','');logo.dispatchEvent(new window.Event('click',{bubbles:true,cancelable:true}));assert.equal(calls,1);
 assert(document.querySelector('.table-wrap[tabindex="0"]'));
});
test('bibliotecas: falha permite repetir, chamadas simultâneas compartilham download e impressão não baixa PDF',{skip:!domModule},async()=>{
 const {document,window,ctx,timers}=await fixture();vm.runInContext(source('performance-vendors.js'),ctx);
 const first=window.CampanhasVendors.excel();const also=window.CampanhasVendors.excel();
 let scripts=document.querySelectorAll('script[data-perf-vendor="exceljs"]');assert.equal(scripts.length,1);
 const failures=Promise.allSettled([first,also]);scripts[0].dispatchEvent(new window.Event('error'));assert((await failures).every(r=>r.status==='rejected'));assert.equal(timers.size,0);
 const retry=window.CampanhasVendors.excel();scripts=document.querySelectorAll('script[data-perf-vendor="exceljs"]');assert.equal(scripts.length,1);
 window.ExcelJS={};scripts[0].dispatchEvent(new window.Event('load'));assert.equal(await retry,true);assert.equal(timers.size,0);
 document.querySelector('[data-policy-print]').dispatchEvent(new window.Event('click',{bubbles:true,cancelable:true}));await tick();assert.equal(document.querySelectorAll('[data-perf-vendor="jspdf"]').length,0);
 const timeout=window.CampanhasVendors.xlsx();const timeoutResult=Promise.allSettled([timeout]);for(const fn of [...timers.values()])fn();assert.equal((await timeoutResult)[0].status,'rejected');assert.equal(document.querySelectorAll('[data-perf-vendor="xlsx"]').length,0);
});
test('menu móvel esconde controles do teclado e libera ao abrir ou voltar ao desktop',{skip:!domModule},async()=>{
 const {document,window,ctx}=await fixture();let change;const media={matches:true,addEventListener:(_,fn)=>change=fn};window.matchMedia=()=>media;
 vm.runInContext(source('mobile-experience.js'),ctx);document.dispatchEvent(new window.Event('DOMContentLoaded'));
 const sidebar=document.querySelector('.sidebar'),trigger=document.querySelector('#mobileNavTrigger');assert.equal(sidebar.inert,true);
 trigger.dispatchEvent(new window.Event('click'));assert.equal(sidebar.inert,false);assert.equal(trigger.getAttribute('aria-expanded'),'true');
 document.querySelector('.mobile-nav-close').dispatchEvent(new window.Event('click'));assert.equal(sidebar.inert,true);
 media.matches=false;change();assert.equal(sidebar.inert,false);assert.equal(sidebar.hasAttribute('aria-hidden'),false);
});
