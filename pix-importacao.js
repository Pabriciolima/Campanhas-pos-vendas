import {resumirNpsSemanaPix} from './pix-importacao-nps-semana.js?v=20261117-aviso1';
import {criarMiniaturasPix,renderizarCartoesPix} from './pix-importacao-miniaturas.js?v=20261116-miniaturas1';
import {escolherVersoesImportacaoPix} from './pix-importacao-comparacao.js?v=20261116-diaria2';
import {lerImagemNps,lerImagemNpsGeral} from './pix-importacao-nps-imagem.js?v=20261116-s4geral2';
import {vincularNps,aplicarNpsImportacao,percentualNpsImportacao} from './pix-importacao-nps-core.js?v=20261116-diaria2';
import {analisarPaginas,consolidar,cargoTipo,normalizar} from './pix-importacao-core.js?v=20261124-sem-movimento1';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const moeda=n=>n==null?'—':n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
let documentos=[],base=null,resultado=null,vinculos={},excluidos=new Set(),ocupado=false,salvo=false,geracao=0,fase='',arquivosImportacao=[],pdfPromise,npsDocs=[],npsLinks={},npsLidos=[];
const npsAtivos=()=>npsDocs.filter(d=>d.tipo!=='geral'||Number($('#pin-semana').value)===4);
const aptos=()=>resultado?.linhas.filter(r=>r.completo)||[];

