/* =========================================================
   PENALIDADES NAS POLÍTICAS
   Compatibilidade de cartões antigos da Oficina

   Salve como:
   politicas-penalidades.js

   Este arquivo acrescenta penalidades apenas quando
   o cartão ainda não possui um bloco próprio de condições.
   Cartões atuais da Oficina e do PIX têm conteúdo próprio e não recebem anexos.

   Não altera cálculos, Firebase, lançamentos, apurações
   ou exportações.
========================================================= */

(() => {
  "use strict";

  const POLITICAS_PRODUTIVOS = {
    "MECANICO PRODUTIVO": {
      titulo: "Penalidades e bloqueios",
      tipo: "danger",
      itens: [
        "Treinamento pendente: desconto de 50% sobre o bônus apurado.",
        "Retrabalho, imperícia, prejuízo ou O.S. interna: inabilitação total na competência.",
        "Produtividade e eficiência precisam atingir simultaneamente as faixas mínimas da campanha.",
        "As horas vendidas precisam representar pelo menos 70% das horas disponíveis."
      ]
    },

    "CHEFE E LIDER": {
      titulo: "Penalidades e bloqueios",
      tipo: "warning",
      itens: [
        "Treinamento individual pendente do chefe ou do líder: inabilitação.",
        "Equipe com menos de 95% dos treinamentos em dia: desconto de 50% sobre o bônus apurado.",
        "O bônus depende exclusivamente dos mecânicos elegíveis da mesma filial e competência.",
        "O Mecânico Líder recebe 50% do valor apurado para o Chefe de Oficina."
      ]
    },

    "CHEFE DE OFICINA E MECANICO LIDER": {
      titulo: "Penalidades e bloqueios",
      tipo: "warning",
      itens: [
        "Treinamento individual pendente do chefe ou do líder: inabilitação.",
        "Equipe com menos de 95% dos treinamentos em dia: desconto de 50% sobre o bônus apurado.",
        "O bônus depende exclusivamente dos mecânicos elegíveis da mesma filial e competência.",
        "O Mecânico Líder recebe 50% do valor apurado para o Chefe de Oficina."
      ]
    },

    "CONTROLADOR": {
      titulo: "Condições e penalidades",
      tipo: "warning",
      itens: [
        "Produtividade e eficiência precisam atingir as faixas mínimas para gerar bonificação.",
        "Quando as duas métricas são atingidas, os respectivos bônus são somados.",
        "Caso nenhuma métrica atinja o mínimo, o colaborador fica não habilitado.",
        "Valores fora da competência ou sem vínculo com a filial não entram na apuração."
      ]
    },

    "CONTROLADOR DE PRODUTIVIDADE": {
      titulo: "Condições e penalidades",
      tipo: "warning",
      itens: [
        "Produtividade e eficiência precisam atingir as faixas mínimas para gerar bonificação.",
        "Quando as duas métricas são atingidas, os respectivos bônus são somados.",
        "Caso nenhuma métrica atinja o mínimo, o colaborador fica não habilitado.",
        "Valores fora da competência ou sem vínculo com a filial não entram na apuração."
      ]
    }
  };

  function normalizar(valor) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  function tituloCard(card) {
    const titulo = card.querySelector("h1, h2, h3, h4, strong");
    return normalizar(titulo?.textContent || "");
  }

  function localizarPolitica(titulo, mapa) {
    if (mapa[titulo]) {
      return mapa[titulo];
    }

    return Object.entries(mapa).find(
      ([chave]) =>
        titulo.includes(chave) ||
        chave.includes(titulo)
    )?.[1];
  }

  function criarBloco(politica) {
    const bloco = document.createElement("section");

    bloco.className =
      `policy-penalty-box type-${politica.tipo}`;

    bloco.innerHTML = `
      <div class="policy-penalty-heading">
        <span class="policy-penalty-icon">!</span>
        <strong>${politica.titulo}</strong>
      </div>

      <ul>
        ${politica.itens
          .map(item => `<li>${item}</li>`)
          .join("")}
      </ul>
    `;

    return bloco;
  }

  function aplicarPoliticas(viewSelector, cardSelector, mapa) {
    const view = document.querySelector(viewSelector);

    if (!view) {
      return;
    }

    [...view.querySelectorAll(cardSelector)].forEach(card => {
      // Os cartões atuais já apresentam condições completas na fonte.
      if (card.matches('.ip-card') || card.closest('[data-policy-managed="true"]')) {
        card.querySelectorAll('.policy-penalty-box').forEach(bloco => bloco.remove());
        return;
      }
      /*
       * A aba de Políticas dos Produtivos agora já possui
       * os blocos completos de valores, condições e penalidades
       * diretamente no HTML.
       *
       * Portanto, não devemos anexar novamente o bloco antigo.
       * A regra continua funcionando normalmente para as políticas
       * do Pix e para cartões antigos que ainda não tenham alertas.
       */
      if (
        card.querySelector(
          ".policy-penalty-box, .policy-alert"
        )
      ) {
        return;
      }

      const politica =
        localizarPolitica(
          tituloCard(card),
          mapa
        );

      if (politica) {
        card.appendChild(
          criarBloco(politica)
        );
      }
    });
  }

  function atualizar() {
    aplicarPoliticas(
      "#politicas",
      ".policy-card, .card, article",
      POLITICAS_PRODUTIVOS
    );

    // O PIX possui suas regras no renderizador oficial, inclusive por competência.
    // Remova apenas resumos antigos que tenham sobrevivido a uma atualização da tela.
    const pix = document.querySelector('#pix-politicas');
    if (pix?.querySelector('[data-policy-managed="true"]')) {
      pix.querySelectorAll('.policy-penalty-box, .pix-general-penalty-summary').forEach(bloco => bloco.remove());
    }
  }

  function iniciar() {
    atualizar();

    new MutationObserver(atualizar).observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

    document.addEventListener(
      "click",
      evento => {
        if (
          evento.target.closest(
            '[data-view="politicas"], ' +
            '[data-pix-view="politicas"], ' +
            ".pix-menu-btn, .nav-btn"
          )
        ) {
          setTimeout(atualizar, 120);
        }
      },
      true
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      iniciar,
      { once: true }
    );
  } else {
    iniciar();
  }
})();