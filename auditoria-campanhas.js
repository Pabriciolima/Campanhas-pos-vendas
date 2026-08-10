/*
===============================================================================
COMPARATIVO ENTRE MESES — PRODUTIVOS + PIX DO PRESIDENTE
Arquivo: comparativo-mensal-campanhas.js
Versão: 2026.08.08-01
===============================================================================

ADITIVO E NÃO DESTRUTIVO
- Não altera script.js.
- Não altera pix-presidente.js.
- Lê as coleções oficiais do Firestore.
- Injeta o comparativo na área "Visão geral" dos dois módulos.
- Compara a competência selecionada com o mês imediatamente anterior.
- Respeita filtro de DN/Filial dos Produtivos quando presente.
- No Pix, compara o consolidado mensal e respeita DN/Filial quando os filtros
  correspondentes existirem no dashboard.

MÉTRICAS
- Avaliados
- Habilitados
- Taxa de habilitação
- Investimento
===============================================================================
*/

import { firestore } from "./firebase-config.js";

import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const COMPARATIVO_VERSAO =
  "2026.08.09-03";

const dados = {
  funcionariosProdutivos: [],
  lancamentosProdutivos: [],
  funcionariosPix: [],
  lancamentosPix: []
};

const POLITICAS_PIX_COMPARATIVO = {
  "CONSULTOR TECNICO": {
    metrica: "ticket",
    bonusBase: 600,
    bonusNps: 1000,
    faixas: [
      [7300, 500],
      [7500, 600],
      [7800, 700],
      [8100, 800]
    ]
  },

  "SUPERVISOR DE ASSISTENCIA": {
    metrica: "ticket",
    bonusBase: 900,
    bonusNps: 1000,
    faixas: [
      [7300, 600],
      [7500, 700],
      [7800, 800],
      [8100, 900]
    ]
  },

  "CONSULTOR PECAS BALCAO": {
    metrica: "margem",
    bonusBase: 800,
    bonusNps: 0,
    faixas: [
      [20, 300],
      [25, 400],
      [30, 500],
      [35, 600]
    ]
  },

  "SUPERVISOR PECAS": {
    metrica: "margem",
    bonusBase: 900,
    bonusNps: 0,
    faixas: [
      [20, 300],
      [25, 400],
      [30, 500],
      [35, 600]
    ]
  },

  "SUPERVISOR POS-VENDAS": {
    metrica: "ticket",
    bonusBase: 900,
    bonusNps: 1000,
    faixas: [
      [7300, 600],
      [7500, 700],
      [7800, 800],
      [8100, 900]
    ]
  },

  "COORDENADOR": {
    metrica: "ticket",
    bonusBase: 1000,
    bonusNps: 1000,
    faixas: [
      [7300, 600],
      [7500, 700],
      [7800, 800],
      [8100, 900]
    ]
  },

  "GERENTE": {
    metrica: "ticket",
    bonusBase: 1100,
    bonusNps: 1000,
    faixas: [
      [7300, 600],
      [7500, 700],
      [7800, 800],
      [8100, 900]
    ]
  },

  "ORCAMENTISTA / FACILITADOR DE NEGOCIOS": {
    metrica: "ticket",
    bonusBase: 300,
    bonusNps: 0,
    faixas: [
      [7300, 400],
      [7500, 500],
      [7800, 600],
      [8100, 700]
    ]
  }
};

function texto(valor) {
  return String(valor ?? "").trim();
}

function normalizar(valor) {
  return texto(valor)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function numero(valor) {
  if (typeof valor === "number") {
    return Number.isFinite(valor)
      ? valor
      : 0;
  }

  let resultado =
    texto(valor)
      .replace(/\s/g, "")
      .replace(/R\$/gi, "")
      .replace(/%/g, "");

  if (!resultado) return 0;

  if (resultado.includes(",")) {
    resultado = resultado
      .replace(/\./g, "")
      .replace(",", ".");
  }

  resultado =
    resultado.replace(
      /[^\d.-]/g,
      ""
    );

  const convertido =
    Number(resultado);

  return Number.isFinite(
    convertido
  )
    ? convertido
    : 0;
}

function moeda(valor) {
  return numero(valor)
    .toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL"
      }
    );
}

