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

const FILIAIS = [
  { dn: "4700", unidade: "ANANINDEUA" },
  { dn: "4731", unidade: "SÃO LUIS" },
  { dn: "1960", unidade: "BACABAL" },
  { dn: "4700", unidade: "BELÉM" },
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

const CARGOS = [
  "Mecânico Produtivo",
  "Chefe de Oficina",
  "Mecânico Líder",
  "Controlador de Produtividade"
];

const CARGOS_AUTOMATICOS = [
  "Chefe de Oficina",
  "Mecânico Líder"
];

const DB_KEY = "campanha_oficina_mvp_v1";

const HISTORICO_INICIO = "2026-06";

let db = carregarDB();
let apuracaoAtual = [];
let funcionariosCarregados = false;

const funcionariosRef = collection(
  firestore,
  "funcionarios"
);

function carregarDB() {
  try {
    const salvo = localStorage.getItem(DB_KEY);

    if (!salvo) {
      return {
        funcionarios: [],
        lancamentos: []
      };
    }

    const dados = JSON.parse(salvo);

    return {
      funcionarios: [],
      lancamentos: Array.isArray(dados.lancamentos)
        ? dados.lancamentos
        : []
    };
  } catch (erro) {
    console.error(
      "Erro ao carregar dados locais:",
      erro
    );

    return {
      funcionarios: [],
      lancamentos: []
    };
  }
}

function salvarDB() {
  localStorage.setItem(
    DB_KEY,
    JSON.stringify({
      lancamentos: db.lancamentos
    })
  );
}

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) +
        Math.random().toString(36).slice(2);
}

