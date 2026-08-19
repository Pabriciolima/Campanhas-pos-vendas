/*
 * GUIA DE PENDÊNCIAS PIX v06 — REGRAS DE O.S. CORRIGIDAS
 *
 * CORREÇÃO:
 * - O.S. nunca é exigida em S1, S2 ou S3.
 * - Consultor Técnico nunca recebe pendência de O.S.
 * - Consultor Peças nunca recebe pendência de O.S.
 * - Supervisor Peças nunca recebe pendência de O.S.
 * - Orçamentista/Facilitador nunca recebe pendência de O.S.
 * - O.S. somente na S4 para Supervisor de Assistência,
 *   Supervisor Pós-vendas, Coordenador e Gerente.
 * - Leitura da semana ficou robusta mesmo com cabeçalho compactado.
 * - Visual premium estático preservado, sem piscar.
 */

/*
 * PATCH 2026.08.19 — REGRAS DE PENDÊNCIA POR CARGO
 * Mantém todo o visual premium e os filtros existentes.
 * Corrige falso aviso de O.S. para Consultor Técnico.
 */

(() => {
  "use strict";

  const VERSAO = "2026.08.19-06";

  const SELETORES = {
    raiz: "#pix-lancamentos",
    tabela:
      "#pix-lancamentos table",
    painel:
      "#pix-lancamentos"
  };

  const normalizar = valor =>
    String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();

  /*
   * Regras conhecidas da campanha.
   *
   * NÃO tratamos valor zero como falta.
   * A pendência é indicada quando o campo/indicador nem aparece
   * no bloco de indicadores daquele lançamento.
   */
  function camposEsperadosPorCargo(cargo, semana) {
    const c =
      normalizar(
        cargo
      );

    const s =
      normalizar(
        semana
      ).replace(
        /\s+/g,
        ""
      );

    const ehS4 =
      s === "S4" ||
      s === "4" ||
      s === "SEMANA4";

    const ticket = {
      chave: "ticket",
      rotulo: "Ticket médio não lançado",
      detectar: texto =>
        /TICKET\s+MEDIO\s*:/.test(
          texto
        )
    };

    const nps = {
      chave: "nps",
      rotulo: "NPS não lançado",
      detectar: texto =>
        /\bNPS\s*:|META\/REALIZADO\s+NPS/.test(
          texto
        )
    };

    const os = {
      chave: "os",
      rotulo: "O.S. em aberto não lançada",
      detectar: texto =>
        /O\.?\s*S\.?\s+EM\s+ABERTO/.test(
          texto
        )
    };

    const margem = {
      chave: "margem",
      rotulo: "Margem não lançada",
      detectar: texto =>
        /\bMARGEM\s*:/.test(
          texto
        )
    };

    /*
     * REGRA DEFINITIVA DE O.S.
     *
     * O.S. NUNCA é cobrada em S1, S2 ou S3.
     *
     * Na S4, O.S. é cobrada SOMENTE para:
     * - Supervisor de Assistência
     * - Supervisor Pós-vendas
     * - Coordenador
     * - Gerente
     *
     * NÃO cobram O.S.:
     * - Consultor Técnico
     * - Consultor Peças Balcão
     * - Supervisor Peças
     * - Orçamentista / Facilitador
     */

    if (
      c.includes(
        "CONSULTOR TECNICO"
      )
    ) {
      return ehS4
        ? [
            ticket,
            nps
          ]
        : [
            ticket
          ];
    }

    if (
      c.includes(
        "CONSULTOR PECAS BALCAO"
      ) ||
      c.includes(
        "CONSULTOR DE PECAS BALCAO"
      ) ||
      c.includes(
        "SUPERVISOR PECAS"
      )
    ) {
      return [
        margem
      ];
    }

    if (
      c.includes(
        "ORCAMENTISTA"
      ) ||
      c.includes(
        "FACILITADOR DE NEGOC"
      )
    ) {
      return [
        ticket
      ];
    }

    const cargoUsaOs =
      c.includes(
        "SUPERVISOR DE ASSISTENCIA"
      ) ||
      c.includes(
        "SUPERVISOR ASSISTENCIA"
      ) ||
      c.includes(
        "SUPERVISOR POS-VENDAS"
      ) ||
      c.includes(
        "SUPERVISOR POS VENDAS"
      ) ||
      c.includes(
        "COORDENADOR"
      ) ||
      c.includes(
        "GERENTE"
      );

    if (
      cargoUsaOs
    ) {
      return ehS4
        ? [
            ticket,
            nps,
            os
          ]
        : [
            ticket
          ];
    }

    return [];
  }

  function descobrirIndices(tabela) {
    const cabecalho =
      tabela.querySelector("thead tr") ||
      tabela.querySelector("tr");

    if (!cabecalho) {
      return {
        semana: -1,
        cargo: -1,
        indicadores: -1
      };
    }

    const celulas =
      [...cabecalho.children];

    let semana = -1;
    let cargo = -1;
    let indicadores = -1;

    celulas.forEach((celula, indice) => {
      const titulo =
        normalizar(celula.textContent);

      if (
        titulo === "SEMANA" ||
        titulo.includes("SEMANA")
      ) {
        semana = indice;
      }

      if (
        titulo === "CARGO" ||
        titulo.includes("CARGO")
      ) {
        cargo = indice;
      }

      if (
        titulo.includes("INDICADORES")
      ) {
        indicadores = indice;
      }
    });

    return {
      semana,
      cargo,
      indicadores
    };
  }

  function linhasDados(tabela) {
    const todas =
      [...tabela.querySelectorAll("tr")];

    return todas.filter(linha => {
      if (
        linha.closest("thead")
      ) {
        return false;
      }

      return (
        linha.children.length >= 5 &&
        !linha.classList.contains(
          "guia-pendencias-resumo"
        )
      );
    });
  }

  function removerAvisosDaLinha(linha) {
    linha
      .querySelectorAll(
        ".guia-pendencia-aviso"
      )
      .forEach(
        elemento =>
          elemento.remove()
      );

    linha.classList.remove(
      "guia-tem-pendencia"
    );

    linha.removeAttribute(
      "data-pendencias"
    );
  }

  function detectarSemanaDaLinha(
    linha,
    indices,
    celulas
  ) {
    /*
     * Primeiro tenta a coluna identificada pelo cabeçalho.
     */
    if (
      indices.semana >= 0 &&
      celulas[
        indices.semana
      ]
    ) {
      const valor =
        normalizar(
          celulas[
            indices.semana
          ].textContent
        ).replace(
          /\s+/g,
          ""
        );

      if (
        /^(S[1-4]|[1-4]|SEMANA[1-4])$/.test(
          valor
        )
      ) {
        return valor;
      }
    }

    /*
     * Fallback seguro:
     * procura S1/S2/S3/S4 nas primeiras células da linha.
     * Isso evita erro quando o cabeçalho visual estiver compactado.
     */
    for (
      let i = 0;
      i < Math.min(
        4,
        celulas.length
      );
      i += 1
    ) {
      const valor =
        normalizar(
          celulas[i].textContent
        ).replace(
          /\s+/g,
          ""
        );

      if (
        /^(S[1-4]|SEMANA[1-4])$/.test(
          valor
        )
      ) {
        return valor;
      }
    }

    return "";
  }

  function analisarLinha(
    linha,
    indices
  ) {

    const celulas =
      [...linha.children];

    if (
      indices.cargo < 0 ||
      indices.indicadores < 0 ||
      !celulas[
        indices.cargo
      ] ||
      !celulas[
        indices.indicadores
      ]
    ) {
      return [];
    }

    const cargo =
      celulas[
        indices.cargo
      ].textContent || "";

    const semana =
      detectarSemanaDaLinha(
        linha,
        indices,
        celulas
      );

    const indicadoresCelula =
      celulas[
        indices.indicadores
      ];

    const textoIndicadores =
      normalizar(
        indicadoresCelula.textContent
      );

    const regras =
      camposEsperadosPorCargo(
        cargo,
        semana
      );

    const pendencias =
      regras.filter(
        regra =>
          !regra.detectar(
            textoIndicadores
          )
      );

    if (!pendencias.length) {
      removerAvisosDaLinha(linha);
      return [];
    }

    const assinatura =
      pendencias.map(item => item.chave).join("|");

    linha.classList.add(
      "guia-tem-pendencia"
    );

    linha.dataset.pendencias =
      pendencias
        .map(item => item.rotulo)
        .join(" • ");

    let box =
      linha.querySelector(
        ".guia-pendencia-aviso"
      );

    if (
      box &&
      box.dataset.assinatura === assinatura
    ) {
      return pendencias;
    }

    if (box) {
      box.remove();
    }

    box =
      document.createElement(
        "div"
      );

    box.className =
      "guia-pendencia-aviso";
    box.dataset.assinatura = assinatura;
    box.dataset.semana =
      String(
        semana || ""
      );
    box.dataset.cargo =
      String(
        cargo || ""
      );

    box.innerHTML = `
      <span
        class="guia-pendencia-icone"
        aria-hidden="true"
      >!</span>

      <span
        class="guia-pendencia-texto"
      >
        <strong>
          Informação pendente
        </strong>

        <small>
          ${pendencias
            .map(
              item =>
                item.rotulo
            )
            .join(" • ")}
        </small>
      </span>
      <span
        class="guia-pendencia-status"
      >
        PENDENTE
      </span>
    `;

    indicadoresCelula.appendChild(
      box
    );

    return pendencias;
  }

  function criarEstilos() {
    if (
      document.getElementById(
        "guiaPendenciasPixStyles"
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "guiaPendenciasPixStyles";

    style.textContent = `
      .guia-pendencias-toolbar {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin:0 0 12px;
        padding:11px 13px;
        position:relative;
        overflow:hidden;
        border:1px solid rgba(239,68,68,.20);
        border-radius:16px;
        background:
          linear-gradient(135deg,rgba(255,255,255,.98),rgba(254,242,242,.94));
        box-shadow:
          0 14px 34px rgba(15,23,42,.06),
          inset 0 1px 0 rgba(255,255,255,.9);
      }

      .guia-pendencias-toolbar[hidden] {
        display:none !important;
      }

      .guia-pendencias-info {
        display:flex;
        align-items:center;
        gap:9px;
        min-width:0;
      }

      .guia-pendencias-alerta {
        width:31px;
        height:31px;
        flex:0 0 31px;
        display:grid;
        place-items:center;
        border-radius:10px;
        background:linear-gradient(145deg,#ef4444,#dc2626);
        color:#fff;
        font-size:15px;
        font-weight:950;
        box-shadow:
          0 8px 18px rgba(220,38,38,.16);
      }

      .guia-pendencias-info strong {
        display:block;
        color:#991b1b;
        font-size:11px;
        line-height:1.25;
      }

      .guia-pendencias-info small {
        display:block;
        margin-top:2px;
        color:#b45353;
        font-size:9px;
        line-height:1.35;
      }

      .guia-pendencias-filtro {
        min-height:34px;
        padding:0 11px;
        border:1px solid #f3b9b9;
        border-radius:9px;
        background:#fff;
        color:#a61b1b;
        font:inherit;
        font-size:9px;
        font-weight:900;
        cursor:pointer;
        white-space:nowrap;
        transition:none !important;
      }

      .guia-pendencias-filtro:hover {
        border-color:#dc2626;
      }

      .guia-pendencias-filtro.ativo {
        background:#dc2626;
        border-color:#dc2626;
        color:#fff;
      }

      .guia-pendencia-aviso {
        width:fit-content;
        max-width:100%;
        box-sizing:border-box;
        display:flex;
        align-items:flex-start;
        gap:6px;
        margin-top:5px;
        padding:5px 7px;
        position:relative;
        overflow:hidden;
        border:1px solid rgba(239,68,68,.22);
        border-radius:10px;
        background:
          linear-gradient(135deg,rgba(255,255,255,.98),rgba(254,242,242,.92));
        color:#b91c1c;
        box-shadow:0 7px 18px rgba(127,29,29,.055);
        transition:none !important;
      }

      .guia-pendencia-icone {
        width:15px;
        height:15px;
        flex:0 0 15px;
        display:grid;
        place-items:center;
        margin-top:1px;
        border-radius:50%;
        background:#dc2626;
        color:#fff;
        font-size:9px;
        font-weight:950;
      }

      .guia-pendencia-texto {
        min-width:0;
        display:block;
      }

      .guia-pendencia-texto strong {
        display:block;
        color:#b91c1c;
        font-size:9px;
        font-weight:950;
        line-height:1.25;
        text-transform:none !important;
        letter-spacing:.02em;
      }

      .guia-pendencia-texto small {
        display:block;
        margin-top:1px;
        color:#c24141;
        font-size:8px;
        font-weight:750;
        line-height:1.35;
      }

      tr.guia-tem-pendencia {
        box-shadow:
          inset 3px 0 0 #ef4444;
      }

      tr.guia-tem-pendencia:hover {
        background:
          linear-gradient(
            90deg,
            rgba(254,242,242,.75),
            transparent 42%
          );
      }

      #pix-lancamentos.guia-pendencias-filtrar
      table tbody tr:not(.guia-tem-pendencia) {
        display:none !important;
      }

      #pix-lancamentos.guia-pendencias-filtrar
      table > tr:not(.guia-tem-pendencia):not(:first-child) {
        display:none !important;
      }

      .guia-pendencia-aviso:hover {
        border-color:rgba(220,38,38,.32);
        box-shadow:0 10px 24px rgba(127,29,29,.08);
      }
        to {
          opacity:1;
          transform:none !important;
        }
      }
        to {
          opacity:1;
          transform:none !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .guia-pendencias-toolbar,
        .guia-pendencia-aviso {
          animation:none !important;
          transition:none !important;
        }
      }

      @media(max-width:720px) {
        .guia-pendencias-toolbar {
          align-items:stretch;
          flex-direction:column;
        }

        .guia-pendencias-filtro {
          width:100%;
        }

        .guia-pendencia-aviso {
          width:100%;
        }
      }


      /* V03 — acabamento estático premium */
      .guia-pendencias-toolbar {
        position:relative;
        overflow:hidden;
        border:1px solid rgba(220,38,38,.16);
        border-radius:16px;
        background:
          linear-gradient(135deg,#ffffff 0%,#fff8f8 100%);
        box-shadow:
          0 10px 28px rgba(15,23,42,.055),
          inset 4px 0 0 #dc2626;
        animation:none !important;
      }

      .guia-pendencias-alerta {
        background:linear-gradient(145deg,#ef4444,#dc2626);
        box-shadow:0 7px 16px rgba(220,38,38,.14);
      }

      .guia-pendencia-aviso {
        position:relative;
        overflow:hidden;
        border:1px solid rgba(220,38,38,.18);
        border-radius:10px;
        background:linear-gradient(135deg,#ffffff 0%,#fffafa 100%);
        color:#991b1b;
        box-shadow:
          0 5px 14px rgba(15,23,42,.045),
          inset 3px 0 0 #ef4444;
        animation:none !important;
        transform:none !important;
        transition:none !important;
      }

      .guia-pendencia-aviso:hover {
        transform:none !important;
        border-color:rgba(220,38,38,.28);
        box-shadow:0 7px 18px rgba(127,29,29,.065);
      }

      .guia-pendencia-icone {
        background:linear-gradient(145deg,#ef4444,#dc2626);
        box-shadow:none;
      }

      .guia-pendencia-texto strong {
        color:#991b1b;
        letter-spacing:.035em;
      }

      .guia-pendencia-texto small {
        color:#b45353;
        line-height:1.45;
      }

      .guia-pendencia-status {
        align-self:center;
        margin-left:auto;
        padding:3px 6px;
        border-radius:999px;
        background:#fee2e2;
        color:#b91c1c;
        font-size:7px;
        font-weight:950;
        letter-spacing:.05em;
        white-space:nowrap;
      }

      tr.guia-tem-pendencia {
        box-shadow:inset 3px 0 0 #ef4444;
      }


      /* ======================================================
         PREMIUM STATIC DEFINITIVO — v04
         zero movimento visual
      ====================================================== */

      .guia-pendencias-toolbar {
        border:
          1px solid rgba(220,38,38,.16) !important;
        border-radius:16px !important;
        background:
          linear-gradient(
            135deg,
            #ffffff 0%,
            #fffafa 100%
          ) !important;
        box-shadow:
          0 9px 24px rgba(15,23,42,.045),
          inset 4px 0 0 #dc2626 !important;
        animation:none !important;
        transition:none !important;
        transform:none !important;
      }

      .guia-pendencias-alerta {
        background:
          linear-gradient(
            145deg,
            #ef4444,
            #dc2626
          ) !important;
        box-shadow:
          0 6px 14px rgba(220,38,38,.14) !important;
        animation:none !important;
        transition:none !important;
        transform:none !important;
      }

      .guia-pendencias-filtro,
      .guia-pendencias-filtro:hover,
      .guia-pendencias-filtro:focus,
      .guia-pendencias-filtro:active {
        transform:none !important;
        animation:none !important;
        transition:none !important;
      }

      .guia-pendencia-aviso,
      .guia-pendencia-aviso:hover,
      .guia-pendencia-aviso:focus,
      .guia-pendencia-aviso:active {
        border:
          1px solid rgba(220,38,38,.18) !important;
        border-radius:10px !important;
        background:
          linear-gradient(
            135deg,
            #fffefe 0%,
            #fff8f8 100%
          ) !important;
        color:#991b1b !important;
        box-shadow:
          0 4px 12px rgba(15,23,42,.035),
          inset 3px 0 0 #dc2626 !important;
        transform:none !important;
        animation:none !important;
        transition:none !important;
      }

      .guia-pendencia-icone {
        background:#dc2626 !important;
        box-shadow:none !important;
        animation:none !important;
        transition:none !important;
        transform:none !important;
      }

      .guia-pendencia-texto strong {
        color:#a61b1b !important;
      }

      .guia-pendencia-texto small {
        color:#b54747 !important;
      }

      tr.guia-tem-pendencia,
      tr.guia-tem-pendencia:hover {
        background:
          linear-gradient(
            90deg,
            rgba(254,242,242,.28) 0%,
            rgba(255,255,255,0) 26%
          ) !important;
        box-shadow:
          inset 2px 0 0 rgba(220,38,38,.38) !important;
        animation:none !important;
        transition:none !important;
        transform:none !important;
      }

      /* Qualquer filho dos alertas também fica imóvel. */
      #guiaPendenciasPixToolbar *,
      .guia-pendencia-aviso * {
        animation:none !important;
        transition:none !important;
        transform:none !important;
      }

      @media print {
        .guia-pendencias-toolbar {
          display:none !important;
        }
      }
    `;

    document.head.appendChild(
      style
    );
  }

  function encontrarLocalToolbar(
    raiz
  ) {
    const filtros =
      raiz.querySelector(
        "select"
      );

    const painel =
      filtros?.closest(
        ".card, .panel, section"
      );

    if (painel) {
      const tabela =
        painel.querySelector(
          "table"
        );

      if (tabela) {
        return tabela;
      }
    }

    return raiz.querySelector(
      "table"
    );
  }

  function garantirToolbar(
    raiz
  ) {
    let toolbar =
      raiz.querySelector(
        "#guiaPendenciasPixToolbar"
      );

    if (toolbar) {
      return toolbar;
    }

    const tabela =
      encontrarLocalToolbar(
        raiz
      );

    if (!tabela) {
      return null;
    }

    toolbar =
      document.createElement(
        "div"
      );

    toolbar.id =
      "guiaPendenciasPixToolbar";

    toolbar.className =
      "guia-pendencias-toolbar";

    toolbar.hidden =
      true;

    toolbar.innerHTML = `
      <div
        class="guia-pendencias-info"
      >
        <span
          class="guia-pendencias-alerta"
          aria-hidden="true"
        >!</span>

        <span>
          <strong
            data-guia-pendencias-contador
          >
            Informações pendentes
          </strong>

          <small>
            Confira os campos destacados antes do fechamento.
          </small>
        </span>
      </div>

      <button
        type="button"
        class="guia-pendencias-filtro"
        data-guia-filtrar-pendencias
      >
        Mostrar somente pendentes
      </button>
    `;

    tabela.parentElement.insertBefore(
      toolbar,
      tabela
    );

    toolbar
      .querySelector(
        "[data-guia-filtrar-pendencias]"
      )
      .addEventListener(
        "click",
        () => {
          const ativo =
            raiz.classList.toggle(
              "guia-pendencias-filtrar"
            );

          const botao =
            toolbar.querySelector(
              "[data-guia-filtrar-pendencias]"
            );

          botao.classList.toggle(
            "ativo",
            ativo
          );

          botao.textContent =
            ativo
              ? "Mostrar todos"
              : "Mostrar somente pendentes";
        }
      );

    return toolbar;
  }

  function atualizarToolbar(
    raiz,
    quantidadeLinhas,
    quantidadeCampos
  ) {
    const toolbar =
      garantirToolbar(
        raiz
      );

    if (!toolbar) {
      return;
    }

    toolbar.hidden =
      quantidadeLinhas === 0;

    const contador =
      toolbar.querySelector(
        "[data-guia-pendencias-contador]"
      );

    if (!contador) {
      return;
    }

    contador.textContent =
      quantidadeLinhas === 1
        ? `1 lançamento com informação pendente (${quantidadeCampos} campo${quantidadeCampos === 1 ? "" : "s"})`
        : `${quantidadeLinhas} lançamentos com informações pendentes (${quantidadeCampos} campos)`;
  }

  let processando = false;
  let ultimaAssinaturaTabela = "";

  function assinaturaTabelaOriginal(tabela) {
    /*
     * IMPORTANTE:
     * clonamos a tabela e removemos TUDO que foi criado por este guia
     * antes de comparar o conteúdo.
     *
     * Assim o próprio alerta vermelho nunca é interpretado como
     * "mudança da tabela" e não gera um novo render.
     */
    const clone =
      tabela.cloneNode(true);

    clone
      .querySelectorAll(
        ".guia-pendencia-aviso, #guiaPendenciasPixToolbar"
      )
      .forEach(
        elemento =>
          elemento.remove()
      );

    return [...clone.querySelectorAll("tr")]
      .map(
        linha =>
          [...linha.children]
            .map(
              celula =>
                normalizar(
                  celula.textContent
                )
            )
            .join("|")
      )
      .join("||");
  }

  function processar(forcar = false) {
    if (processando) {
      return;
    }

    processando = true;

    try {
      const raiz =
        document.querySelector(
          SELETORES.raiz
        );

      if (!raiz) {
        return;
      }

      const tabela =
        raiz.querySelector(
          "table"
        );

      if (!tabela) {
        return;
      }

      criarEstilos();

      const assinaturaAtual =
        assinaturaTabelaOriginal(
          tabela
        );

      if (
        !forcar &&
        assinaturaAtual ===
          ultimaAssinaturaTabela
      ) {
        return;
      }

      ultimaAssinaturaTabela =
        assinaturaAtual;

      const indices =
        descobrirIndices(
          tabela
        );

      if (
        indices.cargo < 0 ||
        indices.indicadores < 0
      ) {
        return;
      }

      let linhasPendentes = 0;
      let camposPendentes = 0;

      linhasDados(
        tabela
      ).forEach(
        linha => {
          const pendencias =
            analisarLinha(
              linha,
              indices
            );

          if (
            pendencias.length
          ) {
            linhasPendentes += 1;
            camposPendentes +=
              pendencias.length;
          }
        }
      );

      atualizarToolbar(
        raiz,
        linhasPendentes,
        camposPendentes
      );
    } finally {
      processando = false;
    }
  }

  function iniciar() {
    criarEstilos();

    /*
     * Primeira leitura.
     */
    processar(true);

    /*
     * NÃO usamos MutationObserver.
     *
     * O módulo Pix reconstrói trechos da tabela com frequência.
     * Um MutationObserver acabava reagindo também ao alerta criado
     * pelo próprio guia, o que gerava o "pisca-pisca".
     *
     * Agora fazemos uma checagem passiva do conteúdo ORIGINAL.
     * Se os dados não mudaram, não tocamos no DOM.
     */
    window.setInterval(
      () => {
        const raiz =
          document.querySelector(
            SELETORES.raiz
          );

        const tabela =
          raiz?.querySelector(
            "table"
          );

        if (!tabela) {
          return;
        }

        const assinaturaAtual =
          assinaturaTabelaOriginal(
            tabela
          );

        if (
          assinaturaAtual !==
          ultimaAssinaturaTabela
        ) {
          processar(true);
        }
      },
      1000
    );

    /*
     * Filtros do Pix.
     */
    document.addEventListener(
      "change",
      evento => {
        if (
          evento.target.closest(
            "#pix-lancamentos"
          )
        ) {
          window.setTimeout(
            () =>
              processar(true),
            120
          );
        }
      },
      true
    );

    /*
     * Botões que podem trocar semana, filtro, editar ou carregar dados.
     * Uma única checagem após o clique, sem qualquer animação.
     */
    document.addEventListener(
      "click",
      evento => {
        if (
          evento.target.closest(
            "#pix-lancamentos button, #pix-lancamentos [role='button']"
          )
        ) {
          window.setTimeout(
            () =>
              processar(true),
            220
          );
        }
      },
      true
    );

    window.guiaPendenciasPix = {
      versao:
        VERSAO,

      atualizar:
        () =>
          processar(true)
    };

    console.info(
      `[GUIA PENDÊNCIAS PIX] v${VERSAO} — premium estático, sem MutationObserver.`
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      iniciar,
      {
        once:true
      }
    );
  } else {
    iniciar();
  }
})();