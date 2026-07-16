
(() => {
  "use strict";

  const estadoOrdenacaoPix = {
    campo: "colaborador",
    direcao: "asc"
  };

  const SELETORES_TABELA_PIX = [
    "#tabelaPixLancamentos",
    "#pixTabelaLancamentos",
    "#tabelaLancamentosPix",
    "#pix-lancamentos table tbody",
    "#pixLancamentos tbody"
  ];

  const SELETORES_DASHBOARD_PIX = [
    "#pix-dashboard",
    "#pixDashboard",
    "#pixPresidente .pix-subview.active",
    "#pixPresidente"
  ];

  function selecionar(seletor) {
    return document.querySelector(seletor);
  }

  function selecionarTodos(seletor) {
    return [...document.querySelectorAll(seletor)];
  }

  function normalizarTexto(valor) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();
  }

  function extrairNumero(valor) {
    const texto = String(valor ?? "")
      .replace(/\s/g, "")
      .replace(/R\$/gi, "")
      .replace(/%/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");

    const numero = Number(texto);

    return Number.isFinite(numero)
      ? numero
      : 0;
  }

  function formatarMoeda(valor) {
    return Number(valor || 0)
      .toLocaleString(
        "pt-BR",
        {
          style: "currency",
          currency: "BRL"
        }
      );
  }

  function formatarPercentual(valor) {
    return `${Number(valor || 0)
      .toLocaleString(
        "pt-BR",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )}%`;
  }

  function competenciaAtivaPix() {
    return (
      selecionar("#pixCompetenciaGlobal")?.value ||
      selecionar("#competenciaPix")?.value ||
      selecionar("#competenciaGlobal")?.value ||
      ""
    );
  }

  function localizarTabelaPix() {
    for (const seletor of SELETORES_TABELA_PIX) {
      const tabela = selecionar(seletor);

      if (tabela) {
        return tabela.tagName === "TBODY"
          ? tabela
          : tabela.querySelector("tbody") || tabela;
      }
    }

    return null;
  }

  function localizarDashboardPix() {
    for (const seletor of SELETORES_DASHBOARD_PIX) {
      const elemento = selecionar(seletor);

      if (elemento) {
        return elemento;
      }
    }

    return null;
  }

  function criarEstruturaHistoricoPix() {
    if (selecionar("#pixHistoricoIndividual")) {
      return selecionar("#pixHistoricoIndividual");
    }

    const dashboard = localizarDashboardPix();

    if (!dashboard) {
      console.warn(
        "Não foi possível localizar a área do dashboard do Pix."
      );

      return null;
    }

    const secao = document.createElement("article");

    secao.id = "pixHistoricoIndividual";
    secao.className = "panel history-panel pix-history-panel";

    secao.innerHTML = `
      <div class="pix-history-header">
        <div>
          <p class="eyebrow">
            Histórico e avaliação
          </p>

          <h2>
            Resultado individual do mês
          </h2>
        </div>

        <div
          id="pixHistoricoResumo"
          class="pix-history-summary"
        >
          0 avaliados
          <strong>0</strong> atingiram
          <strong>0</strong> não atingiram
        </div>
      </div>

      <div class="table-wrap">
        <table
          id="pixHistoricoTabela"
          class="history-table"
          data-history-table="pix"
        >
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  data-pix-sort="colaborador"
                >
                  Colaborador
                </button>
              </th>

              <th>
                <button
                  type="button"
                  data-pix-sort="filial"
                >
                  Filial
                </button>
              </th>

              <th>
                <button
                  type="button"
                  data-pix-sort="cargo"
                >
                  Cargo
                </button>
              </th>

              <th>
                <button
                  type="button"
                  data-pix-sort="semanas"
                >
                  Semanas
                </button>
              </th>

              <th>
                <button
                  type="button"
                  data-pix-sort="faturamento"
                >
                  Bonif. faturamento
                </button>
              </th>

              <th>
                <button
                  type="button"
                  data-pix-sort="ticket"
                >
                  Bônus ticket
                </button>
              </th>

              <th>
                <button
                  type="button"
                  data-pix-sort="nps"
                >
                  NPS
                </button>
              </th>

              <th>
                <button
                  type="button"
                  data-pix-sort="penalidade"
                >
                  Penalidade
                </button>
              </th>

              <th>
                <button
                  type="button"
                  data-pix-sort="total"
                >
                  Total
                </button>
              </th>

              <th>
                <button
                  type="button"
                  data-pix-sort="status"
                >
                  Status
                </button>
              </th>

              <th>
                <button
                  type="button"
                  data-pix-sort="avaliacao"
                >
                  Avaliação
                </button>
              </th>
            </tr>
          </thead>

          <tbody id="pixHistoricoTabelaBody"></tbody>
        </table>
      </div>
    `;

    dashboard.appendChild(secao);

    configurarOrdenacaoPix(secao);

    return secao;
  }

  function mapearCelulasPorCabecalho(tabela) {
    const tabelaCompleta = tabela.closest("table");

    if (!tabelaCompleta) {
      return {};
    }

    const cabecalhos = [
      ...tabelaCompleta.querySelectorAll("thead th")
    ];

    const mapa = {};

    cabecalhos.forEach((th, indice) => {
      const texto = normalizarTexto(th.textContent);

      if (texto.includes("COMPET")) mapa.competencia = indice;
      if (texto.includes("SEMANA")) mapa.semana = indice;
      if (texto.includes("FILIAL")) mapa.filial = indice;
      if (texto.includes("COLABORADOR")) mapa.colaborador = indice;
      if (texto.includes("CARGO")) mapa.cargo = indice;
      if (texto.includes("BONIF") && texto.includes("FAT")) mapa.faturamento = indice;
      if (texto.includes("TICKET")) mapa.ticket = indice;
      if (texto === "NPS" || texto.includes(" NPS")) mapa.nps = indice;
      if (texto.includes("PENALIDADE")) mapa.penalidade = indice;
      if (texto === "TOTAL" || texto.includes(" TOTAL")) mapa.total = indice;
      if (texto.includes("STATUS")) mapa.status = indice;
    });

    return mapa;
  }

  function valorCelula(celulas, indice) {
    return indice === undefined
      ? ""
      : celulas[indice]?.textContent?.trim() || "";
  }

  function extrairDadosLancamentosPix() {
    const tbody = localizarTabelaPix();

    if (!tbody) {
      return [];
    }

    const mapa = mapearCelulasPorCabecalho(tbody);
    const competencia = competenciaAtivaPix();

    return [...tbody.querySelectorAll("tr")]
      .map(linha => {
        const celulas = [...linha.children];

        if (!celulas.length) {
          return null;
        }

        const competenciaLinha = valorCelula(
          celulas,
          mapa.competencia ?? 0
        );

        if (
          competencia &&
          competenciaLinha &&
          competenciaLinha !== competencia
        ) {
          return null;
        }

        const colaborador = valorCelula(
          celulas,
          mapa.colaborador ?? 3
        );

        if (!colaborador) {
          return null;
        }

        return {
          competencia: competenciaLinha,
          semana: valorCelula(celulas, mapa.semana ?? 1),
          filial: valorCelula(celulas, mapa.filial ?? 2),
          colaborador,
          cargo: valorCelula(celulas, mapa.cargo ?? 4),
          faturamento: extrairNumero(
            valorCelula(celulas, mapa.faturamento ?? 6)
          ),
          ticket: extrairNumero(
            valorCelula(celulas, mapa.ticket ?? 7)
          ),
          nps: extrairNumero(
            valorCelula(celulas, mapa.nps ?? 8)
          ),
          penalidade: extrairNumero(
            valorCelula(celulas, mapa.penalidade ?? 9)
          ),
          total: extrairNumero(
            valorCelula(celulas, mapa.total ?? 10)
          ),
          status: valorCelula(celulas, mapa.status ?? 11)
        };
      })
      .filter(Boolean);
  }

  function consolidarPorColaborador(lancamentos) {
    const agrupados = new Map();

    for (const item of lancamentos) {
      const chave = [
        normalizarTexto(item.colaborador),
        normalizarTexto(item.filial),
        normalizarTexto(item.cargo)
      ].join("||");

      if (!agrupados.has(chave)) {
        agrupados.set(
          chave,
          {
            colaborador: item.colaborador,
            filial: item.filial,
            cargo: item.cargo,
            semanasSet: new Set(),
            faturamento: 0,
            ticket: 0,
            nps: 0,
            penalidade: 0,
            total: 0,
            habilitados: 0,
            naoHabilitados: 0
          }
        );
      }

      const grupo = agrupados.get(chave);

      if (item.semana) {
        grupo.semanasSet.add(item.semana);
      }

      grupo.faturamento += item.faturamento;
      grupo.ticket += item.ticket;
      grupo.nps += item.nps;
      grupo.penalidade += item.penalidade;
      grupo.total += item.total;

      if (
        normalizarTexto(item.status).includes("HABILITADO") &&
        !normalizarTexto(item.status).includes("NAO")
      ) {
        grupo.habilitados += 1;
      } else {
        grupo.naoHabilitados += 1;
      }
    }

    return [...agrupados.values()]
      .map(grupo => {
        const semanas = grupo.semanasSet.size;
        const atingiu = grupo.habilitados > 0;

        return {
          colaborador: grupo.colaborador,
          filial: grupo.filial,
          cargo: grupo.cargo,
          semanas,
          faturamento: grupo.faturamento,
          ticket: grupo.ticket,
          nps: grupo.nps,
          penalidade: grupo.penalidade,
          total: grupo.total,
          status: atingiu
            ? "HABILITADO"
            : "NÃO HABILITADO",
          avaliacao: atingiu
            ? "Meta atingida"
            : "Meta não atingida"
        };
      });
  }

  function compararValores(a, b, campo, direcao) {
    const numericos = [
      "semanas",
      "faturamento",
      "ticket",
      "nps",
      "penalidade",
      "total"
    ];

    let resultado;

    if (numericos.includes(campo)) {
      resultado = Number(a[campo] || 0) - Number(b[campo] || 0);
    } else {
      resultado = String(a[campo] || "")
        .localeCompare(
          String(b[campo] || ""),
          "pt-BR",
          {
            sensitivity: "base"
          }
        );
    }

    return direcao === "asc"
      ? resultado
      : -resultado;
  }

  function renderizarHistoricoPix() {
    const secao = criarEstruturaHistoricoPix();

    if (!secao) {
      return;
    }

    const body = selecionar("#pixHistoricoTabelaBody");
    const resumo = selecionar("#pixHistoricoResumo");

    if (!body || !resumo) {
      return;
    }

    const consolidados = consolidarPorColaborador(
      extrairDadosLancamentosPix()
    );

    const ordenados = [...consolidados].sort(
      (a, b) =>
        compararValores(
          a,
          b,
          estadoOrdenacaoPix.campo,
          estadoOrdenacaoPix.direcao
        )
    );

    const atingiram = consolidados.filter(
      item => item.status === "HABILITADO"
    ).length;

    const naoAtingiram = consolidados.length - atingiram;

    resumo.innerHTML = `
      <strong>${consolidados.length}</strong> avaliados
      <strong>${atingiram}</strong> atingiram
      <strong>${naoAtingiram}</strong> não atingiram
    `;

    if (!ordenados.length) {
      body.innerHTML = `
        <tr>
          <td
            colspan="11"
            class="empty"
          >
            Nenhum lançamento do Pix encontrado para esta competência.
          </td>
        </tr>
      `;

      atualizarVisualOrdenacaoPix();

      return;
    }

    body.innerHTML = ordenados.map(item => `
      <tr>
        <td>
          <strong>
            ${item.colaborador}
          </strong>
        </td>

        <td>
          ${item.filial}
        </td>

        <td>
          ${item.cargo}
        </td>

        <td>
          ${item.semanas}
        </td>

        <td>
          ${formatarMoeda(item.faturamento)}
        </td>

        <td>
          ${formatarMoeda(item.ticket)}
        </td>

        <td>
          ${formatarMoeda(item.nps)}
        </td>

        <td class="pix-penalty-value">
          ${formatarMoeda(item.penalidade)}
        </td>

        <td>
          <strong>
            ${formatarMoeda(item.total)}
          </strong>
        </td>

        <td>
          <span class="badge ${item.status === "HABILITADO" ? "ok" : "no"}">
            ${item.status}
          </span>
        </td>

        <td>
          ${item.avaliacao}
        </td>
      </tr>
    `).join("");

    atualizarVisualOrdenacaoPix();
  }

  function direcaoInicial(campo) {
    const numericos = [
      "semanas",
      "faturamento",
      "ticket",
      "nps",
      "penalidade",
      "total"
    ];

    return numericos.includes(campo)
      ? "desc"
      : "asc";
  }

  function configurarOrdenacaoPix(secao) {
    secao.querySelectorAll("[data-pix-sort]")
      .forEach(botao => {
        botao.addEventListener("click", () => {
          const campo = botao.dataset.pixSort;

          if (estadoOrdenacaoPix.campo === campo) {
            estadoOrdenacaoPix.direcao =
              estadoOrdenacaoPix.direcao === "asc"
                ? "desc"
                : "asc";
          } else {
            estadoOrdenacaoPix.campo = campo;
            estadoOrdenacaoPix.direcao = direcaoInicial(campo);
          }

          renderizarHistoricoPix();
        });
      });
  }

  function atualizarVisualOrdenacaoPix() {
    selecionarTodos("[data-pix-sort]")
      .forEach(botao => {
        botao.classList.remove("asc", "desc");
        botao.removeAttribute("data-sort-direction");

        if (
          botao.dataset.pixSort ===
          estadoOrdenacaoPix.campo
        ) {
          botao.classList.add(
            estadoOrdenacaoPix.direcao
          );

          botao.dataset.sortDirection =
            estadoOrdenacaoPix.direcao;
        }
      });
  }

  function observarMudancasPix() {
    const tabela = localizarTabelaPix();

    if (tabela) {
      const observador = new MutationObserver(
        () => renderizarHistoricoPix()
      );

      observador.observe(
        tabela,
        {
          childList: true,
          subtree: true
        }
      );
    }

    [
      "#pixCompetenciaGlobal",
      "#competenciaPix",
      "#competenciaGlobal"
    ].forEach(seletor => {
      selecionar(seletor)
        ?.addEventListener(
          "change",
          () => renderizarHistoricoPix()
        );
    });

    document.addEventListener(
      "click",
      evento => {
        if (
          evento.target.closest(
            "[data-pix-view='dashboard'], " +
            ".pix-menu-btn, " +
            "[data-module-toggle='pix']"
          )
        ) {
          setTimeout(
            renderizarHistoricoPix,
            150
          );
        }
      }
    );
  }

  function iniciar() {
    criarEstruturaHistoricoPix();
    observarMudancasPix();
    renderizarHistoricoPix();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      iniciar,
      {
        once: true
      }
    );
  } else {
    iniciar();
  }

  window.pixHistoricoIndividual = {
    renderizar: renderizarHistoricoPix
  };
})();