/* Navegação mobile progressiva. Não interfere nos controladores de campanha. */
(() => {
  const setup = () => {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar || document.querySelector("#mobileNavTrigger")) return;
    const trigger = document.createElement("button");
    trigger.id = "mobileNavTrigger";
    trigger.className = "mobile-nav-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-label","Abrir menu de navegação");
    trigger.setAttribute("aria-controls","mobileNavSidebar");
    trigger.setAttribute("aria-expanded","false");
    trigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg><span>Menu</span>';
    sidebar.id = "mobileNavSidebar";
    const backdrop = document.createElement("div");
    backdrop.className = "mobile-nav-backdrop";
    backdrop.setAttribute("aria-hidden","true");
    const heading = document.createElement("div");
    heading.className = "mobile-nav-heading";
    heading.innerHTML = '<strong>Navegação</strong><button type="button" class="mobile-nav-close" aria-label="Fechar menu">×</button>';
    sidebar.prepend(heading);
    document.body.append(trigger,backdrop);
    const media = window.matchMedia("(max-width: 900px)");
    let lastFocus = null;
    const setOpen = (open, restore = false) => {
      const active = !!open && media.matches;
      document.body.classList.toggle("mobile-nav-open",active);
      trigger.setAttribute("aria-expanded",String(active));
      trigger.setAttribute("aria-label",active?"Fechar menu de navegação":"Abrir menu de navegação");
      if(active){lastFocus=document.activeElement;heading.querySelector("button").focus({preventScroll:true});}
      else if(restore && lastFocus?.focus){trigger.focus({preventScroll:true});}
    };
    trigger.addEventListener("click",()=>setOpen(!document.body.classList.contains("mobile-nav-open"),true));
    heading.querySelector("button").addEventListener("click",()=>setOpen(false,true));
    backdrop.addEventListener("click",()=>setOpen(false,true));
    document.addEventListener("keydown",e=>{
      if(!document.body.classList.contains("mobile-nav-open"))return;
      if(e.key==="Escape"){setOpen(false,true);return;}
      if(e.key!=="Tab")return;
      const focusable=[...sidebar.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])')].filter(el=>el.getClientRects().length);
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
    sidebar.addEventListener("click",e=>{
      if(e.target.closest("[data-view],[data-pix-view],[data-crm-view],[data-compras-view],[data-garantia-view]"))setOpen(false);
    });
    media.addEventListener?.("change",()=>{if(!media.matches)setOpen(false);});
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});
  else setup();
})();
