// Adaptador local: todos os cadastros, indicadores, arquivos e ajustes usam exclusivamente /api/compras.
import {COLECOES_COMPRAS} from './compras-persistencia.js?v=20261028-supabase';
export function criarBancoCompras(fetcher=(...args)=>fetch(...args)){
 let base,revision,loading,queue=Promise.resolve(),ocupado=0;
 async function request(options={}){const captured=revision;const r=await fetcher('/api/compras'+(options.method?'':revision?'?revision='+encodeURIComponent(revision):''),{cache:'no-store',...options});const data=await r.json();if(!r.ok){const e=Error(data.error||'Não foi possível acessar o Supabase de Compras.');e.status=r.status;throw e;}if(data.base){if(!options.method&&revision!==captured)return {unchanged:true,revision};base=data.base;revision=data.revision;}return data;}
 async function sincronizar(){if(loading)return loading;loading=request().finally(()=>loading=null);return loading;}
 function ref(c,id){if(!COLECOES_COMPRAS.includes(c))throw Error('Coleção de Compras inválida.');return {colecao:c,id};}
 async function ler(c){if(!base)await sincronizar();return {docs:Object.entries(base.colecoes[c]).map(([id,d])=>({id,data:()=>structuredClone(d)}))};}
 function gravar(ops){ocupado++;const tarefa=queue.catch(()=>{}).then(async()=>{if(!base)await sincronizar();return request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,operacoes:ops})});}).finally(()=>ocupado--);queue=tarefa;return tarefa;}
 function lote(){const ops=[];return {set(r,d,op={}){ops.push({...r,tipo:'set',dados:structuredClone(d),merge:!!op.merge});},delete(r){ops.push({...r,tipo:'delete'});},commit(){return gravar(ops);}};}
 return {sincronizar,ler,gravar,lote,ref,ocupado:()=>ocupado,migracao:()=>base?.migracao,revision:()=>revision,async recuperar(){if(!base)await sincronizar();return request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,acao:'recuperar-legado'})});}};
}
export const bancoCompras=criarBancoCompras();
export const collection=(_,c)=>bancoCompras.ref(c).colecao;
export const doc=(_,c,id)=>bancoCompras.ref(c,id);
export const getDocs=c=>bancoCompras.ler(c);
export const setDoc=(r,d,o={})=>bancoCompras.gravar([{...r,tipo:'set',dados:d,merge:!!o.merge}]);
export const deleteDoc=r=>bancoCompras.gravar([{...r,tipo:'delete'}]);
export const writeBatch=()=>bancoCompras.lote();
export const serverTimestamp=()=>new Date().toISOString();
