import {lerImagemNps,lerImagemNpsGeral} from './pix-importacao-nps-imagem.js?v=20261116-s4geral2';
import {vincularNps,aplicarNpsImportacao,percentualNpsImportacao} from './pix-importacao-nps-core.js?v=20261116-s4geral2';
import {analisarPaginas,consolidar,cargoTipo,normalizar} from './pix-importacao-core.js?v=20261116-confirmar2';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const moeda=n=>n==null?'—':n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
let documentos=[],base=null,resultado=null,vinculos={},excluidos=new Set(),ocupado=false,salvo=false,geracao=0,fase='',pdfPromise,npsDocs=[],npsLinks={},npsLidos=[];
const npsAtivos=()=>npsDocs.filter(d=>d.tipo!=='geral'||Number($('#pin-semana').value)===4);
const aptos=()=>resultado?.linhas.filter(r=>r.completo)||[];
function status(texto,erro=false){const el=$('#pin-status');el.textContent=texto;el.classList.toggle('pin-error',erro);}
function atualizarAcoes(){
 const pronto=aptos().length>0;
 $('#pin-confirmar').textContent=salvo?'Importação concluída':`Confirmar importação${pronto?' · '+aptos().length:''}`;
 $('#pin-confirmar').disabled=ocupado||salvo||!pronto||!$('#pin-semana').value||!$('#pin-conferido').checked||(npsAtivos().length>0&&!$('#pin-nps-conferido').checked);
 $('#pin-cancelar').textContent=salvo?'Fechar':'Cancelar importação';
 $('#pin-arquivos').disabled=ocupado;$('#pin-semana').disabled=ocupado||salvo;$('#pin-conferido').disabled=ocupado||salvo;$('#pin-atualizar').disabled=ocupado||salvo;$('#pin-limpar').disabled=ocupado;$('#pin-cancelar').disabled=ocupado&&fase==='gravacao';$('#pin-fechar').disabled=ocupado&&fase==='gravacao';
 $('#pin-nps-geral-area').hidden=Number($('#pin-semana').value)!==4;$('#pin-nps-geral-arquivos').disabled=ocupado||salvo;
 $('#pin-nps-arquivos').disabled=ocupado||salvo;$('#pin-nps-limpar').disabled=ocupado||salvo;$('#pin-nps-conferido').disabled=ocupado||salvo;
 $('#pin-nps-previa').querySelectorAll('input,select').forEach(b=>b.disabled=ocupado||salvo);
 $('#pin-resultados').querySelectorAll('button,select').forEach(b=>b.disabled=ocupado||salvo);
 $('#pin-pendencias').querySelectorAll('select').forEach(b=>b.disabled=ocupado||salvo);
 $('#pin-removidos').querySelectorAll('button').forEach(b=>b.disabled=ocupado||salvo);
}
function abrir(){const panel=$('#pixImportacaoNova');panel.hidden=false;$('#pin-arquivos').focus();panel.scrollIntoView({behavior:'smooth',block:'start'});}
function limpar(){
 geracao++;documentos=[];resultado=null;vinculos={};excluidos=new Set();salvo=false;
 npsDocs.forEach(d=>{if(d.preview)URL.revokeObjectURL(d.preview);});npsDocs=[];npsLinks={};npsLidos=[];$('#pin-nps-arquivos').value='';$('#pin-nps-geral-arquivos').value='';$('#pin-nps-conferido').checked=false;$('#pin-nps-previa').replaceChildren();$('#pin-nps-status').textContent='Use a imagem com a meta e o resultado do mês da importação.';
 $('#pin-arquivos').value='';$('#pin-conferido').checked=false;$('#pin-atualizar').checked=false;
 for(const id of ['pin-arquivos-lista','pin-resultados','pin-pendencias','pin-indicadores','pin-removidos'])$('#'+id).replaceChildren();
 $('#pixImportacaoNova').classList.remove('pin-has-data');
 status('Selecione os PDFs e escolha a semana. Depois, revise a lista e confirme.');atualizarAcoes();
}
async function cancelar(){
 if(ocupado&&fase==='gravacao')return;
 ocupado=false;fase='';$('#pin-semana').value='';limpar();$('#pixImportacaoNova').hidden=true;$('#btnPixImportacaoNova').focus();
}

