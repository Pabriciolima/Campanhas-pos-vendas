/*
===============================================================================
IMPORTAÇÃO INTELIGENTE DO RELATÓRIO — PIX + PRODUTIVOS
Arquivo: importacao-relatorio-sistema.js
Versão: 2026.07.22-09
===============================================================================

CORREÇÕES DESTA VERSÃO

0. Corrige valores monetários resumidos em arquivos XLS antigos:
   - 283.73619 passa a 283.736,19;
   - 301.71924 passa a 301.719,24;
   - 4.43705 passa a 4.437,05;
   - 64 passa a 64.000,00.
   A correção x1.000 é detectada automaticamente e não é aplicada
   quando o arquivo já contém os valores completos.


0. Regra corrigida para o relatório real:
   - Vlr. Acumulado = meta individual;
   - Vlr. Total = realizado individual;
   - atingimento = Vlr. Total ÷ Vlr. Acumulado;
   - Vlr. Acumulado zerado = não habilitado por ausência de meta.


0. Corrige definitivamente o modal preso em "Finalizando...".

1. Corrige o travamento em "Importando...":
   - usa writeBatch no Firebase em vez de vários await sequenciais;
   - processa em lotes de até 400 operações;
   - mostra a etapa atual no botão;
   - usa timeout de segurança;
   - sempre libera o modal no finally, mesmo quando ocorre erro.

2. Reconciliação inteligente dos colaboradores:
   - reconhece nomes abreviados na base;
   - encontra o nome completo vindo do relatório;
   - considera filial e cargo quando disponíveis;
   - infere filial e cargo pela base quando o arquivo geral não os possui;
   - atualiza automaticamente o nome na base de funcionários;
   - não atualiza quando houver ambiguidade.

3. Permite importar um relatório geral:
   - se houver coluna Filial/Unidade, usa a coluna;
   - se não houver, tenta identificar a filial pela base;
   - o campo "Filial do arquivo" continua disponível como fallback;
   - gera Consultores, Supervisores de Assistência e Orçamentistas por filial.

4. Mantém tudo que já funciona:
   - lançamento manual continua disponível;
   - política e apuração continuam no pix-presidente.js;
   - grava na mesma coleção pix_presidente_lancamentos;
   - Produtivos continuam usando a mesma base atual.

===============================================================================
INDEX.HTML
===============================================================================

<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>

<script
  type="module"
  src="./importacao-relatorio-sistema.js?v=20260722-09"
></script>

Carregue este arquivo depois de:
- script.js
- pix-presidente.js

Remova apenas versões antigas da importação de lançamentos.
===============================================================================
*/

import { firestore } from "./firebase-config.js";

