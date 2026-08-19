/*
 * AJUSTE v33 — PRESENÇA REAL DOS CAMPOS DO PIX
 * Data: 19/08/2026
 *
 * IMPORTANTE:
 * - Este arquivo parte da versão COMPLETA v32 enviada pelo usuário.
 * - Nenhuma rotina existente de leitura, reconciliação, Firebase,
 *   duplicidade, Produtivos, modelo, modal ou persistência foi removida.
 * - O objetivo é somente diferenciar "campo vazio" de "valor zero"
 *   nos indicadores do Pix.
 * - Isso permite que o pix-presidente.js impeça bonificação quando
 *   faltar um campo crítico que influencia bônus ou penalidade.
 */

/*
 * AJUSTE v32 — COMPETÊNCIA PADRÃO DA IMPORTAÇÃO
 * Data: 17/08/2026
 *
 * - Pix do Presidente abre no mês atual.
 * - Produtivos abre no mês anterior.
 * - O usuário continua podendo trocar a competência manualmente.
 * - Nenhuma lógica de leitura, validação, cálculo, duplicidade,
 *   reconciliação, Firebase ou importação foi removida.
 */

/*
===============================================================================
IMPORTAÇÃO INTELIGENTE DO RELATÓRIO — PIX + PRODUTIVOS
Arquivo: importacao-relatorio-sistema.js
Versão: 2026.08.04-19
===============================================================================

CORREÇÕES DESTA VERSÃO

CORREÇÃO CRÍTICA — IMPORTAÇÃO DOS PRODUTIVOS NO FIREBASE

- Corrige o falso sucesso da importação em lote.
- A versão anterior salvava os Produtivos somente no localStorage.
- Agora grava na coleção oficial produtivos_lancamentos.
- Apuração, Visão Geral e Lançamentos passam a receber os dados.
- Confirma a gravação no Firestore antes de mostrar sucesso.
- Mantém atualização por colaborador + competência.
- Usa writeBatch e ID determinístico para evitar duplicidades.



CORREÇÃO DO BOTÃO CONFIRMAR IMPORTAÇÃO

- O botão não fica mais bloqueado apenas porque algumas linhas têm erro.
- Havendo lançamentos válidos, o sistema permite continuar.
- Linhas inválidas são ignoradas e continuam listadas para conferência.
- Antes de importar parcialmente, o sistema pede confirmação.
- O botão informa quantos lançamentos válidos serão importados.
- O resultado final mostra quantas linhas inválidas foram descartadas.


CORREÇÃO DE ERRO DE SINTAXE — NOMEIMPORTADO

- Removida a segunda declaração de const nomeImportado dentro de
  encontrarMelhorFuncionario().
- O erro impedia o módulo inteiro de ser interpretado pelo navegador.
- Mensagem corrigida: redeclaration of const nomeImportado.
- O modal e os botões voltam a funcionar após o carregamento do arquivo.


CORREÇÃO DEFINITIVA — BOTÕES FIXOS NO INDEX.HTML

- Os botões Baixar modelo e Importar relatório agora existem diretamente
  no HTML do Pix e dos Produtivos.
- O JavaScript apenas vincula os eventos de clique.
- Não depende mais de encontrar ou reconstruir .panel-header.
- O mecanismo dinâmico foi mantido apenas como fallback.
- A vinculação ocorre antes da criação do modal.
- Diagnóstico disponível no console:
  window.importacaoRelatorioSistema.diagnostico()


CORREÇÃO DO BOTÃO DE IMPORTAÇÃO NÃO APARECENDO

- O código não depende mais somente de "#pix-lancamentos .panel-header".
- Usa como âncora principal o botão #btnNovoLancamentoPix.
- Possui seletores alternativos para layouts diferentes.
- Um MutationObserver recria os botões se o Pix reconstruir a tela.
- O botão será inserido ao lado de "+ Novo lançamento".
- Função manual disponível:
  window.importacaoRelatorioSistema.restaurarBotoes()


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


5. Importação oficial do relatório semanal do Pix:
   - localiza cada vendedor na coleção pix_presidente_funcionarios;
   - usa filial, DN e cargo cadastrados na base;
   - Vlr. Acumulado = meta individual;
   - Vlr. Total = realizado;
   - Ticket Médio = indicador;
   - uma nova importação da mesma competência/semana atualiza o lançamento;
   - lançamentos de outras semanas e competências permanecem preservados;
   - a apuração do pix-presidente.js define automaticamente quem ganhou;
   - vendedores sem meta ou abaixo da política ficam NÃO HABILITADOS.

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
  src="./importacao-relatorio-sistema.js?v=20260723-17"
></script>

Carregue este arquivo depois de:
- script.js
- pix-presidente.js

Remova apenas versões antigas da importação de lançamentos.
===============================================================================
*/

import {
  firestore
} from "./firebase-config.js";

