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

  const POLITICAS_PIX = {
    "CONSULTOR TECNICO": {
      titulo: "Penalidades e condições",
      tipo: "warning",
      itens: [
        "O bônus-base e o bônus de ticket somente são pagos quando a meta semanal atingir 100%.",
        "O NPS é independente da meta semanal, porém só é pago quando o realizado atingir ou superar a meta de NPS.",
        "Na Semana 4, O.S. em aberto acima de 28% gera penalidade de 50% sobre o total apurado da semana."
      ]
    },

    "SUPERVISOR DE ASSISTENCIA": {
      titulo: "Penalidades e condições",
      tipo: "warning",
      itens: [
        "O bônus-base e o bônus de ticket somente são pagos quando a meta semanal atingir 100%.",
        "O NPS é independente da meta semanal, porém só é pago quando o realizado atingir ou superar a meta de NPS.",
        "Na Semana 4, O.S. em aberto acima de 28% gera penalidade de 50% sobre o total apurado da semana."
      ]
    },

    "CONSULTOR PECAS BALCAO": {
      titulo: "Penalidades e condições",
      tipo: "warning",
      itens: [
        "O bônus-base e o bônus de margem somente são pagos quando a meta semanal atingir 100%.",
        "Este cargo não possui pagamento de NPS.",
        "Margem abaixo da faixa mínima não gera bônus adicional."
      ]
    },

    "SUPERVISOR PECAS": {
      titulo: "Penalidades e condições",
      tipo: "warning",
      itens: [
        "O bônus-base e o bônus de margem somente são pagos quando a meta semanal atingir 100%.",
        "Este cargo não possui pagamento de NPS.",
        "Margem abaixo da faixa mínima não gera bônus adicional."
      ]
    },

    "SUPERVISOR POS-VENDAS": {
      titulo: "Penalidades e condições",
      tipo: "warning",
      itens: [
        "O bônus-base e o bônus de ticket somente são pagos quando a meta semanal atingir 100%.",
        "O NPS é independente da meta semanal, porém só é pago quando o realizado atingir ou superar a meta de NPS.",
        "Na Semana 4, O.S. em aberto acima de 28% gera penalidade de 50% sobre o total apurado da semana."
      ]
    },

    "COORDENADOR": {
      titulo: "Penalidades e condições",
      tipo: "warning",
      itens: [
        "O bônus-base e o bônus de ticket somente são pagos quando a meta semanal atingir 100%.",
        "O NPS é independente da meta semanal, porém só é pago quando o realizado atingir ou superar a meta de NPS.",
        "Na Semana 4, O.S. em aberto acima de 28% gera penalidade de 50% sobre o total apurado da semana."
      ]
    },

    "GERENTE": {
      titulo: "Penalidades e condições",
      tipo: "warning",
      itens: [
        "O bônus-base e o bônus de ticket somente são pagos quando a meta semanal atingir 100%.",
        "O NPS é independente da meta semanal, porém só é pago quando o realizado atingir ou superar a meta de NPS.",
        "Na Semana 4, O.S. em aberto acima de 28% gera penalidade de 50% sobre o total apurado da semana."
      ]
    },

    "ORCAMENTISTA / FACILITADOR DE NEGOCIOS": {
      titulo: "Penalidades e condições",
      tipo: "warning",
      itens: [
        "O bônus-base e o bônus de ticket somente são pagos quando a meta semanal atingir 100%.",
        "Este cargo não possui pagamento de NPS.",
        "Ticket abaixo da faixa mínima não gera bônus adicional."
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
      if (card.querySelector(".policy-penalty-box")) {
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

  function adicionarResumoPix() {
    const view =
      document.querySelector("#pix-politicas");

    if (
      !view ||
      view.querySelector(
        ".pix-general-penalty-summary"
      )
    ) {
      return;
    }

    const referencia =
      view.querySelector(
        ".pix-policy-grid, .policy-grid"
      );

    if (!referencia) {
      return;
    }

    const resumo =
      document.createElement("section");

    resumo.className =
      "pix-general-penalty-summary";

    resumo.innerHTML = `
      <div>
        <span class="policy-summary-eyebrow">
          Regra geral
        </span>

        <h3>
          Penalidades do Pix do Presidente
        </h3>
      </div>

      <div class="policy-summary-items">
        <p>
          <strong>Meta semanal:</strong>
          bônus-base e bônus de faixa dependem de 100% de atingimento.
        </p>

        <p>
          <strong>NPS:</strong>
          é independente da meta semanal, mas só é pago quando o realizado atingir ou superar a meta de NPS.
        </p>

        <p>
          <strong>Semana 4:</strong>
          O.S. em aberto acima de 28% aplica penalidade de 50% sobre o total apurado da semana.
        </p>
      </div>
    `;

    referencia.insertAdjacentElement(
      "afterend",
      resumo
    );
  }

  function atualizar() {
    aplicarPoliticas(
      "#politicas",
      ".policy-card, .card, article",
      POLITICAS_PRODUTIVOS
    );

    aplicarPoliticas(
      "#pix-politicas",
      ".pix-policy-card, .policy-card, article",
      POLITICAS_PIX
    );

    adicionarResumoPix();
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