import {
  collection,
  getDocs,
  doc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const VERSAO = "2026.07.22-09";
const TAMANHO_LOTE = 400;
const TIMEOUT_OPERACAO = 90000;
const DB_PRODUTIVOS = "campanha_oficina_mvp_v1";

const $ = seletor => document.querySelector(seletor);

function texto(valor) {
  return String(valor ?? "").trim();
}

function normalizar(valor) {
  return texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function numero(valor) {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  let resultado = texto(valor)
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/%/g, "");

  if (!resultado) return 0;

  if (resultado.includes(",")) {
    resultado = resultado
      .replace(/\./g, "")
      .replace(",", ".");
  }

  const convertido = Number(
    resultado.replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(convertido)
    ? convertido
    : 0;
}


function mediana(valores) {
  const lista = valores
    .filter(valor => Number.isFinite(valor) && valor > 0)
    .sort((a, b) => a - b);

  if (!lista.length) return 0;

  const meio = Math.floor(lista.length / 2);

  return lista.length % 2
    ? lista[meio]
    : (lista[meio - 1] + lista[meio]) / 2;
}

/*
Alguns arquivos XLS antigos exportados pelo sistema são interpretados
pelo SheetJS com a escala reduzida em 1.000 vezes.

Exemplos do problema:
301.719,24 vira 301.71924
4.437,05 vira 4.43705
64.000,00 vira 64

Esta função detecta esse padrão usando Ticket Médio e Objetivo M.O.
e aplica fator 1.000 somente quando necessário.
*/
function detectarFatorEscalaPix(registros) {
  const tickets = registros
    .map(item => item.ticketMedio)
    .filter(valor => valor > 0);

  const metasMo = registros
    .map(item => item.objetivoMo)
    .filter(valor => valor > 0);

  const totais = registros
    .map(item => item.valorTotal)
    .filter(valor => valor > 0);

  const ticketMediano = mediana(tickets);
  const metaMediana = mediana(metasMo);
  const totalMediano = mediana(totais);

  const ticketComprimido =
    ticketMediano > 0 &&
    ticketMediano < 100;

  const metaComprimida =
    metaMediana > 0 &&
    metaMediana < 1000;

  const totalComprimido =
    totalMediano > 0 &&
    totalMediano < 1000;

  return (
    ticketComprimido &&
    (metaComprimida || totalComprimido)
  )
    ? 1000
    : 1;
}

function aplicarEscalaMonetariaPix(registros, fator) {
  if (fator === 1) return registros;

  const camposMonetarios = [
    "valorAcumulado",
    "valorTotal",
    "ticketMedio",
    "objetivoMo",
    "valorMo",
    "objetivoPecas",
    "valorPecas",
    "ticketMedioPecas"
  ];

  return registros.map(item => {
    const corrigido = {
      ...item
    };

    camposMonetarios.forEach(campo => {
      corrigido[campo] =
        numero(corrigido[campo]) * fator;
    });

    corrigido.escalaMonetariaCorrigida = true;
    corrigido.fatorEscalaMonetaria = fator;

    return corrigido;
  });
}

function booleano(valor) {
  return [
    "SIM",
    "S",
    "TRUE",
    "1",
    "X",
    "PENDENTE"
  ].includes(normalizar(valor));
}

function competenciaNormalizada(valor) {
  const resultado = texto(valor);

  if (/^\d{4}-\d{2}$/.test(resultado)) {
    return resultado;
  }

  const brasileiro = resultado.match(
    /^(\d{2})\/(\d{4})$/
  );

  if (brasileiro) {
    return `${brasileiro[2]}-${brasileiro[1]}`;
  }

  const data = new Date(resultado);

  if (!Number.isNaN(data.getTime())) {
    return [
      data.getFullYear(),
      String(data.getMonth() + 1).padStart(2, "0")
    ].join("-");
  }

  return "";
}

function alerta(mensagem) {
  if (window.CampanhaUI?.alert) {
    return window.CampanhaUI.alert(mensagem);
  }

  window.alert(mensagem);
  return Promise.resolve();
}

function toast(mensagem) {
  if (window.CampanhaUI?.toast) {
    window.CampanhaUI.toast(mensagem);
    return;
  }

  const elemento = $("#toast");

  if (!elemento) return;

  elemento.textContent = mensagem;
  elemento.classList.add("show");

  window.setTimeout(() => {
    elemento.classList.remove("show");
  }, 3500);
}

function comTimeout(promessa, milissegundos, mensagem) {
  return Promise.race([
    promessa,
    new Promise((_, rejeitar) => {
      window.setTimeout(() => {
        rejeitar(
          new Error(
            mensagem ||
            "A operação demorou mais do que o esperado."
          )
        );
      }, milissegundos);
    })
  ]);
}

function dividirEmLotes(lista, tamanho) {
  const lotes = [];

  for (
    let indice = 0;
    indice < lista.length;
    indice += tamanho
  ) {
    lotes.push(
      lista.slice(
        indice,
        indice + tamanho
      )
    );
  }

  return lotes;
}

function gerarIdDocumento(valor) {
  const base = normalizar(valor)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 900);

  return base || `registro-${Date.now()}`;
}

const CONFIG = {
  pix: {
    nome: "Pix do Presidente",
    header: "#pix-lancamentos .panel-header",
    funcionarios: "pix_presidente_funcionarios",
    lancamentos: "pix_presidente_lancamentos"
  },

  produtivos: {
    nome: "Campanha dos Produtivos",
    header: "#lancamentos .panel-header",
    funcionarios: "funcionarios"
  }
};

const CARGOS = {
  consultor: [
    "CONSULTOR TECNICO",
    "CONSULTOR TÉCNICO"
  ].map(normalizar),

  supervisor: [
    "SUPERVISOR DE ASSISTENCIA",
    "SUPERVISOR DE ASSISTÊNCIA"
  ].map(normalizar),

  orcamentista: [
    "ORCAMENTISTA / FACILITADOR DE NEGOCIOS",
    "ORÇAMENTISTA / FACILITADOR DE NEGÓCIOS",
    "ORCAMENTISTA",
    "ORÇAMENTISTA"
  ].map(normalizar)
};

const state = {
  tipo: "pix",
  arquivo: null,
  workbook: null,
  aba: "",
  competencia: new Date().toISOString().slice(0, 7),
  semana: 1,
  filial: "",
  estrategia: "novos",
  headers: [],
  rows: [],
  brutos: [],
  gerados: [],
  erros: [],
  avisos: [],
  reconciliacoes: [],
  funcionariosCache: [],
  lancamentosCache: [],
  processando: false,
  analisando: false,
  progresso: "",
  fatorEscalaMonetaria: 1,
  escalaDetectadaAutomaticamente: false
};

/* ==========================================================================
   LEITURA E MAPEAMENTO DO EXCEL
========================================================================== */

function localizarColuna(aliases) {
  const headers = state.headers.map(normalizar);

  for (const alias of aliases) {
    const alvo = normalizar(alias);

    let indice = headers.findIndex(
      cabecalho => cabecalho === alvo
    );

    if (indice >= 0) return indice;

    indice = headers.findIndex(
      cabecalho =>
        cabecalho.includes(alvo) ||
        alvo.includes(cabecalho)
    );

    if (indice >= 0) return indice;
  }

  return -1;
}

function valorLinha(linha, indice) {
  return indice >= 0
    ? linha[indice] ?? ""
    : "";
}

function mapaPix() {
  return {
    vendedor: localizarColuna([
      "Vendedor",
      "Colaborador",
      "Funcionário",
      "Funcionario",
      "Nome"
    ]),

    cargo: localizarColuna([
      "Cargo",
      "Função",
      "Funcao"
    ]),

    filial: localizarColuna([
      "Filial",
      "Unidade",
      "Loja",
      "Casa"
    ]),

    dn: localizarColuna([
      "DN",
      "Código DN",
      "Codigo DN"
    ]),

    valorAcumulado: localizarColuna([
      "Vlr. Acumulado",
      "Valor Acumulado",
      "Meta Individual",
      "Meta Acumulada"
    ]),

    total: localizarColuna([
      "Vlr. Total",
      "Valor Total",
      "Realizado Total"
    ]),

    ticket: localizarColuna([
      "Ticket Médio",
      "Ticket Medio"
    ]),

    objetivoMo: localizarColuna([
      "Objetivo M.O.",
      "Objetivo MO",
      "Meta M.O.",
      "Meta MO"
    ]),

    valorMo: localizarColuna([
      "Vlr. M.O.",
      "Valor M.O.",
      "Vlr. MO",
      "Valor MO"
    ]),

    objetivoPecas: localizarColuna([
      "Objetivo Peças",
      "Objetivo Pecas",
      "Meta Peças",
      "Meta Pecas"
    ]),

    valorPecas: localizarColuna([
      "Vlr. Peças",
      "Valor Peças",
      "Vlr. Pecas",
      "Valor Pecas"
    ]),

    qtdTotal: localizarColuna([
      "Qtd. Total",
      "Quantidade Total"
    ]),

    qtdPassagens: localizarColuna([
      "Qtd. Passagens",
      "Quantidade Passagens"
    ]),

    ticketPecas: localizarColuna([
      "Ticket Médio Peças",
      "Ticket Medio Pecas"
    ])
  };
}

function mapaProdutivos() {
  return {
    competencia: localizarColuna([
      "Competencia",
      "Competência",
      "Mes",
      "Mês"
    ]),

    dn: localizarColuna([
      "DN",
      "Código DN",
      "Codigo DN"
    ]),

    filial: localizarColuna([
      "Filial",
      "Unidade",
      "Loja"
    ]),

    colaborador: localizarColuna([
      "Colaborador",
      "Funcionário",
      "Funcionario",
      "Mecânico",
      "Mecanico",
      "Nome",
      "Vendedor"
    ]),

    cargo: localizarColuna([
      "Cargo",
      "Função",
      "Funcao"
    ]),

    faturamento: localizarColuna([
      "Faturamento",
      "Faturamento Individual",
      "Vlr. Total",
      "Valor Total"
    ]),

    horasDisponiveis: localizarColuna([
      "Horas Disponíveis",
      "Horas Disponiveis"
    ]),

    horasTrabalhadas: localizarColuna([
      "Horas Trabalhadas"
    ]),

    horasVendidas: localizarColuna([
      "Horas Vendidas",
      "Horas Cobradas"
    ]),

    treinamentoPendente: localizarColuna([
      "Treinamento Pendente"
    ]),

    retrabalho: localizarColuna([
      "Retrabalho",
      "Imperícia",
      "Impericia",
      "OS Interna"
    ])
  };
}

function processarPix() {
  const mapa = mapaPix();
  const erros = [];

  [
    [mapa.vendedor, "Vendedor"],
    [mapa.valorAcumulado, "Vlr. Acumulado"],
    [mapa.total, "Vlr. Total"],
    [mapa.ticket, "Ticket Médio"],
    [mapa.objetivoMo, "Objetivo M.O."],
    [mapa.valorMo, "Vlr. M.O."],
    [mapa.objetivoPecas, "Objetivo Peças"],
    [mapa.valorPecas, "Vlr. Peças"]
  ].forEach(([indice, nome]) => {
    if (indice < 0) {
      erros.push(
        `A coluna "${nome}" não foi encontrada.`
      );
    }
  });

  const brutos = [];

  if (erros.length) {
    return {
      brutos,
      erros
    };
  }

  state.rows.forEach((linha, indice) => {
    const vendedor = texto(
      valorLinha(linha, mapa.vendedor)
    );

    const vendedorNormalizado =
      normalizar(vendedor);

    if (
      !vendedor ||
      vendedorNormalizado === "TOTAL" ||
      /^\d+$/.test(vendedorNormalizado)
    ) {
      return;
    }

    const item = {
      linha: indice + 2,
      vendedor,
      cargoArquivo: texto(
        valorLinha(linha, mapa.cargo)
      ),
      filialArquivo: texto(
        valorLinha(linha, mapa.filial)
      ),
      filial:
        texto(valorLinha(linha, mapa.filial)) ||
        state.filial,
      dn: texto(
        valorLinha(linha, mapa.dn)
      ),
      valorAcumulado: numero(
        valorLinha(linha, mapa.valorAcumulado)
      ),
      valorTotal: numero(
        valorLinha(linha, mapa.total)
      ),
      ticketMedio: numero(
        valorLinha(linha, mapa.ticket)
      ),
      objetivoMo: numero(
        valorLinha(linha, mapa.objetivoMo)
      ),
      valorMo: numero(
        valorLinha(linha, mapa.valorMo)
      ),
      objetivoPecas: numero(
        valorLinha(linha, mapa.objetivoPecas)
      ),
      valorPecas: numero(
        valorLinha(linha, mapa.valorPecas)
      ),
      qtdTotal: numero(
        valorLinha(linha, mapa.qtdTotal)
      ),
      qtdPassagens: numero(
        valorLinha(linha, mapa.qtdPassagens)
      ),
      ticketMedioPecas: numero(
        valorLinha(linha, mapa.ticketPecas)
      )
    };

    if (item.valorAcumulado <= 0) {
      /*
      REGRA DE HABILITAÇÃO:
      funcionário sem meta individual não pode ser habilitado.
      A linha continua sendo importada para manter o histórico,
      mas metaSemanal será zero e o cálculo resultará em não habilitado.
      */
      item.semMetaIndividual = true;
      item.motivoNaoHabilitado =
        "SEM META INDIVIDUAL (VLR. ACUMULADO ZERADO)";
    }

    brutos.push(item);
  });

  const fatorEscala =
    detectarFatorEscalaPix(brutos);

  state.fatorEscalaMonetaria =
    fatorEscala;

  state.escalaDetectadaAutomaticamente =
    fatorEscala !== 1;

  const registrosCorrigidos =
    aplicarEscalaMonetariaPix(
      brutos,
      fatorEscala
    );

  if (fatorEscala !== 1) {
    registrosCorrigidos.forEach(item => {
      item.avisoEscala =
        "VALORES MONETÁRIOS CORRIGIDOS AUTOMATICAMENTE (x1000)";
    });
  }

  return {
    brutos: registrosCorrigidos,
    erros
  };
}

function processarProdutivos() {
  const mapa = mapaProdutivos();
  const brutos = [];
  const erros = [];

  state.rows.forEach((linha, indice) => {
    if (!linha.some(valor => texto(valor))) {
      return;
    }

    const item = {
      linha: indice + 2,
      competencia:
        competenciaNormalizada(
          valorLinha(
            linha,
            mapa.competencia
          )
        ) ||
        state.competencia,
      dn: texto(
        valorLinha(
          linha,
          mapa.dn
        )
      ),
      filialArquivo: texto(
        valorLinha(
          linha,
          mapa.filial
        )
      ),
      filial:
        texto(
          valorLinha(
            linha,
            mapa.filial
          )
        ) ||
        state.filial,
      colaborador: texto(
        valorLinha(
          linha,
          mapa.colaborador
        )
      ),
      cargoArquivo: texto(
        valorLinha(
          linha,
          mapa.cargo
        )
      ),
      faturamento: numero(
        valorLinha(
          linha,
          mapa.faturamento
        )
      ),
      horasDisponiveis: numero(
        valorLinha(
          linha,
          mapa.horasDisponiveis
        )
      ),
      horasTrabalhadas: numero(
        valorLinha(
          linha,
          mapa.horasTrabalhadas
        )
      ),
      horasVendidas: numero(
        valorLinha(
          linha,
          mapa.horasVendidas
        )
      ),
      treinamentoPendente: booleano(
        valorLinha(
          linha,
          mapa.treinamentoPendente
        )
      ),
      retrabalho: booleano(
        valorLinha(
          linha,
          mapa.retrabalho
        )
      )
    };

    if (!item.colaborador) {
      erros.push(
        `Linha ${item.linha}: colaborador não informado.`
      );
    }

    if (
      mapa.horasDisponiveis >= 0 &&
      item.horasDisponiveis <= 0
    ) {
      erros.push(
        `Linha ${item.linha}: Horas Disponíveis deve ser maior que zero.`
      );
    }

    brutos.push(item);
  });

  return {
    brutos,
    erros
  };
}

function processar() {
  const resultado =
    state.tipo === "pix"
      ? processarPix()
      : processarProdutivos();

  state.brutos = resultado.brutos;
  state.gerados = [];
  state.erros = resultado.erros;
  state.avisos = [];

  if (
    state.tipo === "pix" &&
    state.escalaDetectadaAutomaticamente
  ) {
    state.avisos.push(
      "O arquivo XLS estava com os valores monetários reduzidos. O sistema corrigiu automaticamente todos os valores em 1.000 vezes."
    );
  }

  state.reconciliacoes = [];

  renderizar();

  if (
    state.brutos.length &&
    !state.erros.length
  ) {
    analisarColaboradores();
  }
}

async function lerArquivo(arquivo) {
  if (!window.XLSX) {
    throw new Error(
      "A biblioteca XLSX não foi carregada."
    );
  }

  if (!arquivo) return;

  const extensao = arquivo.name
    .split(".")
    .pop()
    .toLowerCase();

  if (
    !["xlsx", "xls", "csv"]
      .includes(extensao)
  ) {
    throw new Error(
      "Utilize XLSX, XLS ou CSV."
    );
  }

  state.arquivo = arquivo;

  const buffer =
    await arquivo.arrayBuffer();

  state.workbook =
    XLSX.read(buffer, {
      type: "array",
      cellDates: true
    });

  state.aba =
    state.workbook.SheetNames[0];

  $("#irsAba").innerHTML =
    state.workbook.SheetNames
      .map(nome => `
        <option value="${escapar(nome)}">
          ${escapar(nome)}
        </option>
      `)
      .join("");

  carregarAba(state.aba);
}

function carregarAba(nome) {
  const planilha =
    state.workbook?.Sheets[nome];

  if (!planilha) return;

  state.aba = nome;

  const matriz =
    XLSX.utils.sheet_to_json(
      planilha,
      {
        header: 1,
        defval: "",
        raw: true
      }
    );

  let indiceCabecalho =
    matriz.findIndex(linha =>
      linha.some(celula =>
        [
          "VENDEDOR",
          "COLABORADOR",
          "FUNCIONARIO",
          "FUNCIONÁRIO"
        ].includes(normalizar(celula))
      )
    );

  if (indiceCabecalho < 0) {
    indiceCabecalho = 0;
  }

  state.headers =
    (matriz[indiceCabecalho] || [])
      .map(texto);

  state.rows =
    matriz.slice(
      indiceCabecalho + 1
    );

  processar();
}

/* ==========================================================================
   RECONCILIAÇÃO INTELIGENTE DE NOMES
========================================================================== */

function tokensNome(nome) {
  return normalizar(nome)
    .split(" ")
    .filter(token =>
      token.length > 1 &&
      ![
        "DA",
        "DE",
        "DO",
        "DAS",
        "DOS",
        "E"
      ].includes(token)
    );
}

function distanciaLevenshtein(a, b) {
  const esquerda = normalizar(a);
  const direita = normalizar(b);

  const linhas = esquerda.length + 1;
  const colunas = direita.length + 1;

  const matriz = Array.from(
    {
      length: linhas
    },
    () => Array(colunas).fill(0)
  );

  for (let i = 0; i < linhas; i += 1) {
    matriz[i][0] = i;
  }

  for (let j = 0; j < colunas; j += 1) {
    matriz[0][j] = j;
  }

  for (let i = 1; i < linhas; i += 1) {
    for (let j = 1; j < colunas; j += 1) {
      const custo =
        esquerda[i - 1] === direita[j - 1]
          ? 0
          : 1;

      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + custo
      );
    }
  }

  return matriz[linhas - 1][colunas - 1];
}

