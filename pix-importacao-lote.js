import {normalizar, centavos} from './pix-importacao-core.js?v=20261116-comparacao1';

// Prepara todo o lote antes de qualquer escrita. Não altera os objetos recebidos.
const informado = (r, campo, flag) => r?.[flag] ?? Boolean(r && r[campo] != null && String(r[campo]).trim() !== '');

export function assinaturaRegistroPix(registro) {
  const ordenar=v=>Array.isArray(v)?v.map(ordenar):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordenar(v[k])])):v;
  return JSON.stringify(ordenar(registro));
}
export function localizarConflitosPix(linhas,semana,registros) {
  return linhas.flatMap(linha=>{
    const competencia=linha.inicio.slice(0,7);
    const encontrados=registros.filter(r=>r.competencia===competencia&&Number(r.semana)===Number(semana)&&(String(r.funcionarioId)===String(linha.funcionarioId)||(linha.nucleoFiliais?.length&&normalizar(r.nome)===normalizar(linha.nome))));
    if(encontrados.length>1)throw Error(`Há lançamentos duplicados para ${linha.nome}. Revise antes de importar.`);
    return encontrados.length?[{chave:String(linha.funcionarioId),salvo:encontrados[0],importacao:linha,assinatura:assinaturaRegistroPix(encontrados[0]),semana:Number(semana),competencia}]:[];
  });
}

