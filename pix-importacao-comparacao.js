const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const moeda=n=>n==null||n===''||!Number.isFinite(Number(n))?'Não informado':Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pct=n=>n==null||n===''||!Number.isFinite(Number(n))?'Não informado':Number(n).toLocaleString('pt-BR')+'%';
const data=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?v.split('-').reverse().join('/'):String(v||'Não informado');
const quando=v=>{if(!v)return 'Data de gravação não registrada';const d=new Date(v);return Number.isNaN(d.getTime())?'Data de gravação não registrada':d.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});};
function fontesSalvas(r){
 const fontes=r.importacaoPdf?.arquivos||[];
 if(fontes.length)return fontes;
 if(r.importacaoPdf?.origem==='Consolidado')return ['Consolidação anterior dos consultores (arquivos não registrados)'];
 return ['Registro salvo no sistema · origem original não registrada'];
}
export function renderizarComparacaoPix(c,escolha){
 const a=c.salvo,b=c.importacao;
 const datas=[...new Set([...(a.datasAvaliadas||[]),...Object.keys(a.diasCalendario||{})])].sort();
 const periodoSalvo=datas.length?datas.map(data).join(', '):'Período não detalhado no registro';
 const financeiro=fontesSalvas(a),novos=b.arquivos?.length?b.arquivos:b.arquivo?[b.arquivo]:['Consolidação dos consultores dos PDFs selecionados'];
 const npsNovo=b.npsImportado,origemNps=a.importacaoPdf?.nps?.arquivo||'Registro salvo · origem do NPS não registrada';
 const trocaPeriodo=!datas.length||datas.length!==1||datas[0]!==b.inicio||b.inicio!==b.fim;
 const dias=Object.values(a.diasCalendario||{}).filter(d=>d.realizado!=null&&String(d.realizado).trim()!==''&&Number.isFinite(Number(d.realizado)));
 const realizado=a.realizadoSemanal??(dias.length?dias.reduce((n,d)=>n+Number(d.realizado),0):null);
 const info=(campo,flag)=>a[flag]===false?null:a[campo];
 const campos=(versao)=>{
  const novo=versao==='importar',fonte=novo?novos.join(' · '):financeiro.join(' · ');
  const linha=(titulo,valor,origem)=>`<div><dt>${titulo}</dt><dd>${esc(valor)}<small>Origem: ${esc(origem)}</small></dd></div>`;
  return linha('Datas avaliadas',novo?`${data(b.inicio)}${b.fim!==b.inicio?' a '+data(b.fim):''}`:periodoSalvo,fonte)
   +linha('Meta',moeda(novo?b.meta:a.metaSemanal),fonte)
   +linha('Realizado',moeda(novo?b.realizado:realizado),fonte)
   +linha('Ticket médio',moeda(novo?(b.ticket??info('ticketMedio','ticketMedioInformado')):info('ticketMedio','ticketMedioInformado')),novo&&b.ticket==null?'Mantido do registro salvo':fonte)
   +linha('Margem',pct(novo?(b.margem??info('margem','margemInformada')):info('margem','margemInformada')),novo&&b.margem==null?'Mantida do registro salvo':fonte)
   +linha('NPS · meta / realizado',`${pct(novo&&npsNovo?npsNovo.meta:info('metaNps','metaNpsInformada'))} / ${pct(novo&&npsNovo?npsNovo.realizado:info('realizadoNps','realizadoNpsInformado'))}`,novo&&npsNovo?npsNovo.arquivo:novo?'Mantido do registro salvo · '+origemNps:origemNps)
   +linha('O.S. em aberto',pct(info('osAbertaPercentual','osAbertaInformada')),'Mantido do registro salvo');
 };
 const card=(acao,titulo,descricao)=>`<article class="pic-version"><label class="pic-choice"><input type="radio" name="pin-versao" value="${acao}" ${escolha===acao?'checked':''}><span><strong>${titulo}</strong><small>${descricao}</small></span></label><dl>${campos(acao)}</dl>${acao==='manter'?`<p class="pic-origin">Salvo em: ${esc(quando(a.atualizadoEm||a.__versaoBanco||a.criadoEm))}<br>Identificador: ${esc(a.id)}</p>`:`<p class="pic-origin">Fonte: ${esc(b.origem||'Importação PDF')}${b.fontes?.length?'<br>Base: '+esc(b.fontes.join(' · ')):''}</p>`}</article>`;
 return `<div class="pic-person"><h3>${esc(b.nome)}</h3><p>${esc(b.cargo)} · ${esc(b.nucleoFiliais?.length?b.nucleoFiliais.join(' / '):b.filial)} · ${esc(c.competencia)} · S${c.semana}</p></div>${trocaPeriodo?'<p class="pic-warning">Os períodos são diferentes. Ao usar a importação, as datas e os valores financeiros salvos desta semana serão substituídos pelo período importado. A versão anterior ficará no histórico.</p>':''}<div class="pic-versions">${card('manter','Manter lançamento salvo','Não altera este registro e não cria uma cópia.')}${card('importar','Usar nova importação','Atualiza o registro existente com os valores mostrados abaixo.')}</div><p class="pic-help">Campos sem informação nova, como NPS ou O.S., permanecem com os valores salvos. A escolha é por colaborador; os totais de supervisão e gerência são comparados separadamente.</p>`;
}