function similaridadeTexto(a, b) {
  const esquerda = normalizar(a);
  const direita = normalizar(b);

  if (!esquerda || !direita) return 0;
  if (esquerda === direita) return 1;

  const distancia =
    distanciaLevenshtein(
      esquerda,
      direita
    );

  return 1 - (
    distancia /
    Math.max(
      esquerda.length,
      direita.length
    )
  );
}

function pontuarNome(
  nomeBase,
  nomeImportado
) {
  const base = normalizar(nomeBase);
  const importado =
    normalizar(nomeImportado);

  if (!base || !importado) return 0;
  if (base === importado) return 1;

  const tokensBase =
    tokensNome(base);

  const tokensImportado =
    tokensNome(importado);

  const intersecao =
    tokensBase.filter(token =>
      tokensImportado.includes(token)
    );

  const coberturaBase =
    tokensBase.length
      ? intersecao.length /
        tokensBase.length
      : 0;

  const coberturaImportado =
    tokensImportado.length
      ? intersecao.length /
        tokensImportado.length
      : 0;

  const primeiroIgual =
    tokensBase[0] &&
    tokensBase[0] ===
      tokensImportado[0];

  const ultimoIgual =
    tokensBase.at(-1) &&
    tokensBase.at(-1) ===
      tokensImportado.at(-1);

  const baseContida =
    tokensBase.length >= 1 &&
    tokensBase.every(token =>
      tokensImportado.includes(token)
    );

  const importadoContido =
    tokensImportado.length >= 1 &&
    tokensImportado.every(token =>
      tokensBase.includes(token)
    );

  let pontuacao =
    similaridadeTexto(
      base,
      importado
    ) * 0.35 +
    coberturaBase * 0.35 +
    coberturaImportado * 0.15;

  if (primeiroIgual) {
    pontuacao += 0.08;
  }

  if (ultimoIgual) {
    pontuacao += 0.07;
  }

  if (
    baseContida ||
    importadoContido
  ) {
    pontuacao = Math.max(
      pontuacao,
      0.9
    );
  }

  return Math.min(
    1,
    pontuacao
  );
}

function pontuarFuncionario(
  funcionario,
  item
) {
  const nomeImportado =
    item.vendedor ||
    item.colaborador;

  let pontuacao =
    pontuarNome(
      funcionario.nome,
      nomeImportado
    );

  const filialItem =
    item.filial ||
    item.filialArquivo ||
    state.filial;

  if (filialItem) {
    if (
      normalizar(funcionario.filial) ===
      normalizar(filialItem)
    ) {
      pontuacao += 0.2;
    } else {
      pontuacao -= 0.35;
    }
  }

  const cargoArquivo =
    item.cargoArquivo;

  if (cargoArquivo) {
    if (
      normalizar(funcionario.cargo) ===
      normalizar(cargoArquivo)
    ) {
      pontuacao += 0.12;
    } else {
      pontuacao -= 0.08;
    }
  }

  return pontuacao;
}

