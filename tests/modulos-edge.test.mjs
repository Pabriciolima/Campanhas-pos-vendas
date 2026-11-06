import test from 'node:test';import assert from 'node:assert/strict';
import {chamarModulo} from '../modulos-edge.js';
test('transporte exige token de sessão e preserva conflito',async()=>{
 globalThis.sessionStorage={getItem:k=>k.endsWith('compras')?'token-teste':null,removeItem:()=>{}};
 let sent;
 await assert.rejects(chamarModulo('compras',{acao:'salvar',revision:'1'},async(url,options)=>{sent={url,...options};return {ok:false,status:409,json:async()=>({error:'Conflito'})};}),e=>e.status===409);
 assert.match(sent.url,/supabase.co\/functions\/v1\/modulos-v2$/);assert.equal(JSON.parse(sent.body).token,'token-teste');assert.equal(sent.cache,'no-store');
 delete globalThis.sessionStorage;
});
