import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../pix-presidente.js',import.meta.url),'utf8');
const inicio=source.indexOf('window.preencherImportacaoPix = async');
const codigo=source.slice(inicio,source.indexOf('window.confirmarImportacaoPix =',inicio));
function setup(registros=[]){
 const fields=new Map();for(const id of ['#pixLancamentoCompetencia','#pixLancamentoSemana','#pixLancamentoId','#pixLancamentoFilial','#pixLancamentoFuncionario'])fields.set(id,{value:'',options:[{value:'ANANINDEUA'}]});
 const diario={value:''};let dados;const funcionario={id:'t',nome:'Técnico A',filial:'ANANINDEUA',ativo:true};
 const context={window:{confirm:()=>true,obterResultadosPixExportacao:async()=>registros},document:{body:{classList:{contains:()=>false}},querySelector:()=>diario},participantesPix:()=>[funcionario],funcionarioPixAtivo:p=>p.ativo!==false,pixDataLocal:d=>new Date(d+'T12:00:00Z'),estadoPix:{lancamentos:[]},abrirLancamentoPix:()=>{},$:s=>fields.get(s),atualizarSelectsPix:()=>{},pixFilialNucleoNormalizada:x=>x,atualizarFuncionariosLancamentoPix:()=>{},renderCamposLancamentoPix:d=>{dados=d;},preencherConferenciaPixFonte:()=>{},atualizarHistoricoModalPix:async()=>{},pixHistoricoModalConferido:true,usaRegraPixDiaria:()=>true,pixMoeda:n=>String(n),atualizarPainelDiarioPix:()=>{},atualizarPreviewPix:()=>{}};
 vm.createContext(context);vm.runInContext(codigo,context);return {context,fields,diario,getDados:()=>dados};
}
const linha={funcionarioId:'t',filial:'ANANINDEUA',completo:true,inicio:'2026-11-09',fim:'2026-11-09',meta:100,realizado:80,ticket:20,margem:null};
test('preenche data, meta, realizado e ticket preservando NPS e O.S. do registro existente',async()=>{
 const anterior={id:'id',funcionarioId:'t',semana:2,datasAvaliadas:['2026-11-09'],diasCalendario:{'2026-11-09':{realizado:1}},metaNps:90,realizadoNps:95,npsFiliais:{ANANINDEUA:{meta:90,realizado:96}},osAbertaPercentual:10};
 const s=setup([anterior]);assert.equal(await s.context.window.preencherImportacaoPix(linha,2),true);const d=s.getDados();assert.equal(d.metaSemanal,100);assert.equal(d.metaNps,90);assert.equal(d.realizadoNps,95);assert.equal(d.npsFiliais,anterior.npsFiliais);assert.equal(d.osAbertaPercentual,10);assert.equal(s.diario.value,'80');assert.equal(s.fields.get('#pixLancamentoId').value,'id');
});
test('bloqueia mudança de dias existentes, período multidia e datas de outra semana',async()=>{
 let s=setup([{funcionarioId:'t',semana:2,datasAvaliadas:['2026-11-10']}]);await assert.rejects(s.context.window.preencherImportacaoPix(linha,2),/outros dias/);
 s=setup([]);await assert.rejects(s.context.window.preencherImportacaoPix({...linha,fim:'2026-11-10'},2),/único dia/);
 s=setup([{funcionarioId:'t',semana:1,datasAvaliadas:['2026-11-09']}]);await assert.rejects(s.context.window.preencherImportacaoPix(linha,2),/outra semana/);
});
test('respeita bloqueio do diretor, total parcial e semana não escolhida',async()=>{
 const s=setup();s.context.window.bloqueioLancamentos={bloqueado:true};await assert.rejects(s.context.window.preencherImportacaoPix(linha,2),/bloqueados/);s.context.window.bloqueioLancamentos=null;
 await assert.rejects(s.context.window.preencherImportacaoPix({...linha,completo:false},2),/pendentes/);await assert.rejects(s.context.window.preencherImportacaoPix(linha,0),/semana/);
});
