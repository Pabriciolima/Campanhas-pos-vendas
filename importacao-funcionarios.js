import { firestore } from "./firebase-config.js";

import {
  collection,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const IMPORT_CONFIG = {
  maxPorArquivo: 2000,
  maxPorLoteFirestore: 450
};

const FILIAIS_IMPORTACAO = [
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

const CARGOS_PRODUTIVOS = [
  "Mecânico Produtivo",
  "Chefe de Oficina",
  "Mecânico Líder",
  "Controlador de Produtividade"
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

const MODULOS_IMPORTACAO = {
  produtivos: {
    titulo: "Campanha dos Produtivos",
    colecao: "funcionarios",
    campanha: "PRODUTIVOS",
    cargos: CARGOS_PRODUTIVOS,
    botaoNovo: "#btnNovoFuncionario",
    painel: "#funcionarios .panel-header"
  },

  pix: {
    titulo: "Pix do Presidente",
    colecao: "pix_presidente_funcionarios",
    campanha: "PIX_DO_PRESIDENTE",
    cargos: CARGOS_PIX,
    botaoNovo: "#btnNovoFuncionarioPix",
    painel: "#pix-funcionarios .panel-header"
  }
};

const estadoImportacao = {
  modulo: "",
  arquivo: null,
  validos: [],
  erros: [],
  duplicados: [],
  importando: false
};

function $(seletor) {
  return document.querySelector(seletor);
}

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function normalizarCabecalho(valor) {
  return normalizarTexto(valor)
    .replace(/[./\\()_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textoLimpo(valor) {
  return String(valor ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function capitalizarNome(valor) {
  return textoLimpo(valor)
    .toLocaleUpperCase("pt-BR");
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function mostrarAlerta(opcoes = {}) {
  const configuracao = {
    tipo:
      opcoes.tipo || "info",
    titulo:
      opcoes.titulo || "Informação",
    mensagem:
      opcoes.mensagem || ""
  };

  /*
   * Tenta primeiro a central visual incorporada no sistema.
   * Caso alguma versão antiga da CampanhaUI gere erro,
   * tenta automaticamente os outros alertas disponíveis.
   */
  try {
    if (
      window.CampanhaUI &&
      typeof window.CampanhaUI.alert === "function"
    ) {
      await Promise.resolve(
        window.CampanhaUI.alert(
          configuracao.mensagem,
          {
            tipo:
              configuracao.tipo,
            titulo:
              configuracao.titulo
          }
        )
      );

      return true;
    }
  } catch (erro) {
    console.warn(
      "[IMPORTAÇÃO] CampanhaUI.alert falhou. Tentando fallback.",
      erro
    );
  }

  try {
    if (
      typeof window.appAlert === "function"
    ) {
      await Promise.resolve(
        window.appAlert({
          tipo:
            configuracao.tipo,
          titulo:
            configuracao.titulo,
          mensagem:
            configuracao.mensagem,
          type:
            configuracao.tipo,
          title:
            configuracao.titulo,
          message:
            configuracao.mensagem
        })
      );

      return true;
    }
  } catch (erro) {
    console.warn(
      "[IMPORTAÇÃO] appAlert falhou. Tentando alert padrão.",
      erro
    );
  }

  /*
   * Último recurso. Usa nativeAlert quando ele estiver
   * disponível para evitar chamar novamente um alert
   * sobrescrito que esteja com problema.
   */
  const alertaFinal =
    typeof window.nativeAlert === "function"
      ? window.nativeAlert
      : window.alert;

  alertaFinal(
    `${configuracao.titulo}\n\n${configuracao.mensagem}`
  );

  return true;
}

function aguardarImportacao(tempo = 260) {
  return new Promise(
    resolver =>
      setTimeout(
        resolver,
        tempo
      )
  );
}

async function mostrarSucessoImportacao({
  config,
  importados,
  duplicados,
  erros
}) {
  const nomesIgnorados =
    nomesDuplicadosTexto(
      duplicados
    );

  const partes = [
    `${importados} funcionário(s) novo(s) foram adicionados com sucesso à base ${config.titulo}.`
  ];

  if (duplicados.length) {
    partes.push(
      `Já cadastrados e ignorados (${duplicados.length}): ${nomesIgnorados}.`
    );
  }

  if (erros.length) {
    partes.push(
      `Linhas com erro e não importadas: ${erros.length}.`
    );
  }

  /*
   * O <dialog> fica na camada superior do navegador.
   * Esperamos o fechamento terminar antes de abrir o alerta,
   * garantindo que a mensagem fique visível para o usuário.
   */
  await aguardarImportacao();

  await mostrarAlerta({
    tipo: "success",
    titulo: "Importação concluída",
    mensagem:
      partes.join("\n\n")
  });
}

function garantirAvisoTemporarioImportacao() {
  if ($("#avisoTemporarioImportacao")) {
    return;
  }

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        id="avisoTemporarioImportacao"
        class="import-result-overlay"
        aria-hidden="true"
      >
        <section
          id="avisoTemporarioImportacaoCard"
          class="import-result-card"
          role="status"
          aria-live="polite"
        >
          <button
            type="button"
            id="fecharAvisoTemporarioImportacao"
            class="import-result-close"
            aria-label="Fechar aviso"
          >
            ×
          </button>

          <div
            id="iconeAvisoTemporarioImportacao"
            class="import-result-icon"
          >
            ✓
          </div>

          <span
            id="rotuloAvisoTemporarioImportacao"
            class="import-result-label"
          >
            Importação
          </span>

          <h2 id="tituloAvisoTemporarioImportacao">
            Importação concluída
          </h2>

          <p id="mensagemAvisoTemporarioImportacao"></p>

          <div class="import-result-timer">
            <span id="barraAvisoTemporarioImportacao"></span>
          </div>
        </section>
      </div>
    `
  );
}

let temporizadorAvisoImportacao = null;

function fecharAvisoTemporarioImportacao() {
  const overlay =
    $("#avisoTemporarioImportacao");

  const card =
    $("#avisoTemporarioImportacaoCard");

  if (!overlay || !card) {
    return;
  }

  clearTimeout(
    temporizadorAvisoImportacao
  );

  overlay.classList.remove(
    "show"
  );

  card.classList.remove(
    "show"
  );

  setTimeout(
    () => {
      overlay.setAttribute(
        "aria-hidden",
        "true"
      );
    },
    220
  );
}

function mostrarAvisoTemporarioImportacao({
  tipo = "success",
  titulo = "Importação concluída",
  mensagem = "",
  duracao = 5000
}) {
  garantirAvisoTemporarioImportacao();

  const overlay =
    $("#avisoTemporarioImportacao");

  const card =
    $("#avisoTemporarioImportacaoCard");

  const icone =
    $("#iconeAvisoTemporarioImportacao");

  const rotulo =
    $("#rotuloAvisoTemporarioImportacao");

  const tituloElemento =
    $("#tituloAvisoTemporarioImportacao");

  const mensagemElemento =
    $("#mensagemAvisoTemporarioImportacao");

  const barra =
    $("#barraAvisoTemporarioImportacao");

  clearTimeout(
    temporizadorAvisoImportacao
  );

  card.className =
    `import-result-card type-${tipo}`;

  icone.textContent =
    tipo === "success"
      ? "✓"
      : tipo === "warning"
        ? "!"
        : "×";

  rotulo.textContent =
    tipo === "success"
      ? "Concluído"
      : tipo === "warning"
        ? "Atenção"
        : "Erro";

  tituloElemento.textContent =
    titulo;

  mensagemElemento.textContent =
    mensagem;

  barra.style.animation =
    "none";

  /*
   * Força o reinício da animação da barra.
   */
  void barra.offsetWidth;

  barra.style.animation =
    `importResultTimer ${duracao}ms linear forwards`;

  overlay.setAttribute(
    "aria-hidden",
    "false"
  );

  requestAnimationFrame(
    () => {
      overlay.classList.add(
        "show"
      );

      card.classList.add(
        "show"
      );
    }
  );

  temporizadorAvisoImportacao =
    setTimeout(
      fecharAvisoTemporarioImportacao,
      duracao
    );
}

function confirmarImportacao(opcoes) {
  if (window.CampanhaUI?.confirm) {
    return window.CampanhaUI.confirm({
      tipo: "question",
      titulo: opcoes.titulo,
      mensagem: opcoes.mensagem,
      textoConfirmar: opcoes.textoConfirmar,
      textoCancelar: "Cancelar"
    });
  }

  if (window.appConfirm) {
    return window.appConfirm({
      tipo: "question",
      titulo: opcoes.titulo,
      mensagem: opcoes.mensagem,
      textoConfirmar: opcoes.textoConfirmar,
      textoCancelar: "Cancelar"
    });
  }

  return Promise.resolve(
    confirm(opcoes.mensagem)
  );
}

function mostrarToast(mensagem, tipo = "success") {
  if (window.appToast) {
    window.appToast({
      tipo,
      titulo:
        tipo === "success"
          ? "Importação concluída"
          : "Importação",
      mensagem
    });
    return;
  }

  const toast = $("#toast");

  if (toast) {
    toast.textContent = mensagem;
    toast.classList.add("show");

    setTimeout(
      () => toast.classList.remove("show"),
      2800
    );
    return;
  }

  console.info(mensagem);
}

function moduloAtual() {
  return MODULOS_IMPORTACAO[
    estadoImportacao.modulo
  ];
}

function filialPorNome(nome) {
  const normalizado =
    normalizarTexto(nome);

  return FILIAIS_IMPORTACAO.find(
    item =>
      normalizarTexto(item.unidade) ===
      normalizado
  );
}

function cargoCanonico(cargoRecebido, cargosPermitidos) {
  const normalizado =
    normalizarTexto(cargoRecebido);

  return cargosPermitidos.find(
    cargo =>
      normalizarTexto(cargo) === normalizado
  ) || "";
}

function interpretarAtivo(valor) {
  const normalizado =
    normalizarTexto(valor);

  if (
    !normalizado ||
    ["ATIVO", "SIM", "S", "TRUE", "1"].includes(normalizado)
  ) {
    return true;
  }

  if (
    ["INATIVO", "NAO", "NÃO", "N", "FALSE", "0"].includes(normalizado)
  ) {
    return false;
  }

  return null;
}

function chaveFuncionario(item) {
  /*
   * Regra de unicidade:
   * o mesmo colaborador não pode ser cadastrado duas vezes
   * dentro da mesma filial, mesmo que o cargo tenha sido
   * digitado de forma diferente ou alterado posteriormente.
   */
  return [
    normalizarTexto(item.nome),
    normalizarTexto(item.filial)
  ].join("|");
}

function nomesDuplicadosTexto(
  duplicados,
  limite = 12
) {
  const nomes = [
    ...new Set(
      duplicados
        .map(item => textoLimpo(item.nome))
        .filter(Boolean)
    )
  ];

  if (!nomes.length) {
    return "";
  }

  const exibidos =
    nomes.slice(0, limite);

  const restante =
    nomes.length - exibidos.length;

  return restante > 0
    ? `${exibidos.join(", ")} e mais ${restante}`
    : exibidos.join(", ");
}

function mesclarDuplicados(
  atuais,
  novos
) {
  const mapa = new Map();

  [
    ...atuais,
    ...novos
  ].forEach(item => {
    const chave = [
      chaveFuncionario(item),
      normalizarTexto(item.motivo)
    ].join("|");

    if (!mapa.has(chave)) {
      mapa.set(chave, item);
    }
  });

  return [...mapa.values()];
}

function cabecalhoIndice(linha) {
  const aliases = {
    dn: [
      "DN",
      "CODIGO DN",
      "COD DN"
    ],
    filial: [
      "FILIAL",
      "UNIDADE",
      "LOJA"
    ],
    nome: [
      "NOME",
      "COLABORADOR",
      "FUNCIONARIO",
      "FUNCIONÁRIO",
      "NOME DO COLABORADOR",
      "NOME DO FUNCIONARIO",
      "NOME DO FUNCIONÁRIO"
    ],
    cargo: [
      "CARGO",
      "FUNCAO",
      "FUNÇÃO"
    ],
    status: [
      "STATUS",
      "ATIVO",
      "SITUACAO",
      "SITUAÇÃO"
    ]
  };

  const mapa = {};

  linha.forEach(
    (valor, indice) => {
      const cabecalho =
        normalizarCabecalho(valor);

      Object.entries(aliases)
        .forEach(
          ([campo, nomes]) => {
            if (
              !Object.hasOwn(mapa, campo) &&
              nomes.some(
                nome =>
                  normalizarCabecalho(nome) ===
                  cabecalho
              )
            ) {
              mapa[campo] = indice;
            }
          }
        );
    }
  );

  return mapa;
}

function valorCelula(linha, indice) {
  if (indice === undefined) {
    return "";
  }

  const valor = linha[indice];

  if (
    valor &&
    typeof valor === "object"
  ) {
    if ("text" in valor) {
      return valor.text;
    }

    if ("result" in valor) {
      return valor.result;
    }

    if ("richText" in valor) {
      return valor.richText
        .map(parte => parte.text)
        .join("");
    }
  }

  return valor ?? "";
}

function linhaParaArray(linhaExcel) {
  const valores = [];

  linhaExcel.eachCell(
    {
      includeEmpty: true
    },
    (celula, coluna) => {
      valores[coluna - 1] =
        celula.value;
    }
  );

  return valores;
}

async function lerArquivoExcel(arquivo) {
  if (!window.ExcelJS) {
    throw new Error(
      "A biblioteca ExcelJS não foi carregada no index.html."
    );
  }

  const extensao =
    arquivo.name
      .split(".")
      .pop()
      .toLowerCase();

  if (
    !["xlsx", "xls"].includes(extensao)
  ) {
    throw new Error(
      "Selecione um arquivo Excel no formato .xlsx ou .xls."
    );
  }

  const buffer =
    await arquivo.arrayBuffer();

  const workbook =
    new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(buffer);
  } catch (erro) {
    throw new Error(
      "Não foi possível abrir o arquivo. Salve-o no formato .xlsx e tente novamente."
    );
  }

  const modulo =
    moduloAtual();

  const nomesPreferidos =
    estadoImportacao.modulo === "pix"
      ? [
          "PIX DO PRESIDENTE",
          "PIX",
          "PARTICIPANTES"
        ]
      : [
          "PRODUTIVOS",
          "FUNCIONARIOS",
          "FUNCIONÁRIOS"
        ];

  let planilha =
    workbook.worksheets.find(
      sheet =>
        nomesPreferidos.includes(
          normalizarTexto(sheet.name)
        )
    );

  if (!planilha) {
    planilha =
      workbook.worksheets[0];
  }

  if (!planilha) {
    throw new Error(
      "O arquivo não possui nenhuma planilha."
    );
  }

  if (
    planilha.rowCount >
    IMPORT_CONFIG.maxPorArquivo + 20
  ) {
    throw new Error(
      `O arquivo ultrapassa o limite de ${IMPORT_CONFIG.maxPorArquivo} registros por importação.`
    );
  }

  let linhaCabecalho = 0;
  let mapaCabecalho = null;

  for (
    let numeroLinha = 1;
    numeroLinha <= Math.min(planilha.rowCount, 20);
    numeroLinha += 1
  ) {
    const valores =
      linhaParaArray(
        planilha.getRow(numeroLinha)
      );

    const mapa =
      cabecalhoIndice(valores);

    if (
      mapa.filial !== undefined &&
      mapa.nome !== undefined &&
      mapa.cargo !== undefined
    ) {
      linhaCabecalho = numeroLinha;
      mapaCabecalho = mapa;
      break;
    }
  }

  if (!mapaCabecalho) {
    throw new Error(
      "Não encontrei as colunas obrigatórias FILIAL, NOME e CARGO. Use o modelo disponibilizado pelo sistema."
    );
  }

  const validos = [];
  const erros = [];

  for (
    let numeroLinha =
      linhaCabecalho + 1;
    numeroLinha <= planilha.rowCount;
    numeroLinha += 1
  ) {
    const valores =
      linhaParaArray(
        planilha.getRow(numeroLinha)
      );

    const dnInformado =
      textoLimpo(
        valorCelula(
          valores,
          mapaCabecalho.dn
        )
      ).replace(/\D/g, "");

    const filialInformada =
      textoLimpo(
        valorCelula(
          valores,
          mapaCabecalho.filial
        )
      );

    const nomeInformado =
      textoLimpo(
        valorCelula(
          valores,
          mapaCabecalho.nome
        )
      );

    const cargoInformado =
      textoLimpo(
        valorCelula(
          valores,
          mapaCabecalho.cargo
        )
      );

    const statusInformado =
      textoLimpo(
        valorCelula(
          valores,
          mapaCabecalho.status
        )
      );

    const linhaVazia =
      !dnInformado &&
      !filialInformada &&
      !nomeInformado &&
      !cargoInformado &&
      !statusInformado;

    if (linhaVazia) {
      continue;
    }

    const motivos = [];

    const filial =
      filialPorNome(
        filialInformada
      );

    if (!filialInformada) {
      motivos.push(
        "Filial não informada"
      );
    } else if (!filial) {
      motivos.push(
        `Filial não reconhecida: ${filialInformada}`
      );
    }

    if (!nomeInformado) {
      motivos.push(
        "Nome não informado"
      );
    }

    const cargo =
      cargoCanonico(
        cargoInformado,
        modulo.cargos
      );

    if (!cargoInformado) {
      motivos.push(
        "Cargo não informado"
      );
    } else if (!cargo) {
      motivos.push(
        `Cargo não pertence a ${modulo.titulo}: ${cargoInformado}`
      );
    }

    const ativo =
      interpretarAtivo(
        statusInformado
      );

    if (ativo === null) {
      motivos.push(
        `Status inválido: ${statusInformado}`
      );
    }

    if (
      filial &&
      dnInformado &&
      dnInformado !== filial.dn
    ) {
      motivos.push(
        `DN ${dnInformado} não corresponde à filial ${filial.unidade}. O DN correto é ${filial.dn}`
      );
    }

    const item = {
      linha: numeroLinha,
      dn:
        filial?.dn ||
        dnInformado,
      filial:
        filial?.unidade ||
        filialInformada,
      nome:
        capitalizarNome(
          nomeInformado
        ),
      cargo:
        cargo ||
        cargoInformado,
      ativo:
        ativo ?? true,
      campanha:
        modulo.campanha
    };

    if (motivos.length) {
      erros.push({
        ...item,
        motivo:
          motivos.join("; ")
      });
    } else {
      validos.push(item);
    }
  }

  return {
    nomePlanilha:
      planilha.name,
    validos,
    erros
  };
}

async function buscarDuplicados(
  registros
) {
  const modulo =
    moduloAtual();

  const snapshot =
    await getDocs(
      collection(
        firestore,
        modulo.colecao
      )
    );

  const existentes =
    new Set(
      snapshot.docs.map(
        documento => {
          const dados =
            documento.data();

          return chaveFuncionario({
            nome:
              dados.nome ||
              dados.colaborador ||
              dados.funcionario ||
              dados.name ||
              "",
            filial:
              dados.filial ||
              dados.unidade ||
              dados.loja ||
              ""
          });
        }
      )
    );

  const vistosNoArquivo =
    new Set();

  const novos = [];
  const duplicados = [];

  registros.forEach(
    item => {
      const chave =
        chaveFuncionario(item);

      if (
        existentes.has(chave) ||
        vistosNoArquivo.has(chave)
      ) {
        duplicados.push({
          ...item,
          motivo:
            existentes.has(chave)
              ? `Já possui cadastro na filial ${item.filial}`
              : "Nome repetido dentro do próprio arquivo para a mesma filial"
        });
        return;
      }

      vistosNoArquivo.add(chave);
      novos.push(item);
    }
  );

  return {
    novos,
    duplicados
  };
}

function garantirModal() {
  if ($("#modalImportacaoFuncionarios")) {
    return;
  }

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <dialog
        id="modalImportacaoFuncionarios"
        class="import-dialog"
      >
        <form
          id="formImportacaoFuncionarios"
          class="import-modal"
          method="dialog"
        >
          <header class="import-modal-header">
            <div>
              <span class="import-eyebrow">
                Importação em lote
              </span>

              <h2 id="importModalTitulo">
                Importar funcionários
              </h2>

              <p id="importModalDescricao">
                Envie uma planilha Excel com DN, filial, nome, cargo e status.
              </p>
            </div>

            <button
              type="button"
              id="fecharImportacaoFuncionarios"
              class="import-close"
              aria-label="Fechar"
            >
              ×
            </button>
          </header>

          <section
            id="importDropzone"
            class="import-dropzone"
          >
            <input
              type="file"
              id="arquivoImportacaoFuncionarios"
              accept=".xlsx,.xls"
              hidden
            />

            <div class="import-file-icon">
              XLSX
            </div>

            <strong>
              Arraste a planilha para esta área
            </strong>

            <span>
              ou clique para selecionar um arquivo Excel
            </span>

            <button
              type="button"
              id="selecionarArquivoImportacao"
              class="import-secondary-button"
            >
              Selecionar arquivo
            </button>

            <small id="nomeArquivoImportacao">
              Nenhum arquivo selecionado
            </small>
          </section>

          <div class="import-tools">
            <button
              type="button"
              id="baixarModeloImportacao"
              class="import-template-button"
            >
              ↓ Baixar modelo Excel
            </button>

            <span>
              O cadastro individual continuará disponível normalmente.
            </span>
          </div>

          <section
            id="resumoImportacao"
            class="import-summary"
            hidden
          >
            <article class="import-summary-card valid">
              <span>Prontos para importar</span>
              <strong id="quantidadeValidosImportacao">0</strong>
            </article>

            <article class="import-summary-card duplicate">
              <span>Duplicados ignorados</span>
              <strong id="quantidadeDuplicadosImportacao">0</strong>
            </article>

            <article class="import-summary-card invalid">
              <span>Linhas com erro</span>
              <strong id="quantidadeErrosImportacao">0</strong>
            </article>
          </section>

          <section
            id="previewImportacao"
            class="import-preview"
            hidden
          >
            <div class="import-preview-header">
              <div>
                <strong>Prévia da importação</strong>
                <span>Confira antes de salvar no Firebase.</span>
              </div>

              <button
                type="button"
                id="baixarErrosImportacao"
                class="import-error-report"
                hidden
              >
                Baixar relatório de erros
              </button>
            </div>

            <div class="import-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>DN</th>
                    <th>Filial</th>
                    <th>Nome</th>
                    <th>Cargo</th>
                    <th>Status</th>
                    <th>Resultado</th>
                  </tr>
                </thead>

                <tbody id="tabelaPreviewImportacao"></tbody>
              </table>
            </div>
          </section>

          <footer class="import-actions">
            <button
              type="button"
              id="cancelarImportacaoFuncionarios"
              class="import-cancel-button"
            >
              Cancelar
            </button>

            <button
              type="button"
              id="confirmarImportacaoFuncionarios"
              class="import-primary-button"
              disabled
            >
              Importar funcionários
            </button>
          </footer>
        </form>
      </dialog>
    `
  );

  configurarModal();
}

function configurarModal() {
  const dialog =
    $("#modalImportacaoFuncionarios");

  const input =
    $("#arquivoImportacaoFuncionarios");

  const dropzone =
    $("#importDropzone");

  const abrirSeletor =
    () => input?.click();

  $("#selecionarArquivoImportacao")
    ?.addEventListener(
      "click",
      abrirSeletor
    );

  dropzone?.addEventListener(
    "click",
    evento => {
      if (
        !evento.target.closest("button")
      ) {
        abrirSeletor();
      }
    }
  );

  input?.addEventListener(
    "change",
    () => {
      const arquivo =
        input.files?.[0];

      if (arquivo) {
        processarArquivo(arquivo);
      }
    }
  );

  [
    "dragenter",
    "dragover"
  ].forEach(
    eventoNome =>
      dropzone?.addEventListener(
        eventoNome,
        evento => {
          evento.preventDefault();
          dropzone.classList.add("dragging");
        }
      )
  );

  [
    "dragleave",
    "drop"
  ].forEach(
    eventoNome =>
      dropzone?.addEventListener(
        eventoNome,
        evento => {
          evento.preventDefault();
          dropzone.classList.remove("dragging");
        }
      )
  );

  dropzone?.addEventListener(
    "drop",
    evento => {
      const arquivo =
        evento.dataTransfer?.files?.[0];

      if (arquivo) {
        processarArquivo(arquivo);
      }
    }
  );

  const fechar =
    () => dialog?.close();

  $("#fecharImportacaoFuncionarios")
    ?.addEventListener(
      "click",
      fechar
    );

  $("#cancelarImportacaoFuncionarios")
    ?.addEventListener(
      "click",
      fechar
    );

  $("#baixarModeloImportacao")
    ?.addEventListener(
      "click",
      baixarModeloDoModulo
    );

  $("#baixarErrosImportacao")
    ?.addEventListener(
      "click",
      baixarRelatorioErros
    );

  $("#confirmarImportacaoFuncionarios")
    ?.addEventListener(
      "click",
      importarRegistros
    );
}

function resetarModal() {
  estadoImportacao.arquivo = null;
  estadoImportacao.validos = [];
  estadoImportacao.erros = [];
  estadoImportacao.duplicados = [];
  estadoImportacao.importando = false;

  const input =
    $("#arquivoImportacaoFuncionarios");

  if (input) {
    input.value = "";
  }

  $("#nomeArquivoImportacao").textContent =
    "Nenhum arquivo selecionado";

  $("#resumoImportacao").hidden = true;
  $("#previewImportacao").hidden = true;
  $("#baixarErrosImportacao").hidden = true;

  const confirmar =
    $("#confirmarImportacaoFuncionarios");

  confirmar.disabled = true;
  confirmar.textContent =
    "Importar funcionários";

  $("#tabelaPreviewImportacao").innerHTML = "";
}

function abrirImportacao(modulo) {
  garantirModal();
  resetarModal();

  estadoImportacao.modulo = modulo;

  const config =
    MODULOS_IMPORTACAO[modulo];

  $("#importModalTitulo").textContent =
    `Importar — ${config.titulo}`;

  $("#importModalDescricao").textContent =
    `A planilha alimentará diretamente a coleção ${config.colecao}, sem interferir na outra campanha.`;

  $("#modalImportacaoFuncionarios")
    .showModal();
}

async function processarArquivo(arquivo) {
  estadoImportacao.arquivo =
    arquivo;

  $("#nomeArquivoImportacao").textContent =
    arquivo.name;

  const confirmar =
    $("#confirmarImportacaoFuncionarios");

  confirmar.disabled = true;
  confirmar.textContent =
    "Lendo arquivo...";

  try {
    const resultado =
      await lerArquivoExcel(arquivo);

    const analiseDuplicados =
      await buscarDuplicados(
        resultado.validos
      );

    estadoImportacao.validos =
      analiseDuplicados.novos;

    estadoImportacao.erros =
      resultado.erros;

    estadoImportacao.duplicados =
      analiseDuplicados.duplicados;

    renderizarPreview();

    confirmar.disabled =
      estadoImportacao.validos.length === 0;

    confirmar.textContent =
      estadoImportacao.validos.length
        ? `Importar ${estadoImportacao.validos.length} funcionário(s)`
        : "Nenhum registro válido";
  } catch (erro) {
    console.error(
      "Erro ao ler planilha de funcionários:",
      erro
    );

    estadoImportacao.validos = [];
    estadoImportacao.erros = [];
    estadoImportacao.duplicados = [];

    confirmar.disabled = true;
    confirmar.textContent =
      "Importar funcionários";

    await mostrarAlerta({
      tipo: "error",
      titulo: "Não foi possível ler a planilha",
      mensagem:
        erro.message ||
        "Verifique o arquivo e tente novamente."
    });
  }
}

function renderizarPreview() {
  const validos =
    estadoImportacao.validos;

  const duplicados =
    estadoImportacao.duplicados;

  const erros =
    estadoImportacao.erros;

  $("#resumoImportacao").hidden = false;
  $("#previewImportacao").hidden = false;

  $("#quantidadeValidosImportacao").textContent =
    validos.length;

  $("#quantidadeDuplicadosImportacao").textContent =
    duplicados.length;

  $("#quantidadeErrosImportacao").textContent =
    erros.length;

  $("#baixarErrosImportacao").hidden =
    erros.length + duplicados.length === 0;

  const linhas = [
    ...validos.map(
      item => ({
        ...item,
        resultado: "PRONTO",
        classe: "ready"
      })
    ),

    ...duplicados.map(
      item => ({
        ...item,
        resultado:
          item.motivo,
        classe: "duplicate"
      })
    ),

    ...erros.map(
      item => ({
        ...item,
        resultado:
          item.motivo,
        classe: "error"
      })
    )
  ];

  $("#tabelaPreviewImportacao").innerHTML =
    linhas.length
      ? linhas
          .slice(0, 250)
          .map(
            item => `
              <tr class="${item.classe}">
                <td>${item.linha || ""}</td>
                <td>${escaparHtml(item.dn || "")}</td>
                <td>${escaparHtml(item.filial || "")}</td>
                <td><strong>${escaparHtml(item.nome || "")}</strong></td>
                <td>${escaparHtml(item.cargo || "")}</td>
                <td>${item.ativo ? "ATIVO" : "INATIVO"}</td>
                <td>
                  <span class="import-result ${item.classe}">
                    ${escaparHtml(item.resultado)}
                  </span>
                </td>
              </tr>
            `
          )
          .join("")
      : `
          <tr>
            <td colspan="7" class="empty">
              Nenhuma linha encontrada.
            </td>
          </tr>
        `;
}

async function importarRegistros() {
  if (
    estadoImportacao.importando ||
    !estadoImportacao.validos.length
  ) {
    return;
  }

  const config =
    moduloAtual();

  const botao =
    $("#confirmarImportacaoFuncionarios");

  try {
    estadoImportacao.importando = true;
    botao.disabled = true;
    botao.textContent =
      "Verificando cadastros existentes...";

    /*
     * Revalidação imediatamente antes da gravação.
     * Não abrimos mais um segundo modal de confirmação,
     * evitando conflito com o <dialog> da importação.
     */
    const revalidacao =
      await buscarDuplicados(
        estadoImportacao.validos
      );

    estadoImportacao.validos =
      revalidacao.novos;

    estadoImportacao.duplicados =
      mesclarDuplicados(
        estadoImportacao.duplicados,
        revalidacao.duplicados
      );

    renderizarPreview();

    const nomesJaCadastrados =
      nomesDuplicadosTexto(
        estadoImportacao.duplicados
      );

    /*
     * Se todos já estiverem cadastrados, fecha o modal e
     * mostra um aviso temporário por 5 segundos.
     */
    if (!estadoImportacao.validos.length) {
      const dialog =
        $("#modalImportacaoFuncionarios");

      if (dialog?.open) {
        dialog.close();
      }

      await aguardarImportacao(180);

      mostrarAvisoTemporarioImportacao({
        tipo: "warning",
        titulo: "Nenhum funcionário novo",
        mensagem:
          nomesJaCadastrados
            ? `Nenhum registro foi importado. Já possuem cadastro: ${nomesJaCadastrados}.`
            : "Nenhum registro novo foi encontrado para importar.",
        duracao: 5000
      });

      return;
    }

    /*
     * Segunda verificação antes da escrita para proteger
     * contra cadastros feitos por outro usuário no intervalo.
     */
    botao.textContent =
      "Fazendo verificação final...";

    const verificacaoFinal =
      await buscarDuplicados(
        estadoImportacao.validos
      );

    estadoImportacao.validos =
      verificacaoFinal.novos;

    estadoImportacao.duplicados =
      mesclarDuplicados(
        estadoImportacao.duplicados,
        verificacaoFinal.duplicados
      );

    if (!estadoImportacao.validos.length) {
      const dialog =
        $("#modalImportacaoFuncionarios");

      if (dialog?.open) {
        dialog.close();
      }

      await aguardarImportacao(180);

      mostrarAvisoTemporarioImportacao({
        tipo: "warning",
        titulo: "Cadastros já existentes",
        mensagem:
          `Nenhum registro foi criado. Já possuem cadastro: ${
            nomesDuplicadosTexto(
              estadoImportacao.duplicados
            ) ||
            "todos os colaboradores selecionados"
          }.`,
        duracao: 5000
      });

      return;
    }

    let importados = 0;

    for (
      let inicio = 0;
      inicio < estadoImportacao.validos.length;
      inicio += IMPORT_CONFIG.maxPorLoteFirestore
    ) {
      const lote =
        estadoImportacao.validos.slice(
          inicio,
          inicio + IMPORT_CONFIG.maxPorLoteFirestore
        );

      const batch =
        writeBatch(firestore);

      lote.forEach(
        item => {
          const referencia =
            doc(
              collection(
                firestore,
                config.colecao
              )
            );

          batch.set(
            referencia,
            {
              dn: item.dn,
              filial: item.filial,
              nome: item.nome,
              cargo: item.cargo,
              ativo: item.ativo,
              campanha: config.campanha,
              criadoEm:
                serverTimestamp(),
              atualizadoEm:
                serverTimestamp(),
              origem:
                "IMPORTACAO_EXCEL"
            }
          );
        }
      );

      botao.textContent =
        `Importando ${Math.min(
          inicio + lote.length,
          estadoImportacao.validos.length
        )}/${estadoImportacao.validos.length}...`;

      await batch.commit();

      importados += lote.length;
    }

    const dialog =
      $("#modalImportacaoFuncionarios");

    if (dialog?.open) {
      dialog.close();
    }

    await aguardarImportacao(180);

    const duplicados =
      estadoImportacao.duplicados;

    const erros =
      estadoImportacao.erros;

    const partes = [
      `${importados} funcionário(s) novo(s) foram importados para ${config.titulo}.`
    ];

    if (duplicados.length) {
      partes.push(
        `Já cadastrados e ignorados: ${
          nomesDuplicadosTexto(
            duplicados
          )
        }.`
      );
    }

    if (erros.length) {
      partes.push(
        `${erros.length} linha(s) com erro não foram importadas.`
      );
    }

    mostrarAvisoTemporarioImportacao({
      tipo: "success",
      titulo: "Importação concluída",
      mensagem:
        partes.join("\n\n"),
      duracao: 5000
    });

    document.dispatchEvent(
      new CustomEvent(
        "funcionariosImportados",
        {
          detail: {
            modulo:
              estadoImportacao.modulo,
            colecao:
              config.colecao,
            quantidade:
              importados
          }
        }
      )
    );
  } catch (erro) {
    console.error(
      "Erro ao importar funcionários:",
      erro
    );

    const dialog =
      $("#modalImportacaoFuncionarios");

    if (dialog?.open) {
      dialog.close();
    }

    await aguardarImportacao(180);

    mostrarAvisoTemporarioImportacao({
      tipo: "error",
      titulo: "Importação interrompida",
      mensagem:
        erro.message ||
        "Não foi possível concluir a importação.",
      duracao: 5000
    });
  } finally {
    estadoImportacao.importando = false;

    if (botao) {
      botao.disabled =
        estadoImportacao.validos.length === 0;

      botao.textContent =
        estadoImportacao.validos.length
          ? `Importar ${estadoImportacao.validos.length} funcionário(s)`
          : "Nenhum registro novo";
    }
  }
}

async function baixarModeloDoModulo() {
  if (!window.ExcelJS) {
    await mostrarAlerta({
      tipo: "error",
      titulo: "ExcelJS não encontrado",
      mensagem:
        "A biblioteca ExcelJS precisa estar carregada para gerar o modelo."
    });
    return;
  }

  const config =
    moduloAtual();

  const workbook =
    new ExcelJS.Workbook();

  const sheet =
    workbook.addWorksheet(
      estadoImportacao.modulo === "pix"
        ? "Pix do Presidente"
        : "Produtivos",
      {
        views: [
          {
            state: "frozen",
            ySplit: 5,
            showGridLines: false
          }
        ]
      }
    );

  sheet.columns = [
    {
      key: "dn",
      width: 12
    },
    {
      key: "filial",
      width: 22
    },
    {
      key: "nome",
      width: 38
    },
    {
      key: "cargo",
      width: 38
    },
    {
      key: "status",
      width: 16
    }
  ];

  sheet.mergeCells("A1:E2");

  const titulo =
    sheet.getCell("A1");

  titulo.value =
    `IMPORTAÇÃO DE FUNCIONÁRIOS — ${config.titulo.toUpperCase()}`;

  titulo.font = {
    bold: true,
    size: 18,
    color: {
      argb: "FFFFFFFF"
    }
  };

  titulo.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "FF0B3154"
    }
  };

  titulo.alignment = {
    vertical: "middle",
    horizontal: "left"
  };

  sheet.mergeCells("A3:E3");

  sheet.getCell("A3").value =
    "Preencha uma linha por funcionário. Não altere o nome das colunas.";

  sheet.getCell("A3").font = {
    italic: true,
    color: {
      argb: "FF526572"
    }
  };

  const cabecalho =
    sheet.getRow(5);

  cabecalho.values = [
    "DN",
    "FILIAL",
    "NOME",
    "CARGO",
    "STATUS"
  ];

  cabecalho.eachCell(
    celula => {
      celula.font = {
        bold: true,
        color: {
          argb: "FFFFFFFF"
        }
      };

      celula.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FF0B7A53"
        }
      };

      celula.alignment = {
        vertical: "middle",
        horizontal: "center"
      };
    }
  );

  const filialExemplo =
    FILIAIS_IMPORTACAO[0];

  sheet.addRow([
    filialExemplo.dn,
    filialExemplo.unidade,
    "NOME COMPLETO DO FUNCIONÁRIO",
    config.cargos[0],
    "ATIVO"
  ]);

  for (
    let linha = 7;
    linha <= 1000;
    linha += 1
  ) {
    sheet.getCell(`B${linha}`)
      .dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [
          `"${FILIAIS_IMPORTACAO
            .map(item => item.unidade)
            .join(",")}"`
        ]
      };

    sheet.getCell(`D${linha}`)
      .dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [
          `"${config.cargos.join(",")}"`
        ]
      };

    sheet.getCell(`E${linha}`)
      .dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [
          '"ATIVO,INATIVO"'
        ]
      };
  }

  sheet.autoFilter = {
    from: "A5",
    to: "E5"
  };

  const buffer =
    await workbook.xlsx.writeBuffer();

  salvarBlob(
    new Blob(
      [buffer],
      {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }
    ),
    estadoImportacao.modulo === "pix"
      ? "modelo-importacao-pix-do-presidente.xlsx"
      : "modelo-importacao-produtivos.xlsx"
  );
}

async function baixarRelatorioErros() {
  if (!window.ExcelJS) {
    return;
  }

  const registros = [
    ...estadoImportacao.erros,
    ...estadoImportacao.duplicados
  ];

  if (!registros.length) {
    return;
  }

  const workbook =
    new ExcelJS.Workbook();

  const sheet =
    workbook.addWorksheet(
      "Linhas não importadas"
    );

  sheet.columns = [
    {
      header: "LINHA",
      key: "linha",
      width: 10
    },
    {
      header: "DN",
      key: "dn",
      width: 12
    },
    {
      header: "FILIAL",
      key: "filial",
      width: 22
    },
    {
      header: "NOME",
      key: "nome",
      width: 38
    },
    {
      header: "CARGO",
      key: "cargo",
      width: 38
    },
    {
      header: "STATUS",
      key: "status",
      width: 15
    },
    {
      header: "MOTIVO",
      key: "motivo",
      width: 62
    }
  ];

  registros.forEach(
    item =>
      sheet.addRow({
        linha: item.linha,
        dn: item.dn,
        filial: item.filial,
        nome: item.nome,
        cargo: item.cargo,
        status:
          item.ativo
            ? "ATIVO"
            : "INATIVO",
        motivo: item.motivo
      })
  );

  const header =
    sheet.getRow(1);

  header.eachCell(
    celula => {
      celula.font = {
        bold: true,
        color: {
          argb: "FFFFFFFF"
        }
      };

      celula.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FFB42318"
        }
      };
    }
  );

  sheet.autoFilter = {
    from: "A1",
    to: "G1"
  };

  const buffer =
    await workbook.xlsx.writeBuffer();

  salvarBlob(
    new Blob(
      [buffer],
      {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }
    ),
    "relatorio-linhas-nao-importadas.xlsx"
  );
}