import {
  collection,
  getDocs,
  doc,
  writeBatch,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

/*
O importador usa exatamente a mesma instância configurada em
firebase-config.js. Isso evita duas inicializações diferentes do
Firestore e mantém o long polling usado pelo restante do sistema.
*/

const VERSAO = "2026.08.19-33";
const TAMANHO_LOTE = 400;
const TIMEOUT_OPERACAO = 90000;
const DB_PRODUTIVOS = "campanha_oficina_mvp_v1";

window.__IMPORTADOR_PIX_ARQUIVO_CARREGADO = true;

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


function numeroPercentual(
  valor
) {
  const convertido =
    numero(
      valor
    );

  /*
   * O Excel armazena 17,20% internamente como 0,172.
   * Já uma célula em formato Geral pode chegar como 17,20.
   *
   * Esta função aceita os dois formatos:
   *   0,172  -> 17,20
   *   17,20  -> 17,20
   *   0,496  -> 49,60
   *   49,60  -> 49,60
   */
  if (
    convertido !== 0 &&
    Math.abs(
      convertido
    ) <= 1
  ) {
    return convertido * 100;
  }

  return convertido;
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

/*
===============================================================================
COMPETÊNCIA PADRÃO DA IMPORTAÇÃO — 2026.08.17
===============================================================================

PIX DO PRESIDENTE:
- abre por padrão sempre no mês atual.

PRODUTIVOS:
- abre por padrão sempre no mês anterior.

O campo continua totalmente editável. Se o usuário precisar lançar outra
competência, basta selecionar outro mês no próprio modal antes de importar.
===============================================================================
*/

function competenciaMesAtualImportacao() {
  const agora = new Date();

  return (
    String(
      agora.getFullYear()
    ) +
    "-" +
    String(
      agora.getMonth() + 1
    ).padStart(
      2,
      "0"
    )
  );
}

function competenciaMesAnteriorImportacao() {
  const agora = new Date();

  const anterior =
    new Date(
      agora.getFullYear(),
      agora.getMonth() - 1,
      1
    );

  return (
    String(
      anterior.getFullYear()
    ) +
    "-" +
    String(
      anterior.getMonth() + 1
    ).padStart(
      2,
      "0"
    )
  );
}

function competenciaPadraoImportacao(
  tipo
) {
  return tipo === "pix"
    ? competenciaMesAtualImportacao()
    : competenciaMesAnteriorImportacao();
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

function alerta(
  mensagem,
  opcoes = {}
) {
  if (window.CampanhaUI?.alert) {
    return window.CampanhaUI.alert(
      mensagem,
      opcoes
    );
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

    /*
    O layout atual nem sempre mantém a classe .panel-header.
    Por isso usamos primeiro o botão real de Novo lançamento
    como âncora e, em seguida, seletores alternativos.
    */
    botaoImportarFixo:
      "#btnImportarRelatorioPix",
    botaoModeloFixo:
      "#btnBaixarModeloRelatorioPix",

    botaoNovo: [
      "#btnNovoLancamentoPix",
      "[data-pix-new-launch]",
      "#pix-lancamentos .primary"
    ],

    headers: [
      "#pix-lancamentos .panel-header",
      "#pix-lancamentos .panel-head",
      "#pix-lancamentos header",
      "#pix-lancamentos .actions",
      "#pix-lancamentos"
    ],

    funcionarios: "pix_presidente_funcionarios",
    lancamentos: "pix_presidente_lancamentos"
  },

  produtivos: {
    nome: "Campanha dos Produtivos",

    botaoImportarFixo:
      "#btnImportarRelatorioProdutivos",
    botaoModeloFixo:
      "#btnBaixarModeloRelatorioProdutivos",

    /*
     * Coleção oficial usada pelo script.js, pela Apuração
     * e pela Visão Geral dos Produtivos.
     */
    lancamentos:
      "produtivos_lancamentos",

    botaoNovo: [
      "#btnNovoLancamento",
      "[data-new-launch]",
      "#lancamentos .primary"
    ],

    headers: [
      "#lancamentos .panel-header",
      "#lancamentos .panel-head",
      "#lancamentos header",
      "#lancamentos .actions",
      "#lancamentos"
    ],

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
  estrategia: "atualizar",
  headers: [],
  rows: [],
  brutos: [],
  gerados: [],
  erros: [],
  avisos: [],
  reconciliacoes: [],
  funcionariosCache: [],
  lancamentosCache: [],
  participantesParaCriar: [],
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
    ]),

    metaSemanal: localizarColuna([
      "Meta semanal",
      "Meta Semanal"
    ]),

    realizadoSemanal: localizarColuna([
      "Realizado semanal",
      "Realizado Semanal"
    ]),

    margem: localizarColuna([
      "Margem realizada (%)",
      "Margem realizada",
      "Margem"
    ]),

    bonusFuncao: localizarColuna([
      "Bônus semanal da função",
      "Bonus semanal da funcao",
      "Bônus da função",
      "Bonus da funcao"
    ]),

    metaNps: localizarColuna([
      "Meta de NPS",
      "Meta NPS"
    ]),

    realizadoNps: localizarColuna([
      "NPS realizado",
      "Realizado NPS"
    ]),

    osAberta: localizarColuna([
      "O.S. em aberto (%)",
      "OS em aberto (%)",
      "O.S. em aberto",
      "OS em aberto"
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

  const modeloDireto =
    mapa.metaSemanal >= 0 &&
    mapa.realizadoSemanal >= 0;

  /*
   * NOVO MODELO DIRETO:
   * usa os mesmos campos do lançamento manual.
   *
   * Ticket, margem, NPS e O.S. são opcionais. Campo vazio
   * vira zero e não bloqueia a importação.
   */
  if (modeloDireto) {
    const brutos = [];

    if (mapa.vendedor < 0) {
      erros.push(
        'A coluna "Vendedor" não foi encontrada.'
      );
    }

    if (erros.length) {
      return {
        brutos,
        erros
      };
    }

    state.rows.forEach(
      (linha, indice) => {
        const vendedor =
          texto(
            valorLinha(
              linha,
              mapa.vendedor
            )
          );

        if (!vendedor) {
          return;
        }

        /*
         * Ignora textos auxiliares colocados abaixo da área de dados
         * no próprio modelo. Apenas linhas de participantes reais
         * seguem para análise.
         */
        const vendedorNormalizado =
          normalizar(
            vendedor
          );

        const linhaInstrucao =
          vendedorNormalizado.startsWith(
            "INSTRUCOES"
          ) ||
          vendedorNormalizado ===
            "CAMPO" ||
          [
            "VENDEDOR",
            "TICKET MEDIO",
            "MARGEM REALIZADA",
            "META NPS REALIZADO",
            "O S EM ABERTO",
            "CAMPOS VAZIOS"
          ].includes(
            vendedorNormalizado
          );

        if (linhaInstrucao) {
          return;
        }

        brutos.push({
          modeloDireto:
            true,
          linha:
            indice + 2,
          vendedor,
          cargoArquivo:
            texto(
              valorLinha(
                linha,
                mapa.cargo
              )
            ),
          filialArquivo:
            texto(
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
          dn:
            texto(
              valorLinha(
                linha,
                mapa.dn
              )
            ),
          metaSemanal:
            numero(
              valorLinha(
                linha,
                mapa.metaSemanal
              )
            ),
          realizadoSemanal:
            numero(
              valorLinha(
                linha,
                mapa.realizadoSemanal
              )
            ),
          ticketMedio:
            numero(
              valorLinha(
                linha,
                mapa.ticket
              )
            ),
          ticketMedioInformado:
            mapa.ticket >= 0 &&
            texto(
              valorLinha(
                linha,
                mapa.ticket
              )
            ) !== "",

          margem:
            numeroPercentual(
              valorLinha(
                linha,
                mapa.margem
              )
            ),
          margemInformada:
            mapa.margem >= 0 &&
            texto(
              valorLinha(
                linha,
                mapa.margem
              )
            ) !== "",

          bonusFuncao:
            numero(
              valorLinha(
                linha,
                mapa.bonusFuncao
              )
            ),

          metaNps:
            numero(
              valorLinha(
                linha,
                mapa.metaNps
              )
            ),
          metaNpsInformada:
            mapa.metaNps >= 0 &&
            texto(
              valorLinha(
                linha,
                mapa.metaNps
              )
            ) !== "",

          realizadoNps:
            numero(
              valorLinha(
                linha,
                mapa.realizadoNps
              )
            ),
          realizadoNpsInformado:
            mapa.realizadoNps >= 0 &&
            texto(
              valorLinha(
                linha,
                mapa.realizadoNps
              )
            ) !== "",

          osAbertaPercentual:
            numeroPercentual(
              valorLinha(
                linha,
                mapa.osAberta
              )
            ),
          osAbertaInformada:
            mapa.osAberta >= 0 &&
            texto(
              valorLinha(
                linha,
                mapa.osAberta
              )
            ) !== ""
        });
      }
    );

    return {
      brutos,
      erros,
      avisos: [
        "Modelo direto identificado. Campos vazios continuam sendo importados, mas agora ficam marcados como PENDENTES para que não gerem bonificação indevida."
      ]
    };
  }

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

    const competenciaArquivo =
      competenciaNormalizada(
        valorLinha(
          linha,
          mapa.competencia
        )
      );

    const item = {
      linha: indice + 2,

      /*
       * PRODUTIVOS SÃO MENSAIS:
       * a competência selecionada no modal é a fonte oficial.
       *
       * A planilha enviada por São Luís possuía:
       * 2026-07, 2026-08, 2026-09, 2026-10, 2026-12,
       * 2026-13, 2026-14 e 2026-16.
       *
       * A confirmação consultava somente 2026-07; por isso apenas
       * a primeira linha era localizada e as outras sete apareciam
       * como "não confirmadas".
       */
      competencia:
        state.competencia,

      competenciaArquivo,

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

  const competenciasArquivo =
    [
      ...new Set(
        brutos
          .map(
            item =>
              item.competenciaArquivo
          )
          .filter(Boolean)
      )
    ];

  const competenciasDivergentes =
    competenciasArquivo.filter(
      competencia =>
        competencia !==
        state.competencia
    );

  const avisos = [];

  if (
    competenciasDivergentes.length
  ) {
    avisos.push(
      [
        "A coluna Competência da planilha possuía meses diferentes ou inválidos.",
        `Todos os lançamentos foram ajustados automaticamente para ${state.competencia}, conforme a competência selecionada no importador.`,
        `Valores encontrados no arquivo: ${competenciasArquivo.join(", ")}.`
      ].join(" ")
    );
  }

  return {
    brutos,
    erros,
    avisos
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
  state.avisos =
    Array.isArray(
      resultado.avisos
    )
      ? [
          ...resultado.avisos
        ]
      : [];

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
  const nomeImportado =
    normalizar(
      item.vendedor ||
      item.colaborador
    );

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

  const exatos =
    candidatos.filter(funcionario =>
      normalizar(funcionario.nome) ===
        nomeImportado
    );

  if (exatos.length === 1) {
    return {
      status: "encontrado",
      funcionario:
        exatos[0],
      pontuacao: 1,
      segundo: null,
      correspondencia:
        "NOME EXATO"
    };
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

  /*
  nomeImportado já foi declarado no início desta função.
  A versão anterior o declarava novamente neste mesmo escopo,
  gerando o erro: redeclaration of const nomeImportado.
  */
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
    ...documento.data(),

    /*
    O ID verdadeiro do documento prevalece sobre qualquer
    campo "id" antigo salvo dentro do registro.
    */
    id: documento.id
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

function gerarLancamentosPixDireto(
  brutos,
  funcionarios
) {
  const gerados = [];
  const avisos = [];
  const erros = [];
  const reconciliacoes = [];

  brutos.forEach(item => {
    const resultado =
      encontrarMelhorFuncionario(
        funcionarios,
        item
      );

    let funcionario =
      resultado.funcionario;

    if (
      resultado.status ===
      "nao_encontrado"
    ) {
      const criacao =
        criarParticipanteTemporarioPix(
          item
        );

      if (!criacao.participante) {
        erros.push(
          criacao.erro
        );

        return;
      }

      funcionario =
        criacao.participante;

      funcionarios.push(
        funcionario
      );

      state.participantesParaCriar.push(
        funcionario
      );

      avisos.push(
        `Linha ${item.linha}: "${funcionario.nome}" será cadastrado automaticamente na base do Pix.`
      );
    }

    if (
      resultado.status ===
      "ambiguo"
    ) {
      erros.push(
        `Linha ${item.linha}: correspondência ambígua para "${item.vendedor}".`
      );
      return;
    }

    if (!funcionario) {
      erros.push(
        `Linha ${item.linha}: não foi possível definir o participante "${item.vendedor}".`
      );

      return;
    }

    const meta =
      numero(
        item.metaSemanal
      );

    const realizado =
      numero(
        item.realizadoSemanal
      );

    gerados.push({
      competencia:
        state.competencia,
      semana:
        Number(
          state.semana
        ),
      funcionarioId:
        funcionario.id,
      nome:
        funcionario.nome ||
        item.vendedor,
      nomeRelatorio:
        item.vendedor,
      filial:
        filialCanonicaPix(
          funcionario.filial ||
          item.filial ||
          item.filialArquivo ||
          state.filial,
          funcionario.dn ||
          item.dn ||
          "",
          funcionarios
        ),
      dn:
        limparEspacosPix(
          funcionario.dn ||
          item.dn ||
          ""
        ),
      cargo:
        funcionario.cargo ||
        item.cargoArquivo ||
        "",

      metaSemanal:
        meta,
      realizadoSemanal:
        realizado,
      percentualAtingimentoImportado:
        meta > 0
          ? realizado / meta * 100
          : 0,
      semMetaIndividual:
        meta <= 0,
      motivoNaoHabilitado:
        meta <= 0
          ? "SEM META SEMANAL INFORMADA"
          : "",

      ticketMedio:
        numero(
          item.ticketMedio
        ),
      ticketMedioInformado:
        item.ticketMedioInformado === true,

      margem:
        numeroPercentual(
          item.margem
        ),
      margemInformada:
        item.margemInformada === true,

      metaNps:
        numero(
          item.metaNps
        ),
      metaNpsInformada:
        item.metaNpsInformada === true,

      realizadoNps:
        numero(
          item.realizadoNps
        ),
      realizadoNpsInformado:
        item.realizadoNpsInformado === true,

      osAbertaPercentual:
        numeroPercentual(
          item.osAbertaPercentual
        ),
      osAbertaInformada:
        item.osAbertaInformada === true,

      bonusBaseImportado:
        numero(
          item.bonusFuncao
        ),

      origemImportacao:
        "MODELO DIRETO PIX",
      arquivoImportado:
        state.arquivo?.name ||
        "",
      abaImportada:
        state.aba ||
        "",
      importadoEm:
        new Date().toISOString(),
      regraImportacao:
        "MESMOS CAMPOS DO LANCAMENTO MANUAL"
    });

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
          item.vendedor,
        filial:
          funcionario.filial,
        cargo:
          funcionario.cargo,
        pontuacao:
          resultado.pontuacao
      });
    }
  });

  return {
    gerados,
    avisos,
    erros,
    reconciliacoes
  };
}

function gerarLancamentosPix(
  brutos,
  funcionarios
) {
  if (
    brutos.some(
      item =>
        item.modeloDireto ===
        true
    )
  ) {
    return gerarLancamentosPixDireto(
      brutos,
      funcionarios
    );
  }

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

    /*
    A base de participantes é a fonte oficial para:
    - filial;
    - DN;
    - cargo;
    - nome usado na apuração.

    A filial informada na planilha só é utilizada quando
    o cadastro ainda não possui filial.
    */
    const filial =
      funcionario.filial ||
      item.filial ||
      item.filialArquivo ||
      state.filial;

    const cargo =
      funcionario.cargo;

    const itemResolvido = {
      ...item,
      filial,
      dn:
        funcionario.dn ||
        item.dn ||
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
        funcionario.nome ||
        texto(item.vendedor),
      nomeRelatorio:
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
      ticketMedioInformado:
        true,

      /*
       * O relatório padrão do sistema não fornece estes campos.
       * As flags evitam confundir ausência com valor zero.
       *
       * Consultor Técnico não usa O.S., portanto a O.S. é marcada
       * como "não aplicável / resolvida" para não criar pendência falsa.
       */
      margem: 0,
      margemInformada: true,
      metaNps: 0,
      metaNpsInformada: false,
      realizadoNps: 0,
      realizadoNpsInformado: false,
      osAbertaPercentual: 0,
      osAbertaInformada: true,

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
        "RELATORIO SISTEMA PIX",
      arquivoImportado:
        state.arquivo?.name || "",
      abaImportada:
        state.aba || "",
      importadoEm:
        new Date().toISOString(),
      regraImportacao:
        "VLR ACUMULADO META | VLR TOTAL REALIZADO | TICKET MEDIO INDICADOR"
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
        percentualAtingimentoImportado:
          metaTotal > 0
            ? realizadoTotal /
              metaTotal *
              100
            : 0,
        semMetaIndividual:
          metaTotal <= 0,
        motivoNaoHabilitado:
          metaTotal <= 0
            ? "SEM META CONSOLIDADA DA FILIAL"
            : "",
        ticketMedio:
          ticket,
        ticketMedioInformado:
          ticket > 0,

        margem: 0,
        margemInformada: true,
        metaNps: 0,
        metaNpsInformada: false,
        realizadoNps: 0,
        realizadoNpsInformado: false,
        osAbertaPercentual: 0,

        /*
         * O relatório do sistema não possui O.S.
         * Supervisor de Assistência precisa informar O.S. manualmente na S4.
         * Orçamentista não usa O.S., então não deve receber alerta indevido.
         */
        osAbertaInformada:
          !CARGOS.supervisor.includes(
            normalizar(
              responsavel.cargo
            )
          ),

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
          "AGREGACAO AUTOMATICA DO RELATORIO PIX",
        arquivoImportado:
          state.arquivo?.name || "",
        abaImportada:
          state.aba || "",
        importadoEm:
          new Date().toISOString(),
        regraImportacao:
          "META MO + PECAS | REALIZADO MO + PECAS | TICKET DA FILIAL"
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

const FILIAIS_CANONICAS_PIX = [
  { dn: "4700", filial: "ANANINDEUA" },
  { dn: "4731", filial: "SÃO LUÍS" },
  { dn: "1960", filial: "BACABAL" },
  { dn: "4756", filial: "MACAPÁ" },
  { dn: "4730", filial: "TERESINA" },
  { dn: "4730", filial: "URUÇUÍ" },
  { dn: "1928", filial: "SINOP" },
  { dn: "4738", filial: "CUIABÁ" },
  { dn: "4738", filial: "ÁGUA BOA" },
  { dn: "4774", filial: "RONDONÓPOLIS" },
  { dn: "4977", filial: "PORTO VELHO" },
  { dn: "4977", filial: "JI-PARANÁ" },
  { dn: "1970", filial: "VILHENA" }
];

function limparEspacosPix(valor) {
  return String(valor || "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function filialCanonicaPix(
  filial,
  dn,
  funcionarios = []
) {
  const filialLimpa =
    limparEspacosPix(
      filial
    );

  const dnLimpo =
    limparEspacosPix(
      dn
    );

  const existente =
    funcionarios.find(
      funcionario =>
        normalizar(
          limparEspacosPix(
            funcionario.filial
          )
        ) ===
          normalizar(
            filialLimpa
          ) &&
        (
          !dnLimpo ||
          limparEspacosPix(
            funcionario.dn
          ) ===
            dnLimpo
        )
    );

  if (existente?.filial) {
    return limparEspacosPix(
      existente.filial
    );
  }

  const oficial =
    FILIAIS_CANONICAS_PIX.find(
      item =>
        normalizar(
          item.filial
        ) ===
          normalizar(
            filialLimpa
          ) &&
        (
          !dnLimpo ||
          item.dn ===
            dnLimpo
        )
    );

  if (oficial) {
    return oficial.filial;
  }

  return filialLimpa.toUpperCase();
}

function dadosMinimosParticipantePix(
  item
) {
  const dn =
    limparEspacosPix(
      item.dn
    );

  const filial =
    filialCanonicaPix(
      item.filial ||
      item.filialArquivo ||
      state.filial,
      dn,
      state.funcionariosCache
    );

  return {
    nome:
      limparEspacosPix(
        item.vendedor
      ),
    cargo:
      limparEspacosPix(
        item.cargoArquivo
      ),
    filial,
    dn
  };
}

function validarParticipanteNovoPix(
  item
) {
  const dados =
    dadosMinimosParticipantePix(
      item
    );

  const faltantes = [];

  if (!dados.nome) {
    faltantes.push(
      "Vendedor"
    );
  }

  if (!dados.cargo) {
    faltantes.push(
      "Cargo"
    );
  }

  if (!dados.filial) {
    faltantes.push(
      "Filial"
    );
  }

  if (!dados.dn) {
    faltantes.push(
      "DN"
    );
  }

  return {
    valido:
      faltantes.length === 0,
    faltantes,
    dados
  };
}

function criarParticipanteTemporarioPix(
  item
) {
  const validacao =
    validarParticipanteNovoPix(
      item
    );

  if (!validacao.valido) {
    return {
      participante:
        null,
      erro:
        `Linha ${item.linha}: "${item.vendedor}" não está cadastrado e não pôde ser criado porque faltam: ${validacao.faltantes.join(", ")}.`
    };
  }

  const dados =
    validacao.dados;

  const id =
    gerarIdDocumento(
      [
        "pix-participante",
        dados.nome,
        dados.filial,
        dados.dn
      ].join("|")
    );

  return {
    participante: {
      id,
      nome:
        dados.nome,
      cargo:
        dados.cargo,
      filial:
        dados.filial,
      dn:
        dados.dn,
      ativo:
        true,
      criadoPorImportacao:
        true
    },
    erro:
      ""
  };
}

async function salvarParticipantesNovosPix(
  participantes
) {
  const unicos =
    [
      ...new Map(
        participantes.map(
          participante => [
            participante.id,
            participante
          ]
        )
      ).values()
    ];

  if (!unicos.length) {
    return 0;
  }

  const lotes =
    dividirEmLotes(
      unicos,
      TAMANHO_LOTE
    );

  let criados = 0;

  for (
    let indice = 0;
    indice < lotes.length;
    indice += 1
  ) {
    state.progresso =
      `Criando participantes ${indice + 1}/${lotes.length}...`;

    renderizar();

    const batch =
      writeBatch(
        firestore
      );

    lotes[indice].forEach(
      participante => {
        batch.set(
          doc(
            firestore,
            CONFIG.pix.funcionarios,
            participante.id
          ),
          {
            nome:
              participante.nome,
            cargo:
              participante.cargo,
            filial:
              participante.filial,
            dn:
              participante.dn,
            ativo:
              true,
            criadoPorImportacao:
              true,
            criadoEm:
              serverTimestamp(),
            atualizadoEm:
              serverTimestamp()
          },
          {
            merge:
              true
          }
        );

        criados += 1;
      }
    );

    await comTimeout(
      batch.commit(),
      TIMEOUT_OPERACAO,
      "O Firebase demorou para criar os participantes do Pix."
    );
  }

  return criados;
}

async function analisarColaboradores() {
  if (
    state.analisando ||
    state.processando
  ) {
    return;
  }

  state.analisando = true;
  state.participantesParaCriar = [];
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

function valorComparavelPix(
  valor
) {
  return Math.round(
    numero(
      valor
    ) * 10000
  ) / 10000;
}

function lancamentoPixEhIgual(
  existente,
  novo
) {
  const camposTexto = [
    "funcionarioId",
    "competencia",
    "nome",
    "filial",
    "dn",
    "cargo"
  ];

  const camposNumero = [
    "semana",
    "metaSemanal",
    "realizadoSemanal",
    "ticketMedio",
    "margem",
    "metaNps",
    "realizadoNps",
    "osAbertaPercentual",
    "bonusBaseImportado"
  ];

  const camposBooleanosPresenca = [
    "ticketMedioInformado",
    "margemInformada",
    "metaNpsInformada",
    "realizadoNpsInformado",
    "osAbertaInformada"
  ];

  const textosIguais =
    camposTexto.every(
      campo =>
        normalizar(
          existente?.[campo]
        ) ===
        normalizar(
          novo?.[campo]
        )
    );

  const numerosIguais =
    camposNumero.every(
      campo =>
        valorComparavelPix(
          existente?.[campo]
        ) ===
        valorComparavelPix(
          novo?.[campo]
        )
    );

  const presencasIguais =
    camposBooleanosPresenca.every(
      campo => {
        const valorNovo =
          novo?.[campo];

        /*
         * Registros antigos podem não possuir as flags.
         * Se o novo registro também não trouxer flag, não alteramos
         * a lógica histórica. Quando a flag existe no novo arquivo,
         * ela passa a fazer parte da comparação.
         */
        if (
          valorNovo === undefined ||
          valorNovo === null
        ) {
          return true;
        }

        return Boolean(
          existente?.[campo]
        ) ===
        Boolean(
          valorNovo
        );
      }
    );

  return (
    textosIguais &&
    numerosIguais &&
    presencasIguais
  );
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
      lancamentoPixEhIgual(
        existente,
        registro
      )
    ) {
      ignorados += 1;

      state.avisos.push(
        `"${registro.nome}" foi ignorado porque já possui o mesmo lançamento em ${registro.competencia}, S${registro.semana}.`
      );

      return;
    }

    /*
     * Se já existe, mas algum valor mudou, sempre atualiza com
     * a informação mais recente do arquivo importado.
     */
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

async function aguardarApiOficialProdutivos(
  timeout = 15000
) {
  const inicio =
    Date.now();

  while (
    !window.produtivosLancamentos
      ?.salvarMuitos
  ) {
    if (
      Date.now() - inicio >
      timeout
    ) {
      throw new Error(
        "A API oficial dos lançamentos não foi carregada. Verifique se script.js está antes do importador no index.html."
      );
    }

    await new Promise(
      resolve =>
        window.setTimeout(
          resolve,
          100
        )
    );
  }

  return window.produtivosLancamentos;
}

async function salvarProdutivosFirebase() {
  state.progresso =
    "Preparando o mesmo fluxo do lançamento manual...";
  renderizar();

  const api =
    await aguardarApiOficialProdutivos();

  const nomeColecao =
    CONFIG.produtivos.lancamentos;

  const referenciaColecao =
    collection(
      firestore,
      nomeColecao
    );

  const consultaCompetencia =
    query(
      referenciaColecao,
      where(
        "competencia",
        "==",
        state.competencia
      )
    );

  const snapshotExistentes =
    await comTimeout(
      getDocs(
        consultaCompetencia
      ),
      TIMEOUT_OPERACAO,
      "O Firebase demorou para consultar os lançamentos da competência."
    );

  const mapaExistentes =
    new Map();

  snapshotExistentes.docs.forEach(
    documento => {
      const item = {
        id:
          documento.id,
        ...documento.data()
      };

      mapaExistentes.set(
        chaveLancamentoProdutivo(
          item
        ),
        item
      );
    }
  );

  const funcionariosPorId =
    new Map(
      state.funcionariosCache.map(
        funcionario => [
          String(
            funcionario.id
          ),
          funcionario
        ]
      )
    );

  const itensParaSalvar = [];

  let criados = 0;
  let atualizados = 0;
  let ignorados = 0;

  state.gerados.forEach(
    registro => {
      const funcionario =
        funcionariosPorId.get(
          String(
            registro.funcionarioId
          )
        );

      if (!funcionario) {
        throw new Error(
          `Funcionário não encontrado na base: ${registro.nome || registro.funcionarioId}.`
        );
      }

      const chave =
        chaveLancamentoProdutivo(
          registro
        );

      const existente =
        mapaExistentes.get(
          chave
        );

      const id =
        existente?.id ||
        gerarIdDocumento(
          [
            "produtivo",
            registro.funcionarioId,
            registro.competencia
          ].join("|")
        );

      const item = {
        id,
        idLocal:
          existente?.idLocal ||
          id,

        competencia:
          texto(
            registro.competencia
          ),

        funcionarioId:
          String(
            funcionario.id
          ),

        nome:
          texto(
            funcionario.nome
          ),

        filial:
          texto(
            funcionario.filial ||
            registro.filial
          ),

        dn:
          texto(
            funcionario.dn ||
            registro.dn
          ),

        cargo:
          texto(
            funcionario.cargo ||
            registro.cargo
          ),

        faturamento:
          numero(
            registro.faturamento
          ),

        horasDisponiveis:
          numero(
            registro.horasDisponiveis
          ),

        horasTrabalhadas:
          numero(
            registro.horasTrabalhadas
          ),

        horasVendidas:
          numero(
            registro.horasVendidas
          ),

        treinamentoPendente:
          Boolean(
            registro.treinamentoPendente
          ),

        osPrejuizo:
          Boolean(
            registro.osPrejuizo ||
            registro.retrabalho
          ),

        retrabalho:
          Boolean(
            registro.retrabalho ||
            registro.osPrejuizo
          ),

        automatico:
          false,

        origemImportacao:
          "RELATORIO SISTEMA",

        arquivoImportado:
          state.arquivo?.name ||
          "",

        abaImportada:
          state.aba ||
          ""
      };

      itensParaSalvar.push(
        item
      );

      if (existente) {
        atualizados += 1;
      } else {
        criados += 1;
      }
    }
  );

  if (!itensParaSalvar.length) {
    return {
      criados,
      atualizados,
      ignorados,
      confirmados: 0,
      destino:
        nomeColecao
    };
  }

  /*
   * A importação chama exatamente a mesma função
   * usada pelo botão Salvar lançamento.
   */
  await comTimeout(
    api.salvarMuitos(
      itensParaSalvar,
      {
        tamanhoGrupo: 15,

        onProgress({
          processados,
          total
        }) {
          state.progresso =
            `Salvando pelo fluxo oficial ${processados}/${total}...`;

          renderizar();
        }
      }
    ),
    TIMEOUT_OPERACAO,
    "O Firebase demorou para salvar os lançamentos pelo fluxo oficial."
  );

  state.progresso =
    "Confirmando os lançamentos gravados...";
  renderizar();

  const snapshotConfirmacao =
    await comTimeout(
      getDocs(
        consultaCompetencia
      ),
      TIMEOUT_OPERACAO,
      "O Firebase demorou para confirmar a importação."
    );

  const confirmados =
    new Map(
      snapshotConfirmacao.docs.map(
        documento => {
          const item = {
            id:
              documento.id,
            ...documento.data()
          };

          return [
            chaveLancamentoProdutivo(
              item
            ),
            item
          ];
        }
      )
    );

  const naoConfirmados =
    itensParaSalvar.filter(
      item =>
        !confirmados.has(
          chaveLancamentoProdutivo(
            item
          )
        )
    );

  if (naoConfirmados.length) {
    throw new Error(
      `${naoConfirmados.length} lançamento(s) não foram confirmados. Nenhum falso sucesso será exibido.`
    );
  }

  window.dispatchEvent(
    new CustomEvent(
      "produtivos:solicitar-atualizacao",
      {
        detail: {
          competencia:
            state.competencia
        }
      }
    )
  );

  return {
    criados,
    atualizados,
    ignorados,
    confirmados:
      itensParaSalvar.length,
    destino:
      nomeColecao
  };
}

async function confirmarImportacao() {
  if (
    state.processando ||
    state.analisando
  ) {
    return;
  }

  /*
  CORREÇÃO V17:
  O relatório pode conter algumas linhas que não foram localizadas,
  mas ainda possuir vários lançamentos válidos.

  Antes, qualquer item em state.erros bloqueava completamente o botão.
  Agora o sistema importa somente os lançamentos válidos e mantém as
  linhas problemáticas como avisos para conferência.
  */
  if (!state.gerados.length) {
    await alerta(
      "Nenhum lançamento foi gerado. Verifique os nomes, filiais e cargos."
    );

    return;
  }

  if (state.erros.length) {
    const mensagemParcial = [
      `${state.gerados.length} lançamento(s) válido(s) serão importados.`,
      `${state.erros.length} linha(s) com problema serão ignoradas.`,
      "",
      "Deseja continuar com a importação parcial?"
    ].join("\n");

    let continuar = true;

    if (
      window.CampanhaUI &&
      typeof window.CampanhaUI.confirm === "function"
    ) {
      continuar =
        await window.CampanhaUI.confirm(
          mensagemParcial,
          {
            titulo:
              "Importar somente linhas válidas?",
            textoConfirmar:
              "Continuar importação",
            textoCancelar:
              "Revisar arquivo"
          }
        );
    } else {
      continuar =
        window.confirm(
          mensagemParcial
        );
    }

    if (!continuar) {
      return;
    }
  }

  state.processando = true;
  state.progresso =
    "Preparando importação...";
  renderizar();

  let resultadoFinal = null;
  let nomesAtualizadosFinal = 0;
  let mensagemSucesso = "";

  try {
    let participantesCriadosFinal = 0;

    if (
      state.tipo ===
      "pix"
    ) {
      participantesCriadosFinal =
        await salvarParticipantesNovosPix(
          state.participantesParaCriar
        );
    }

    nomesAtualizadosFinal =
      await atualizarNomesBase(
        state.reconciliacoes
      );

    resultadoFinal =
      state.tipo === "pix"
        ? await salvarPixEmLotes()
        : await salvarProdutivosFirebase();

    resultadoFinal.participantesCriados =
      participantesCriadosFinal;

    state.progresso =
      "Concluído!";
    renderizar();

    const mensagem = [
      "Importação concluída com sucesso.",
      "",
      `${resultadoFinal.criados} criado(s)`,
      `${resultadoFinal.atualizados} atualizado(s)`,
      `${resultadoFinal.ignorados} duplicado(s) idêntico(s) ignorado(s)`,
      `${resultadoFinal.participantesCriados || 0} participante(s) criado(s) automaticamente`,
      `${nomesAtualizadosFinal} nome(s) atualizado(s) na base`,
      `${state.erros.length} linha(s) inválida(s) não importada(s)`,
      state.tipo === "produtivos"
        ? `Destino confirmado: ${resultadoFinal.destino}`
        : "Destino confirmado: pix_presidente_lancamentos"
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
        mensagemSucesso,
        {
          tipo:
            "success",
          titulo:
            "Importação concluída",
          rotulo:
            "Concluído"
        }
      );
    }, 80);

    if (
      state.tipo ===
      "produtivos"
    ) {
      /*
       * Não recarrega a página. O listener onSnapshot do script.js
       * recebe os documentos gravados e atualiza Lançamentos,
       * Apuração e Visão Geral automaticamente.
       */
      window.dispatchEvent(
        new CustomEvent(
          "produtivos:solicitar-atualizacao",
          {
            detail: {
              competencia:
                state.competencia
            }
          }
        )
      );
    }
  } catch (erro) {
    console.error(
      "[IMPORTAÇÃO INTELIGENTE]",
      erro
    );

    state.processando = false;
    state.progresso = "";
    renderizar();

    /*
     * Fecha a pré-visualização antes de abrir a mensagem.
     * Assim o gerente não precisa fechar manualmente o modal
     * para conseguir enxergar o erro.
     */
    fecharModal(true);

    await alerta(
      [
        "A importação não foi concluída.",
        "",
        erro.message ||
          "Erro desconhecido.",
        "",
        "Revise o arquivo e tente novamente."
      ].join("\n"),
      {
        tipo:
          "error",
        titulo:
          "Importação não concluída",
        rotulo:
          "Erro",
        textoConfirmar:
          "Entendi"
      }
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

const MODELO_PIX_DROPDOWNS_BASE64 =
  "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";

function base64ParaBlob(
  conteudoBase64,
  tipoMime
) {
  const binario =
    window.atob(
      conteudoBase64
    );

  const tamanhoBloco =
    1024;

  const partes = [];

  for (
    let inicio = 0;
    inicio < binario.length;
    inicio += tamanhoBloco
  ) {
    const bloco =
      binario.slice(
        inicio,
        inicio + tamanhoBloco
      );

    const bytes =
      new Uint8Array(
        bloco.length
      );

    for (
      let indice = 0;
      indice < bloco.length;
      indice += 1
    ) {
      bytes[indice] =
        bloco.charCodeAt(
          indice
        );
    }

    partes.push(
      bytes
    );
  }

  return new Blob(
    partes,
    {
      type:
        tipoMime
    }
  );
}

function baixarBlob(
  blob,
  nomeArquivo
) {
  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href =
    url;

  link.download =
    nomeArquivo;

  link.style.display =
    "none";

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  window.setTimeout(
    () =>
      URL.revokeObjectURL(
        url
      ),
    1500
  );
}

function baixarModelo(tipo) {
  /*
   * PIX DO PRESIDENTE
   *
   * O arquivo XLSX com dropdowns está incorporado diretamente
   * neste JavaScript. Portanto, não depende de existir um arquivo
   * separado na pasta do projeto e não gera erro 404.
   */
  if (
    tipo ===
    "pix"
  ) {
    try {
      const arquivo =
        base64ParaBlob(
          MODELO_PIX_DROPDOWNS_BASE64,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

      baixarBlob(
        arquivo,
        "MODELO-IMPORTACAO-PIX-COMPATIVEL.xlsx"
      );

      return;
    } catch (erro) {
      console.error(
        "Erro ao gerar o modelo do Pix:",
        erro
      );

      void alerta(
        "Não foi possível gerar o modelo de importação do Pix.",
        {
          tipo:
            "error",
          titulo:
            "Falha ao baixar modelo",
          rotulo:
            "Erro"
        }
      );

      return;
    }
  }

  /*
   * PRODUTIVOS
   *
   * Mantém exatamente o modelo atual gerado por JavaScript.
   */
  if (!window.XLSX) {
    alerta(
      "A biblioteca XLSX não foi carregada.",
      {
        tipo:
          "error",
        titulo:
          "Modelo indisponível",
        rotulo:
          "Erro"
      }
    );

    return;
  }

  const cabecalhos = [
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

  const exemplo = [
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
    "PRODUTIVOS"
  );

  XLSX.writeFile(
    livro,
    "modelo-importacao-produtivos.xlsx"
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

      /*
       * O campo Semana continua existindo internamente para o Pix,
       * mas fica totalmente oculto na importação mensal dos Produtivos.
       * O !important impede que display:grid da classe .irs-field
       * sobrescreva o atributo hidden.
       */
      .irs-field[hidden]{
        display:none !important
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
  const modalExistente =
    $("#irsModal");

  const modalCompleto =
    modalExistente &&
    $("#irsTitle") &&
    $("#irsCompetencia") &&
    $("#irsSemana") &&
    $("#irsFilial") &&
    $("#irsAba") &&
    $("#irsStrategy") &&
    $("#irsFile") &&
    $("#irsConfirm");

  /*
  Versões antigas podem ter deixado um modal incompleto no DOM.
  Nesse caso ele é removido e reconstruído integralmente.
  */
  if (modalExistente && !modalCompleto) {
    modalExistente.remove();
  }

  if (modalCompleto) {
    return modalExistente;
  }

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
                  Manter existentes e importar somente novos
                </option>

                <option value="atualizar">
                  Substituir lançamentos da mesma semana
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

  return $("#irsModal");
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

  if (
    state.tipo === "pix" &&
    state.gerados.length
  ) {
    const resumoGerados =
      state.gerados
        .slice(0, 12)
        .map(item => `
          <div class="irs-ok" style="margin-top:6px">
            <strong>${escapar(item.nome)}</strong>
            · ${escapar(item.filial)}
            · ${escapar(item.cargo)}
            · S${escapar(item.semana)}
            · Meta ${escapar(
              Number(item.metaSemanal || 0)
                .toLocaleString(
                  "pt-BR",
                  {
                    style: "currency",
                    currency: "BRL"
                  }
                )
            )}
            · Realizado ${escapar(
              Number(item.realizadoSemanal || 0)
                .toLocaleString(
                  "pt-BR",
                  {
                    style: "currency",
                    currency: "BRL"
                  }
                )
            )}
          </div>
        `)
        .join("");

    $("#irsPreview")
      .insertAdjacentHTML(
        "beforeend",
        `
          <div style="margin-top:12px">
            <strong>
              Lançamentos vinculados à base:
            </strong>
            ${resumoGerados}
          </div>
        `
      );
  }

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
        O nome do vendedor é localizado na base do Pix e o lançamento
        recebe automaticamente a filial, o DN e o cargo cadastrados.
        Ao importar novamente a mesma competência e semana, o lançamento
        existente é atualizado. Arquivos XLS antigos com valores reduzidos
        são corrigidos automaticamente para os valores monetários completos.
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

  /*
  O botão fica disponível sempre que houver pelo menos um
  lançamento válido. Erros de linhas específicas não bloqueiam
  a importação dos demais registros.
  */
  $("#irsConfirm").disabled =
    bloqueado ||
    state.gerados.length === 0;

  $("#irsConfirm").textContent =
    state.processando
      ? state.progresso ||
        "Importando..."
      : state.analisando
        ? "Analisando..."
        : (
            state.erros.length > 0 &&
            state.gerados.length > 0
              ? `Importar ${state.gerados.length} válido(s)`
              : "Confirmar importação"
          );

  $("#irsCancel").disabled =
    bloqueado;

  $("#irsClose").disabled =
    bloqueado;
}

function abrir(tipo) {
  try {
    const modal =
      garantirModal();

    if (!modal) {
      throw new Error(
        "O modal de importação não pôde ser criado."
      );
    }

    state.tipo = tipo;
    state.arquivo = null;
    state.workbook = null;
    state.aba = "";
    /*
     * Competência padrão por módulo:
     *
     * Pix do Presidente -> mês atual.
     * Produtivos        -> mês anterior.
     *
     * Esta escolha acontece apenas ao ABRIR a importação.
     * O usuário continua podendo alterar o campo normalmente.
     */
    state.competencia =
      competenciaPadraoImportacao(
        tipo
      );
    state.semana = 1;
    state.filial = "";
    state.estrategia =
      tipo === "pix"
        ? "atualizar"
        : "novos";
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
      state.estrategia;

    $("#irsFile").value =
      "";

    const campoSemana =
      $("#irsSemanaField");

    const ocultarSemana =
      tipo !== "pix";

    /*
     * Produtivos são mensais: o campo Semana não aparece.
     * Pix continua semanal e mantém o seletor normalmente.
     *
     * A propriedade hidden e o estilo inline são usados juntos
     * apenas como proteção visual. Nenhuma regra de processamento,
     * salvamento ou cálculo foi removida.
     */
    campoSemana.hidden =
      ocultarSemana;

    campoSemana.style.display =
      ocultarSemana
        ? "none"
        : "";

    $("#irsDescription").textContent =
      tipo === "pix"
        ? "O relatório deve conter Vlr. Acumulado, Vlr. Total, Ticket Médio, Objetivo M.O., Vlr. M.O., Objetivo Peças e Vlr. Peças."
        : "Arquivo com faturamento e horas dos produtivos.";

    renderizar();

    if (typeof modal.showModal !== "function") {
      throw new Error(
        "Este navegador não oferece suporte ao modal de importação."
      );
    }

    if (!modal.open) {
      modal.showModal();
    }

    console.info(
      `[IMPORTAÇÃO] Modal aberto para ${tipo}.`
    );

    return true;
  } catch (erro) {
    console.error(
      "[IMPORTAÇÃO] Não foi possível abrir o modal:",
      erro
    );

    alerta(
      erro.message ||
      "Não foi possível abrir a área de importação."
    );

    return false;
  }
}

function primeiroElemento(
  seletores = []
) {
  for (const seletor of seletores) {
    const elemento =
      document.querySelector(
        seletor
      );

    if (elemento) {
      return elemento;
    }
  }

  return null;
}

function localizarAreaInsercao(
  tipo
) {
  const configuracao =
    CONFIG[tipo];

  const botaoNovo =
    primeiroElemento(
      configuracao.botaoNovo
    );

  if (botaoNovo) {
    return {
      botaoNovo,
      container:
        botaoNovo.parentElement ||
        botaoNovo.closest(
          ".actions, .panel-actions, .panel-header, header"
        )
    };
  }

  const container =
    primeiroElemento(
      configuracao.headers
    );

  return {
    botaoNovo: null,
    container
  };
}

function vincularBotaoUmaVez(
  botao,
  chave,
  acao
) {
  if (!botao) return false;

  const atributo =
    `irsVinculado${chave}`;

  if (
    botao.dataset[atributo] ===
      "true"
  ) {
    return true;
  }

  botao.addEventListener(
    "click",
    acao
  );

  botao.dataset[atributo] =
    "true";

  return true;
}

function vincularBotoesFixos(
  tipo
) {
  const configuracao =
    CONFIG[tipo];

  const botaoImportar =
    document.querySelector(
      configuracao.botaoImportarFixo
    );

  const botaoModelo =
    document.querySelector(
      configuracao.botaoModeloFixo
    );

  /*
  Os cliques são tratados pela delegação global em capture.
  Aqui apenas confirmamos a presença dos botões.
  */
  return Boolean(
    botaoImportar &&
    botaoModelo
  );
}

function inserir(tipo) {
  /*
  CAMINHO PRINCIPAL E GARANTIDO:
  os botões já existem no index.html e aqui apenas recebem
  seus eventos. Assim eles não dependem da criação dinâmica.
  */
  if (
    vincularBotoesFixos(tipo)
  ) {
    return true;
  }

  /*
  FALLBACK:
  mantém compatibilidade com versões antigas do index.html.
  */
  const existente =
    document.querySelector(
      `[data-irs="${tipo}"]`
    );

  if (existente) {
    return true;
  }

  const {
    botaoNovo,
    container
  } =
    localizarAreaInsercao(
      tipo
    );

  if (!container) {
    return false;
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
      title="Baixar planilha modelo"
    >
      Baixar modelo
    </button>

    <button
      type="button"
      class="irs-btn irs-import"
      title="Importar relatório do sistema"
    >
      Importar relatório
    </button>
  `;

  if (
    botaoNovo &&
    botaoNovo.parentElement ===
      container
  ) {
    botaoNovo.insertAdjacentElement(
      "beforebegin",
      wrapper
    );
  } else {
    container.appendChild(
      wrapper
    );
  }

  wrapper
    .querySelector(".irs-model")
    .addEventListener(
      "click",
      () =>
        baixarModelo(tipo)
    );

  wrapper
    .querySelector(".irs-import")
    .addEventListener(
      "click",
      () =>
        abrir(tipo)
    );

  return true;
}

function observarAreaDeLancamentos() {
  if (
    window.__irsObserverAtivo
  ) {
    return;
  }

  window.__irsObserverAtivo =
    true;

  const observer =
    new MutationObserver(() => {
      inserir("pix");
      inserir("produtivos");
    });

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  window.__irsObserver =
    observer;
}


function configurarCliqueGlobalImportacao() {
  if (
    window.__importacaoCliqueGlobalConfigurado
  ) {
    return;
  }

  window.__importacaoCliqueGlobalConfigurado =
    true;

  document.addEventListener(
    "click",
    evento => {
      const botaoPix =
        evento.target.closest(
          "#btnImportarRelatorioPix"
        );

      const modeloPix =
        evento.target.closest(
          "#btnBaixarModeloRelatorioPix"
        );

      const botaoProdutivos =
        evento.target.closest(
          "#btnImportarRelatorioProdutivos"
        );

      const modeloProdutivos =
        evento.target.closest(
          "#btnBaixarModeloRelatorioProdutivos"
        );

      if (botaoPix) {
        evento.preventDefault();
        evento.stopPropagation();

        try {
          garantirCss();
          garantirModal();
          abrir("pix");
        } catch (erro) {
          console.error(
            "[IMPORTAÇÃO] Erro no clique do botão Pix:",
            erro
          );

          alerta(
            erro.message ||
            "Não foi possível abrir a importação do Pix."
          );
        }

        return;
      }

      if (modeloPix) {
        evento.preventDefault();
        evento.stopPropagation();
        baixarModelo("pix");
        return;
      }

      if (botaoProdutivos) {
        evento.preventDefault();
        evento.stopPropagation();
        abrir("produtivos");
        return;
      }

      if (modeloProdutivos) {
        evento.preventDefault();
        evento.stopPropagation();
        baixarModelo("produtivos");
      }
    },
    true
  );
}

function iniciar() {
  /*
  A API pública é criada antes de qualquer outra rotina.
  Assim os botões continuam funcionais mesmo que alguma
  inicialização secundária falhe.
  */
  window.importacaoRelatorioSistema = {
    abrirPix() {
      garantirCss();
      garantirModal();
      return abrir("pix");
    },

    abrirProdutivos() {
      garantirCss();
      garantirModal();
      return abrir("produtivos");
    },

    baixarModeloPix() {
      return baixarModelo("pix");
    },

    baixarModeloProdutivos() {
      return baixarModelo("produtivos");
    },

    restaurarBotoes() {
      return {
        pix: inserir("pix"),
        produtivos: inserir("produtivos")
      };
    },

    testarModalPix() {
      garantirCss();
      garantirModal();
      return abrir("pix");
    },

    diagnostico() {
      return {
        versao: VERSAO,
        xlsx: Boolean(window.XLSX),
        firestore: Boolean(firestore),
        pixBotaoImportar: Boolean(
          document.querySelector("#btnImportarRelatorioPix")
        ),
        pixBotaoModelo: Boolean(
          document.querySelector("#btnBaixarModeloRelatorioPix")
        ),
        modal: Boolean(document.querySelector("#irsModal")),
        modalCompleto: Boolean(
          document.querySelector("#irsModal") &&
          document.querySelector("#irsFile") &&
          document.querySelector("#irsConfirm")
        ),
        cliqueGlobal: Boolean(
          window.__importacaoCliqueGlobalConfigurado
        )
      };
    },

    analisar: analisarColaboradores,
    versao: VERSAO
  };

  configurarCliqueGlobalImportacao();

  try {
    garantirCss();
  } catch (erro) {
    console.error(
      "[IMPORTAÇÃO] Falha ao carregar CSS:",
      erro
    );
  }

  /*
  Os botões são vinculados antes da criação do modal.
  Portanto, mesmo se houver algum problema secundário no modal,
  a área de importação continua visível no sistema.
  */
  inserir("pix");
  inserir("produtivos");

  try {
    garantirModal();
  } catch (erro) {
    console.error(
      "[IMPORTAÇÃO] Falha ao criar modal:",
      erro
    );
  }

  try {
    observarAreaDeLancamentos();
  } catch (erro) {
    console.error(
      "[IMPORTAÇÃO] Falha ao iniciar observador:",
      erro
    );
  }

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
        tentativas >= 120
      ) {
        window.clearInterval(
          temporizador
        );
      }
    }, 250);



  console.info(
    `[IMPORTAÇÃO INTELIGENTE] ${VERSAO} carregado`
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