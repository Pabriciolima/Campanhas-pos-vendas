/* =====================================================================
   CONTRASTE SAFE V7 — HOTFIX DE DESTRAVAMENTO
   =====================================================================
   IMPORTANTE:
   A versão anterior fazia auditoria dinâmica do DOM inteiro e usava
   MutationObserver. Em páginas grandes, isso podia gerar trabalho em cascata
   e disparar "Script terminated by timeout".

   Nesta versão:
   - NÃO existe MutationObserver;
   - NÃO existe varredura automática do DOM;
   - NÃO altera atributos/classes de milhares de elementos;
   - NÃO interfere em Pix, Produtivos, CRM, Compras, Garantia ou presença;
   - o contraste continua sendo controlado pelo CSS:
       dark-mode-premium.css
       contrast-responsive-v2.css

   A API window.ContrastAudit é mantida apenas por compatibilidade.
   ===================================================================== */

(() => {
  "use strict";

  function noop() {
    return true;
  }

  window.ContrastAudit = Object.freeze({
    run: noop,
    schedule: noop,
    mode: "safe-static-css"
  });

  console.info(
    "[CONTRASTE] Modo seguro ativo — auditoria dinâmica desativada; contraste controlado por CSS."
  );
})();