function encontrarMelhorFuncionario(
  funcionarios,
  item,
  opcoes = {}
) {
  const somenteAtivos =
    funcionarios.filter(funcionario =>
      funcionario.ativo !== false &&
      funcionario.ativo !== "false"
    );

  let candidatos = somenteAtivos;

  if (opcoes.cargos?.length) {
    candidatos =
      candidatos.filter(funcionario =>
        opcoes.cargos.includes(
          normalizar(
            funcionario.cargo
          )
        )
      );
  }

  const ranking =
    candidatos
      .map(funcionario => ({
        funcionario,
        pontuacao:
          pontuarFuncionario(
            funcionario,
            item
          )
      }))
      .sort(
        (a, b) =>
          b.pontuacao -
          a.pontuacao
      );

  const primeiro =
    ranking[0];

  const segundo =
    ranking[1];

  if (!primeiro) {
    return {
      status: "nao_encontrado",
      funcionario: null,
      pontuacao: 0
    };
  }

  const diferenca =
    primeiro.pontuacao -
    (segundo?.pontuacao || 0);

  const nomeBase =
    normalizar(
      primeiro.funcionario.nome
    );

  const nomeImportado =
    normalizar(
      item.vendedor ||
      item.colaborador
    );

  const correspondenciaExata =
    nomeBase === nomeImportado;

  const correspondenciaForte =
    primeiro.pontuacao >= 0.88 &&
    diferenca >= 0.08;

  const correspondenciaAceitavel =
    primeiro.pontuacao >= 0.78 &&
    diferenca >= 0.18;

  if (
    correspondenciaExata ||
    correspondenciaForte ||
    correspondenciaAceitavel
  ) {
    return {
      status: "encontrado",
      funcionario:
        primeiro.funcionario,
      pontuacao:
        primeiro.pontuacao,
      segundo:
        segundo?.funcionario || null
    };
  }

  if (
    primeiro.pontuacao >= 0.72
  ) {
    return {
      status: "ambiguo",
      funcionario:
        primeiro.funcionario,
      pontuacao:
        primeiro.pontuacao,
      segundo:
        segundo?.funcionario || null
    };
  }

  return {
    status: "nao_encontrado",
    funcionario: null,
    pontuacao:
      primeiro.pontuacao
  };
}

async function buscarColecao(nomeColecao) {
  const snapshot =
    await comTimeout(
      getDocs(
        collection(
          firestore,
          nomeColecao
        )
      ),
      TIMEOUT_OPERACAO,
      `Não foi possível carregar ${nomeColecao}.`
    );

  return snapshot.docs.map(documento => ({
    id: documento.id,
    ...documento.data()
  }));
}

function deveAtualizarNome(
  nomeAtual,
  nomeImportado,
  pontuacao
) {
  const atual =
    normalizar(nomeAtual);

  const importado =
    normalizar(nomeImportado);

  if (
    !atual ||
    !importado ||
    atual === importado
  ) {
    return false;
  }

  const tokensAtual =
    tokensNome(atual);

  const tokensImportado =
    tokensNome(importado);

  const importadoMaisCompleto =
    tokensImportado.length >
    tokensAtual.length;

  const atualContido =
    tokensAtual.every(token =>
      tokensImportado.includes(token)
    );

  return (
    pontuacao >= 0.82 &&
    importadoMaisCompleto &&
    atualContido
  );
}

function encontrarResponsavel(
  funcionarios,
  filial,
  cargos
) {
  return funcionarios.find(funcionario =>
    normalizar(funcionario.filial) ===
      normalizar(filial) &&
    cargos.includes(
      normalizar(
        funcionario.cargo
      )
    ) &&
    funcionario.ativo !== false &&
    funcionario.ativo !== "false"
  ) || null;
}

function calcularTicketUnidade(itens) {
  const quantidade =
    itens.reduce(
      (soma, item) =>
        soma + item.qtdTotal,
      0
    );

  const valor =
    itens.reduce(
      (soma, item) =>
        soma + item.valorTotal,
      0
    );

  if (quantidade > 0) {
    return valor / quantidade;
  }

  const tickets =
    itens
      .map(item =>
        item.ticketMedio
      )
      .filter(valorTicket =>
        valorTicket > 0
      );

  return tickets.length
    ? tickets.reduce(
        (soma, ticket) =>
          soma + ticket,
        0
      ) / tickets.length
    : 0;
}

function agruparPorFilial(itens) {
  const grupos = new Map();

  itens.forEach(item => {
    const chave =
      normalizar(item.filial);

    if (!chave) return;

    if (!grupos.has(chave)) {
      grupos.set(chave, []);
    }

    grupos.get(chave).push(item);
  });

  return grupos;
}

function gerarLancamentosPix(
  brutos,
  funcionarios
) {
  const gerados = [];
  const avisos = [];
  const erros = [];
  const reconciliacoes = [];

  const brutosComFuncionario = [];

  brutos.forEach(item => {
    if (item.valorAcumulado <= 0) {
      avisos.push(
        `Linha ${item.linha}: "${item.vendedor}" possui Vlr. Acumulado zerado e será importado como NÃO HABILITADO.`
      );
    }

    const resultado =
      encontrarMelhorFuncionario(
        funcionarios,
        item,
        {
          cargos:
            item.cargoArquivo
              ? undefined
              : CARGOS.consultor
        }
      );

    if (
      resultado.status ===
      "nao_encontrado"
    ) {
      erros.push(
        `Linha ${item.linha}: "${item.vendedor}" não foi encontrado na base.`
      );

      return;
    }

    if (
      resultado.status ===
      "ambiguo"
    ) {
      erros.push(
        `Linha ${item.linha}: correspondência ambígua para "${item.vendedor}". Melhor opção: "${resultado.funcionario?.nome || ""}".`
      );

      return;
    }

    const funcionario =
      resultado.funcionario;

    const filial =
      item.filial ||
      funcionario.filial;

    const cargo =
      funcionario.cargo;

    const itemResolvido = {
      ...item,
      filial,
      dn:
        item.dn ||
        funcionario.dn ||
        "",
      funcionario
    };

    brutosComFuncionario.push(
      itemResolvido
    );

    if (
      deveAtualizarNome(
        funcionario.nome,
        item.vendedor,
        resultado.pontuacao
      )
    ) {
      reconciliacoes.push({
        funcionarioId:
          funcionario.id,
        nomeAnterior:
          funcionario.nome,
        nomeNovo:
          texto(item.vendedor),
        filial:
          funcionario.filial,
        cargo:
          funcionario.cargo,
        pontuacao:
          resultado.pontuacao
      });
    }

    /*
    Para a linha individual, usa a política do cargo
    encontrado na base.

    Consultor Técnico:
    Meta individual = Vlr. Acumulado
    Realizado = Vlr. Total
    Indicador = Ticket Médio

    Se Vlr. Acumulado estiver zerado, o funcionário
    permanece não habilitado por ausência de meta.
    */
    gerados.push({
      competencia:
        state.competencia,
      semana:
        Number(state.semana),
      funcionarioId:
        funcionario.id,
      nome:
        texto(item.vendedor),
      filial,
      dn:
        funcionario.dn ||
        item.dn ||
        "",
      cargo,

      metaSemanal:
        item.valorAcumulado,
      realizadoSemanal:
        item.valorTotal,
      percentualAtingimentoImportado:
        item.valorAcumulado > 0
          ? item.valorTotal /
            item.valorAcumulado *
            100
          : 0,
      semMetaIndividual:
        item.valorAcumulado <= 0,
      motivoNaoHabilitado:
        item.valorAcumulado <= 0
          ? "SEM META INDIVIDUAL (VLR. ACUMULADO ZERADO)"
          : "",
      ticketMedio:
        item.ticketMedio,

      margem: 0,
      metaNps: 0,
      realizadoNps: 0,
      osAbertaPercentual: 0,

      valorAcumuladoMeta:
        item.valorAcumulado,
      fatorEscalaImportacao:
        state.fatorEscalaMonetaria,
      escalaMonetariaCorrigida:
        state.escalaDetectadaAutomaticamente,
      objetivoMo:
        item.objetivoMo,
      realizadoMo:
        item.valorMo,
      objetivoPecas:
        item.objetivoPecas,
      realizadoPecas:
        item.valorPecas,
      valorTotalSistema:
        item.valorTotal,
      ticketMedioPecas:
        item.ticketMedioPecas,
      qtdTotal:
        item.qtdTotal,
      qtdPassagens:
        item.qtdPassagens,

      origemImportacao:
        "RELATORIO SISTEMA",
      arquivoImportado:
        state.arquivo?.name || ""
    });
  });

  const grupos =
    agruparPorFilial(
      brutosComFuncionario
    );

  grupos.forEach(itens => {
    const filial =
      itens[0]?.filial || "";

    const metaMo =
      itens.reduce(
        (soma, item) =>
          soma + item.objetivoMo,
        0
      );

    const realizadoMo =
      itens.reduce(
        (soma, item) =>
          soma + item.valorMo,
        0
      );

    const metaPecas =
      itens.reduce(
        (soma, item) =>
          soma + item.objetivoPecas,
        0
      );

    const realizadoPecas =
      itens.reduce(
        (soma, item) =>
          soma + item.valorPecas,
        0
      );

    const metaTotal =
      metaMo + metaPecas;

    const realizadoTotal =
      realizadoMo +
      realizadoPecas;

    const ticket =
      calcularTicketUnidade(itens);

    [
      {
        cargos: CARGOS.supervisor,
        label:
          "Supervisor de Assistência"
      },
      {
        cargos: CARGOS.orcamentista,
        label:
          "Orçamentista"
      }
    ].forEach(configuracao => {
      const responsavel =
        encontrarResponsavel(
          funcionarios,
          filial,
          configuracao.cargos
        );

      if (!responsavel) {
        avisos.push(
          `${configuracao.label} não encontrado na base da filial ${filial}.`
        );

        return;
      }

      /*
      Supervisor e Orçamentista:

      Meta =
      Soma Objetivo M.O. + Soma Objetivo Peças

      Realizado =
      Soma Vlr. M.O. + Soma Vlr. Peças

      Ticket =
      Soma Vlr. Total ÷ Soma Qtd. Total

      A diferença da premiação é aplicada pela política
      atual do cargo no pix-presidente.js.
      */
      gerados.push({
        competencia:
          state.competencia,
        semana:
          Number(state.semana),
        funcionarioId:
          responsavel.id,
        nome:
          responsavel.nome,
        filial:
          responsavel.filial,
        dn:
          responsavel.dn ||
          itens[0]?.dn ||
          "",
        cargo:
          responsavel.cargo,

        metaSemanal:
          metaTotal,
        realizadoSemanal:
          realizadoTotal,
        ticketMedio:
          ticket,

        margem: 0,
        metaNps: 0,
        realizadoNps: 0,
        osAbertaPercentual: 0,

        fatorEscalaImportacao:
          state.fatorEscalaMonetaria,
        escalaMonetariaCorrigida:
          state.escalaDetectadaAutomaticamente,
        objetivoMo:
          metaMo,
        realizadoMo,
        objetivoPecas:
          metaPecas,
        realizadoPecas,
        quantidadeColaboradores:
          itens.length,

        origemImportacao:
          "AGREGACAO AUTOMATICA DO RELATORIO",
        arquivoImportado:
          state.arquivo?.name || ""
      });
    });
  });

  return {
    gerados,
    avisos,
    erros,
    reconciliacoes
  };
}

