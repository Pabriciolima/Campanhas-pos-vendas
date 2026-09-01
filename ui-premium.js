/* ================================================================
   ÍCONES FUNCIONAIS PREMIUM — CAMPANHAS PÓS-VENDAS
   Arquivo de destino: ui-premium.js
   Não substitui textos, IDs, classes, onclicks ou listeners existentes.
   ================================================================ */
(function () {
  "use strict";

  const ICONS = {
    dashboard: '<path d="M3 13h8V3H3z"/><path d="M13 21h8V11h-8z"/><path d="M13 3h8v6h-8z"/><path d="M3 15h8v6H3z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M20 15v5H4v-5"/>',
    download: '<path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M20 20H4"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/>',
    policy: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21H9.6v-.08A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.1 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H2.4V9.6h.08A1.7 1.7 0 0 0 4.1 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8.5 4.1a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V2.4h4v.08A1.7 1.7 0 0 0 15 4.1a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8.5a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1 .4h.08v4H21a1.7 1.7 0 0 0-1.6 1.1z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>'
  };

  const RULES = [
    [/dashboard|vis[aã]o geral|in[ií]cio|painel/i, "dashboard"],
    [/funcion[aá]rio|participante|usu[aá]rio|equipe|online/i, "users"],
    [/novo|nova|adicionar|inserir|cadastrar|criar/i, "plus"],
    [/editar|alterar|ajustar/i, "edit"],
    [/excluir|apagar|remover|limpar/i, "trash"],
    [/salvar|confirmar|concluir|aplicar/i, "save"],
    [/importar|enviar|anexar|upload|selecionar evid[eê]ncia/i, "upload"],
    [/exportar|baixar|download/i, "download"],
    [/evid[eê]ncia|imagem|foto|galeria|[aá]lbum/i, "image"],
    [/visualizar|detalhes|abrir/i, "eye"],
    [/lan[çc]amento|apura[çc][aã]o|relat[oó]rio|indicador|resultado/i, "chart"],
    [/pol[ií]tica|regra|bloqueio/i, "policy"],
    [/buscar|pesquisar|filtrar/i, "search"],
    [/cancelar|fechar|×/i, "close"],
    [/configura[çc][aã]o|prefer[eê]ncia/i, "settings"]
  ];

  function svg(nome) {
    const desenho = ICONS[nome];
    if (!desenho) return null;
    const ns = "http://www.w3.org/2000/svg";
    const caixa = document.createElementNS(ns, "svg");
    caixa.setAttribute("viewBox", "0 0 24 24");
    caixa.setAttribute("aria-hidden", "true");
    caixa.setAttribute("focusable", "false");
    caixa.classList.add("ui-icon");
    caixa.innerHTML = desenho;
    return caixa;
  }

  function nomeIcone(el) {
    const explicito = el.getAttribute("data-ui-icon");
    if (explicito && ICONS[explicito]) return explicito;
    const texto = [el.textContent, el.getAttribute("aria-label"), el.title].filter(Boolean).join(" ").trim();
    for (const [padrao, nome] of RULES) if (padrao.test(texto)) return nome;
    return null;
  }

  function deveIgnorar(el) {
    return el.dataset.uiIconReady === "1" ||
      !!el.closest("#pcBotao, #pcPainel, #pcCadastro, #pcAcesso, #pcCursores") ||
      el.matches(".module-toggle, .developer-card, [data-no-premium-icon]") ||
      !!el.querySelector("svg, img, .material-icons, .fa, [class*='icon-']:not(.ui-icon)") ||
      !el.textContent.trim();
  }

  function aprimorarBotao(el) {
    if (!(el instanceof Element) || deveIgnorar(el)) return;
    const nome = nomeIcone(el);
    if (!nome) return;
    const icone = svg(nome);
    if (!icone) return;
    el.prepend(icone);
    el.classList.add("ui-has-icon");
    el.dataset.uiIconReady = "1";

    if ((el.matches(".icon-btn") || el.textContent.trim().length <= 2) && !el.getAttribute("aria-label")) {
      const rotulo = nome === "close" ? "Fechar" : "Ação";
      el.setAttribute("aria-label", rotulo);
      el.dataset.uiTip = rotulo;
    }
  }

  function aprimorar(root) {
    const base = root instanceof Element || root instanceof Document ? root : document;
    if (base instanceof Element && base.matches("button, [role='button']")) aprimorarBotao(base);
    base.querySelectorAll("button, [role='button']").forEach(aprimorarBotao);
  }

  function iniciar() {
    aprimorar(document);
    document.documentElement.classList.add("ui-premium-ready");

    let agendado = false;
    const alterados = new Set();
    const observador = new MutationObserver((mudancas) => {
      for (const mudanca of mudancas) {
        for (const no of mudanca.addedNodes) if (no.nodeType === 1) alterados.add(no);
      }
      if (agendado || !alterados.size) return;
      agendado = true;
      requestAnimationFrame(() => {
        alterados.forEach(aprimorar);
        alterados.clear();
        agendado = false;
      });
    });
    observador.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