function pct(valor) {
  return `${numero(valor)
    .toFixed(1)
    .replace(".", ",")}%`;
}

function mesAnterior(
  competencia
) {
  const [
    ano,
    mes
  ] =
    texto(
      competencia
    )
      .split("-")
      .map(Number);

  if (!ano || !mes) {
    return "";
  }

  const data =
    new Date(
      ano,
      mes - 2,
      1
    );

  return [
    data.getFullYear(),
    String(
      data.getMonth() + 1
    ).padStart(
      2,
      "0"
    )
  ].join("-");
}

function nomeMes(
  competencia
) {
  const [
    ano,
    mes
  ] =
    texto(
      competencia
    )
      .split("-")
      .map(Number);

  if (!ano || !mes) {
    return competencia || "—";
  }

  return new Date(
    ano,
    mes - 1,
    1
  )
    .toLocaleDateString(
      "pt-BR",
      {
        month: "long",
        year: "numeric"
      }
    )
    .replace(
      /^./,
      letra =>
        letra.toUpperCase()
    );
}

function delta(
  atual,
  anterior,
  tipo = "numero"
) {
  const a = numero(atual);
  const b = numero(anterior);

  if (b === 0) {
    if (a === 0) {
      return {
        texto: "0%",
        classe: "neutro"
      };
    }

    return {
      texto: "novo",
      classe:
        a > 0
          ? "positivo"
          : "negativo"
    };
  }

  const percentual =
    ((a - b) / Math.abs(b)) *
    100;

  const sinal =
    percentual > 0
      ? "+"
      : "";

  return {
    texto:
      tipo === "pontos"
        ? `${a - b >= 0 ? "+" : ""}${(a - b).toFixed(1).replace(".", ",")} p.p.`
        : `${sinal}${percentual.toFixed(1).replace(".", ",")}%`,
    classe:
      percentual > 0
        ? "positivo"
        : percentual < 0
          ? "negativo"
          : "neutro"
  };
}

function cargoAutomatico(
  cargo
) {
  return [
    "CHEFE DE OFICINA",
    "MECANICO LIDER",
    "CONTROLADOR DE PRODUTIVIDADE"
  ].includes(
    normalizar(cargo)
  );
}

function bonusMecanicoProd(
  valor
) {
  if (valor >= 100) return 1000;
  if (valor >= 90) return 790;
  if (valor >= 80) return 690;
  if (valor >= 70) return 600;
  return 0;
}

function bonusMecanicoEfic(
  valor
) {
  if (valor >= 100) return 1000;
  if (valor >= 90) return 790;
  if (valor >= 80) return 690;
  return 0;
}

function bonusControladorProd(
  valor
) {
  if (valor >= 90) return 500;
  if (valor >= 80) return 300;
  if (valor >= 70) return 100;
  return 0;
}

function bonusControladorEfic(
  valor
) {
  if (valor >= 100) return 500;
  if (valor >= 90) return 300;
  if (valor >= 80) return 100;
  return 0;
}