export function prepararLotePix(linhas, semana, participantes, registros, {atualizar=false,resolucoes={},exigirConferencia=false, agora=new Date().toISOString()}={}) {
  if(![1,2,3,4].includes(Number(semana)))throw Error('Selecione a semana da campanha.');
  if(!Array.isArray(linhas)||!linhas.length)throw Error('Não há colaboradores aptos para importar.');
  const periodos=new Set(linhas.map(r=>r.inicio+'|'+r.fim));
  if(periodos.size!==1)throw Error('Todos os documentos devem ter o mesmo período.');
  const vistos=new Set(), nomesGerentes=new Set();let novos=0,atualizados=0,mantidos=0;
  const lote=linhas.map(linha=>{
    if(!linha.completo)throw Error(`Há pendências para ${linha.nome}.`);
    if(linha.inicio!==linha.fim)throw Error('Por enquanto, confirme apenas relatórios de um único dia.');
    const data=linha.inicio;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(data)||Number.isNaN(Date.parse(data+'T12:00:00Z'))||new Date(data+'T12:00:00Z').toISOString().slice(0,10)!==data)throw Error('Data de referência inválida.');
    if(new Date(data+'T12:00:00Z').getUTCDay()===0)throw Error('Domingos não são dias de avaliação da campanha.');
    const competencia=data.slice(0,7);
    const p=participantes.find(p=>String(p.id)===String(linha.funcionarioId)&&p.ativo!==false&&p.ativo!=='false');
    if(!p||normalizar(p.nome)!==normalizar(linha.nome)||normalizar(p.cargo)!==normalizar(linha.cargo))throw Error(`O cadastro de ${linha.nome} mudou. Leia os documentos novamente.`);
    if(!Number.isFinite(linha.meta)||!Number.isFinite(linha.realizado)||[linha.ticket,linha.margem].some(v=>v!=null&&!Number.isFinite(v)))throw Error(`Valores inválidos para ${linha.nome}.`);
    const identidade=String(p.id);
    if(vistos.has(identidade))throw Error(`Colaborador repetido no lote: ${p.nome}.`);vistos.add(identidade);
    const nucleo=linha.nucleoFiliais?.length?linha.nucleoFiliais:null;
    if(!nucleo&&normalizar(p.filial)!==normalizar(linha.filial))throw Error(`A filial de ${p.nome} mudou. Leia os documentos novamente.`);
    if(nucleo){const nome=normalizar(p.nome);if(nomesGerentes.has(nome))throw Error('O gerente deve ter apenas um lançamento por núcleo.');nomesGerentes.add(nome);}
    const pertence=r=>String(r.funcionarioId)===identidade||(nucleo&&normalizar(r.nome)===normalizar(p.nome));
    const doMes=registros.filter(r=>r.competencia===competencia&&pertence(r));
    const existentes=doMes.filter(r=>Number(r.semana)===Number(semana));
    if(existentes.length>1)throw Error(`Há lançamentos duplicados para ${p.nome}. Corrija antes de importar.`);
    const anterior=existentes[0],escolha=resolucoes[identidade];
    if(anterior && escolha){
      if(escolha.registroId!==anterior.id||escolha.assinatura!==assinaturaRegistroPix(anterior))throw Error(`O lançamento de ${p.nome} mudou após a comparação. Compare as versões novamente.`);
      if(!['manter','importar'].includes(escolha.acao))throw Error('Escolha qual versão manter para cada colaborador.');
      if(escolha.acao==='manter'){mantidos++;return null;}
    }else if(anterior&&exigirConferencia)throw Error(`Compare o lançamento salvo de ${p.nome} e escolha qual versão manter.`);
    else if(!anterior&&escolha)throw Error(`O lançamento de ${p.nome} mudou após a comparação. Atualize a revisão.`);
    if(doMes.some(r=>Number(r.semana)!==Number(semana)&&((r.datasAvaliadas||[]).includes(data)||Object.hasOwn(r.diasCalendario||{},data))))throw Error(`A data de ${p.nome} já pertence a outra semana.`);
    if(anterior){
      // A substituição de outro período só é permitida após escolha específica na comparação.
      if(!escolha){
        const datas=[...(anterior.datasAvaliadas||[]),...Object.keys(anterior.diasCalendario||{})];
        if(!datas.length||datas.some(d=>d!==data))throw Error(`${p.nome} já possui lançamento com outro período. Compare as versões antes de substituir.`);
        if(!atualizar)throw Error(`${p.nome} já possui lançamento neste dia. Marque a opção de atualizar registros existentes para substituí-lo.`);
      }
      atualizados++;
    }else novos++;
    const id=anterior?.id||`pix_imp_${competencia}_${semana}_${identidade}`;
    const dados={...(anterior||{}),funcionarioId:p.id,nome:p.nome,cargo:p.cargo,
      filial:nucleo?nucleo[0]:p.filial,dn:p.dn||'',competencia,semana:Number(semana),
      metaSemanal:centavos(linha.meta),realizadoSemanal:centavos(linha.realizado),
      datasAvaliadas:[data],diasCalendario:{[data]:{realizado:centavos(linha.realizado)}},
      ticketMedio:linha.ticket??anterior?.ticketMedio??0,
      ticketMedioInformado:linha.ticket!=null?true:anterior?.ticketMedioInformado??false,
      margem:linha.margem??anterior?.margem??0,
      margemInformada:linha.margem!=null?true:anterior?.margemInformada??false,
      metaNps:anterior?.metaNps??0,metaNpsInformada:informado(anterior,'metaNps','metaNpsInformada'),
      realizadoNps:anterior?.realizadoNps??0,realizadoNpsInformado:informado(anterior,'realizadoNps','realizadoNpsInformado'),
      osAbertaPercentual:anterior?.osAbertaPercentual??0,osAbertaInformada:informado(anterior,'osAbertaPercentual','osAbertaInformada'),
      criadoEm:anterior?.criadoEm||agora,atualizadoEm:agora,
      importacaoPdf:{...(anterior?.importacaoPdf?.nps?{nps:anterior.importacaoPdf.nps}:{}),data,semana:Number(semana),origem:linha.origem,arquivos:linha.arquivos?.length?[...linha.arquivos]:linha.arquivo?[linha.arquivo]:[],fontes:[...(linha.fontes||[])],conferidaEm:agora}};
    if (linha.npsImportado) {
      const nps=linha.npsImportado;
      if (!p.usaNps || nps.competencia!==competencia || !Number.isFinite(nps.meta) || !Number.isFinite(nps.realizado) || nps.meta < -100 || nps.meta > 100 || nps.realizado < -100 || nps.realizado > 100) throw Error(`NPS inválido ou não permitido para ${p.nome}.`);
      if (nps.escopo!=='individual' && (Number(semana)!==4 || nps.origem!=='painel-unidade')) throw Error('NPS geral só pode ser aplicado na S4, a partir do painel por unidade.');
      dados.metaNps=nps.meta;dados.realizadoNps=nps.realizado;
      dados.metaNpsInformada=true;dados.realizadoNpsInformado=true;
      if (nps.filiais) dados.npsFiliais={...nps.filiais};
      dados.importacaoPdf.nps={...nps};
    }
    if(anterior&&escolha?.acao==='importar'){
      const historico=Array.isArray(anterior.historicoImportacao)?anterior.historicoImportacao:[];
      const versao={...anterior};delete versao.historicoImportacao;delete versao.__versaoBanco;
      dados.historicoImportacao=[...historico,{substituidoEm:agora,motivo:'Nova importação escolhida na comparação',registro:versao}];
    }
    delete dados.id;delete dados.__versaoBanco;
    if(nucleo){dados.nucleoFiliais=[...nucleo];dados.metaConsolidada=true;dados.realizadoConsolidado=true;}
    return {id,competencia,semana:String(semana),filial:dados.filial,colaborador:p.nome,dados,updated_at:agora};
  });
  return {lote:lote.filter(Boolean),novos,atualizados,mantidos};
}

// Uma requisição grava o lote validado. Sem ciclos de escrita parcial.
export function criarConfirmadorPix({carregar,gravar,bloqueado,atualizarTela}) {
  let executando=false;
  return async (linhas,semana,opcoes={})=>{
    if(executando)throw Error('Uma importação já está em andamento.');
    if(bloqueado())throw Error('Os lançamentos estão bloqueados pelo diretor.');
    executando=true;
    try {
      const {participantes,registros}=await carregar(linhas);
      const preparado=prepararLotePix(linhas,semana,participantes,registros,opcoes);
      if(bloqueado())throw Error('Os lançamentos foram bloqueados. A importação não foi gravada.');
      const ids=preparado.lote.length?await gravar(preparado.lote):[];
      if(!Array.isArray(ids)||ids.length!==preparado.lote.length)throw Error('Não foi possível confirmar todos os registros. Atualize a lista antes de tentar novamente.');
      let aviso='';try{await atualizarTela();}catch{aviso=preparado.lote.length?'Os registros foram salvos, mas a lista não atualizou. Recarregue a página.':'Os registros foram mantidos, mas a lista não atualizou. Recarregue a página.';}
      return {quantidade:preparado.lote.length,novos:preparado.novos,atualizados:preparado.atualizados,mantidos:preparado.mantidos,aviso};
    }finally{executando=false;}
  };
}
