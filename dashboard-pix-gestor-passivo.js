/*
=========================================================
DASHBOARD PASSIVO — VISÃO GERAL DO GESTOR
PIX DO PRESIDENTE
Versão: 2026.07.21-03

OBJETIVO
- Mostrar os valores por semana na Visão Geral do Gestor.
- Não apagar, sobrescrever ou alterar lançamentos.
- Não usar MutationObserver.
- Não observar o body.
- Não consultar Supabase automaticamente.
- Não gravar em Firebase, localStorage ou qualquer banco.
- Atualizar apenas quando:
  1. a tela for aberta;
  2. o botão "Atualizar painel" for clicado;
  3. o sistema disparar um evento de atualização;
  4. o próprio módulo do Pix chamar atualizarDashboardGestorPix().

IMPORTANTE
1. REMOVA do index.html o dashboard pesado anterior:

<script type="module" src="./dashboard-pix-executivo.js?v=20260721-01"></script>

2. Salve este arquivo como:

dashboard-pix-gestor-passivo.js

3. No final do index.html, depois de pix-presidente.js, adicione:

<script
  type="module"
  src="./dashboard-pix-gestor-passivo.js?v=20260721-03"
></script>

=========================================================
*/

const DASHBOARD_PIX_GESTOR_VERSAO = "2026.07.21-03";

const dashboardPixGestorEstado = {
  competencia: "",
  semana: "",
  dn: "",
  filial: "",
  status: "",
  dadosRecebidos: [],
  ultimaAtualizacao: null,
  renderizando: false
};

const dashboardPixGestorConfig = {
  semanas: ["S1", "S2", "S3", "S4"],

  /*
  O painel tentará entrar em um destes containers.
  Ajuste a lista caso o ID da sua Visão Geral do Gestor seja diferente.
  */
  containersVisaoGeral: [
    "#pixVisaoGeralGestor",
    "#pix-visao-geral-gestor",
    "#visaoGeralGestorPix",
    "#visao-geral-gestor-pix",
    "[data-pix-view='visao-geral-gestor']",
    "[data-view='pix-visao-geral-gestor']",
    "#pixVisaoGeral",
    "#pix-visao-geral"
  ],

  /*
  Fontes de dados apenas para LEITURA.
  O dashboard nunca modifica esses arrays.
  */
  nomesArraysGlobais: [
    "pixLancamentos",
    "PIX_LANCAMENTOS",
    "lancamentosPix",
    "dadosPix",
    "resultadosPix",
    "historicoPix"
  ],

  /*
  Fallback opcional:
  Se o sistema não expuser um array global, o painel pode ler uma tabela
  somente quando o usuário clicar em Atualizar ou quando a tela for aberta.
  */
  tabelasFallback: [
    "#pixTabelaApuracao",
    "#tabelaPixApuracao",
    "#pixTabelaLancamentos",
    "#tabelaPixLancamentos",
    "#pixHistoricoTabela"
  ],

  moeda: new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }),

  numero: new Intl.NumberFormat("pt-BR")
};

/* =====================================================
   UTILITÁRIOS
===================================================== */

function dashPix$(seletor) {
  return document.querySelector(seletor);
}

function dashPixTodos(seletor) {
  return [...document.querySelectorAll(seletor)];
}

function dashPixPrimeiro(seletores) {
  for (const seletor of seletores) {
    const elemento = dashPix$(seletor);
    if (elemento) return elemento;
  }

  return null;
}

function dashPixTexto(valor) {
  return String(valor ?? "").trim();
}

