/* Documento de políticas para impressão: sem CSS do sistema ou temas. */
(() => {
  function limparConteudo(origem) {
    const copia = origem.cloneNode(true);
    copia.querySelectorAll(".policy-print-toolbar,button,input,select,textarea,script,style,svg,canvas,iframe").forEach(el => el.remove());
    copia.querySelectorAll("*").forEach(el => {
      el.removeAttribute("style");
      el.removeAttribute("class");
      el.removeAttribute("id");
      el.removeAttribute("hidden");
      el.removeAttribute("aria-hidden");
      if (el.tagName === "IMG") {
        el.removeAttribute("width");
        el.removeAttribute("height");
      }
    });
    return copia.innerHTML;
  }

  function imprimirPolitica(tipo) {
    const origem = document.querySelector(tipo === "pix" ? "#pix-politicas" : "#politicas");
    if (!origem) {
      window.alert("Não foi possível localizar a política selecionada.");
      return;
    }
    const titulo = tipo === "pix" ? "Pix do Presidente" : "Campanha da Oficina";
    const competencia = document.querySelector("#competenciaGlobal")?.value || "";
    const janela = window.open("", "_blank");
    if (!janela) {
      window.alert("Autorize as janelas pop-up deste site para imprimir a política.");
      return;
    }
    const css = `
      @page { size: A4 portrait; margin: 16mm 15mm 17mm; }
      *, *::before, *::after { box-sizing: border-box; }
      html { background: white; color: #203445; }
      body { font: 11pt/1.55 Arial, Helvetica, sans-serif; margin: 0; color: #203445; background: #fff; }
      header { border-bottom: 2px solid #087e69; padding-bottom: 12px; margin-bottom: 20px; }
      header .brand { color: #087e69; font-size: 9pt; font-weight: 800; letter-spacing: .08em; }
      header h1 { margin: 5px 0 7px; font-size: 21pt; line-height: 1.2; color: #133d4b; }
      header p { font-size: 9pt; color: #536774; margin: 0; }
      main, main > div, main > section, main > article { display: block; width: 100%; max-width: 100%; }
      main div, main section, main article { min-width: 0; max-width: 100%; overflow: visible; }
      h1,h2,h3,h4 { color: #08705d; line-height: 1.3; margin: 16px 0 8px; break-after: avoid; }
      h2 { font-size: 15pt; } h3 { font-size: 12pt; } h4 { font-size: 11pt; }
      p,li,td,th,span,small,strong { overflow-wrap: anywhere; }
      p { margin: 7px 0 11px; }
      ul,ol { padding-left: 22px; margin: 8px 0 13px; }
      li { margin: 4px 0; }
      main article { border: 1px solid #d9e6e5; border-radius: 7px; padding: 13px 15px; margin: 0 0 15px; break-inside: avoid-page; }
      main article article { border: 0; padding: 0; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0 15px; font-size: 9pt; }
      th,td { border: 1px solid #d5e1e4; padding: 7px; text-align: left; vertical-align: top; }
      th { background: #edf6f4; }
      tr { break-inside: avoid; }
      img { max-width: 100%; height: auto; }
      .screen-toolbar { padding: 10px 0 20px; }
      .screen-toolbar button { background: #087e69; color: white; border: 0; border-radius: 8px; padding: 11px 18px; font-weight: bold; cursor: pointer; }
      @media screen {
        body { max-width: 800px; padding: 30px; margin: 22px auto; box-shadow: 0 3px 24px #cbd5d9; }
        html { background: #edf1f3; }
      }
      @media print { .screen-toolbar { display: none; } body { padding: 0; margin: 0; box-shadow: none; } }
    `;
    const escape = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Políticas — '+escape(titulo)+'</title><style>'+css+'</style></head><body><div class="screen-toolbar"><button type="button" onclick="window.print()">Imprimir ou salvar PDF</button></div><header><div class="brand">GRUPO MÔNACO · PÓS-VENDAS</div><h1>Políticas — '+escape(titulo)+'</h1><p>Regulamento da campanha'+(competencia?' · Competência: '+escape(competencia):'')+'</p></header><main>'+limparConteudo(origem)+'</main></body></html>';
    janela.document.open();
    janela.document.write(html);
    janela.document.close();
    janela.focus();
    /* O usuário vê o documento antes de imprimir; evita preview vazio por renderização assíncrona. */
  }

  document.addEventListener("click", evento => {
    const botao = evento.target.closest("[data-policy-print]");
    if (botao) imprimirPolitica(botao.dataset.policyPrint);
  });
})();