function gerarLancamentosProdutivos(
  brutos,
  funcionarios
) {
  const gerados = [];
  const erros = [];
  const avisos = [];
  const reconciliacoes = [];

  brutos.forEach(item => {
    const resultado =
      encontrarMelhorFuncionario(
        funcionarios,
        item
      );

    if (
      resultado.status ===
      "nao_encontrado"
    ) {
      erros.push(
        `Linha ${item.linha}: "${item.colaborador}" não foi encontrado na base.`
      );

      return;
    }

    if (
      resultado.status ===
      "ambiguo"
    ) {
      erros.push(
        `Linha ${item.linha}: correspondência ambígua para "${item.colaborador}".`
      );

      return;
    }

    const funcionario =
      resultado.funcionario;

    if (
      deveAtualizarNome(
        funcionario.nome,
        item.colaborador,
        resultado.pontuacao
      )
    ) {
      reconciliacoes.push({
        funcionarioId:
          funcionario.id,
        nomeAnterior:
          funcionario.nome,
        nomeNovo:
          texto(item.colaborador),
        filial:
          funcionario.filial,
        cargo:
          funcionario.cargo,
        pontuacao:
          resultado.pontuacao
      });
    }

    gerados.push({
      competencia:
        item.competencia,
      funcionarioId:
        funcionario.id,
      nome:
        texto(item.colaborador),
      filial:
        item.filial ||
        funcionario.filial,
      dn:
        item.dn ||
        funcionario.dn ||
        "",
      cargo:
        item.cargoArquivo ||
        funcionario.cargo,

      faturamento:
        item.faturamento,
      horasDisponiveis:
        item.horasDisponiveis,
      horasTrabalhadas:
        item.horasTrabalhadas,
      horasVendidas:
        item.horasVendidas,
      treinamentoPendente:
        item.treinamentoPendente,
      retrabalho:
        item.retrabalho,

      produtividade:
        item.horasDisponiveis > 0
          ? item.horasTrabalhadas /
            item.horasDisponiveis *
            100
          : 0,

      eficiencia:
        item.horasTrabalhadas > 0
          ? item.horasVendidas /
            item.horasTrabalhadas *
            100
          : 0,

      origemImportacao:
        "RELATORIO SISTEMA",
      arquivoImportado:
        state.arquivo?.name || ""
    });
  });

  return {
    gerados,
    avisos,
    erros,
    reconciliacoes
  };
}

async function analisarColaboradores() {
  if (
    state.analisando ||
    state.processando
  ) {
    return;
  }

  state.analisando = true;
  state.progresso =
    "Analisando colaboradores...";
  renderizar();

  try {
    const configuracao =
      CONFIG[state.tipo];

    state.funcionariosCache =
      await buscarColecao(
        configuracao.funcionarios
      );

    const resultado =
      state.tipo === "pix"
        ? gerarLancamentosPix(
            state.brutos,
            state.funcionariosCache
          )
        : gerarLancamentosProdutivos(
            state.brutos,
            state.funcionariosCache
          );

    state.gerados =
      resultado.gerados;

    state.erros = [
      ...state.erros,
      ...resultado.erros
    ];

    state.avisos = [
      ...state.avisos,
      ...resultado.avisos
    ];

    state.reconciliacoes =
      resultado.reconciliacoes;
  } catch (erro) {
    state.erros.push(
      erro.message ||
      "Não foi possível analisar os colaboradores."
    );
  } finally {
    state.analisando = false;
    state.progresso = "";
    renderizar();
  }
}

/* ==========================================================================
   PERSISTÊNCIA EM LOTES
========================================================================== */

function chaveLancamentoPix(item) {
  return [
    item.funcionarioId,
    item.competencia,
    Number(item.semana)
  ].join("|");
}

function chaveLancamentoProdutivo(item) {
  return [
    item.funcionarioId,
    item.competencia
  ].join("|");
}

async function atualizarNomesBase(
  reconciliacoes
) {
  if (!reconciliacoes.length) {
    return 0;
  }

  const unicas = [
    ...new Map(
      reconciliacoes.map(item => [
        item.funcionarioId,
        item
      ])
    ).values()
  ];

  const lotes =
    dividirEmLotes(
      unicas,
      TAMANHO_LOTE
    );

  let atualizados = 0;

  for (
    let indice = 0;
    indice < lotes.length;
    indice += 1
  ) {
    state.progresso =
      `Atualizando nomes ${indice + 1}/${lotes.length}...`;
    renderizar();

    const batch =
      writeBatch(firestore);

    lotes[indice].forEach(item => {
      const referencia =
        doc(
          firestore,
          CONFIG[state.tipo].funcionarios,
          item.funcionarioId
        );

      batch.update(
        referencia,
        {
          nome:
            item.nomeNovo,
          nomeAnteriorImportacao:
            item.nomeAnterior,
          nomeAtualizadoPorImportacao:
            true,
          nomeAtualizadoEm:
            serverTimestamp()
        }
      );

      atualizados += 1;
    });

    await comTimeout(
      batch.commit(),
      TIMEOUT_OPERACAO,
      "O Firebase demorou para atualizar os nomes."
    );
  }

  return atualizados;
}

async function salvarPixEmLotes() {
  state.progresso =
    "Carregando lançamentos existentes...";
  renderizar();

  const existentes =
    await buscarColecao(
      CONFIG.pix.lancamentos
    );

  const mapaExistentes =
    new Map(
      existentes.map(item => [
        chaveLancamentoPix(item),
        item
      ])
    );

  const operacoes = [];
  let criados = 0;
  let atualizados = 0;
  let ignorados = 0;

  state.gerados.forEach(registro => {
    const chave =
      chaveLancamentoPix(registro);

    const existente =
      mapaExistentes.get(chave);

    if (
      existente &&
      state.estrategia === "novos"
    ) {
      ignorados += 1;
      return;
    }

    if (existente) {
      operacoes.push({
        tipo: "update",
        referencia:
          doc(
            firestore,
            CONFIG.pix.lancamentos,
            existente.id
          ),
        dados: {
          ...registro,
          atualizadoEm:
            serverTimestamp()
        }
      });

      atualizados += 1;
    } else {
      const idDocumento =
        gerarIdDocumento(chave);

      operacoes.push({
        tipo: "set",
        referencia:
          doc(
            firestore,
            CONFIG.pix.lancamentos,
            idDocumento
          ),
        dados: {
          ...registro,
          criadoEm:
            serverTimestamp(),
          atualizadoEm:
            serverTimestamp()
        }
      });

      criados += 1;
    }
  });

  const lotes =
    dividirEmLotes(
      operacoes,
      TAMANHO_LOTE
    );

  for (
    let indice = 0;
    indice < lotes.length;
    indice += 1
  ) {
    state.progresso =
      `Salvando lançamentos ${indice + 1}/${lotes.length}...`;
    renderizar();

    const batch =
      writeBatch(firestore);

    lotes[indice].forEach(operacao => {
      if (
        operacao.tipo ===
        "update"
      ) {
        batch.update(
          operacao.referencia,
          operacao.dados
        );
      } else {
        batch.set(
          operacao.referencia,
          operacao.dados
        );
      }
    });

    await comTimeout(
      batch.commit(),
      TIMEOUT_OPERACAO,
      "O Firebase demorou para salvar os lançamentos."
    );
  }

  return {
    criados,
    atualizados,
    ignorados
  };
}