function calcularMecanico(
  lancamento
) {
  const hd =
    numero(
      lancamento.horasDisponiveis
    );

  const ht =
    numero(
      lancamento.horasTrabalhadas
    );

  const hv =
    numero(
      lancamento.horasVendidas
    );

  const produtividade =
    hd > 0
      ? ht / hd * 100
      : 0;

  const eficiencia =
    ht > 0
      ? hv / ht * 100
      : 0;

  const minimoHoraVendida =
    hv >= hd * 0.7;

  let bonusBruto = 0;
  let penalidade = 0;
  let status =
    "NÃO HABILITADO";

  if (
    produtividade >= 70 &&
    eficiencia >= 80 &&
    minimoHoraVendida
  ) {
    bonusBruto =
      bonusMecanicoProd(
        produtividade
      ) +
      bonusMecanicoEfic(
        eficiencia
      );

    status = "HABILITADO";
  }

  if (
    lancamento.osPrejuizo === true ||
    lancamento.osPrejuizo === "true"
  ) {
    bonusBruto = 0;
    penalidade = 0;
    status = "NÃO HABILITADO";
  } else if (
    status === "HABILITADO" &&
    (
      lancamento.treinamentoPendente === true ||
      lancamento.treinamentoPendente === "true"
    )
  ) {
    penalidade =
      bonusBruto * 0.5;
  }

  return {
    ...lancamento,
    produtividade,
    eficiencia,
    bonusBruto,
    penalidade,
    bonusFinal:
      Math.max(
        0,
        bonusBruto -
        penalidade
      ),
    status
  };
}

function resultadoEquipeProdutivos(
  competencia,
  filial
) {
  const unicos =
    new Map();

  dados.lancamentosProdutivos
    .filter(item =>
      item.competencia ===
        competencia &&
      normalizar(item.filial) ===
        normalizar(filial) &&
      normalizar(item.cargo) ===
        "MECANICO PRODUTIVO"
    )
    .forEach(item => {
      const chave =
        texto(
          item.funcionarioId
        ) ||
        `${normalizar(
          item.nome
        )}|${normalizar(
          item.filial
        )}`;

      const atual =
        unicos.get(chave);

      if (
        !atual ||
        numero(
          item.faturamento
        ) >
          numero(
            atual.faturamento
          )
      ) {
        unicos.set(
          chave,
          item
        );
      }
    });

  let qtd50 = 0;
  let qtd60 = 0;
  let hd = 0;
  let ht = 0;
  let hv = 0;

  unicos.forEach(item => {
    const fat =
      numero(
        item.faturamento
      );

    if (fat >= 60000) {
      qtd60 += 1;
    } else if (
      fat >= 50000
    ) {
      qtd50 += 1;
    }

    hd +=
      numero(
        item.horasDisponiveis
      );

    ht +=
      numero(
        item.horasTrabalhadas
      );

    hv +=
      numero(
        item.horasVendidas
      );
  });

  return {
    totalMecanicos:
      unicos.size,
    qtd50,
    qtd60,
    bonusChefe:
      qtd50 * 300 +
      qtd60 * 500,
    produtividade:
      hd > 0
        ? ht / hd * 100
        : 0,
    eficiencia:
      ht > 0
        ? hv / ht * 100
        : 0
  };
}

function calcularResultadosProdutivos(
  competencia
) {
  const resultados = [];

  dados.lancamentosProdutivos
    .filter(item =>
      item.competencia ===
        competencia &&
      !cargoAutomatico(
        item.cargo
      )
    )
    .forEach(item => {
      if (
        normalizar(
          item.cargo
        ) ===
          "MECANICO PRODUTIVO"
      ) {
        resultados.push(
          calcularMecanico(
            item
          )
        );
      }
    });

  const filiaisComMecanicos =
    [
      ...new Set(
        dados.lancamentosProdutivos
          .filter(item =>
            item.competencia ===
              competencia &&
            normalizar(
              item.cargo
            ) ===
              "MECANICO PRODUTIVO"
          )
          .map(item =>
            texto(
              item.filial
            )
          )
          .filter(Boolean)
      )
    ];

  filiaisComMecanicos.forEach(
    filial => {
      const equipe =
        resultadoEquipeProdutivos(
          competencia,
          filial
        );

      dados.funcionariosProdutivos
        .filter(funcionario =>
          (
            funcionario.ativo === true ||
            funcionario.ativo === "true"
          ) &&
          normalizar(
            funcionario.filial
          ) ===
            normalizar(
              filial
            ) &&
          cargoAutomatico(
            funcionario.cargo
          ) &&
          normalizar(
            funcionario.campanha
          ) !==
            "PIX_DO_PRESIDENTE"
        )
        .forEach(funcionario => {
          const cargo =
            normalizar(
              funcionario.cargo
            );

          let bonusFinal = 0;

          if (
            cargo ===
              "CHEFE DE OFICINA"
          ) {
            bonusFinal =
              equipe.bonusChefe;
          } else if (
            cargo ===
              "MECANICO LIDER"
          ) {
            bonusFinal =
              equipe.bonusChefe / 2;
          } else if (
            cargo ===
              "CONTROLADOR DE PRODUTIVIDADE"
          ) {
            bonusFinal =
              bonusControladorProd(
                equipe.produtividade
              ) +
              bonusControladorEfic(
                equipe.eficiencia
              );
          }

          resultados.push({
            id:
              `auto-${funcionario.id}-${competencia}`,
            competencia,
            funcionarioId:
              funcionario.id,
            nome:
              funcionario.nome,
            dn:
              funcionario.dn,
            filial:
              funcionario.filial,
            cargo:
              funcionario.cargo,
            bonusFinal,
            status:
              bonusFinal > 0
                ? "HABILITADO"
                : "NÃO HABILITADO",
            automatico: true
          });
        });
    }
  );

  return resultados;
}