function salvarBlob(blob, nome) {
  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = nome;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(
    () =>
      URL.revokeObjectURL(url),
    1000
  );
}

function criarBotaoImportacao(
  modulo,
  botaoNovo
) {
  if (
    document.querySelector(
      `[data-importar-funcionarios="${modulo}"]`
    )
  ) {
    return;
  }

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "employee-import-actions";

  const botaoImportar =
    document.createElement("button");

  botaoImportar.type = "button";
  botaoImportar.className =
    "employee-import-button";

  botaoImportar.dataset.importarFuncionarios =
    modulo;

  botaoImportar.innerHTML = `
    <span class="employee-import-icon">
      XLS
    </span>

    <span>
      Importar Excel
    </span>
  `;

  botaoNovo.parentNode.insertBefore(
    wrapper,
    botaoNovo
  );

  wrapper.appendChild(
    botaoImportar
  );

  wrapper.appendChild(
    botaoNovo
  );

  botaoImportar.addEventListener(
    "click",
    () =>
      abrirImportacao(modulo)
  );
}

function instalarBotoes() {
  Object.entries(
    MODULOS_IMPORTACAO
  ).forEach(
    ([modulo, config]) => {
      const botaoNovo =
        $(config.botaoNovo);

      if (botaoNovo) {
        criarBotaoImportacao(
          modulo,
          botaoNovo
        );
      }
    }
  );
}