function moeda(valor) {
  return numero(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatarCampoMoeda(elemento) {
  if (!elemento) {
    return;
  }

  const textoDigitado = elemento.value.trim();

  if (!textoDigitado) {
    elemento.value = "";
    return;
  }

  elemento.value = moeda(numero(textoDigitado));
}

function retirarFormatoMoeda(elemento) {
  if (!elemento) {
    return;
  }

  const valor = numero(elemento.value);

  elemento.value = valor > 0
    ? valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    : "";
}

function pct(valor) {
  return Number.isFinite(valor)
    ? `${valor.toFixed(2).replace(".", ",")}%`
    : "0,00%";
}

function numero(valor) {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  let texto = String(valor ?? "").trim();

  if (!texto) {
    return 0;
  }

  texto = texto
    .replace(/\s/g, "")
    .replace(/R\$/g, "");

  if (texto.includes(",")) {
    texto = texto
      .replace(/\./g, "")
      .replace(",", ".");
  }

  texto = texto.replace(/[^\d.-]/g, "");

  const resultado = Number(texto);

  return Number.isFinite(resultado) ? resultado : 0;
}

function mesAtual() {
  return new Date()
    .toISOString()
    .slice(0, 7);
}

function filialPorNome(nome) {
  return FILIAIS.find(
    filial => filial.unidade === nome
  );
}

function funcionarioPorId(id) {
  return db.funcionarios.find(
    funcionario => funcionario.id === id
  );
}

function cargoAutomatico(cargo) {
  return CARGOS_AUTOMATICOS.includes(
    String(cargo || "").trim()
  );
}

function toast(mensagem) {
  const elemento =
    document.querySelector("#toast");

  if (!elemento) {
    return;
  }

  elemento.textContent = mensagem;
  elemento.classList.add("show");

  setTimeout(() => {
    elemento.classList.remove("show");
  }, 2200);
}

function iniciarFuncionariosTempoReal() {
  onSnapshot(
    funcionariosRef,

    snapshot => {
      db.funcionarios = snapshot.docs
        .map(documento => ({
          id: documento.id,
          ...documento.data()
        }))
        .sort((a, b) =>
          String(a.nome || "").localeCompare(
            String(b.nome || ""),
            "pt-BR"
          )
        );

      funcionariosCarregados = true;

      renderTudo();

      console.log(
        `${db.funcionarios.length} funcionário(s) carregado(s) do Firebase.`
      );
    },

    erro => {
      console.error(
        "Erro ao buscar funcionários no Firebase:",
        erro
      );

      alert(
        "Não foi possível carregar os funcionários do Firebase. Verifique a conexão e as regras do Firestore."
      );
    }
  );
}

function bonusMecanicoProdutividade(
  valor
) {
  if (valor >= 100) {
    return 1000;
  }

  if (valor >= 90) {
    return 790;
  }

  if (valor >= 80) {
    return 690;
  }

  if (valor >= 70) {
    return 600;
  }

  return 0;
}

function bonusMecanicoEficiencia(
  valor
) {
  if (valor >= 100) {
    return 1000;
  }

  if (valor >= 90) {
    return 790;
  }

  if (valor >= 80) {
    return 690;
  }

  return 0;
}

function bonusControladorProd(valor) {
  if (valor >= 90) {
    return 500;
  }

  if (valor >= 80) {
    return 300;
  }

  if (valor >= 70) {
    return 100;
  }

  return 0;
}

function bonusControladorEfic(valor) {
  if (valor >= 100) {
    return 500;
  }

  if (valor >= 90) {
    return 300;
  }

  if (valor >= 80) {
    return 100;
  }

  return 0;
}

function calcularResultadoEquipe(
  competencia,
  filial
) {
  const mecanicosUnicos = new Map();

  db.lancamentos
    .filter(lancamento => {
      return (
        lancamento.competencia ===
          competencia &&
        lancamento.filial === filial &&
        lancamento.cargo ===
          "Mecânico Produtivo"
      );
    })
    .forEach(lancamento => {
      const faturamento = numero(
        lancamento.faturamento
      );

      const faturamentoAnterior =
        mecanicosUnicos.get(
          lancamento.funcionarioId
        ) || 0;

      /*
       * Caso exista mais de um lançamento
       * para o mesmo mecânico no mesmo mês,
       * considera o maior faturamento.
       */
      if (
        faturamento >
        faturamentoAnterior
      ) {
        mecanicosUnicos.set(
          lancamento.funcionarioId,
          faturamento
        );
      }
    });

  let qtdFaixa50 = 0;
  let qtdAcima60 = 0;

  mecanicosUnicos.forEach(
    faturamento => {
      if (faturamento >= 60000) {
        qtdAcima60 += 1;
      } else if (
        faturamento >= 50000
      ) {
        qtdFaixa50 += 1;
      }
    }
  );

  const bonusChefe =
    qtdFaixa50 * 300 +
    qtdAcima60 * 500;

  return {
    totalMecanicos:
      mecanicosUnicos.size,
    qtdFaixa50,
    qtdAcima60,
    bonusChefe
  };
}

function calcularGestorAutomatico(
  funcionario,
  competencia
) {
  const equipe =
    calcularResultadoEquipe(
      competencia,
      funcionario.filial
    );

  const bonusChefe =
    equipe.bonusChefe;

  const bonusBruto =
    funcionario.cargo ===
    "Mecânico Líder"
      ? bonusChefe / 2
      : bonusChefe;

  return {
    id: `automatico-${funcionario.id}-${competencia}`,

    funcionarioId:
      funcionario.id,

    competencia,

    dn: funcionario.dn,

    filial: funcionario.filial,

    nome: funcionario.nome,

    cargo: funcionario.cargo,

    produtividade: 0,

    eficiencia: 0,

    qtdFaixa50:
      equipe.qtdFaixa50,

    qtdAcima60:
      equipe.qtdAcima60,

    totalMecanicos:
      equipe.totalMecanicos,

    bonusBruto,

    penalidade: 0,

    bonusFinal: bonusBruto,

    status:
      bonusBruto > 0
        ? "HABILITADO"
        : "NÃO HABILITADO",

    motivo:
      bonusBruto > 0
        ? "Apuração automática baseada no faturamento da equipe"
        : "Nenhum mecânico atingiu faturamento mínimo de R$ 50 mil",

    automatico: true
  };
}

function calcularLancamento(
  lancamento
) {
  const funcionario =
    funcionarioPorId(
      lancamento.funcionarioId
    ) || {
      nome: lancamento.nome || "Funcionário removido",

      cargo: lancamento.cargo,

      filial: lancamento.filial,

      dn: lancamento.dn
    };

  const base = {
    ...lancamento,

    nome: funcionario.nome,

    cargo:
      funcionario.cargo ||
      lancamento.cargo,

    filial:
      funcionario.filial ||
      lancamento.filial,

    dn:
      funcionario.dn ||
      lancamento.dn,

    produtividade: 0,

    eficiencia: 0,

    bonusBruto: 0,

    penalidade: 0,

    bonusFinal: 0,

    status: "NÃO HABILITADO",

    motivo: ""
  };

  if (
    base.cargo ===
    "Mecânico Produtivo"
  ) {
    base.produtividade =
      numero(
        lancamento.horasDisponiveis
      ) > 0
        ? (numero(
            lancamento.horasTrabalhadas
          ) /
            numero(
              lancamento.horasDisponiveis
            )) *
          100
        : 0;

    base.eficiencia =
      numero(
        lancamento.horasTrabalhadas
      ) > 0
        ? (numero(
            lancamento.horasVendidas
          ) /
            numero(
              lancamento.horasTrabalhadas
            )) *
          100
        : 0;

    const minimoHoraVendida =
      numero(
        lancamento.horasVendidas
      ) >=
      numero(
        lancamento.horasDisponiveis
      ) *
        0.7;

    const atingiuMetricas =
      base.produtividade >= 70 &&
      base.eficiencia >= 80 &&
      minimoHoraVendida;

    if (atingiuMetricas) {
      base.bonusBruto =
        bonusMecanicoProdutividade(
          base.produtividade
        ) +
        bonusMecanicoEficiencia(
          base.eficiencia
        );

      base.status = "HABILITADO";
    } else {
      base.motivo =
        !minimoHoraVendida
          ? "Horas vendidas abaixo de 70% das disponíveis"
          : "Métricas mínimas não atingidas";
    }

    if (lancamento.osPrejuizo) {
      base.status =
        "NÃO HABILITADO";

      base.motivo =
        "OS interna, retrabalho, imperícia ou prejuízo";

      base.bonusBruto = 0;
    } else if (
      base.status ===
        "HABILITADO" &&
      lancamento.treinamentoPendente
    ) {
      base.penalidade =
        base.bonusBruto * 0.5;
    }
  }

  if (
    base.cargo ===
    "Controlador de Produtividade"
  ) {
    base.produtividade =
      numero(
        lancamento.produtividadeInformada
      );

    base.eficiencia =
      numero(
        lancamento.eficienciaInformada
      );

    if (
      base.produtividade >= 70 &&
      base.eficiencia >= 80
    ) {
      base.bonusBruto =
        bonusControladorProd(
          base.produtividade
        ) +
        bonusControladorEfic(
          base.eficiencia
        );

      base.status = "HABILITADO";
    } else {
      base.motivo =
        "Métricas mínimas não atingidas";
    }
  }

  base.bonusFinal = Math.max(
    0,
    base.bonusBruto -
      base.penalidade
  );

  return base;
}

function obterResultadosCampanha() {
  const resultadosManuais =
    db.lancamentos
      .filter(
        lancamento =>
          !cargoAutomatico(
            lancamento.cargo
          )
      )
      .map(calcularLancamento);

  const competenciasPorFilial =
    new Map();

  db.lancamentos
    .filter(
      lancamento =>
        lancamento.cargo ===
        "Mecânico Produtivo"
    )
    .forEach(lancamento => {
      const chave =
        `${lancamento.competencia}|${lancamento.filial}`;

      competenciasPorFilial.set(
        chave,
        {
          competencia:
            lancamento.competencia,

          filial:
            lancamento.filial
        }
      );
    });

  const resultadosAutomaticos = [];

  competenciasPorFilial.forEach(
    ({
      competencia,
      filial
    }) => {
      const gestores =
        db.funcionarios.filter(
          funcionario => {
            return (
              funcionario.ativo ===
                true &&
              CARGOS.includes(funcionario.cargo) &&
              funcionario.campanha !== "PIX_DO_PRESIDENTE" &&
              funcionario.filial ===
                filial &&
              cargoAutomatico(
                funcionario.cargo
              )
            );
          }
        );

      gestores.forEach(
        funcionario => {
          resultadosAutomaticos.push(
            calcularGestorAutomatico(
              funcionario,
              competencia
            )
          );
        }
      );
    }
  );

  return [
    ...resultadosManuais,
    ...resultadosAutomaticos
  ];
}

function preencherSelect(
  select,
  itens,
  placeholder = "Selecione"
) {
  if (!select) {
    return;
  }

  select.innerHTML =
    `<option value="">${placeholder}</option>` +
    itens
      .map(
        item =>
          `<option value="${item.value}">${item.label}</option>`
      )
      .join("");
}

function iniciarSelects() {
  const filiais = FILIAIS.map(
    filial => ({
      value: filial.unidade,

      label:
        `${filial.dn} - ${filial.unidade}`
    })
  );

  [
    "funcionarioFilial",
    "lancamentoFilial",
    "filtroFilialFuncionario",
    "filtroFilialLancamento",
    "filtroFilialApuracao"
  ].forEach(id => {
    preencherSelect(
      document.querySelector(
        `#${id}`
      ),

      filiais,

      id.startsWith("filtro")
        ? "Todas as filiais"
        : "Selecione a filial"
    );
  });

  const cargos = CARGOS.map(
    cargo => ({
      value: cargo,
      label: cargo
    })
  );

  [
    "funcionarioCargo",
    "filtroCargoFuncionario",
    "filtroCargoLancamento"
  ].forEach(id => {
    preencherSelect(
      document.querySelector(
        `#${id}`
      ),

      cargos,

      id.startsWith("filtro")
        ? "Todos os cargos"
        : "Selecione o cargo"
    );
  });
}

function renderTudo() {
  renderFuncionarios();
  renderLancamentos();
  renderApuracao();
  renderDashboard();
  atualizarFiltrosCompetencia();
}

function renderFuncionarios() {
  const busca =
    document
      .querySelector(
        "#buscaFuncionario"
      )
      .value.toLowerCase();

  const filial =
    document.querySelector(
      "#filtroFilialFuncionario"
    ).value;

  const cargo =
    document.querySelector(
      "#filtroCargoFuncionario"
    ).value;

  const lista =
    db.funcionarios.filter(
      funcionario => {
        const texto =
          `${funcionario.nome} ${funcionario.filial} ${funcionario.cargo}`.toLowerCase();

        const pertenceAosProdutivos =
          CARGOS.includes(funcionario.cargo) &&
          funcionario.campanha !== "PIX_DO_PRESIDENTE";

        return (
          pertenceAosProdutivos &&

          (!busca ||
            texto.includes(busca)) &&

          (!filial ||
            funcionario.filial ===
              filial) &&

          (!cargo ||
            funcionario.cargo ===
              cargo)
        );
      }
    );

  document.querySelector(
    "#tabelaFuncionarios"
  ).innerHTML = lista.length
    ? lista
        .map(
          funcionario => `
            <tr>
              <td>
                ${funcionario.dn}
              </td>

              <td>
                ${funcionario.filial}
              </td>

              <td>
                <strong>
                  ${funcionario.nome}
                </strong>
              </td>

              <td>
                ${funcionario.cargo}
              </td>

              <td>
                <span
                  class="badge ${
                    funcionario.ativo
                      ? "ok"
                      : "no"
                  }"
                >
                  ${
                    funcionario.ativo
                      ? "ATIVO"
                      : "INATIVO"
                  }
                </span>
              </td>

              <td>
                <div class="actions">
                  <button
                    class="mini-btn"
                    type="button"
                    data-funcionario-editar="${funcionario.id}"
                  >
                    Editar
                  </button>

                  <button
                    class="mini-btn delete"
                    type="button"
                    data-funcionario-excluir="${funcionario.id}"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          `
        )
        .join("")
    : `
        <tr>
          <td
            colspan="6"
            class="empty"
          >
            Nenhum funcionário cadastrado.
          </td>
        </tr>
      `;

  document
    .querySelectorAll(
      "[data-funcionario-editar]"
    )
    .forEach(botao => {
      botao.addEventListener(
        "click",
        () =>
          window.editarFuncionario(
            botao.dataset.funcionarioEditar
          )
      );
    });

  document
    .querySelectorAll(
      "[data-funcionario-excluir]"
    )
    .forEach(botao => {
      botao.addEventListener(
        "click",
        () =>
          window.excluirFuncionario(
            botao.dataset.funcionarioExcluir
          )
      );
    });
}

function renderLancamentos() {
  const competencia =
    document.querySelector(
      "#filtroCompetenciaLancamento"
    ).value;

  const filial =
    document.querySelector(
      "#filtroFilialLancamento"
    ).value;

  const cargo =
    document.querySelector(
      "#filtroCargoLancamento"
    ).value;

  const lista =
    db.lancamentos
      .filter(
        lancamento =>
          !cargoAutomatico(
            lancamento.cargo
          )
      )
      .map(calcularLancamento)
      .filter(lancamento => {
        return (
          (!competencia ||
            lancamento.competencia ===
              competencia) &&

          (!filial ||
            lancamento.filial ===
              filial) &&

          (!cargo ||
            lancamento.cargo ===
              cargo)
        );
      });

  document.querySelector(
    "#tabelaLancamentos"
  ).innerHTML = lista.length
    ? lista
        .map(
          lancamento => `
            <tr>
              <td>
                ${lancamento.competencia}
              </td>

              <td>
                ${lancamento.filial}
              </td>

              <td>
                <strong>
                  ${lancamento.nome}
                </strong>
              </td>

              <td>
                ${lancamento.cargo}
              </td>

              <td>
                ${indicadoresTexto(
                  lancamento
                )}
              </td>

              <td>
                <strong>
                  ${moeda(
                    lancamento.bonusFinal
                  )}
                </strong>
              </td>

              <td>
                <span
                  class="badge ${
                    lancamento.status ===
                    "HABILITADO"
                      ? "ok"
                      : "no"
                  }"
                >
                  ${lancamento.status}
                </span>
              </td>

              <td>
                <div class="actions">
                  <button
                    class="mini-btn"
                    onclick="editarLancamento('${lancamento.id}')"
                  >
                    Editar
                  </button>

                  <button
                    class="mini-btn delete"
                    onclick="excluirLancamento('${lancamento.id}')"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          `
        )
        .join("")
    : `
        <tr>
          <td
            colspan="8"
            class="empty"
          >
            Nenhum lançamento registrado.
          </td>
        </tr>
      `;
}

function indicadoresTexto(
  lancamento
) {
  if (
    lancamento.cargo ===
    "Mecânico Produtivo"
  ) {
    const horasTrabalhadas =
      numero(
        lancamento.horasTrabalhadas
      );

    const horasDisponiveis =
      numero(
        lancamento.horasDisponiveis
      );

    const horasVendidas =
      numero(
        lancamento.horasVendidas
      );

    return `
      <div class="indicadores-detalhados">
        <strong>
          Realizado:
          ${moeda(
            lancamento.faturamento
          )}
        </strong>

        <span>
          Produtividade:
          <strong>
            ${pct(
              lancamento.produtividade
            )}
          </strong>
        </span>

        <small>
          ${horasTrabalhadas
            .toFixed(2)
            .replace(".", ",")}h trabalhadas
          ÷
          ${horasDisponiveis
            .toFixed(2)
            .replace(".", ",")}h disponíveis
        </small>

        <span>
          Eficiência:
          <strong>
            ${pct(
              lancamento.eficiencia
            )}
          </strong>
        </span>

        <small>
          ${horasVendidas
            .toFixed(2)
            .replace(".", ",")}h vendidas
          ÷
          ${horasTrabalhadas
            .toFixed(2)
            .replace(".", ",")}h trabalhadas
        </small>
      </div>
    `;
  }

  if (
    lancamento.cargo ===
    "Controlador de Produtividade"
  ) {
    return `
      <div class="indicadores-detalhados">
        <span>
          Produtividade:
          <strong>
            ${pct(
              lancamento.produtividade
            )}
          </strong>
        </span>

        <span>
          Eficiência:
          <strong>
            ${pct(
              lancamento.eficiencia
            )}
          </strong>
        </span>
      </div>
    `;
  }

  if (
    cargoAutomatico(
      lancamento.cargo
    )
  ) {
    return `
      <div class="indicadores-detalhados">
        <span>
          R$ 50 mil a R$ 59.999,99:
          <strong>
            ${numero(
              lancamento.qtdFaixa50
            )}
          </strong>
        </span>

        <span>
          R$ 60 mil ou mais:
          <strong>
            ${numero(
              lancamento.qtdAcima60
            )}
          </strong>
        </span>
      </div>
    `;
  }

  return "-";
}

function obterApuracaoFiltrada() {
  const competencia =
    document.querySelector(
      "#filtroCompetenciaApuracao"
    ).value;

  const filial =
    document.querySelector(
      "#filtroFilialApuracao"
    ).value;

  const status =
    document.querySelector(
      "#filtroStatusApuracao"
    ).value;

  return obterResultadosCampanha().filter(
    resultado => {
      return (
        (!competencia ||
          resultado.competencia ===
            competencia) &&

        (!filial ||
          resultado.filial ===
            filial) &&

        (!status ||
          resultado.status ===
            status)
      );
    }
  );
}

function renderApuracao() {
  apuracaoAtual =
    obterApuracaoFiltrada();

  const total =
    apuracaoAtual.reduce(
      (soma, item) =>
        soma + item.bonusFinal,
      0
    );

  const habilitados =
    apuracaoAtual.filter(
      item =>
        item.status ===
        "HABILITADO"
    ).length;

  const naoHabilitados =
    apuracaoAtual.length -
    habilitados;

  document.querySelector(
    "#apuracaoCards"
  ).innerHTML = cardsHtml([
    [
      "Total apurado",
      moeda(total)
    ],

    [
      "Lançamentos",
      apuracaoAtual.length
    ],

    [
      "Habilitados",
      habilitados
    ],

    [
      "Não habilitados",
      naoHabilitados
    ]
  ]);

  document.querySelector(
    "#tabelaApuracao"
  ).innerHTML =
    apuracaoAtual.length
      ? apuracaoAtual
          .map(
            item => `
              <tr>
                <td>
                  ${item.competencia}
                </td>

                <td>
                  ${item.dn}
                </td>

                <td>
                  ${item.filial}
                </td>

                <td>
                  <strong>
                    ${item.nome}
                  </strong>
                </td>

                <td>
                  ${item.cargo}
                </td>

                <td>
                  ${pct(
                    item.produtividade
                  )}
                </td>

                <td>
                  ${pct(
                    item.eficiencia
                  )}
                </td>

                <td>
                  ${moeda(
                    item.bonusBruto
                  )}
                </td>

                <td>
                  ${moeda(
                    item.penalidade
                  )}
                </td>

                <td>
                  <strong>
                    ${moeda(
                      item.bonusFinal
                    )}
                  </strong>
                </td>

                <td>
                  <span
                    title="${
                      item.motivo || ""
                    }"
                    class="badge ${
                      item.status ===
                      "HABILITADO"
                        ? "ok"
                        : "no"
                    }"
                  >
                    ${item.status}
                  </span>
                </td>
              </tr>
            `
          )
          .join("")
      : `
          <tr>
            <td
              colspan="11"
              class="empty"
            >
              Nenhum resultado para os filtros escolhidos.
            </td>
          </tr>
        `;
}

function cardsHtml(itens) {
  return itens
    .map(
      ([titulo, valor]) => `
        <article class="stat-card">
          <span>
            ${titulo}
          </span>

          <strong>
            ${valor}
          </strong>
        </article>
      `
    )
    .join("");
}

function compararCompetencias(
  competenciaA,
  competenciaB
) {
  return String(
    competenciaA || ""
  ).localeCompare(
    String(
      competenciaB || ""
    )
  );
}

function limitarCompetenciaHistorico(
  competencia
) {
  const atual =
    mesAtual();

  if (
    compararCompetencias(
      competencia,
      HISTORICO_INICIO
    ) < 0
  ) {
    return HISTORICO_INICIO;
  }

  if (
    compararCompetencias(
      competencia,
      atual
    ) > 0
  ) {
    return atual;
  }

  return competencia;
}

function alterarCompetencia(
  competencia,
  quantidadeMeses
) {
  const [
    ano,
    mes
  ] = competencia
    .split("-")
    .map(Number);

  const data =
    new Date(
      ano,
      mes - 1 +
        quantidadeMeses,
      1
    );

  return [
    data.getFullYear(),
    String(
      data.getMonth() + 1
    ).padStart(2, "0")
  ].join("-");
}

function nomeCompetencia(
  competencia
) {
  if (!competencia) {
    return "";
  }

  const [
    ano,
    mes
  ] = competencia
    .split("-")
    .map(Number);

  const data =
    new Date(
      ano,
      mes - 1,
      1
    );

  const nome =
    data.toLocaleDateString(
      "pt-BR",
      {
        month: "long",
        year: "numeric"
      }
    );

  return nome.charAt(0)
    .toUpperCase() +
    nome.slice(1);
}

function garantirControlesHistorico() {
  const campoCompetencia =
    document.querySelector(
      "#competenciaGlobal"
    );

  if (!campoCompetencia) {
    console.warn(
      "Campo #competenciaGlobal não encontrado."
    );

    return;
  }

  if (
    document.querySelector(
      "#controleHistoricoMensal"
    )
  ) {
    return;
  }

  const containerAtual =
    campoCompetencia.closest("label") ||
    campoCompetencia.parentElement;

  if (!containerAtual) {
    return;
  }

  const controle =
    document.createElement("div");

  controle.id =
    "controleHistoricoMensal";

  controle.className =
    "month-history-control";

  controle.innerHTML = `
    <span class="month-history-label">
      Histórico mensal
    </span>

    <div class="month-history-navigation">
      <button
        type="button"
        id="btnMesAnterior"
        class="month-nav-btn"
        title="Mês anterior"
        aria-label="Visualizar mês anterior"
      >
        ‹
      </button>

      <label class="month-picker">
        <span id="historicoMesAtual">
          Junho de 2026
        </span>
      </label>

      <button
        type="button"
        id="btnMesSeguinte"
        class="month-nav-btn"
        title="Mês seguinte"
        aria-label="Visualizar mês seguinte"
      >
        ›
      </button>
    </div>
  `;

  const seletorInterno =
    controle.querySelector(
      ".month-picker"
    );

  containerAtual.parentNode.insertBefore(
    controle,
    containerAtual
  );

  seletorInterno.appendChild(
    campoCompetencia
  );

  containerAtual.remove();

  document
    .querySelector(
      "#btnMesAnterior"
    )
    .addEventListener(
      "click",
      () =>
        navegarHistorico(-1)
    );

  document
    .querySelector(
      "#btnMesSeguinte"
    )
    .addEventListener(
      "click",
      () =>
        navegarHistorico(1)
    );
}

function atualizarNavegacaoHistorico() {
  const campo =
    document.querySelector(
      "#competenciaGlobal"
    );

  if (!campo) {
    return;
  }

  const competencia =
    limitarCompetenciaHistorico(
      campo.value ||
      mesAtual()
    );

  campo.value =
    competencia;

  campo.min =
    HISTORICO_INICIO;

  campo.max =
    mesAtual();

  const anterior =
    document.querySelector(
      "#btnMesAnterior"
    );

  const seguinte =
    document.querySelector(
      "#btnMesSeguinte"
    );

  if (anterior) {
    anterior.disabled =
      compararCompetencias(
        competencia,
        HISTORICO_INICIO
      ) <= 0;
  }

  if (seguinte) {
    seguinte.disabled =
      compararCompetencias(
        competencia,
        mesAtual()
      ) >= 0;
  }

  const titulo =
    document.querySelector(
      "#historicoMesAtual"
    );

  if (titulo) {
    titulo.textContent =
      nomeCompetencia(
        competencia
      );
  }
}

function navegarHistorico(
  quantidadeMeses
) {
  const campo =
    document.querySelector(
      "#competenciaGlobal"
    );

  if (!campo) {
    return;
  }

  const atual =
    limitarCompetenciaHistorico(
      campo.value ||
      mesAtual()
    );

  campo.value =
    limitarCompetenciaHistorico(
      alterarCompetencia(
        atual,
        quantidadeMeses
      )
    );

  atualizarNavegacaoHistorico();
  renderDashboard();
}

function motivoResultado(
  resultado
) {
  if (
    resultado.status ===
    "HABILITADO"
  ) {
    return "Meta atingida";
  }

  return (
    resultado.motivo ||
    "Meta não atingida"
  );
}

function renderHistoricoMensal(
  resultados
) {
  const tabela =
    document.querySelector(
      "#tabelaHistoricoMensal"
    );

  if (!tabela) {
    return;
  }

  const naoAtingiram =
    resultados.filter(
      resultado =>
        resultado.status !==
        "HABILITADO"
    );

  const resumo =
    document.querySelector(
      "#historicoResumo"
    );

  if (resumo) {
    resumo.innerHTML = `
      <span>
        <strong>
          ${resultados.length}
        </strong>
        avaliados
      </span>

      <span class="historico-ok">
        <strong>
          ${
            resultados.filter(
              resultado =>
                resultado.status ===
                "HABILITADO"
            ).length
          }
        </strong>
        atingiram
      </span>

      <span class="historico-no">
        <strong>
          ${naoAtingiram.length}
        </strong>
        não atingiram
      </span>
    `;
  }

  tabela.innerHTML =
    resultados.length
      ? resultados
          .sort(
            (a, b) => {
              const status =
                String(
                  a.status
                ).localeCompare(
                  String(
                    b.status
                  )
                );

              if (status !== 0) {
                return status;
              }

              return String(
                a.nome || ""
              ).localeCompare(
                String(
                  b.nome || ""
                ),
                "pt-BR"
              );
            }
          )
          .map(
            resultado => `
              <tr>
                <td>
                  <strong>
                    ${
                      resultado.nome ||
                      "Colaborador não localizado"
                    }
                  </strong>
                </td>

                <td>
                  ${resultado.filial}
                </td>

                <td>
                  ${resultado.cargo}
                </td>

                <td>
                  ${
                    resultado.cargo ===
                    "Mecânico Produtivo"
                      ? moeda(
                          resultado.faturamento
                        )
                      : "—"
                  }
                </td>

                <td>
                  ${pct(
                    resultado.produtividade
                  )}
                </td>

                <td>
                  ${pct(
                    resultado.eficiencia
                  )}
                </td>

                <td>
                  ${moeda(
                    resultado.bonusFinal
                  )}
                </td>

                <td>
                  <span class="badge ${
                    resultado.status ===
                    "HABILITADO"
                      ? "ok"
                      : "no"
                  }">
                    ${resultado.status}
                  </span>
                </td>

                <td class="historico-motivo">
                  ${motivoResultado(
                    resultado
                  )}
                </td>
              </tr>
            `
          )
          .join("")
      : `
          <tr>
            <td
              colspan="9"
              class="empty"
            >
              Nenhuma apuração registrada para
              ${nomeCompetencia(
                document.querySelector(
                  "#competenciaGlobal"
                )?.value
              )}.
            </td>
          </tr>
        `;
}

function renderDashboard() {
  const campoCompetencia =
    document.querySelector(
      "#competenciaGlobal"
    );

  if (!campoCompetencia) {
    return;
  }

  const competencia =
    limitarCompetenciaHistorico(
      campoCompetencia.value ||
      mesAtual()
    );

  campoCompetencia.value =
    competencia;

  const lista =
    obterResultadosCampanha().filter(
      resultado =>
        resultado.competencia ===
        competencia
    );

  const total =
    lista.reduce(
      (soma, item) =>
        soma + item.bonusFinal,
      0
    );

  const habilitados =
    lista.filter(
      item =>
        item.status ===
        "HABILITADO"
    ).length;

  const naoHabilitados =
    lista.length -
    habilitados;

  document.querySelector(
    "#dashboardCards"
  ).innerHTML = cardsHtml([
    [
      "Funcionários ativos",

      db.funcionarios.filter(
        funcionario =>
          funcionario.ativo
      ).length
    ],

    [
      "Avaliados no mês",
      lista.length
    ],

    [
      "Atingiram a meta",
      habilitados
    ],

    [
      "Total investido",
      moeda(total)
    ]
  ]);

  resumoAgrupado(
    "#resumoCargo",
    lista,
    "cargo"
  );

  resumoAgrupado(
    "#resumoFilial",
    lista,
    "filial"
  );

  renderHistoricoMensal(
    lista
  );

  const cardNaoAtingiram =
    document.querySelector(
      "#quantidadeNaoAtingiram"
    );

  if (cardNaoAtingiram) {
    cardNaoAtingiram.textContent =
      naoHabilitados;
  }

  atualizarNavegacaoHistorico();
}

function resumoAgrupado(
  seletor,
  lista,
  campo
) {
  const mapa =
    lista.reduce(
      (
        acumulador,
        item
      ) => {
        acumulador[item[campo]] =
          (acumulador[item[campo]] ||
            0) +
          item.bonusFinal;

        return acumulador;
      },
      {}
    );

  const itens =
    Object.entries(mapa).sort(
      (a, b) => b[1] - a[1]
    );

  document.querySelector(
    seletor
  ).innerHTML = itens.length
    ? itens
        .map(
          ([nome, valor]) => `
            <div class="summary-row">
              <div>
                <strong>
                  ${nome}
                </strong>

                <br>

                <small>
                  ${
                    lista.filter(
                      item =>
                        item[campo] ===
                        nome
                    ).length
                  }
                  lançamento(s)
                </small>
              </div>

              <strong>
                ${moeda(valor)}
              </strong>
            </div>
          `
        )
        .join("")
    : `
        <p class="empty">
          Sem dados para exibir.
        </p>
      `;
}

function atualizarFiltrosCompetencia() {
  const competencias = [
    ...new Set(
      db.lancamentos.map(
        item => item.competencia
      )
    )
  ]
    .filter(Boolean)
    .sort()
    .reverse();

  [
    "filtroCompetenciaLancamento",
    "filtroCompetenciaApuracao"
  ].forEach(id => {
    const elemento =
      document.querySelector(
        `#${id}`
      );

    const valorAtual =
      elemento.value;

    preencherSelect(
      elemento,

      competencias.map(
        competencia => ({
          value: competencia,
          label: competencia
        })
      ),

      "Todas as competências"
    );

    elemento.value = valorAtual;
  });
}

function abrirFuncionario() {
  document
    .querySelector(
      "#formFuncionario"
    )
    .reset();

  document.querySelector(
    "#funcionarioId"
  ).value = "";

  document.querySelector(
    "#funcionarioDn"
  ).value = "";

  document
    .querySelector(
      "#modalFuncionario"
    )
    .showModal();
}

window.editarFuncionario =
  id => {
    const funcionario =
      funcionarioPorId(id);

    if (!funcionario) {
      return;
    }

    document.querySelector(
      "#funcionarioId"
    ).value = funcionario.id;

    document.querySelector(
      "#funcionarioFilial"
    ).value = funcionario.filial;

    document.querySelector(
      "#funcionarioDn"
    ).value = funcionario.dn;

    document.querySelector(
      "#funcionarioNome"
    ).value = funcionario.nome;

    document.querySelector(
      "#funcionarioCargo"
    ).value = funcionario.cargo;

    document.querySelector(
      "#funcionarioAtivo"
    ).value = String(
      funcionario.ativo
    );

    document
      .querySelector(
        "#modalFuncionario"
      )
      .showModal();
  };

window.excluirFuncionario =
  async id => {
    const possuiLancamentos =
      db.lancamentos.some(
        lancamento =>
          lancamento.funcionarioId ===
          id
      );

    if (possuiLancamentos) {
      alert(
        "Este funcionário possui lançamentos. Exclua os lançamentos primeiro ou deixe o funcionário inativo."
      );

      return;
    }

    const confirmou =
      confirm(
        "Deseja realmente excluir este funcionário?"
      );

    if (!confirmou) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          firestore,
          "funcionarios",
          id
        )
      );

      toast(
        "Funcionário excluído"
      );
    } catch (erro) {
      console.error(
        "Erro ao excluir funcionário:",
        erro
      );

      alert(
        "Não foi possível excluir o funcionário."
      );
    }
  };