function politicaPix(
  cargo
) {
  return (
    POLITICAS_PIX_COMPARATIVO[
      normalizar(cargo)
    ] ||
    null
  );
}

function bonusFaixaPix(
  politica,
  valor
) {
  if (!politica) {
    return 0;
  }

  let bonus = 0;

  politica.faixas.forEach(
    ([minimo, premio]) => {
      if (
        valor >= minimo
      ) {
        bonus = premio;
      }
    }
  );

  return bonus;
}

function calcularPix(
  lancamento
) {
  const funcionario =
    dados.funcionariosPix.find(
      item =>
        item.id ===
        lancamento.funcionarioId
    );

  const cargo =
    funcionario?.cargo ||
    lancamento.cargo;

  const politica =
    politicaPix(cargo);

  if (!politica) {
    return {
      ...lancamento,
      cargo,
      bonusFinal: 0,
      status:
        "NÃO HABILITADO"
    };
  }

  const meta =
    numero(
      lancamento.metaSemanal
    );

  const realizado =
    numero(
      lancamento.realizadoSemanal
    );

  const semMeta =
    lancamento.semMetaIndividual === true ||
    lancamento.semMetaIndividual === "true" ||
    meta <= 0;

  const atingiuMeta =
    !semMeta &&
    realizado >= meta;

  const indicador =
    politica.metrica ===
      "margem"
      ? numero(
          lancamento.margem
        )
      : numero(
          lancamento.ticketMedio
        );

  const bonusBase =
    atingiuMeta
      ? politica.bonusBase
      : 0;

  const bonusFaixa =
    atingiuMeta
      ? bonusFaixaPix(
          politica,
          indicador
        )
      : 0;

  const metaNps =
    numero(
      lancamento.metaNps
    );

  const realizadoNps =
    numero(
      lancamento.realizadoNps
    );

  const bonusNps =
    Number(
      lancamento.semana
    ) === 4 &&
    politica.bonusNps > 0 &&
    metaNps > 0 &&
    realizadoNps >= metaNps
      ? politica.bonusNps
      : 0;

  const subtotal =
    bonusBase +
    bonusFaixa +
    bonusNps;

  const cargoNorm =
    normalizar(cargo);

  const semOs =
    cargoNorm ===
      "CONSULTOR PECAS BALCAO" ||
    cargoNorm ===
      "ORCAMENTISTA / FACILITADOR DE NEGOCIOS";

  const os =
    numero(
      lancamento.osAbertaPercentual
    );

  const penalidade =
    !semOs &&
    Number(
      lancamento.semana
    ) === 4 &&
    os > 28
      ? subtotal * 0.5
      : 0;

  const bonusFinal =
    Math.max(
      0,
      subtotal -
      penalidade
    );

  return {
    ...lancamento,
    nome:
      funcionario?.nome ||
      lancamento.nome,
    cargo,
    filial:
      funcionario?.filial ||
      lancamento.filial,
    dn:
      funcionario?.dn ||
      lancamento.dn,
    bonusFinal,
    status:
      bonusFinal > 0
        ? "HABILITADO"
        : "NÃO HABILITADO"
  };
}

