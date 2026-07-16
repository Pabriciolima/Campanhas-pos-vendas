import { firestore } from "./firebase-config.js";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

console.info(
  "[PIX] Versão 2026.07.14-01 carregada"
);


/* =========================================================
   INTEGRAÇÃO COM A CENTRAL DE ALERTAS PREMIUM
   Não altera as regras do Pix.
========================================================= */

function pixAlert(
  mensagem,
  opcoes = {}
) {
  if (
    window.CampanhaUI &&
    typeof window.CampanhaUI.alert === "function"
  ) {
    return window.CampanhaUI.alert(
      mensagem,
      opcoes
    );
  }

  window.alert(mensagem);
  return Promise.resolve(true);
}

async function pixDeleteConfirm({
  titulo = "Excluir item?",
  mensagem = "Esta ação não poderá ser desfeita.",
  textoConfirmar = "Excluir",
  textoCancelar = "Cancelar"
} = {}) {
  if (
    window.CampanhaUI &&
    typeof window.CampanhaUI.deleteConfirm === "function"
  ) {
    return window.CampanhaUI.deleteConfirm({
      titulo,
      mensagem,
      textoConfirmar,
      textoCancelar
    });
  }

  return window.confirm(mensagem);
}

/* =========================================================
   PIX DO PRESIDENTE — MÓDULO COMPLETO E ISOLADO
========================================================= */

const PIX_INICIO = "2026-06";
const LIMITE_OS_ABERTA = 28;
const PENALIDADE_OS = 0.5;

const FILIAIS_PIX = [
  { dn: "4700", unidade: "ANANINDEUA" },
  { dn: "4731", unidade: "SÃO LUIS" },
  { dn: "1960", unidade: "BACABAL" },
  { dn: "4756", unidade: "MACAPÁ" },
  { dn: "4730", unidade: "TERESINA" },
  { dn: "4730", unidade: "URUÇUI" },
  { dn: "1928", unidade: "SINOP" },
  { dn: "4738", unidade: "CUIABÁ" },
  { dn: "4738", unidade: "AGUA BOA" },
  { dn: "4774", unidade: "RONDONOPOLIS" },
  { dn: "4977", unidade: "PORTO VELHO" },
  { dn: "4977", unidade: "JIPARANÁ" },
  { dn: "1970", unidade: "VILHENA" }
];

const CARGOS_PIX = [
  "Consultor Técnico",
  "Supervisor de Assistência",
  "Consultor Peças Balcão",
  "Supervisor Peças",
  "Supervisor Pós-vendas",
  "Coordenador",
  "Gerente",
  "Orçamentista / Facilitador de Negócios"
];

const POLITICAS_PIX = {
  "Consultor Técnico": {
    metrica: "ticket",
    bonusBase: 600,
    bonusNps: 1000,
    objetivoNps: "Objetivo individual",
    faixas: [
      { minimo: 7300, bonus: 500 },
      { minimo: 7500, bonus: 600 },
      { minimo: 7800, bonus: 700 },
      { minimo: 8100, bonus: 800 }
    ]
  },

  "Supervisor de Assistência": {
    metrica: "ticket",
    bonusBase: 900,
    bonusNps: 1000,
    objetivoNps: "Objetivo da unidade",
    faixas: [
      { minimo: 7300, bonus: 600 },
      { minimo: 7500, bonus: 700 },
      { minimo: 7800, bonus: 800 },
      { minimo: 8100, bonus: 900 }
    ]
  },

  "Consultor Peças Balcão": {
    metrica: "margem",
    bonusBase: 800,
    bonusNps: 0,
    objetivoNps: "",
    faixas: [
      { minimo: 20, bonus: 300 },
      { minimo: 25, bonus: 400 },
      { minimo: 30, bonus: 500 },
      { minimo: 35, bonus: 600 }
    ]
  },

  "Supervisor Peças": {
    metrica: "margem",
    bonusBase: 900,
    bonusNps: 0,
    objetivoNps: "",
    faixas: [
      { minimo: 20, bonus: 300 },
      { minimo: 25, bonus: 400 },
      { minimo: 30, bonus: 500 },
      { minimo: 35, bonus: 600 }
    ]
  },

  "Supervisor Pós-vendas": {
    metrica: "ticket",
    bonusBase: 900,
    bonusNps: 1000,
    objetivoNps: "Objetivo da unidade",
    faixas: [
      { minimo: 7300, bonus: 600 },
      { minimo: 7500, bonus: 700 },
      { minimo: 7800, bonus: 800 },
      { minimo: 8100, bonus: 900 }
    ]
  },

  "Coordenador": {
    metrica: "ticket",
    bonusBase: 1000,
    bonusNps: 1000,
    objetivoNps: "Objetivo da unidade",
    faixas: [
      { minimo: 7300, bonus: 600 },
      { minimo: 7500, bonus: 700 },
      { minimo: 7800, bonus: 800 },
      { minimo: 8100, bonus: 900 }
    ]
  },

  "Gerente": {
    metrica: "ticket",
    bonusBase: 1100,
    bonusNps: 1000,
    objetivoNps: "Objetivo do núcleo",
    faixas: [
      { minimo: 7300, bonus: 600 },
      { minimo: 7500, bonus: 700 },
      { minimo: 7800, bonus: 800 },
      { minimo: 8100, bonus: 900 }
    ]
  },

  "Orçamentista / Facilitador de Negócios": {
    metrica: "ticket",
    bonusBase: 300,
    bonusNps: 0,
    objetivoNps: "",
    faixas: [
      { minimo: 7300, bonus: 400 },
      { minimo: 7500, bonus: 500 },
      { minimo: 7800, bonus: 600 },
      { minimo: 8100, bonus: 700 }
    ]
  }
};

const estadoPix = {
  funcionarios: [],
  lancamentos: [],
  resultados: []
};

const funcionariosPixRef = collection(
  firestore,
  "pix_presidente_funcionarios"
);
const lancamentosPixRef = collection(
  firestore,
  "pix_presidente_lancamentos"
);

function $(seletor) {
  return document.querySelector(seletor);
}

function pixNumero(valor) {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  let texto = String(valor ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/R\$/g, "")
    .replace(/%/g, "");

  if (!texto) return 0;

  if (texto.includes(",")) {
    texto = texto
      .replace(/\./g, "")
      .replace(",", ".");
  }

  texto = texto.replace(/[^\d.-]/g, "");

  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : 0;
}

