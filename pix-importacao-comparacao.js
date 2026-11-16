import {preverImportacaoDiariaPix} from './pix-importacao-diaria-core.js?v=20261116-diaria2';
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
export function renderizarComparacaoPix(c,escolha={}){
 const a=c.salvo,b=c.importacao,p=c.previa||preverImportacaoDiariaPix(b,a);
 const origemDia=a.importacoesPorDia?.[p.data]?.arquivos?.join(' · ')||fontesSalvas(a).join(' · ');
 const novos=b.arquivos?.join(' · ')||b.arquivo||'Consolidação dos relatórios selecionados';
 const cards=(grupo,titulo,salvo,novo,origem)=>`<h3>${titulo}</h3><div class="pic-versions">${[['manter','Manter informação salva',salvo,origem],['importar','Usar nova importação',novo,novos]].map(([v,t,valor,f])=>`<article class="pic-version"><label class="pic-choice"><input type="radio" name="pin-${grupo}" value="${v}" ${escolha?.[grupo]===v?'checked':''}><span><strong>${t}</strong><small>${valor}</small></span></label><p class="pic-origin">Origem: ${esc(f)}</p></article>`).join('')}</div>`;
 const diario=p.conflitoDia?cards('dia',`Valores do dia ${data(p.data)}`,`Meta: ${moeda(p.dia.meta)} · Realizado: ${moeda(p.dia.realizado)}`,`Meta: ${moeda(b.meta)} · Realizado: ${moeda(b.realizado)}`,origemDia):`<p>O dia ${data(p.data)} ${p.temDia?'já tem os mesmos valores; será preservado':'será acrescentado, sem alterar os outros dias'}.</p>`;
 const format=c=>c.campo==='ticketMedio'?moeda:pct;
 const semanal=p.conflitosSemanais.length?cards('semanais','Indicadores da semana inteira',p.alterados.map(c=>esc(c.rotulo)+': '+format(c)(a[c.campo])).join('<br>'),p.alterados.map(c=>esc(c.rotulo)+': '+format(c)(c.valor)).join('<br>'),[a.importacaoSemanal?.financeiro?.arquivos?.join(' · '),a.importacaoSemanal?.nps?.arquivo||a.importacaoPdf?.nps?.arquivo,origemDia].filter(Boolean).join(' · ')):'<p>Indicadores semanais iguais serão reutilizados. Informações ainda não preenchidas serão adicionadas.</p>';
 return `<div class="pic-person"><h3>${esc(b.nome)}</h3><p>${esc(b.cargo)} · ${esc(b.filial)} · S${c.semana}</p></div><p class="pic-warning">Os demais dias desta semana serão preservados. Escolha separadamente os valores do dia e os indicadores semanais.</p>${diario}${semanal}<p class="pic-help">O.S. e campos sem informação nova permanecem como estão. Não será criada uma cópia do lançamento.</p>`;
}

export function escolherVersoesImportacaoPix(conflitos){
 if(!conflitos.length)return Promise.resolve({});
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='pic-dialog';dialog.setAttribute('aria-labelledby','pic-title');
  dialog.innerHTML='<header class="pic-header"><div><span>PIX DO PRESIDENTE · CONFERÊNCIA</span><h2 id="pic-title">Este lançamento já existe</h2><p>Compare as duas versões e escolha qual deve ficar salva.</p></div><button type="button" class="pic-close" aria-label="Cancelar comparação">×</button></header><div class="pic-progress" aria-live="polite"></div><div class="pic-content"></div><footer class="pic-footer"><button type="button" class="pic-cancel">Cancelar revisão</button><div><button type="button" class="pic-back">Anterior</button><button type="button" class="pic-next">Próximo</button><button type="button" class="pic-finish">Aplicar escolhas e importar</button></div></footer>';
  document.body.appendChild(dialog);let index=0,encerrado=false;const escolhas={};
  const $=s=>dialog.querySelector(s);
  const completa=c=>{const p=c.previa||preverImportacaoDiariaPix(c.importacao,c.salvo),e=escolhas[c.chave];return !!e&&(!p.conflitoDia||!!e.dia)&&(!p.conflitosSemanais.length||!!e.semanais);};
  const concluir=valor=>{if(encerrado)return;encerrado=true;dialog.close();dialog.remove();resolve(valor);};
  function atualizar(){
   $('.pic-progress').textContent=`Registro ${index+1} de ${conflitos.length} · ${conflitos.filter(completa).length} de ${conflitos.length} escolhas feitas`;
   $('.pic-back').disabled=index===0;
   $('.pic-next').hidden=index===conflitos.length-1;$('.pic-next').disabled=!completa(conflitos[index]);
   $('.pic-finish').hidden=index!==conflitos.length-1;$('.pic-finish').disabled=conflitos.filter(completa).length!==conflitos.length;
  }
  function render(){const c=conflitos[index];$('.pic-content').innerHTML=renderizarComparacaoPix(c,escolhas[c.chave]);atualizar();}
  dialog.addEventListener('change',e=>{if(!['pin-dia','pin-semanais'].includes(e.target.name))return;const c=conflitos[index];escolhas[c.chave]={...escolhas[c.chave],[e.target.name.slice(4)]:e.target.value,registroId:c.salvo.id,assinatura:c.assinatura};atualizar();});
  dialog.addEventListener('cancel',e=>{e.preventDefault();concluir(null);});dialog.addEventListener('close',()=>concluir(null));
  $('.pic-close').onclick=$('.pic-cancel').onclick=()=>concluir(null);
  $('.pic-back').onclick=()=>{if(index>0){index--;render();$('.pic-content input')?.focus();}};
  $('.pic-next').onclick=()=>{if(completa(conflitos[index])&&index<conflitos.length-1){index++;render();$('.pic-content input')?.focus();}};
  $('.pic-finish').onclick=()=>{if(conflitos.filter(completa).length===conflitos.length)concluir(escolhas);};
  render();dialog.showModal();
 });
}