let painelMiniaturas;
function miniaturasPix(){return painelMiniaturas ||= criarMiniaturasPix({render:itens=>{
 for(const [grupo,id,contador] of [['pdf','pin-arquivos-lista','pin-pdf-resumo'],['nps','pin-nps-miniaturas','pin-nps-resumo'],['geral','pin-nps-geral-miniaturas','pin-geral-resumo']]){
  const lista=itens.filter(i=>i.grupo===grupo),el=$('#'+id),resumo=$('#'+contador);
  if(el)el.innerHTML=renderizarCartoesPix(lista);
  if(resumo)resumo.textContent=lista.length?lista.length+' arquivo(s) selecionado(s)':grupo==='pdf'?'Adicione os relatórios em PDF':'Adicione uma imagem de NPS';
 }
}});}
async function miniaturaPdfPix(pdf){
 try{const pagina=await pdf.getPage(1),v=pagina.getViewport({scale:1}),viewport=pagina.getViewport({scale:240/Math.max(v.width,v.height)}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await pagina.render({canvasContext:canvas.getContext('2d'),viewport,background:'#ffffff'}).promise;return canvas.toDataURL('image/jpeg',.78);}catch{return '';}
}


let consultaNpsToken=0,consultaNpsChave='';
async function atualizarAvisoNpsSemanaPix(){
 const el=$('#pin-nps-salvo');if(!el)return;
 const competencia=($('#pin-data')?.value||resultado?.periodo?.inicio||'').slice(0,7),semana=Number($('#pin-semana')?.value);
 if(!resultado||!base||!competencia||![1,2,3,4].includes(semana)){consultaNpsToken++;consultaNpsChave='';el.hidden=true;el.replaceChildren();return;}
 const chave=JSON.stringify([geracao,competencia,semana,aptos().map(l=>String(l.funcionarioId)).sort(),npsDocs.length]);
 if(chave===consultaNpsChave)return;
 consultaNpsChave=chave;const token=++consultaNpsToken;
 if(typeof window.consultarNpsImportacaoPix!=='function'){el.hidden=true;return;}
 el.hidden=false;el.className='pin-nps-saved';el.textContent='Consultando o NPS já lançado nesta semana…';
 try{
  const registros=await window.consultarNpsImportacaoPix(competencia,semana);
  if(token!==consultaNpsToken)return;
  const resumo=resumirNpsSemanaPix(aptos(),base.participantes,registros,competencia,semana);
  if(!resumo.aptos.length){el.hidden=true;return;}
  const pct=v=>Number(v).toLocaleString('pt-BR')+'%';
  const periodo='Semana '+semana+' · '+competencia.slice(5)+'/'+competencia.slice(0,4);
  if(!resumo.salvos.length){el.className='pin-nps-saved is-pending';el.innerHTML='<strong>NPS ainda não lançado · '+esc(periodo)+'</strong><p>Nenhum dos consultores elegíveis deste lote possui NPS salvo nesta semana. Você pode enviar a imagem acima.</p>';return;}
  const completo=!resumo.pendentes.length;
  el.className='pin-nps-saved'+(completo?' is-complete':' is-pending');
  el.innerHTML='<strong>'+(completo?'✓ NPS já lançado nesta semana':'NPS parcialmente lançado nesta semana')+' · '+esc(periodo)+'</strong><p>'+resumo.salvos.length+' de '+resumo.aptos.length+' consultor(es) deste lote já têm NPS salvo. '+(completo?'Não precisa enviar a imagem novamente. Sem uma nova imagem, o NPS já lançado será mantido.':'Envie a imagem somente se precisar preencher os consultores pendentes. Os valores já salvos serão preservados sem nova informação.')+'</p><details><summary>Ver quem já tem NPS lançado</summary>'+resumo.salvos.map(l=>'<div><b>'+esc(l.nome)+'</b><span>'+esc(l.filial)+' · Meta '+pct(l.metaNps)+' · Realizado '+pct(l.realizadoNps)+'</span></div>').join('')+'</details>'+(resumo.pendentes.length?'<details><summary>'+resumo.pendentes.length+' consultor(es) ainda sem NPS confirmado</summary>'+resumo.pendentes.map(l=>'<div><b>'+esc(l.nome)+'</b><span>'+esc(l.filial)+'</span></div>').join('')+'</details>':'')+(npsDocs.length?'<p class="pin-nps-saved-note">Você selecionou uma nova imagem. Ela só substituirá valores diferentes após sua escolha na comparação.</p>':'');
 }catch{
  if(token!==consultaNpsToken)return;consultaNpsChave='';el.className='pin-nps-saved is-pending';el.textContent='Não foi possível consultar o NPS já salvo. Não considere a semana como pendente: tente abrir novamente a importação. Os valores existentes serão preservados.';
 }
}

function status(texto,erro=false){const el=$('#pin-status');el.textContent=texto;el.classList.toggle('pin-error',erro);}
function atualizarAcoes(){
 const pronto=aptos().length>0;
 $('#pin-confirmar').setAttribute('aria-busy',String(ocupado&&fase==='gravacao'));
 $('#pin-confirmar').textContent=ocupado&&fase==='conferencia'?'Conferindo registros…':ocupado&&fase==='gravacao'?'Importando lançamentos…':salvo?'Importação concluída':`Confirmar importação${pronto?' · '+aptos().length:''}`;
 $('#pin-confirmar').disabled=ocupado||salvo||!pronto||!$('#pin-semana').value||!$('#pin-data').value||!$('#pin-conferido').checked||(npsAtivos().length>0&&!$('#pin-nps-conferido').checked);
 $('#pin-cancelar').textContent=salvo?'Fechar':'Cancelar importação';
 $('#pin-data').disabled=ocupado||salvo;$('#pin-arquivos').disabled=ocupado;$('#pin-semana').disabled=ocupado||salvo;$('#pin-conferido').disabled=ocupado||salvo;$('#pin-limpar').disabled=ocupado;$('#pin-cancelar').disabled=ocupado&&['gravacao','conferencia'].includes(fase);$('#pin-fechar').disabled=ocupado&&['gravacao','conferencia'].includes(fase);
 $('#pin-nps-geral-area').hidden=Number($('#pin-semana').value)!==4;$('#pin-nps-geral-arquivos').disabled=ocupado||salvo;
 $('#pin-nps-arquivos').disabled=ocupado||salvo;$('#pin-nps-limpar').disabled=ocupado||salvo;$('#pin-nps-conferido').disabled=ocupado||salvo;
 $('#pin-nps-previa').querySelectorAll('input,select').forEach(b=>b.disabled=ocupado||salvo);
 $('#pin-resultados').querySelectorAll('button,select').forEach(b=>b.disabled=ocupado||salvo);
 $('#pin-pendencias').querySelectorAll('select').forEach(b=>b.disabled=ocupado||salvo);
 $('#pin-removidos').querySelectorAll('button').forEach(b=>b.disabled=ocupado||salvo);
}
function abrir(){if(salvo)limpar();consultaNpsChave='';void atualizarAvisoNpsSemanaPix();const panel=$('#pixImportacaoNova');panel.hidden=false;$('#pin-arquivos').focus();panel.scrollIntoView({behavior:'smooth',block:'start'});}
function limpar(){
 geracao++;consultaNpsToken++;consultaNpsChave='';const aviso=$('#pin-nps-salvo');if(aviso){aviso.hidden=true;aviso.replaceChildren();}painelMiniaturas?.limpar();arquivosImportacao=[];documentos=[];resultado=null;vinculos={};excluidos=new Set();salvo=false;
 npsDocs.forEach(d=>{if(d.preview)URL.revokeObjectURL(d.preview);});npsDocs=[];npsLinks={};npsLidos=[];$('#pin-nps-arquivos').value='';$('#pin-nps-geral-arquivos').value='';$('#pin-nps-conferido').checked=false;$('#pin-nps-previa').replaceChildren();$('#pin-nps-status').textContent='Use a imagem com a meta e o resultado do mês da importação.';
 $('#pin-arquivos').value='';$('#pin-conferido').checked=false;
 for(const id of ['pin-arquivos-lista','pin-resultados','pin-pendencias','pin-indicadores','pin-removidos'])$('#'+id).replaceChildren();
 $('#pixImportacaoNova').classList.remove('pin-has-data');
 status('Selecione os PDFs e escolha a semana. Depois, revise a lista e confirme.');atualizarAcoes();
}
async function cancelar(){
 if(ocupado&&['gravacao','conferencia'].includes(fase))return;
 ocupado=false;fase='';$('#pin-semana').value='';limpar();$('#pixImportacaoNova').hidden=true;$('#btnPixImportacaoNova').focus();
}

async function leitor(){
 if(!pdfPromise)pdfPromise=import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs').then(p=>{p.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';return p;}).catch(()=>{pdfPromise=null;throw Error('Não foi possível carregar o leitor de PDF. Verifique a conexão e tente novamente.');});
 return pdfPromise;
}
async function ler(file,token=geracao){
 if(!/\.pdf$/i.test(file.name)||file.size>15*1024*1024)throw Error('Selecione PDFs de até 15 MB por arquivo.');
 const pdfjs=await leitor(),task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});
 try{const pdf=await task.promise;if(pdf.numPages>60)throw Error('Use relatórios com até 60 páginas.');const paginas=[];for(let n=1;n<=pdf.numPages;n++)paginas.push(await(await pdf.getPage(n)).getTextContent());const d=analisarPaginas(paginas,file.name),preview=await miniaturaPdfPix(pdf);if(token===geracao)miniaturasPix().atualizar(file.name,'pdf',{preview,paginas:pdf.numPages,tipo:d.tipo==='tecnico'?'Consultores técnicos':'Consultores de balcão',estado:'pronto'});return d;}finally{await task.destroy();}
}
async function importar(files){
 if(ocupado||!files.length)return;
 if(new Set(files.map(f=>f.name)).size!==files.length){status('Há arquivos com o mesmo nome. Renomeie-os antes de importar.',true);return;}
 if(files.length>30){status('Importe até 30 documentos por vez.',true);return;}
 if(window.bloqueioLancamentos?.bloqueado||document.body.classList.contains('lancamentos-bloqueados')){status('Os lançamentos estão bloqueados pelo diretor.',true);return;}
 // A seleção de arquivos já está capturada; limpar não perde o lote recebido.
 limpar();miniaturasPix().selecionar(files,'pdf');ocupado=true;fase='leitura';const token=geracao;atualizarAcoes();
 try{
  status('Atualizando o cadastro…');if(!window.obterBaseImportacaoPix)throw Error('Aguarde o carregamento do PIX e tente novamente.');const novaBase=await window.obterBaseImportacaoPix();if(token!==geracao)return;base=novaBase;
  const novos=[];for(let i=0;i<files.length;i++){status(`Lendo ${i+1}/${files.length} · ${files[i].name}`);novos.push(await ler(files[i],token));if(token!==geracao)return;}
  if(token!==geracao)return;documentos=novos;arquivosImportacao=files;$('#pin-data').value='';recalcular();

  $('#pixImportacaoNova').classList.add('pin-has-data');
 }catch(e){if(token===geracao){documentos=[];resultado=null;files.forEach(f=>miniaturasPix().atualizar(f.name,'pdf',{estado:'erro'}));status(e.message||'Falha na leitura.',true);}}finally{if(token===geracao){ocupado=false;fase='';atualizarAcoes();}}
}
function recalcular(){
 salvo=false;$('#pin-conferido').checked=false;
 resultado=consolidar(documentos,base.participantes,base.nucleos,vinculos,excluidos);
 npsLidos=vincularNps(npsDocs,base.participantes,npsLinks).filter(r=>!r.geral||Number($('#pin-semana').value)===4);
 resultado.linhas=aplicarNpsImportacao(resultado.linhas,npsLidos,base.participantes,{semana:Number($('#pin-semana').value)});
 const {linhas,pendencias,ignorados,periodo}=resultado;
 if(!$('#pin-data').value)$('#pin-data').value=periodo.inicio;
 linhas.forEach(l=>{l.dataImportacao=$('#pin-data').value;if(l.npsImportado){const nomes=l.npsImportado.arquivos||[l.npsImportado.arquivo];l.npsImportado.arquivosDetalhes=nomes.filter(n=>typeof n==='string'&&arquivosImportacao.some(f=>f.name===n)).map(nome=>({nome,tipo:'nps',pagina:1}));}});
 renderNps();void atualizarAvisoNpsSemanaPix();
 const parciais=linhas.filter(r=>!r.completo),prontos=aptos(),semMovimento=ignorados.filter(r=>r.realizado===0&&r.motivo.startsWith('Sem movimento'));
 $('#pin-indicadores').innerHTML=`<strong>Dia a preencher: ${esc($('#pin-data').value.split('-').reverse().join('/'))}</strong><span>Referência do PDF: ${esc(periodo.inicio.split('-').reverse().join('/'))}${periodo.inicio===periodo.fim?'':' a '+esc(periodo.fim.split('-').reverse().join('/'))}</span><span>${prontos.length} para importar</span>${semMovimento.length?`<span>${semMovimento.length} sem movimento · dia não trabalhado</span>`:''}<span>${parciais.length} parciais · não serão importados</span>${pendencias.length?`<span>${pendencias.length} vínculo(s) pendente(s)</span>`:''}`;
 $('#pin-pendencias').innerHTML=pendencias.length?`<details open><summary>${pendencias.length} nome(s) sem vínculo</summary><div class="pin-links">${pendencias.map(r=>`<label><strong>${esc(r.nome)}</strong><small>${esc(r.motivo)}</small><select data-pin-vinculo="${esc(r.key)}"><option value="">Selecionar cadastro…</option><option value="__ignorar__">Não participa da campanha</option>${base.participantes.filter(p=>cargoTipo(p.cargo)===r.tipo).map(p=>`<option value="${esc(p.id)}">${esc(p.nome)} · ${esc(p.filial)}</option>`).join('')}</select></label>`).join('')}</div></details>`:'';
 const semBase=linhas.filter(r=>!r.completo&&!r.fontes.length);
 const grupos=[['Individual','Consultores'],['Consolidado','Supervisão e gerência']];
 $('#pin-resultados').innerHTML=grupos.map(([tipo,titulo])=>{
  const rows=linhas.map((r,i)=>({...r,index:i})).filter(r=>r.origem===tipo&&(r.completo||r.fontes.length));
  if(!rows.length)return '';
  return `<section class="pin-group"><h3>${titulo}</h3><div class="pin-table-wrap"><table><thead><tr><th>Colaborador / filial</th><th>Meta</th><th>Realizado</th><th>Ticket / margem</th><th>NPS</th><th>Ações</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.completo?'':'pin-row-partial'}"><td><strong>${esc(r.nome)}</strong><small>${esc(r.cargo)} · ${esc(r.nucleoFiliais?.length?r.nucleoFiliais.join(' / '):r.filial)}</small>${r.completo?'':`<small class="pin-pending">Não será importado · ${esc(r.motivo)}</small>`}<details><summary>Ver origem</summary>${r.fontes.map(f=>`<small>${esc(f)}</small>`).join('')}${r.arquivo?`<small>${esc(r.arquivo)} · página ${r.pagina}</small>`:''}</details></td><td>${moeda(r.meta)}</td><td>${moeda(r.realizado)}</td><td>${r.ticket==null?'':`<span>${moeda(r.ticket)}</span>`}${r.margem==null?'':`<span>${r.margem.toLocaleString('pt-BR',{minimumFractionDigits:2})}%</span>`}</td><td>${r.npsImportado?`<strong>${r.npsImportado.meta.toLocaleString('pt-BR')}% → ${r.npsImportado.realizado.toLocaleString('pt-BR')}%</strong><small>${esc(r.npsStatus)}</small>`:`<small>${esc(r.npsStatus)}</small>`}</td><td><button type="button" class="pin-remove" data-pin-remover="${esc(r.funcionarioId)}" aria-label="Remover ${esc(r.nome)} da importação">Remover</button></td></tr>`).join('')}</tbody></table></div></section>`;
 }).join('')+(semBase.length?`<details class="pin-excluded"><summary>${semBase.length} função(ões) aguardando relatórios · não serão importadas</summary>${semBase.map(r=>`<p><strong>${esc(r.nome)}</strong> · ${esc(r.cargo)}<br>${esc(r.motivo)} <button type="button" class="pin-remove" data-pin-remover="${esc(r.funcionarioId)}">Remover</button></p>`).join('')}</details>`:'')+(ignorados.length?`<details class="pin-excluded"><summary>${ignorados.length} linha(s) fora da importação</summary>${ignorados.map(r=>`<p>${esc(r.nome)} · ${esc(r.motivo)}</p>`).join('')}</details>`:'');
 $('#pin-removidos').innerHTML=excluidos.size?`<details><summary>${excluidos.size} colaborador(es) removido(s) · desfazer</summary><div class="pin-restore-list">${[...excluidos].map(id=>`<span>${esc(base.participantes.find(p=>String(p.id)===id)?.nome||id)} <button type="button" class="pin-review" data-pin-restaurar="${esc(id)}">Restaurar</button></span>`).join('')}</div></details>`:'';
 status(prontos.length?'Revise a lista e confirme. Colaboradores com realizado zerado ficam fora deste dia.':semMovimento.length&&!pendencias.length&&!parciais.length?'Os colaboradores estão sem movimento neste dia. Nenhum dia trabalhado será criado; os registros anteriores serão mantidos.':'Nenhum lançamento apto. Confira os vínculos e os relatórios dos setores/filiais pendentes.',!prontos.length&&!semMovimento.length);
 atualizarAcoes();
}
async function informeImportacao(mensagem,{tipo='success',titulo='Importação realizada com sucesso!'}={}) {
 if(typeof window.CampanhaUI?.alert==='function')return window.CampanhaUI.alert(mensagem,{tipo,titulo,rotulo:'PIX DO PRESIDENTE',textoConfirmar:'Entendi'});
 if(typeof window.appAlert==='function')return window.appAlert({mensagem,tipo,titulo,rotulo:'PIX DO PRESIDENTE',textoConfirmar:'Entendi'});
 return window.alert?.(`${titulo}\n\n${mensagem}`);
}
async function confirmar(){
 if(ocupado||salvo)return;
 if(!$('#pin-conferido').checked||!$('#pin-semana').value||!$('#pin-data').value||!aptos().length||(npsAtivos().length>0&&!$('#pin-nps-conferido').checked)){status('Escolha a semana e marque a conferência da lista e do NPS, se houver imagem.',true);return;}
 if(!window.confirmarImportacaoPix){status('Atualize a página para carregar a confirmação da importação.',true);return;}
 const competencia=$('#pin-data').value.slice(0,7),semana=Number($('#pin-semana').value);
 ocupado=true;fase='conferencia';atualizarAcoes();let r;
 try{
  if(typeof window.conferirConflitosImportacaoPix!=='function')throw Error('Atualize a página para carregar a comparação dos lançamentos.');
  status('Consultando lançamentos já salvos…');
  const linhas=aptos();
  const conflitos=await window.conferirConflitosImportacaoPix(linhas,semana);
  const resolucoes=conflitos.length?await escolherVersoesImportacaoPix(conflitos):{};
  if(resolucoes===null){status('Comparação cancelada. O lote foi mantido para revisão; nenhum dado foi gravado.');return;}
  fase='gravacao';atualizarAcoes();status('Validando as escolhas e salvando a importação…');
  r=await window.confirmarImportacaoPix(linhas,semana,{resolucoes,exigirConferencia:true,arquivos:arquivosImportacao});
  salvo=true;painelMiniaturas?.limpar();arquivosImportacao=[];npsDocs.forEach(d=>{if(d.preview)URL.revokeObjectURL(d.preview);});npsDocs=[];$('#pin-arquivos').value='';$('#pin-nps-arquivos').value='';$('#pin-nps-geral-arquivos').value='';
 }catch(e){
  const mensagem=e.message||'Não foi possível confirmar a importação. A lista foi mantida para revisão.';
  status(mensagem,true);
  await informeImportacao(mensagem,{tipo:'error',titulo:'Não foi possível concluir a importação'});
  return;
 }finally{ocupado=false;fase='';atualizarAcoes();}
 const resumo=`${r.quantidade} lançamento(s) importado(s): ${r.novos} novo(s), ${r.atualizados} atualizado(s) e ${r.mantidos||0} mantido(s) sem alteração.`;
 status(resumo);$('#pixImportacaoNova').hidden=true;
 // A navegação ocorre assim que a gravação é confirmada; a atualização da lista não atrasa o aviso.
 let navegacao=Promise.resolve('');
 try{
  if(typeof window.abrirVisaoGeralImportacaoPix==='function')navegacao=Promise.resolve(window.abrirVisaoGeralImportacaoPix(competencia)).then(()=>'',()=> 'Os dados foram salvos, mas a Visão geral não atualizou. Recarregue a página.');
  else document.querySelector('.pix-menu-btn[data-pix-view="dashboard"]')?.click();
 }catch{navegacao=Promise.resolve('Os dados foram salvos. Abra a Visão geral pelo menu lateral.');}
 await informeImportacao(`${resumo}\nCompetência: ${competencia.slice(5)}/${competencia.slice(0,4)} · Semana ${semana}.\n${r.aviso||(r.quantidade?'Os dados foram salvos. Acompanhe os resultados na Visão geral.':'Os lançamentos existentes foram mantidos. Nenhum dado foi substituído.')}`,{titulo:r.quantidade?'Importação realizada com sucesso!':'Conferência concluída · lançamentos mantidos'});
 const aviso=await navegacao;
 if(aviso)await informeImportacao(aviso,{tipo:'warning',titulo:'Importação salva · atualização pendente'});
}
async function importarNps(files,geral=false){
 if(geral&&Number($('#pin-semana').value)!==4){status('O painel de NPS geral é exclusivo da Semana 4.',true);return;}
 if(ocupado||salvo||!files.length)return;
 if(!resultado||!base){status('Selecione primeiro os PDFs dos lançamentos para definir a competência e os colaboradores.',true);$('#pin-nps-arquivos').value='';return;}
 if(files.length>12){status('Selecione até 12 imagens por vez.',true);return;}
 miniaturasPix().selecionar(files,geral?'geral':'nps');
 ocupado=true;fase='leitura-nps';const token=geracao;atualizarAcoes();$('#pin-conferido').checked=false;$('#pin-nps-conferido').checked=false;
 try{
  const novos=[];for(const file of files){const d=await (geral?lerImagemNpsGeral(file,resultado.periodo.inicio.slice(0,7),4,t=>{if(token===geracao)$('#pin-nps-status').textContent=t;}):lerImagemNps(file,resultado.periodo.inicio.slice(0,7),t=>{if(token===geracao)$('#pin-nps-status').textContent=t;}));if(token!==geracao)return;novos.push(d);miniaturasPix().atualizar(file.name,geral?'geral':'nps',{estado:'pronto',tipo:geral?'NPS geral · S4':'NPS dos consultores'});}
  arquivosImportacao.push(...files.filter(f=>!arquivosImportacao.some(a=>a.name===f.name)));
  npsDocs.push(...novos);recalcular();$('#pin-nps-status').textContent='Leitura concluída. Confira os nomes e os percentuais; corrija qualquer valor antes de confirmar.';
 }catch(e){if(token===geracao){files.forEach(f=>miniaturasPix().atualizar(f.name,geral?'geral':'nps',{estado:'erro'}));$('#pin-nps-status').textContent=e.message;}}finally{if(token===geracao){ocupado=false;fase='';atualizarAcoes();}}
}
function renderNps(){
 const target=$('#pin-nps-previa');
 if(!npsLidos.length){target.replaceChildren();return;}
 const filiais=[...new Set(base.participantes.map(p=>p.filial))];
 const tabela=rows=>`<div class="pin-table-wrap"><table><thead><tr><th>Nome / unidade</th><th>Meta (%)</th><th>Realizado (%)</th><th>Vínculo / conferência</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${esc(r.nomeCadastro||r.nome)}</strong><small>${esc(r.filial||r.dn||'Unidade não identificada')}</small><small>${esc(r.arquivo)}</small></td><td><input aria-label="Meta NPS de ${esc(r.nome)}" type="number" min="-100" max="100" step="0.01" data-pin-nps-linha="${r.key}" data-pin-nps-campo="meta" value="${r.meta??''}"></td><td><input aria-label="Realizado NPS de ${esc(r.nome)}" type="number" min="-100" max="100" step="0.01" data-pin-nps-linha="${r.key}" data-pin-nps-campo="realizado" value="${r.realizado??''}"></td><td>${r.geral?`<small>S4 · ${esc(r.filiais?.join(' / ')||'Vincule a unidade abaixo')}</small>${!r.vinculado?`<select aria-label="Unidade do NPS geral" data-pin-nps-link="${r.key}"><option value="">Selecione a unidade</option>${filiais.map(f=>`<option value="${esc(f)}">${esc(f)}</option>`).join('')}</select>`:''}${(r.filiais||[]).map(f=>`<button type="button" class="pin-review" data-pin-nps-geral="${r.key}" data-pin-nps-filial="${esc(f)}" ${!r.vinculado||r.erro?'disabled':''}>Conferir NPS geral · ${esc(f)}</button>`).join('')}<small>Revisão oficial do fechamento S4. Mantém a proteção já existente.</small>`:`<select aria-label="Colaborador do NPS" data-pin-nps-link="${r.key}"><option value="">Selecione o colaborador</option>${base.participantes.map(p=>`<option ${String(p.id)===String(r.funcionarioId)?'selected':''} value="${esc(p.id)}">${esc(p.nome)} · ${esc(p.filial)}${p.usaNps?'':' · sem NPS'}</option>`).join('')}</select><small>${esc(r.motivo||'Nome vinculado ao cadastro')}</small>`}${r.erro?`<small class="pin-pending">${esc(r.erro)}</small>`:''}</td></tr>`).join('')}</tbody></table></div>`;
 const individuais=npsLidos.filter(r=>!r.geral),gerais=npsLidos.filter(r=>r.geral);
 target.innerHTML=(individuais.length?'<h3>NPS individual dos consultores</h3>'+tabela(individuais):'')+(gerais.length?'<h3>NPS geral das unidades · fechamento S4</h3>'+tabela(gerais):'')+'<p class="pin-nps-help">O TOTAL da imagem dos consultores é desconsiderado. O NPS geral usa exclusivamente o painel por unidade, na Semana 4. Somente cargos com bônus de NPS recebem esses indicadores.</p>';
}
function iniciar(){
 const container=$('#pix-lancamentos .panel');if(!container||$('#pixImportacaoNova'))return;
 const button=document.createElement('button');button.id='btnPixImportacaoNova';button.type='button';button.className='pin-launch';button.innerHTML='<span class="pin-launch-icon" aria-hidden="true">↥</span><span>Importar lançamentos</span>';button.onclick=abrir;$('#pixLancamentosAcoes').prepend(button);
 const area=document.createElement('section');area.id='pixImportacaoNova';area.className='pin-panel';area.hidden=true;area.setAttribute('aria-label','Importação de lançamentos PIX');
 area.innerHTML=`<header class="pin-heading"><div><span class="pin-eyebrow">PIX DO PRESIDENTE</span><h2>Importar lançamentos</h2><p>Selecione os PDFs, revise os colaboradores e confirme.</p></div><button type="button" id="pin-fechar" class="pin-close" aria-label="Cancelar e fechar importação">×</button></header><div class="pin-body"><div class="pin-upload-grid"><label class="pin-upload"><strong>Relatórios de técnicos e balcão</strong><span>PDFs do mesmo dia · até 15 MB por arquivo</span><span class="pin-picker"><span class="pin-picker-button">Selecionar PDFs</span><span id="pin-pdf-resumo" class="pin-picker-summary" role="status">Adicione os relatórios em PDF</span><input id="pin-arquivos" class="pin-file-input" aria-label="Selecionar relatórios PDF" type="file" accept="application/pdf,.pdf" multiple></span></label><div class="pin-settings"><label>Data dos lançamentos<input id="pin-data" type="date" required aria-describedby="pin-data-ajuda"></label><small id="pin-data-ajuda">Meta e realizado serão preenchidos somente neste dia. Os outros dias serão preservados. Ticket, margem e NPS valem para a semana inteira.</small><label>Semana da campanha<select id="pin-semana"><option value="">Selecione</option><option value="1">Semana 1</option><option value="2">Semana 2</option><option value="3">Semana 3</option><option value="4">Semana 4</option></select></label><button type="button" id="pin-limpar" class="secondary">Trocar documentos</button></div></div><div id="pin-arquivos-lista" class="pin-attachments" aria-label="Relatórios PDF selecionados"></div><p id="pin-status" role="status" aria-live="polite">Selecione os PDFs e escolha a semana. Depois, revise a lista e confirme.</p><section class="pin-nps"><div class="pin-nps-top"><label><strong>NPS dos consultores · opcional</strong><small>Meta do mês e resultado individual. A linha TOTAL deste print é ignorada.</small><span class="pin-picker"><span class="pin-picker-button">Selecionar imagens</span><span id="pin-nps-resumo" class="pin-picker-summary" role="status">Adicione uma imagem de NPS</span><input id="pin-nps-arquivos" class="pin-file-input" aria-label="Selecionar imagens de NPS dos consultores" type="file" accept="image/png,image/jpeg,image/webp" multiple></span></label><button type="button" id="pin-nps-limpar" class="pin-cancel">Remover NPS</button></div><div id="pin-nps-miniaturas" class="pin-attachments" aria-label="Imagens de NPS selecionadas"></div><p id="pin-nps-status" role="status" aria-live="polite">Use a imagem com a meta e o resultado do mês da importação.</p><div id="pin-nps-geral-area" hidden><label><strong>NPS geral das unidades · somente S4</strong><small>Envie o painel NPS POR UNIDADE. Serão lidas as colunas META e REALIZ. O total dos consultores não substitui este painel.</small><span class="pin-picker"><span class="pin-picker-button">Selecionar painel</span><span id="pin-geral-resumo" class="pin-picker-summary" role="status">Adicione uma imagem de NPS</span><input id="pin-nps-geral-arquivos" class="pin-file-input" aria-label="Selecionar painel NPS por unidade" type="file" accept="image/png,image/jpeg,image/webp" multiple></span></label><div id="pin-nps-geral-miniaturas" class="pin-attachments" aria-label="Painéis de NPS selecionados"></div></div><div id="pin-nps-salvo" class="pin-nps-saved" role="status" aria-live="polite" hidden></div><div id="pin-nps-previa"></div><label class="pin-nps-check"><input type="checkbox" id="pin-nps-conferido"> Conferi os nomes, as filiais e os percentuais extraídos da imagem.</label></section><div id="pin-indicadores" class="pin-summary"></div><div id="pin-pendencias"></div><div id="pin-resultados"></div><div id="pin-removidos"></div><footer class="pin-footer"><div class="pin-checks"><label for="pin-conferido"><input id="pin-conferido" type="checkbox" aria-describedby="pin-conferido-ajuda"><span class="pin-check-copy"><strong>Conferi a lista e quero continuar a importação</strong><span id="pin-conferido-ajuda">Obrigatório. Marque depois de conferir os nomes, as filiais, as metas e os valores. Se já houver lançamento, você verá as duas versões para escolher qual manter antes de gravar.</span></span></label><small>Remover afeta só este lote e recalcula os totais. Cadastros e registros anteriores não são excluídos. Sem imagem de NPS, os valores de NPS existentes são preservados. Somente valores diferentes do mesmo dia ou dos indicadores semanais exigem comparação. Arquivos descartados e duplicados não são enviados ao armazenamento.</small></div><div class="pin-actions"><button type="button" id="pin-cancelar" class="pin-cancel">Cancelar importação</button><button type="button" id="pin-confirmar" class="pin-confirm" disabled>Confirmar importação</button></div></footer></div>`;
 container.querySelector('.panel-header').after(area);
 $('#pin-nps-arquivos').onchange=e=>importarNps([...e.target.files]);
 $('#pin-nps-geral-arquivos').onchange=e=>importarNps([...e.target.files],true);
 $('#pin-nps-limpar').onclick=()=>{if(ocupado||salvo)return;painelMiniaturas?.removerGrupo('nps');painelMiniaturas?.removerGrupo('geral');$('#pin-nps-geral-arquivos').value='';npsDocs.forEach(d=>{if(d.preview)URL.revokeObjectURL(d.preview);});npsDocs=[];arquivosImportacao=arquivosImportacao.filter(f=>/\.pdf$/i.test(f.name));npsLinks={};$('#pin-nps-conferido').checked=false;$('#pin-nps-arquivos').value='';$('#pin-nps-status').textContent='Imagem removida. O NPS salvo será preservado.';if(resultado)recalcular();};
 $('#pin-fechar').onclick=cancelar;$('#pin-cancelar').onclick=cancelar;$('#pin-confirmar').onclick=confirmar;
 $('#pin-limpar').onclick=()=>{if(!ocupado){$('#pin-arquivos').value='';$('#pin-arquivos').click();}};$('#pin-arquivos').onchange=e=>importar([...e.target.files]);
 area.addEventListener('change',e=>{if(ocupado||salvo)return;
 if(e.target.dataset.pinNpsLink){npsLinks[e.target.dataset.pinNpsLink]=e.target.value;$('#pin-nps-conferido').checked=false;recalcular();return;}
 if(e.target.dataset.pinNpsCampo){const [di,ri]=e.target.dataset.pinNpsLinha.split(':').map(Number);const r=npsDocs[di].linhas[ri];r[e.target.dataset.pinNpsCampo]=percentualNpsImportacao(e.target.value);r.erro=r.meta==null||r.realizado==null?'Confira os percentuais.':'';$('#pin-nps-conferido').checked=false;recalcular();return;}
 const key=e.target.dataset.pinVinculo;if(key){vinculos[key]=e.target.value;try{recalcular();}catch(err){status(err.message,true);}}else {if(['pin-semana','pin-data'].includes(e.target.id)){$('#pin-conferido').checked=false;$('#pin-nps-conferido').checked=false;if(resultado){recalcular();return;}}atualizarAcoes();}});
 area.addEventListener('click',e=>{
  const geral=e.target.closest('[data-pin-nps-geral]');if(geral&&!ocupado){const r=npsLidos.find(r=>r.key===geral.dataset.pinNpsGeral);if(r&&r.vinculado&&!r.erro){if(typeof window.conferirNpsFilialImportacao!=='function'){status('Atualize a página para abrir a conferência do NPS geral.',true);return;}Promise.resolve(window.conferirNpsFilialImportacao({filial:geral.dataset.pinNpsFilial||r.filial,competencia:r.competencia,meta:r.meta,realizado:r.realizado,semana:Number($('#pin-semana').value),origem:r.origem})).catch(e=>status(e.message,true));}return;}
  if(ocupado||salvo)return;
  const remove=e.target.closest('[data-pin-remover]'),restore=e.target.closest('[data-pin-restaurar]');
  if(remove){const id=remove.dataset.pinRemover;const p=base.participantes.find(p=>String(p.id)===id);excluidos.add(id);if(p&&cargoTipo(p.cargo)==='gerente')base.participantes.filter(x=>cargoTipo(x.cargo)==='gerente'&&normalizar(x.nome)===normalizar(p.nome)).forEach(x=>excluidos.add(String(x.id)));recalcular();}
  if(restore){excluidos.delete(restore.dataset.pinRestaurar);recalcular();}
 });
 atualizarAcoes();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