function pixMoeda(valor) {
  return pixNumero(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function pixPct(valor) {
  return `${pixNumero(valor)
    .toFixed(2)
    .replace(".", ",")}%`;
}

function pixMesAtual() {
  return new Date().toISOString().slice(0, 7);
}

function pixFuncionarioPorId(id) {
  return estadoPix.funcionarios.find(
    funcionario => funcionario.id === id
  );
}

function pixFilialPorNome(nome) {
  return FILIAIS_PIX.find(
    filial => filial.unidade === nome
  );
}

function pixPolitica(cargo) {
  return POLITICAS_PIX[cargo] || null;
}

function pixBonusFaixa(politica, valor) {
  if (!politica) return 0;

  return politica.faixas.reduce(
    (bonus, faixa) =>
      valor >= faixa.minimo ? faixa.bonus : bonus,
    0
  );
}

function normalizarTextoPix(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function funcionarioPixAtivo(funcionario) {
  /*
   * Aceita boolean true, string "true" e registros antigos
   * sem o campo ativo. Somente false explícito é tratado
   * como inativo.
   */
  return !(
    funcionario?.ativo === false ||
    funcionario?.ativo === "false"
  );
}

function participantePixValido(funcionario) {
  if (!funcionario) {
    return false;
  }

  const cargoNormalizado =
    normalizarTextoPix(
      funcionario.cargo
    );

  return CARGOS_PIX.some(
    cargo =>
      normalizarTextoPix(
        cargo
      ) === cargoNormalizado
  );
}

function calcularPix(lancamento) {
  const funcionario =
    pixFuncionarioPorId(lancamento.funcionarioId);

  const cargo =
    funcionario?.cargo ||
    lancamento.cargo;

  const politica = pixPolitica(cargo);

  if (!politica) {
    return {
      ...lancamento,
      nome:
        funcionario?.nome ||
        lancamento.nome ||
        "Colaborador não localizado",
      cargo,
      filial:
        funcionario?.filial ||
        lancamento.filial,
      dn:
        funcionario?.dn ||
        lancamento.dn,
      percentualMeta: 0,
      bonusBase: 0,
      bonusFaixa: 0,
      bonusNps: 0,
      penalidade: 0,
      bonusFinal: 0,
      status: "NÃO HABILITADO",
      observacao: "Cargo não pertence ao Pix do Presidente."
    };
  }

  const meta = pixNumero(lancamento.metaSemanal);
  const realizado = pixNumero(lancamento.realizadoSemanal);

  const percentualMeta =
    meta > 0 ? realizado / meta * 100 : 0;

  const atingiuMeta = percentualMeta >= 100;

  const indicador =
    politica.metrica === "margem"
      ? pixNumero(lancamento.margem)
      : pixNumero(lancamento.ticketMedio);

  const bonusBase =
    atingiuMeta ? politica.bonusBase : 0;

  const bonusFaixa =
    atingiuMeta
      ? pixBonusFaixa(politica, indicador)
      : 0;

  /*
   * NPS é mensal e entra no fechamento da Semana 4.
   * Ele não depende da meta semanal, mas depende do atingimento
   * da própria meta de NPS informada pelo usuário.
   */
  const metaNps =
    pixNumero(
      lancamento.metaNps
    );

  const realizadoNps =
    pixNumero(
      lancamento.realizadoNps
    );

  const percentualNps =
    metaNps > 0
      ? realizadoNps / metaNps * 100
      : 0;

  const atingiuNps =
    metaNps > 0 &&
    realizadoNps >= metaNps;

  const bonusNps =
    Number(lancamento.semana) === 4 &&
    atingiuNps
      ? politica.bonusNps
      : 0;

  const subtotal =
    bonusBase + bonusFaixa + bonusNps;

  const osAberta =
    pixNumero(lancamento.osAbertaPercentual);

  const aplicaPenalidade =
    Number(lancamento.semana) === 4 &&
    osAberta > LIMITE_OS_ABERTA;

  const penalidade =
    aplicaPenalidade
      ? subtotal * PENALIDADE_OS
      : 0;

  const bonusFinal =
    Math.max(0, subtotal - penalidade);

  let observacao = "";

  if (!atingiuMeta && bonusNps > 0) {
    observacao =
      "NPS atingido e pago mesmo sem atingir a meta semanal.";
  } else if (
    Number(lancamento.semana) === 4 &&
    metaNps > 0 &&
    !atingiuNps
  ) {
    observacao = atingiuMeta
      ? "Meta semanal atingida, mas a meta de NPS não foi alcançada."
      : "Meta semanal e meta de NPS não foram alcançadas.";
  } else if (!atingiuMeta) {
    observacao =
      "Meta semanal abaixo de 100%.";
  } else if (bonusFaixa === 0) {
    observacao =
      politica.metrica === "margem"
        ? "Meta atingida, mas margem abaixo da primeira faixa."
        : "Meta atingida, mas ticket abaixo da primeira faixa.";
  } else {
    observacao =
      "Campanha semanal habilitada.";
  }

  if (aplicaPenalidade) {
    observacao +=
      ` Penalidade de 50% por O.S. em aberto acima de ${LIMITE_OS_ABERTA}%.`;
  }

  return {
    ...lancamento,
    nome:
      funcionario?.nome ||
      lancamento.nome ||
      "Colaborador não localizado",
    cargo,
    filial:
      funcionario?.filial ||
      lancamento.filial,
    dn:
      funcionario?.dn ||
      lancamento.dn,
    politica,
    percentualMeta,
    atingiuMeta,
    indicador,
    bonusBase,
    bonusFaixa,
    metaNps,
    realizadoNps,
    percentualNps,
    atingiuNps,
    bonusNps,
    subtotal,
    penalidade,
    bonusFinal,
    status:
      bonusFinal > 0
        ? "HABILITADO"
        : "NÃO HABILITADO",
    observacao
  };
}

function preencherSelectPix(
  elemento,
  itens,
  placeholder
) {
  if (!elemento) return;

  const valorAtual = elemento.value;

  elemento.innerHTML =
    `<option value="">${placeholder}</option>` +
    itens.map(
      item =>
        `<option value="${item.value}">${item.label}</option>`
    ).join("");

  if (
    itens.some(item => item.value === valorAtual)
  ) {
    elemento.value = valorAtual;
  }
}

function abrirViewPix(view) {
  document.querySelectorAll(
    ".pix-subview"
  ).forEach(
    area =>
      area.classList.toggle(
        "active",
        area.id === `pix-${view}`
      )
  );

  document.querySelectorAll(
    ".pix-menu-btn"
  ).forEach(
    botao =>
      botao.classList.toggle(
        "active",
        botao.dataset.pixView === view
      )
  );

  const titulos = {
    dashboard: "Visão geral do Pix",
    funcionarios: "Base de participantes",
    lancamentos: "Lançamentos semanais",
    apuracao: "Apuração do Pix",
    politicas: "Políticas do Pix"
  };

  const titulo = $("#pageTitle");
  if (titulo) {
    titulo.textContent =
      titulos[view] || "Pix do Presidente";
  }

  if (view === "dashboard") {
    const competencia =
      $("#competenciaGlobal")?.value ||
      $("#pixDashboardCompetencia")?.value ||
      pixMesAtual();

    sincronizarCompetenciaPix(
      competencia,
      "global"
    );
  }
}

function participantesPix() {
  /*
   * Esta coleção é exclusiva do Pix do Presidente.
   * Portanto, todos os documentos devem aparecer na base visual.
   */
  return [...estadoPix.funcionarios]
    .sort(
      (a, b) =>
        String(a.nome || "").localeCompare(
          String(b.nome || ""),
          "pt-BR"
        )
    );
}

function competenciasPix() {
  return [
    ...new Set([
      PIX_INICIO,
      pixMesAtual(),
      ...estadoPix.lancamentos.map(
        lancamento => lancamento.competencia
      )
    ])
  ]
    .filter(Boolean)
    .sort()
    .reverse();
}

function filiaisParticipantesPix() {
  return [
    ...new Set(
      participantesPix().map(
        funcionario => funcionario.filial
      )
    )
  ]
    .filter(Boolean)
    .sort();
}

function atualizarSelectsPix() {
  const competencias = competenciasPix();
  const filiais = filiaisParticipantesPix();

  [
    "#pixFiltroCompetenciaLancamento",
    "#pixFiltroCompetenciaApuracao"
  ].forEach(
    seletor =>
      preencherSelectPix(
        $(seletor),
        competencias.map(
          competencia => ({
            value: competencia,
            label: competencia
          })
        ),
        "Todas as competências"
      )
  );

  [
    "#pixFiltroFilialLancamento",
    "#pixFiltroFilialApuracao",
    "#pixFiltroFilialFuncionario"
  ].forEach(
    seletor =>
      preencherSelectPix(
        $(seletor),
        filiais.map(
          filial => ({
            value: filial,
            label: filial
          })
        ),
        "Todas as filiais"
      )
  );

  [
    "#pixFiltroCargoLancamento",
    "#pixFiltroCargoApuracao",
    "#pixFiltroCargoFuncionario",
    "#pixFuncionarioCargo"
  ].forEach(
    seletor =>
      preencherSelectPix(
        $(seletor),
        CARGOS_PIX.map(
          cargo => ({
            value: cargo,
            label: cargo
          })
        ),
        seletor === "#pixFuncionarioCargo"
          ? "Selecione o cargo"
          : "Todos os cargos"
      )
  );

  preencherSelectPix(
    $("#pixFuncionarioFilial"),
    FILIAIS_PIX.map(
      filial => ({
        value: filial.unidade,
        label:
          `${filial.dn} - ${filial.unidade}`
      })
    ),
    "Selecione a filial"
  );

  preencherSelectPix(
    $("#pixLancamentoFilial"),
    filiais.map(
      filial => ({
        value: filial,
        label: filial
      })
    ),
    "Selecione a filial"
  );
}

function resultadosPixFiltrados(tipo) {
  const prefixo =
    tipo === "apuracao"
      ? "Apuracao"
      : "Lancamento";

  const competencia =
    $(`#pixFiltroCompetencia${prefixo}`)?.value || "";

  const filial =
    $(`#pixFiltroFilial${prefixo}`)?.value || "";

  const cargo =
    $(`#pixFiltroCargo${prefixo}`)?.value || "";

  const semana =
    $(`#pixFiltroSemana${prefixo}`)?.value || "";

  const status =
    tipo === "apuracao"
      ? $("#pixFiltroStatusApuracao")?.value || ""
      : "";

  return estadoPix.lancamentos
    .map(calcularPix)
    .filter(
      resultado =>
        (!competencia ||
          resultado.competencia === competencia) &&
        (!filial ||
          resultado.filial === filial) &&
        (!cargo ||
          resultado.cargo === cargo) &&
        (!semana ||
          String(resultado.semana) === semana) &&
        (!status ||
          resultado.status === status)
    )
    .sort(
      (a, b) =>
        String(b.competencia).localeCompare(
          String(a.competencia)
        ) ||
        Number(a.semana) - Number(b.semana) ||
        String(a.nome).localeCompare(
          String(b.nome),
          "pt-BR"
        )
    );
}

function pixCardsHtml(itens) {
  return itens.map(
    ([titulo, valor, classe = ""]) => `
      <article class="pix-stat-card ${classe}">
        <span>${titulo}</span>
        <strong>${valor}</strong>
      </article>
    `
  ).join("");
}

function indicadorPixTexto(resultado) {
  return `
    <div class="pix-indicator-detail">
      <strong>
        Meta: ${pixMoeda(resultado.metaSemanal)}
      </strong>

      <span>
        Realizado:
        ${pixMoeda(resultado.realizadoSemanal)}
      </span>

      <span>
        Atingimento:
        <b>${pixPct(resultado.percentualMeta)}</b>
      </span>

      <span>
        ${
          resultado.politica?.metrica === "margem"
            ? "Margem"
            : "Ticket médio"
        }:
        <b>
          ${
            resultado.politica?.metrica === "margem"
              ? pixPct(resultado.margem)
              : pixMoeda(resultado.ticketMedio)
          }
        </b>
      </span>

      ${
        Number(resultado.semana) === 4
          ? `
            <span>
              NPS:
              <b>
                ${
                  resultado.atingiuNps
                    ? "Atingido"
                    : "Não atingido"
                }
              </b>
            </span>

            <span>
              Meta/realizado NPS:
              <b>
                ${pixNumero(resultado.metaNps)
                  .toFixed(2)
                  .replace(".", ",")}
                / 
                ${pixNumero(resultado.realizadoNps)
                  .toFixed(2)
                  .replace(".", ",")}
                (${pixPct(resultado.percentualNps)})
              </b>
            </span>

            <span>
              O.S. em aberto:
              <b>${pixPct(resultado.osAbertaPercentual)}</b>
            </span>
          `
          : ""
      }
    </div>
  `;
}

function competenciaHistoricoPix() {
  const global =
    $("#competenciaGlobal")?.value;

  const interna =
    $("#pixDashboardCompetencia")?.value;

  return global || interna || pixMesAtual();
}

function atualizarRotuloHistoricoPix(
  competencia
) {
  const titulo =
    $("#historicoMesAtual");

  if (!titulo || !competencia) {
    return;
  }

  const [ano, mes] =
    competencia.split("-").map(Number);

  const texto = new Date(
    ano,
    mes - 1,
    1
  ).toLocaleDateString(
    "pt-BR",
    {
      month: "long",
      year: "numeric"
    }
  );

  titulo.textContent =
    texto.charAt(0).toUpperCase() +
    texto.slice(1);
}

function sincronizarCompetenciaPix(
  competencia,
  origem = "global"
) {
  if (!competencia) {
    return;
  }

  const campoGlobal =
    $("#competenciaGlobal");

  const campoPix =
    $("#pixDashboardCompetencia");

  if (
    campoGlobal &&
    origem !== "global"
  ) {
    campoGlobal.value = competencia;
  }

  if (campoPix) {
    campoPix.value = competencia;
  }

  atualizarRotuloHistoricoPix(
    competencia
  );

  renderDashboardPix();
}

function renderDashboardPix() {
  const competencia =
    competenciaHistoricoPix();

  const campoPix =
    $("#pixDashboardCompetencia");

  if (campoPix) {
    campoPix.value = competencia;
  }

  const resultados =
    estadoPix.lancamentos
      .map(calcularPix)
      .filter(
        resultado =>
          resultado.competencia === competencia
      );

  const total =
    resultados.reduce(
      (soma, resultado) =>
        soma + resultado.bonusFinal,
      0
    );

  const habilitados =
    resultados.filter(
      resultado =>
        resultado.status === "HABILITADO"
    ).length;

  const cards = $("#pixDashboardCards");

  if (cards) {
    cards.innerHTML =
      pixCardsHtml([
        [
          "Participantes ativos",
          participantesPix().filter(
            funcionario =>
              funcionarioPixAtivo(funcionario)
          ).length
        ],
        ["Avaliados no mês", resultados.length],
        ["Atingiram a meta", habilitados, "pix-card-ok"],
        ["Total investido", pixMoeda(total), "pix-card-total"]
      ]);
  }

  const resumoCargo = {};

  resultados.forEach(resultado => {
    const cargo =
      resultado.cargo || "Sem cargo";

    if (!resumoCargo[cargo]) {
      resumoCargo[cargo] = {
        quantidade: 0,
        total: 0
      };
    }

    resumoCargo[cargo].quantidade += 1;
    resumoCargo[cargo].total +=
      resultado.bonusFinal;
  });

  const areaCargo = $("#pixResumoCargo");

  if (areaCargo) {
    const entradasCargo =
      Object.entries(resumoCargo);

    areaCargo.innerHTML =
      entradasCargo.length
        ? entradasCargo
            .sort((a, b) =>
              a[0].localeCompare(
                b[0],
                "pt-BR"
              )
            )
            .map(
              ([cargo, dados]) => `
                <div class="summary-row">
                  <div>
                    <strong>${cargo}</strong>
                    <small>
                      ${dados.quantidade} lançamento(s)
                    </small>
                  </div>

                  <strong>
                    ${pixMoeda(dados.total)}
                  </strong>
                </div>
              `
            )
            .join("")
        : `
            <p class="empty">
              Nenhuma apuração nesta competência.
            </p>
          `;
  }

  const resumoFilial = {};

  resultados.forEach(resultado => {
    const filial =
      resultado.filial || "Sem filial";

    if (!resumoFilial[filial]) {
      resumoFilial[filial] = {
        quantidade: 0,
        total: 0
      };
    }

    resumoFilial[filial].quantidade += 1;
    resumoFilial[filial].total +=
      resultado.bonusFinal;
  });

  const areaFilial = $("#pixResumoFilial");

  if (areaFilial) {
    const entradasFilial =
      Object.entries(resumoFilial);

    areaFilial.innerHTML =
      entradasFilial.length
        ? entradasFilial
            .sort((a, b) =>
              a[0].localeCompare(
                b[0],
                "pt-BR"
              )
            )
            .map(
              ([filial, dados]) => `
                <div class="summary-row">
                  <div>
                    <strong>${filial}</strong>
                    <small>
                      ${dados.quantidade} lançamento(s)
                    </small>
                  </div>

                  <strong>
                    ${pixMoeda(dados.total)}
                  </strong>
                </div>
              `
            )
            .join("")
        : `
            <p class="empty">
              Nenhum investimento nesta competência.
            </p>
          `;
  }
}

function renderFuncionariosPix() {
  const tabela =
    $("#pixTabelaFuncionarios") ||
    $("#tabelaFuncionariosPix");

  if (!tabela) {
    console.error(
      "Tabela da Base de Participantes não encontrada. Use id='pixTabelaFuncionarios'."
    );

    return;
  }

  const busca =
    normalizarTextoPix(
      $("#pixBuscaFuncionario")?.value ||
      $("#buscaFuncionarioPix")?.value ||
      ""
    );

  const filial =
    normalizarTextoPix(
      $("#pixFiltroFilialFuncionario")?.value ||
      $("#filtroFilialFuncionarioPix")?.value ||
      ""
    );

  const cargo =
    normalizarTextoPix(
      $("#pixFiltroCargoFuncionario")?.value ||
      $("#filtroCargoFuncionarioPix")?.value ||
      ""
    );

  const lista =
    participantesPix().filter(
      funcionario => {
        const texto =
          normalizarTextoPix(
            `${funcionario.nome || ""} ${funcionario.filial || ""} ${funcionario.cargo || ""}`
          );

        const mesmaFilial =
          !filial ||
          normalizarTextoPix(
            funcionario.filial
          ) === filial;

        const mesmoCargo =
          !cargo ||
          normalizarTextoPix(
            funcionario.cargo
          ) === cargo;

        return (
          (!busca || texto.includes(busca)) &&
          mesmaFilial &&
          mesmoCargo
        );
      }
    );

  tabela.innerHTML =
    lista.length
      ? lista.map(
          funcionario => {
            const ativo =
              funcionarioPixAtivo(
                funcionario
              );

            return `
              <tr>
                <td>${funcionario.dn || ""}</td>
                <td>${funcionario.filial || ""}</td>
                <td>
                  <strong>${funcionario.nome || ""}</strong>
                </td>
                <td>${funcionario.cargo || ""}</td>
                <td>
                  <span class="badge ${ativo ? "ok" : "no"}">
                    ${ativo ? "ATIVO" : "INATIVO"}
                  </span>
                </td>
                <td>
                  <div class="actions">
                    <button
                      type="button"
                      class="mini-btn"
                      data-pix-func-edit="${funcionario.id}"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      class="mini-btn delete"
                      data-pix-func-delete="${funcionario.id}"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }
        ).join("")
      : `
        <tr>
          <td colspan="6" class="empty">
            Nenhum participante encontrado na coleção
            pix_presidente_funcionarios.
          </td>
        </tr>
      `;

  document.querySelectorAll(
    "[data-pix-func-edit]"
  ).forEach(
    botao =>
      botao.addEventListener(
        "click",
        () =>
          editarFuncionarioPix(
            botao.dataset.pixFuncEdit
          )
      )
  );

  document.querySelectorAll(
    "[data-pix-func-delete]"
  ).forEach(
    botao =>
      botao.addEventListener(
        "click",
        () =>
          excluirFuncionarioPix(
            botao.dataset.pixFuncDelete
          )
      )
  );

  console.info(
    `Base visual do Pix atualizada: ${lista.length} participante(s).`
  );

  tabela.dataset.pixRenderVersion =
    "2026.07.14-01";
}

function montarTabelaResultadosPix(
  resultados,
  seletor,
  comAcoes
) {
  const tabela = $(seletor);

  if (!tabela) return;

  tabela.innerHTML =
    resultados.length
      ? resultados.map(
          resultado => `
            <tr>
              <td>${resultado.competencia}</td>
              <td>S${resultado.semana}</td>
              <td>${resultado.filial}</td>
              <td><strong>${resultado.nome}</strong></td>
              <td>${resultado.cargo}</td>
              <td>${indicadorPixTexto(resultado)}</td>
              <td>${pixMoeda(resultado.bonusBase)}</td>
              <td>${pixMoeda(resultado.bonusFaixa)}</td>
              <td>${pixMoeda(resultado.bonusNps)}</td>
              <td class="pix-penalty">
                ${pixMoeda(resultado.penalidade)}
              </td>
              <td><strong>${pixMoeda(resultado.bonusFinal)}</strong></td>
              <td>
                <span
                  class="badge ${
                    resultado.status === "HABILITADO"
                      ? "ok"
                      : "no"
                  }"
                  title="${resultado.observacao}"
                >
                  ${resultado.status}
                </span>
              </td>
              ${
                comAcoes
                  ? `
                    <td>
                      <div class="actions">
                        <button
                          type="button"
                          class="mini-btn"
                          data-pix-edit="${resultado.id}"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          class="mini-btn delete"
                          data-pix-delete="${resultado.id}"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  `
                  : ""
              }
            </tr>
          `
        ).join("")
      : `
        <tr>
          <td
            colspan="${comAcoes ? 13 : 12}"
            class="empty"
          >
            Nenhum resultado encontrado.
          </td>
        </tr>
      `;

  if (comAcoes) {
    document.querySelectorAll(
      "[data-pix-edit]"
    ).forEach(
      botao =>
        botao.addEventListener(
          "click",
          () =>
            editarLancamentoPix(
              botao.dataset.pixEdit
            )
        )
    );

    document.querySelectorAll(
      "[data-pix-delete]"
    ).forEach(
      botao =>
        botao.addEventListener(
          "click",
          () =>
            excluirLancamentoPix(
              botao.dataset.pixDelete
            )
        )
    );
  }
}

function renderLancamentosPix() {
  montarTabelaResultadosPix(
    resultadosPixFiltrados("lancamento"),
    "#pixTabelaLancamentos",
    true
  );
}

function renderApuracaoPix() {
  const resultados =
    resultadosPixFiltrados("apuracao");

  const total =
    resultados.reduce(
      (soma, resultado) =>
        soma + resultado.bonusFinal,
      0
    );

  const habilitados =
    resultados.filter(
      resultado =>
        resultado.status === "HABILITADO"
    ).length;

  const penalidades =
    resultados.reduce(
      (soma, resultado) =>
        soma + resultado.penalidade,
      0
    );

  $("#pixApuracaoCards").innerHTML =
    pixCardsHtml([
      ["Resultados", resultados.length],
      ["Habilitados", habilitados, "pix-card-ok"],
      ["Penalidades", pixMoeda(penalidades), "pix-card-alert"],
      ["Total apurado", pixMoeda(total), "pix-card-total"]
    ]);

  montarTabelaResultadosPix(
    resultados,
    "#pixTabelaApuracao",
    false
  );
}

function renderPoliticasPix() {
  $("#pixPolicyGrid").innerHTML =
    CARGOS_PIX.map(
      cargo => {
        const politica = pixPolitica(cargo);

        return `
          <article class="pix-policy-card">
            <div class="pix-policy-title">
              <h3>${cargo}</h3>
              <span>
                Base:
                ${pixMoeda(politica.bonusBase)}
              </span>
            </div>

            <p>
              Indicador:
              <strong>
                ${
                  politica.metrica === "margem"
                    ? "Margem"
                    : "Ticket médio"
                }
              </strong>
            </p>

            <ul>
              ${politica.faixas.map(
                faixa => `
                  <li>
                    ${
                      politica.metrica === "margem"
                        ? pixPct(faixa.minimo)
                        : pixMoeda(faixa.minimo)
                    }
                    → ${pixMoeda(faixa.bonus)}
                  </li>
                `
              ).join("")}
            </ul>

            ${
              politica.bonusNps > 0
                ? `
                  <div class="pix-nps-note">
                    NPS mensal:
                    <strong>
                      ${pixMoeda(politica.bonusNps)}
                    </strong>
                    · ${politica.objetivoNps}.
                    Pago na Semana 4 somente quando o NPS realizado
                    atingir ou superar a meta de NPS, independentemente
                    da meta semanal.
                  </div>
                `
                : ""
            }
          </article>
        `;
      }
    ).join("");
}

function renderTudoPix() {
  atualizarSelectsPix();

  const dashboardCompetencia =
    $("#pixDashboardCompetencia");

  if (dashboardCompetencia) {
    dashboardCompetencia.value =
      $("#competenciaGlobal")?.value ||
      dashboardCompetencia.value ||
      pixMesAtual();
  }

  const renderizacoes = [
    ["dashboard", renderDashboardPix],
    ["funcionários", renderFuncionariosPix],
    ["lançamentos", renderLancamentosPix],
    ["apuração", renderApuracaoPix],
    ["políticas", renderPoliticasPix]
  ];

  renderizacoes.forEach(
    ([nome, funcao]) => {
      try {
        funcao();
      } catch (erro) {
        console.error(
          `Erro ao renderizar ${nome} do Pix:`,
          erro
        );
      }
    }
  );
}

function abrirFuncionarioPix() {
  const formulario =
    $("#formFuncionarioPix");

  const modal =
    $("#modalFuncionarioPix");

  if (
    !formulario ||
    !modal
  ) {
    pixAlert(
      "O modal de participantes do Pix não foi encontrado no index.html."
    );

    return;
  }

  formulario.reset();

  $("#pixFuncionarioId").value =
    "";

  $("#pixFuncionarioDn").value =
    "";

  atualizarSelectsPix();

  $("#pixFuncionarioFilial").value =
    "";

  $("#pixFuncionarioCargo").value =
    "";

  $("#pixFuncionarioAtivo").value =
    "true";

  modal.showModal();
}

function editarFuncionarioPix(id) {
  const funcionario =
    estadoPix.funcionarios.find(
      item => item.id === id
    );

  if (!funcionario) return;

  atualizarSelectsPix();

  $("#pixFuncionarioId").value = funcionario.id;
  $("#pixFuncionarioFilial").value = funcionario.filial;
  $("#pixFuncionarioDn").value = funcionario.dn || "";
  $("#pixFuncionarioNome").value = funcionario.nome || "";
  $("#pixFuncionarioCargo").value = funcionario.cargo || "";
  $("#pixFuncionarioAtivo").value =
    String(funcionario.ativo === true);

  $("#modalFuncionarioPix").showModal();
}

async function salvarFuncionarioPix(evento) {
  evento.preventDefault();
  evento.stopPropagation();

  const formulario =
    $("#formFuncionarioPix");

  const botao =
    evento.submitter ||
    formulario?.querySelector(
      'button[type="submit"]'
    );

  if (!formulario) {
    pixAlert(
      "O formulário de participantes não foi encontrado no HTML."
    );

    return;
  }

  const id =
    $("#pixFuncionarioId")?.value || "";

  const filial =
    $("#pixFuncionarioFilial")?.value || "";

  const dadosFilial =
    pixFilialPorNome(
      filial
    );

  const nome =
    $("#pixFuncionarioNome")?.value
      ?.trim() || "";

  const cargo =
    $("#pixFuncionarioCargo")?.value || "";

  const ativo =
    $("#pixFuncionarioAtivo")?.value !== "false";

  if (!dadosFilial) {
    pixAlert(
      "Selecione uma filial válida."
    );

    $("#pixFuncionarioFilial")?.focus();
    return;
  }

  if (!nome) {
    pixAlert(
      "Informe o nome do participante."
    );

    $("#pixFuncionarioNome")?.focus();
    return;
  }

  const cargoCanonico =
    CARGOS_PIX.find(
      item =>
        normalizarTextoPix(
          item
        ) ===
        normalizarTextoPix(
          cargo
        )
    );

  if (!cargoCanonico) {
    pixAlert(
      "Selecione um cargo válido do Pix do Presidente."
    );

    $("#pixFuncionarioCargo")?.focus();
    return;
  }

  const duplicado =
    estadoPix.funcionarios.find(
      funcionario =>
        normalizarTextoPix(
          funcionario.nome
        ) ===
          normalizarTextoPix(
            nome
          ) &&
        normalizarTextoPix(
          funcionario.filial
        ) ===
          normalizarTextoPix(
            filial
          ) &&
        funcionario.id !== id
    );

  if (duplicado) {
    pixAlert(
      "Já existe um participante com este nome nesta filial."
    );

    return;
  }

  const dados = {
    dn: dadosFilial.dn,
    filial: dadosFilial.unidade,
    nome,
    cargo: cargoCanonico,
    ativo,
    campanha: "PIX_DO_PRESIDENTE",
    atualizadoEm: serverTimestamp()
  };

  try {
    if (botao) {
      botao.disabled = true;
      botao.dataset.textoOriginal =
        botao.textContent;

      botao.textContent =
        "Salvando...";
    }

    if (id) {
      await updateDoc(
        doc(
          firestore,
          "pix_presidente_funcionarios",
          id
        ),
        dados
      );
    } else {
      await addDoc(
        funcionariosPixRef,
        {
          ...dados,
          criadoEm:
            serverTimestamp()
        }
      );
    }

    formulario.reset();

    $("#pixFuncionarioId").value =
      "";

    $("#pixFuncionarioDn").value =
      "";

    $("#modalFuncionarioPix").close();

    renderFuncionariosPix();

    pixAlert(
      id
        ? "Participante atualizado com sucesso."
        : "Participante cadastrado com sucesso."
    );
  } catch (erro) {
    console.error(
      "Erro completo ao salvar participante do Pix:",
      erro
    );

    pixAlert(
      `Não foi possível salvar o participante.

${erro.message || erro}`
    );
  } finally {
    if (botao) {
      botao.disabled = false;

      botao.textContent =
        botao.dataset.textoOriginal ||
        "Salvar participante";
    }
  }
}

async function excluirFuncionarioPix(id) {
  const possuiLancamentos =
    estadoPix.lancamentos.some(
      lancamento =>
        lancamento.funcionarioId === id
    );

  if (possuiLancamentos) {
    pixAlert(
      "Este participante possui lançamentos. Exclua-os primeiro ou deixe-o inativo."
    );
    return;
  }

  const confirmou = await pixDeleteConfirm({
    titulo: "Excluir participante?",
    mensagem:
      "O participante será removido da base do Pix do Presidente. Esta ação não poderá ser desfeita.",
    textoConfirmar: "Excluir participante",
    textoCancelar: "Cancelar"
  });

  if (!confirmou) {
    return;
  }

  try {
    await deleteDoc(
      doc(firestore, "pix_presidente_funcionarios", id)
    );
  } catch (erro) {
    console.error("Erro ao excluir participante:", erro);
    pixAlert("Não foi possível excluir o participante.");
  }
}

function atualizarFuncionariosLancamentoPix(
  funcionarioSelecionado = ""
) {
  const campoFilial =
    $("#pixLancamentoFilial");

  const campoFuncionario =
    $("#pixLancamentoFuncionario");

  if (
    !campoFilial ||
    !campoFuncionario
  ) {
    console.error(
      "Campos de filial ou colaborador do Pix não encontrados."
    );

    return;
  }

  const filialSelecionada =
    normalizarTextoPix(
      campoFilial.value
    );

  const funcionariosDaFilial =
    participantesPix()
      .filter(
        funcionario => {
          const mesmaFilial =
            normalizarTextoPix(
              funcionario.filial
            ) ===
            filialSelecionada;

          return (
            mesmaFilial &&
            funcionarioPixAtivo(
              funcionario
            )
          );
        }
      )
      .map(
        funcionario => ({
          value: funcionario.id,
          label:
            `${funcionario.nome} — ${funcionario.cargo}`
        })
      );

  preencherSelectPix(
    campoFuncionario,
    funcionariosDaFilial,
    funcionariosDaFilial.length
      ? "Selecione o colaborador"
      : "Nenhum colaborador cadastrado nesta filial"
  );

  /*
   * Na edição, mantém o colaborador já salvo.
   */
  if (
    funcionarioSelecionado &&
    funcionariosDaFilial.some(
      item =>
        item.value ===
        funcionarioSelecionado
    )
  ) {
    campoFuncionario.value =
      funcionarioSelecionado;
  }

  /*
   * Quando existir apenas um colaborador na filial,
   * ele é selecionado automaticamente.
   */
  if (
    !campoFuncionario.value &&
    funcionariosDaFilial.length === 1
  ) {
    campoFuncionario.value =
      funcionariosDaFilial[0].value;
  }

  campoFuncionario.disabled =
    funcionariosDaFilial.length === 0;

  renderCamposLancamentoPix();
}

function renderCamposLancamentoPix(dados = {}) {
  const campoFuncionario =
    $("#pixLancamentoFuncionario");

  const funcionario =
    pixFuncionarioPorId(
      campoFuncionario?.value
    );

  const area =
    $("#pixCamposDinamicos");

  const preview =
    $("#pixResultadoPreview");

  if (
    !area ||
    !preview
  ) {
    console.error(
      "Área dinâmica ou preview do Pix não encontrados no HTML."
    );

    return;
  }

  if (
    !funcionario ||
    !participantePixValido(
      funcionario
    )
  ) {
    area.innerHTML = `
      <p class="pix-empty">
        ${
          $("#pixLancamentoFilial")?.value
            ? "Selecione um colaborador da filial escolhida."
            : "Selecione primeiro a filial."
        }
      </p>
    `;

    preview.innerHTML =
      "O cálculo semanal aparecerá aqui.";

    return;
  }

  const cargoPolitica =
    CARGOS_PIX.find(
      cargo =>
        normalizarTextoPix(
          cargo
        ) ===
        normalizarTextoPix(
          funcionario.cargo
        )
    );

  const politica =
    pixPolitica(
      cargoPolitica
    );

  if (!politica) {
    area.innerHTML = `
      <p class="pix-empty">
        Não foi encontrada uma política para o cargo
        ${funcionario.cargo}.
      </p>
    `;

    preview.innerHTML =
      "Não foi possível calcular este colaborador.";

    return;
  }
  const semana =
    Number($("#pixLancamentoSemana")?.value || 1);

  area.innerHTML = `
    <label>
      Meta semanal
      <input
        type="text"
        inputmode="decimal"
        id="pixMetaSemanal"
        placeholder="R$ 0,00"
        value="${
          dados.metaSemanal
            ? pixMoeda(dados.metaSemanal)
            : ""
        }"
        required
      />
    </label>

    <label>
      Realizado semanal
      <input
        type="text"
        inputmode="decimal"
        id="pixRealizadoSemanal"
        placeholder="R$ 0,00"
        value="${
          dados.realizadoSemanal
            ? pixMoeda(dados.realizadoSemanal)
            : ""
        }"
        required
      />
    </label>

    ${
      politica.metrica === "margem"
        ? `
          <label>
            Margem realizada (%)
            <input
              type="number"
              step="0.01"
              min="0"
              id="pixMargem"
              value="${dados.margem ?? ""}"
              required
            />
          </label>
        `
        : `
          <label>
            Ticket médio
            <input
              type="text"
              inputmode="decimal"
              id="pixTicketMedio"
              placeholder="R$ 0,00"
              value="${
                dados.ticketMedio
                  ? pixMoeda(dados.ticketMedio)
                  : ""
              }"
              required
            />
          </label>
        `
    }

    <label>
      Bônus semanal da função
      <input
        value="${pixMoeda(politica.bonusBase)}"
        readonly
      />
    </label>

    ${
      semana === 4 && politica.bonusNps > 0
        ? `
          <label>
            Meta de NPS
            <input
              type="number"
              step="0.01"
              min="0"
              id="pixMetaNps"
              value="${dados.metaNps ?? ""}"
              placeholder="Ex.: 90"
              required
            />

            <small>
              ${politica.objetivoNps} ·
              prêmio de ${pixMoeda(politica.bonusNps)}.
            </small>
          </label>

          <label>
            NPS realizado
            <input
              type="number"
              step="0.01"
              min="0"
              id="pixRealizadoNps"
              value="${dados.realizadoNps ?? ""}"
              placeholder="Ex.: 92"
              required
            />

            <small>
              O prêmio de NPS é pago quando o realizado for
              maior ou igual à meta de NPS, mesmo sem bater a meta semanal.
            </small>
          </label>
        `
        : ""
    }

    ${
      semana === 4
        ? `
          <label>
            O.S. em aberto (%)
            <input
              type="number"
              step="0.01"
              min="0"
              id="pixOsAberta"
              value="${dados.osAbertaPercentual ?? ""}"
              required
            />

            <small>
              Acima de ${LIMITE_OS_ABERTA}%:
              penalidade de 50% no fechamento.
            </small>
          </label>
        `
        : ""
    }
  `;

  [
    "#pixMetaSemanal",
    "#pixRealizadoSemanal",
    "#pixTicketMedio"
  ].forEach(
    seletor => {
      const campo = $(seletor);
      if (!campo) return;

      campo.addEventListener("focus", () => {
        const valor = pixNumero(campo.value);
        campo.value =
          valor > 0
            ? valor.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })
            : "";
      });

      campo.addEventListener("blur", () => {
        if (campo.value.trim()) {
          campo.value = pixMoeda(campo.value);
        }
        atualizarPreviewPix();
      });
    }
  );

  area.querySelectorAll(
    "input, select"
  ).forEach(
    campo => {
      campo.addEventListener(
        "input",
        atualizarPreviewPix
      );
      campo.addEventListener(
        "change",
        atualizarPreviewPix
      );
    }
  );

  atualizarPreviewPix();
}

function coletarLancamentoPix() {
  const funcionario =
    pixFuncionarioPorId(
      $("#pixLancamentoFuncionario")?.value
    );

  if (!funcionario || !participantePixValido(funcionario)) {
    throw new Error(
      "Selecione um participante válido do Pix do Presidente."
    );
  }

  const cargoPolitica =
    CARGOS_PIX.find(
      cargo =>
        normalizarTextoPix(
          cargo
        ) ===
        normalizarTextoPix(
          funcionario.cargo
        )
    );

  const politica =
    pixPolitica(
      cargoPolitica
    );

  return {
    id: $("#pixLancamentoId").value || "",
    competencia: $("#pixLancamentoCompetencia").value,
    semana: Number($("#pixLancamentoSemana").value),
    funcionarioId: funcionario.id,
    nome: funcionario.nome,
    filial: funcionario.filial,
    dn: funcionario.dn,
    cargo: funcionario.cargo,
    metaSemanal:
      pixNumero($("#pixMetaSemanal")?.value),
    realizadoSemanal:
      pixNumero($("#pixRealizadoSemanal")?.value),
    ticketMedio:
      politica.metrica === "ticket"
        ? pixNumero($("#pixTicketMedio")?.value)
        : 0,
    margem:
      politica.metrica === "margem"
        ? pixNumero($("#pixMargem")?.value)
        : 0,
    metaNps:
      $("#pixMetaNps")
        ? pixNumero($("#pixMetaNps").value)
        : 0,
    realizadoNps:
      $("#pixRealizadoNps")
        ? pixNumero($("#pixRealizadoNps").value)
        : 0,
    osAbertaPercentual:
      $("#pixOsAberta")
        ? pixNumero($("#pixOsAberta").value)
        : 0
  };
}

function atualizarPreviewPix() {
  const preview = $("#pixResultadoPreview");
  if (!preview) return;

  try {
    const resultado =
      calcularPix(coletarLancamentoPix());

    preview.innerHTML = `
      <div class="pix-preview-grid">
        <div>
          <span>Atingimento</span>
          <strong>${pixPct(resultado.percentualMeta)}</strong>
        </div>

        <div>
          <span>Bônus base</span>
          <strong>${pixMoeda(resultado.bonusBase)}</strong>
        </div>

        <div>
          <span>Bônus faixa</span>
          <strong>${pixMoeda(resultado.bonusFaixa)}</strong>
        </div>

        <div>
          <span>
            NPS · ${pixPct(resultado.percentualNps)}
          </span>
          <strong class="${resultado.atingiuNps ? "pix-success" : ""}">
            ${pixMoeda(resultado.bonusNps)}
          </strong>
        </div>

        <div>
          <span>Penalidade</span>
          <strong class="pix-danger">
            ${pixMoeda(resultado.penalidade)}
          </strong>
        </div>

        <div>
          <span>Total</span>
          <strong class="pix-success">
            ${pixMoeda(resultado.bonusFinal)}
          </strong>
        </div>
      </div>

      <div class="pix-preview-status">
        <span class="badge ${
          resultado.status === "HABILITADO"
            ? "ok"
            : "no"
        }">
          ${resultado.status}
        </span>

        <small>${resultado.observacao}</small>
      </div>
    `;
  } catch (erro) {
    preview.textContent = erro.message;
  }
}

function abrirLancamentoPix() {
  if (
    !participantesPix().some(
      funcionario =>
        funcionarioPixAtivo(
          funcionario
        )
    )
  ) {
    pixAlert(
      "Cadastre pelo menos um participante ativo no Pix do Presidente."
    );
    abrirViewPix("funcionarios");
    return;
  }

  $("#formPixPresidente").reset();
  $("#pixLancamentoId").value = "";
  $("#pixLancamentoCompetencia").value =
    pixMesAtual();
  $("#pixLancamentoSemana").value = "1";

  atualizarSelectsPix();

  const campoFuncionario =
    $("#pixLancamentoFuncionario");

  campoFuncionario.innerHTML = `
    <option value="">
      Selecione primeiro a filial
    </option>
  `;

  campoFuncionario.disabled =
    true;

  renderCamposLancamentoPix();

  $("#modalPixPresidente").showModal();
}

function editarLancamentoPix(id) {
  const lancamento =
    estadoPix.lancamentos.find(
      item => item.id === id
    );

  if (!lancamento) return;

  $("#pixLancamentoId").value = lancamento.id;
  $("#pixLancamentoCompetencia").value =
    lancamento.competencia;
  $("#pixLancamentoSemana").value =
    String(lancamento.semana);

  atualizarSelectsPix();

  $("#pixLancamentoFilial").value =
    lancamento.filial;

  atualizarFuncionariosLancamentoPix(
    lancamento.funcionarioId
  );

  $("#pixLancamentoFuncionario").value =
    lancamento.funcionarioId;

  renderCamposLancamentoPix(
    lancamento
  );

  $("#modalPixPresidente").showModal();
}

async function salvarLancamentoPix(evento) {
  evento.preventDefault();

  const botao = evento.submitter;

  try {
    const item = coletarLancamentoPix();

    const duplicado =
      estadoPix.lancamentos.find(
        lancamento =>
          lancamento.funcionarioId ===
            item.funcionarioId &&
          lancamento.competencia ===
            item.competencia &&
          Number(lancamento.semana) ===
            Number(item.semana) &&
          lancamento.id !== item.id
      );

    if (duplicado) {
      pixAlert(
        "Este participante já possui lançamento nesta competência e semana."
      );
      return;
    }

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Salvando...";
    }

    const dados = {
      ...item,
      atualizadoEm: serverTimestamp()
    };

    if (item.id) {
      await updateDoc(
        doc(
          firestore,
          "pix_presidente_lancamentos",
          item.id
        ),
        dados
      );
    } else {
      delete dados.id;

      await addDoc(
        lancamentosPixRef,
        {
          ...dados,
          criadoEm: serverTimestamp()
        }
      );
    }

    $("#modalPixPresidente").close();
  } catch (erro) {
    console.error("Erro ao salvar lançamento Pix:", erro);
    pixAlert(
      erro.message ||
      "Não foi possível salvar o lançamento."
    );
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.textContent = "Salvar lançamento";
    }
  }
}

async function excluirLancamentoPix(id) {
  const confirmou = await pixDeleteConfirm({
    titulo: "Excluir lançamento?",
    mensagem:
      "O lançamento será removido definitivamente da campanha do Pix do Presidente.",
    textoConfirmar: "Excluir lançamento",
    textoCancelar: "Cancelar"
  });

  if (!confirmou) {
    return;
  }

  try {
    await deleteDoc(
      doc(
        firestore,
        "pix_presidente_lancamentos",
        id
      )
    );
  } catch (erro) {
    console.error("Erro ao excluir lançamento Pix:", erro);
    pixAlert("Não foi possível excluir o lançamento.");
  }
}

function configurarEventosPix() {
  /*
   * Proteção contra botão sem listener:
   * captura cliques e submissões mesmo quando o HTML
   * é carregado ou reorganizado depois.
   */
  document.addEventListener(
    "click",
    evento => {
      const novoParticipante =
        evento.target.closest(
          "#btnNovoFuncionarioPix"
        );

      if (novoParticipante) {
        evento.preventDefault();
        abrirFuncionarioPix();
      }
    }
  );


  document.querySelectorAll(
    ".pix-menu-btn"
  ).forEach(
    botao =>
      botao.addEventListener(
        "click",
        () =>
          abrirViewPix(
            botao.dataset.pixView
          )
      )
  );

  $("#pixDashboardCompetencia")
    ?.addEventListener(
      "change",
      evento => {
        sincronizarCompetenciaPix(
          evento.target.value,
          "pix"
        );
      }
    );

  $("#competenciaGlobal")
    ?.addEventListener(
      "change",
      evento => {
        if (
          document.body.classList.contains(
            "modulo-pix-ativo"
          )
        ) {
          sincronizarCompetenciaPix(
            evento.target.value,
            "global"
          );
        }
      }
    );

  [
    "#btnMesAnterior",
    "#btnMesSeguinte"
  ].forEach(
    seletor =>
      $(seletor)?.addEventListener(
        "click",
        () => {
          /*
           * O script dos Produtivos altera a competência primeiro.
           * Executamos no próximo ciclo para ler o novo mês.
           */
          setTimeout(
            () => {
              if (
                document.body.classList.contains(
                  "modulo-pix-ativo"
                )
              ) {
                sincronizarCompetenciaPix(
                  $("#competenciaGlobal")?.value,
                  "global"
                );
              }
            },
            0
          );
        }
      )
  );

  $("#formFuncionarioPix")
    ?.addEventListener(
      "submit",
      salvarFuncionarioPix
    );

  $("#pixFuncionarioFilial")
    ?.addEventListener(
      "change",
      evento => {
        $("#pixFuncionarioDn").value =
          pixFilialPorNome(
            evento.target.value
          )?.dn || "";
      }
    );

  $("#fecharModalFuncionarioPix")
    ?.addEventListener(
      "click",
      () =>
        $("#modalFuncionarioPix").close()
    );

  $("#cancelarModalFuncionarioPix")
    ?.addEventListener(
      "click",
      () =>
        $("#modalFuncionarioPix").close()
    );

  [
    "#pixBuscaFuncionario",
    "#pixFiltroFilialFuncionario",
    "#pixFiltroCargoFuncionario"
  ].forEach(
    seletor =>
      $(seletor)?.addEventListener(
        "input",
        renderFuncionariosPix
      )
  );

  $("#btnNovoLancamentoPix")
    ?.addEventListener(
      "click",
      abrirLancamentoPix
    );

  $("#pixLancamentoFilial")
    ?.addEventListener(
      "change",
      () => {
        atualizarFuncionariosLancamentoPix();
      }
    );

  $("#pixLancamentoFuncionario")
    ?.addEventListener(
      "change",
      () =>
        renderCamposLancamentoPix()
    );

  $("#pixLancamentoSemana")
    ?.addEventListener(
      "change",
      () =>
        renderCamposLancamentoPix()
    );

  $("#formPixPresidente")
    ?.addEventListener(
      "submit",
      salvarLancamentoPix
    );

  $("#fecharModalPix")
    ?.addEventListener(
      "click",
      () =>
        $("#modalPixPresidente").close()
    );

  $("#cancelarModalPix")
    ?.addEventListener(
      "click",
      () =>
        $("#modalPixPresidente").close()
    );

  [
    "#pixFiltroCompetenciaLancamento",
    "#pixFiltroFilialLancamento",
    "#pixFiltroCargoLancamento",
    "#pixFiltroSemanaLancamento"
  ].forEach(
    seletor =>
      $(seletor)?.addEventListener(
        "change",
        renderLancamentosPix
      )
  );

  [
    "#pixFiltroCompetenciaApuracao",
    "#pixFiltroFilialApuracao",
    "#pixFiltroCargoApuracao",
    "#pixFiltroSemanaApuracao",
    "#pixFiltroStatusApuracao"
  ].forEach(
    seletor =>
      $(seletor)?.addEventListener(
        "change",
        renderApuracaoPix
      )
  );
}

function iniciarFirebasePix() {
  onSnapshot(
    funcionariosPixRef,
    snapshot => {
      console.info(
        `Firestore Pix: ${snapshot.size} participante(s) recebido(s).`
      );

      estadoPix.funcionarios =
        snapshot.docs
          .map(
            documento => ({
              id: documento.id,
              ...documento.data()
            })
          )
          .sort(
            (a, b) =>
              String(
                a.nome || ""
              ).localeCompare(
                String(
                  b.nome || ""
                ),
                "pt-BR"
              )
          );

      renderTudoPix();

      /*
       * Renderização final obrigatória da base visual.
       * Evita que outra renderização geral deixe a tabela vazia.
       */
      requestAnimationFrame(
        () => {
          renderFuncionariosPix();
        }
      );
    },
    erro => {
      console.error(
        "Erro ao carregar participantes do Pix:",
        erro
      );

      pixAlert(
        `Não foi possível carregar a Base de Participantes do Pix.

${erro.message || erro}`
      );
    }
  );

  onSnapshot(
    lancamentosPixRef,
    snapshot => {
      estadoPix.lancamentos =
        snapshot.docs.map(
          documento => ({
            id: documento.id,
            ...documento.data()
          })
        );

      renderTudoPix();
    },
    erro => {
      console.error(
        "Erro ao carregar lançamentos do Pix:",
        erro
      );

      pixAlert(
        "Não foi possível carregar os lançamentos do Pix do Presidente. Verifique as regras do Firestore."
      );
    }
  );
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    atualizarSelectsPix();
    configurarEventosPix();
    abrirViewPix("dashboard");
    renderTudoPix();
    iniciarFirebasePix();
  }
);