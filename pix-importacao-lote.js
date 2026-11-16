import {normalizar,centavos} from './pix-importacao-core.js?v=20261116-media-supervisores1';
import {dataImportacaoPix,diasSalvosPix,preverImportacaoDiariaPix} from './pix-importacao-diaria-core.js?v=20261116-diaria2';
const informado=(r,c,f)=>r?.[f]??Boolean(r&&r[c]!=null&&String(r[c]).trim()!=='');
export function assinaturaRegistroPix(r){const ord=v=>Array.isArray(v)?v.map(ord):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ord(v[k])])):v;return JSON.stringify(ord(r));}
function encontrar(l,semana,registros){return registros.filter(r=>r.competencia===dataImportacaoPix(l).slice(0,7)&&Number(r.semana)===Number(semana)&&(String(r.funcionarioId)===String(l.funcionarioId)||(l.nucleoFiliais?.length&&normalizar(r.nome)===normalizar(l.nome))));}
export function localizarConflitosPix(linhas,semana,registros){return linhas.flatMap(l=>{const rs=encontrar(l,semana,registros);if(rs.length>1)throw Error(`Há lançamentos duplicados para ${l.nome}. Revise antes de importar.`);if(!rs.length)return [];const previa=preverImportacaoDiariaPix(l,rs[0]);return previa.conflitoDia||previa.conflitosSemanais.length?[{chave:String(l.funcionarioId),salvo:rs[0],importacao:l,assinatura:assinaturaRegistroPix(rs[0]),semana:Number(semana),competencia:dataImportacaoPix(l).slice(0,7),previa}]:[];});}
export function prepararLotePix(linhas,semana,participantes,registros,{atualizar=false,resolucoes={},exigirConferencia=false,agora=new Date().toISOString()}={}){
 if(![1,2,3,4].includes(Number(semana)))throw Error('Selecione a semana da campanha.');
 if(!linhas?.length)throw Error('Não há colaboradores aptos para importar.');
 if(new Set(linhas.map(l=>dataImportacaoPix(l))).size!==1)throw Error('Escolha uma única data de importação para o lote.');
 const vistos=new Set(),nucleos=new Set(),lote=[],evidencias={};let novos=0,atualizados=0,mantidos=0;
 for(const l of linhas){
  if(!l.completo)throw Error(`Há pendências para ${l.nome}.`);
  if(l.inicio!==l.fim)throw Error('Use relatórios de um único dia para o preenchimento diário.');
  const data=dataImportacaoPix(l);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data)||Number.isNaN(Date.parse(data+'T12:00:00Z'))||new Date(data+'T12:00:00Z').toISOString().slice(0,10)!==data)throw Error('Data de importação inválida.');
  if(new Date(data+'T12:00:00Z').getUTCDay()===0)throw Error('Domingos não são dias de avaliação.');
  if(data.slice(0,7)!==l.inicio.slice(0,7))throw Error('A data de importação deve pertencer ao mesmo mês dos relatórios.');
  const competencia=data.slice(0,7),p=participantes.find(p=>String(p.id)===String(l.funcionarioId)&&p.ativo!==false&&p.ativo!=='false');
  if(!p||normalizar(p.nome)!==normalizar(l.nome)||normalizar(p.cargo)!==normalizar(l.cargo))throw Error(`O cadastro de ${l.nome} mudou. Leia os documentos novamente.`);
  if(!Number.isFinite(l.meta)||!Number.isFinite(l.realizado)||[l.ticket,l.margem].some(v=>v!=null&&!Number.isFinite(v)))throw Error(`Valores inválidos para ${p.nome}.`);
  const ident=String(p.id),nucleo=l.nucleoFiliais?.length?l.nucleoFiliais:null;
  if(vistos.has(ident))throw Error(`Colaborador repetido: ${p.nome}.`);vistos.add(ident);
  if(!nucleo&&normalizar(p.filial)!==normalizar(l.filial))throw Error(`A filial de ${p.nome} mudou.`);
  if(nucleo){if(nucleos.has(normalizar(p.nome)))throw Error('O gerente deve ter um único lançamento por núcleo.');nucleos.add(normalizar(p.nome));}
  const existentes=encontrar(l,semana,registros);if(existentes.length>1)throw Error(`Há lançamentos duplicados para ${p.nome}.`);
  const anterior=existentes[0],escolha=resolucoes[ident];
  if(escolha&&(!anterior||escolha.registroId!==anterior.id||escolha.assinatura!==assinaturaRegistroPix(anterior)))throw Error(`O lançamento de ${p.nome} mudou após a comparação. Compare novamente.`);
  if(escolha?.acao==='manter'){mantidos++;continue;}
  const previa=preverImportacaoDiariaPix(l,anterior);
  const diaEscolhido=escolha?.dia||escolha?.acao,semanaEscolhida=escolha?.semanais||escolha?.acao;
  if(previa.conflitoDia&&exigirConferencia&&!['manter','importar'].includes(diaEscolhido))throw Error(`Compare os valores já salvos de ${p.nome} no dia ${data}.`);
  if(previa.conflitosSemanais.length&&exigirConferencia&&!['manter','importar'].includes(semanaEscolhida))throw Error(`Compare os indicadores semanais de ${p.nome}.`);
  if(anterior&&!exigirConferencia&&!atualizar&&!escolha&&(previa.conflitoDia||previa.conflitosSemanais.length))throw Error(`Compare o lançamento de ${p.nome} antes de atualizar.`);
  if(registros.some(r=>r.competencia===competencia&&Number(r.semana)!==Number(semana)&&(String(r.funcionarioId)===ident||(nucleo&&normalizar(r.nome)===normalizar(p.nome)))&&((r.datasAvaliadas||[]).includes(data)||Object.hasOwn(r.diasCalendario||{},data))))throw Error(`A data de ${p.nome} já pertence a outra semana.`);
  const dias=previa.dias;
  if(anterior){
   const conhecidos=Object.values(dias).reduce((s,d)=>s+Number(d.realizado||0),0);
   if((!Object.keys(dias).length&&(Number(anterior.realizadoSemanal)||Number(anterior.metaSemanal)))||Math.abs(conhecidos-Number(anterior.realizadoSemanal??conhecidos))>.02)throw Error(`${p.nome} tem um registro antigo sem detalhamento diário consistente. Complete as datas existentes antes de importar.`);
  }
  const importarDia=diaEscolhido!=='manter'&&(!previa.temDia||previa.conflitoDia);
  if(importarDia)dias[data]={...(dias[data]||{}),meta:centavos(l.meta),realizado:centavos(l.realizado)};
  const importarSemanais=semanaEscolhida!=='manter',mudancas=importarSemanais?previa.alterados:[];
  if(!importarDia&&!mudancas.length){mantidos++;continue;}
  const id=anterior?.id||`pix_imp_${competencia}_${semana}_${ident}`;
  const dados={...(anterior||{}),funcionarioId:p.id,nome:p.nome,cargo:p.cargo,filial:nucleo?nucleo[0]:p.filial,dn:p.dn||'',competencia,semana:Number(semana),datasAvaliadas:Object.keys(dias).sort(),diasCalendario:dias,
   metaSemanal:centavos(Object.values(dias).reduce((s,d)=>s+Number(d.meta||0),0)),realizadoSemanal:centavos(Object.values(dias).reduce((s,d)=>s+Number(d.realizado||0),0)),
   ticketMedio:anterior?.ticketMedio??0,ticketMedioInformado:informado(anterior,'ticketMedio','ticketMedioInformado'),margem:anterior?.margem??0,margemInformada:informado(anterior,'margem','margemInformada'),
   metaNps:anterior?.metaNps??0,metaNpsInformada:informado(anterior,'metaNps','metaNpsInformada'),realizadoNps:anterior?.realizadoNps??0,realizadoNpsInformado:informado(anterior,'realizadoNps','realizadoNpsInformado'),osAbertaPercentual:anterior?.osAbertaPercentual??0,osAbertaInformada:informado(anterior,'osAbertaPercentual','osAbertaInformada'),criadoEm:anterior?.criadoEm||agora,atualizadoEm:agora};
  for(const c of mudancas){dados[c.campo]=c.valor;dados[c.flag]=true;}
  const mudouFinanceiro=mudancas.some(c=>['ticketMedio','margem'].includes(c.campo)),mudouNps=mudancas.some(c=>['metaNps','realizadoNps'].includes(c.campo));
  if(mudouNps){const n=l.npsImportado;if(!p.usaNps||n.competencia!==competencia||[n.meta,n.realizado].some(v=>!Number.isFinite(v)||v< -100||v>100))throw Error(`NPS inválido ou não permitido para ${p.nome}.`);if(n.escopo!=='individual'&&(Number(semana)!==4||n.origem!=='painel-unidade'))throw Error('NPS geral só pode ser aplicado na S4, a partir do painel por unidade.');if(n.filiais)dados.npsFiliais={...n.filiais};}
  const fonte={data,dataRelatorio:l.inicio,semana:Number(semana),origem:l.origem,arquivos:l.arquivos?.length?[...l.arquivos]:l.arquivo?[l.arquivo]:[],fontes:[...(l.fontes||[])],conferidaEm:agora};
  dados.importacoesPorDia={...(anterior?.importacoesPorDia||{})};if(importarDia)dados.importacoesPorDia[data]=fonte;
  dados.importacaoSemanal={...(anterior?.importacaoSemanal||{})};if(mudouFinanceiro)dados.importacaoSemanal.financeiro=fonte;if(mudouNps)dados.importacaoSemanal.nps={...l.npsImportado,conferidaEm:agora};
  dados.importacaoPdf={...(anterior?.importacaoPdf||{}),...((importarDia||mudouFinanceiro)?fonte:{}),...(mudouNps?{nps:l.npsImportado}:{})};
  if(anterior&&(previa.conflitoDia&&importarDia||previa.conflitosSemanais.length&&mudancas.length))dados.historicoImportacao=[...(anterior.historicoImportacao||[]),{alteradoEm:agora,data,diaAnterior:previa.dia||null,semanaisAnteriores:{ticketMedio:anterior.ticketMedio,margem:anterior.margem,metaNps:anterior.metaNps,realizadoNps:anterior.realizadoNps},origemAnterior:anterior.importacoesPorDia?.[data]||anterior.importacaoPdf||null}];
  delete dados.id;delete dados.__versaoBanco;
  if(nucleo){dados.nucleoFiliais=[...nucleo];dados.metaConsolidada=true;dados.realizadoConsolidado=true;}
  evidencias[id]={data,diario:importarDia?(l.arquivosDetalhes||[]):null,financeiro: mudouFinanceiro?(l.arquivosDetalhes||[]):null,nps:mudouNps?(l.npsImportado.arquivosDetalhes||[]):null};
  lote.push({id,competencia,semana:String(semana),filial:dados.filial,colaborador:p.nome,dados,updated_at:agora});
  if(anterior)atualizados++;else novos++;
 }
 return {lote,novos,atualizados,mantidos,evidencias};
}
export function criarConfirmadorPix({carregar,gravar,bloqueado,atualizarTela,prepararEvidencias,limparEvidencias}){
 let executando=false;
 return async(linhas,semana,opcoes={})=>{
  if(executando)throw Error('Uma importação já está em andamento.');if(bloqueado())throw Error('Os lançamentos estão bloqueados pelo diretor.');executando=true;
  try{
   const {participantes,registros}=await carregar(linhas),p=prepararLotePix(linhas,semana,participantes,registros,opcoes);
   if(bloqueado())throw Error('Os lançamentos foram bloqueados. A importação não foi gravada.');
   if(prepararEvidencias&&p.lote.length)p.lote=await prepararEvidencias(p.lote,p.evidencias,opcoes);
   if(bloqueado())throw Error('Os lançamentos foram bloqueados. A importação não foi gravada.');
   const ids=p.lote.length?await gravar(p.lote):[];if(!Array.isArray(ids)||ids.length!==p.lote.length)throw Error('Não foi possível confirmar todos os registros. Atualize a lista antes de tentar novamente.');
   const avisos=[];try{await atualizarTela();}catch{avisos.push('A lista não atualizou. Recarregue a página; os registros foram salvos e preservados.');}
   if(limparEvidencias&&p.lote.length)try{await limparEvidencias();}catch{avisos.push('A limpeza de anexos pendentes será tentada na próxima importação.');}
   return {quantidade:p.lote.length,novos:p.novos,atualizados:p.atualizados,mantidos:p.mantidos,aviso:avisos.join(' ')};
  }finally{executando=false;}
 };
}
