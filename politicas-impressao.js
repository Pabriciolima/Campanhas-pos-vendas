/* Impressão isolada das políticas existentes, sem recalcular metas. */
(() => {
  function imprimirPolitica(tipo) {
    const origem = document.querySelector(tipo === "pix" ? "#pix-politicas" : "#politicas");
    if (!origem) return;
    const conteudo = origem.cloneNode(true);
    conteudo.querySelectorAll(".policy-print-toolbar,button,input,select,textarea").forEach(el => el.remove());
    const titulo = tipo === "pix" ? "Pix do Presidente" : "Campanha da Oficina";
    const competencia = document.querySelector("#competenciaGlobal")?.value || "";
    const janela = window.open("", "_blank");
    if (!janela) {
      window.alert("O navegador bloqueou a janela de impressão. Autorize pop-ups para este site e tente novamente.");
      return;
    }
    const estilos = [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.outerHTML).join("\n");
    const documento = '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Políticas — '+titulo+'</title>'+estilos+
      '<style>@page{size:A4;margin:13mm}html,body{background:#fff!important;color:#142a39!important;font:12px Arial,sans-serif!important;overflow:visible!important}*{animation:none!important;transition:none!important} .sidebar,.topbar,.policy-print-toolbar,button{display:none!important}.view,.pix-subview,.panel{display:block!important;position:static!important;overflow:visible!important;width:100%!important;max-width:100%!important;box-shadow:none!important;transform:none!important}.pix-policy-grid,.infopolicy-grid{max-width:100%!important}table{width:100%!important}tr,.policy-card,.pix-policy-card,.ip-card{break-inside:avoid;page-break-inside:avoid}h1,h2,h3{break-after:avoid}html[data-theme="dark"]{color-scheme:light!important} .print-head{border-bottom:2px solid #0a856a;padding:0 0 12px;margin:0 0 20px}.print-head h1{font-size:22px;margin:4px 0}.print-head p{margin:0;color:#546576}</style></head><body><header class="print-head"><strong>GRUPO MÔNACO · PÓS-VENDAS</strong><h1>Políticas — '+titulo+'</h1><p>Regulamento exibido no sistema'+(competencia?' · Competência selecionada: '+competencia:'')+'</p></header>'+conteudo.innerHTML+'</body></html>';
    janela.document.open();
    janela.document.write(documento);
    janela.document.close();
    janela.addEventListener("load", () => {
      janela.focus();
      janela.print();
    }, {once:true});
  }
  document.addEventListener("click", evento => {
    const botao = evento.target.closest("[data-policy-print]");
    if (!botao) return;
    imprimirPolitica(botao.dataset.policyPrint);
  });
})();