function atualizarFuncionariosLancamento() {
  const filialSelecionada =
    document.querySelector(
      "#lancamentoFilial"
    ).value;

  const colaboradores =
    db.funcionarios
      .filter(
        funcionario => {
          return (
            funcionario.ativo ===
              true &&

            funcionario.filial ===
              filialSelecionada &&

            !cargoAutomatico(
              funcionario.cargo
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

  preencherSelect(
    document.querySelector(
      "#lancamentoFuncionario"
    ),

    colaboradores,

    "Selecione o colaborador"
  );

  renderCamposDinamicos();
}

function renderCamposDinamicos(dados = {}) {
  const funcionarioId = document.querySelector("#lancamentoFuncionario").value;
  const funcionario = funcionarioPorId(funcionarioId);
  const box = document.querySelector("#camposDinamicos");
  const preview = document.querySelector("#resultadoPreview");

  if (!funcionario) {
    box.innerHTML = `
      <p class="empty">
        Selecione um colaborador para informar os indicadores.
      </p>
    `;

    preview.innerHTML = "O cálculo aparecerá aqui.";
    return;
  }

  if (funcionario.cargo === "Mecânico Produtivo") {
    box.innerHTML = `
      <label>
        Faturamento individual
        <input
          type="text"
          inputmode="decimal"
          autocomplete="off"
          id="faturamento"
          placeholder="R$ 0,00"
          value="${numero(dados.faturamento) > 0 ? moeda(dados.faturamento) : ""}"
        >
      </label>

      <label>
        Horas trabalhadas
        <input
          type="number"
          step="0.01"
          min="0"
          id="horasTrabalhadas"
          required
          value="${dados.horasTrabalhadas ?? ""}"
        >
      </label>

      <label>
        Hora vendida/cobrada
        <input
          type="number"
          step="0.01"
          min="0"
          id="horasVendidas"
          required
          value="${dados.horasVendidas ?? ""}"
        >
      </label>

      <label>
        Hora disponível
        <input
          type="number"
          step="0.01"
          min="0"
          id="horasDisponiveis"
          required
          value="${dados.horasDisponiveis ?? ""}"
        >
      </label>

      <label>
        Treinamento
        <select id="treinamentoPendente">
          <option value="false">Em dias</option>
          <option value="true">Pendente</option>
        </select>
      </label>

      <label>
        OS interna / prejuízo
        <select id="osPrejuizo">
          <option value="false">Não</option>
          <option value="true">Sim</option>
        </select>
      </label>
    `;
  } else if (cargoAutomatico(funcionario.cargo)) {
    box.innerHTML = `
      <p class="empty">
        Este cargo possui apuração automática e não aceita lançamento manual.
      </p>
    `;

    preview.innerHTML = "O resultado será calculado automaticamente na apuração.";
    return;
  } else {
    box.innerHTML = `
      <label>
        Produtividade da oficina (%)
        <input
          type="number"
          step="0.01"
          min="0"
          id="produtividadeInformada"
          required
          value="${dados.produtividadeInformada ?? ""}"
        >
      </label>

      <label>
        Eficiência da oficina (%)
        <input
          type="number"
          step="0.01"
          min="0"
          id="eficienciaInformada"
          required
          value="${dados.eficienciaInformada ?? ""}"
        >
      </label>
    `;
  }

  const treinamento = document.querySelector("#treinamentoPendente");
  const prejuizo = document.querySelector("#osPrejuizo");

  if (treinamento) {
    treinamento.value = String(Boolean(dados.treinamentoPendente));
  }

  if (prejuizo) {
    prejuizo.value = String(Boolean(dados.osPrejuizo));
  }

  box.querySelectorAll("input, select").forEach(elemento => {
    elemento.addEventListener("input", atualizarPreview);
    elemento.addEventListener("change", atualizarPreview);
  });

  const campoFaturamento = document.querySelector("#faturamento");

  if (campoFaturamento) {
    campoFaturamento.addEventListener("focus", () => {
      retirarFormatoMoeda(campoFaturamento);
    });

    campoFaturamento.addEventListener("blur", () => {
      formatarCampoMoeda(campoFaturamento);
      atualizarPreview();
    });

    campoFaturamento.addEventListener("keydown", evento => {
      if (evento.key === "Enter") {
        evento.preventDefault();
        campoFaturamento.blur();
      }
    });
  }

  atualizarPreview();
}

function coletarLancamentoFormulario() {
  const funcionarioId =
    document.querySelector(
      "#lancamentoFuncionario"
    ).value;

  const funcionario =
    funcionarioPorId(
      funcionarioId
    );

  if (!funcionario) {
    throw new Error(
      "Selecione um colaborador válido."
    );
  }

  if (
    cargoAutomatico(
      funcionario.cargo
    )
  ) {
    throw new Error(
      "Chefe de Oficina e Mecânico Líder possuem apuração automática."
    );
  }

  const get = id =>
    document.querySelector(
      `#${id}`
    );

  const base = {
    id:
      document.querySelector(
        "#lancamentoId"
      ).value || uid(),

    competencia:
      document.querySelector(
        "#lancamentoCompetencia"
      ).value,

    funcionarioId,

    nome: funcionario.nome,

    filial: funcionario.filial,

    dn: funcionario.dn,

    cargo: funcionario.cargo
  };

  [
    "faturamento",
    "horasDisponiveis",
    "horasTrabalhadas",
    "horasVendidas",
    "produtividadeInformada",
    "eficienciaInformada"
  ].forEach(id => {
    if (get(id)) {
      base[id] = numero(
        get(id).value
      );
    }
  });

  if (
    get(
      "treinamentoPendente"
    )
  ) {
    base.treinamentoPendente =
      get(
        "treinamentoPendente"
      ).value === "true";
  }

  if (get("osPrejuizo")) {
    base.osPrejuizo =
      get(
        "osPrejuizo"
      ).value === "true";
  }

  return base;
}

function atualizarPreview() {
  const funcionarioId = document.querySelector("#lancamentoFuncionario").value;

  if (!funcionarioId) {
    return;
  }

  try {
    const dadosFormulario = coletarLancamentoFormulario();
    const resultado = calcularLancamento(dadosFormulario);

    let metricasHtml = "";

    if (resultado.cargo === "Mecânico Produtivo") {
      const horasTrabalhadas = numero(resultado.horasTrabalhadas);
      const horasVendidas = numero(resultado.horasVendidas);
      const horasDisponiveis = numero(resultado.horasDisponiveis);

      metricasHtml = `
        <div class="preview-metricas">
          <div>
            <span>Faturamento realizado</span>
            <strong>${moeda(resultado.faturamento)}</strong>
          </div>

          <div>
            <span>Produtividade</span>
            <strong>${pct(resultado.produtividade)}</strong>
            <small>
              ${horasTrabalhadas.toFixed(2).replace(".", ",")}h trabalhadas
              ÷
              ${horasDisponiveis.toFixed(2).replace(".", ",")}h disponíveis
            </small>
          </div>

          <div>
            <span>Eficiência</span>
            <strong>${pct(resultado.eficiencia)}</strong>
            <small>
              ${horasVendidas.toFixed(2).replace(".", ",")}h vendidas
              ÷
              ${horasTrabalhadas.toFixed(2).replace(".", ",")}h trabalhadas
            </small>
          </div>
        </div>
      `;
    }

    if (resultado.cargo === "Controlador de Produtividade") {
      metricasHtml = `
        <div class="preview-metricas">
          <div>
            <span>Produtividade</span>
            <strong>${pct(resultado.produtividade)}</strong>
          </div>

          <div>
            <span>Eficiência</span>
            <strong>${pct(resultado.eficiencia)}</strong>
          </div>
        </div>
      `;
    }

    document.querySelector("#resultadoPreview").innerHTML = `
      ${metricasHtml}

      <div class="preview-resultado">
        <strong>${resultado.status}</strong>

        <span>
          Bônus bruto:
          <strong>${moeda(resultado.bonusBruto)}</strong>
        </span>

        <span>
          Penalidade:
          <strong>${moeda(resultado.penalidade)}</strong>
        </span>

        <span>
          Total:
          <strong>${moeda(resultado.bonusFinal)}</strong>
        </span>
      </div>

      ${resultado.motivo ? `<small class="preview-motivo">${resultado.motivo}</small>` : ""}
    `;
  } catch (erro) {
    console.error("Erro no cálculo do preview:", erro);
    document.querySelector("#resultadoPreview").textContent = erro.message;
  }
}

function abrirLancamento() {
  const possuiColaboradorManual =
    db.funcionarios.some(
      funcionario =>
        funcionario.ativo &&
        !cargoAutomatico(
          funcionario.cargo
        )
    );

  if (
    !possuiColaboradorManual
  ) {
    alert(
      "Cadastre pelo menos um Mecânico Produtivo ou Controlador ativo primeiro."
    );

    return;
  }

  document
    .querySelector(
      "#formLancamento"
    )
    .reset();

  document.querySelector(
    "#lancamentoId"
  ).value = "";

  document.querySelector(
    "#lancamentoCompetencia"
  ).value =
    document.querySelector(
      "#competenciaGlobal"
    ).value || mesAtual();

  document.querySelector(
    "#lancamentoFuncionario"
  ).innerHTML = `
    <option value="">
      Selecione primeiro a filial
    </option>
  `;

  renderCamposDinamicos();

  document
    .querySelector(
      "#modalLancamento"
    )
    .showModal();
}

window.editarLancamento =
  id => {
    const lancamento =
      db.lancamentos.find(
        item => item.id === id
      );

    if (
      !lancamento ||
      cargoAutomatico(
        lancamento.cargo
      )
    ) {
      return;
    }

    document.querySelector(
      "#lancamentoId"
    ).value = lancamento.id;

    document.querySelector(
      "#lancamentoCompetencia"
    ).value =
      lancamento.competencia;

    document.querySelector(
      "#lancamentoFilial"
    ).value = lancamento.filial;

    atualizarFuncionariosLancamento();

    document.querySelector(
      "#lancamentoFuncionario"
    ).value =
      lancamento.funcionarioId;

    renderCamposDinamicos(
      lancamento
    );

    document
      .querySelector(
        "#modalLancamento"
      )
      .showModal();
  };

window.excluirLancamento =
  id => {
    const confirmou =
      confirm(
        "Excluir este lançamento?"
      );

    if (!confirmou) {
      return;
    }

    db.lancamentos =
      db.lancamentos.filter(
        lancamento =>
          lancamento.id !== id
      );

    salvarDB();
    renderTudo();

    toast(
      "Lançamento excluído"
    );
  };


function obterBibliotecaExcel() {
  const biblioteca = window.ExcelJS;

  if (!biblioteca) {
    throw new Error(
      "A biblioteca ExcelJS não foi carregada. Confira o index.html."
    );
  }

  return biblioteca;
}

function obterBibliotecaPdf() {
  const construtor = window.jspdf?.jsPDF;

  if (!construtor) {
    throw new Error(
      "A biblioteca de PDF não foi carregada. Confira os scripts adicionados ao index.html."
    );
  }

  return construtor;
}

function obterTipoExportacao() {
  return (
    document.querySelector("#tipoExportacao")?.value ||
    "habilitados"
  );
}

function obterCompetenciaExportacao() {
  return (
    document.querySelector("#competenciaGlobal")?.value ||
    ""
  );
}

function formatarCompetencia(competencia) {
  if (!competencia) {
    return "Todas";
  }

  const [ano, mes] = competencia.split("-");

  return ano && mes
    ? `${mes}/${ano}`
    : competencia;
}

function limparNomeArquivo(texto) {
  return String(texto || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function obterResultadosParaExportacao() {
  const competencia =
    obterCompetenciaExportacao();

  const tipo =
    obterTipoExportacao();

  let resultados =
    obterResultadosCampanha();

  if (competencia) {
    resultados = resultados.filter(
      resultado =>
        resultado.competencia ===
        competencia
    );
  }

  if (tipo === "habilitados") {
    resultados = resultados.filter(
      resultado =>
        resultado.status ===
        "HABILITADO"
    );
  }

  return resultados.sort((a, b) => {
    const filial = String(
      a.filial || ""
    ).localeCompare(
      String(b.filial || ""),
      "pt-BR"
    );

    if (filial !== 0) {
      return filial;
    }

    const cargo = String(
      a.cargo || ""
    ).localeCompare(
      String(b.cargo || ""),
      "pt-BR"
    );

    if (cargo !== 0) {
      return cargo;
    }

    return String(
      a.nome || ""
    ).localeCompare(
      String(b.nome || ""),
      "pt-BR"
    );
  });
}

function obterNomeColaborador(resultado) {
  const funcionario =
    funcionarioPorId(
      resultado.funcionarioId
    );

  if (funcionario?.nome) {
    return funcionario.nome;
  }

  if (
    resultado.nome &&
    resultado.nome !== "Funcionário removido"
  ) {
    return resultado.nome;
  }

  return "Colaborador não localizado";
}

function criarResumoExportacao(resultados) {
  return {
    registros: resultados.length,

    habilitados:
      resultados.filter(
        resultado =>
          resultado.status ===
          "HABILITADO"
      ).length,

    naoHabilitados:
      resultados.filter(
        resultado =>
          resultado.status ===
          "NÃO HABILITADO"
      ).length,

    filiais:
      new Set(
        resultados.map(
          resultado =>
            resultado.filial
        )
      ).size,

    totalBonus:
      resultados.reduce(
        (total, resultado) =>
          total +
          numero(
            resultado.bonusFinal
          ),
        0
      )
  };
}

function aplicarBordaExcel(celula) {
  celula.border = {
    top: { style: "thin", color: { argb: "DDE6EB" } },
    left: { style: "thin", color: { argb: "DDE6EB" } },
    bottom: { style: "thin", color: { argb: "DDE6EB" } },
    right: { style: "thin", color: { argb: "DDE6EB" } }
  };
}

function adicionarCabecalhoExcel(planilha, resultados) {
  const resumo = criarResumoExportacao(resultados);

  planilha.mergeCells("A1:M2");

  const titulo = planilha.getCell("A1");
  titulo.value = "CAMPANHAS PÓS-VENDAS";
  titulo.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "072B4D" }
  };
  titulo.font = {
    name: "Arial",
    size: 18,
    bold: true,
    color: { argb: "FFFFFF" }
  };
  titulo.alignment = {
    vertical: "middle",
    horizontal: "left"
  };

  planilha.mergeCells("A3:F3");
  planilha.mergeCells("G3:M3");

  const competencia = planilha.getCell("A3");
  competencia.value =
    `Competência: ${formatarCompetencia(
      obterCompetenciaExportacao()
    )}`;
  competencia.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "072B4D" }
  };
  competencia.font = {
    name: "Arial",
    size: 10,
    color: { argb: "FFFFFF" }
  };
  competencia.alignment = {
    vertical: "middle",
    horizontal: "left"
  };

  const tipo = planilha.getCell("G3");
  tipo.value =
    `Exportação: ${
      obterTipoExportacao() === "habilitados"
        ? "Somente habilitados"
        : "Todos os resultados"
    }`;
  tipo.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "072B4D" }
  };
  tipo.font = {
    name: "Arial",
    size: 10,
    color: { argb: "FFFFFF" }
  };
  tipo.alignment = {
    vertical: "middle",
    horizontal: "right"
  };

  const cards = [
    ["A5", "C6", "Resultados", String(resumo.registros)],
    ["D5", "F6", "Habilitados", String(resumo.habilitados)],
    ["G5", "I6", "Filiais", String(resumo.filiais)],
    ["J5", "M6", "Total do bônus", moeda(resumo.totalBonus)]
  ];

  cards.forEach(([inicio, fim, rotulo, valor]) => {
    planilha.mergeCells(`${inicio}:${fim}`);

    const celula = planilha.getCell(inicio);
    celula.value = {
      richText: [
        {
          font: {
            name: "Arial",
            size: 9,
            color: { argb: "657380" }
          },
          text: `${rotulo}\n`
        },
        {
          font: {
            name: "Arial",
            size: 15,
            bold: true,
            color: { argb: "16202A" }
          },
          text: valor
        }
      ]
    };

    celula.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F4F8FA" }
    };

    celula.alignment = {
      vertical: "middle",
      horizontal: "left",
      wrapText: true
    };

    aplicarBordaExcel(celula);
  });

  planilha.getRow(1).height = 24;
  planilha.getRow(2).height = 12;
  planilha.getRow(5).height = 22;
  planilha.getRow(6).height = 22;
}