function calcularResultadosPix(
  competencia
) {
  return dados.lancamentosPix
    .filter(
      item =>
        item.competencia ===
        competencia
    )
    .map(
      calcularPix
    );
}

function filtrosProdutivos() {
  return {
    dn:
      texto(
        document.querySelector(
          "#filtroDnDashboardProdutivos"
        )?.value
      ),
    filial:
      texto(
        document.querySelector(
          "#filtroFilialDashboardProdutivos"
        )?.value
      )
  };
}

function filtroPixPorPossiveisIds(
  ids
) {
  for (
    const id of ids
  ) {
    const elemento =
      document.querySelector(
        id
      );

    if (
      elemento &&
      texto(
        elemento.value
      )
    ) {
      return texto(
        elemento.value
      );
    }
  }

  return "";
}

function filtrosPix() {
  return {
    dn:
      filtroPixPorPossiveisIds([
        "#pixGestorDn",
        "#pixDashboardFiltroDn",
        "#pixFiltroDnGestor"
      ]),
    filial:
      filtroPixPorPossiveisIds([
        "#pixGestorFilial",
        "#pixDashboardFiltroFilial",
        "#pixFiltroFilialGestor"
      ])
  };
}

function aplicarFiltro(
  lista,
  filtro
) {
  return lista.filter(
    item => {
      if (
        filtro.dn &&
        texto(
          item.dn
        ) !==
          filtro.dn
      ) {
        return false;
      }

      if (
        filtro.filial &&
        normalizar(
          item.filial
        ) !==
          normalizar(
            filtro.filial
          )
      ) {
        return false;
      }

      return true;
    }
  );
}

function resumir(
  lista
) {
  const avaliados =
    lista.length;

  const habilitados =
    lista.filter(
      item =>
        normalizar(
          item.status
        ) ===
          "HABILITADO"
    ).length;

  const investimento =
    lista.reduce(
      (
        soma,
        item
      ) =>
        soma +
        numero(
          item.bonusFinal
        ),
      0
    );

  return {
    avaliados,
    habilitados,
    taxa:
      avaliados > 0
        ? habilitados /
          avaliados *
          100
        : 0,
    investimento
  };
}

function competenciaProdutivos() {
  return (
    texto(
      document.querySelector(
        "#competenciaGlobal"
      )?.value
    ) ||
    new Date()
      .toISOString()
      .slice(0, 7)
  );
}

function competenciaPix() {
  return (
    texto(
      document.querySelector(
        "#pixDashboardCompetencia"
      )?.value
    ) ||
    texto(
      document.querySelector(
        "#competenciaGlobal"
      )?.value
    ) ||
    new Date()
      .toISOString()
      .slice(0, 7)
  );
}

