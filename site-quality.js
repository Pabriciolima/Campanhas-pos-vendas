/* Navegação e títulos. Não acessa nem modifica dados das campanhas. */
(() => {
  const setup = () => {
    const logo = document.querySelector('.brand-home');
    logo?.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
      if (!window.menuCampanhas?.abrirProdutivos) return;
      // Preserve formulários abertos: use a ação de fechar/cancelar antes de navegar.
      if (document.querySelector('dialog[open]')) { event.preventDefault(); return; }
      event.preventDefault();
      window.menuCampanhas.abrirProdutivos('dashboard');
      document.querySelector('.mobile-nav-close')?.click();
      document.querySelector('#conteudoPrincipal')?.focus({ preventScroll: true });
    });
    const title = document.querySelector('#pageTitle');
    const updateTitle = () => {
      const label = title?.textContent?.trim();
      if (label) document.title = label + ' | Campanhas Pós-Vendas';
    };
    updateTitle();
    if (title) new MutationObserver(updateTitle).observe(title, {childList:true,subtree:true,characterData:true});
    // Somente regiões com tabelas excedentes tornam-se focáveis para rolagem por teclado.
    const labelTables = () => document.querySelectorAll('.table-wrap,.table-responsive,.table-container,.data-table-wrapper').forEach(region => {
      if (!region.querySelector('table')) return;
      region.setAttribute('tabindex','0');
      if (!region.hasAttribute('aria-label')) region.setAttribute('aria-label','Tabela de dados. Use as setas para rolar quando necessário.');
    });
    labelTables();
    window.addEventListener('campanhas:viewready', labelTables);
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',setup,{once:true}); else setup();
})();