function adicionarTabelaExcel(planilha, resultados) {
  const linhaCabecalho = 8;

  const cabecalhos = [
    "Competência",
    "DN",
    "Filial",
    "Colaborador",
    "Cargo",
    "Faturamento",
    "Produtividade",
    "Eficiência",
    "Bônus bruto",
    "Penalidade",
    "Total do bônus",
    "Status",
    "Observação"
  ];

  const cabecalho = planilha.getRow(linhaCabecalho);
  cabecalho.values = cabecalhos;
  cabecalho.height = 28;

  cabecalho.eachCell(celula => {
    celula.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "0B7A53" }
    };
    celula.font = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: "FFFFFF" }
    };
    celula.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true
    };
    aplicarBordaExcel(celula);
  });

  resultados.forEach((resultado, indice) => {
    const linha = planilha.getRow(linhaCabecalho + indice + 1);

    linha.values = [
      formatarCompetencia(resultado.competencia),
      resultado.dn || "",
      resultado.filial || "",
      obterNomeColaborador(resultado),
      resultado.cargo || "",
      resultado.cargo === "Mecânico Produtivo"
        ? numero(resultado.faturamento)
        : "",
      numero(resultado.produtividade) / 100,
      numero(resultado.eficiencia) / 100,
      numero(resultado.bonusBruto),
      numero(resultado.penalidade),
      numero(resultado.bonusFinal),
      resultado.status || "",
      resultado.motivo ||
        (resultado.status === "HABILITADO"
          ? "Campanha habilitada"
          : "")
    ];

    linha.height = 34;

    linha.eachCell((celula, coluna) => {
      celula.font = {
        name: "Arial",
        size: 10,
        color: { argb: "23313C" }
      };

      celula.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: indice % 2 === 0 ? "FFFFFF" : "F7FAFC"
        }
      };

      celula.alignment = {
        vertical: "middle",
        wrapText: true
      };

      aplicarBordaExcel(celula);

      if ([6, 9, 10, 11].includes(coluna)) {
        celula.numFmt = 'R$ #,##0.00';
        celula.alignment = {
          vertical: "middle",
          horizontal: "right"
        };
      }

      if ([7, 8].includes(coluna)) {
        celula.numFmt = "0.00%";
        celula.alignment = {
          vertical: "middle",
          horizontal: "right"
        };
      }

      if (coluna === 12) {
        const habilitado = resultado.status === "HABILITADO";

        celula.font = {
          name: "Arial",
          size: 10,
          bold: true,
          color: {
            argb: habilitado ? "087344" : "A42121"
          }
        };

        celula.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: habilitado ? "DFF6EA" : "FFE4E4"
          }
        };

        celula.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true
        };

        aplicarBordaExcel(celula);
      }
    });
  });

  planilha.columns = [
    { width: 14 },
    { width: 10 },
    { width: 18 },
    { width: 32 },
    { width: 28 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 17 },
    { width: 15 },
    { width: 18 },
    { width: 19 },
    { width: 42 }
  ];

  planilha.views = [
    {
      state: "frozen",
      ySplit: linhaCabecalho,
      activeCell: "A9",
      showGridLines: false
    }
  ];

  planilha.autoFilter = {
    from: { row: linhaCabecalho, column: 1 },
    to: { row: linhaCabecalho, column: 13 }
  };

  planilha.pageSetup = {
    orientation: "landscape",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.35,
      bottom: 0.35,
      header: 0.1,
      footer: 0.1
    }
  };

  planilha.headerFooter = {
    oddFooter:
      "&LSistema de Campanhas Pós-Vendas&C&P de &N&R&D"
  };
}