function garantirEstilos() {
  if (
    document.querySelector(
      "#comparativoCampanhasStyle"
    )
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "comparativoCampanhasStyle";

  style.textContent = `
    .comparativo-mensal {
      margin-top:18px;
      padding:22px;
      border:1px solid #dce7eb;
      border-radius:18px;
      background:linear-gradient(145deg,#fff,#f8fbfc);
      box-shadow:0 10px 28px rgba(19,49,70,.055);
    }

    .comparativo-topo {
      display:flex;
      justify-content:space-between;
      align-items:flex-end;
      gap:14px;
      margin-bottom:16px;
    }

    .comparativo-topo small {
      display:block;
      margin-bottom:4px;
      color:#0a7b55;
      font-size:10px;
      font-weight:900;
      letter-spacing:.11em;
      text-transform:uppercase;
    }

    .comparativo-topo h3 {
      margin:0;
      color:#17324a;
      font-size:18px;
    }

    .comparativo-periodos {
      color:#6c7f8b;
      font-size:11px;
      font-weight:700;
      text-align:right;
    }

    .comparativo-grid {
      display:grid;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:11px;
    }

    .comparativo-metrica {
      min-width:0;
      padding:15px;
      border:1px solid #e0e9ed;
      border-radius:13px;
      background:#fff;
    }

    .comparativo-metrica > span {
      display:block;
      color:#6f818c;
      font-size:10px;
      font-weight:800;
      text-transform:uppercase;
      letter-spacing:.04em;
    }

    .comparativo-valores {
      display:grid;
      grid-template-columns:1fr auto 1fr;
      align-items:center;
      gap:7px;
      margin-top:10px;
    }

    .comparativo-valor {
      min-width:0;
    }

    .comparativo-valor small {
      display:block;
      color:#8a98a1;
      font-size:9px;
      margin-bottom:3px;
    }

    .comparativo-valor strong {
      display:block;
      color:#1a3448;
      font-size:15px;
      overflow-wrap:anywhere;
    }

    .comparativo-seta {
      color:#a2afb7;
      font-weight:900;
    }

    .comparativo-delta {
      display:inline-flex;
      margin-top:10px;
      min-height:24px;
      align-items:center;
      padding:0 8px;
      border-radius:999px;
      font-size:10px;
      font-weight:900;
      background:#edf3f6;
      color:#577080;
    }

    .comparativo-delta.positivo {
      background:#e5f6ee;
      color:#087346;
    }

    .comparativo-delta.negativo {
      background:#ffeae7;
      color:#aa3327;
    }

    .comparativo-nota {
      margin:13px 0 0;
      color:#7a8a94;
      font-size:10px;
      line-height:1.5;
    }

    @media (max-width:980px) {
      .comparativo-grid {
        grid-template-columns:repeat(2,minmax(0,1fr));
      }
    }

    @media (max-width:620px) {
      .comparativo-mensal {
        padding:16px;
        border-radius:15px;
      }

      .comparativo-topo {
        align-items:flex-start;
        flex-direction:column;
      }

      .comparativo-periodos {
        text-align:left;
      }

      .comparativo-grid {
        grid-template-columns:1fr;
      }
    }
  `;

  document.head.appendChild(
    style
  );
}

function garantirPainel(
  modulo
) {
  garantirEstilos();

  const id =
    modulo === "PIX"
      ? "comparativoMensalPix"
      : "comparativoMensalProdutivos";

  let painel =
    document.querySelector(
      `#${id}`
    );

  if (painel) {
    return painel;
  }

  painel =
    document.createElement(
      "section"
    );

  painel.id = id;
  painel.className =
    "comparativo-mensal";

  if (
    modulo === "PIX"
  ) {
    const dashboard =
      document.querySelector(
        "#pix-dashboard"
      );

    if (!dashboard) {
      return null;
    }

    const cards =
      dashboard.querySelector(
        "#pixDashboardCards"
      );

    if (cards) {
      cards.insertAdjacentElement(
        "afterend",
        painel
      );
    } else {
      dashboard.appendChild(
        painel
      );
    }
  } else {
    const dashboard =
      document.querySelector(
        "#dashboard"
      );

    if (!dashboard) {
      return null;
    }

    const filtro =
      dashboard.querySelector(
        ".produtivos-dashboard-filter-panel"
      );

    const cards =
      dashboard.querySelector(
        "#dashboardCards"
      );

    if (filtro) {
      filtro.insertAdjacentElement(
        "afterend",
        painel
      );
    } else if (cards) {
      cards.insertAdjacentElement(
        "afterend",
        painel
      );
    } else {
      dashboard.prepend(
        painel
      );
    }
  }

  return painel;
}

function montarMetrica({
  rotulo,
  anterior,
  atual,
  formatar,
  tipoDelta
}) {
  const variacao =
    delta(
      atual,
      anterior,
      tipoDelta
    );

  return `
    <article class="comparativo-metrica">
      <span>${rotulo}</span>

      <div class="comparativo-valores">
        <div class="comparativo-valor">
          <small>Anterior</small>
          <strong>
            ${formatar(
              anterior
            )}
          </strong>
        </div>

        <span class="comparativo-seta">
          →
        </span>

        <div class="comparativo-valor">
          <small>Atual</small>
          <strong>
            ${formatar(
              atual
            )}
          </strong>
        </div>
      </div>

      <span
        class="comparativo-delta ${variacao.classe}"
      >
        ${variacao.texto}
      </span>
    </article>
  `;
}

function renderizarPainel(
  modulo
) {
  const painel =
    garantirPainel(
      modulo
    );

  if (!painel) {
    return;
  }

  const competencia =
    modulo === "PIX"
      ? competenciaPix()
      : competenciaProdutivos();

  const anterior =
    mesAnterior(
      competencia
    );

  if (
    !competencia ||
    !anterior
  ) {
    return;
  }

  let atualLista = [];
  let anteriorLista = [];
  let filtro = {};

  if (
    modulo === "PIX"
  ) {
    filtro =
      filtrosPix();

    atualLista =
      aplicarFiltro(
        calcularResultadosPix(
          competencia
        ),
        filtro
      );

    anteriorLista =
      aplicarFiltro(
        calcularResultadosPix(
          anterior
        ),
        filtro
      );
  } else {
    filtro =
      filtrosProdutivos();

    atualLista =
      aplicarFiltro(
        calcularResultadosProdutivos(
          competencia
        ),
        filtro
      );

    anteriorLista =
      aplicarFiltro(
        calcularResultadosProdutivos(
          anterior
        ),
        filtro
      );
  }

  const atualResumo =
    resumir(
      atualLista
    );

  const anteriorResumo =
    resumir(
      anteriorLista
    );

  const htmlPainel = `
    <div class="comparativo-topo">
      <div>
        <small>
          EVOLUÇÃO MENSAL
        </small>

        <h3>
          Comparativo entre meses
        </h3>
      </div>

      <div class="comparativo-periodos">
        ${nomeMes(anterior)}
        &nbsp;×&nbsp;
        ${nomeMes(competencia)}
      </div>
    </div>

    <div class="comparativo-grid">
      ${montarMetrica({
        rotulo:
          "Investimento",
        anterior:
          anteriorResumo.investimento,
        atual:
          atualResumo.investimento,
        formatar:
          moeda,
        tipoDelta:
          "numero"
      })}

      ${montarMetrica({
        rotulo:
          "Avaliados",
        anterior:
          anteriorResumo.avaliados,
        atual:
          atualResumo.avaliados,
        formatar:
          valor =>
            String(
              Math.round(
                numero(valor)
              )
            ),
        tipoDelta:
          "numero"
      })}

      ${montarMetrica({
        rotulo:
          "Habilitados",
        anterior:
          anteriorResumo.habilitados,
        atual:
          atualResumo.habilitados,
        formatar:
          valor =>
            String(
              Math.round(
                numero(valor)
              )
            ),
        tipoDelta:
          "numero"
      })}

      ${montarMetrica({
        rotulo:
          "Taxa de habilitação",
        anterior:
          anteriorResumo.taxa,
        atual:
          atualResumo.taxa,
        formatar:
          pct,
        tipoDelta:
          "pontos"
      })}
    </div>

    <p class="comparativo-nota">
      O comparativo usa os mesmos dados oficiais do Firestore.
      ${
        filtro.dn ||
        filtro.filial
          ? `Filtro aplicado: ${
              filtro.dn
                ? `DN ${filtro.dn}`
                : ""
            }${
              filtro.dn &&
              filtro.filial
                ? " · "
                : ""
            }${
              filtro.filial
                ? filtro.filial
                : ""
            }.`
          : "Visão consolidada de todas as unidades."
      }
    </p>
  `;

  if (
    painel.dataset.comparativoHtml !==
    htmlPainel
  ) {
    painel.innerHTML =
      htmlPainel;

    painel.dataset.comparativoHtml =
      htmlPainel;
  }
}

function renderizarTudo() {
  renderizarPainel(
    "PRODUTIVOS"
  );

  renderizarPainel(
    "PIX"
  );
}

function observarColecao(
  nome,
  destino
) {
  onSnapshot(
    collection(
      firestore,
      nome
    ),
    snapshot => {
      dados[destino] =
        snapshot.docs.map(
          documento => ({
            id:
              documento.id,
            ...documento.data()
          })
        );

      renderizarTudo();
    },
    erro => {
      console.error(
        `[COMPARATIVO] Erro ao carregar ${nome}:`,
        erro
      );
    }
  );
}

function ouvirFiltrosETempo() {
  document.addEventListener(
    "change",
    evento => {
      const ids = new Set([
        "competenciaGlobal",
        "pixDashboardCompetencia",
        "filtroDnDashboardProdutivos",
        "filtroFilialDashboardProdutivos",
        "pixGestorDn",
        "pixGestorFilial",
        "pixDashboardFiltroDn",
        "pixDashboardFiltroFilial",
        "pixFiltroDnGestor",
        "pixFiltroFilialGestor"
      ]);

      if (
        ids.has(
          evento.target?.id
        )
      ) {
        window.setTimeout(
          renderizarTudo,
          20
        );
      }
    }
  );
}

function iniciarComparativo() {
  garantirEstilos();

  observarColecao(
    "funcionarios",
    "funcionariosProdutivos"
  );

  observarColecao(
    "produtivos_lancamentos",
    "lancamentosProdutivos"
  );

  observarColecao(
    "pix_presidente_funcionarios",
    "funcionariosPix"
  );

  observarColecao(
    "pix_presidente_lancamentos",
    "lancamentosPix"
  );

  ouvirFiltrosETempo();

  /*
   * IMPORTANTE:
   * O observer NÃO pode chamar renderizarTudo() a cada mutação.
   *
   * A versão anterior observava document.body e, como
   * renderizarPainel() usa innerHTML, cada renderização gerava
   * novas mutações. Isso criava um ciclo infinito:
   *
   * mutation -> render -> innerHTML -> mutation -> render...
   *
   * Resultado: a thread principal ficava ocupada e o restante
   * do sistema parecia não carregar.
   *
   * Agora o observer só reage quando o próprio sistema principal
   * recria uma das áreas de dashboard e o painel comparativo
   * deixou de existir.
   */
  let timerObserver = null;

  const observer =
    new MutationObserver(() => {
      if (timerObserver) {
        clearTimeout(
          timerObserver
        );
      }

      timerObserver =
        window.setTimeout(
          () => {
            const dashboardProdutivos =
              document.querySelector(
                "#dashboard"
              );

            const dashboardPix =
              document.querySelector(
                "#pix-dashboard"
              );

            const precisaProdutivos =
              Boolean(
                dashboardProdutivos &&
                !document.querySelector(
                  "#comparativoMensalProdutivos"
                )
              );

            const precisaPix =
              Boolean(
                dashboardPix &&
                !document.querySelector(
                  "#comparativoMensalPix"
                )
              );

            if (
              precisaProdutivos ||
              precisaPix
            ) {
              renderizarTudo();
            }
          },
          120
        );
    });

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  window.setTimeout(
    renderizarTudo,
    700
  );

  console.info(
    `[COMPARATIVO] ${COMPARATIVO_VERSAO} carregado sem loop de MutationObserver`
  );
}

if (
  document.readyState ===
    "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    iniciarComparativo,
    {
      once: true
    }
  );
} else {
  iniciarComparativo();
}

window.comparativoCampanhas = {
  atualizar:
    renderizarTudo,
  versao:
    COMPARATIVO_VERSAO
};