export function escolherVersoesImportacaoPix(conflitos){
 if(!conflitos.length)return Promise.resolve({});
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='pic-dialog';dialog.setAttribute('aria-labelledby','pic-title');
  dialog.innerHTML='<header class="pic-header"><div><span>PIX DO PRESIDENTE · CONFERÊNCIA</span><h2 id="pic-title">Este lançamento já existe</h2><p>Compare as duas versões e escolha qual deve ficar salva.</p></div><button type="button" class="pic-close" aria-label="Cancelar comparação">×</button></header><div class="pic-progress" aria-live="polite"></div><div class="pic-content"></div><footer class="pic-footer"><button type="button" class="pic-cancel">Cancelar revisão</button><div><button type="button" class="pic-back">Anterior</button><button type="button" class="pic-next">Próximo</button><button type="button" class="pic-finish">Aplicar escolhas e importar</button></div></footer>';
  document.body.appendChild(dialog);let index=0,encerrado=false;const escolhas={};
  const $=s=>dialog.querySelector(s);
  const concluir=valor=>{if(encerrado)return;encerrado=true;dialog.close();dialog.remove();resolve(valor);};
  function atualizar(){
   $('.pic-progress').textContent=`Registro ${index+1} de ${conflitos.length} · ${Object.keys(escolhas).length} de ${conflitos.length} escolhas feitas`;
   $('.pic-back').disabled=index===0;
   $('.pic-next').hidden=index===conflitos.length-1;$('.pic-next').disabled=!escolhas[conflitos[index].chave];
   $('.pic-finish').hidden=index!==conflitos.length-1;$('.pic-finish').disabled=Object.keys(escolhas).length!==conflitos.length;
  }
  function render(){const c=conflitos[index];$('.pic-content').innerHTML=renderizarComparacaoPix(c,escolhas[c.chave]?.acao);atualizar();}
  dialog.addEventListener('change',e=>{if(e.target.name!=='pin-versao')return;const c=conflitos[index];escolhas[c.chave]={acao:e.target.value,registroId:c.salvo.id,assinatura:c.assinatura};atualizar();});
  dialog.addEventListener('cancel',e=>{e.preventDefault();concluir(null);});dialog.addEventListener('close',()=>concluir(null));
  $('.pic-close').onclick=$('.pic-cancel').onclick=()=>concluir(null);
  $('.pic-back').onclick=()=>{if(index>0){index--;render();$('.pic-content input')?.focus();}};
  $('.pic-next').onclick=()=>{if(escolhas[conflitos[index].chave]&&index<conflitos.length-1){index++;render();$('.pic-content input')?.focus();}};
  $('.pic-finish').onclick=()=>{if(Object.keys(escolhas).length===conflitos.length)concluir(escolhas);};
  render();dialog.showModal();
 });
}