async function exportarExcel() {
  if (!funcionariosCarregados) {
    alert(
      "A base de funcionários ainda está carregando. Aguarde alguns segundos e tente novamente."
    );

    return;
  }

  const resultados =
    obterResultadosParaExportacao();

  if (!resultados.length) {
    alert(
      "Não existem resultados para os critérios selecionados."
    );
    return;
  }

  try {
    const ExcelJS =
      obterBibliotecaExcel();

    const livro =
      new ExcelJS.Workbook();

    livro.creator =
      "Sistema de Campanhas Pós-Vendas";

    livro.created =
      new Date();

    const planilha =
      livro.addWorksheet("Apuração", {
        properties: {
          defaultRowHeight: 20
        },
        views: [
          {
            showGridLines: false
          }
        ]
      });

    adicionarCabecalhoExcel(
      planilha,
      resultados
    );

    adicionarTabelaExcel(
      planilha,
      resultados
    );

    const competenciaEvidencias =
      obterCompetenciaExportacao();

    if (
      competenciaEvidencias &&
      window.evidenciasProdutivos?.anexarAoExcel
    ) {
      await window.evidenciasProdutivos.anexarAoExcel(
        livro,
        competenciaEvidencias
      );
    }

    const buffer =
      await livro.xlsx.writeBuffer();

    const competencia =
      limparNomeArquivo(
        obterCompetenciaExportacao() ||
        "todas"
      );

    const tipo =
      obterTipoExportacao() ===
      "habilitados"
        ? "habilitados"
        : "todos";

    baixar(
      new Blob([buffer], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }),
      `campanha-${competencia}-${tipo}.xlsx`
    );

    toast(
      "Planilha Excel exportada"
    );
  } catch (erro) {
    console.error(
      "Erro ao exportar Excel:",
      erro
    );

    alert(
      erro.message ||
      "Não foi possível gerar o arquivo Excel."
    );
  }
}

