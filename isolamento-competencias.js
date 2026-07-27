/*
===============================================================================
ISOLAMENTO DE COMPETÊNCIAS — PIX E PRODUTIVOS
Arquivo: isolamento-competencias.js
Versão: 2026.07.24-02

CORREÇÃO DE DESEMPENHO:
- removido MutationObserver sobre todo o document.body;
- removidos disparos contínuos de eventos;
- sincronização somente quando o mês realmente muda;
- proteção contra chamadas repetidas.
===============================================================================
*/

(() => {
  "use strict";

  const VERSAO =
    "2026.07.24-02";

  const $ = seletor =>
    document.querySelector(seletor);

  let sincronizando =
    false;

  let ultimaCompetencia =
    "";

  let temporizador =
    null;

  function competenciaAtiva() {
    return (
      $("#competenciaGlobal")?.value ||
      $("#pixDashboardCompetencia")?.value ||
      new Date()
        .toISOString()
        .slice(0, 7)
    );
  }

  function garantirOpcao(
    campo,
    competencia
  ) {
    if (!campo) return;

    const existe =
      [...campo.options].some(
        opcao =>
          opcao.value === competencia
      );

    if (!existe) {
      const opcao =
        document.createElement(
          "option"
        );

      opcao.value =
        competencia;

      opcao.textContent =
        competencia;

      campo.appendChild(
        opcao
      );
    }
  }

  function atualizarSelect(
    seletor,
    competencia,
    dispararMudanca = false
  ) {
    const campo =
      $(seletor);

    if (!campo) {
      return false;
    }

    garantirOpcao(
      campo,
      competencia
    );

    if (
      campo.value === competencia
    ) {
      return false;
    }

    campo.value =
      competencia;

    if (dispararMudanca) {
      campo.dispatchEvent(
        new Event(
          "change",
          {
            bubbles: true
          }
        )
      );
    }

    return true;
  }

  function atualizarCampo(
    seletor,
    competencia
  ) {
    const campo =
      $(seletor);

    if (
      campo &&
      campo.value !== competencia
    ) {
      campo.value =
        competencia;
    }
  }

  function sincronizarAgora(
    forcar = false
  ) {
    if (sincronizando) {
      return;
    }

    const competencia =
      competenciaAtiva();

    if (
      !competencia ||
      (
        !forcar &&
        ultimaCompetencia === competencia
      )
    ) {
      return;
    }

    sincronizando =
      true;

    try {
      if (
        typeof window.sincronizarCompetenciaPix ===
          "function"
      ) {
        window.sincronizarCompetenciaPix(
          competencia,
          "global"
        );
      } else {
        atualizarSelect(
          "#pixFiltroCompetenciaLancamento",
          competencia,
          true
        );

        atualizarSelect(
          "#pixFiltroCompetenciaApuracao",
          competencia,
          true
        );
      }

      atualizarSelect(
        "#filtroCompetenciaLancamento",
        competencia,
        true
      );

      atualizarSelect(
        "#filtroCompetenciaApuracao",
        competencia,
        true
      );

      [
        "#lancamentoCompetencia",
        "#pixLancamentoCompetencia",
        "#irsCompetencia"
      ].forEach(seletor =>
        atualizarCampo(
          seletor,
          competencia
        )
      );

      ultimaCompetencia =
        competencia;
    } finally {
      sincronizando =
        false;
    }
  }

  function agendarSincronizacao(
    forcar = false
  ) {
    window.clearTimeout(
      temporizador
    );

    temporizador =
      window.setTimeout(
        () =>
          sincronizarAgora(
            forcar
          ),
        60
      );
  }

  function configurarEventos() {
    $("#competenciaGlobal")
      ?.addEventListener(
        "change",
        () =>
          agendarSincronizacao(
            true
          )
      );

    [
      "#btnMesAnterior",
      "#btnMesSeguinte"
    ].forEach(seletor => {
      $(seletor)
        ?.addEventListener(
          "click",
          () =>
            agendarSincronizacao(
              true
            )
        );
    });

    document.addEventListener(
      "click",
      evento => {
        const alvo =
          evento.target.closest(
            [
              "#btnNovoLancamento",
              "#btnNovoLancamentoPix",
              "#btnImportarRelatorioPix",
              "#btnImportarRelatorioProdutivos",
              "[data-evidencia]",
              "[data-evidencia-pix]"
            ].join(",")
          );

        if (alvo) {
          agendarSincronizacao(
            true
          );
        }
      }
    );
  }

  function iniciar() {
    configurarEventos();

    sincronizarAgora(
      true
    );

    window.setTimeout(
      () =>
        sincronizarAgora(
          true
        ),
      800
    );

    window.isolamentoCompetencias = {
      versao:
        VERSAO,
      sincronizar:
        () =>
          sincronizarAgora(
            true
          ),
      competenciaAtiva
    };

    console.info(
      `[COMPETÊNCIAS] ${VERSAO} carregado sem observador contínuo`
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
        once: true
      }
    );
  } else {
    iniciar();
  }
})();