function instalarEstiloAvisoTemporarioImportacao() {
  if ($("#estiloAvisoTemporarioImportacao")) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "estiloAvisoTemporarioImportacao";

  style.textContent = `
    .import-result-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000002;
      padding: 20px;
      background: rgba(4, 18, 31, .48);
      backdrop-filter: blur(7px);
      -webkit-backdrop-filter: blur(7px);
      display: grid;
      place-items: center;
      opacity: 0;
      visibility: hidden;
      transition:
        opacity .22s ease,
        visibility .22s ease;
    }

    .import-result-overlay.show {
      opacity: 1;
      visibility: visible;
    }

    .import-result-card {
      position: relative;
      width: min(430px, 100%);
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, .78);
      border-radius: 22px;
      padding: 28px;
      background:
        linear-gradient(
          145deg,
          rgba(255,255,255,.995),
          rgba(247,251,253,.985)
        );
      box-shadow:
        0 30px 90px rgba(3,18,31,.34);
      transform:
        translateY(18px)
        scale(.97);
      opacity: 0;
      transition:
        transform .25s cubic-bezier(.2,.85,.3,1.14),
        opacity .2s ease;
    }

    .import-result-card.show {
      transform:
        translateY(0)
        scale(1);
      opacity: 1;
    }

    .import-result-card::before {
      content: "";
      position: absolute;
      inset: 0 0 auto;
      height: 5px;
      background:
        linear-gradient(
          90deg,
          #0b7a53,
          #22b67a
        );
    }

    .import-result-card.type-warning::before {
      background:
        linear-gradient(
          90deg,
          #c57d00,
          #ffc83d
        );
    }

    .import-result-card.type-error::before {
      background:
        linear-gradient(
          90deg,
          #b42318,
          #e6584f
        );
    }

    .import-result-close {
      position: absolute;
      top: 15px;
      right: 15px;
      width: 34px;
      height: 34px;
      border: 0;
      border-radius: 50%;
      background: #edf2f5;
      color: #5f707c;
      display: grid;
      place-items: center;
      font-size: 22px;
      cursor: pointer;
    }

    .import-result-icon {
      width: 58px;
      height: 58px;
      border-radius: 18px;
      margin-bottom: 18px;
      background: #e3f6ed;
      color: #087344;
      display: grid;
      place-items: center;
      font-size: 27px;
      font-weight: 950;
      box-shadow:
        0 10px 25px rgba(8,115,68,.14);
    }

    .type-warning .import-result-icon {
      background: #fff3cf;
      color: #946000;
    }

    .type-error .import-result-icon {
      background: #ffe4e1;
      color: #b42318;
    }

    .import-result-label {
      color: #087344;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .12em;
      text-transform: uppercase;
    }

    .type-warning .import-result-label {
      color: #946000;
    }

    .type-error .import-result-label {
      color: #b42318;
    }

    .import-result-card h2 {
      margin: 6px 0 10px;
      color: #102030;
      font-size: 23px;
    }

    .import-result-card p {
      margin: 0;
      color: #526572;
      font-size: 13px;
      line-height: 1.65;
      white-space: pre-line;
    }

    .import-result-timer {
      height: 4px;
      margin-top: 22px;
      overflow: hidden;
      border-radius: 999px;
      background: #e8eef2;
    }

    .import-result-timer span {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: inherit;
      background: #0b7a53;
      transform-origin: left;
    }

    .type-warning .import-result-timer span {
      background: #d18b00;
    }

    .type-error .import-result-timer span {
      background: #b42318;
    }

    @keyframes importResultTimer {
      from {
        transform: scaleX(1);
      }

      to {
        transform: scaleX(0);
      }
    }
  `;

  document.head.appendChild(style);
}

function iniciarImportacaoFuncionarios() {
  instalarEstiloAvisoTemporarioImportacao();
  garantirModal();
  garantirAvisoTemporarioImportacao();

  $("#fecharAvisoTemporarioImportacao")
    ?.addEventListener(
      "click",
      fecharAvisoTemporarioImportacao
    );

  $("#avisoTemporarioImportacao")
    ?.addEventListener(
      "click",
      evento => {
        if (
          evento.target.id ===
          "avisoTemporarioImportacao"
        ) {
          fecharAvisoTemporarioImportacao();
        }
      }
    );

  instalarBotoes();

  /*
   * O menu recria/exibe áreas em momentos diferentes.
   * O observer garante que os botões sejam instalados
   * mesmo depois da navegação entre módulos.
   */
  new MutationObserver(
    instalarBotoes
  ).observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  console.info(
    "[IMPORTAÇÃO] Módulo de funcionários em lote carregado."
  );
}

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    iniciarImportacaoFuncionarios,
    {
      once: true
    }
  );
} else {
  iniciarImportacaoFuncionarios();
}