/* =========================================================
   MENU DROPDOWN DAS CAMPANHAS
   PRODUTIVOS + PIX DO PRESIDENTE + CRM + GARANTIA

   Salve este arquivo como:
   module-switcher.js
========================================================= */

(() => {
  "use strict";

  const STORAGE_MODULO =
    "modulo_campanha_ativo";

  const STORAGE_DROPDOWN =
    "modulo_dropdown_aberto";

  const TITULOS_PRODUTIVOS = {
    dashboard: "Campanha dos Produtivos",
    funcionarios: "Base de funcionários",
    lancamentos: "Lançamentos",
    apuracao: "Apuração",
    politicas: "Políticas"
  };

  const TITULOS_PIX = {
    dashboard: "Visão geral do Pix",
    funcionarios: "Base de participantes",
    lancamentos: "Lançamentos semanais",
    apuracao: "Apuração do Pix",
    politicas: "Políticas do Pix"
  };

  const TITULOS_CRM = {
    dashboard: "Visão geral do CRM",
    funcionarios: "Base de participantes do CRM",
    lancamentos: "Lançamentos do CRM",
    apuracao: "Apuração do CRM",
    politicas: "Políticas do CRM"
  };

  const TITULOS_GARANTIA = {
    dashboard: "Visão geral da Garantia",
    funcionarios: "Base de participantes da Garantia",
    lancamentos: "Lançamentos da Garantia",
    apuracao: "Apuração da Garantia",
    politicas: "Políticas da Garantia"
  };

  function selecionar(seletor) {
    return document.querySelector(
      seletor
    );
  }

  function selecionarTodos(
    seletor
  ) {
    return [
      ...document.querySelectorAll(
        seletor
      )
    ];
  }

  function grupoDoModulo(
    modulo
  ) {
    return selecionar(
      `[data-module-group="${modulo}"]`
    );
  }

  function atualizarTitulo(
    titulo
  ) {
    const elemento =
      selecionar("#pageTitle");

    if (elemento) {
      elemento.textContent =
        titulo;
    }
  }

  function fecharOutrosDropdowns(
    moduloMantido = ""
  ) {
    selecionarTodos(
      ".campaign-module-group"
    ).forEach(
      grupo => {
        const modulo =
          grupo.dataset.moduleGroup;

        if (
          modulo !== moduloMantido
        ) {
          grupo.classList.remove(
            "open"
          );

          grupo
            .querySelector(
              ".module-toggle"
            )
            ?.setAttribute(
              "aria-expanded",
              "false"
            );
        }
      }
    );
  }

  function definirDropdown(
    modulo,
    abrir
  ) {
    const grupo =
      grupoDoModulo(modulo);

    if (!grupo) {
      console.warn(
        `Módulo não encontrado: ${modulo}`
      );

      return;
    }

    fecharOutrosDropdowns(
      abrir ? modulo : ""
    );

    grupo.classList.toggle(
      "open",
      abrir
    );

    grupo
      .querySelector(
        ".module-toggle"
      )
      ?.setAttribute(
        "aria-expanded",
        String(abrir)
      );

    if (abrir) {
      localStorage.setItem(
        STORAGE_DROPDOWN,
        modulo
      );
    } else {
      localStorage.removeItem(
        STORAGE_DROPDOWN
      );
    }
  }

  function ocultarTodasAsViews() {
    selecionarTodos(
      ".view"
    ).forEach(
      view => {
        view.classList.remove(
          "active"
        );
      }
    );

    selecionarTodos(
      ".pix-subview"
    ).forEach(
      view => {
        view.classList.remove(
          "active"
        );
      }
    );

    selecionarTodos(
      ".nav-btn, .pix-menu-btn, .crm-menu-btn, .garantia-menu-btn"
    ).forEach(
      botao => {
        botao.classList.remove(
          "active"
        );
      }
    );
  }

  function abrirPaginaProdutivos(
    pagina = "dashboard"
  ) {
    const view =
      selecionar(`#${pagina}`);

    if (!view) {
      console.warn(
        `Página dos Produtivos não encontrada: #${pagina}`
      );

      return;
    }

    ocultarTodasAsViews();

    document.body.classList.add(
      "modulo-produtivos-ativo"
    );

    document.body.classList.remove(
      "modulo-pix-ativo",
      "modulo-crm-ativo",
      "modulo-garantia-ativo"
    );

    view.classList.add(
      "active"
    );

    selecionar(
      `[data-view="${pagina}"]`
    )?.classList.add(
      "active"
    );

    atualizarTitulo(
      TITULOS_PRODUTIVOS[
        pagina
      ] ||
      "Campanha dos Produtivos"
    );

    localStorage.setItem(
      STORAGE_MODULO,
      "produtivos"
    );

    definirDropdown(
      "produtivos",
      true
    );
  }

  function abrirPaginaPix(
    pagina = "dashboard"
  ) {
    const moduloPix =
      selecionar(
        "#pixPresidente"
      );

    const subview =
      selecionar(
        `#pix-${pagina}`
      );

    if (!moduloPix) {
      console.warn(
        "A seção #pixPresidente não foi encontrada no index.html."
      );

      return;
    }

    ocultarTodasAsViews();

    document.body.classList.add(
      "modulo-pix-ativo"
    );

    document.body.classList.remove(
      "modulo-produtivos-ativo",
      "modulo-crm-ativo",
      "modulo-garantia-ativo"
    );

    moduloPix.classList.add(
      "active"
    );

    if (subview) {
      subview.classList.add(
        "active"
      );
    }

    selecionar(
      `[data-pix-view="${pagina}"]`
    )?.classList.add(
      "active"
    );

    atualizarTitulo(
      TITULOS_PIX[pagina] ||
      "Pix do Presidente"
    );

    localStorage.setItem(
      STORAGE_MODULO,
      "pix"
    );

    definirDropdown(
      "pix",
      true
    );
  }

  function marcarOpcaoEmEstruturacao(
    seletor,
    atributo,
    pagina
  ) {
    selecionarTodos(
      seletor
    ).forEach(
      botao => {
        botao.classList.toggle(
          "active",
          botao.dataset[
            atributo
          ] === pagina
        );
      }
    );
  }

  function abrirPaginaCrm(
    pagina = "dashboard"
  ) {
    marcarOpcaoEmEstruturacao(
      ".crm-menu-btn",
      "crmView",
      pagina
    );

    document.body.classList.add(
      "modulo-crm-ativo"
    );

    document.body.classList.remove(
      "modulo-produtivos-ativo",
      "modulo-pix-ativo",
      "modulo-garantia-ativo"
    );

    atualizarTitulo(
      TITULOS_CRM[pagina] ||
      "Campanhas do CRM"
    );

    localStorage.setItem(
      STORAGE_MODULO,
      "crm"
    );

    definirDropdown(
      "crm",
      true
    );

    alert(
      "O módulo Campanhas do CRM está em estruturação. Esta opção será implementada depois que as políticas forem definidas."
    );
  }

  function abrirPaginaGarantia(
    pagina = "dashboard"
  ) {
    marcarOpcaoEmEstruturacao(
      ".garantia-menu-btn",
      "garantiaView",
      pagina
    );

    document.body.classList.add(
      "modulo-garantia-ativo"
    );

    document.body.classList.remove(
      "modulo-produtivos-ativo",
      "modulo-pix-ativo",
      "modulo-crm-ativo"
    );

    atualizarTitulo(
      TITULOS_GARANTIA[
        pagina
      ] ||
      "Campanhas de Garantia"
    );

    localStorage.setItem(
      STORAGE_MODULO,
      "garantia"
    );

    definirDropdown(
      "garantia",
      true
    );

    alert(
      "O módulo Campanhas de Garantia está em estruturação. Esta opção será implementada depois que as políticas forem definidas."
    );
  }

  function alternarModulo(
    modulo
  ) {
    const grupo =
      grupoDoModulo(modulo);

    if (!grupo) {
      return;
    }

    const estaAberto =
      grupo.classList.contains(
        "open"
      );

    if (estaAberto) {
      definirDropdown(
        modulo,
        false
      );

      return;
    }

    if (modulo === "pix") {
      abrirPaginaPix(
        "dashboard"
      );

      return;
    }

    if (
      modulo === "crm" ||
      modulo === "garantia"
    ) {
      definirDropdown(
        modulo,
        true
      );

      localStorage.setItem(
        STORAGE_DROPDOWN,
        modulo
      );

      return;
    }

    abrirPaginaProdutivos(
      "dashboard"
    );
  }

  function configurarAcessibilidade() {
    selecionarTodos(
      ".module-toggle"
    ).forEach(
      botao => {
        const grupo =
          botao.closest(
            ".campaign-module-group"
          );

        botao.setAttribute(
          "aria-expanded",
          String(
            grupo?.classList.contains(
              "open"
            ) || false
          )
        );
      }
    );
  }

  function tratarClique(
    evento
  ) {
    const botaoModulo =
      evento.target.closest(
        ".module-toggle"
      );

    if (botaoModulo) {
      evento.preventDefault();
      evento.stopPropagation();

      alternarModulo(
        botaoModulo.dataset
          .moduleToggle
      );

      return;
    }

    const botaoPix =
      evento.target.closest(
        ".pix-menu-btn"
      );

    if (botaoPix) {
      evento.preventDefault();
      evento.stopPropagation();

      abrirPaginaPix(
        botaoPix.dataset.pixView
      );

      return;
    }

    const botaoCrm =
      evento.target.closest(
        ".crm-menu-btn"
      );

    if (botaoCrm) {
      evento.preventDefault();
      evento.stopPropagation();

      abrirPaginaCrm(
        botaoCrm.dataset.crmView
      );

      return;
    }

    const botaoGarantia =
      evento.target.closest(
        ".garantia-menu-btn"
      );

    if (botaoGarantia) {
      evento.preventDefault();
      evento.stopPropagation();

      abrirPaginaGarantia(
        botaoGarantia.dataset
          .garantiaView
      );

      return;
    }

    const botaoProdutivos =
      evento.target.closest(
        ".module-dropdown .nav-btn[data-view]"
      );

    if (botaoProdutivos) {
      evento.preventDefault();
      evento.stopPropagation();

      abrirPaginaProdutivos(
        botaoProdutivos.dataset
          .view
      );
    }
  }

  function iniciarMenuCampanhas() {
    if (
      !selecionar(
        ".campaign-modules-nav"
      )
    ) {
      console.error(
        "Menu .campaign-modules-nav não encontrado."
      );

      return;
    }

    document.addEventListener(
      "click",
      tratarClique
    );

    configurarAcessibilidade();

    const moduloSalvo =
      localStorage.getItem(
        STORAGE_MODULO
      );

    if (moduloSalvo === "pix") {
      abrirPaginaPix(
        "dashboard"
      );

      return;
    }

    /*
     * CRM e Garantia ainda não possuem telas.
     * Mantemos a página dos Produtivos visível
     * e apenas reabrimos o dropdown salvo.
     */
    if (
      moduloSalvo === "crm" ||
      moduloSalvo === "garantia"
    ) {
      abrirPaginaProdutivos(
        "dashboard"
      );

      definirDropdown(
        moduloSalvo,
        true
      );

      return;
    }

    abrirPaginaProdutivos(
      "dashboard"
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      iniciarMenuCampanhas,
      {
        once: true
      }
    );
  } else {
    iniciarMenuCampanhas();
  }

  window.menuCampanhas = {
    abrirProdutivos:
      abrirPaginaProdutivos,

    abrirPix:
      abrirPaginaPix,

    abrirCrm:
      abrirPaginaCrm,

    abrirGarantia:
      abrirPaginaGarantia,

    alternar:
      alternarModulo
  };
})();