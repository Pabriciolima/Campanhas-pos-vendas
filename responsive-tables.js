/* Preserva tabelas, dados e eventos existentes; adapta apenas a apresentação. */
(() => {
 const selector='#lancamentos .table-wrap,#apuracao .table-wrap,#pix-lancamentos .table-wrap,#pix-apuracao .table-wrap';
 const media=window.matchMedia('(max-width: 1600px)');
 const configured=new WeakSet();let queued=false;
 function refresh(){
  document.querySelectorAll(selector).forEach(wrap=>{
   const table=wrap.querySelector('table');if(!table)return;
   const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent.replace(/[↕↑↓]/g,'').trim());
   table.querySelectorAll('tbody tr').forEach(row=>{
    const empty=row.children.length===1&&Number(row.children[0].getAttribute('colspan')||1)>1;
    row.classList.toggle('responsive-empty',empty);
    [...row.children].forEach((cell,index)=>{
     const label=empty?'':headers[index]||'';
     if(cell.dataset.label!==label)cell.dataset.label=label;
     cell.classList.toggle('responsive-wide',/indicadores|status|ações|avaliação|motivo/i.test(label));
    });
   });
   if(!configured.has(wrap)){
    configured.add(wrap);wrap.classList.add('responsive-data-wrap');
    wrap.setAttribute('tabindex','0');wrap.setAttribute('aria-label','Dados de lançamentos ou apuração. Na visualização tabela, use as setas para rolar.');
    const controls=document.createElement('div');controls.className='responsive-data-controls';
    controls.setAttribute('role','group');controls.setAttribute('aria-label','Visualização dos dados');
    controls.innerHTML='<span>Visualização</span><button type="button" data-table-mode="table">Tabela</button><button type="button" data-table-mode="cards">Cartões</button>';
    wrap.before(controls);
    const apply=()=>{
     const mode=wrap.dataset.preferredMode||(media.matches?'cards':'table');wrap.dataset.responsiveMode=mode;
     controls.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tableMode===mode)));
    };
    controls.addEventListener('click',e=>{const b=e.target.closest('[data-table-mode]');if(!b)return;wrap.dataset.preferredMode=b.dataset.tableMode;apply();});
    media.addEventListener?.('change',apply);apply();
   }
  });
 }
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}
 const start=()=>{refresh();new MutationObserver(schedule).observe(document.querySelector('main')||document.body,{childList:true,subtree:true});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