async function exportarPdf() {
  if (!funcionariosCarregados) {
    alert(
      "A base de funcionários ainda está carregando. Aguarde alguns segundos e tente novamente."
    );

    return;
  }

  const resultados =
    obterResultadosParaExportacao();

  if (!resultados.length) {
    alert(
      "Não existem resultados para os critérios selecionados."
    );

    return;
  }

  try {
    const jsPDF =
      obterBibliotecaPdf();

    const documento =
      new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

    if (
      typeof documento.autoTable !==
      "function"
    ) {
      throw new Error(
        "O complemento de tabela do PDF não foi carregado."
      );
    }

    const resumo =
      criarResumoExportacao(
        resultados
      );

    const larguraPagina =
      documento.internal.pageSize.getWidth();

    const alturaPagina =
      documento.internal.pageSize.getHeight();

    documento.setFillColor(
      7,
      43,
      77
    );

    documento.rect(
      0,
      0,
      larguraPagina,
      30,
      "F"
    );

    documento.setTextColor(
      255,
      255,
      255
    );

    documento.setFont(
      "helvetica",
      "bold"
    );

    documento.setFontSize(17);

    documento.text(
      "CAMPANHAS PÓS-VENDAS",
      12,
      12
    );

    documento.setFont(
      "helvetica",
      "normal"
    );

    documento.setFontSize(9);

    documento.text(
      `Competência: ${formatarCompetencia(
        obterCompetenciaExportacao()
      )}`,
      12,
      20
    );

    documento.text(
      `Exportação: ${
        obterTipoExportacao() ===
        "habilitados"
          ? "Somente habilitados"
          : "Todos os resultados"
      }`,
      12,
      25
    );

    documento.text(
      `Gerado em ${new Date().toLocaleString(
        "pt-BR"
      )}`,
      larguraPagina - 12,
      20,
      {
        align: "right"
      }
    );

    const cards = [
      [
        "Resultados",
        String(
          resumo.registros
        )
      ],

      [
        "Habilitados",
        String(
          resumo.habilitados
        )
      ],

      [
        "Filiais",
        String(
          resumo.filiais
        )
      ],

      [
        "Total do bônus",
        moeda(
          resumo.totalBonus
        )
      ]
    ];

    cards.forEach(
      (
        [titulo, valor],
        indice
      ) => {
        const x =
          12 +
          indice * 55;

        documento.setFillColor(
          244,
          248,
          250
        );

        documento.setDrawColor(
          220,
          228,
          234
        );

        documento.roundedRect(
          x,
          35,
          51,
          18,
          2,
          2,
          "FD"
        );

        documento.setFont(
          "helvetica",
          "normal"
        );

        documento.setFontSize(7);

        documento.setTextColor(
          101,
          115,
          128
        );

        documento.text(
          titulo,
          x + 4,
          41
        );

        documento.setFont(
          "helvetica",
          "bold"
        );

        documento.setFontSize(10);

        documento.setTextColor(
          22,
          32,
          42
        );

        documento.text(
          valor,
          x + 4,
          48
        );
      }
    );

    const corpoTabela =
      resultados.map(
        resultado => [
          formatarCompetencia(
            resultado.competencia
          ),

          resultado.filial || "",

          obterNomeColaborador(resultado),

          resultado.cargo || "",

          resultado.cargo ===
          "Mecânico Produtivo"
            ? moeda(
                resultado.faturamento
              )
            : "—",

          pct(
            resultado.produtividade
          ),

          pct(
            resultado.eficiencia
          ),

          moeda(
            resultado.bonusFinal
          ),

          resultado.status || ""
        ]
      );

    documento.autoTable({
      startY: 59,

      margin: {
        left: 10,
        right: 10,
        bottom: 13
      },

      head: [[
        "Competência",
        "Filial",
        "Colaborador",
        "Cargo",
        "Faturamento",
        "Produtividade",
        "Eficiência",
        "Bônus total",
        "Status"
      ]],

      body: corpoTabela,

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 6.7,
        cellPadding: 2.2,
        textColor: [
          35,
          49,
          60
        ],
        lineColor: [
          222,
          230,
          235
        ],
        lineWidth: 0.15,
        valign: "middle"
      },

      headStyles: {
        fillColor: [
          11,
          122,
          83
        ],
        textColor: [
          255,
          255,
          255
        ],
        fontStyle: "bold",
        fontSize: 6.8
      },

      alternateRowStyles: {
        fillColor: [
          247,
          250,
          252
        ]
      },

      columnStyles: {
        0: {
          cellWidth: 20
        },

        1: {
          cellWidth: 25
        },

        2: {
          cellWidth: 43
        },

        3: {
          cellWidth: 38
        },

        4: {
          cellWidth: 27,
          halign: "right"
        },

        5: {
          cellWidth: 23,
          halign: "right"
        },

        6: {
          cellWidth: 21,
          halign: "right"
        },

        7: {
          cellWidth: 26,
          halign: "right"
        },

        8: {
          cellWidth: 27,
          halign: "center"
        }
      },

      didParseCell: dados => {
        if (
          dados.section === "body" &&
          dados.column.index === 8
        ) {
          const status =
            String(
              dados.cell.raw
            );

          dados.cell.styles.fontStyle =
            "bold";

          dados.cell.styles.textColor =
            status === "HABILITADO"
              ? [
                  8,
                  115,
                  68
                ]
              : [
                  164,
                  33,
                  33
                ];
        }
      },

      didDrawPage: () => {
        const pagina =
          documento.internal.getCurrentPageInfo().pageNumber;

        documento.setFontSize(7);

        documento.setTextColor(
          101,
          115,
          128
        );

        documento.text(
          "Sistema de Campanhas Pós-Vendas",
          12,
          alturaPagina - 6
        );

        documento.text(
          `Página ${pagina}`,
          larguraPagina - 12,
          alturaPagina - 6,
          {
            align: "right"
          }
        );
      }
    });

    const competenciaEvidencias =
      obterCompetenciaExportacao();

    if (
      competenciaEvidencias &&
      window.evidenciasProdutivos?.anexarAoPdf
    ) {
      await window.evidenciasProdutivos.anexarAoPdf(
        documento,
        competenciaEvidencias
      );
    }

    const competencia =
      limparNomeArquivo(
        competenciaEvidencias ||
        "todas"
      );

    const tipo =
      obterTipoExportacao() ===
      "habilitados"
        ? "habilitados"
        : "todos";

    documento.save(
      `campanha-${competencia}-${tipo}.pdf`
    );

    toast(
      "Relatório PDF exportado"
    );
  } catch (erro) {
    console.error(
      "Erro ao exportar PDF:",
      erro
    );

    alert(
      erro.message ||
      "Não foi possível gerar o arquivo PDF."
    );
  }
}