async function leitor(){
 if(!pdfPromise)pdfPromise=import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs').then(p=>{p.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';return p;}).catch(()=>{pdfPromise=null;throw Error('Não foi possível carregar o leitor de PDF. Verifique a conexão e tente novamente.');});
 return pdfPromise;
}
async function ler(file){
 if(!/\.pdf$/i.test(file.name)||file.size>15*1024*1024)throw Error('Selecione PDFs de até 15 MB por arquivo.');
 const pdfjs=await leitor(),task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});
 try{const pdf=await task.promise;if(pdf.numPages>60)throw Error('Use relatórios com até 60 páginas.');const paginas=[];for(let n=1;n<=pdf.numPages;n++)paginas.push(await(await pdf.getPage(n)).getTextContent());return analisarPaginas(paginas,file.name);}finally{await task.destroy();}
}
async function importar(files){
 if(ocupado||!files.length)return;
 if(files.length>30){status('Importe até 30 documentos por vez.',true);return;}
 if(window.bloqueioLancamentos?.bloqueado||document.body.classList.contains('lancamentos-bloqueados')){status('Os lançamentos estão bloqueados pelo diretor.',true);return;}
 // A seleção de arquivos já está capturada; limpar não perde o lote recebido.
 limpar();ocupado=true;fase='leitura';const token=geracao;atualizarAcoes();
 try{
  status('Atualizando o cadastro…');if(!window.obterBaseImportacaoPix)throw Error('Aguarde o carregamento do PIX e tente novamente.');const novaBase=await window.obterBaseImportacaoPix();if(token!==geracao)return;base=novaBase;
  const novos=[];for(let i=0;i<files.length;i++){status(`Lendo ${i+1}/${files.length} · ${files[i].name}`);novos.push(await ler(files[i]));if(token!==geracao)return;}
  if(token!==geracao)return;documentos=novos;recalcular();
  $('#pin-arquivos-lista').innerHTML=documentos.map(d=>`<span class="pin-file">${d.tipo==='tecnico'?'Técnicos':'Balcão'} · ${esc(d.arquivo)}</span>`).join('');
  $('#pixImportacaoNova').classList.add('pin-has-data');
 }catch(e){if(token===geracao){documentos=[];resultado=null;status(e.message||'Falha na leitura.',true);}}finally{if(token===geracao){ocupado=false;fase='';atualizarAcoes();}}
}
function recalcular(){
 salvo=false;$('#pin-conferido').checked=false;
 resultado=consolidar(documentos,base.participantes,base.nucleos,vinculos,excluidos);
 npsLidos=vincularNps(npsDocs,base.participantes,npsLinks).filter(r=>!r.geral||Number($('#pin-semana').value)===4);
 resultado.linhas=aplicarNpsImportacao(resultado.linhas,npsLidos,base.participantes,{semana:Number($('#pin-semana').value)});
 const {linhas,pendencias,ignorados,periodo}=resultado;
 renderNps();
 const parciais=linhas.filter(r=>!r.completo),prontos=aptos();
 $('#pin-indicadores').innerHTML=`<strong>${esc(periodo.inicio.split('-').reverse().join('/'))}${periodo.inicio===periodo.fim?'':' a '+esc(periodo.fim.split('-').reverse().join('/'))}</strong><span>${prontos.length} para importar</span><span>${parciais.length} parciais · não serão importados</span>${pendencias.length?`<span>${pendencias.length} vínculo(s) pendente(s)</span>`:''}`;
 $('#pin-pendencias').innerHTML=pendencias.length?`<details open><summary>${pendencias.length} nome(s) sem vínculo</summary><div class="pin-links">${pendencias.map(r=>`<label><strong>${esc(r.nome)}</strong><small>${esc(r.motivo)}</small><select data-pin-vinculo="${esc(r.key)}"><option value="">Selecionar cadastro…</option><option value="__ignorar__">Não participa da campanha</option>${base.participantes.filter(p=>cargoTipo(p.cargo)===r.tipo).map(p=>`<option value="${esc(p.id)}">${esc(p.nome)} · ${esc(p.filial)}</option>`).join('')}</select></label>`).join('')}</div></details>`:'';
 const semBase=linhas.filter(r=>!r.completo&&!r.fontes.length);
 const grupos=[['Individual','Consultores'],['Consolidado','Supervisão e gerência']];
 $('#pin-resultados').innerHTML=grupos.map(([tipo,titulo])=>{
  const rows=linhas.map((r,i)=>({...r,index:i})).filter(r=>r.origem===tipo&&(r.completo||r.fontes.length));
  if(!rows.length)return '';
  return `<section class="pin-group"><h3>${titulo}</h3><div class="pin-table-wrap"><table><thead><tr><th>Colaborador / filial</th><th>Meta</th><th>Realizado</th><th>Ticket / margem</th><th>NPS</th><th>Ações</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.completo?'':'pin-row-partial'}"><td><strong>${esc(r.nome)}</strong><small>${esc(r.cargo)} · ${esc(r.nucleoFiliais?.length?r.nucleoFiliais.join(' / '):r.filial)}</small>${r.completo?'':`<small class="pin-pending">Não será importado · ${esc(r.motivo)}</small>`}<details><summary>Ver origem</summary>${r.fontes.map(f=>`<small>${esc(f)}</small>`).join('')}${r.arquivo?`<small>${esc(r.arquivo)} · página ${r.pagina}</small>`:''}</details></td><td>${moeda(r.meta)}</td><td>${moeda(r.realizado)}</td><td>${r.ticket==null?'':`<span>${moeda(r.ticket)}</span>`}${r.margem==null?'':`<span>${r.margem.toLocaleString('pt-BR',{minimumFractionDigits:2})}%</span>`}</td><td>${r.npsImportado?`<strong>${r.npsImportado.meta.toLocaleString('pt-BR')}% → ${r.npsImportado.realizado.toLocaleString('pt-BR')}%</strong><small>${esc(r.npsStatus)}</small>`:`<small>${esc(r.npsStatus)}</small>`}</td><td><button type="button" class="pin-remove" data-pin-remover="${esc(r.funcionarioId)}" aria-label="Remover ${esc(r.nome)} da importação">Remover</button></td></tr>`).join('')}</tbody></table></div></section>`;
 }).join('')+(semBase.length?`<details class="pin-excluded"><summary>${semBase.length} função(ões) aguardando relatórios · não serão importadas</summary>${semBase.map(r=>`<p><strong>${esc(r.nome)}</strong> · ${esc(r.cargo)}<br>${esc(r.motivo)} <button type="button" class="pin-remove" data-pin-remover="${esc(r.funcionarioId)}">Remover</button></p>`).join('')}</details>`:'')+(ignorados.length?`<details class="pin-excluded"><summary>${ignorados.length} linha(s) fora da importação</summary>${ignorados.map(r=>`<p>${esc(r.nome)} · ${esc(r.motivo)}</p>`).join('')}</details>`:'');
 $('#pin-removidos').innerHTML=excluidos.size?`<details><summary>${excluidos.size} colaborador(es) removido(s) · desfazer</summary><div class="pin-restore-list">${[...excluidos].map(id=>`<span>${esc(base.participantes.find(p=>String(p.id)===id)?.nome||id)} <button type="button" class="pin-review" data-pin-restaurar="${esc(id)}">Restaurar</button></span>`).join('')}</div></details>`:'';
 status(prontos.length?'Revise a lista, remova quem não deve entrar e confirme a importação.':'Nenhum lançamento apto. Confira os vínculos e os relatórios dos setores/filiais pendentes.',!prontos.length);
 atualizarAcoes();
}
async function confirmar(){
 if(ocupado||salvo)return;
 if(!$('#pin-conferido').checked||!$('#pin-semana').value||!aptos().length||(npsAtivos().length>0&&!$('#pin-nps-conferido').checked)){status('Escolha a semana e marque a conferência da lista e do NPS, se houver imagem.',true);return;}
 if(!window.confirmarImportacaoPix){status('Atualize a página para carregar a confirmação da importação.',true);return;}
 ocupado=true;fase='gravacao';atualizarAcoes();
 try{
  status('Validando e salvando a importação…');
  const r=await window.confirmarImportacaoPix(aptos(),Number($('#pin-semana').value),{atualizar:$('#pin-atualizar').checked});
  salvo=true;
  status(`${r.quantidade} lançamento(s) importado(s): ${r.novos} novo(s), ${r.atualizados} atualizado(s). ${r.aviso||(npsAtivos().length?'NPS da imagem aplicado aos cargos elegíveis; os demais campos foram preservados.':'NPS e demais campos foram preservados. Complete os indicadores que ainda faltam em Lançamentos.')}`);
 }catch(e){status(e.message||'Não foi possível confirmar a importação. A lista foi mantida para revisão.',true);}finally{ocupado=false;fase='';atualizarAcoes();}
}
async function importarNps(files,geral=false){
 if(geral&&Number($('#pin-semana').value)!==4){status('O painel de NPS geral é exclusivo da Semana 4.',true);return;}
 if(ocupado||salvo||!files.length)return;
 if(!resultado||!base){status('Selecione primeiro os PDFs dos lançamentos para definir a competência e os colaboradores.',true);$('#pin-nps-arquivos').value='';return;}
 if(files.length>12){status('Selecione até 12 imagens por vez.',true);return;}
 ocupado=true;fase='leitura-nps';const token=geracao;atualizarAcoes();$('#pin-conferido').checked=false;$('#pin-nps-conferido').checked=false;
 try{
  const novos=[];for(const file of files){const d=await (geral?lerImagemNpsGeral(file,resultado.periodo.inicio.slice(0,7),4,t=>{if(token===geracao)$('#pin-nps-status').textContent=t;}):lerImagemNps(file,resultado.periodo.inicio.slice(0,7),t=>{if(token===geracao)$('#pin-nps-status').textContent=t;}));if(token!==geracao)return;novos.push(d);}
  npsDocs.push(...novos);recalcular();$('#pin-nps-status').textContent='Leitura concluída. Confira os nomes e os percentuais; corrija qualquer valor antes de confirmar.';
 }catch(e){if(token===geracao)$('#pin-nps-status').textContent=e.message;}finally{if(token===geracao){ocupado=false;fase='';atualizarAcoes();}}
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
 area.innerHTML=`<header class="pin-heading"><div><span class="pin-eyebrow">PIX DO PRESIDENTE</span><h2>Importar lançamentos</h2><p>Selecione os PDFs, revise os colaboradores e confirme.</p></div><button type="button" id="pin-fechar" class="pin-close" aria-label="Cancelar e fechar importação">×</button></header><div class="pin-body"><div class="pin-upload-grid"><label class="pin-upload"><strong>Relatórios de técnicos e balcão</strong><span>PDFs do mesmo dia · até 15 MB por arquivo</span><input id="pin-arquivos" type="file" accept="application/pdf,.pdf" multiple></label><div class="pin-settings"><label>Semana da campanha<select id="pin-semana"><option value="">Selecione</option><option value="1">Semana 1</option><option value="2">Semana 2</option><option value="3">Semana 3</option><option value="4">Semana 4</option></select></label><button type="button" id="pin-limpar" class="secondary">Trocar documentos</button></div></div><div id="pin-arquivos-lista" class="pin-files"></div><p id="pin-status" role="status" aria-live="polite">Selecione os PDFs e escolha a semana. Depois, revise a lista e confirme.</p><section class="pin-nps"><div class="pin-nps-top"><label><strong>NPS dos consultores · opcional</strong><small>Meta do mês e resultado individual. A linha TOTAL deste print é ignorada.</small><input id="pin-nps-arquivos" type="file" accept="image/png,image/jpeg,image/webp" multiple></label><button type="button" id="pin-nps-limpar" class="pin-cancel">Remover NPS</button></div><p id="pin-nps-status" role="status" aria-live="polite">Use a imagem com a meta e o resultado do mês da importação.</p><div id="pin-nps-geral-area" hidden><label><strong>NPS geral das unidades · somente S4</strong><small>Envie o painel NPS POR UNIDADE. Serão lidas as colunas META e REALIZ. O total dos consultores não substitui este painel.</small><input id="pin-nps-geral-arquivos" type="file" accept="image/png,image/jpeg,image/webp" multiple></label></div><div id="pin-nps-previa"></div><label class="pin-nps-check"><input type="checkbox" id="pin-nps-conferido"> Conferi os nomes, as filiais e os percentuais extraídos da imagem.</label></section><div id="pin-indicadores" class="pin-summary"></div><div id="pin-pendencias"></div><div id="pin-resultados"></div><div id="pin-removidos"></div><footer class="pin-footer"><div class="pin-checks"><label for="pin-conferido"><input id="pin-conferido" type="checkbox" aria-describedby="pin-conferido-ajuda"><span class="pin-check-copy"><strong>Conferi a lista e quero importar estes lançamentos</strong><span id="pin-conferido-ajuda">Obrigatório. Marque depois de conferir os nomes, as filiais, as metas e os valores. Esta opção libera o botão “Confirmar importação”.</span></span></label><label for="pin-atualizar"><input id="pin-atualizar" type="checkbox" aria-describedby="pin-atualizar-ajuda"><span class="pin-check-copy"><strong>Atualizar os valores que já estão salvos neste mesmo dia</strong><span id="pin-atualizar-ajuda">Opcional. Marque somente se quiser corrigir um lançamento já salvo para a mesma data e semana, usando os valores destes PDFs. Os demais campos serão mantidos. O NPS só muda se você anexar e conferir uma imagem de NPS. Para um lançamento novo, deixe desmarcado.</span></span></label><small>Remover afeta só este lote e recalcula os totais. Cadastros e registros anteriores não são excluídos. Sem imagem de NPS, os valores de NPS existentes são preservados.</small></div><div class="pin-actions"><button type="button" id="pin-cancelar" class="pin-cancel">Cancelar importação</button><button type="button" id="pin-confirmar" class="pin-confirm" disabled>Confirmar importação</button></div></footer></div>`;
 container.querySelector('.panel-header').after(area);
 $('#pin-nps-arquivos').onchange=e=>importarNps([...e.target.files]);
 $('#pin-nps-geral-arquivos').onchange=e=>importarNps([...e.target.files],true);
 $('#pin-nps-limpar').onclick=()=>{if(ocupado||salvo)return;npsDocs.forEach(d=>{if(d.preview)URL.revokeObjectURL(d.preview);});npsDocs=[];npsLinks={};$('#pin-nps-conferido').checked=false;$('#pin-nps-arquivos').value='';$('#pin-nps-status').textContent='Imagem removida. O NPS salvo será preservado.';if(resultado)recalcular();};
 $('#pin-fechar').onclick=cancelar;$('#pin-cancelar').onclick=cancelar;$('#pin-confirmar').onclick=confirmar;
 $('#pin-limpar').onclick=()=>{if(!ocupado){$('#pin-arquivos').value='';$('#pin-arquivos').click();}};$('#pin-arquivos').onchange=e=>importar([...e.target.files]);
 area.addEventListener('change',e=>{if(ocupado||salvo)return;
 if(e.target.dataset.pinNpsLink){npsLinks[e.target.dataset.pinNpsLink]=e.target.value;$('#pin-nps-conferido').checked=false;recalcular();return;}
 if(e.target.dataset.pinNpsCampo){const [di,ri]=e.target.dataset.pinNpsLinha.split(':').map(Number);const r=npsDocs[di].linhas[ri];r[e.target.dataset.pinNpsCampo]=percentualNpsImportacao(e.target.value);r.erro=r.meta==null||r.realizado==null?'Confira os percentuais.':'';$('#pin-nps-conferido').checked=false;recalcular();return;}
 const key=e.target.dataset.pinVinculo;if(key){vinculos[key]=e.target.value;try{recalcular();}catch(err){status(err.message,true);}}else {if(e.target.id==='pin-semana'){$('#pin-conferido').checked=false;$('#pin-nps-conferido').checked=false;if(resultado){recalcular();return;}}atualizarAcoes();}});
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
