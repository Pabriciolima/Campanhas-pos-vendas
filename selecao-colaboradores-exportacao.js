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
 function box(){let b=$('#colaboradoresExportacao');if(b)return b;const host=$('#pixFilialExportacaoLabel');if(!host)return null;b=element('fieldset');b.id='colaboradoresExportacao';b.hidden=true;host.after(b);const legend=element('legend','Colaboradores para exportar / imprimir'),help=element('p','Desmarque quem não deve aparecer. A seleção vale para PDF e Excel, junto com os demais filtros.');const actions=element('div');actions.className='ce-actions';for(const [text,all] of [['Marcar todos',true],['Limpar seleção',false]]){const bt=element('button',text);bt.type='button';bt.addEventListener('click',()=>{state.edited=true;state.selected=all?new Set(state.people.map(key)):new Set();state.signature='';refresh();});actions.append(bt);}const count=element('span');count.id='colaboradoresExportacaoContador';count.setAttribute('aria-live','polite');actions.append(count);const list=element('div');list.className='ce-list';b.append(legend,help,actions,list);return b;}
 function refresh(){const b=box();if(!b)return;const c=current();b.hidden=!c.mod||!c.branch;if(state.context!==c.context){state.context=c.context;state.selected.clear();state.signature='';state.edited=false;state.people=[];}if(b.hidden)return;
 const people=[...new Map(catalog(c.mod).filter(p=>norm(p.filial)===norm(c.branch)).map(p=>[key(p),p])).values()].sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR'));const sig=JSON.stringify(people.map(p=>[key(p),p.nome,p.cargo]));
 if(sig===state.signature)return;const allowed=new Set(people.map(key));state.selected=new Set([...state.selected].filter(k=>allowed.has(k)));if(!state.edited)state.selected=new Set(allowed);state.people=people;state.signature=sig;
 const list=b.querySelector('.ce-list');list.replaceChildren();if(!people.length)list.append(element('p','Nenhum colaborador carregado para esta filial. Aguarde a base ou confira o cadastro.'));
 for(const p of people){const label=element('label'),input=element('input');input.type='checkbox';input.checked=state.selected.has(key(p));input.value=key(p);input.addEventListener('change',()=>{state.edited=true;input.checked?state.selected.add(key(p)):state.selected.delete(key(p));counter();});const text=element('span',p.nome||p.colaborador);text.append(element('small',p.cargo||'Cargo não informado'));label.append(input,text);list.append(label);}counter();
 }
 function counter(){const label=$('#colaboradoresExportacaoContador');if(label)label.textContent=state.selected.size+' de '+state.people.length+' selecionados';}
 function filter(rows,mod){refresh();const c=current();if(!c.branch||c.mod!==mod)return rows;return rows.filter(r=>norm(r.filial)===norm(c.branch)&&state.selected.has(key(r)));}
 window.CampanhasSelecaoExportacao={filtrar:filter,atualizar:refresh};
 document.addEventListener('change',e=>{if(['pixFilialExportacao','competenciaGlobal','tipoExportacao'].includes(e.target?.id))refresh();});window.addEventListener('campanhas:viewready',refresh);new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['class']});refresh();window.setInterval(refresh,1200);
})();
