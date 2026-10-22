/* Filtro de saída: não altera lançamentos ou apuração. */
(() => {
 'use strict';
 const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/^\s*\d+\s*-\s*/,'').replace(/\s+/g,' ').trim().toUpperCase();
 const key=p=>[norm(p.filial),norm(p.nome||p.colaborador),norm(p.cargo)].join('|');
 const state={context:'',selected:new Set(),signature:'',edited:false,people:[]};
 const $=s=>document.querySelector(s);
 const module=()=>document.body.classList.contains('modulo-pix-ativo')?'pix':document.body.classList.contains('modulo-produtivos-ativo')?'oficina':null;
 function current(){const mod=module(),branch=$('#pixFilialExportacao')?.value||'',month=$('#competenciaGlobal')?.value||'';return{mod,branch,context:[mod,norm(branch),month].join('|')};}
 function catalog(mod){return (mod==='pix'?window.obterContextoAssistentePix?.(false):window.obterContextoAssistenteOficina?.(false))?.participantes||[];}
 function element(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
 function close(){const p=$('#colaboradoresExportacaoPainel');if(p?.matches(':popover-open'))p.hidePopover();}
 function position(){const trigger=$('#colaboradoresExportacaoBotao'),panel=$('#colaboradoresExportacaoPainel');if(!trigger||!panel?.matches(':popover-open'))return;const r=trigger.getBoundingClientRect(),w=Math.min(360,innerWidth-24),h=panel.getBoundingClientRect().height;panel.style.width=w+'px';panel.style.left=Math.max(12,Math.min(r.left,innerWidth-w-12))+'px';panel.style.top=Math.max(12,r.bottom+8+h<=innerHeight-12?r.bottom+8:r.top-h-8)+'px';}
 function box(){let b=$('#colaboradoresExportacao');if(b)return b;const host=$('#pixFilialExportacaoLabel');if(!host)return null;
 b=element('div');b.id='colaboradoresExportacao';b.hidden=true;host.after(b);
 const caption=element('span','Colaboradores');caption.className='ce-caption';const trigger=element('button');trigger.id='colaboradoresExportacaoBotao';trigger.className='ce-trigger';trigger.type='button';trigger.setAttribute('popovertarget','colaboradoresExportacaoPainel');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','colaboradoresExportacaoPainel');
 const count=element('span','Selecionar colaboradores');count.id='colaboradoresExportacaoContador';count.setAttribute('aria-live','polite');const arrow=element('span','⌄');arrow.className='ce-arrow';arrow.setAttribute('aria-hidden','true');trigger.append(count,arrow);
 const panel=element('div');panel.id='colaboradoresExportacaoPainel';panel.setAttribute('popover','auto');panel.setAttribute('role','group');panel.setAttribute('aria-label','Selecionar colaboradores para exportar');panel.addEventListener('toggle',()=>{trigger.setAttribute('aria-expanded',String(panel.matches(':popover-open')));position();});
 const head=element('div');head.className='ce-head';head.append(element('strong','Quem deseja imprimir?'));const done=element('button','Concluir');done.type='button';done.className='ce-done';done.addEventListener('click',()=>{close();trigger.focus();});head.append(done);
 const help=element('p','Seleção para PDF e Excel desta filial.');const actions=element('div');actions.className='ce-actions';for(const [text,all] of [['Marcar todos',true],['Limpar seleção',false]]){const bt=element('button',text);bt.type='button';bt.addEventListener('click',()=>{state.edited=true;state.selected=all?new Set(state.people.map(key)):new Set();state.signature='';refresh();});actions.append(bt);}const list=element('div');list.className='ce-list';panel.append(head,help,actions,list);b.append(caption,trigger,panel);return b;}
 function refresh(){const b=box();if(!b)return;const c=current();b.hidden=!c.mod||!c.branch;if(state.context!==c.context){close();state.context=c.context;state.selected.clear();state.signature='';state.edited=false;state.people=[];}if(b.hidden)return;
 const people=[...new Map(catalog(c.mod).filter(p=>norm(p.filial)===norm(c.branch)).map(p=>[key(p),p])).values()].sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR'));const sig=JSON.stringify(people.map(p=>[key(p),p.nome,p.cargo]));
 if(sig===state.signature)return;const allowed=new Set(people.map(key));state.selected=new Set([...state.selected].filter(k=>allowed.has(k)));if(!state.edited)state.selected=new Set(allowed);state.people=people;state.signature=sig;
 const list=b.querySelector('.ce-list');list.replaceChildren();if(!people.length)list.append(element('p','Nenhum colaborador carregado para esta filial. Aguarde a base ou confira o cadastro.'));
 for(const p of people){const label=element('label'),input=element('input');input.type='checkbox';input.checked=state.selected.has(key(p));input.value=key(p);input.addEventListener('change',()=>{state.edited=true;input.checked?state.selected.add(key(p)):state.selected.delete(key(p));counter();});const text=element('span',p.nome||p.colaborador);text.append(element('small',p.cargo||'Cargo não informado'));label.append(input,text);list.append(label);}counter();
 }
 function counter(){const label=$('#colaboradoresExportacaoContador');if(label)label.textContent=state.selected.size+' de '+state.people.length+' selecionados';}
 function filter(rows,mod){refresh();const c=current();if(!c.branch||c.mod!==mod)return rows;return rows.filter(r=>norm(r.filial)===norm(c.branch)&&state.selected.has(key(r)));}
 window.CampanhasSelecaoExportacao={filtrar:filter,atualizar:refresh};
 document.addEventListener('change',e=>{if(['pixFilialExportacao','competenciaGlobal','tipoExportacao'].includes(e.target?.id))refresh();});window.addEventListener('campanhas:viewready',refresh);new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['class']});refresh();window.setInterval(refresh,1200);window.addEventListener('resize',position);window.addEventListener('scroll',e=>{if(!$('#colaboradoresExportacaoPainel')?.contains(e.target))close();},true);
})();
