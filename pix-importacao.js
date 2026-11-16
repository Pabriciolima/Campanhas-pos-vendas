import {analisarPaginas,consolidar,cargoTipo,normalizar} from './pix-importacao-core.js?v=20261116-confirmar2';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const moeda=n=>n==null?'—':n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
let documentos=[],base=null,resultado=null,vinculos={},excluidos=new Set(),ocupado=false,salvo=false,geracao=0,fase='',pdfPromise;
const aptos=()=>resultado?.linhas.filter(r=>r.completo)||[];
function status(texto,erro=false){const el=$('#pin-status');el.textContent=texto;el.classList.toggle('pin-error',erro);}
function atualizarAcoes(){
 const pronto=aptos().length>0;
 $('#pin-confirmar').textContent=salvo?'Importação concluída':`Confirmar importação${pronto?' · '+aptos().length:''}`;
 $('#pin-confirmar').disabled=ocupado||salvo||!pronto||!$('#pin-semana').value||!$('#pin-conferido').checked;
 $('#pin-cancelar').textContent=salvo?'Fechar':'Cancelar importação';
 $('#pin-arquivos').disabled=ocupado;$('#pin-semana').disabled=ocupado||salvo;$('#pin-conferido').disabled=ocupado||salvo;$('#pin-atualizar').disabled=ocupado||salvo;$('#pin-limpar').disabled=ocupado;$('#pin-cancelar').disabled=ocupado&&fase==='gravacao';$('#pin-fechar').disabled=ocupado&&fase==='gravacao';
 $('#pin-resultados').querySelectorAll('button,select').forEach(b=>b.disabled=ocupado||salvo);
 $('#pin-pendencias').querySelectorAll('select').forEach(b=>b.disabled=ocupado||salvo);
 $('#pin-removidos').querySelectorAll('button').forEach(b=>b.disabled=ocupado||salvo);
}
function abrir(){const panel=$('#pixImportacaoNova');panel.hidden=false;$('#pin-arquivos').focus();panel.scrollIntoView({behavior:'smooth',block:'start'});}
function limpar(){
 geracao++;documentos=[];resultado=null;vinculos={};excluidos=new Set();salvo=false;
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
 const {linhas,pendencias,ignorados,periodo}=resultado;
 const parciais=linhas.filter(r=>!r.completo),prontos=aptos();
 $('#pin-indicadores').innerHTML=`<strong>${esc(periodo.inicio.split('-').reverse().join('/'))}${periodo.inicio===periodo.fim?'':' a '+esc(periodo.fim.split('-').reverse().join('/'))}</strong><span>${prontos.length} para importar</span><span>${parciais.length} parciais · não serão importados</span>${pendencias.length?`<span>${pendencias.length} vínculo(s) pendente(s)</span>`:''}`;
 $('#pin-pendencias').innerHTML=pendencias.length?`<details open><summary>${pendencias.length} nome(s) sem vínculo</summary><div class="pin-links">${pendencias.map(r=>`<label><strong>${esc(r.nome)}</strong><small>${esc(r.motivo)}</small><select data-pin-vinculo="${esc(r.key)}"><option value="">Selecionar cadastro…</option><option value="__ignorar__">Não participa da campanha</option>${base.participantes.filter(p=>cargoTipo(p.cargo)===r.tipo).map(p=>`<option value="${esc(p.id)}">${esc(p.nome)} · ${esc(p.filial)}</option>`).join('')}</select></label>`).join('')}</div></details>`:'';
 const semBase=linhas.filter(r=>!r.completo&&!r.fontes.length);
 const grupos=[['Individual','Consultores'],['Consolidado','Supervisão e gerência']];
 $('#pin-resultados').innerHTML=grupos.map(([tipo,titulo])=>{
  const rows=linhas.map((r,i)=>({...r,index:i})).filter(r=>r.origem===tipo&&(r.completo||r.fontes.length));
  if(!rows.length)return '';
  return `<section class="pin-group"><h3>${titulo}</h3><div class="pin-table-wrap"><table><thead><tr><th>Colaborador / filial</th><th>Meta</th><th>Realizado</th><th>Ticket / margem</th><th>Ações</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.completo?'':'pin-row-partial'}"><td><strong>${esc(r.nome)}</strong><small>${esc(r.cargo)} · ${esc(r.nucleoFiliais?.length?r.nucleoFiliais.join(' / '):r.filial)}</small>${r.completo?'':`<small class="pin-pending">Não será importado · ${esc(r.motivo)}</small>`}<details><summary>Ver origem</summary>${r.fontes.map(f=>`<small>${esc(f)}</small>`).join('')}${r.arquivo?`<small>${esc(r.arquivo)} · página ${r.pagina}</small>`:''}</details></td><td>${moeda(r.meta)}</td><td>${moeda(r.realizado)}</td><td>${r.ticket==null?'':`<span>${moeda(r.ticket)}</span>`}${r.margem==null?'':`<span>${r.margem.toLocaleString('pt-BR',{minimumFractionDigits:2})}%</span>`}</td><td><button type="button" class="pin-remove" data-pin-remover="${esc(r.funcionarioId)}" aria-label="Remover ${esc(r.nome)} da importação">Remover</button></td></tr>`).join('')}</tbody></table></div></section>`;
 }).join('')+(semBase.length?`<details class="pin-excluded"><summary>${semBase.length} função(ões) aguardando relatórios · não serão importadas</summary>${semBase.map(r=>`<p><strong>${esc(r.nome)}</strong> · ${esc(r.cargo)}<br>${esc(r.motivo)} <button type="button" class="pin-remove" data-pin-remover="${esc(r.funcionarioId)}">Remover</button></p>`).join('')}</details>`:'')+(ignorados.length?`<details class="pin-excluded"><summary>${ignorados.length} linha(s) fora da importação</summary>${ignorados.map(r=>`<p>${esc(r.nome)} · ${esc(r.motivo)}</p>`).join('')}</details>`:'');
 $('#pin-removidos').innerHTML=excluidos.size?`<details><summary>${excluidos.size} colaborador(es) removido(s) · desfazer</summary><div class="pin-restore-list">${[...excluidos].map(id=>`<span>${esc(base.participantes.find(p=>String(p.id)===id)?.nome||id)} <button type="button" class="pin-review" data-pin-restaurar="${esc(id)}">Restaurar</button></span>`).join('')}</div></details>`:'';
 status(prontos.length?'Revise a lista, remova quem não deve entrar e confirme a importação.':'Nenhum lançamento apto. Confira os vínculos e os relatórios dos setores/filiais pendentes.',!prontos.length);
 atualizarAcoes();
}
async function confirmar(){
 if(ocupado||salvo)return;
 if(!$('#pin-conferido').checked||!$('#pin-semana').value||!aptos().length){status('Escolha a semana e marque que conferiu a lista.',true);return;}
 if(!window.confirmarImportacaoPix){status('Atualize a página para carregar a confirmação da importação.',true);return;}
 ocupado=true;fase='gravacao';atualizarAcoes();
 try{
  status('Validando e salvando a importação…');
  const r=await window.confirmarImportacaoPix(aptos(),Number($('#pin-semana').value),{atualizar:$('#pin-atualizar').checked});
  salvo=true;
  status(`${r.quantidade} lançamento(s) importado(s): ${r.novos} novo(s), ${r.atualizados} atualizado(s). ${r.aviso||'NPS e demais campos foram preservados. Complete os indicadores que ainda faltam em Lançamentos.'}`);
 }catch(e){status(e.message||'Não foi possível confirmar a importação. A lista foi mantida para revisão.',true);}finally{ocupado=false;fase='';atualizarAcoes();}
}
function iniciar(){
 const container=$('#pix-lancamentos .panel');if(!container||$('#pixImportacaoNova'))return;
 const button=document.createElement('button');button.id='btnPixImportacaoNova';button.type='button';button.className='pin-launch';button.innerHTML='<span class="pin-launch-icon" aria-hidden="true">↥</span><span>Importar lançamentos</span>';button.onclick=abrir;$('#pixLancamentosAcoes').prepend(button);
 const area=document.createElement('section');area.id='pixImportacaoNova';area.className='pin-panel';area.hidden=true;area.setAttribute('aria-label','Importação de lançamentos PIX');
 area.innerHTML=`<header class="pin-heading"><div><span class="pin-eyebrow">PIX DO PRESIDENTE</span><h2>Importar lançamentos</h2><p>Selecione os PDFs, revise os colaboradores e confirme.</p></div><button type="button" id="pin-fechar" class="pin-close" aria-label="Cancelar e fechar importação">×</button></header><div class="pin-body"><div class="pin-upload-grid"><label class="pin-upload"><strong>Relatórios de técnicos e balcão</strong><span>PDFs do mesmo dia · até 15 MB por arquivo</span><input id="pin-arquivos" type="file" accept="application/pdf,.pdf" multiple></label><div class="pin-settings"><label>Semana da campanha<select id="pin-semana"><option value="">Selecione</option><option value="1">Semana 1</option><option value="2">Semana 2</option><option value="3">Semana 3</option><option value="4">Semana 4</option></select></label><button type="button" id="pin-limpar" class="secondary">Trocar documentos</button></div></div><div id="pin-arquivos-lista" class="pin-files"></div><p id="pin-status" role="status" aria-live="polite">Selecione os PDFs e escolha a semana. Depois, revise a lista e confirme.</p><div id="pin-indicadores" class="pin-summary"></div><div id="pin-pendencias"></div><div id="pin-resultados"></div><div id="pin-removidos"></div><footer class="pin-footer"><div class="pin-checks"><label><input id="pin-conferido" type="checkbox"> Conferi os colaboradores, as filiais e os valores.</label><label><input id="pin-atualizar" type="checkbox"> Atualizar lançamentos já existentes deste mesmo dia.</label><small>Remover afeta só este lote e recalcula os totais. Cadastros e registros anteriores não são excluídos. NPS e demais campos existentes são preservados.</small></div><div class="pin-actions"><button type="button" id="pin-cancelar" class="pin-cancel">Cancelar importação</button><button type="button" id="pin-confirmar" class="pin-confirm" disabled>Confirmar importação</button></div></footer></div>`;
 container.querySelector('.panel-header').after(area);
 $('#pin-fechar').onclick=cancelar;$('#pin-cancelar').onclick=cancelar;$('#pin-confirmar').onclick=confirmar;
 $('#pin-limpar').onclick=()=>{if(!ocupado){$('#pin-arquivos').value='';$('#pin-arquivos').click();}};$('#pin-arquivos').onchange=e=>importar([...e.target.files]);
 area.addEventListener('change',e=>{if(ocupado||salvo)return;const key=e.target.dataset.pinVinculo;if(key){vinculos[key]=e.target.value;try{recalcular();}catch(err){status(err.message,true);}}else {if(['pin-semana','pin-atualizar'].includes(e.target.id))$('#pin-conferido').checked=false;atualizarAcoes();}});
 area.addEventListener('click',e=>{
  if(ocupado||salvo)return;
  const remove=e.target.closest('[data-pin-remover]'),restore=e.target.closest('[data-pin-restaurar]');
  if(remove){const id=remove.dataset.pinRemover;const p=base.participantes.find(p=>String(p.id)===id);excluidos.add(id);if(p&&cargoTipo(p.cargo)==='gerente')base.participantes.filter(x=>cargoTipo(x.cargo)==='gerente'&&normalizar(x.nome)===normalizar(p.nome)).forEach(x=>excluidos.add(String(x.id)));recalcular();}
  if(restore){excluidos.delete(restore.dataset.pinRestaurar);recalcular();}
 });
 atualizarAcoes();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
