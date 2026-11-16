import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../evidencias-pix.js',import.meta.url),'utf8');
const fn=s.slice(s.indexOf('async function anexarEvidenciasPdfPix'),s.indexOf('async function buscarGruposAuditoriaImagensPix'));
test('anexa por filial e semana, inclui núcleo, não duplica e identifica cada página sem OCR',async()=>{
 let filtro='',pages=0;const textos=[],consultas=[];
 const norm=x=>String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 const ctx=vm.createContext({window:{obterContextoAssistentePix:()=>({filiais:['Teresina','Uruçuí']})},trabalhoExportacaoPix:null,normalizarPixEv:norm,filialExportacaoPixNormalizada:()=>filtro,resolverDnPixPorFilial:f=>f==='Teresina'?'4730':'4730F',construirContextoPix:(competencia,semana,filial,dn)=>({competencia,semana,filial,dn,numeroSemana:1}),mapearLimitadoPix:async(a,n,f)=>Promise.all(a.map(f)),cancelarSeNecessario:()=>{},informarExportacaoPix:()=>{},listarEvidenciasContextoPix:async c=>{consultas.push(c);const a={url:c.filial,caminho:c.filial,nomeOriginal:'Relatório '+c.filial+'.png'};return [a,a];},imagemRemotaParaDataPix:async()=>({largura:1000,altura:2000,dataUrl:'img'}),competenciaExibicaoPix:x=>x});vm.runInContext(fn,ctx);
 const doc={internal:{pageSize:{getWidth:()=>297,getHeight:()=>210}},addPage:()=>pages++,setTextColor(){},setFont(){},setFontSize(){},text:t=>textos.push(t),splitTextToSize:t=>[t],addImage:(d,f,x,y,w,h)=>assert(y+h<=196)};
 const linha={competencia:'2026-11',semana:'S1',filial:'Teresina',auditoriaDados:{nucleoFiliais:['TERESINA','URUCUI']}};
 await ctx.anexarEvidenciasPdfPix(doc,[linha,linha]);assert.equal(pages,2);assert.equal(consultas.length,2);assert(textos.some(t=>String(t).includes('Uruçuí')));assert(textos.some(t=>String(t).includes('Arquivo: Relatório Teresina.png')));
 filtro=norm('Uruçuí');consultas.length=0;await ctx.anexarEvidenciasPdfPix(doc,[linha]);assert.equal(consultas.length,1);assert.equal(consultas[0].filial,'Uruçuí');
 ctx.listarEvidenciasContextoPix=async()=>{throw Error('storage indisponível');};await assert.rejects(ctx.anexarEvidenciasPdfPix(doc,[linha]),/storage indisponível/);
});