function carregarDbProdutivos() {
  try {
    return JSON.parse(
      localStorage.getItem(
        DB_PRODUTIVOS
      ) ||
      '{"lancamentos":[]}'
    );
  } catch {
    return {
      lancamentos: []
    };
  }
}

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
}

async function salvarProdutivosLocal() {
  state.progresso =
    "Salvando lançamentos...";
  renderizar();

  const db =
    carregarDbProdutivos();

  if (!Array.isArray(db.lancamentos)) {
    db.lancamentos = [];
  }

  const mapaExistentes =
    new Map(
      db.lancamentos.map(item => [
        chaveLancamentoProdutivo(item),
        item
      ])
    );

  let criados = 0;
  let atualizados = 0;
  let ignorados = 0;

  state.gerados.forEach(registro => {
    const chave =
      chaveLancamentoProdutivo(registro);

    const existente =
      mapaExistentes.get(chave);

    if (
      existente &&
      state.estrategia === "novos"
    ) {
      ignorados += 1;
      return;
    }

    if (existente) {
      const indice =
        db.lancamentos.findIndex(
          item =>
            item.id === existente.id
        );

      db.lancamentos[indice] = {
        ...existente,
        ...registro,
        id:
          existente.id
      };

      atualizados += 1;
    } else {
      const novo = {
        ...registro,
        id: uid()
      };

      db.lancamentos.push(novo);

      mapaExistentes.set(
        chave,
        novo
      );

      criados += 1;
    }
  });

  localStorage.setItem(
    DB_PRODUTIVOS,
    JSON.stringify(db)
  );

  return {
    criados,
    atualizados,
    ignorados
  };
}

async function confirmarImportacao() {
  if (
    state.processando ||
    state.analisando
  ) {
    return;
  }

  if (state.erros.length) {
    await alerta(
      "Existem erros que precisam ser corrigidos antes da importação."
    );

    return;
  }

  if (!state.gerados.length) {
    await alerta(
      "Nenhum lançamento foi gerado. Verifique os nomes, filiais e cargos."
    );

    return;
  }

  state.processando = true;
  state.progresso =
    "Preparando importação...";
  renderizar();

  let resultadoFinal = null;
  let nomesAtualizadosFinal = 0;
  let mensagemSucesso = "";

  try {
    nomesAtualizadosFinal =
      await atualizarNomesBase(
        state.reconciliacoes
      );

    resultadoFinal =
      state.tipo === "pix"
        ? await salvarPixEmLotes()
        : await salvarProdutivosLocal();

    state.progresso =
      "Concluído!";
    renderizar();

    const mensagem = [
      "Importação concluída com sucesso.",
      "",
      `${resultadoFinal.criados} criado(s)`,
      `${resultadoFinal.atualizados} atualizado(s)`,
      `${resultadoFinal.ignorados} ignorado(s)`,
      `${nomesAtualizadosFinal} nome(s) atualizado(s) na base`
    ];

    if (state.avisos.length) {
      mensagem.push(
        "",
        "Avisos:",
        ...state.avisos.slice(0, 20)
      );
    }

    mensagemSucesso =
      mensagem.join("\n");

    /*
    CORREÇÃO DO TRAVAMENTO:
    A versão anterior chamava fecharModal() enquanto
    state.processando ainda era true. A própria função
    fecharModal bloqueava o fechamento e o modal ficava
    eternamente em "Finalizando...".
    */
    state.processando = false;
    state.progresso = "";
    renderizar();

    fecharModal(true);

    toast(
      "Importação concluída."
    );

    window.dispatchEvent(
      new CustomEvent(
        state.tipo === "pix"
          ? "pix:importacao-concluida"
          : "produtivos:importacao-concluida",
        {
          detail: {
            ...resultadoFinal,
            nomesAtualizados:
              nomesAtualizadosFinal
          }
        }
      )
    );

    /*
    A mensagem de sucesso é aberta depois que o dialog
    de importação já foi fechado. Não aguardamos a Promise
    do alerta para evitar que uma implementação de alerta
    personalizada mantenha a rotina presa.
    */
    window.setTimeout(() => {
      void alerta(
        mensagemSucesso
      );
    }, 80);

    if (
      state.tipo ===
      "produtivos"
    ) {
      window.setTimeout(() => {
        window.location.reload();
      }, 900);
    }
  } catch (erro) {
    console.error(
      "[IMPORTAÇÃO INTELIGENTE]",
      erro
    );

    state.processando = false;
    state.progresso = "";
    renderizar();

    await alerta(
      [
        "A importação não foi concluída.",
        "",
        erro.message ||
          "Erro desconhecido.",
        "",
        "O botão foi liberado para uma nova tentativa."
      ].join("\n")
    );
  } finally {
    /*
    Garante que a interface nunca permaneça bloqueada,
    mesmo quando um erro inesperado ocorrer.
    */
    state.processando = false;
    state.progresso = "";
    renderizar();
  }
}

/* ==========================================================================
   MODELOS
========================================================================== */

function baixarModelo(tipo) {
  if (!window.XLSX) {
    alerta(
      "A biblioteca XLSX não foi carregada."
    );

    return;
  }

  const cabecalhos =
    tipo === "pix"
      ? [
          "Vendedor",
          "Cargo",
          "Filial",
          "DN",
          "Vlr. Acumulado",
          "Vlr. Total",
          "Ticket Médio",
          "Objetivo M.O.",
          "Vlr. M.O.",
          "Objetivo Peças",
          "Vlr. Peças",
          "Qtd. Total",
          "Qtd. Passagens",
          "Ticket Médio Peças"
        ]
      : [
          "Competencia",
          "DN",
          "Filial",
          "Colaborador",
          "Cargo",
          "Faturamento",
          "Horas Disponiveis",
          "Horas Trabalhadas",
          "Horas Vendidas",
          "Treinamento Pendente",
          "Retrabalho"
        ];

  const exemplo =
    tipo === "pix"
      ? [
          "PABRICIO LIMA MACIEL",
          "Consultor Técnico",
          "ANANINDEUA",
          "4700",
          283736.19,
          301719.24,
          4437.05,
          64000,
          99379.54,
          160000,
          202339.70,
          68,
          60,
          2975.58
        ]
      : [
          "2026-07",
          "4700",
          "ANANINDEUA",
          "PABRICIO LIMA MACIEL",
          "Mecânico Produtivo",
          65000,
          176,
          150,
          145,
          "NÃO",
          "NÃO"
        ];

  const planilha =
    XLSX.utils.aoa_to_sheet([
      cabecalhos,
      exemplo
    ]);

  const livro =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    livro,
    planilha,
    tipo === "pix"
      ? "RELATORIO SISTEMA"
      : "PRODUTIVOS"
  );

  XLSX.writeFile(
    livro,
    tipo === "pix"
      ? "modelo-relatorio-pix.xlsx"
      : "modelo-importacao-produtivos.xlsx"
  );
}

/* ==========================================================================
   INTERFACE
========================================================================== */

