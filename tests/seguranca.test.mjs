import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {escaparHtml,perfilValido,nomeMinimizado} from '../security/seguranca.js';
test('HTML e atributos não interpretam conteúdo pessoal como marcação',()=>{
 assert.equal(escaparHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
 assert.equal(escaparHtml("' & < >"),'&#39; &amp; &lt; &gt;');
 assert.equal(escaparHtml(null),'');
});
test('presença tem prazo de sessão e nome minimizado',()=>{
 assert.equal(nomeMinimizado('PABRICIO LIMA MACIEL'),'PABRICIO M.');
 const p={nome:'A',filial:'B',expiresAt:2000};
 assert.equal(perfilValido(p,1000),true);assert.equal(perfilValido(p,2000),false);
 assert.equal(perfilValido({...p,expiresAt:Infinity},1000),false);
 assert.equal(perfilValido({...p,expiresAt:1000+9*3600000},1000),false);
 assert.equal(perfilValido({nome:'A',filial:'B'},1000),false);
});
test('headers reforçam HTTPS, enquadramento e formulários',()=>{
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 const h=config.headers[0].headers;const csp=h.find(x=>x.key==='Content-Security-Policy').value;
 for(const rule of ["object-src 'none'","base-uri 'self'","frame-ancestors 'none'","form-action 'self'","upgrade-insecure-requests"])assert(csp.includes(rule));
 assert(h.some(x=>x.key==='Strict-Transport-Security'));
});
