import {carregarBlobPix,versaoArquivoPix,cancelarSeNecessario,compactarOcrPix,aguardarCancelavelPix} from './pix-exportacao-utils.js?v=20261103-perf1';
import {extrairImagemPix,compararImagensPix,filialOcrPix} from './pix-auditoria-imagens-core.js?v=20261103-missing1';
const VERSION='6.0.1',cache=new Map();const emAndamento=new Map();let fila=Promise.resolve(),biblioteca,execucaoAtual;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function carregarOcr(){
 if(!biblioteca)biblioteca=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=`https://cdn.jsdelivr.net/npm/tesseract.js@${VERSION}/dist/tesseract.min.js`;s.crossOrigin='anonymous';s.onload=()=>window.Tesseract?.createWorker?resolve(window.Tesseract):reject(new Error('OCR indisponível'));s.onerror=()=>{s.remove();biblioteca=null;reject(new Error('Não foi possível carregar o leitor de imagens. Verifique a conexão.'));};document.head.append(s);});return biblioteca;
}
function prazo(p,ms){let timer;return Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Tempo de leitura excedido')),ms);})]).finally(()=>clearTimeout(timer));}
function progresso(texto){const el=document.querySelector('#pixOcrProgresso');if(el)el.textContent=texto;}
async function preparar(blob){
 const bitmap=await createImageBitmap(blob);try{const scale=Math.min(2,2800/bitmap.width,2800/bitmap.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas;}finally{bitmap.close();}
}
async function hash(blob){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join('');}
async function executar(linhas,grupos,geracao,opcoes){
 const {signal,assets=new Map(),aoProgresso=()=>{}}=opcoes;cancelarSeNecessario(signal);const informar=t=>{if(signal?.aborted)return;progresso(t);aoProgresso(t);};
 const brutos=linhas.map(l=>({...l,...(l.auditoriaDados||{})}));
 const relevantes=grupos.filter(g=>brutos.some(r=>{if(g.competencia!==(r.competencia||r.origem)||Number(String(g.semana).replace(/\D/g,''))!==Number(String(r.semana).replace(/\D/g,'')))return false;const f=filialOcrPix(r.filial),gf=filialOcrPix(g.filial);return gf===f||(/GERENTE/i.test(r.cargo||'')&&((['TERESINA','URUCUI'].includes(f)&&['TERESINA','URUCUI'].includes(gf))||(r.auditoriaFonte?.unidades||[]).some(u=>filialOcrPix(u.filial)===gf)));}));
 const imagens=[];let worker;const total=relevantes.reduce((s,g)=>s+g.imagens.length,0);let n=0;
 try{
  for(const g of relevantes)for(const arquivo of g.imagens){n++;const contexto={...arquivo,competencia:g.competencia,semana:g.semana,filial:g.filial};informar(`Lendo evidência ${n} de ${total}: ${arquivo.nomeOriginal||arquivo.nome}`);
   try{
    cancelarSeNecessario(signal);const versao=versaoArquivoPix(arquivo);let data=versao?cache.get(versao):null;let blob,key=versao;
    if(!data){blob=await carregarBlobPix(arquivo,{signal,assets});key=versao||await hash(blob);data=cache.get(key);}
    if(!data){if(!worker){const t=await aguardarCancelavelPix(prazo(carregarOcr(),20000),signal);worker=await prazo(aguardarCancelavelPix(t.createWorker('por+eng',1,{workerPath:`https://cdn.jsdelivr.net/npm/tesseract.js@${VERSION}/dist/worker.min.js`,corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',logger:m=>{if(m.status==='recognizing text')informar(`Lendo evidência ${n}/${total} · ${Math.round((m.progress||0)*100)}%`);}}),signal,w=>w.terminate().catch(()=>{})),45000);await worker.setParameters({preserve_interword_spaces:'1',tessedit_pageseg_mode:'11'});}
     cancelarSeNecessario(signal);const canvas=await preparar(blob);const cancelar=()=>{worker?.terminate().catch(()=>{});};signal?.addEventListener('abort',cancelar,{once:true});let result;try{result=await prazo(aguardarCancelavelPix(worker.recognize(canvas,{}, {blocks:true}),signal),60000);}finally{signal?.removeEventListener('abort',cancelar);}cancelarSeNecessario(signal);data=compactarOcrPix(result.data);if(cache.size>=30)cache.delete(cache.keys().next().value);cache.set(key,data);canvas.width=canvas.height=1;
    }
    imagens.push(extrairImagemPix(data,contexto));
   }catch(e){if(worker){await worker.terminate().catch(()=>{});worker=null;}if(signal?.aborted||e.name==='AbortError')throw new DOMException('Operação cancelada.','AbortError');imagens.push({...contexto,erro:'Não foi possível ler esta imagem com segurança. Reenvie uma imagem nítida e confira a conexão.',registros:[],semanas:[],competencias:[]});}
  }
 }finally{if(worker)await worker.terminate().catch(()=>{});}
 cancelarSeNecessario(signal);const resultado=compararImagensPix(linhas,imagens);const mesmaTela=document.querySelector('#pixAuditoriaComparativa')?.dataset.ocrGeracao===geracao;const atualizou=window.aplicarResultadoAuditoriaPix?.(linhas,resultado);if(atualizou&&mesmaTela)geracao=document.querySelector('#pixAuditoriaComparativa')?.dataset.ocrGeracao;if(document.querySelector('#pixAuditoriaComparativa')?.dataset.ocrGeracao===geracao)mostrarResultadoPixImagens(resultado);progresso('Leitura concluída. Somente diferenças identificadas aparecem na comparação.');return resultado;
}
export function auditarImagensPix(linhas,grupos,opcoes={}){
 const chave=JSON.stringify([linhas,grupos]);if(emAndamento.has(chave))return emAndamento.get(chave);
 if(opcoes.prioridade==='impressao'&&execucaoAtual?.prioridade!=='impressao')execucaoAtual?.controller.abort();
 const controller=new AbortController(),abortar=()=>controller.abort();opcoes.signal?.addEventListener('abort',abortar,{once:true});if(opcoes.signal?.aborted)controller.abort();
 const geracao=document.querySelector('#pixAuditoriaComparativa')?.dataset.ocrGeracao;
 const tarefa=fila.then(async()=>{execucaoAtual={controller,prioridade:opcoes.prioridade};try{return await executar(linhas,grupos,geracao,{...opcoes,signal:controller.signal});}finally{execucaoAtual=null;}}).finally(()=>{emAndamento.delete(chave);opcoes.signal?.removeEventListener('abort',abortar);});
 emAndamento.set(chave,tarefa);fila=tarefa.catch(()=>{});return tarefa;
}
export function mostrarResultadoPixImagens(resultado){
 const painel=document.querySelector('#pixAuditoriaComparativa');if(!painel)return;let alvo=painel.querySelector('#pixOcrResultado');if(!alvo){alvo=document.createElement('div');alvo.id='pixOcrResultado';painel.append(alvo);}painel.open=true;
 alvo.innerHTML=`<p><strong>${resultado.divergencias.length} divergência(s)</strong> · ${resultado.comparacoes} campo(s) comparado(s) nas imagens.</p>${resultado.divergencias.length?`<div style="overflow:auto;max-width:100%"><table style="min-width:580px;width:100%;font-size:12px"><thead><tr><th>Colaborador / período</th><th>Diferença</th><th>Fonte</th></tr></thead><tbody>${resultado.divergencias.map(a=>`<tr><td>${esc(a.local)}</td><td style="color:var(--paf-alert-color,#b42332);padding:10px">${esc(a.ponto)}</td><td>${esc(a.fonte)}</td></tr>`).join('')}</tbody></table></div>`:'<p>Nenhuma divergência detectada nos campos que puderam ser lidos.</p>'}${resultado.revisoes.length?`<details><summary>${resultado.revisoes.length} leitura(s) a revisar</summary><p>Falhas de leitura não significam que os valores conferem.</p><ul>${resultado.revisoes.map(a=>`<li>${esc(a.nome)} / ${esc(a.filial)}: ${esc(a.motivo)} ${esc(a.fonte)}</li>`).join('')}</ul></details>`:''}`;
}

