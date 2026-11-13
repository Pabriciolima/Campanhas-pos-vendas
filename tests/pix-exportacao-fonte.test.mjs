import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../evidencias-pix.js',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('async function dadosPixParaExportar()'),source.indexOf('\nfunction competenciaExibicaoPix'));
test('exporta fonte oficial sem tabelas, respeita semana, filial e habilitação',async()=>{
 let filtro={chave:'todos'},filial='';
 const rows=[{competencia:'2026-11',semana:1,filial:'Belém',nome:'Ana',cargo:'Consultor',bonusBase:100,bonusFaixa:50,bonusNps:20,penalidade:0,bonusFinal:170,status:'HABILITADO'}, {competencia:'2026-11',semana:2,filial:'Macapá',nome:'Bia',cargo:'Consultor',bonusFinal:0,status:'NÃO HABILITADO'}];
 const ctx=vm.createContext({console,window:{obterResultadosPixExportacao:async mes=>{assert.equal(mes,'2026-11');return rows;}},normalizarCompetenciaPixExportacao:x=>x,competenciaPixAtiva:()=> '2026-11',tipoExportacaoPixAtual:()=>filtro,filialExportacaoPixNormalizada:()=>filial,normalizarPixEv:x=>x,normalizarSemanaPixExportacao:x=>'S'+x,limparStatusPixExportacao:x=>x});
 vm.runInContext(fn,ctx);
 let out=await ctx.dadosPixParaExportar();assert.equal(out.length,2);assert.equal(out[0].total,170);assert.equal(out[0].nps,20);
 filtro={chave:'habilitados-s1',somenteHabilitados:true,semana:'S1'};out=await ctx.dadosPixParaExportar();assert.equal(out.length,1);assert.equal(out[0].colaborador,'Ana');
 filial='Macapá';assert.equal((await ctx.dadosPixParaExportar()).length,0);
 filtro={chave:'nao-habilitados'};assert.equal((await ctx.dadosPixParaExportar())[0].colaborador,'Bia');
 ctx.window.obterResultadosPixExportacao=async()=>{throw Error('consulta falhou');};await assert.rejects(ctx.dadosPixParaExportar(),/consulta falhou/);
});
