import {perfilDiretoria} from './core.mjs';
import {carregarInvestimento} from './data.js';
let botao,secao,desmontar,aberto=false,anteriores=[],sequencia=0;
function perfil(){return window.obterPerfilCampanhas?.()||null;}
function sincronizar(){const permitido=perfilDiretoria(perfil());botao.hidden=!permitido;if(!permitido&&aberto)fechar(true);}
function fechar(restaurar=true){sequencia++;aberto=false;desmontar?.();desmontar=null;secao.classList.remove('active');secao.replaceChildren();document.body.classList.remove('modulo-diretoria-ativo');botao.classList.remove('active');botao.setAttribute('aria-expanded','false');if(restaurar){anteriores.forEach(v=>{if(v.isConnected)v.classList.add('active');});if(!anteriores.length)window.menuCampanhas?.abrirPix('dashboard');} }
async function abrir(){if(!perfilDiretoria(perfil())){sincronizar();return;}
 if(aberto)return;const token=++sequencia;aberto=true;anteriores=[...document.querySelectorAll('.view.active,.pix-subview.active')];anteriores.forEach(v=>v.classList.remove('active'));secao.classList.add('active');document.body.classList.add('modulo-diretoria-ativo');botao.classList.add('active');botao.setAttribute('aria-expanded','true');secao.innerHTML='<p class="dir-loading" role="status">Abrindo o painel da Diretoria…</p>';
 try{const {montarDiretoria}=await import('../assets/diretoria-bi.js?v=20261127-1');if(token!==sequencia||!perfilDiretoria(perfil()))return;
 desmontar=montarDiretoria(secao,{perfil:perfil(),carregar:async signal=>{if(!perfilDiretoria(perfil()))throw Error('Perfil não autorizado.');const d=await carregarInvestimento(signal);if(!perfilDiretoria(perfil()))throw Error('Perfil alterado.');return d;},onVoltar:()=>fechar(true)});
 window.dispatchEvent(new CustomEvent('campanhas:viewready',{detail:{modulo:'diretoria',pagina:'investimento'}}));secao.scrollIntoView({behavior:'smooth',block:'start'});
 }catch{if(token===sequencia){secao.innerHTML='<div class="dir-loading" role="alert">Não foi possível abrir o painel. Atualize a página ou volte às campanhas.</div>';const voltar=document.createElement('button');voltar.textContent='Voltar às campanhas';voltar.onclick=()=>fechar(true);secao.append(voltar);}}
}
function iniciar(){const nav=document.querySelector('.campaign-modules-nav'),main=document.querySelector('main');if(!nav||!main)return;
 botao=document.createElement('button');botao.id='diretoriaNav';botao.className='dir-nav';botao.type='button';botao.hidden=true;botao.setAttribute('aria-controls','diretoriaView');botao.setAttribute('aria-expanded','false');botao.innerHTML='<span class="dir-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m3 6 4 4 5-6 5 6 4-4-2 13H5L3 6Z"/><path d="M6 15h12"/></svg></span><span><strong>Diretoria</strong><small>Executivo</small></span>';botao.onclick=abrir;nav.prepend(botao);
 secao=document.createElement('section');secao.id='diretoriaView';secao.className='view dir-view';secao.setAttribute('aria-label','Painel estratégico da Diretoria');main.append(secao);
 window.addEventListener('campanhas:perfil-alterado',sincronizar);window.addEventListener('campanhas:viewready',e=>{if(aberto&&e.detail?.modulo!=='diretoria')fechar(false);});
 nav.addEventListener('click',e=>{if(aberto&&e.target.closest('button')&&!e.target.closest('#diretoriaNav'))fechar(false);},true);
 setInterval(sincronizar,15000);window.addEventListener('focus',sincronizar);sincronizar();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