function garantirCss() {
  if ($("#irsCss")) return;

  document.head.insertAdjacentHTML(
    "beforeend",
    `
    <style id="irsCss">
      .irs-actions{
        display:flex;
        align-items:center;
        gap:8px;
        flex-wrap:wrap;
        margin-left:auto;
        margin-right:10px
      }

      .irs-btn{
        min-height:40px;
        padding:9px 13px;
        border-radius:10px;
        font-weight:800;
        cursor:pointer
      }

      .irs-model{
        border:1px solid #d4e0e6;
        background:#fff;
        color:#0b3154
      }

      .irs-import{
        border:0;
        background:#0b3154;
        color:#fff
      }

      .irs-dialog{
        width:min(1040px,calc(100vw - 28px));
        max-height:calc(100vh - 28px);
        padding:0;
        border:0;
        border-radius:20px;
        overflow:hidden;
        box-shadow:0 26px 70px rgba(10,30,44,.32)
      }

      .irs-dialog::backdrop{
        background:rgba(8,25,38,.68);
        backdrop-filter:blur(3px)
      }

      .irs-form{
        display:flex;
        flex-direction:column;
        max-height:calc(100vh - 28px)
      }

      .irs-header{
        display:flex;
        justify-content:space-between;
        padding:20px 22px;
        color:#fff;
        background:linear-gradient(135deg,#0b3154,#087354)
      }

      .irs-header h2{
        margin:4px 0
      }

      .irs-header p{
        margin:0;
        opacity:.85
      }

      .irs-close{
        width:40px;
        height:40px;
        border:1px solid #ffffff55;
        border-radius:11px;
        background:#ffffff18;
        color:#fff;
        font-size:1.3rem;
        cursor:pointer
      }

      .irs-body{
        padding:20px 22px;
        overflow:auto
      }

      .irs-grid{
        display:grid;
        grid-template-columns:
          repeat(5,minmax(130px,1fr));
        gap:10px
      }

      .irs-field{
        display:grid;
        gap:6px
      }

      .irs-field span{
        font-size:.7rem;
        font-weight:800;
        color:#687c8b;
        text-transform:uppercase
      }

      .irs-field input,
      .irs-field select{
        min-height:41px;
        padding:8px;
        border:1px solid #dce6ec;
        border-radius:9px;
        background:#fff
      }

      .irs-drop{
        display:block;
        margin-top:13px;
        padding:25px;
        border:2px dashed #9eb3c0;
        border-radius:13px;
        text-align:center;
        cursor:pointer
      }

      .irs-drop strong,
      .irs-drop small{
        display:block
      }

      .irs-drop small{
        margin-top:5px;
        color:#687c8b
      }

      .irs-summary{
        display:grid;
        grid-template-columns:
          repeat(6,1fr);
        gap:9px;
        margin-top:12px
      }

      .irs-summary article{
        padding:12px;
        border:1px solid #dce6ec;
        border-radius:11px
      }

      .irs-summary span{
        font-size:.68rem;
        font-weight:800;
        color:#687c8b;
        text-transform:uppercase
      }

      .irs-summary strong{
        display:block;
        margin-top:6px;
        color:#0b3154
      }

      .irs-note{
        margin-top:12px;
        padding:12px;
        border:1px solid #d7e4ea;
        border-radius:10px;
        background:#f6f9fa;
        color:#36566a;
        line-height:1.45
      }

      .irs-reconciliacao{
        margin-top:12px;
        padding:12px;
        border:1px solid #b9decf;
        border-radius:10px;
        background:#edf9f4;
        color:#126149
      }

      .irs-preview{
        margin-top:12px;
        overflow:auto
      }

      .irs-table{
        width:100%;
        border-collapse:collapse
      }

      .irs-table th,
      .irs-table td{
        padding:8px;
        border-bottom:1px solid #dce6ec;
        text-align:left;
        white-space:nowrap
      }

      .irs-table th{
        font-size:.67rem;
        color:#687c8b;
        text-transform:uppercase
      }

      .irs-msg{
        display:grid;
        gap:7px;
        margin-top:12px;
        max-height:190px;
        overflow:auto
      }

      .irs-error,
      .irs-warning,
      .irs-ok{
        padding:9px 11px;
        border-radius:9px
      }

      .irs-error{
        background:#fdeaea;
        color:#922727
      }

      .irs-warning{
        background:#fff4d8;
        color:#825800
      }

      .irs-ok{
        border:1px dashed #dce6ec;
        color:#687c8b;
        text-align:center
      }

      .irs-footer{
        display:flex;
        justify-content:flex-end;
        align-items:center;
        gap:9px;
        padding:15px 22px;
        border-top:1px solid #dce6ec;
        background:#f7f9fa
      }

      .irs-progress{
        margin-right:auto;
        color:#476477;
        font-weight:700
      }

      .irs-footer button{
        min-height:41px;
        padding:9px 14px;
        border-radius:10px;
        font-weight:800;
        cursor:pointer
      }

      .irs-cancel{
        border:1px solid #d2dee5;
        background:#fff;
        color:#0b3154
      }

      .irs-confirm{
        border:0;
        background:#087354;
        color:#fff
      }

      .irs-confirm:disabled{
        opacity:.55;
        cursor:not-allowed
      }

      @media(max-width:900px){
        .irs-grid{
          grid-template-columns:
            repeat(2,1fr)
        }

        .irs-summary{
          grid-template-columns:
            repeat(2,1fr)
        }
      }

      @media(max-width:580px){
        .irs-grid,
        .irs-summary{
          grid-template-columns:1fr
        }

        .irs-footer{
          align-items:stretch;
          flex-direction:column
        }

        .irs-progress{
          margin-right:0
        }
      }
    </style>
    `
  );
}