function exportarJson() {
  const dadosExportacao = {
    funcionarios:
      db.funcionarios,

    lancamentos:
      db.lancamentos,

    apuracao:
      obterResultadosCampanha()
  };

  baixar(
    new Blob(
      [
        JSON.stringify(
          dadosExportacao,
          null,
          2
        )
      ],
      {
        type: "application/json"
      }
    ),

    `campanha-oficina-${Date.now()}.json`
  );
}

function exportarCsv() {
  const cabecalho = [
    "Competência",
    "DN",
    "Filial",
    "Colaborador",
    "Cargo",
    "Produtividade",
    "Eficiência",
    "Bônus bruto",
    "Penalidade",
    "Bônus final",
    "Status",
    "Motivo"
  ];

  const linhas =
    apuracaoAtual.map(
      item => [
        item.competencia,
        item.dn,
        item.filial,
        item.nome,
        item.cargo,

        numero(
          item.produtividade
        ).toFixed(2),

        numero(
          item.eficiencia
        ).toFixed(2),

        numero(
          item.bonusBruto
        ).toFixed(2),

        numero(
          item.penalidade
        ).toFixed(2),

        numero(
          item.bonusFinal
        ).toFixed(2),

        item.status,
        item.motivo
      ]
    );

  const csv =
    "\uFEFF" +
    [
      cabecalho,
      ...linhas
    ]
      .map(linha =>
        linha
          .map(
            valor =>
              `"${String(
                valor ?? ""
              ).replaceAll(
                '"',
                '""'
              )}"`
          )
          .join(";")
      )
      .join("\n");

  baixar(
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8"
      }
    ),

    "apuracao-campanha.csv"
  );
}