function dashPixNormalizar(valor) {
  return dashPixTexto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function dashPixEscapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dashPixNumero(valor) {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  let texto = dashPixTexto(valor)
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/%/g, "")
    .trim();

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

function dashPixMoeda(valor) {
  return dashboardPixGestorConfig.moeda.format(
    dashPixNumero(valor)
  );
}

function dashPixCompetenciaNormalizada(valor) {
  const texto = dashPixTexto(valor);

  if (/^\d{4}-\d{2}$/.test(texto)) {
    return texto;
  }

  const formatoBrasileiro = texto.match(/^(\d{2})\/(\d{4})$/);

  if (formatoBrasileiro) {
    return `${formatoBrasileiro[2]}-${formatoBrasileiro[1]}`;
  }

  return texto;
}

function dashPixCompetenciaExibicao(valor) {
  const competencia = dashPixCompetenciaNormalizada(valor);
  const partes = competencia.match(/^(\d{4})-(\d{2})$/);

  if (partes) {
    return `${partes[2]}/${partes[1]}`;
  }

  return competencia || "Todas";
}

function dashPixSemanaNormalizada(valor) {
  const texto = dashPixNormalizar(valor)
    .replace(/\s+/g, "");

  const correspondencia = texto.match(
    /(?:SEMANA)?([1-4])/
  );

  return correspondencia
    ? `S${correspondencia[1]}`
    : "";
}

function dashPixStatusNormalizado(valor) {
  const texto = dashPixNormalizar(valor);

  if (
    texto.includes("NAO HABILITADO") ||
    texto.includes("NÃO HABILITADO") ||
    texto === "FALSE" ||
    texto === "0"
  ) {
    return "NÃO HABILITADO";
  }

  if (
    texto.includes("HABILITADO") ||
    texto === "TRUE" ||
    texto === "1"
  ) {
    return "HABILITADO";
  }

  return texto || "NÃO HABILITADO";
}

function dashPixFilialLimpa(valor) {
  const texto = dashPixTexto(valor);
  const correspondencia = texto.match(
    /^\s*\d+\s*-\s*(.+)$/
  );

  return correspondencia
    ? correspondencia[1].trim()
    : texto;
}

function dashPixResolverDn(filial, dnInformado = "") {
  const dnLimpo = dashPixTexto(dnInformado)
    .replace(/\D/g, "");

  if (dnLimpo) {
    return dnLimpo;
  }

  const correspondencia = dashPixTexto(filial)
    .match(/^\s*(\d+)\s*-/);

  if (correspondencia) {
    return correspondencia[1];
  }

  const mapaDn = {
    ANANINDEUA: "4700",
    "SAO LUIS": "4731",
    BACABAL: "1960",
    MACAPA: "4756",
    TERESINA: "4730",
    URUCUI: "4730",
    SINOP: "1928",
    CUIABA: "4738",
    "AGUA BOA": "4738",
    RONDONOPOLIS: "4774"
  };

  return mapaDn[
    dashPixNormalizar(
      dashPixFilialLimpa(filial)
    )
  ] || "";
}

function dashPixValorDoPrimeiroCampo(
  objeto,
  nomes,
  padrao = ""
) {
  for (const nome of nomes) {
    if (
      objeto &&
      Object.prototype.hasOwnProperty.call(objeto, nome) &&
      objeto[nome] !== undefined &&
      objeto[nome] !== null &&
      objeto[nome] !== ""
    ) {
      return objeto[nome];
    }
  }

  return padrao;
}

/* =====================================================
   NORMALIZAÇÃO DOS REGISTROS
===================================================== */

function dashPixNormalizarRegistro(registro) {
  if (!registro || typeof registro !== "object") {
    return null;
  }

  const filialBruta = dashPixValorDoPrimeiroCampo(
    registro,
    [
      "filial",
      "unidade",
      "nomeFilial",
      "branch",
      "loja"
    ]
  );

  const colaborador = dashPixValorDoPrimeiroCampo(
    registro,
    [
      "colaborador",
      "funcionario",
      "participante",
      "nome",
      "nomeColaborador"
    ]
  );

  const semana = dashPixSemanaNormalizada(
    dashPixValorDoPrimeiroCampo(
      registro,
      [
        "semana",
        "week",
        "s",
        "periodoSemana"
      ]
    )
  );

  if (!colaborador || !semana) {
    return null;
  }

  const total = dashPixNumero(
    dashPixValorDoPrimeiroCampo(
      registro,
      [
        "total",
        "bonusFinal",
        "bonus_final",
        "valorPago",
        "valor_pago",
        "valor",
        "premiacao",
        "premiação"
      ],
      0
    )
  );

  return {
    competencia: dashPixCompetenciaNormalizada(
      dashPixValorDoPrimeiroCampo(
        registro,
        [
          "competencia",
          "competência",
          "mes",
          "mês",
          "periodo"
        ]
      )
    ),

    semana,

    dn: dashPixResolverDn(
      filialBruta,
      dashPixValorDoPrimeiroCampo(
        registro,
        [
          "dn",
          "codigoDn",
          "codigo_dn"
        ]
      )
    ),

    filial: dashPixFilialLimpa(
      filialBruta
    ),

    colaborador: dashPixTexto(
      colaborador
    ),

    cargo: dashPixTexto(
      dashPixValorDoPrimeiroCampo(
        registro,
        [
          "cargo",
          "funcao",
          "função"
        ]
      )
    ),

    status: dashPixStatusNormalizado(
      dashPixValorDoPrimeiroCampo(
        registro,
        [
          "status",
          "habilitado",
          "situacao",
          "situação"
        ]
      )
    ),

    total,

    bonusFaturamento: dashPixNumero(
      dashPixValorDoPrimeiroCampo(
        registro,
        [
          "bonusFaturamento",
          "bonus_faturamento"
        ],
        0
      )
    ),

    bonusTicket: dashPixNumero(
      dashPixValorDoPrimeiroCampo(
        registro,
        [
          "bonusTicket",
          "bonus_ticket"
        ],
        0
      )
    ),

    bonusNps: dashPixNumero(
      dashPixValorDoPrimeiroCampo(
        registro,
        [
          "nps",
          "bonusNps",
          "bonus_nps"
        ],
        0
      )
    )
  };
}

/* =====================================================
   LEITURA PASSIVA DOS DADOS
===================================================== */

function dashPixLerArrayGlobal() {
  for (
    const nomeGlobal
    of dashboardPixGestorConfig.nomesArraysGlobais
  ) {
    const fonte = window[nomeGlobal];

    if (
      Array.isArray(fonte) &&
      fonte.length
    ) {
      return fonte
        .map(dashPixNormalizarRegistro)
        .filter(Boolean);
    }
  }

  return [];
}

function dashPixMapearCabecalho(tabela) {
  const mapa = {};

  const cabecalhos = [
    ...tabela.querySelectorAll("thead th")
  ];

  cabecalhos.forEach((th, indice) => {
    const texto = dashPixNormalizar(
      th.textContent
    );

    if (texto.includes("COMPET")) {
      mapa.competencia = indice;
    }

    if (texto.includes("SEMANA")) {
      mapa.semana = indice;
    }

    if (
      texto === "DN" ||
      texto.includes("CODIGO DN")
    ) {
      mapa.dn = indice;
    }

    if (
      texto.includes("FILIAL") ||
      texto.includes("UNIDADE")
    ) {
      mapa.filial = indice;
    }

    if (
      texto.includes("COLABORADOR") ||
      texto.includes("FUNCIONARIO") ||
      texto.includes("PARTICIPANTE")
    ) {
      mapa.colaborador = indice;
    }

    if (
      texto.includes("CARGO") ||
      texto.includes("FUNCAO")
    ) {
      mapa.cargo = indice;
    }

    if (
      texto === "TOTAL" ||
      texto.includes("BONUS FINAL") ||
      texto.includes("BÔNUS FINAL") ||
      texto.includes("VALOR PAGO")
    ) {
      mapa.total = indice;
    }

    if (texto.includes("STATUS")) {
      mapa.status = indice;
    }
  });

  return mapa;
}

function dashPixLerLinhaTabela(
  linha,
  mapa,
  competenciaPadrao = ""
) {
  const celulas = [
    ...linha.children
  ];

  if (celulas.length < 4) {
    return null;
  }

  const obterTexto = indice => {
    if (indice === undefined) {
      return "";
    }

    return dashPixTexto(
      celulas[indice]?.textContent
    ).replace(/\s+/g, " ");
  };

  const colaborador = obterTexto(
    mapa.colaborador ?? 3
  );

  const textoLinha = dashPixNormalizar(
    linha.textContent
  );

  if (
    !colaborador ||
    textoLinha.includes("NENHUM") ||
    textoLinha.includes("CARREGANDO")
  ) {
    return null;
  }

  const filialBruta = obterTexto(
    mapa.filial ?? 2
  );

  return {
    competencia: dashPixCompetenciaNormalizada(
      obterTexto(mapa.competencia) ||
      competenciaPadrao
    ),

    semana: dashPixSemanaNormalizada(
      obterTexto(mapa.semana ?? 1)
    ),

    dn: dashPixResolverDn(
      filialBruta,
      obterTexto(mapa.dn)
    ),

    filial: dashPixFilialLimpa(
      filialBruta
    ),

    colaborador,

    cargo: obterTexto(
      mapa.cargo ?? 4
    ),

    total: dashPixNumero(
      obterTexto(
        mapa.total ??
        Math.max(0, celulas.length - 3)
      )
    ),

    status: dashPixStatusNormalizado(
      obterTexto(
        mapa.status ??
        Math.max(0, celulas.length - 2)
      )
    )
  };
}

function dashPixLerTabelasUmaVez() {
  const registros = [];
  const assinaturas = new Set();

  for (
    const seletor
    of dashboardPixGestorConfig.tabelasFallback
  ) {
    const elemento = dashPix$(seletor);

    if (!elemento) {
      continue;
    }

    const tabela = elemento.tagName === "TABLE"
      ? elemento
      : elemento.closest("table");

    if (!tabela) {
      continue;
    }

    const mapa = dashPixMapearCabecalho(
      tabela
    );

    const linhas = [
      ...tabela.querySelectorAll("tbody tr")
    ];

    for (const linha of linhas) {
      const registro = dashPixLerLinhaTabela(
        linha,
        mapa,
        dashPixCompetenciaAtual()
      );

      if (
        !registro ||
        !registro.semana
      ) {
        continue;
      }

      const assinatura = [
        registro.competencia,
        registro.semana,
        registro.dn,
        registro.filial,
        registro.colaborador,
        registro.cargo,
        registro.total,
        registro.status
      ].join("|");

      if (assinaturas.has(assinatura)) {
        continue;
      }

      assinaturas.add(assinatura);
      registros.push(registro);
    }
  }

  return registros;
}

function dashPixObterDadosSomenteLeitura() {
  /*
  1. Prioridade máxima: dados entregues explicitamente pelo sistema.
  */
  if (
    Array.isArray(
      dashboardPixGestorEstado.dadosRecebidos
    ) &&
    dashboardPixGestorEstado.dadosRecebidos.length
  ) {
    return dashboardPixGestorEstado
      .dadosRecebidos
      .map(dashPixNormalizarRegistro)
      .filter(Boolean);
  }

  /*
  2. Segunda opção: array global já existente.
  */
  const dadosGlobais = dashPixLerArrayGlobal();

  if (dadosGlobais.length) {
    return dadosGlobais;
  }

  /*
  3. Último recurso: leitura pontual da tabela.
  Não há observação contínua.
  */
  return dashPixLerTabelasUmaVez();
}

/* =====================================================
   COMPETÊNCIA ATUAL
===================================================== */

function dashPixCompetenciaAtual() {
  const seletores = [
    "#pixDashboardGestorCompetencia",
    "#pixDashboardCompetencia",
    "#pixCompetencia",
    "#pixLancamentoCompetencia",
    "#competenciaGlobal",
    "input[type='month'][id*='pix' i]"
  ];

  const campo = dashPixPrimeiro(
    seletores
  );

  return dashPixCompetenciaNormalizada(
    campo?.value ||
    dashboardPixGestorEstado.competencia ||
    ""
  );
}

/* =====================================================
   FILTROS E CÁLCULOS
===================================================== */

function dashPixAplicarFiltros(dados) {
  const competencia = (
    dashboardPixGestorEstado.competencia ||
    dashPixCompetenciaAtual()
  );

  return dados.filter(registro => {
    if (
      competencia &&
      registro.competencia &&
      registro.competencia !== competencia
    ) {
      return false;
    }

    if (
      dashboardPixGestorEstado.semana &&
      registro.semana !== dashboardPixGestorEstado.semana
    ) {
      return false;
    }

    if (
      dashboardPixGestorEstado.dn &&
      registro.dn !== dashboardPixGestorEstado.dn
    ) {
      return false;
    }

    if (
      dashboardPixGestorEstado.filial &&
      dashPixNormalizar(registro.filial) !==
      dashPixNormalizar(
        dashboardPixGestorEstado.filial
      )
    ) {
      return false;
    }

    if (
      dashboardPixGestorEstado.status &&
      registro.status !== dashboardPixGestorEstado.status
    ) {
      return false;
    }

    return true;
  });
}

function dashPixSomenteHabilitados(dados) {
  return dados.filter(
    registro =>
      registro.status === "HABILITADO"
  );
}

function dashPixValoresUnicos(
  dados,
  campo
) {
  return [
    ...new Set(
      dados
        .map(registro =>
          dashPixTexto(registro[campo])
        )
        .filter(Boolean)
    )
  ].sort(
    (a, b) =>
      a.localeCompare(b, "pt-BR")
  );
}

function dashPixResumoSemanal(dados) {
  const resumo = {};

  for (
    const semana
    of dashboardPixGestorConfig.semanas
  ) {
    const registrosDaSemana = dados.filter(
      registro =>
        registro.semana === semana
    );

    const habilitadosDaSemana =
      dashPixSomenteHabilitados(
        registrosDaSemana
      );

    const investimento = habilitadosDaSemana
      .reduce(
        (soma, registro) =>
          soma + registro.total,
        0
      );

    resumo[semana] = {
      semana,
      participantes: registrosDaSemana.length,
      habilitados: habilitadosDaSemana.length,
      investimento,
      ticketMedio: habilitadosDaSemana.length
        ? investimento /
          habilitadosDaSemana.length
        : 0,
      percentualHabilitados:
        registrosDaSemana.length
          ? (
              habilitadosDaSemana.length /
              registrosDaSemana.length
            ) * 100
          : 0
    };
  }

  return resumo;
}

function dashPixAgruparInvestimento(
  dados,
  seletorNome
) {
  const mapa = new Map();

  for (const registro of dados) {
    const nome = seletorNome(registro);

    if (!nome) {
      continue;
    }

    mapa.set(
      nome,
      (
        mapa.get(nome) ||
        0
      ) + registro.total
    );
  }

  return [
    ...mapa.entries()
  ]
    .map(([nome, valor]) => ({
      nome,
      valor
    }))
    .sort(
      (a, b) =>
        b.valor - a.valor
    );
}

function dashPixClassePercentual(valor) {
  if (valor >= 90) {
    return "dash-pix-gestor-sucesso";
  }

  if (valor >= 80) {
    return "dash-pix-gestor-alerta";
  }

  return "dash-pix-gestor-perigo";
}

/* =====================================================
   ESTILOS
===================================================== */

function dashPixGarantirEstilos() {
  if (
    dashPix$("#dashboardPixGestorPassivoStyles")
  ) {
    return;
  }

  document.head.insertAdjacentHTML(
    "beforeend",
    `
    <style id="dashboardPixGestorPassivoStyles">
      .dashboard-pix-gestor {
        --dash-pix-azul: #0a3152;
        --dash-pix-verde: #087354;
        --dash-pix-texto: #172f40;
        --dash-pix-muted: #667b8a;
        --dash-pix-borda: #dce6ec;
        --dash-pix-fundo: #f5f8fa;
        margin: 18px 0 30px;
        color: var(--dash-pix-texto);
      }

      .dashboard-pix-gestor * {
        box-sizing: border-box;
      }

      .dashboard-pix-gestor-cabecalho {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 18px;
        padding: 22px;
        border-radius: 20px;
        background:
          linear-gradient(
            135deg,
            var(--dash-pix-azul),
            var(--dash-pix-verde)
          );
        color: #fff;
        box-shadow:
          0 16px 36px
          rgba(10, 49, 82, 0.17);
      }

      .dashboard-pix-gestor-cabecalho h2 {
        margin: 5px 0 7px;
        font-size:
          clamp(
            1.35rem,
            2.7vw,
            2rem
          );
      }

      .dashboard-pix-gestor-cabecalho p {
        margin: 0;
        opacity: 0.85;
      }

      .dashboard-pix-gestor-eyebrow {
        display: block;
        font-size: 0.73rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .dashboard-pix-gestor-acoes {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
      }

      .dashboard-pix-gestor-botao {
        min-height: 40px;
        padding: 9px 13px;
        border:
          1px solid
          rgba(255, 255, 255, 0.36);
        border-radius: 11px;
        background:
          rgba(255, 255, 255, 0.14);
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }

      .dashboard-pix-gestor-botao:hover {
        background:
          rgba(255, 255, 255, 0.23);
      }

      .dashboard-pix-gestor-filtros {
        display: grid;
        grid-template-columns:
          repeat(
            5,
            minmax(135px, 1fr)
          );
        gap: 11px;
        margin-top: 15px;
        padding: 15px;
        border:
          1px solid
          var(--dash-pix-borda);
        border-radius: 16px;
        background: #fff;
      }

      .dashboard-pix-gestor-campo {
        display: grid;
        gap: 6px;
      }

      .dashboard-pix-gestor-campo label {
        font-size: 0.71rem;
        font-weight: 800;
        color: var(--dash-pix-muted);
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .dashboard-pix-gestor-campo select,
      .dashboard-pix-gestor-campo input {
        width: 100%;
        min-height: 41px;
        padding: 8px 10px;
        border:
          1px solid
          var(--dash-pix-borda);
        border-radius: 10px;
        background: #fff;
        color: var(--dash-pix-texto);
      }

      .dashboard-pix-gestor-kpis {
        display: grid;
        grid-template-columns:
          repeat(
            4,
            minmax(0, 1fr)
          );
        gap: 13px;
        margin-top: 15px;
      }

      .dashboard-pix-gestor-card,
      .dashboard-pix-gestor-painel {
        padding: 18px;
        border:
          1px solid
          var(--dash-pix-borda);
        border-radius: 16px;
        background: #fff;
        box-shadow:
          0 8px 22px
          rgba(20, 43, 58, 0.05);
      }

      .dashboard-pix-gestor-card span {
        display: block;
        font-size: 0.72rem;
        font-weight: 800;
        color: var(--dash-pix-muted);
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .dashboard-pix-gestor-card strong {
        display: block;
        margin-top: 8px;
        color: var(--dash-pix-azul);
        font-size:
          clamp(
            1.3rem,
            2.3vw,
            1.9rem
          );
      }

      .dashboard-pix-gestor-card small {
        display: block;
        margin-top: 5px;
        color: var(--dash-pix-muted);
      }

      .dashboard-pix-gestor-painel {
        margin-top: 14px;
      }

      .dashboard-pix-gestor-painel h3 {
        margin: 0;
        color: var(--dash-pix-azul);
        font-size: 1.02rem;
      }

      .dashboard-pix-gestor-subtitulo {
        margin: 5px 0 16px;
        color: var(--dash-pix-muted);
        font-size: 0.83rem;
      }

      .dashboard-pix-gestor-semanas {
        display: grid;
        grid-template-columns:
          repeat(
            4,
            minmax(0, 1fr)
          );
        gap: 10px;
      }

      .dashboard-pix-gestor-semana {
        padding: 14px;
        border:
          1px solid
          var(--dash-pix-borda);
        border-radius: 13px;
        background:
          var(--dash-pix-fundo);
      }

      .dashboard-pix-gestor-semana b {
        font-size: 0.73rem;
        color: var(--dash-pix-muted);
      }

      .dashboard-pix-gestor-semana strong {
        display: block;
        margin: 7px 0 4px;
        color: var(--dash-pix-azul);
        font-size: 1.15rem;
      }

      .dashboard-pix-gestor-grid {
        display: grid;
        grid-template-columns:
          1.2fr 0.8fr;
        gap: 14px;
      }

      .dashboard-pix-gestor-barras {
        display: grid;
        gap: 12px;
      }

      .dashboard-pix-gestor-barra {
        display: grid;
        grid-template-columns:
          34px 1fr auto;
        gap: 9px;
        align-items: center;
      }

      .dashboard-pix-gestor-trilho {
        height: 13px;
        overflow: hidden;
        border-radius: 999px;
        background: #e6edf1;
      }

      .dashboard-pix-gestor-preenchimento {
        height: 100%;
        min-width: 2px;
        border-radius: inherit;
        background:
          linear-gradient(
            90deg,
            var(--dash-pix-azul),
            var(--dash-pix-verde)
          );
      }

      .dashboard-pix-gestor-linhas {
        display: grid;
      }

      .dashboard-pix-gestor-linha {
        display: grid;
        grid-template-columns:
          38px 1fr auto;
        align-items: center;
        gap: 9px;
        padding: 10px 0;
        border-bottom:
          1px solid
          var(--dash-pix-borda);
      }

      .dashboard-pix-gestor-linha:last-child {
        border-bottom: 0;
      }

      .dashboard-pix-gestor-pill {
        padding: 5px 8px;
        border-radius: 999px;
        font-size: 0.73rem;
        font-weight: 800;
      }

      .dash-pix-gestor-sucesso {
        background: #e6f7ef;
        color: #087344;
      }

      .dash-pix-gestor-alerta {
        background: #fff2d4;
        color: #8b6100;
      }

      .dash-pix-gestor-perigo {
        background: #fde8e8;
        color: #a42121;
      }

      .dashboard-pix-gestor-tabela-wrap {
        overflow: auto;
      }

      .dashboard-pix-gestor-tabela {
        width: 100%;
        border-collapse: collapse;
      }

      .dashboard-pix-gestor-tabela th,
      .dashboard-pix-gestor-tabela td {
        padding: 10px 9px;
        border-bottom:
          1px solid
          var(--dash-pix-borda);
        text-align: left;
        white-space: nowrap;
      }

      .dashboard-pix-gestor-tabela th {
        font-size: 0.69rem;
        color: var(--dash-pix-muted);
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .dashboard-pix-gestor-tabela th:last-child,
      .dashboard-pix-gestor-tabela td:last-child {
        text-align: right;
      }

      .dashboard-pix-gestor-vazio {
        padding: 24px;
        border:
          1px dashed
          var(--dash-pix-borda);
        border-radius: 12px;
        color: var(--dash-pix-muted);
        text-align: center;
      }

      .dashboard-pix-gestor-rodape {
        margin-top: 12px;
        color: var(--dash-pix-muted);
        font-size: 0.76rem;
        text-align: right;
      }

      @media (max-width: 1050px) {
        .dashboard-pix-gestor-filtros {
          grid-template-columns:
            repeat(
              3,
              minmax(140px, 1fr)
            );
        }

        .dashboard-pix-gestor-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 760px) {
        .dashboard-pix-gestor-cabecalho {
          flex-direction: column;
        }

        .dashboard-pix-gestor-kpis,
        .dashboard-pix-gestor-semanas {
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
        }
      }

      @media (max-width: 560px) {
        .dashboard-pix-gestor-filtros,
        .dashboard-pix-gestor-kpis,
        .dashboard-pix-gestor-semanas {
          grid-template-columns: 1fr;
        }
      }

      @media print {
        body * {
          visibility: hidden !important;
        }

        #dashboardPixGestorPassivo,
        #dashboardPixGestorPassivo * {
          visibility: visible !important;
        }

        #dashboardPixGestorPassivo {
          position: absolute;
          inset: 0;
          width: 100%;
          margin: 0;
        }

        .dashboard-pix-gestor-filtros,
        .dashboard-pix-gestor-acoes {
          display: none !important;
        }

        .dashboard-pix-gestor-card,
        .dashboard-pix-gestor-painel,
        .dashboard-pix-gestor-cabecalho {
          break-inside: avoid;
          box-shadow: none;
        }
      }
    </style>
    `
  );
}

/* =====================================================
   HTML PRINCIPAL
===================================================== */

function dashPixLocalizarContainerVisaoGeral() {
  return dashPixPrimeiro(
    dashboardPixGestorConfig.containersVisaoGeral
  );
}

function dashPixGarantirHtml() {
  const existente = dashPix$(
    "#dashboardPixGestorPassivo"
  );

  if (existente) {
    return existente;
  }

  const container =
    dashPixLocalizarContainerVisaoGeral();

  if (!container) {
    console.warn(
      "[DASHBOARD PIX GESTOR] " +
      "Container da Visão Geral do Gestor não encontrado."
    );

    return null;
  }

  container.insertAdjacentHTML(
    "afterbegin",
    `
    <section
      id="dashboardPixGestorPassivo"
      class="dashboard-pix-gestor"
    >
      <header
        class="dashboard-pix-gestor-cabecalho"
      >
        <div>
          <span
            class="dashboard-pix-gestor-eyebrow"
          >
            Visão Geral do Gestor
          </span>

          <h2>
            Investimento do Pix do Presidente
          </h2>

          <p id="dashboardPixGestorPeriodo">
            Acompanhamento financeiro por semana
          </p>
        </div>

        <div
          class="dashboard-pix-gestor-acoes"
        >
          <button
            type="button"
            class="dashboard-pix-gestor-botao"
            id="dashboardPixGestorAtualizar"
          >
            Atualizar painel
          </button>

          <button
            type="button"
            class="dashboard-pix-gestor-botao"
            id="dashboardPixGestorImprimir"
          >
            Exportar PDF
          </button>
        </div>
      </header>

      <div
        class="dashboard-pix-gestor-filtros"
      >
        <div
          class="dashboard-pix-gestor-campo"
        >
          <label
            for="pixDashboardGestorCompetencia"
          >
            Competência
          </label>

          <input
            type="month"
            id="pixDashboardGestorCompetencia"
          >
        </div>

        <div
          class="dashboard-pix-gestor-campo"
        >
          <label
            for="pixDashboardGestorSemana"
          >
            Semana
          </label>

          <select
            id="pixDashboardGestorSemana"
          >
            <option value="">
              Todas
            </option>

            <option value="S1">
              Semana 1
            </option>

            <option value="S2">
              Semana 2
            </option>

            <option value="S3">
              Semana 3
            </option>

            <option value="S4">
              Semana 4
            </option>
          </select>
        </div>

        <div
          class="dashboard-pix-gestor-campo"
        >
          <label
            for="pixDashboardGestorDn"
          >
            DN
          </label>

          <select
            id="pixDashboardGestorDn"
          >
            <option value="">
              Todos
            </option>
          </select>
        </div>

        <div
          class="dashboard-pix-gestor-campo"
        >
          <label
            for="pixDashboardGestorFilial"
          >
            Filial
          </label>

          <select
            id="pixDashboardGestorFilial"
          >
            <option value="">
              Todas
            </option>
          </select>
        </div>

        <div
          class="dashboard-pix-gestor-campo"
        >
          <label
            for="pixDashboardGestorStatus"
          >
            Status
          </label>

          <select
            id="pixDashboardGestorStatus"
          >
            <option value="">
              Todos
            </option>

            <option value="HABILITADO">
              Habilitados
            </option>

            <option value="NÃO HABILITADO">
              Não habilitados
            </option>
          </select>
        </div>
      </div>

      <div
        id="dashboardPixGestorConteudo"
      ></div>

      <div
        class="dashboard-pix-gestor-rodape"
        id="dashboardPixGestorRodape"
      ></div>
    </section>
    `
  );

  dashPixConfigurarEventos();

  return dashPix$(
    "#dashboardPixGestorPassivo"
  );
}

/* =====================================================
   FILTROS VISUAIS
===================================================== */

function dashPixPreencherSelect(
  seletor,
  valores,
  valorSelecionado,
  textoPadrao
) {
  const select = dashPix$(seletor);

  if (!select) {
    return;
  }

  select.innerHTML = `
    <option value="">
      ${dashPixEscapar(textoPadrao)}
    </option>
  ` + valores
    .map(valor => `
      <option
        value="${dashPixEscapar(valor)}"
        ${
          valor === valorSelecionado
            ? "selected"
            : ""
        }
      >
        ${dashPixEscapar(valor)}
      </option>
    `)
    .join("");
}

function dashPixAtualizarOpcoesFiltros(
  dados
) {
  dashPixPreencherSelect(
    "#pixDashboardGestorDn",
    dashPixValoresUnicos(
      dados,
      "dn"
    ),
    dashboardPixGestorEstado.dn,
    "Todos"
  );

  dashPixPreencherSelect(
    "#pixDashboardGestorFilial",
    dashPixValoresUnicos(
      dados,
      "filial"
    ),
    dashboardPixGestorEstado.filial,
    "Todas"
  );
}

/* =====================================================
   TABELAS
===================================================== */

function dashPixHtmlRanking(
  titulo,
  subtitulo,
  itens,
  limite = 10
) {
  return `
    <section
      class="dashboard-pix-gestor-painel"
    >
      <h3>
        ${dashPixEscapar(titulo)}
      </h3>

      <p
        class="dashboard-pix-gestor-subtitulo"
      >
        ${dashPixEscapar(subtitulo)}
      </p>

      ${
        itens.length
          ? `
            <div
              class="dashboard-pix-gestor-tabela-wrap"
            >
              <table
                class="dashboard-pix-gestor-tabela"
              >
                <thead>
                  <tr>
                    <th>Posição</th>
                    <th>Descrição</th>
                    <th>Investimento</th>
                  </tr>
                </thead>

                <tbody>
                  ${
                    itens
                      .slice(0, limite)
                      .map(
                        (item, indice) => `
                          <tr>
                            <td>
                              ${indice + 1}º
                            </td>

                            <td>
                              ${dashPixEscapar(item.nome)}
                            </td>

                            <td>
                              ${dashPixMoeda(item.valor)}
                            </td>
                          </tr>
                        `
                      )
                      .join("")
                  }
                </tbody>
              </table>
            </div>
          `
          : `
            <div
              class="dashboard-pix-gestor-vazio"
            >
              Nenhum resultado encontrado.
            </div>
          `
      }
    </section>
  `;
}

/* =====================================================
   RENDERIZAÇÃO
===================================================== */

function dashPixRenderizar(
  dadosFiltrados,
  resumo
) {
  const conteudo = dashPix$(
    "#dashboardPixGestorConteudo"
  );

  if (!conteudo) {
    return;
  }

  const premiados =
    dashPixSomenteHabilitados(
      dadosFiltrados
    );

  const totalInvestido = premiados.reduce(
    (soma, registro) =>
      soma + registro.total,
    0
  );

  const totalHabilitados =
    premiados.length;

  const totalFiliais = new Set(
    premiados
      .map(registro =>
        dashPixNormalizar(
          registro.filial
        )
      )
      .filter(Boolean)
  ).size;

  const ticketMedio =
    totalHabilitados
      ? totalInvestido /
        totalHabilitados
      : 0;

  const maiorInvestimentoSemanal =
    Math.max(
      1,
      ...dashboardPixGestorConfig
        .semanas
        .map(
          semana =>
            resumo[semana].investimento
        )
    );

  let valorAcumulado = 0;

  const acumulados =
    dashboardPixGestorConfig
      .semanas
      .map(semana => {
        valorAcumulado +=
          resumo[semana].investimento;

        return {
          semana,
          valor: valorAcumulado
        };
      });

  const rankingFiliais =
    dashPixAgruparInvestimento(
      premiados,
      registro => registro.filial
    );

  const rankingDns =
    dashPixAgruparInvestimento(
      premiados,
      registro =>
        registro.dn ||
        "Sem DN"
    );

  const topPremiacoes = [
    ...premiados
  ]
    .sort(
      (a, b) =>
        b.total - a.total
    )
    .slice(0, 10);

  conteudo.innerHTML = `
    <div
      class="dashboard-pix-gestor-kpis"
    >
      <article
        class="dashboard-pix-gestor-card"
      >
        <span>
          Total investido
        </span>

        <strong>
          ${dashPixMoeda(totalInvestido)}
        </strong>

        <small>
          Somente colaboradores habilitados
        </small>
      </article>

      <article
        class="dashboard-pix-gestor-card"
      >
        <span>
          Total de habilitados
        </span>

        <strong>
          ${
            dashboardPixGestorConfig
              .numero
              .format(totalHabilitados)
          }
        </strong>

        <small>
          Colaboradores premiados
        </small>
      </article>

      <article
        class="dashboard-pix-gestor-card"
      >
        <span>
          Filiais premiadas
        </span>

        <strong>
          ${
            dashboardPixGestorConfig
              .numero
              .format(totalFiliais)
          }
        </strong>

        <small>
          Unidades com pagamento
        </small>
      </article>

      <article
        class="dashboard-pix-gestor-card"
      >
        <span>
          Ticket médio pago
        </span>

        <strong>
          ${dashPixMoeda(ticketMedio)}
        </strong>

        <small>
          Investimento dividido pelos habilitados
        </small>
      </article>
    </div>

    <section
      class="dashboard-pix-gestor-painel"
    >
      <h3>
        Investimento por semana
      </h3>

      <p
        class="dashboard-pix-gestor-subtitulo"
      >
        Valores pagos aos colaboradores habilitados
      </p>

      <div
        class="dashboard-pix-gestor-semanas"
      >
        ${
          dashboardPixGestorConfig
            .semanas
            .map(semana => `
              <article
                class="dashboard-pix-gestor-semana"
              >
                <b>
                  SEMANA ${
                    semana.replace("S", "")
                  }
                </b>

                <strong>
                  ${
                    dashPixMoeda(
                      resumo[semana]
                        .investimento
                    )
                  }
                </strong>

                <small>
                  ${
                    resumo[semana]
                      .habilitados
                  }
                  habilitado(s)
                </small>
              </article>
            `)
            .join("")
        }
      </div>
    </section>

    <div
      class="dashboard-pix-gestor-grid"
    >
      <section
        class="dashboard-pix-gestor-painel"
      >
        <h3>
          Evolução do investimento
        </h3>

        <p
          class="dashboard-pix-gestor-subtitulo"
        >
          Comparativo financeiro entre S1, S2, S3 e S4
        </p>

        <div
          class="dashboard-pix-gestor-barras"
        >
          ${
            dashboardPixGestorConfig
              .semanas
              .map(semana => {
                const investimento =
                  resumo[semana]
                    .investimento;

                const percentualBarra =
                  investimento
                    ? Math.max(
                        3,
                        (
                          investimento /
                          maiorInvestimentoSemanal
                        ) * 100
                      )
                    : 0;

                return `
                  <div
                    class="dashboard-pix-gestor-barra"
                  >
                    <b>
                      ${semana}
                    </b>

                    <div
                      class="dashboard-pix-gestor-trilho"
                    >
                      <div
                        class="dashboard-pix-gestor-preenchimento"
                        style="
                          width:
                          ${percentualBarra}%
                        "
                      ></div>
                    </div>

                    <strong>
                      ${
                        dashPixMoeda(
                          investimento
                        )
                      }
                    </strong>
                  </div>
                `;
              })
              .join("")
          }
        </div>
      </section>

      <section
        class="dashboard-pix-gestor-painel"
      >
        <h3>
          Percentual de habilitados
        </h3>

        <p
          class="dashboard-pix-gestor-subtitulo"
        >
          Habilitados em relação aos participantes
        </p>

        <div
          class="dashboard-pix-gestor-linhas"
        >
          ${
            dashboardPixGestorConfig
              .semanas
              .map(semana => {
                const dadosSemana =
                  resumo[semana];

                return `
                  <div
                    class="dashboard-pix-gestor-linha"
                  >
                    <b>
                      ${semana}
                    </b>

                    <span>
                      ${
                        dadosSemana
                          .habilitados
                      }
                      de
                      ${
                        dadosSemana
                          .participantes
                      }
                    </span>

                    <span
                      class="
                        dashboard-pix-gestor-pill
                        ${
                          dashPixClassePercentual(
                            dadosSemana
                              .percentualHabilitados
                          )
                        }
                      "
                    >
                      ${
                        dadosSemana
                          .percentualHabilitados
                          .toFixed(1)
                      }%
                    </span>
                  </div>
                `;
              })
              .join("")
          }
        </div>
      </section>
    </div>

    <div
      class="dashboard-pix-gestor-grid"
    >
      <section
        class="dashboard-pix-gestor-painel"
      >
        <h3>
          Investimento acumulado
        </h3>

        <p
          class="dashboard-pix-gestor-subtitulo"
        >
          Evolução do desembolso ao longo do mês
        </p>

        <div
          class="dashboard-pix-gestor-linhas"
        >
          ${
            acumulados
              .map(item => `
                <div
                  class="dashboard-pix-gestor-linha"
                >
                  <b>
                    ${item.semana}
                  </b>

                  <span>
                    Acumulado até
                    ${item.semana}
                  </span>

                  <strong>
                    ${
                      dashPixMoeda(
                        item.valor
                      )
                    }
                  </strong>
                </div>
              `)
              .join("")
          }
        </div>
      </section>

      <section
        class="dashboard-pix-gestor-painel"
      >
        <h3>
          Ticket médio por semana
        </h3>

        <p
          class="dashboard-pix-gestor-subtitulo"
        >
          Investimento dividido pelos habilitados
        </p>

        <div
          class="dashboard-pix-gestor-linhas"
        >
          ${
            dashboardPixGestorConfig
              .semanas
              .map(semana => `
                <div
                  class="dashboard-pix-gestor-linha"
                >
                  <b>
                    ${semana}
                  </b>

                  <span>
                    ${
                      resumo[semana]
                        .habilitados
                    }
                    habilitado(s)
                  </span>

                  <strong>
                    ${
                      dashPixMoeda(
                        resumo[semana]
                          .ticketMedio
                      )
                    }
                  </strong>
                </div>
              `)
              .join("")
          }
        </div>
      </section>
    </div>

    <div
      class="dashboard-pix-gestor-grid"
    >
      ${
        dashPixHtmlRanking(
          "Ranking das filiais",
          "Unidades ordenadas pelo maior investimento",
          rankingFiliais,
          10
        )
      }

      ${
        dashPixHtmlRanking(
          "Ranking dos DNs",
          "Investimento consolidado por DN",
          rankingDns,
          10
        )
      }
    </div>

    <section
      class="dashboard-pix-gestor-painel"
    >
      <h3>
        Top 10 maiores premiações
      </h3>

      <p
        class="dashboard-pix-gestor-subtitulo"
      >
        Maiores valores pagos no filtro atual
      </p>

      ${
        topPremiacoes.length
          ? `
            <div
              class="dashboard-pix-gestor-tabela-wrap"
            >
              <table
                class="dashboard-pix-gestor-tabela"
              >
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Filial</th>
                    <th>Semana</th>
                    <th>Valor</th>
                  </tr>
                </thead>

                <tbody>
                  ${
                    topPremiacoes
                      .map(registro => `
                        <tr>
                          <td>
                            ${
                              dashPixEscapar(
                                registro.colaborador
                              )
                            }
                          </td>

                          <td>
                            ${
                              dashPixEscapar(
                                registro.filial
                              )
                            }
                          </td>

                          <td>
                            ${
                              dashPixEscapar(
                                registro.semana
                              )
                            }
                          </td>

                          <td>
                            ${
                              dashPixMoeda(
                                registro.total
                              )
                            }
                          </td>
                        </tr>
                      `)
                      .join("")
                  }
                </tbody>
              </table>
            </div>
          `
          : `
            <div
              class="dashboard-pix-gestor-vazio"
            >
              Nenhuma premiação encontrada.
            </div>
          `
      }
    </section>
  `;
}

/* =====================================================
   ATUALIZAÇÃO PASSIVA
===================================================== */

function atualizarDashboardGestorPix(
  dadosExternos = null
) {
  if (
    dashboardPixGestorEstado.renderizando
  ) {
    return;
  }

  dashboardPixGestorEstado.renderizando =
    true;

  try {
    dashPixGarantirEstilos();

    const dashboard =
      dashPixGarantirHtml();

    if (!dashboard) {
      return;
    }

    if (
      Array.isArray(dadosExternos)
    ) {
      /*
      Cria uma cópia para impedir que o dashboard
      altere o array original do sistema.
      */
      dashboardPixGestorEstado
        .dadosRecebidos = dadosExternos
        .map(registro => ({
          ...registro
        }));
    }

    const todosOsDados =
      dashPixObterDadosSomenteLeitura();

    dashboardPixGestorEstado
      .competencia =
        dashPixCompetenciaNormalizada(
          dashPix$(
            "#pixDashboardGestorCompetencia"
          )?.value ||
          dashboardPixGestorEstado
            .competencia ||
          dashPixCompetenciaAtual()
        );

    const campoCompetencia = dashPix$(
      "#pixDashboardGestorCompetencia"
    );

    if (
      campoCompetencia &&
      !campoCompetencia.value &&
      dashboardPixGestorEstado
        .competencia
    ) {
      campoCompetencia.value =
        dashboardPixGestorEstado
          .competencia;
    }

    dashPixAtualizarOpcoesFiltros(
      todosOsDados
    );

    const dadosFiltrados =
      dashPixAplicarFiltros(
        todosOsDados
      );

    const resumo =
      dashPixResumoSemanal(
        dadosFiltrados
      );

    dashPixRenderizar(
      dadosFiltrados,
      resumo
    );

    const periodo = dashPix$(
      "#dashboardPixGestorPeriodo"
    );

    if (periodo) {
      periodo.textContent = `
        Acompanhamento financeiro por semana •
        Competência
        ${
          dashPixCompetenciaExibicao(
            dashboardPixGestorEstado
              .competencia
          )
        }
      `.replace(/\s+/g, " ").trim();
    }

    dashboardPixGestorEstado
      .ultimaAtualizacao =
        new Date();

    const rodape = dashPix$(
      "#dashboardPixGestorRodape"
    );

    if (rodape) {
      rodape.textContent = `
        Última atualização:
        ${
          dashboardPixGestorEstado
            .ultimaAtualizacao
            .toLocaleString("pt-BR")
        }
      `.replace(/\s+/g, " ").trim();
    }

    console.info(
      "[DASHBOARD PIX GESTOR] Atualizado.",
      {
        versao:
          DASHBOARD_PIX_GESTOR_VERSAO,
        registros:
          dadosFiltrados.length,
        competencia:
          dashboardPixGestorEstado
            .competencia
      }
    );
  } catch (erro) {
    console.error(
      "[DASHBOARD PIX GESTOR] Erro:",
      erro
    );

    const conteudo = dashPix$(
      "#dashboardPixGestorConteudo"
    );

    if (conteudo) {
      conteudo.innerHTML = `
        <div
          class="dashboard-pix-gestor-vazio"
        >
          Não foi possível montar o dashboard.
          <br>
          ${
            dashPixEscapar(
              erro.message ||
              "Erro desconhecido"
            )
          }
        </div>
      `;
    }
  } finally {
    dashboardPixGestorEstado.renderizando =
      false;
  }
}

/* =====================================================
   EVENTOS
===================================================== */

function dashPixConfigurarEventos() {
  const dashboard = dashPix$(
    "#dashboardPixGestorPassivo"
  );

  if (
    !dashboard ||
    dashboard.dataset.eventos === "true"
  ) {
    return;
  }

  dashboard.dataset.eventos = "true";

  dashPix$(
    "#dashboardPixGestorAtualizar"
  )?.addEventListener(
    "click",
    () => {
      atualizarDashboardGestorPix();
    }
  );

  dashPix$(
    "#dashboardPixGestorImprimir"
  )?.addEventListener(
    "click",
    () => {
      window.print();
    }
  );

  dashPix$(
    "#pixDashboardGestorCompetencia"
  )?.addEventListener(
    "change",
    evento => {
      dashboardPixGestorEstado
        .competencia =
          dashPixCompetenciaNormalizada(
            evento.target.value
          );

      atualizarDashboardGestorPix();
    }
  );

  dashPix$(
    "#pixDashboardGestorSemana"
  )?.addEventListener(
    "change",
    evento => {
      dashboardPixGestorEstado
        .semana =
          evento.target.value;

      atualizarDashboardGestorPix();
    }
  );

  dashPix$(
    "#pixDashboardGestorDn"
  )?.addEventListener(
    "change",
    evento => {
      dashboardPixGestorEstado
        .dn =
          evento.target.value;

      atualizarDashboardGestorPix();
    }
  );

  dashPix$(
    "#pixDashboardGestorFilial"
  )?.addEventListener(
    "change",
    evento => {
      dashboardPixGestorEstado
        .filial =
          evento.target.value;

      atualizarDashboardGestorPix();
    }
  );

  dashPix$(
    "#pixDashboardGestorStatus"
  )?.addEventListener(
    "change",
    evento => {
      dashboardPixGestorEstado
        .status =
          evento.target.value;

      atualizarDashboardGestorPix();
    }
  );
}

/* =====================================================
   INTEGRAÇÃO COM O PIX
===================================================== */

/*
Depois de salvar, editar ou excluir um lançamento no arquivo pix-presidente.js,
adicione UMA destas linhas:

window.atualizarDashboardGestorPix?.();

ou, caso você tenha o array atual de lançamentos:

window.atualizarDashboardGestorPix?.(pixLancamentos);

O dashboard não fica observando a página.
Ele só atualiza quando for chamado.
*/

/*
Também aceitamos eventos personalizados.
O sistema pode disparar:

window.dispatchEvent(
  new CustomEvent(
    "pix:dashboard-gestor-atualizar",
    {
      detail: {
        dados: pixLancamentos
      }
    }
  )
);
*/

window.addEventListener(
  "pix:dashboard-gestor-atualizar",
  evento => {
    const dados =
      evento.detail?.dados;

    atualizarDashboardGestorPix(
      Array.isArray(dados)
        ? dados
        : null
    );
  }
);

/*
Atualização opcional ao abrir especificamente
a Visão Geral do Gestor.
Não existe observador contínuo.
*/
document.addEventListener(
  "click",
  evento => {
    const botaoVisaoGeral =
      evento.target.closest(
        [
          "[data-pix-view='visao-geral-gestor']",
          "[data-view='pix-visao-geral-gestor']",
          "#btnPixVisaoGeralGestor",
          "#menuPixVisaoGeralGestor",
          ".btn-pix-visao-geral-gestor"
        ].join(",")
      );

    if (botaoVisaoGeral) {
      /*
      O pequeno atraso permite que a tela
      seja exibida antes da renderização.
      */
      window.setTimeout(
        () => {
          atualizarDashboardGestorPix();
        },
        80
      );
    }
  }
);

/* =====================================================
   INICIALIZAÇÃO
===================================================== */

function iniciarDashboardPixGestorPassivo() {
  dashPixGarantirEstilos();

  const dashboard =
    dashPixGarantirHtml();

  if (dashboard) {
    atualizarDashboardGestorPix();
  }

  console.info(
    "[DASHBOARD PIX GESTOR] " +
    "Módulo passivo iniciado.",
    DASHBOARD_PIX_GESTOR_VERSAO
  );
}

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    iniciarDashboardPixGestorPassivo,
    {
      once: true
    }
  );
} else {
  iniciarDashboardPixGestorPassivo();
}

/* =====================================================
   FUNÇÕES PÚBLICAS
===================================================== */

window.atualizarDashboardGestorPix =
  atualizarDashboardGestorPix;

window.dashboardPixGestorPassivo = {
  atualizar:
    atualizarDashboardGestorPix,

  definirDados(dados) {
    if (!Array.isArray(dados)) {
      console.warn(
        "[DASHBOARD PIX GESTOR] " +
        "definirDados precisa receber um array."
      );

      return;
    }

    atualizarDashboardGestorPix(
      dados
    );
  },

  limparDadosRecebidos() {
    dashboardPixGestorEstado
      .dadosRecebidos = [];

    atualizarDashboardGestorPix();
  },

  obterEstado() {
    return {
      ...dashboardPixGestorEstado,
      dadosRecebidos: [
        ...dashboardPixGestorEstado
          .dadosRecebidos
      ]
    };
  },

  versao:
    DASHBOARD_PIX_GESTOR_VERSAO
};