function garantirModal() {
  if ($("#irsModal")) return;

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <dialog id="irsModal" class="irs-dialog">
      <form class="irs-form" method="dialog">
        <header class="irs-header">
          <div>
            <small>IMPORTAÇÃO OPCIONAL</small>
            <h2 id="irsTitle">
              Importar relatório
            </h2>
            <p>
              Os lançamentos manuais continuarão funcionando.
            </p>
          </div>

          <button
            type="button"
            id="irsClose"
            class="irs-close"
          >
            ×
          </button>
        </header>

        <div class="irs-body">
          <div class="irs-grid">
            <label class="irs-field">
              <span>Competência</span>
              <input
                type="month"
                id="irsCompetencia"
              >
            </label>

            <label
              class="irs-field"
              id="irsSemanaField"
            >
              <span>Semana</span>

              <select id="irsSemana">
                <option value="1">Semana 1</option>
                <option value="2">Semana 2</option>
                <option value="3">Semana 3</option>
                <option value="4">Semana 4</option>
              </select>
            </label>

            <label class="irs-field">
              <span>Filial padrão</span>

              <select id="irsFilial">
                <option value="">
                  Identificar pela planilha/base
                </option>

                <option>ANANINDEUA</option>
                <option>SÃO LUIS</option>
                <option>BACABAL</option>
                <option>MACAPÁ</option>
                <option>TERESINA</option>
                <option>URUÇUI</option>
                <option>SINOP</option>
                <option>CUIABÁ</option>
                <option>AGUA BOA</option>
                <option>RONDONOPOLIS</option>
                <option>PORTO VELHO</option>
                <option>JIPARANÁ</option>
                <option>VILHENA</option>
              </select>
            </label>

            <label class="irs-field">
              <span>Aba</span>

              <select id="irsAba">
                <option>
                  Aguardando arquivo
                </option>
              </select>
            </label>

            <label class="irs-field">
              <span>Duplicidades</span>

              <select id="irsStrategy">
                <option value="novos">
                  Somente novos
                </option>

                <option value="atualizar">
                  Atualizar existentes
                </option>
              </select>
            </label>
          </div>

          <label class="irs-drop">
            <strong>
              Clique ou arraste o XLSX, XLS ou CSV
            </strong>

            <small id="irsDescription"></small>

            <input
              type="file"
              id="irsFile"
              accept=".xlsx,.xls,.csv"
              hidden
            >
          </label>

          <div class="irs-summary">
            <article>
              <span>Arquivo</span>
              <strong id="irsFileName">
                Nenhum
              </strong>
            </article>

            <article>
              <span>Linhas válidas</span>
              <strong id="irsRaw">0</strong>
            </article>

            <article>
              <span>Lançamentos gerados</span>
              <strong id="irsGenerated">0</strong>
            </article>

            <article>
              <span>Nomes para atualizar</span>
              <strong id="irsNames">0</strong>
            </article>

            <article>
              <span>Escala monetária</span>
              <strong id="irsScale">Normal</strong>
            </article>

            <article>
              <span>Erros / avisos</span>
              <strong>
                <span id="irsErrors">0</span>
                /
                <span id="irsWarnings">0</span>
              </strong>
            </article>
          </div>

          <div
            id="irsRule"
            class="irs-note"
          ></div>

          <div
            id="irsReconciliacao"
            class="irs-reconciliacao"
            hidden
          ></div>

          <div
            id="irsPreview"
            class="irs-preview"
          ></div>

          <div
            id="irsMessages"
            class="irs-msg"
          ></div>
        </div>

        <footer class="irs-footer">
          <span
            id="irsProgress"
            class="irs-progress"
          ></span>

          <button
            type="button"
            id="irsCancel"
            class="irs-cancel"
          >
            Cancelar
          </button>

          <button
            type="button"
            id="irsConfirm"
            class="irs-confirm"
            disabled
          >
            Confirmar importação
          </button>
        </footer>
      </form>
    </dialog>
    `
  );

  $("#irsClose").onclick =
    fecharModal;

  $("#irsCancel").onclick =
    fecharModal;

  $("#irsFile").onchange =
    async evento => {
      try {
        await lerArquivo(
          evento.target.files?.[0]
        );
      } catch (erro) {
        await alerta(
          erro.message
        );
      }
    };

  $("#irsCompetencia").onchange =
    evento => {
      state.competencia =
        competenciaNormalizada(
          evento.target.value
        );

      processar();
    };

  $("#irsSemana").onchange =
    evento => {
      state.semana =
        Number(
          evento.target.value
        );

      processar();
    };

  $("#irsFilial").onchange =
    evento => {
      state.filial =
        evento.target.value;

      processar();
    };

  $("#irsAba").onchange =
    evento => {
      carregarAba(
        evento.target.value
      );
    };

  $("#irsStrategy").onchange =
    evento => {
      state.estrategia =
        evento.target.value;
    };

  $("#irsConfirm").onclick =
    confirmarImportacao;
}

function fecharModal(forcar = false) {
  if (
    !forcar &&
    (
      state.processando ||
      state.analisando
    )
  ) {
    return;
  }

  const modal =
    $("#irsModal");

  if (
    modal?.open
  ) {
    modal.close();
  }
}

function renderizar() {
  if (!$("#irsModal")) return;

  $("#irsFileName").textContent =
    state.arquivo?.name ||
    "Nenhum";

  $("#irsRaw").textContent =
    state.brutos.length;

  $("#irsGenerated").textContent =
    state.gerados.length;

  $("#irsNames").textContent =
    state.reconciliacoes.length;

  $("#irsScale").textContent =
    state.escalaDetectadaAutomaticamente
      ? "Corrigida × 1.000"
      : "Normal";

  $("#irsErrors").textContent =
    state.erros.length;

  $("#irsWarnings").textContent =
    state.avisos.length;

  $("#irsProgress").textContent =
    state.progresso;

  const campos =
    state.tipo === "pix"
      ? [
          "vendedor",
          "filial",
          "cargoArquivo",
          "valorAcumulado",
          "valorTotal",
          "ticketMedio",
          "objetivoMo",
          "valorMo",
          "objetivoPecas",
          "valorPecas"
        ]
      : [
          "colaborador",
          "filial",
          "cargoArquivo",
          "faturamento",
          "horasDisponiveis",
          "horasTrabalhadas",
          "horasVendidas"
        ];

  $("#irsPreview").innerHTML =
    state.brutos.length
      ? `
        <table class="irs-table">
          <thead>
            <tr>
              ${
                campos
                  .map(campo =>
                    `<th>${escapar(campo)}</th>`
                  )
                  .join("")
              }
            </tr>
          </thead>

          <tbody>
            ${
              state.brutos
                .slice(0, 15)
                .map(item => `
                  <tr>
                    ${
                      campos
                        .map(campo =>
                          `<td>${escapar(item[campo])}</td>`
                        )
                        .join("")
                    }
                  </tr>
                `)
                .join("")
            }
          </tbody>
        </table>
      `
      : `
        <div class="irs-ok">
          Selecione um arquivo.
        </div>
      `;

  const mensagens = [
    ...state.erros.map(mensagem => ({
      tipo: "error",
      mensagem
    })),
    ...state.avisos.map(mensagem => ({
      tipo: "warning",
      mensagem
    }))
  ];

  $("#irsMessages").innerHTML =
    mensagens.length
      ? mensagens
          .slice(0, 100)
          .map(item => `
            <div class="irs-${item.tipo}">
              ${escapar(item.mensagem)}
            </div>
          `)
          .join("")
      : `
        <div class="irs-ok">
          Nenhum erro encontrado.
        </div>
      `;

  $("#irsRule").innerHTML =
    state.tipo === "pix"
      ? `
        <strong>Regras:</strong>
        Consultor: meta individual = Vlr. Acumulado,
        realizado = Vlr. Total e indicador = Ticket Médio.
        Se Vlr. Acumulado estiver zerado, o colaborador fica
        não habilitado por ausência de meta.
        Supervisor e Orçamentista:
        meta = Objetivo M.O. + Objetivo Peças;
        realizado = Vlr. M.O. + Vlr. Peças;
        ticket = Vlr. Total ÷ Qtd. Total.
        A política atual define os valores diferentes de premiação.
        Arquivos XLS antigos com valores reduzidos são corrigidos
        automaticamente para os valores monetários completos.
      `
      : `
        <strong>Produtivos:</strong>
        importe faturamento e horas.
        Produtividade e eficiência serão calculadas automaticamente.
      `;

  const caixaReconciliacao =
    $("#irsReconciliacao");

  if (state.reconciliacoes.length) {
    caixaReconciliacao.hidden =
      false;

    caixaReconciliacao.innerHTML = `
      <strong>
        ${state.reconciliacoes.length}
        nome(s) serão completados na base:
      </strong>

      <br>

      ${
        state.reconciliacoes
          .slice(0, 12)
          .map(item =>
            `${escapar(item.nomeAnterior)} → ${escapar(item.nomeNovo)}`
          )
          .join("<br>")
      }
    `;
  } else {
    caixaReconciliacao.hidden =
      true;

    caixaReconciliacao.innerHTML =
      "";
  }

  const bloqueado =
    state.processando ||
    state.analisando;

  $("#irsConfirm").disabled =
    bloqueado ||
    state.erros.length > 0 ||
    state.gerados.length === 0;

  $("#irsConfirm").textContent =
    state.processando
      ? state.progresso ||
        "Importando..."
      : state.analisando
        ? "Analisando..."
        : "Confirmar importação";

  $("#irsCancel").disabled =
    bloqueado;

  $("#irsClose").disabled =
    bloqueado;
}

function abrir(tipo) {
  garantirModal();

  state.tipo = tipo;
  state.arquivo = null;
  state.workbook = null;
  state.aba = "";
  state.competencia =
    $("#competenciaGlobal")?.value ||
    $("#pixDashboardCompetencia")?.value ||
    new Date().toISOString().slice(0, 7);
  state.semana = 1;
  state.filial = "";
  state.estrategia = "novos";
  state.headers = [];
  state.rows = [];
  state.brutos = [];
  state.gerados = [];
  state.erros = [];
  state.avisos = [];
  state.reconciliacoes = [];
  state.funcionariosCache = [];
  state.processando = false;
  state.analisando = false;
  state.progresso = "";
  state.fatorEscalaMonetaria = 1;
  state.escalaDetectadaAutomaticamente = false;

  $("#irsTitle").textContent =
    `Importar relatório — ${CONFIG[tipo].nome}`;

  $("#irsCompetencia").value =
    state.competencia;

  $("#irsSemana").value =
    "1";

  $("#irsFilial").value =
    "";

  $("#irsAba").innerHTML =
    "<option>Aguardando arquivo</option>";

  $("#irsStrategy").value =
    "novos";

  $("#irsFile").value =
    "";

  $("#irsSemanaField").hidden =
    tipo !== "pix";

  $("#irsDescription").textContent =
    tipo === "pix"
      ? "O relatório deve conter Vlr. Acumulado (meta individual), Vlr. Total (realizado), Ticket Médio, Objetivo M.O., Vlr. M.O., Objetivo Peças e Vlr. Peças."
      : "Arquivo com faturamento e horas dos produtivos.";

  renderizar();

  $("#irsModal").showModal();
}

function inserir(tipo) {
  const header =
    $(CONFIG[tipo].header);

  if (!header) return false;

  if (
    header.querySelector(
      `[data-irs="${tipo}"]`
    )
  ) {
    return true;
  }

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "irs-actions";

  wrapper.dataset.irs =
    tipo;

  wrapper.innerHTML = `
    <button
      type="button"
      class="irs-btn irs-model"
    >
      Baixar modelo
    </button>

    <button
      type="button"
      class="irs-btn irs-import"
    >
      Importar relatório
    </button>
  `;

  const novo =
    header.querySelector(
      "#btnNovoLancamentoPix,#btnNovoLancamento,.primary"
    );

  if (novo) {
    novo.insertAdjacentElement(
      "beforebegin",
      wrapper
    );
  } else {
    header.appendChild(
      wrapper
    );
  }

  wrapper
    .querySelector(".irs-model")
    .onclick =
      () => baixarModelo(tipo);

  wrapper
    .querySelector(".irs-import")
    .onclick =
      () => abrir(tipo);

  return true;
}

function iniciar() {
  garantirCss();
  garantirModal();

  inserir("pix");
  inserir("produtivos");

  let tentativas = 0;

  const temporizador =
    window.setInterval(() => {
      tentativas += 1;

      const pix =
        inserir("pix");

      const produtivos =
        inserir("produtivos");

      if (
        (pix && produtivos) ||
        tentativas >= 30
      ) {
        window.clearInterval(
          temporizador
        );
      }
    }, 300);

  window.importacaoRelatorioSistema = {
    abrirPix() {
      abrir("pix");
    },

    abrirProdutivos() {
      abrir("produtivos");
    },

    analisar:
      analisarColaboradores,

    versao:
      VERSAO
  };

  console.info(
    `[IMPORTAÇÃO INTELIGENTE] ${VERSAO}`
  );
}

if (
  document.readyState === "loading"
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