function baixar(blob, nome) {
  const link =
    document.createElement("a");

  const url =
    URL.createObjectURL(blob);

  link.href = url;
  link.download = nome;

  document.body.appendChild(
    link
  );

  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function configurarEventos() {
  document
    .querySelectorAll(
      ".nav-btn"
    )
    .forEach(botao => {
      botao.addEventListener(
        "click",
        () => {
          document
            .querySelectorAll(
              ".nav-btn, .view"
            )
            .forEach(elemento => {
              elemento.classList.remove(
                "active"
              );
            });

          botao.classList.add(
            "active"
          );

          document
            .querySelector(
              `#${botao.dataset.view}`
            )
            .classList.add(
              "active"
            );

          document.querySelector(
            "#pageTitle"
          ).textContent =
            botao.textContent;
        }
      );
    });

  const competenciaGlobal =
    document.querySelector(
      "#competenciaGlobal"
    );

  competenciaGlobal.value =
    limitarCompetenciaHistorico(
      competenciaGlobal.value ||
      mesAtual()
    );

  competenciaGlobal.min =
    HISTORICO_INICIO;

  competenciaGlobal.max =
    mesAtual();

  document
    .querySelector(
      "#competenciaGlobal"
    )
    .addEventListener(
      "change",
      evento => {
        evento.target.value =
          limitarCompetenciaHistorico(
            evento.target.value ||
            mesAtual()
          );

        atualizarNavegacaoHistorico();
        renderDashboard();
      }
    );


  document
    .querySelector(
      "#btnNovoFuncionario"
    )
    .addEventListener(
      "click",
      abrirFuncionario
    );

  document
    .querySelector(
      "#btnNovoLancamento"
    )
    .addEventListener(
      "click",
      abrirLancamento
    );

  document
    .querySelector(
      "#funcionarioFilial"
    )
    .addEventListener(
      "change",
      evento => {
        document.querySelector(
          "#funcionarioDn"
        ).value =
          filialPorNome(
            evento.target.value
          )?.dn || "";
      }
    );

  document
    .querySelector(
      "#lancamentoFilial"
    )
    .addEventListener(
      "change",
      atualizarFuncionariosLancamento
    );

  document
    .querySelector(
      "#lancamentoFuncionario"
    )
    .addEventListener(
      "change",
      () =>
        renderCamposDinamicos()
    );

  document
    .querySelectorAll(
      ".fechar-modal"
    )
    .forEach(botao => {
      botao.addEventListener(
        "click",
        () =>
          botao
            .closest("dialog")
            .close()
      );
    });

  document
    .querySelector(
      "#formFuncionario"
    )
    .addEventListener(
      "submit",
      async evento => {
        evento.preventDefault();

        const botaoSalvar =
          evento.submitter;

        const funcionarioId =
          document.querySelector(
            "#funcionarioId"
          ).value;

        const filial =
          document.querySelector(
            "#funcionarioFilial"
          ).value;

        const dadosFilial =
          filialPorNome(filial);

        if (!dadosFilial) {
          alert(
            "Selecione uma filial válida."
          );

          return;
        }

        const funcionario = {
          dn: dadosFilial.dn,

          filial,

          nome:
            document
              .querySelector(
                "#funcionarioNome"
              )
              .value.trim(),

          cargo:
            document.querySelector(
              "#funcionarioCargo"
            ).value,

          ativo:
            document.querySelector(
              "#funcionarioAtivo"
            ).value === "true",

          campanha:
            "PRODUTIVOS",

          atualizadoEm:
            serverTimestamp()
        };

        if (!funcionario.nome) {
          alert(
            "Informe o nome do funcionário."
          );

          return;
        }

        if (!funcionario.cargo) {
          alert(
            "Selecione o cargo do funcionário."
          );

          return;
        }

        try {
          if (botaoSalvar) {
            botaoSalvar.disabled =
              true;

            botaoSalvar.textContent =
              "Salvando...";
          }

          if (funcionarioId) {
            await updateDoc(
              doc(
                firestore,
                "funcionarios",
                funcionarioId
              ),

              funcionario
            );

            toast(
              "Funcionário atualizado"
            );
          } else {
            await addDoc(
              funcionariosRef,

              {
                ...funcionario,

                criadoEm:
                  serverTimestamp()
              }
            );

            toast(
              "Funcionário cadastrado"
            );
          }

          evento.target
            .closest("dialog")
            .close();

          evento.target.reset();

          document.querySelector(
            "#funcionarioId"
          ).value = "";

          document.querySelector(
            "#funcionarioDn"
          ).value = "";
        } catch (erro) {
          console.error(
            "Erro ao salvar funcionário:",
            erro
          );

          alert(
            "Não foi possível salvar o funcionário. Verifique o Firebase e tente novamente."
          );
        } finally {
          if (botaoSalvar) {
            botaoSalvar.disabled =
              false;

            botaoSalvar.textContent =
              "Salvar";
          }
        }
      }
    );

  document
    .querySelector(
      "#formLancamento"
    )
    .addEventListener(
      "submit",
      evento => {
        evento.preventDefault();

        try {
          const item =
            coletarLancamentoFormulario();

          const indice =
            db.lancamentos.findIndex(
              lancamento =>
                lancamento.id ===
                item.id
            );

          if (indice >= 0) {
            db.lancamentos[
              indice
            ] = item;
          } else {
            db.lancamentos.push(
              item
            );
          }

          salvarDB();

          evento.target
            .closest("dialog")
            .close();

          renderTudo();

          toast(
            "Lançamento salvo"
          );
        } catch (erro) {
          console.error(
            "Erro ao salvar lançamento:",
            erro
          );

          alert(erro.message);
        }
      }
    );

  [
    "buscaFuncionario",
    "filtroFilialFuncionario",
    "filtroCargoFuncionario"
  ].forEach(id => {
    document
      .querySelector(
        `#${id}`
      )
      .addEventListener(
        "input",
        renderFuncionarios
      );
  });

  [
    "filtroCompetenciaLancamento",
    "filtroFilialLancamento",
    "filtroCargoLancamento"
  ].forEach(id => {
    document
      .querySelector(
        `#${id}`
      )
      .addEventListener(
        "change",
        renderLancamentos
      );
  });

  [
    "filtroCompetenciaApuracao",
    "filtroFilialApuracao",
    "filtroStatusApuracao"
  ].forEach(id => {
    document
      .querySelector(
        `#${id}`
      )
      .addEventListener(
        "change",
        renderApuracao
      );
  });

  document
    .querySelector(
      "#btnExportarExcel"
    )
    .addEventListener(
      "click",
      exportarExcel
    );

  document
    .querySelector(
      "#btnExportarPdf"
    )
    .addEventListener(
      "click",
      exportarPdf
    );

  document
    .querySelector(
      "#btnExportarCsv"
    )
    .addEventListener(
      "click",
      exportarCsv
    );

  document
    .querySelector(
      "#btnLimparTudo"
    )
    .addEventListener(
      "click",
      () => {
        const confirmou =
          confirm(
            "Apagar todos os lançamentos salvos neste navegador?"
          );

        if (!confirmou) {
          return;
        }

        db.lancamentos = [];

        salvarDB();
        renderTudo();

        toast(
          "Lançamentos locais apagados"
        );
      }
    );
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    iniciarSelects();
    garantirControlesHistorico();
    configurarEventos();
    atualizarNavegacaoHistorico();
    renderTudo();
    iniciarFuncionariosTempoReal();
  }
);