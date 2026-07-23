/*
===============================================================================
MÓDULO — CAMPANHA CENTRAL DE COMPRAS
Arquivo: compras-module.js
Versão: 2026.07.23-15
===============================================================================

INSTALAÇÃO NO INDEX.HTML

1. Garanta que a biblioteca XLSX esteja carregada:

<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>

2. Carregue este módulo DEPOIS de script.js, pix-presidente.js e module-switcher.js:

<script
  type="module"
  src="./compras-module.js?v=20260723-15"
></script>

O módulo é independente e não substitui nenhuma funcionalidade existente.

===============================================================================
REGRAS DA CAMPANHA

NOVO MODELO ABC POR NÚCLEO E CASA
- Reconhece a planilha com:
  Núcleo, Empresa_Abreviado, A, B, C e Total.
- Linhas "Total" do núcleo são ignoradas no cálculo.
- A média é calculada somente com as casas atendidas pelo colaborador.
- As casas são agrupadas por núcleo.
- Cada núcleo é avaliado separadamente:
  Curva A >= 95%;
  Curva B >= 90%.
- Se o colaborador atende mais de um núcleo e um ou vários atingem,
  ele recebe apenas uma vez R$ 300,00 na política A e uma vez
  R$ 300,00 na política B.
- Não existe multiplicação do bônus A/B pela quantidade de núcleos.
- A apuração e as exportações mostram as casas e as médias por núcleo.

NOMES COMPLETOS ATUALIZADOS
- Jéssica Alves de Jesus
- Rone César Praseres Chaves Filho
- Juliana Lima Martins
- Gabriel Campos Dias
- Rodrigo Santos da Silva
- A atualização altera somente o nome no Firestore e preserva
  todas as atribuições editadas de regiões e casas.


NOVA REGRA DE OBSOLESCÊNCIA — ESTOQUE ACIMA DE 365 DIAS
- Reconhece automaticamente a planilha Classificacao_Dias_Mo.
- Lê por unidade o Valor e o percentual da faixa "Maior que 365".
- Compara a competência atual com a competência imediatamente anterior.
- Redução = percentual anterior - percentual atual.
- Cada 1 ponto percentual reduzido paga R$ 60,00.
- Reduções fracionadas são calculadas proporcionalmente.
- Teto bonificado: 5 pontos percentuais.
- Bônus máximo por unidade: R$ 300,00.
- Redução zero ou aumento: bônus R$ 0,00.
- Primeira medição: sem bônus por ausência de histórico.
- Nova importação no mesmo mês substitui a evidência daquele mês.
- Meses anteriores permanecem preservados para comparação.


EXPORTAÇÃO COMPLETA DO MÓDULO COMPRAS
- Filtro: todos os responsáveis ou somente quem recebeu alguma bonificação.
- Excel inclui a aba de apuração e uma aba para cada evidência importada.
- PDF inclui a apuração e, nas páginas seguintes, as tabelas usadas na importação.
- As evidências são filtradas pela competência selecionada.
- Arquivos de outros meses não aparecem na impressão do mês atual.
- O PDF utiliza a janela de impressão do navegador para salvar em PDF.


CORREÇÃO GLOBAL DE FILIAIS FORA DA ALÇADA
- Siglas de estado são comparadas somente de forma exata.
- "MA" não corresponde mais a "MATO GROSSO".
- "PA" não é procurado dentro de nomes de unidades.
- Casas específicas usam prioridade pelo vínculo mais completo.
- "MÔNACO LEAPMOTOR - BELÉM" fica com Juliana, não com Gabriel.
- "FIAT PARÁ" e "FIAT CENTRO OESTE" ficam com Mykaela.
- "JEEP RAM - BARRA DO GARÇAS" fica com Juliana.
- A mesma correção é aplicada a todos os responsáveis atuais e futuros.
- Não é necessário importar novamente: a apuração é recalculada
  com os indicadores já salvos.


CORREÇÃO DEFINITIVA DA EDIÇÃO DE RESPONSÁVEIS
- O ID real do documento do Firestore agora sempre prevalece.
- Campos "id" antigos dentro dos documentos não podem mais desviar a edição.
- A edição atualiza o documento exibido, em vez de criar outro documento.
- Cadastros duplicados do mesmo nome são removidos automaticamente.
- O sistema lê novamente o Firestore e confirma regiões e unidades antes de fechar.
- O botão mostra "Salvando..." e exibe erro quando a persistência não for confirmada.


CORREÇÃO DA EDIÇÃO DE ATRIBUIÇÕES
- A configuração padrão não sobrescreve mais alterações feitas pelo usuário.
- Responsáveis padrão são criados apenas quando ainda não existem.
- Editar regiões e casas mantém o mesmo ID do colaborador.
- A interface é atualizada logo após salvar, sem recarregar os padrões.
- Para restaurar manualmente a configuração inicial, use:
  window.comprasModule.restaurarResponsaveisPadrao()


ALERTAS PREMIUM
- Remove o window.confirm nativo do navegador.
- Exclusão de apuração e responsável utiliza modal estilizado.
- Possui blur, animação, ícone, destaque de risco e layout responsivo.
- ESC, botão fechar, cancelar e clique fora encerram o modal.
- Nenhuma funcionalidade ou dado dos outros módulos é alterado.


CORREÇÃO DE DESAPARECIMENTO DO MÓDULO
- O menu é criado antes de qualquer consulta ao Firebase.
- Falha de permissão, rede ou coleção opcional não remove mais o módulo.
- Um MutationObserver recria o botão se outro script reconstruir a sidebar.
- A inicialização é protegida contra execução duplicada.
- O módulo expõe comprasModule.restaurarMenu() para diagnóstico manual.


CORREÇÃO DE ALÇADA E LIMPEZA DA APURAÇÃO
- Filiais específicas têm prioridade sobre a região geral.
- Gabriel e Rodrigo não recebem Leapmotor Belém, Jeep RAM, Fiat Pará
  ou Fiat Centro Oeste quando essas unidades estão atribuídas a outros.
- Comparações com região vazia foram bloqueadas.
- Linhas “Filtros aplicados”, filtros técnicos, CLASS_ABC e rodapés
  nunca entram na importação nem aparecem na apuração.
- Uma nova importação no mesmo mês e tipo remove a versão anterior
  antes de gravar a nova, sem afetar competências de outros meses.


CRUD E EVIDÊNCIAS DA APURAÇÃO
- Cada responsável possui ações Editar e Excluir na apuração mensal.
- Editar grava uma correção manual de bônus e status, sem alterar a planilha original.
- Excluir oculta somente a apuração do responsável naquele mês.
- Uma nova importação no mesmo mês remove correções/exclusões manuais e passa a ser a fonte oficial.
- A nova importação substitui os valores anteriores da mesma competência/unidade.
- Importações de meses diferentes são preservadas.
- A última planilha processada de cada competência e tipo fica salva como evidência,
  podendo ser baixada novamente na tela de Apuração.


DISTRIBUIÇÃO DEFINITIVA DOS RESPONSÁVEIS

JESSICA E RONE
- Regiões: MT e RO
- Casas: Sinop, Cuiabá, Rondonópolis, Porto Velho e Vilhena

GABRIEL E RODRIGO
- Regiões: PA, PI, MA e AP
- Casas: São Luís, Bacabal, Belém, Macapá e Teresina

JULIANA
- Responsabilidades: Jataí, Mineiros, Jeep RAM e Barra do Garças
- Casas específicas:
  - Monaco Veículos JEEP RAM - Barra do Garças-MT
  - Mônaco LEAPMOTOR - Belém

MYKAELA
- Núcleos: Fiat Pará e Fiat Centro Oeste
- Casas específicas:
  - BR
  - Doca
  - Altamira
  - Rondonópolis
  - Primavera do Leste

A função garantirResponsaveisPadrao atualiza automaticamente os cadastros
já existentes no Firestore, mantendo o mesmo ID de cada colaborador.


ATUALIZAÇÃO DA APURAÇÃO POR RESPONSÁVEL E REGIÃO
- A disponibilidade é apurada por Núcleo/região, e não mais globalmente.
- Cada Núcleo que atingir a política gera sua própria bonificação.
- Jessica e Rone recebem pelos Núcleos de MT/RO.
- Gabriel e Rodrigo recebem pelos Núcleos de PA/PI/MA/AP.
- Juliana recebe por Jataí, Mineiros, Jeep RAM e Barra do Garças.
- Mykaela recebe por BR, Doca, Altamira, Rondonópolis e Primavera do Leste.
- O Controle de O.S. continua geral para todos, pois o relatório possui
  apenas o percentual consolidado “AGUARDANDO PEÇAS - DEPTO COMPRAS”.


ATUALIZAÇÃO DO MODELO REAL
- Disponibilidade: importa tabela CLASS_ABC com A, B, C e Total.
- Para a campanha são avaliadas as curvas A e B.
- O sistema usa preferencialmente a linha Total oficial do relatório.
- Controle de O.S.: considera somente a linha
  "AGUARDANDO PEÇAS - DEPTO COMPRAS".
- Disponibilidade e Controle de O.S. são resultados gerais:
  quando a meta é atingida, a bonificação é aplicada a todos.

===============================================================================

DISPONIBILIDADE DE ESTOQUE
- Curva A >= 95%: R$ 300,00
- Curva B >= 90%: R$ 300,00

ÍNDICE DE OBSOLESCÊNCIA
- Redução em relação ao mês anterior: R$ 300,00
- Quanto menor o índice atual, melhor.
- É necessário existir histórico do mês anterior para pagar este indicador.

CONTROLE DE O.S.
- Percentual <= 10%: R$ 300,00

PREMIAÇÃO MÁXIMA
- R$ 1.200,00 por colaborador/mês.

===============================================================================
COLABORADORES E RESPONSABILIDADES INICIAIS
===============================================================================

- JESSICA: regiões MT e RO
- RONE: regiões MT e RO
- GABRIEL: regiões PA, PI, MA e AP
- RODRIGO: regiões PA, PI, MA e AP
- JULIANA: JATAI, MINEIROS, JEEP RAM e BARRA DO GARÇAS
- MYKAELA: BR, DOCA, ALTAMIRA, RONDONOPOLIS e PRIMAVERA DO LESTE

A base pode ser editada dentro do próprio módulo.
Unidades específicas possuem prioridade sobre regiões gerais.

===============================================================================
MODELO DE IMPORTAÇÃO
===============================================================================

O módulo aceita XLSX, XLS e CSV.

Importação consolidada:
Competencia
Nucleo
Unidade
Regiao
Disponibilidade A
Disponibilidade B
Indice Obsolescencia
Controle OS
Valor Estoque
Observacao

Também aceita arquivos separados:
- Disponibilidade
- Obsolescência
- Controle de O.S.

===============================================================================
*/

import { firestore } from "./firebase-config.js";

import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const VERSAO = "2026.07.23-15";
const TAMANHO_LOTE = 400;
const TIMEOUT_FIREBASE = 90000;

const COLECOES = {
  responsaveis: "compras_campanha_responsaveis",
  indicadores: "compras_campanha_indicadores",
  importacoes: "compras_campanha_importacoes",
  ajustes: "compras_campanha_ajustes_apuracao"
};

const POLITICA = {
  disponibilidadeA: {
    meta: 95,
    bonus: 300
  },
  disponibilidadeB: {
    meta: 90,
    bonus: 300
  },
  obsolescencia: {
    valorPorPercentual: 60,
    tetoPercentual: 5,
    bonusMaximo: 300
  },
  controleOs: {
    meta: 10,
    bonus: 300
  }
};

const RESPONSAVEIS_PADRAO = [
  {
    id: "jessica",
    nome: "JÉSSICA ALVES DE JESUS",
    regioes: [
      "MT",
      "RO",
      "D MATO GROSSO",
      "D RONDONIA"
    ],
    unidades: [
      "SINOP",
      "CUIABA",
      "RONDONOPOLIS",
      "PORTO VELHO",
      "VILHENA"
    ],
    ativo: true
  },
  {
    id: "rone",
    nome: "RONE CÉSAR PRASERES CHAVES FILHO",
    regioes: [
      "MT",
      "RO",
      "D MATO GROSSO",
      "D RONDONIA"
    ],
    unidades: [
      "SINOP",
      "CUIABA",
      "RONDONOPOLIS",
      "PORTO VELHO",
      "VILHENA"
    ],
    ativo: true
  },
  {
    id: "gabriel",
    nome: "GABRIEL CAMPOS DIAS",
    regioes: [
      "PA",
      "PI",
      "MA",
      "AP",
      "D PARA",
      "M PARA",
      "D PIAUI",
      "D MARANHAO",
      "M AMAPA"
    ],
    unidades: [
      "SAO LUIS",
      "BACABAL",
      "BELEM",
      "MACAPA",
      "TERESINA"
    ],
    ativo: true
  },
  {
    id: "rodrigo",
    nome: "RODRIGO SANTOS DA SILVA",
    regioes: [
      "PA",
      "PI",
      "MA",
      "AP",
      "D PARA",
      "M PARA",
      "D PIAUI",
      "D MARANHAO",
      "M AMAPA"
    ],
    unidades: [
      "SAO LUIS",
      "BACABAL",
      "BELEM",
      "MACAPA",
      "TERESINA"
    ],
    ativo: true
  },
  {
    id: "juliana",
    nome: "JULIANA LIMA MARTINS",
    regioes: [
      "JATAI",
      "MINEIROS",
      "JEEP RAM",
      "BARRA DO GARCAS"
    ],
    unidades: [
      "JATAI",
      "MINEIROS",
      "JEEP RAM",
      "BARRA DO GARCAS",
      "MONACO VEICULOS JEEP RAM BARRA DO GARCAS MT",
      "MONACO LEAPMOTOR BELEM"
    ],
    ativo: true
  },
  {
    id: "mykaela",
    nome: "MYKAELA",
    regioes: [
      "FIAT PARA",
      "FIAT CENTRO OESTE"
    ],
    unidades: [
      "BR",
      "DOCA",
      "ALTAMIRA",
      "RONDONOPOLIS",
      "PRIMAVERA DO LESTE",
      "FIAT PARA",
      "FIAT CENTRO OESTE"
    ],
    ativo: true
  }
];

const FILIAIS_SUGERIDAS = [
  "ANANINDEUA",
  "BELÉM",
  "BR",
  "DOCA",
  "ALTAMIRA",
  "SÃO LUÍS",
  "BACABAL",
  "TERESINA",
  "MACAPÁ",
  "CUIABÁ",
  "SINOP",
  "ÁGUA BOA",
  "RONDONÓPOLIS",
  "PRIMAVERA DO LESTE",
  "BARRA DO GARÇAS",
  "JATAÍ",
  "MINEIROS",
  "JEEP RAM",
  "PORTO VELHO",
  "VILHENA",
  "JI-PARANÁ"
];

const state = {
  view: "visao-geral",
  competencia: new Date().toISOString().slice(0, 7),
  responsaveis: [],
  indicadores: [],
  importacoes: [],
  ajustes: [],
  apuracao: [],
  importacao: {
    arquivo: null,
    workbook: null,
    aba: "",
    tipo: "auto",
    competencia: new Date().toISOString().slice(0, 7),
    headers: [],
    rows: [],
    registros: [],
    erros: [],
    avisos: [],
    formatoEspecial: "",
    processando: false
  },
  carregando: false,
  menuConfigurado: false,
  observerMenu: null,
  inicializado: false,
  exportacaoFiltro: "todos"
};

const $ = seletor => document.querySelector(seletor);
const $$ = seletor => [...document.querySelectorAll(seletor)];

function texto(valor) {
  return String(valor ?? "").trim();
}

function normalizar(valor) {
  return texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^\p{L}\p{N}%]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(valor) {
  return normalizar(valor)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 700);
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

function percentualNormalizado(valor) {
  const convertido = numero(valor);

  if (
    convertido > 0 &&
    convertido <= 1
  ) {
    return convertido * 100;
  }

  return convertido;
}

function moeda(valor) {
  return Number(valor || 0)
    .toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL"
      }
    );
}

function percentual(valor) {
  if (
    valor === null ||
    valor === undefined ||
    Number.isNaN(Number(valor))
  ) {
    return "—";
  }

  return `${Number(valor)
    .toLocaleString(
      "pt-BR",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )}%`;
}

function competenciaBr(valor) {
  const correspondencia =
    texto(valor).match(
      /^(\d{4})-(\d{2})$/
    );

  if (!correspondencia) {
    return texto(valor);
  }

  const data = new Date(
    Number(correspondencia[1]),
    Number(correspondencia[2]) - 1,
    1
  );

  return data.toLocaleDateString(
    "pt-BR",
    {
      month: "long",
      year: "numeric"
    }
  );
}

function competenciaAnterior(valor) {
  const correspondencia =
    texto(valor).match(
      /^(\d{4})-(\d{2})$/
    );

  if (!correspondencia) return "";

  const data = new Date(
    Number(correspondencia[1]),
    Number(correspondencia[2]) - 2,
    1
  );

  return [
    data.getFullYear(),
    String(
      data.getMonth() + 1
    ).padStart(2, "0")
  ].join("-");
}

function deslocarCompetencia(
  competencia,
  quantidade
) {
  const correspondencia =
    texto(competencia).match(
      /^(\d{4})-(\d{2})$/
    );

  if (!correspondencia) {
    return competencia;
  }

  const data = new Date(
    Number(correspondencia[1]),
    Number(correspondencia[2]) - 1 +
      quantidade,
    1
  );

  return [
    data.getFullYear(),
    String(
      data.getMonth() + 1
    ).padStart(2, "0")
  ].join("-");
}

function media(valores) {
  const validos =
    valores.filter(valor =>
      valor !== null &&
      valor !== undefined &&
      Number.isFinite(Number(valor))
    );

  if (!validos.length) {
    return null;
  }

  return validos.reduce(
    (soma, valor) =>
      soma + Number(valor),
    0
  ) / validos.length;
}

function somar(valores) {
  return valores.reduce(
    (soma, valor) =>
      soma + Number(valor || 0),
    0
  );
}

function comTimeout(
  promessa,
  tempo,
  mensagem
) {
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
      }, tempo);
    })
  ]);
}

function dividirEmLotes(
  lista,
  tamanho
) {
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

function alerta(mensagem) {
  if (window.CampanhaUI?.alert) {
    return window.CampanhaUI.alert(
      mensagem
    );
  }

  window.alert(mensagem);
  return Promise.resolve();
}

function toast(mensagem) {
  if (window.CampanhaUI?.toast) {
    window.CampanhaUI.toast(
      mensagem
    );

    return;
  }

  const elemento =
    $("#toast");

  if (!elemento) return;

  elemento.textContent =
    mensagem;

  elemento.classList.add(
    "show"
  );

  window.setTimeout(() => {
    elemento.classList.remove(
      "show"
    );
  }, 3500);
}

/* ==========================================================================
   FIREBASE
========================================================================== */

async function lerColecao(nome) {
  const snapshot =
    await comTimeout(
      getDocs(
        collection(
          firestore,
          nome
        )
      ),
      TIMEOUT_FIREBASE,
      `Não foi possível carregar ${nome}.`
    );

  return snapshot.docs.map(documento => ({
    ...documento.data(),

    /*
    O ID real do documento precisa vir por último.
    Algumas versões antigas salvaram um campo "id" incorreto
    dentro do documento. Esse campo estava sobrescrevendo
    documento.id e fazia a edição criar outro cadastro em vez
    de atualizar o cadastro exibido na tabela.
    */
    id: documento.id
  }));
}


async function lerColecaoOpcional(
  nome,
  valorPadrao = []
) {
  try {
    return await lerColecao(nome);
  } catch (erro) {
    console.warn(
      `[CAMPANHA COMPRAS] Coleção opcional indisponível: ${nome}`,
      erro
    );

    return valorPadrao;
  }
}

async function garantirResponsaveisPadrao() {
  const existentes =
    await lerColecao(
      COLECOES.responsaveis
    );

  const mapaPorId =
    new Map(
      existentes.map(item => [
        item.id,
        item
      ])
    );

  const batch =
    writeBatch(firestore);

  let possuiOperacao = false;

  RESPONSAVEIS_PADRAO.forEach(
    padrao => {
      const existente =
        mapaPorId.get(
          padrao.id
        );

      if (!existente) {
        batch.set(
          doc(
            firestore,
            COLECOES.responsaveis,
            padrao.id
          ),
          {
            ...padrao,
            criadoEm:
              serverTimestamp(),
            atualizadoEm:
              serverTimestamp()
          }
        );

        possuiOperacao = true;
        return;
      }

      /*
      Atualiza apenas o nome completo.
      Regiões, casas, status e demais atribuições editadas
      pelo usuário são preservadas.
      */
      if (
        normalizar(existente.nome) !==
        normalizar(padrao.nome)
      ) {
        batch.set(
          doc(
            firestore,
            COLECOES.responsaveis,
            existente.id
          ),
          {
            nome:
              padrao.nome,
            atualizadoEm:
              serverTimestamp()
          },
          {
            merge: true
          }
        );

        possuiOperacao = true;
      }
    }
  );

  if (possuiOperacao) {
    await comTimeout(
      batch.commit(),
      TIMEOUT_FIREBASE,
      "Não foi possível atualizar a base de responsáveis."
    );
  }

  return lerColecao(
    COLECOES.responsaveis
  );
}

async function salvarResponsavel(
  responsavel
) {
  const idDocumento =
    texto(responsavel.id) ||
    slug(responsavel.nome);

  const nomeNormalizado =
    normalizar(
      responsavel.nome
    );

  const dados = {
    ...responsavel,
    id:
      idDocumento,
    nome:
      nomeNormalizado,
    regioes:
      Array.isArray(
        responsavel.regioes
      )
        ? [
            ...new Set(
              responsavel.regioes
                .map(normalizar)
                .filter(Boolean)
            )
          ]
        : [],
    unidades:
      Array.isArray(
        responsavel.unidades
      )
        ? [
            ...new Set(
              responsavel.unidades
                .map(normalizar)
                .filter(Boolean)
            )
          ]
        : [],
    ativo:
      responsavel.ativo !== false,
    atualizadoEm:
      serverTimestamp()
  };

  await comTimeout(
    setDoc(
      doc(
        firestore,
        COLECOES.responsaveis,
        idDocumento
      ),
      dados,
      {
        merge: true
      }
    ),
    TIMEOUT_FIREBASE,
    "Não foi possível salvar as atribuições do responsável."
  );

  /*
  Limpa documentos duplicados do mesmo colaborador que possam
  ter sido criados pelas versões anteriores, quando o campo id
  interno sobrescrevia o ID real do Firestore.
  */
  const todos =
    await lerColecao(
      COLECOES.responsaveis
    );

  const duplicados =
    todos.filter(item =>
      item.id !== idDocumento &&
      normalizar(item.nome) ===
        nomeNormalizado
    );

  if (duplicados.length) {
    const lotes =
      dividirEmLotes(
        duplicados,
        TAMANHO_LOTE
      );

    for (const lote of lotes) {
      const batch =
        writeBatch(firestore);

      lote.forEach(item => {
        batch.delete(
          doc(
            firestore,
            COLECOES.responsaveis,
            item.id
          )
        );
      });

      await comTimeout(
        batch.commit(),
        TIMEOUT_FIREBASE,
        "As atribuições foram salvas, mas não foi possível remover cadastros duplicados."
      );
    }
  }

  const atualizados =
    await lerColecao(
      COLECOES.responsaveis
    );

  const salvo =
    atualizados.find(item =>
      item.id === idDocumento
    );

  if (!salvo) {
    throw new Error(
      "O Firebase não confirmou a atualização do responsável."
    );
  }

  state.responsaveis =
    atualizados;

  return salvo;
}


async function restaurarResponsaveisPadrao() {
  const confirmou =
    await confirmarPremium({
      titulo:
        "Restaurar atribuições padrão?",
      mensagem:
        "As regiões e casas de Jessica, Rone, Gabriel, Rodrigo, Juliana e Mykaela voltarão para a configuração inicial.",
      destaque:
        "As alterações personalizadas atuais serão substituídas.",
      textoConfirmar:
        "Restaurar padrões",
      textoCancelar:
        "Cancelar",
      tipo:
        "warning"
    });

  if (!confirmou) return;

  const batch =
    writeBatch(firestore);

  RESPONSAVEIS_PADRAO.forEach(item => {
    batch.set(
      doc(
        firestore,
        COLECOES.responsaveis,
        item.id
      ),
      {
        ...item,
        atualizadoEm:
          serverTimestamp()
      },
      {
        merge: true
      }
    );
  });

  await comTimeout(
    batch.commit(),
    TIMEOUT_FIREBASE,
    "Não foi possível restaurar as atribuições padrão."
  );

  await carregarDados();

  toast(
    "Atribuições padrão restauradas."
  );
}

async function excluirResponsavel(id) {
  await comTimeout(
    deleteDoc(
      doc(
        firestore,
        COLECOES.responsaveis,
        id
      )
    ),
    TIMEOUT_FIREBASE,
    "Não foi possível excluir o responsável."
  );
}

function chaveIndicador(
  competencia,
  unidade
) {
  return [
    competencia,
    slug(unidade)
  ].join("__");
}

async function salvarIndicadoresEmLote(
  registros,
  historicoImportacao
) {
  const competenciaImportada =
    historicoImportacao.competencia;

  const tipoImportado =
    registros[0]?.tipoImportacao ||
    historicoImportacao.tipo ||
    "consolidado";

  /*
  Antes de gravar a nova versão do mesmo mês e tipo, remove os
  registros antigos daquela importação. Isso elimina filiais que
  não existem mais no novo arquivo e linhas técnicas importadas
  em versões anteriores, sem afetar outros meses.
  */
  const indicadoresExistentes =
    await lerColecao(
      COLECOES.indicadores
    );

  const antigosDoMesmoTipo =
    indicadoresExistentes.filter(item =>
      item.competencia ===
        competenciaImportada &&
      (
        item.tipoImportacao ===
          tipoImportado ||
        (
          tipoImportado ===
            "disponibilidade" &&
          (
            item.disponibilidadeA !==
              undefined ||
            item.disponibilidadeB !==
              undefined
          )
        ) ||
        (
          tipoImportado === "os" &&
          item.controleOs !== undefined
        ) ||
        (
          tipoImportado ===
            "obsolescencia" &&
          item.indiceObsolescencia !==
            undefined
        )
      )
    );

  const lotesExclusao =
    dividirEmLotes(
      antigosDoMesmoTipo,
      TAMANHO_LOTE
    );

  for (const lote of lotesExclusao) {
    const batchExclusao =
      writeBatch(firestore);

    lote.forEach(item => {
      batchExclusao.delete(
        doc(
          firestore,
          COLECOES.indicadores,
          item.id
        )
      );
    });

    await comTimeout(
      batchExclusao.commit(),
      TIMEOUT_FIREBASE,
      "Não foi possível substituir os indicadores anteriores do mês."
    );
  }


  const lotes =
    dividirEmLotes(
      registros,
      TAMANHO_LOTE
    );

  for (
    let indice = 0;
    indice < lotes.length;
    indice += 1
  ) {
    const batch =
      writeBatch(firestore);

    lotes[indice].forEach(registro => {
      const referencia =
        doc(
          firestore,
          COLECOES.indicadores,
          chaveIndicador(
            registro.competencia,
            registro.unidade
          )
        );

      /*
      A chave competência + unidade faz uma nova importação
      do mesmo mês substituir os valores anteriores daquela
      unidade. Importações de meses diferentes são preservadas.
      */
      batch.set(
        referencia,
        {
          ...registro,
          atualizadoEm:
            serverTimestamp()
        },
        {
          merge: true
        }
      );
    });

    await comTimeout(
      batch.commit(),
      TIMEOUT_FIREBASE,
      "A gravação dos indicadores demorou mais do que o esperado."
    );
  }

  const tipoEvidencia =
    tipoImportado;

  /*
  Uma única evidência por competência + tipo.
  Nova importação no mesmo mês e tipo substitui a anterior.
  Quando o mês muda, a evidência anterior permanece salva.
  */
  const idImportacao =
    [
      historicoImportacao.competencia,
      slug(tipoEvidencia)
    ].join("__");

  await setDoc(
    doc(
      firestore,
      COLECOES.importacoes,
      idImportacao
    ),
    {
      id:
        idImportacao,
      ...historicoImportacao,
      tipoEfetivo:
        tipoEvidencia,
      registros:
        registros.map(registro => {
          const copia = {
            ...registro
          };

          delete copia.atualizadoEm;
          delete copia.criadoEm;

          return copia;
        }),
      substituiImportacaoAnterior:
        true,
      atualizadoEm:
        serverTimestamp()
    },
    {
      merge: false
    }
  );
}

/* ==========================================================================
   APURAÇÃO
========================================================================== */

function indicadorEhGlobal(
  indicador
) {
  return (
    indicador.aplicacaoGlobal === true ||
    indicador.aplicacaoGlobal === "true" ||
    [
      "GLOBAL",
      "GERAL",
      "TODAS",
      "TODAS AS UNIDADES",
      "__GLOBAL__"
    ].includes(
      normalizar(
        indicador.unidade ||
        indicador.nucleo
      )
    )
  );
}

function nomeUnidadeIndicador(
  indicador
) {
  return normalizar(
    indicador.unidade ||
    indicador.nucleo
  );
}

function indicadorInvalidoParaApuracao(
  indicador
) {
  const unidade =
    nomeUnidadeIndicador(
      indicador
    );

  if (!unidade) {
    return true;
  }

  const marcadoresInvalidos = [
    "FILTROS APLICADOS",
    "FILTRO APLICADO",
    "CLASS ABC",
    "QTD CONTABIL",
    "VALOR DINAMICO",
    "PERCENT PROJECAO",
    "TEM VALOR E SIM",
    "ANO MAIOR QUE",
    "EM BRANCO",
    "DES NUCLEO NAO E"
  ];

  return marcadoresInvalidos.some(
    marcador =>
      unidade.includes(marcador)
  );
}

function pontuacaoVinculoUnidade(
  unidade,
  alvo
) {
  const unidadeNormalizada =
    normalizar(unidade);

  const alvoNormalizado =
    normalizar(alvo);

  if (
    !unidadeNormalizada ||
    !alvoNormalizado
  ) {
    return 0;
  }

  if (
    unidadeNormalizada ===
    alvoNormalizado
  ) {
    return 10000 +
      alvoNormalizado.length;
  }

  /*
  Evita que siglas curtas como PA, PI, MA, AP, MT e RO
  sejam encontradas dentro de palavras como MATO, AMAPA,
  MARANHAO ou LEAPMOTOR.
  */
  if (alvoNormalizado.length <= 3) {
    return 0;
  }

  const tokensUnidade =
    unidadeNormalizada.split(" ");

  const tokensAlvo =
    alvoNormalizado.split(" ");

  const alvoComoSequencia =
    unidadeNormalizada.includes(
      alvoNormalizado
    );

  const todosTokensPresentes =
    tokensAlvo.every(token =>
      tokensUnidade.includes(token)
    );

  if (
    alvoComoSequencia ||
    todosTokensPresentes
  ) {
    return 1000 +
      alvoNormalizado.length;
  }

  return 0;
}

function unidadeCombinaComAlvo(
  unidade,
  alvo
) {
  return (
    pontuacaoVinculoUnidade(
      unidade,
      alvo
    ) > 0
  );
}

function responsaveisEspecificosDaUnidade(
  indicador
) {
  const unidade =
    nomeUnidadeIndicador(
      indicador
    );

  if (
    !unidade ||
    indicadorEhGlobal(indicador)
  ) {
    return [];
  }

  const candidatos =
    state.responsaveis
      .filter(responsavel =>
        responsavel.ativo !== false
      )
      .map(responsavel => {
        const pontuacao =
          Math.max(
            0,
            ...(responsavel.unidades || [])
              .map(alvo =>
                pontuacaoVinculoUnidade(
                  unidade,
                  alvo
                )
              )
          );

        return {
          responsavel,
          pontuacao
        };
      })
      .filter(item =>
        item.pontuacao > 0
      );

  if (!candidatos.length) {
    return [];
  }

  /*
  Somente o vínculo mais específico prevalece.

  Exemplo:
  - Gabriel possui "BELÉM".
  - Juliana possui "MÔNACO LEAPMOTOR BELÉM".
  Para a unidade "MÔNACO LEAPMOTOR - BELÉM", Juliana vence
  porque o alvo dela é mais específico.
  */
  const maiorPontuacao =
    Math.max(
      ...candidatos.map(item =>
        item.pontuacao
      )
    );

  return candidatos
    .filter(item =>
      item.pontuacao ===
        maiorPontuacao
    )
    .map(item =>
      item.responsavel
    );
}

function unidadeCorresponde(
  responsavel,
  indicador
) {
  if (
    indicadorInvalidoParaApuracao(
      indicador
    )
  ) {
    return false;
  }

  if (indicadorEhGlobal(indicador)) {
    return true;
  }

  const unidade =
    nomeUnidadeIndicador(
      indicador
    );

  const regiao =
    normalizar(
      indicador.regiao
    );

  const unidadesResponsavel =
    (responsavel.unidades || [])
      .map(normalizar)
      .filter(Boolean);

  const regioesResponsavel =
    (responsavel.regioes || [])
      .map(normalizar)
      .filter(Boolean);

  /*
  CASAS ESPECÍFICAS TÊM PRIORIDADE ABSOLUTA.
  Somente os responsáveis com o vínculo específico de maior
  pontuação recebem a unidade.
  */
  const responsaveisEspecificos =
    responsaveisEspecificosDaUnidade(
      indicador
    );

  if (responsaveisEspecificos.length) {
    return responsaveisEspecificos.some(
      item =>
        item.id === responsavel.id ||
        normalizar(item.nome) ===
          normalizar(responsavel.nome)
    );
  }

  const correspondeUnidade =
    unidadesResponsavel.some(alvo =>
      unidadeCombinaComAlvo(
        unidade,
        alvo
      )
    );

  if (correspondeUnidade) {
    return true;
  }

  if (!regiao) {
    return false;
  }

  /*
  CORREÇÃO PRINCIPAL:
  região agora é comparada de forma exata.

  Antes:
  "D MATO GROSSO".includes("MA") === true

  Isso fazia Gabriel/RODRIGO receberem Mato Grosso por terem
  a sigla MA na lista. Também podia misturar AP com AMAPÁ,
  PA com palavras e outros casos semelhantes.
  */
  return regioesResponsavel.some(alvo =>
    regiao === alvo
  );
}

function obterValoresIndicador(
  responsavel,
  competencia,
  campo
) {
  if (campo === "controleOs") {
    const globais =
      state.indicadores.filter(
        indicador =>
          indicador.competencia ===
            competencia &&
          indicadorEhGlobal(indicador) &&
          indicador[campo] !== null &&
          indicador[campo] !== undefined
      );

    if (globais.length) {
      return globais.map(item =>
        item[campo]
      );
    }
  }

  return state.indicadores
    .filter(
      indicador =>
        indicador.competencia ===
          competencia &&
        !indicadorEhGlobal(indicador) &&
        !indicadorInvalidoParaApuracao(indicador) &&
        unidadeCorresponde(
          responsavel,
          indicador
        ) &&
        indicador[campo] !== null &&
        indicador[campo] !== undefined
    )
    .map(item => item[campo]);
}

function obterIndicadoresResponsavel(
  responsavel,
  competencia
) {
  const globais =
    state.indicadores.filter(
      indicador =>
        indicador.competencia ===
          competencia &&
        indicadorEhGlobal(indicador)
    );

  const regionais =
    state.indicadores.filter(
      indicador =>
        indicador.competencia ===
          competencia &&
        !indicadorEhGlobal(indicador) &&
        !indicadorInvalidoParaApuracao(indicador) &&
        unidadeCorresponde(
          responsavel,
          indicador
        )
    );

  return [
    ...globais,
    ...regionais
  ];
}


function calcularBonusObsolescencia(
  percentualAnterior,
  percentualAtual
) {
  const anterior =
    Number(percentualAnterior);

  const atual =
    Number(percentualAtual);

  if (
    !Number.isFinite(anterior) ||
    !Number.isFinite(atual)
  ) {
    return {
      possuiHistorico: false,
      reducao: null,
      reducaoBonificada: 0,
      bonus: 0,
      status: "PRIMEIRA MEDIÇÃO"
    };
  }

  const reducao =
    anterior - atual;

  if (reducao <= 0) {
    return {
      possuiHistorico: true,
      reducao,
      reducaoBonificada: 0,
      bonus: 0,
      status:
        reducao < 0
          ? "AUMENTOU"
          : "SEM REDUÇÃO"
    };
  }

  const reducaoBonificada =
    Math.min(
      reducao,
      POLITICA.obsolescencia
        .tetoPercentual
    );

  const bonus =
    Math.min(
      reducaoBonificada *
        POLITICA.obsolescencia
          .valorPorPercentual,
      POLITICA.obsolescencia
        .bonusMaximo
    );

  return {
    possuiHistorico: true,
    reducao,
    reducaoBonificada,
    bonus:
      Math.round(
        bonus * 100
      ) / 100,
    status:
      reducao >=
        POLITICA.obsolescencia
          .tetoPercentual
        ? "TETO ATINGIDO"
        : "REDUZIU"
  };
}

function calcularApuracaoResponsavel(
  responsavel,
  competencia
) {
  const anteriorCompetencia =
    competenciaAnterior(
      competencia
    );

  const atuais =
    state.indicadores.filter(
      indicador =>
        indicador.competencia ===
          competencia &&
        !indicadorEhGlobal(indicador) &&
        !indicadorInvalidoParaApuracao(
          indicador
        ) &&
        unidadeCorresponde(
          responsavel,
          indicador
        )
    );

  const anteriores =
    state.indicadores.filter(
      indicador =>
        indicador.competencia ===
          anteriorCompetencia &&
        !indicadorEhGlobal(indicador) &&
        !indicadorInvalidoParaApuracao(
          indicador
        ) &&
        unidadeCorresponde(
          responsavel,
          indicador
        )
    );

  const mapaAnterior =
    new Map(
      anteriores.map(item => [
        normalizar(
          item.unidade ||
          item.nucleo
        ),
        item
      ])
    );

  /*
  DETALHAMENTO DE OBSOLESCÊNCIA POR CASA
  Mantém a regra mensal de redução acima de 365 dias.
  */
  const detalhesUnidades =
    atuais.map(item => {
      const anterior =
        mapaAnterior.get(
          normalizar(
            item.unidade ||
            item.nucleo
          )
        );

      const calculoObsolescencia =
        calcularBonusObsolescencia(
          anterior?.indiceObsolescencia,
          item.indiceObsolescencia
        );

      return {
        unidade:
          item.unidade ||
          item.nucleo,
        nucleo:
          item.nucleo ||
          item.regiao ||
          item.unidade,
        regiao:
          item.regiao || "",

        disponibilidadeA:
          item.disponibilidadeA,
        disponibilidadeB:
          item.disponibilidadeB,
        disponibilidadeC:
          item.disponibilidadeC,
        disponibilidadeTotal:
          item.disponibilidadeTotal,

        obsolescenciaAtual:
          item.indiceObsolescencia,
        obsolescenciaAnterior:
          anterior?.indiceObsolescencia ??
          null,
        reducaoObsolescencia:
          calculoObsolescencia.reducao,
        reducaoBonificada:
          calculoObsolescencia
            .reducaoBonificada,
        statusObsolescencia:
          calculoObsolescencia.status,
        possuiHistoricoObsolescencia:
          calculoObsolescencia
            .possuiHistorico,
        reduziuObsolescencia:
          calculoObsolescencia.reducao !==
            null &&
          calculoObsolescencia.reducao > 0,
        bonusObsolescencia:
          calculoObsolescencia.bonus
      };
    });

  /*
  DISPONIBILIDADE ABC POR NÚCLEO

  1. Reúne somente as casas que pertencem ao colaborador.
  2. Agrupa as casas pelo Núcleo.
  3. Calcula a média A e B das casas atendidas naquele Núcleo.
  4. Verifica se cada Núcleo atingiu a política.
  5. Mesmo que dois ou mais Núcleos atinjam, paga A e B
     apenas uma vez por colaborador no mês.
  */
  const registrosDisponibilidade =
    detalhesUnidades.filter(item =>
      item.disponibilidadeA !==
        null &&
      item.disponibilidadeA !==
        undefined
    );

  const gruposNucleos =
    new Map();

  registrosDisponibilidade.forEach(
    item => {
      const nomeNucleo =
        texto(
          item.nucleo ||
          item.regiao ||
          "SEM NÚCLEO"
        );

      const chave =
        normalizar(
          nomeNucleo
        );

      if (!gruposNucleos.has(chave)) {
        gruposNucleos.set(
          chave,
          {
            nucleo:
              nomeNucleo,
            casas: []
          }
        );
      }

      gruposNucleos
        .get(chave)
        .casas
        .push(item);
    }
  );

  const detalhesNucleosDisponibilidade =
    [...gruposNucleos.values()]
      .map(grupo => {
        const mediaA =
          media(
            grupo.casas.map(item =>
              item.disponibilidadeA
            )
          );

        const mediaB =
          media(
            grupo.casas.map(item =>
              item.disponibilidadeB
            )
          );

        const mediaC =
          media(
            grupo.casas.map(item =>
              item.disponibilidadeC
            )
          );

        const mediaTotal =
          media(
            grupo.casas.map(item =>
              item.disponibilidadeTotal
            )
          );

        const atingiuA =
          mediaA !== null &&
          mediaA >=
            POLITICA
              .disponibilidadeA
              .meta;

        const atingiuB =
          mediaB !== null &&
          mediaB >=
            POLITICA
              .disponibilidadeB
              .meta;

        return {
          nucleo:
            grupo.nucleo,
          casas:
            grupo.casas.map(item =>
              item.unidade
            ),
          quantidadeCasas:
            grupo.casas.length,
          mediaA,
          mediaB,
          mediaC,
          mediaTotal,
          atingiuA,
          atingiuB
        };
      });

  const atingiuA =
    detalhesNucleosDisponibilidade
      .some(item =>
        item.atingiuA
      );

  const atingiuB =
    detalhesNucleosDisponibilidade
      .some(item =>
        item.atingiuB
      );

  /*
  Pagamento único por política:
  - A: no máximo R$ 300 no mês.
  - B: no máximo R$ 300 no mês.
  */
  const bonusA =
    atingiuA
      ? POLITICA
          .disponibilidadeA
          .bonus
      : 0;

  const bonusB =
    atingiuB
      ? POLITICA
          .disponibilidadeB
          .bonus
      : 0;

  const bonusObsolescencia =
    somar(
      detalhesUnidades.map(item =>
        item.bonusObsolescencia
      )
    );

  const controleOs =
    media(
      state.indicadores
        .filter(
          indicador =>
            indicador.competencia ===
              competencia &&
            indicadorEhGlobal(
              indicador
            ) &&
            indicador.controleOs !==
              null &&
            indicador.controleOs !==
              undefined
        )
        .map(item =>
          item.controleOs
        )
    );

  const atingiuOs =
    controleOs !== null &&
    controleOs <=
      POLITICA.controleOs.meta;

  const bonusOs =
    atingiuOs
      ? POLITICA.controleOs.bonus
      : 0;

  const bonusTotal =
    bonusA +
    bonusB +
    bonusObsolescencia +
    bonusOs;

  const unidadesComObsolescencia =
    detalhesUnidades.filter(item =>
      item.obsolescenciaAtual !==
        null &&
      item.obsolescenciaAtual !==
        undefined
    );

  const reducoesObsolescencia =
    unidadesComObsolescencia.filter(
      item =>
        item.reduziuObsolescencia
    ).length;

  const possuiDisponibilidade =
    detalhesNucleosDisponibilidade
      .length > 0;

  const indicadoresAtingidos =
    Number(
      possuiDisponibilidade &&
      atingiuA
    ) +
    Number(
      possuiDisponibilidade &&
      atingiuB
    ) +
    reducoesObsolescencia +
    Number(atingiuOs);

  const totalMetasPossiveis =
    (
      possuiDisponibilidade
        ? 2
        : 0
    ) +
    unidadesComObsolescencia.length +
    (
      controleOs !== null
        ? 1
        : 0
    );

  const status =
    totalMetasPossiveis > 0 &&
    indicadoresAtingidos ===
      totalMetasPossiveis
      ? "COMPLETO"
      : indicadoresAtingidos > 0
        ? "PARCIAL"
        : "NÃO ATINGIU";

  const disponibilidadeA =
    media(
      registrosDisponibilidade.map(
        item =>
          item.disponibilidadeA
      )
    );

  const disponibilidadeB =
    media(
      registrosDisponibilidade.map(
        item =>
          item.disponibilidadeB
      )
    );

  const obsolescenciaAtual =
    media(
      unidadesComObsolescencia.map(
        item =>
          item.obsolescenciaAtual
      )
    );

  const obsolescenciaAnterior =
    media(
      unidadesComObsolescencia.map(
        item =>
          item.obsolescenciaAnterior
      )
    );

  return {
    responsavelId:
      responsavel.id,
    nome:
      responsavel.nome,
    competencia,
    competenciaAnterior:
      anteriorCompetencia,

    unidadesAvaliadas:
      detalhesUnidades.map(item =>
        item.unidade
      ),

    quantidadeUnidades:
      detalhesUnidades.length,

    detalhesUnidades,
    detalhesNucleosDisponibilidade,

    disponibilidadeA,
    disponibilidadeB,
    obsolescenciaAtual,
    obsolescenciaAnterior,

    diferencaObsolescencia:
      obsolescenciaAtual !== null &&
      obsolescenciaAnterior !== null
        ? obsolescenciaAnterior -
          obsolescenciaAtual
        : null,

    controleOs,
    atingiuA,
    atingiuB,
    reduziuObsolescencia:
      reducoesObsolescencia > 0,
    atingiuOs,

    bonusA,
    bonusB,
    bonusObsolescencia,
    bonusOs,
    bonusTotal,

    indicadoresAtingidos,
    totalMetasPossiveis,
    status
  };
}


function chaveAjusteApuracao(
  competencia,
  responsavelId
) {
  return [
    competencia,
    responsavelId
  ].join("__");
}

function obterAjusteApuracao(
  competencia,
  responsavelId
) {
  return state.ajustes.find(item =>
    item.competencia === competencia &&
    item.responsavelId === responsavelId
  ) || null;
}

function aplicarAjusteApuracao(
  apuracao
) {
  const ajuste =
    obterAjusteApuracao(
      apuracao.competencia,
      apuracao.responsavelId
    );

  if (!ajuste) {
    return apuracao;
  }

  if (
    ajuste.excluida === true ||
    ajuste.excluida === "true"
  ) {
    return {
      ...apuracao,
      excluida: true,
      ajusteManual: true,
      observacaoAjuste:
        ajuste.observacao || ""
    };
  }

  const bonusA =
    ajuste.bonusA !== undefined
      ? Number(ajuste.bonusA || 0)
      : apuracao.bonusA;

  const bonusB =
    ajuste.bonusB !== undefined
      ? Number(ajuste.bonusB || 0)
      : apuracao.bonusB;

  const bonusObsolescencia =
    ajuste.bonusObsolescencia !== undefined
      ? Number(
          ajuste.bonusObsolescencia || 0
        )
      : apuracao.bonusObsolescencia;

  const bonusOs =
    ajuste.bonusOs !== undefined
      ? Number(ajuste.bonusOs || 0)
      : apuracao.bonusOs;

  return {
    ...apuracao,
    bonusA,
    bonusB,
    bonusObsolescencia,
    bonusOs,
    bonusTotal:
      bonusA +
      bonusB +
      bonusObsolescencia +
      bonusOs,
    status:
      ajuste.status ||
      "AJUSTADO",
    ajusteManual: true,
    observacaoAjuste:
      ajuste.observacao || ""
  };
}

async function salvarAjusteApuracao(
  dados
) {
  const id =
    chaveAjusteApuracao(
      dados.competencia,
      dados.responsavelId
    );

  await comTimeout(
    setDoc(
      doc(
        firestore,
        COLECOES.ajustes,
        id
      ),
      {
        ...dados,
        id,
        atualizadoEm:
          serverTimestamp()
      },
      {
        merge: true
      }
    ),
    TIMEOUT_FIREBASE,
    "Não foi possível salvar a correção da apuração."
  );
}

async function excluirApuracaoResponsavel(
  apuracao
) {
  await salvarAjusteApuracao({
    competencia:
      apuracao.competencia,
    responsavelId:
      apuracao.responsavelId,
    nome:
      apuracao.nome,
    excluida:
      true,
    observacao:
      "Apuração excluída manualmente."
  });
}

async function limparAjustesCompetencia(
  competencia
) {
  const ajustes =
    state.ajustes.filter(item =>
      item.competencia === competencia
    );

  if (!ajustes.length) return;

  const lotes =
    dividirEmLotes(
      ajustes,
      TAMANHO_LOTE
    );

  for (const lote of lotes) {
    const batch =
      writeBatch(firestore);

    lote.forEach(item => {
      batch.delete(
        doc(
          firestore,
          COLECOES.ajustes,
          item.id ||
            chaveAjusteApuracao(
              item.competencia,
              item.responsavelId
            )
        )
      );
    });

    await comTimeout(
      batch.commit(),
      TIMEOUT_FIREBASE,
      "Não foi possível limpar os ajustes do mês."
    );
  }

  state.ajustes =
    state.ajustes.filter(item =>
      item.competencia !== competencia
    );
}


function auditarVinculosApuracao() {
  const competencia =
    state.competencia;

  const conflitos = [];

  state.indicadores
    .filter(indicador =>
      indicador.competencia ===
        competencia &&
      !indicadorEhGlobal(indicador) &&
      !indicadorInvalidoParaApuracao(
        indicador
      )
    )
    .forEach(indicador => {
      const vinculados =
        state.responsaveis
          .filter(responsavel =>
            responsavel.ativo !== false &&
            unidadeCorresponde(
              responsavel,
              indicador
            )
          )
          .map(item =>
            item.nome
          );

      if (!vinculados.length) {
        conflitos.push({
          tipo:
            "SEM_RESPONSAVEL",
          unidade:
            indicador.unidade ||
            indicador.nucleo,
          regiao:
            indicador.regiao || ""
        });
      }
    });

  if (conflitos.length) {
    console.warn(
      "[CAMPANHA COMPRAS] Auditoria de vínculos:",
      conflitos
    );
  }

  return conflitos;
}

function recalcularApuracao() {
  state.apuracao =
    state.responsaveis
      .filter(item =>
        item.ativo !== false
      )
      .map(responsavel =>
        calcularApuracaoResponsavel(
          responsavel,
          state.competencia
        )
      )
      .map(aplicarAjusteApuracao)
      .filter(item =>
        item.excluida !== true
      );

  /*
  A auditoria usa a mesma regra para Jessica, Rone, Gabriel,
  Rodrigo, Juliana, Mykaela e qualquer novo responsável.
  */
  auditarVinculosApuracao();
}

/* ==========================================================================
   IMPORTAÇÃO
========================================================================== */

function localizarColuna(
  aliases
) {
  const headers =
    state.importacao.headers
      .map(normalizar);

  for (const alias of aliases) {
    const alvo =
      normalizar(alias);

    let indice =
      headers.findIndex(
        cabecalho =>
          cabecalho === alvo
      );

    if (indice >= 0) {
      return indice;
    }

    indice =
      headers.findIndex(
        cabecalho =>
          cabecalho.includes(alvo) ||
          alvo.includes(cabecalho)
      );

    if (indice >= 0) {
      return indice;
    }
  }

  return -1;
}

function valorLinha(
  linha,
  indice
) {
  return indice >= 0
    ? linha[indice] ?? ""
    : "";
}

function mapaImportacao() {
  return {
    competencia:
      localizarColuna([
        "Competencia",
        "Competência",
        "Mes",
        "Mês",
        "Periodo",
        "Período"
      ]),

    nucleo:
      localizarColuna([
        "Nucleo",
        "Núcleo",
        "Grupo",
        "Empresa"
      ]),

    unidade:
      localizarColuna([
        "Unidade",
        "Filial",
        "Loja",
        "Casa",
        "Nucleo",
        "Núcleo"
      ]),

    regiao:
      localizarColuna([
        "Regiao",
        "Região",
        "UF",
        "Estado"
      ]),

    disponibilidadeA:
      localizarColuna([
        "Disponibilidade A",
        "% Disponibilidade A",
        "Curva A",
        "A"
      ]),

    disponibilidadeB:
      localizarColuna([
        "Disponibilidade B",
        "% Disponibilidade B",
        "Curva B",
        "B"
      ]),

    indiceObsolescencia:
      localizarColuna([
        "Indice Obsolescencia",
        "Índice Obsolescência",
        "Indice de Obsolescencia",
        "Obsolescencia",
        "Obsolescência",
        "Classificacao D",
        "Classificação D",
        "% D"
      ]),

    controleOs:
      localizarColuna([
        "Controle OS",
        "Controle de OS",
        "OS Compras",
        "Aguardando Pecas Depto Compras",
        "Aguardando Peças Depto Compras",
        "% OS",
        "Percentual OS"
      ]),

    valorEstoque:
      localizarColuna([
        "Valor Estoque",
        "Estoque Atual Val",
        "Valor do Estoque"
      ]),

    observacao:
      localizarColuna([
        "Observacao",
        "Observação",
        "Justificativa"
      ])
  };
}

function detectarTipoArquivo(
  mapa
) {
  const possuiDisponibilidade =
    mapa.disponibilidadeA >= 0 ||
    mapa.disponibilidadeB >= 0;

  const possuiObsolescencia =
    mapa.indiceObsolescencia >= 0;

  const possuiOs =
    mapa.controleOs >= 0;

  const quantidade = [
    possuiDisponibilidade,
    possuiObsolescencia,
    possuiOs
  ].filter(Boolean).length;

  if (quantidade >= 2) {
    return "consolidado";
  }

  if (possuiDisponibilidade) {
    return "disponibilidade";
  }

  if (possuiObsolescencia) {
    return "obsolescencia";
  }

  if (possuiOs) {
    return "os";
  }

  return "";
}

function inferirRegiao(
  unidade,
  regiaoArquivo
) {
  if (texto(regiaoArquivo)) {
    return normalizar(
      regiaoArquivo
    );
  }

  const valor =
    normalizar(unidade);

  const regras = [
    {
      alvos: [
        "D MATO GROSSO",
        "M MATO GROSSO",
        "FIAT CENTRO OESTE",
        "CUIABA",
        "SINOP",
        "AGUA BOA"
      ],
      regiao: "MT"
    },
    {
      alvos: [
        "D RONDONIA",
        "PORTO VELHO",
        "VILHENA",
        "JI PARANA",
        "JIPARANA"
      ],
      regiao: "RO"
    },
    {
      alvos: [
        "D PARA",
        "M PARA",
        "FIAT PARA",
        "ANANINDEUA",
        "BELEM"
      ],
      regiao: "PA"
    },
    {
      alvos: ["D PIAUI", "TERESINA"],
      regiao: "PI"
    },
    {
      alvos: [
        "D MARANHAO",
        "SAO LUIS",
        "BACABAL"
      ],
      regiao: "MA"
    },
    {
      alvos: ["M AMAPA", "MACAPA"],
      regiao: "AP"
    },
    {
      alvos: ["JATAI", "MINEIROS"],
      regiao: "GO"
    }
  ];

  for (const regra of regras) {
    if (
      regra.alvos.some(alvo =>
        valor === alvo ||
        valor.includes(alvo) ||
        alvo.includes(valor)
      )
    ) {
      return regra.regiao;
    }
  }

  return "";
}

function detectarFormatoEspecial(
  matriz
) {
  const primeirasLinhas =
    matriz.slice(0, 8);

  const possuiClassAbc =
    primeirasLinhas.some(linha =>
      linha.some(celula =>
        normalizar(celula) ===
          "CLASS ABC"
      )
    );

  const possuiNucleo =
    primeirasLinhas.some(linha =>
      linha.some(celula =>
        normalizar(celula) ===
          "NUCLEO"
      )
    );

  const possuiCabecalhosCurva =
    primeirasLinhas.some(linha => {
      const valores =
        linha.map(normalizar);

      return (
        valores.includes("A") &&
        valores.includes("B") &&
        valores.includes("C") &&
        valores.includes("TOTAL")
      );
    });

  if (
    possuiClassAbc &&
    possuiNucleo &&
    possuiCabecalhosCurva
  ) {
    return "disponibilidade_curvas";
  }

  const possuiJustificativa =
    primeirasLinhas.some(linha =>
      linha.some(celula =>
        [
          "DES JUSTIFICATIVA",
          "DES JUSTIFICATIVA "
        ].includes(
          normalizar(celula)
        )
      )
    );

  const possuiPercentualOs =
    primeirasLinhas.some(linha =>
      linha.some(celula =>
        [
          "OS S",
          "% OS S",
          "PERCENTUAL OS"
        ].includes(
          normalizar(celula)
        ) ||
        normalizar(celula)
          .includes("OS")
      )
    );

  if (
    possuiJustificativa &&
    possuiPercentualOs
  ) {
    return "os_justificativas";
  }

  const possuiClassificacaoDias =
    primeirasLinhas.some(linha =>
      linha.some(celula => {
        const valor =
          normalizar(celula);

        return (
          valor.includes(
            "CLASSIFICACAO DIAS"
          ) ||
          valor.includes(
            "CLASSIFICACAO DIAS MO"
          )
        );
      })
    );

  const possuiMaior365 =
    primeirasLinhas.some(linha =>
      linha.some(celula => {
        const valor =
          normalizar(celula);

        return (
          valor.includes(
            "MAIOR QUE 365"
          ) ||
          valor.includes(
            "ACIMA DE 365"
          )
        );
      })
    );

  const possuiEmpresa =
    primeirasLinhas.some(linha =>
      linha.some(celula =>
        normalizar(celula) ===
          "EMPRESA"
      )
    );

  if (
    possuiClassificacaoDias &&
    possuiMaior365 &&
    possuiEmpresa
  ) {
    return "obsolescencia_365";
  }

  return "";
}

function prepararMatrizEspecial(
  matriz,
  formato
) {
  if (
    formato ===
    "disponibilidade_curvas"
  ) {
    const indiceCabecalho =
      matriz.findIndex(linha => {
        const valores =
          linha.map(normalizar);

        return (
          valores.includes("NUCLEO") &&
          (
            valores.includes(
              "EMPRESA ABREVIADO"
            ) ||
            valores.includes(
              "EMPRESA"
            )
          ) &&
          valores.includes(
            "% DISPONIBILIDADE"
          )
        );
      });

    if (indiceCabecalho >= 0) {
      const cabecalho =
        matriz[indiceCabecalho]
          .map(normalizar);

      const indiceNucleo =
        cabecalho.findIndex(item =>
          item === "NUCLEO"
        );

      const indiceEmpresa =
        cabecalho.findIndex(item =>
          item ===
            "EMPRESA ABREVIADO" ||
          item === "EMPRESA"
        );

      /*
      No relatório real existem quatro colunas com o mesmo
      título "% Disponibilidade", correspondentes a A, B, C e Total.
      Elas aparecem imediatamente após Empresa_Abreviado.
      */
      const indicesPercentuais =
        cabecalho
          .map((item, indice) => ({
            item,
            indice
          }))
          .filter(item =>
            item.item ===
              "% DISPONIBILIDADE"
          )
          .map(item =>
            item.indice
          );

      if (
        indiceNucleo >= 0 &&
        indiceEmpresa >= 0 &&
        indicesPercentuais.length >= 4
      ) {
        let nucleoAtual = "";

        const rows =
          matriz
            .slice(
              indiceCabecalho + 1
            )
            .map(linha => {
              const nucleoLinha =
                texto(
                  linha[indiceNucleo]
                );

              if (nucleoLinha) {
                nucleoAtual =
                  nucleoLinha;
              }

              return [
                nucleoAtual,
                linha[indiceEmpresa] ??
                  "",
                linha[
                  indicesPercentuais[0]
                ] ?? "",
                linha[
                  indicesPercentuais[1]
                ] ?? "",
                linha[
                  indicesPercentuais[2]
                ] ?? "",
                linha[
                  indicesPercentuais[3]
                ] ?? ""
              ];
            });

        return {
          headers: [
            "Nucleo",
            "Empresa",
            "Disponibilidade A",
            "Disponibilidade B",
            "Disponibilidade C",
            "Disponibilidade Total"
          ],
          rows
        };
      }
    }

    /*
    Compatibilidade com o modelo antigo:
    Núcleo | A | B | C | Total
    */
    const indiceLinhaCurvas =
      matriz.findIndex(linha => {
        const valores =
          linha.map(normalizar);

        return (
          valores.includes("A") &&
          valores.includes("B") &&
          valores.includes("C") &&
          valores.includes("TOTAL")
        );
      });

    const indiceLinhaNucleo =
      matriz.findIndex(
        (linha, indice) =>
          indice >= indiceLinhaCurvas &&
          linha.some(celula =>
            normalizar(celula) ===
              "NUCLEO"
          )
      );

    const inicioDados =
      Math.max(
        indiceLinhaCurvas,
        indiceLinhaNucleo
      ) + 1;

    return {
      headers: [
        "Nucleo",
        "Empresa",
        "Disponibilidade A",
        "Disponibilidade B",
        "Disponibilidade C",
        "Disponibilidade Total"
      ],
      rows:
        matriz
          .slice(inicioDados)
          .map(linha => [
            linha[0] ?? "",
            linha[0] ?? "",
            linha[1] ?? "",
            linha[2] ?? "",
            linha[3] ?? "",
            linha[4] ?? ""
          ])
    };
  }

  if (
    formato ===
    "obsolescencia_365"
  ) {
    const indiceLinhaFaixas =
      matriz.findIndex(linha =>
        linha.some(celula =>
          normalizar(celula)
            .includes(
              "MAIOR QUE 365"
            )
        )
      );

    const indiceLinhaEmpresa =
      matriz.findIndex(
        (linha, indice) =>
          indice >= indiceLinhaFaixas &&
          linha.some(celula =>
            normalizar(celula) ===
              "EMPRESA"
          )
      );

    if (
      indiceLinhaFaixas < 0 ||
      indiceLinhaEmpresa < 0
    ) {
      return null;
    }

    const linhaFaixas =
      matriz[indiceLinhaFaixas] ||
      [];

    const linhaCabecalho =
      matriz[indiceLinhaEmpresa] ||
      [];

    const indiceInicio365 =
      linhaFaixas.findIndex(celula =>
        normalizar(celula)
          .includes(
            "MAIOR QUE 365"
          )
      );

    let indiceValor365 =
      indiceInicio365;

    let indicePercentual365 =
      -1;

    for (
      let indice = indiceInicio365;
      indice <
        Math.min(
          linhaCabecalho.length,
          indiceInicio365 + 4
        );
      indice += 1
    ) {
      const cabecalho =
        normalizar(
          linhaCabecalho[indice]
        );

      if (
        cabecalho === "VALOR" &&
        indiceValor365 <
          indiceInicio365
      ) {
        indiceValor365 =
          indice;
      }

      if (
        cabecalho === "%" ||
        cabecalho.includes(
          "PERCENTUAL"
        )
      ) {
        indicePercentual365 =
          indice;
        break;
      }
    }

    /*
    No modelo apresentado:
    H = Valor maior que 365
    I = Percentual maior que 365
    */
    if (indicePercentual365 < 0) {
      indicePercentual365 =
        indiceInicio365 + 1;
    }

    if (indiceValor365 < 0) {
      indiceValor365 =
        indiceInicio365;
    }

    return {
      headers: [
        "Empresa",
        "Valor Maior que 365",
        "Indice Obsolescencia"
      ],
      rows:
        matriz
          .slice(
            indiceLinhaEmpresa + 1
          )
          .map(linha => [
            linha[0] ?? "",
            linha[indiceValor365] ?? "",
            linha[indicePercentual365] ?? ""
          ])
    };
  }

  if (
    formato ===
    "os_justificativas"
  ) {
    const indiceCabecalho =
      matriz.findIndex(linha =>
        linha.some(celula =>
          normalizar(celula) ===
            "DES JUSTIFICATIVA"
        )
      );

    const cabecalho =
      matriz[indiceCabecalho] || [];

    let indiceDescricao =
      cabecalho.findIndex(celula =>
        normalizar(celula) ===
          "DES JUSTIFICATIVA"
      );

    let indicePercentual =
      cabecalho.findIndex(celula => {
        const valor =
          normalizar(celula);

        return (
          valor.includes("OS") ||
          valor.includes("PERCENTUAL")
        );
      });

    if (indiceDescricao < 0) {
      indiceDescricao = 0;
    }

    if (indicePercentual < 0) {
      indicePercentual = 1;
    }

    return {
      headers: [
        "DES_JUSTIFICATIVA",
        "Controle OS"
      ],
      rows:
        matriz
          .slice(indiceCabecalho + 1)
          .map(linha => [
            linha[indiceDescricao] ?? "",
            linha[indicePercentual] ?? ""
          ])
    };
  }

  return null;
}

function processarDisponibilidadeCurvas() {
  const importacao =
    state.importacao;

  const marcadoresProibidos = [
    "FILTROS APLICADOS",
    "FILTRO APLICADO",
    "CLASS ABC",
    "QTD CONTABIL",
    "VALOR DINAMICO",
    "PERCENT PROJECAO",
    "TEM VALOR E SIM",
    "ANO MAIOR QUE",
    "EM BRANCO",
    "DES NUCLEO NAO E"
  ];

  const linhasValidas =
    importacao.rows.filter(linha => {
      const nucleo =
        normalizar(linha[0]);

      const empresa =
        normalizar(linha[1]);

      if (
        !nucleo ||
        !empresa ||
        empresa === "TOTAL"
      ) {
        return false;
      }

      if (
        marcadoresProibidos.some(
          marcador =>
            nucleo.includes(marcador) ||
            empresa.includes(marcador)
        )
      ) {
        return false;
      }

      const percentuais = [
        linha[2],
        linha[3],
        linha[4],
        linha[5]
      ].map(
        percentualNormalizado
      );

      return percentuais.some(valor =>
        Number.isFinite(
          Number(valor)
        ) &&
        Number(valor) >= 0 &&
        Number(valor) <= 100
      );
    });

  if (!linhasValidas.length) {
    importacao.erros.push(
      "Nenhuma casa válida foi encontrada no relatório ABC."
    );

    return;
  }

  importacao.registros =
    linhasValidas.map(
      (linha, indice) => {
        const nucleo =
          texto(linha[0]);

        const empresa =
          texto(linha[1]);

        return {
          competencia:
            importacao.competencia,

          /*
          Núcleo é usado para agrupar as casas.
          Unidade é a casa efetivamente atendida pelo colaborador.
          */
          nucleo,
          unidade:
            empresa,
          empresaAbreviado:
            empresa,
          regiao:
            inferirRegiao(
              empresa,
              inferirRegiao(
                nucleo,
                ""
              )
            ),
          aplicacaoGlobal:
            false,

          disponibilidadeA:
            percentualNormalizado(
              linha[2]
            ),
          disponibilidadeB:
            percentualNormalizado(
              linha[3]
            ),
          disponibilidadeC:
            percentualNormalizado(
              linha[4]
            ),
          disponibilidadeTotal:
            percentualNormalizado(
              linha[5]
            ),

          tipoImportacao:
            "disponibilidade",
          modeloImportacao:
            "ABC_POR_NUCLEO_E_CASA",
          arquivoOrigem:
            importacao.arquivo?.name ||
            "",
          abaOrigem:
            importacao.aba ||
            "",
          linhaOrigem:
            indice + 1,

          observacao:
            "Disponibilidade ABC calculada pela média das casas atendidas em cada núcleo."
        };
      }
    );

  const nucleos =
    new Set(
      importacao.registros.map(item =>
        normalizar(item.nucleo)
      )
    );

  importacao.avisos.push(
    `${importacao.registros.length} casa(s) de ${nucleos.size} núcleo(s) serão analisadas pela média das casas atendidas por cada colaborador.`
  );

  importacao.avisos.push(
    "Mesmo que o colaborador atinja a meta em mais de um núcleo, a bonificação de A e B será paga apenas uma vez por política no mês."
  );
}


function processarObsolescencia365() {
  const importacao =
    state.importacao;

  const marcadoresProibidos = [
    "FILTROS APLICADOS",
    "FILTRO APLICADO",
    "CLASSIFICACAO DIAS",
    "ATE 90",
    "ENTRE 91 E 180",
    "ENTRE 181 E 365",
    "MAIOR QUE 365",
    "EMPRESA",
    "TOTAL"
  ];

  const linhasValidas =
    importacao.rows.filter(linha => {
      const unidade =
        normalizar(linha[0]);

      if (!unidade) {
        return false;
      }

      if (
        marcadoresProibidos.some(
          marcador =>
            unidade === marcador ||
            unidade.includes(
              marcador
            )
        )
      ) {
        return false;
      }

      const indice =
        percentualNormalizado(
          linha[2]
        );

      return (
        Number.isFinite(
          Number(indice)
        ) &&
        Number(indice) >= 0 &&
        Number(indice) <= 100
      );
    });

  if (!linhasValidas.length) {
    importacao.erros.push(
      "Nenhuma unidade válida foi encontrada na planilha de obsolescência."
    );

    return;
  }

  importacao.registros =
    linhasValidas.map(
      (linha, indiceLinha) => {
        const unidade =
          texto(linha[0]);

        return {
          competencia:
            importacao.competencia,
          nucleo:
            unidade,
          unidade,
          regiao:
            inferirRegiao(
              unidade,
              ""
            ),
          aplicacaoGlobal:
            false,

          valorObsoleto365:
            numero(
              linha[1]
            ),

          indiceObsolescencia:
            percentualNormalizado(
              linha[2]
            ),

          tipoImportacao:
            "obsolescencia",
          arquivoOrigem:
            importacao.arquivo?.name ||
            "",
          abaOrigem:
            importacao.aba ||
            "",
          linhaOrigem:
            indiceLinha + 1,

          observacao:
            "Percentual de estoque com mais de 365 dias."
        };
      }
    );

  importacao.avisos.push(
    `${importacao.registros.length} unidade(s) de obsolescência serão comparadas com o mês anterior.`
  );

  if (
    !state.indicadores.some(item =>
      item.competencia ===
        competenciaAnterior(
          importacao.competencia
        ) &&
      item.indiceObsolescencia !==
        undefined
    )
  ) {
    importacao.avisos.push(
      "Não existe histórico do mês anterior. Esta competência será tratada como primeira medição e não gerará bônus de obsolescência."
    );
  }
}

function processarOsJustificativas() {
  const importacao =
    state.importacao;

  const linhaCompras =
    importacao.rows.find(linha => {
      const justificativa =
        normalizar(linha[0]);

      return (
        justificativa.includes(
          "AGUARDANDO PECAS"
        ) &&
        justificativa.includes(
          "DEPTO COMPRAS"
        )
      );
    });

  if (!linhaCompras) {
    importacao.erros.push(
      'A linha "AGUARDANDO PEÇAS - DEPTO COMPRAS" não foi encontrada.'
    );

    return;
  }

  const controleOs =
    percentualNormalizado(
      linhaCompras[1]
    );

  importacao.registros = [
    {
      competencia:
        importacao.competencia,
      nucleo:
        "GLOBAL",
      unidade:
        "GLOBAL",
      regiao:
        "GLOBAL",
      aplicacaoGlobal:
        true,

      controleOs,

      tipoImportacao:
        "os",
      arquivoOrigem:
        importacao.arquivo?.name ||
        "",
      linhaOrigem:
        "AGUARDANDO PEÇAS - DEPTO COMPRAS",

      observacao:
        "Percentual geral do Departamento de Compras aplicado a todos os colaboradores."
    }
  ];

  importacao.avisos.push(
    `O percentual geral de O.S. (${percentual(controleOs)}) será aplicado igualmente a todos os colaboradores.`
  );
}

function processarImportacao() {
  const importacao =
    state.importacao;

  importacao.registros = [];
  importacao.erros = [];
  importacao.avisos = [];

  if (
    importacao.formatoEspecial ===
    "disponibilidade_curvas"
  ) {
    processarDisponibilidadeCurvas();
    renderizarImportacao();
    return;
  }

  if (
    importacao.formatoEspecial ===
    "os_justificativas"
  ) {
    processarOsJustificativas();
    renderizarImportacao();
    return;
  }

  if (
    importacao.formatoEspecial ===
    "obsolescencia_365"
  ) {
    processarObsolescencia365();
    renderizarImportacao();
    return;
  }

  const mapa =
    mapaImportacao();

  const tipoDetectado =
    detectarTipoArquivo(
      mapa
    );

  const tipo =
    importacao.tipo === "auto"
      ? tipoDetectado
      : importacao.tipo;

  if (!tipo) {
    importacao.erros.push(
      "Não foi possível identificar as colunas de disponibilidade, obsolescência ou controle de O.S."
    );

    renderizarImportacao();
    return;
  }

  if (mapa.unidade < 0) {
    importacao.erros.push(
      "A coluna Unidade, Filial ou Núcleo não foi encontrada."
    );
  }

  if (
    tipo === "disponibilidade" &&
    mapa.disponibilidadeA < 0 &&
    mapa.disponibilidadeB < 0
  ) {
    importacao.erros.push(
      "As colunas de Disponibilidade A/B não foram encontradas."
    );
  }

  if (
    tipo === "obsolescencia" &&
    mapa.indiceObsolescencia < 0
  ) {
    importacao.erros.push(
      "A coluna de Índice de Obsolescência não foi encontrada."
    );
  }

  if (
    tipo === "os" &&
    mapa.controleOs < 0
  ) {
    importacao.erros.push(
      "A coluna de Controle de O.S. não foi encontrada."
    );
  }

  if (importacao.erros.length) {
    renderizarImportacao();
    return;
  }

  importacao.rows.forEach(
    (linha, indice) => {
      if (
        !linha.some(valor =>
          texto(valor)
        )
      ) {
        return;
      }

      const unidade =
        texto(
          valorLinha(
            linha,
            mapa.unidade
          )
        );

      if (
        !unidade ||
        normalizar(unidade) ===
          "TOTAL"
      ) {
        return;
      }

      const competenciaArquivo =
        competenciaNormalizada(
          valorLinha(
            linha,
            mapa.competencia
          )
        );

      const competencia =
        competenciaArquivo ||
        importacao.competencia;

      const regiao =
        inferirRegiao(
          unidade,
          valorLinha(
            linha,
            mapa.regiao
          )
        );

      const registro = {
        competencia,
        nucleo: texto(
          valorLinha(
            linha,
            mapa.nucleo
          )
        ) || unidade,
        unidade,
        regiao,

        disponibilidadeA:
          mapa.disponibilidadeA >= 0
            ? percentualNormalizado(
                valorLinha(
                  linha,
                  mapa.disponibilidadeA
                )
              )
            : null,

        disponibilidadeB:
          mapa.disponibilidadeB >= 0
            ? percentualNormalizado(
                valorLinha(
                  linha,
                  mapa.disponibilidadeB
                )
              )
            : null,

        indiceObsolescencia:
          mapa.indiceObsolescencia >= 0
            ? percentualNormalizado(
                valorLinha(
                  linha,
                  mapa.indiceObsolescencia
                )
              )
            : null,

        controleOs:
          mapa.controleOs >= 0
            ? percentualNormalizado(
                valorLinha(
                  linha,
                  mapa.controleOs
                )
              )
            : null,

        valorEstoque:
          mapa.valorEstoque >= 0
            ? numero(
                valorLinha(
                  linha,
                  mapa.valorEstoque
                )
              )
            : null,

        observacao:
          texto(
            valorLinha(
              linha,
              mapa.observacao
            )
          ),

        tipoImportacao:
          tipo,
        arquivoOrigem:
          importacao.arquivo?.name ||
          "",
        linhaOrigem:
          indice + 2
      };

      importacao.registros.push(
        registro
      );
    }
  );

  if (!importacao.registros.length) {
    importacao.erros.push(
      "Nenhum registro válido foi encontrado."
    );
  }

  renderizarImportacao();
}

async function lerArquivoImportacao(
  arquivo
) {
  if (!window.XLSX) {
    throw new Error(
      "A biblioteca XLSX não foi carregada."
    );
  }

  if (!arquivo) return;

  const extensao =
    arquivo.name
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

  const importacao =
    state.importacao;

  importacao.arquivo =
    arquivo;

  const buffer =
    await arquivo.arrayBuffer();

  importacao.workbook =
    XLSX.read(
      buffer,
      {
        type: "array",
        cellDates: true
      }
    );

  importacao.aba =
    importacao.workbook
      .SheetNames[0];

  const select =
    $("#comprasImportAba");

  select.innerHTML =
    importacao.workbook
      .SheetNames
      .map(nome => `
        <option value="${escapar(nome)}">
          ${escapar(nome)}
        </option>
      `)
      .join("");

  carregarAbaImportacao(
    importacao.aba
  );
}

function carregarAbaImportacao(
  nome
) {
  const importacao =
    state.importacao;

  const planilha =
    importacao.workbook
      ?.Sheets[nome];

  if (!planilha) return;

  importacao.aba =
    nome;

  const matriz =
    XLSX.utils.sheet_to_json(
      planilha,
      {
        header: 1,
        defval: "",
        raw: true
      }
    );

  importacao.formatoEspecial =
    detectarFormatoEspecial(
      matriz
    );

  const especial =
    prepararMatrizEspecial(
      matriz,
      importacao.formatoEspecial
    );

  if (especial) {
    importacao.headers =
      especial.headers;

    importacao.rows =
      especial.rows;

    if (
      importacao.formatoEspecial ===
      "disponibilidade_curvas"
    ) {
      importacao.tipo =
        "disponibilidade";

      const selectTipo =
        $("#comprasImportTipo");

      if (selectTipo) {
        selectTipo.value =
          "disponibilidade";
      }
    }

    if (
      importacao.formatoEspecial ===
      "os_justificativas"
    ) {
      importacao.tipo =
        "os";

      const selectTipo =
        $("#comprasImportTipo");

      if (selectTipo) {
        selectTipo.value =
          "os";
      }
    }

    if (
      importacao.formatoEspecial ===
      "obsolescencia_365"
    ) {
      importacao.tipo =
        "obsolescencia";

      const selectTipo =
        $("#comprasImportTipo");

      if (selectTipo) {
        selectTipo.value =
          "obsolescencia";
      }
    }

    processarImportacao();
    return;
  }

  let indiceCabecalho =
    matriz.findIndex(linha =>
      linha.some(celula => {
        const valor =
          normalizar(celula);

        return [
          "NUCLEO",
          "UNIDADE",
          "FILIAL",
          "REGIAO",
          "DISPONIBILIDADE A",
          "INDICE OBSOLESCENCIA",
          "CONTROLE OS"
        ].includes(valor);
      })
    );

  if (indiceCabecalho < 0) {
    indiceCabecalho = 0;
  }

  importacao.headers =
    (matriz[indiceCabecalho] || [])
      .map(texto);

  importacao.rows =
    matriz.slice(
      indiceCabecalho + 1
    );

  processarImportacao();
}

async function confirmarImportacao() {
  const importacao =
    state.importacao;

  if (
    importacao.processando ||
    importacao.erros.length ||
    !importacao.registros.length
  ) {
    return;
  }

  importacao.processando = true;
  renderizarImportacao();

  try {
    /*
    Uma nova importação no mesmo mês passa a ser a fonte oficial.
    Por isso, correções/exclusões manuais daquele mês são removidas.
    */
    await limparAjustesCompetencia(
      importacao.competencia
    );

    await salvarIndicadoresEmLote(
      importacao.registros,
      {
        competencia:
          importacao.competencia,
        arquivo:
          importacao.arquivo?.name ||
          "",
        aba:
          importacao.aba,
        tipo:
          importacao.tipo,
        quantidade:
          importacao.registros.length
      }
    );

    await carregarDados();

    limparImportacao();

    await alerta(
      "Importação concluída com sucesso."
    );

    abrirView(
      "apuracao"
    );
  } catch (erro) {
    console.error(
      "[CAMPANHA COMPRAS]",
      erro
    );

    await alerta(
      erro.message ||
      "Não foi possível concluir a importação."
    );
  } finally {
    importacao.processando = false;
    renderizarImportacao();
  }
}

function limparImportacao() {
  const importacao =
    state.importacao;

  importacao.arquivo = null;
  importacao.workbook = null;
  importacao.aba = "";
  importacao.headers = [];
  importacao.rows = [];
  importacao.registros = [];
  importacao.erros = [];
  importacao.avisos = [];
  importacao.formatoEspecial = "";
  importacao.processando = false;

  const input =
    $("#comprasImportArquivo");

  if (input) {
    input.value = "";
  }

  const aba =
    $("#comprasImportAba");

  if (aba) {
    aba.innerHTML =
      "<option>Aguardando arquivo</option>";
  }

  renderizarImportacao();
}

/* ==========================================================================
   DOWNLOAD DO MODELO
========================================================================== */

function baixarModelo() {
  if (!window.XLSX) {
    alerta(
      "A biblioteca XLSX não foi carregada."
    );

    return;
  }

  const cabecalhos = [
    "Competencia",
    "Nucleo",
    "Unidade",
    "Regiao",
    "Disponibilidade A",
    "Disponibilidade B",
    "Disponibilidade C",
    "Disponibilidade Total",
    "Indice Obsolescencia",
    "Controle OS",
    "Valor Estoque",
    "Observacao"
  ];

  const linhas = [
    [
      state.competencia,
      "M. Mato Grosso",
      "CUIABÁ",
      "MT",
      90.74,
      73.29,
      43.08,
      71.95,
      34.05,
      12.93,
      1022236,
      ""
    ],
    [
      state.competencia,
      "D. Rondônia",
      "PORTO VELHO",
      "RO",
      95,
      90,
      64.29,
      77.48,
      30,
      9.5,
      4012652,
      ""
    ]
  ];

  const planilha =
    XLSX.utils.aoa_to_sheet([
      cabecalhos,
      ...linhas
    ]);

  const livro =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    livro,
    planilha,
    "IMPORTACAO_COMPRAS"
  );

  XLSX.writeFile(
    livro,
    "modelo-importacao-campanha-compras.xlsx"
  );
}

/* ==========================================================================
   UI — ESTRUTURA
========================================================================== */

function estilos() {
  if ($("#comprasModuleCss")) {
    return;
  }

  document.head.insertAdjacentHTML(
    "beforeend",
    `
    <style id="comprasModuleCss">
      .compras-module-card{
        margin-top:12px
      }

      .compras-sidebar-card{
        width:100%;
        display:flex;
        align-items:center;
        gap:10px;
        padding:12px;
        border:1px solid rgba(255,255,255,.14);
        border-radius:14px;
        background:rgba(255,255,255,.04);
        color:#fff;
        cursor:pointer;
        text-align:left
      }

      .compras-sidebar-card:hover,
      .compras-sidebar-card.active{
        background:rgba(255,255,255,.1)
      }

      .compras-sidebar-icon{
        width:38px;
        height:38px;
        display:grid;
        place-items:center;
        border-radius:10px;
        background:linear-gradient(135deg,#d99a12,#f1c93d);
        color:#173044;
        font-weight:900;
        flex:0 0 auto
      }

      .compras-sidebar-text{
        flex:1
      }

      .compras-sidebar-text strong{
        display:block;
        font-size:.84rem
      }

      .compras-sidebar-text small{
        display:block;
        margin-top:2px;
        color:#a9c4d7;
        font-size:.68rem
      }

      .compras-submenu{
        display:grid;
        gap:4px;
        padding:7px 0 0 12px
      }

      .compras-submenu[hidden]{
        display:none
      }

      .compras-submenu button{
        padding:9px 11px;
        border:0;
        border-radius:8px;
        background:transparent;
        color:#dcecf6;
        text-align:left;
        cursor:pointer;
        font-size:.76rem
      }

      .compras-submenu button:hover,
      .compras-submenu button.active{
        background:rgba(255,255,255,.1);
        color:#fff
      }

      .compras-page{
        display:none;
        color:#12283a
      }

      .compras-page.active{
        display:block
      }

      .compras-page *{
        box-sizing:border-box
      }

      .compras-topbar{
        display:flex;
        justify-content:space-between;
        gap:15px;
        align-items:flex-end;
        margin-bottom:17px
      }

      .compras-topbar small{
        color:#087354;
        font-weight:900;
        letter-spacing:.08em
      }

      .compras-topbar h1{
        margin:5px 0 0;
        font-size:1.75rem
      }

      .compras-history{
        display:flex;
        align-items:center;
        gap:8px
      }

      .compras-history button,
      .compras-history input{
        min-height:42px;
        border:1px solid #d3e0e7;
        border-radius:11px;
        background:#fff
      }

      .compras-history button{
        width:44px;
        color:#0b3154;
        font-size:1.2rem;
        font-weight:900;
        cursor:pointer
      }

      .compras-history input{
        padding:8px 12px;
        font-weight:800;
        text-align:center
      }

      .compras-hero{
        position:relative;
        overflow:hidden;
        padding:24px;
        border-radius:20px;
        color:#fff;
        background:
          linear-gradient(
            135deg,
            #0b3154,
            #5d4b12
          )
      }

      .compras-hero::after{
        content:"COMPRAS";
        position:absolute;
        right:18px;
        bottom:-17px;
        font-size:5rem;
        font-weight:900;
        color:rgba(255,255,255,.05)
      }

      .compras-hero small{
        color:#f1d565;
        font-weight:900;
        letter-spacing:.08em
      }

      .compras-hero h2{
        margin:7px 0;
        font-size:1.6rem
      }

      .compras-hero p{
        max-width:720px;
        margin:0;
        color:#dceaf2
      }

      .compras-kpis{
        display:grid;
        grid-template-columns:
          repeat(4,minmax(0,1fr));
        gap:13px;
        margin-top:16px
      }

      .compras-kpi{
        padding:18px;
        border:1px solid #dce6ec;
        border-radius:15px;
        background:#fff;
        box-shadow:0 7px 22px rgba(25,54,72,.05)
      }

      .compras-kpi span{
        display:block;
        color:#687c8b;
        font-size:.72rem;
        font-weight:800;
        text-transform:uppercase
      }

      .compras-kpi strong{
        display:block;
        margin-top:7px;
        color:#0b3154;
        font-size:1.45rem
      }

      .compras-grid{
        display:grid;
        grid-template-columns:
          repeat(2,minmax(0,1fr));
        gap:14px;
        margin-top:15px
      }

      .compras-panel{
        margin-top:15px;
        padding:18px;
        border:1px solid #dce6ec;
        border-radius:16px;
        background:#fff;
        box-shadow:0 7px 22px rgba(25,54,72,.04)
      }

      .compras-grid .compras-panel{
        margin-top:0
      }

      .compras-panel-header{
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        margin-bottom:14px
      }

      .compras-panel-header small{
        color:#087354;
        font-weight:900;
        letter-spacing:.08em
      }

      .compras-panel-header h3{
        margin:4px 0 0
      }

      .compras-actions{
        display:flex;
        gap:8px;
        flex-wrap:wrap
      }

      .compras-btn{
        min-height:40px;
        padding:9px 13px;
        border-radius:10px;
        font-weight:800;
        cursor:pointer
      }

      .compras-btn-primary{
        border:0;
        background:#087354;
        color:#fff
      }

      .compras-btn-dark{
        border:0;
        background:#0b3154;
        color:#fff
      }

      .compras-btn-light{
        border:1px solid #d4e1e7;
        background:#fff;
        color:#0b3154
      }

      .compras-btn-danger{
        border:1px solid #efc7c7;
        background:#fff;
        color:#b42323
      }

      .compras-table-wrap{
        overflow:auto
      }

      .compras-table{
        width:100%;
        border-collapse:collapse
      }

      .compras-table th,
      .compras-table td{
        padding:10px;
        border-bottom:1px solid #e1e9ed;
        text-align:left;
        vertical-align:middle
      }

      .compras-table th{
        color:#587083;
        font-size:.68rem;
        text-transform:uppercase;
        white-space:nowrap
      }

      .compras-table td{
        font-size:.78rem
      }

      .compras-table td strong{
        color:#0b3154
      }

      .compras-badge{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-height:27px;
        padding:5px 9px;
        border-radius:999px;
        font-size:.65rem;
        font-weight:900
      }

      .compras-success{
        background:#dff5e9;
        color:#087344
      }

      .compras-danger{
        background:#fde1e1;
        color:#b42323
      }

      .compras-warning{
        background:#fff0c7;
        color:#865d00
      }

      .compras-neutral{
        background:#edf3f6;
        color:#486274
      }

      .compras-metric{
        display:grid;
        gap:3px;
        min-width:115px
      }

      .compras-metric strong{
        font-size:.8rem
      }

      .compras-metric small{
        color:#6b7d8a
      }

      .compras-delta-positive{
        color:#087344!important
      }

      .compras-delta-negative{
        color:#b42323!important
      }

      .compras-empty{
        padding:28px;
        border:1px dashed #cddde5;
        border-radius:12px;
        color:#6b7d8a;
        text-align:center
      }

      .compras-form-grid{
        display:grid;
        grid-template-columns:
          repeat(2,minmax(180px,1fr));
        gap:11px
      }

      .compras-field{
        display:grid;
        gap:6px
      }

      .compras-field span{
        color:#657b89;
        font-size:.7rem;
        font-weight:900;
        text-transform:uppercase
      }

      .compras-field input,
      .compras-field select,
      .compras-field textarea{
        width:100%;
        min-height:41px;
        padding:9px 10px;
        border:1px solid #d5e1e7;
        border-radius:9px;
        background:#fff
      }

      .compras-field textarea{
        min-height:82px;
        resize:vertical
      }

      .compras-import-drop{
        display:block;
        margin-top:12px;
        padding:26px;
        border:2px dashed #9eb3c0;
        border-radius:14px;
        text-align:center;
        cursor:pointer
      }

      .compras-import-drop strong{
        display:block
      }

      .compras-import-drop small{
        display:block;
        margin-top:5px;
        color:#687c8b
      }

      .compras-import-summary{
        display:grid;
        grid-template-columns:
          repeat(4,minmax(0,1fr));
        gap:9px;
        margin-top:12px
      }

      .compras-import-summary article{
        padding:12px;
        border:1px solid #dce6ec;
        border-radius:11px
      }

      .compras-import-summary span{
        display:block;
        color:#687c8b;
        font-size:.68rem;
        font-weight:900;
        text-transform:uppercase
      }

      .compras-import-summary strong{
        display:block;
        margin-top:6px;
        color:#0b3154
      }

      .compras-validation{
        display:grid;
        gap:7px;
        margin-top:12px;
        max-height:230px;
        overflow:auto
      }

      .compras-error,
      .compras-alert,
      .compras-ok{
        padding:10px;
        border-radius:9px
      }

      .compras-error{
        background:#fdeaea;
        color:#9a2828
      }

      .compras-alert{
        background:#fff3d4;
        color:#805b00
      }

      .compras-ok{
        border:1px dashed #d2e0e7;
        color:#687c8b;
        text-align:center
      }

      .compras-policy-grid{
        display:grid;
        grid-template-columns:
          repeat(4,minmax(0,1fr));
        gap:12px
      }

      .compras-policy-card{
        padding:17px;
        border:1px solid #dce6ec;
        border-radius:14px;
        background:#fff
      }

      .compras-policy-card span{
        display:block;
        color:#687c8b;
        font-size:.7rem;
        font-weight:900;
        text-transform:uppercase
      }

      .compras-policy-card strong{
        display:block;
        margin-top:8px;
        color:#0b3154;
        font-size:1.05rem
      }

      .compras-policy-card b{
        display:block;
        margin-top:7px;
        color:#087344
      }

      .compras-modal{
        width:min(760px,calc(100vw - 30px));
        padding:0;
        border:0;
        border-radius:18px;
        overflow:hidden
      }

      .compras-modal::backdrop{
        background:rgba(8,25,38,.68);
        backdrop-filter:blur(3px)
      }

      .compras-modal-header{
        display:flex;
        justify-content:space-between;
        padding:18px 20px;
        color:#fff;
        background:linear-gradient(135deg,#0b3154,#087354)
      }

      .compras-modal-header h3{
        margin:4px 0 0
      }

      .compras-modal-close{
        width:38px;
        height:38px;
        border:1px solid #ffffff55;
        border-radius:10px;
        background:#ffffff18;
        color:#fff;
        font-size:1.2rem;
        cursor:pointer
      }

      .compras-modal-body{
        padding:20px
      }

      .compras-modal-footer{
        display:flex;
        justify-content:flex-end;
        gap:9px;
        padding:14px 20px;
        border-top:1px solid #dce6ec;
        background:#f7f9fa
      }

      @media(max-width:1000px){
        .compras-kpis,
        .compras-policy-grid{
          grid-template-columns:
            repeat(2,1fr)
        }

        .compras-grid{
          grid-template-columns:1fr
        }
      }

      @media(max-width:650px){
        .compras-topbar{
          align-items:stretch;
          flex-direction:column
        }

        .compras-history{
          width:100%
        }

        .compras-history input{
          flex:1
        }

        .compras-kpis,
        .compras-policy-grid,
        .compras-form-grid,
        .compras-import-summary{
          grid-template-columns:1fr
        }
      }
    </style>
    `
  );
}

function htmlPaginas() {
  return `
    <section
      id="compras-visao-geral"
      class="compras-page"
      data-compras-view="visao-geral"
    >
      ${htmlTopbar("Campanha Central de Compras", true)}

      <div class="compras-hero">
        <small>CAMPANHA MENSAL</small>
        <h2>Central de Compras</h2>
        <p>
          Apuração de disponibilidade de estoque,
          redução de obsolescência e controle de O.S.,
          com histórico mensal e comparação com o mês anterior.
        </p>
      </div>

      <div
        id="comprasDashboardKpis"
        class="compras-kpis"
      ></div>

      <div class="compras-grid">
        <section class="compras-panel">
          <header class="compras-panel-header">
            <div>
              <small>INDICADORES</small>
              <h3>Resultado por indicador</h3>
            </div>
          </header>

          <div
            id="comprasResumoIndicadores"
          ></div>
        </section>

        <section class="compras-panel">
          <header class="compras-panel-header">
            <div>
              <small>DESEMPENHO</small>
              <h3>Ranking mensal</h3>
            </div>
          </header>

          <div
            id="comprasRanking"
          ></div>
        </section>
      </div>

      <section class="compras-panel">
        <header class="compras-panel-header">
          <div>
            <small>HISTÓRICO E AVALIAÇÃO</small>
            <h3>Resultado individual do mês</h3>
          </div>
        </header>

        <div
          id="comprasResumoMensal"
        ></div>
      </section>
    </section>

    <section
      id="compras-responsaveis"
      class="compras-page"
      data-compras-view="responsaveis"
    >
      ${htmlTopbar("Base de responsáveis")}

      <section class="compras-panel">
        <header class="compras-panel-header">
          <div>
            <small>COLABORADORES</small>
            <h3>Responsáveis por região e unidade</h3>
          </div>

          <button
            type="button"
            id="btnNovoResponsavelCompras"
            class="compras-btn compras-btn-primary"
          >
            + Novo responsável
          </button>
        </header>

        <div
          id="comprasResponsaveisTabela"
        ></div>
      </section>
    </section>

    <section
      id="compras-importacao"
      class="compras-page"
      data-compras-view="importacao"
    >
      ${htmlTopbar("Importação de indicadores")}

      <section class="compras-panel">
        <header class="compras-panel-header">
          <div>
            <small>IMPORTAÇÃO OPCIONAL</small>
            <h3>Alimentar campanha por Excel</h3>
          </div>

          <button
            type="button"
            id="btnModeloCompras"
            class="compras-btn compras-btn-light"
          >
            Baixar modelo
          </button>
        </header>

        <div class="compras-form-grid">
          <label class="compras-field">
            <span>Competência</span>
            <input
              type="month"
              id="comprasImportCompetencia"
            >
          </label>

          <label class="compras-field">
            <span>Tipo de arquivo</span>
            <select id="comprasImportTipo">
              <option value="auto">
                Identificar automaticamente
              </option>
              <option value="consolidado">
                Arquivo consolidado
              </option>
              <option value="disponibilidade">
                Disponibilidade A/B
              </option>
              <option value="obsolescencia">
                Obsolescência
              </option>
              <option value="os">
                Controle de O.S.
              </option>
            </select>
          </label>

          <label class="compras-field">
            <span>Aba do arquivo</span>
            <select id="comprasImportAba">
              <option>Aguardando arquivo</option>
            </select>
          </label>

          <div class="compras-field">
            <span>Histórico</span>
            <button
              type="button"
              id="btnVerApuracaoCompras"
              class="compras-btn compras-btn-dark"
            >
              Ver apuração mensal
            </button>
          </div>
        </div>

        <label class="compras-import-drop">
          <strong>
            Clique ou arraste o XLSX, XLS ou CSV
          </strong>

          <small>
            O sistema reconhece automaticamente os relatórios de curvas A/B/C/Total, justificativas de O.S. e obsolescência “Maior que 365 dias”.
          </small>

          <input
            type="file"
            id="comprasImportArquivo"
            accept=".xlsx,.xls,.csv"
            hidden
          >
        </label>

        <div class="compras-import-summary">
          <article>
            <span>Arquivo</span>
            <strong id="comprasImportNome">
              Nenhum
            </strong>
          </article>

          <article>
            <span>Registros válidos</span>
            <strong id="comprasImportValidos">
              0
            </strong>
          </article>

          <article>
            <span>Erros</span>
            <strong id="comprasImportErros">
              0
            </strong>
          </article>

          <article>
            <span>Avisos</span>
            <strong id="comprasImportAvisos">
              0
            </strong>
          </article>
        </div>

        <div
          id="comprasImportPreview"
          class="compras-table-wrap"
          style="margin-top:12px"
        ></div>

        <div
          id="comprasImportValidacao"
          class="compras-validation"
        ></div>

        <div
          class="compras-actions"
          style="justify-content:flex-end;margin-top:13px"
        >
          <button
            type="button"
            id="btnLimparImportacaoCompras"
            class="compras-btn compras-btn-light"
          >
            Limpar
          </button>

          <button
            type="button"
            id="btnConfirmarImportacaoCompras"
            class="compras-btn compras-btn-primary"
            disabled
          >
            Confirmar importação
          </button>
        </div>
      </section>
    </section>

    <section
      id="compras-apuracao"
      class="compras-page"
      data-compras-view="apuracao"
    >
      ${htmlTopbar("Apuração mensal", true)}

      <section class="compras-panel">
        <header class="compras-panel-header">
          <div>
            <small>RESULTADO MENSAL</small>
            <h3>Quem bateu os indicadores</h3>
          </div>

          <div class="compras-actions">
            <span class="compras-badge compras-neutral">
              A exportação inclui as evidências do mês
            </span>
          </div>
        </header>

        <div
          id="comprasApuracaoTabela"
        ></div>
      </section>

      <section class="compras-panel">
        <header class="compras-panel-header">
          <div>
            <small>EVIDÊNCIAS DO MÊS</small>
            <h3>Planilhas importadas</h3>
          </div>
        </header>

        <div id="comprasEvidenciasTabela"></div>
      </section>
    </section>

    <section
      id="compras-politicas"
      class="compras-page"
      data-compras-view="politicas"
    >
      ${htmlTopbar("Políticas da campanha")}

      <div class="compras-policy-grid">
        ${htmlPoliticas()}
      </div>

      <section class="compras-panel">
        <header class="compras-panel-header">
          <div>
            <small>REGRAS DE APURAÇÃO</small>
            <h3>Como o sistema calcula</h3>
          </div>
        </header>

        <p>
          A disponibilidade ABC é calculada pela média das
          casas efetivamente atendidas pelo colaborador dentro de
          cada núcleo. Quando o colaborador atende mais de um núcleo,
          cada núcleo é avaliado separadamente; porém, se um ou mais
          núcleos atingirem a Curva A, ele recebe apenas uma vez os
          R$ 300,00 da política A. A mesma regra de pagamento único
          vale para a Curva B.
        </p>

        <p>
          O bônus de obsolescência compara o percentual de
          estoque com mais de 365 dias do mês anterior com o
          mês atual. Cada ponto percentual reduzido paga
          R$ 60,00, limitado a 5 pontos e R$ 300,00 por unidade.
          Na primeira medição não há pagamento por falta de histórico.
        </p>

        <p>
          Unidades específicas cadastradas no responsável têm
          prioridade sobre a região geral. Dessa forma, Jataí,
          Mineiros, Jeep RAM, Barra do Garças, BR, Doca,
          Altamira, Rondonópolis e Primavera do Leste podem ser
          direcionadas individualmente.
        </p>
      </section>
    </section>
  `;
}

function htmlTopbar(
  titulo,
  mostrarExportacao = false
) {
  return `
    <header class="compras-topbar">
      <div>
        <small>MVP</small>
        <h1>${escapar(titulo)}</h1>
      </div>

      <div
        style="
          display:flex;
          align-items:flex-end;
          gap:12px;
          flex-wrap:wrap;
          justify-content:flex-end;
        "
      >
        <div class="compras-history">
          <button
            type="button"
            data-compras-mes="-1"
            title="Mês anterior"
          >
            ‹
          </button>

          <input
            type="month"
            class="compras-competencia-input"
            value="${escapar(state.competencia)}"
          >

          <button
            type="button"
            data-compras-mes="1"
            title="Próximo mês"
          >
            ›
          </button>
        </div>

        ${
          mostrarExportacao
            ? `
              <div
                class="compras-export-box"
                style="
                  display:flex;
                  align-items:flex-end;
                  gap:8px;
                  flex-wrap:wrap;
                "
              >
                <label class="compras-field">
                  <span>Exportar</span>
                  <select
                    class="compras-export-filter"
                    style="min-width:185px"
                  >
                    <option value="todos">
                      Todos os responsáveis
                    </option>

                    <option value="atingiram">
                      Somente quem atingiu meta
                    </option>
                  </select>
                </label>

                <button
                  type="button"
                  class="compras-btn compras-btn-primary"
                  data-compras-exportar="excel"
                >
                  Exportar Excel
                </button>

                <button
                  type="button"
                  class="compras-btn compras-btn-danger"
                  data-compras-exportar="pdf"
                  style="
                    background:#c92d36;
                    border-color:#c92d36;
                    color:#fff;
                  "
                >
                  Exportar PDF
                </button>
              </div>
            `
            : ""
        }
      </div>
    </header>
  `;
}

function htmlPoliticas() {
  return `
    <article class="compras-policy-card">
      <span>Disponibilidade A</span>
      <strong>Meta ≥ 95%</strong>
      <b>${moeda(POLITICA.disponibilidadeA.bonus)}</b>
    </article>

    <article class="compras-policy-card">
      <span>Disponibilidade B</span>
      <strong>Meta ≥ 90%</strong>
      <b>${moeda(POLITICA.disponibilidadeB.bonus)}</b>
    </article>

    <article class="compras-policy-card">
      <span>Obsolescência &gt; 365 dias</span>
      <strong>
        R$ 60 por ponto percentual reduzido
      </strong>
      <b>
        Teto:
        ${percentual(POLITICA.obsolescencia.tetoPercentual)}
        ·
        ${moeda(POLITICA.obsolescencia.bonusMaximo)}
      </b>
    </article>

    <article class="compras-policy-card">
      <span>Controle de O.S.</span>
      <strong>Meta ≤ 10%</strong>
      <b>${moeda(POLITICA.controleOs.bonus)}</b>
    </article>
  `;
}

function garantirPaginas() {
  if ($("#compras-visao-geral")) {
    return;
  }

  const container =
    $("#app-content") ||
    $("#main-content") ||
    $(".main-content") ||
    $("main") ||
    document.body;

  container.insertAdjacentHTML(
    "beforeend",
    htmlPaginas()
  );

  configurarEventosPaginas();
}

function localizarSidebar() {
  return (
    $(".sidebar-nav") ||
    $(".sidebar-menu") ||
    $(".menu-lateral") ||
    $("aside nav") ||
    $("aside") ||
    $(".sidebar")
  );
}

function garantirMenu() {
  if ($("#comprasModuleWrapper")) {
    return true;
  }

  const sidebar =
    localizarSidebar();

  if (!sidebar) {
    return false;
  }

  const wrapper =
    document.createElement("div");

  wrapper.id =
    "comprasModuleWrapper";

  wrapper.className =
    "compras-module-card";

  wrapper.innerHTML = `
    <button
      type="button"
      id="comprasModuleBtn"
      class="compras-sidebar-card"
    >
      <span class="compras-sidebar-icon">
        CMP
      </span>

      <span class="compras-sidebar-text">
        <strong>
          Campanha do Compras
        </strong>
        <small>
          Central de compras
        </small>
      </span>

      <span id="comprasModuleArrow">
        ▾
      </span>
    </button>

    <div
      id="comprasSubmenu"
      class="compras-submenu"
      hidden
    >
      <button type="button" data-compras-nav="visao-geral">
        Visão geral
      </button>

      <button type="button" data-compras-nav="responsaveis">
        Base de responsáveis
      </button>

      <button type="button" data-compras-nav="importacao">
        Importação
      </button>

      <button type="button" data-compras-nav="apuracao">
        Apuração
      </button>

      <button type="button" data-compras-nav="politicas">
        Políticas
      </button>
    </div>
  `;

  /*
  Insere antes do rodapé da sidebar quando possível.
  Isso evita que o menu seja colocado dentro de áreas que
  outros scripts limpam ou recriam.
  */
  const rodape =
    sidebar.querySelector(
      ".sidebar-footer, .sidebar-status, [data-sidebar-footer]"
    );

  if (rodape) {
    rodape.insertAdjacentElement(
      "beforebegin",
      wrapper
    );
  } else {
    sidebar.appendChild(wrapper);
  }

  $("#comprasModuleBtn")
    ?.addEventListener(
      "click",
      () => {
        const submenu =
          $("#comprasSubmenu");

        if (!submenu) return;

        submenu.hidden =
          !submenu.hidden;

        const seta =
          $("#comprasModuleArrow");

        if (seta) {
          seta.textContent =
            submenu.hidden
              ? "▾"
              : "▴";
        }

        if (!submenu.hidden) {
          abrirView(
            state.view ||
            "visao-geral"
          );
        }
      }
    );

  $$("[data-compras-nav]")
    .forEach(botao => {
      botao.addEventListener(
        "click",
        () => {
          abrirView(
            botao.dataset.comprasNav
          );
        }
      );
    });

  return true;
}

function observarMenuCompras() {
  if (state.observerMenu) {
    return;
  }

  const alvo =
    document.body;

  state.observerMenu =
    new MutationObserver(() => {
      if (!$("#comprasModuleWrapper")) {
        garantirMenu();
      }
    });

  state.observerMenu.observe(
    alvo,
    {
      childList: true,
      subtree: true
    }
  );
}

function ocultarViewsExternas() {
  const nossas =
    new Set(
      $$("[data-compras-view]")
    );

  $$(
    "main > section, .main-content > section, #app-content > section"
  ).forEach(section => {
    if (!nossas.has(section)) {
      section.style.display =
        "none";
    }
  });
}

function ocultarCompras() {
  $$("[data-compras-view]")
    .forEach(section => {
      section.classList.remove(
        "active"
      );
    });

  $("#comprasModuleBtn")
    ?.classList.remove(
      "active"
    );
}

async function abrirView(view) {
  state.view = view;

  ocultarViewsExternas();

  $$("[data-compras-view]")
    .forEach(section => {
      section.classList.toggle(
        "active",
        section.dataset.comprasView ===
          view
      );
    });

  $$("[data-compras-nav]")
    .forEach(botao => {
      botao.classList.toggle(
        "active",
        botao.dataset.comprasNav ===
          view
      );
    });

  $("#comprasModuleBtn")
    ?.classList.add(
      "active"
    );

  await renderizarTudo();
}

function configurarOcultacaoExterna() {
  if (state.menuConfigurado) {
    return;
  }

  const sidebar =
    localizarSidebar();

  if (!sidebar) return;

  state.menuConfigurado = true;

  sidebar.addEventListener(
    "click",
    evento => {
      if (
        evento.target.closest(
          "#comprasModuleWrapper"
        )
      ) {
        return;
      }

      ocultarCompras();
    }
  );
}


/* ==========================================================================
   ALERTAS E CONFIRMAÇÕES PREMIUM
========================================================================== */

function garantirConfirmacaoPremium() {
  if ($("#comprasConfirmacaoPremium")) {
    return;
  }

  document.head.insertAdjacentHTML(
    "beforeend",
    `
    <style id="comprasConfirmacaoPremiumCss">
      .compras-confirm-dialog{
        width:min(470px,calc(100vw - 30px));
        padding:0;
        border:0;
        border-radius:22px;
        overflow:hidden;
        background:#fff;
        box-shadow:
          0 30px 90px rgba(5,22,34,.36),
          0 8px 26px rgba(5,22,34,.18);
        animation:comprasConfirmEntrada .2s ease-out
      }

      .compras-confirm-dialog::backdrop{
        background:rgba(5,22,34,.68);
        backdrop-filter:blur(5px);
        animation:comprasConfirmFundo .18s ease-out
      }

      .compras-confirm-shell{
        position:relative;
        padding:26px
      }

      .compras-confirm-close{
        position:absolute;
        top:15px;
        right:15px;
        width:35px;
        height:35px;
        display:grid;
        place-items:center;
        border:0;
        border-radius:50%;
        background:#eef3f6;
        color:#496477;
        font-size:1.2rem;
        cursor:pointer;
        transition:.18s ease
      }

      .compras-confirm-close:hover{
        background:#e2e9ee;
        color:#173044;
        transform:rotate(5deg)
      }

      .compras-confirm-icon{
        width:58px;
        height:58px;
        display:grid;
        place-items:center;
        margin-bottom:18px;
        border-radius:18px;
        font-size:1.65rem;
        box-shadow:0 10px 28px rgba(180,35,35,.15)
      }

      .compras-confirm-icon.danger{
        background:linear-gradient(145deg,#fff0f0,#ffe2e2);
        color:#c62828
      }

      .compras-confirm-icon.warning{
        background:linear-gradient(145deg,#fff8e5,#ffedbd);
        color:#9a6700
      }

      .compras-confirm-eyebrow{
        display:block;
        margin-bottom:7px;
        color:#087354;
        font-size:.68rem;
        font-weight:900;
        letter-spacing:.12em;
        text-transform:uppercase
      }

      .compras-confirm-title{
        margin:0;
        color:#10293b;
        font-size:1.35rem;
        line-height:1.25
      }

      .compras-confirm-message{
        margin:12px 0 0;
        color:#526c7d;
        font-size:.92rem;
        line-height:1.55;
        white-space:pre-line
      }

      .compras-confirm-highlight{
        margin-top:16px;
        padding:13px 14px;
        border:1px solid #ead6d6;
        border-radius:12px;
        background:#fff8f8;
        color:#7f2929;
        font-size:.82rem;
        line-height:1.45
      }

      .compras-confirm-actions{
        display:flex;
        justify-content:flex-end;
        gap:10px;
        margin-top:23px
      }

      .compras-confirm-btn{
        min-height:43px;
        padding:10px 16px;
        border-radius:11px;
        font-weight:900;
        cursor:pointer;
        transition:.18s ease
      }

      .compras-confirm-cancel{
        border:1px solid #d5e0e6;
        background:#fff;
        color:#173044
      }

      .compras-confirm-cancel:hover{
        background:#f4f7f9;
        transform:translateY(-1px)
      }

      .compras-confirm-submit{
        border:0;
        background:linear-gradient(135deg,#d12d2d,#ad1f1f);
        color:#fff;
        box-shadow:0 9px 22px rgba(190,35,35,.24)
      }

      .compras-confirm-submit:hover{
        transform:translateY(-1px);
        box-shadow:0 12px 28px rgba(190,35,35,.32)
      }

      .compras-confirm-submit:active,
      .compras-confirm-cancel:active{
        transform:translateY(0)
      }

      @keyframes comprasConfirmEntrada{
        from{
          opacity:0;
          transform:translateY(12px) scale(.97)
        }
        to{
          opacity:1;
          transform:translateY(0) scale(1)
        }
      }

      @keyframes comprasConfirmFundo{
        from{opacity:0}
        to{opacity:1}
      }

      @media(max-width:520px){
        .compras-confirm-shell{
          padding:22px 18px 18px
        }

        .compras-confirm-actions{
          flex-direction:column-reverse
        }

        .compras-confirm-btn{
          width:100%
        }
      }
    </style>
    `
  );

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <dialog
      id="comprasConfirmacaoPremium"
      class="compras-confirm-dialog"
    >
      <div class="compras-confirm-shell">
        <button
          type="button"
          id="comprasConfirmacaoFechar"
          class="compras-confirm-close"
          aria-label="Fechar"
        >
          ×
        </button>

        <div
          id="comprasConfirmacaoIcone"
          class="compras-confirm-icon danger"
        >
          🗑
        </div>

        <small class="compras-confirm-eyebrow">
          CAMPANHA CENTRAL DE COMPRAS
        </small>

        <h3
          id="comprasConfirmacaoTitulo"
          class="compras-confirm-title"
        >
          Confirmar ação
        </h3>

        <p
          id="comprasConfirmacaoMensagem"
          class="compras-confirm-message"
        ></p>

        <div
          id="comprasConfirmacaoDestaque"
          class="compras-confirm-highlight"
          hidden
        ></div>

        <div class="compras-confirm-actions">
          <button
            type="button"
            id="comprasConfirmacaoCancelar"
            class="compras-confirm-btn compras-confirm-cancel"
          >
            Cancelar
          </button>

          <button
            type="button"
            id="comprasConfirmacaoConfirmar"
            class="compras-confirm-btn compras-confirm-submit"
          >
            Confirmar
          </button>
        </div>
      </div>
    </dialog>
    `
  );
}

function confirmarPremium({
  titulo = "Confirmar ação",
  mensagem = "",
  destaque = "",
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  tipo = "danger"
} = {}) {
  garantirConfirmacaoPremium();

  const dialog =
    $("#comprasConfirmacaoPremium");

  const tituloElemento =
    $("#comprasConfirmacaoTitulo");

  const mensagemElemento =
    $("#comprasConfirmacaoMensagem");

  const destaqueElemento =
    $("#comprasConfirmacaoDestaque");

  const botaoConfirmar =
    $("#comprasConfirmacaoConfirmar");

  const botaoCancelar =
    $("#comprasConfirmacaoCancelar");

  const botaoFechar =
    $("#comprasConfirmacaoFechar");

  const icone =
    $("#comprasConfirmacaoIcone");

  tituloElemento.textContent =
    titulo;

  mensagemElemento.textContent =
    mensagem;

  botaoConfirmar.textContent =
    textoConfirmar;

  botaoCancelar.textContent =
    textoCancelar;

  icone.className =
    `compras-confirm-icon ${tipo}`;

  icone.textContent =
    tipo === "warning"
      ? "⚠"
      : "🗑";

  if (destaque) {
    destaqueElemento.hidden =
      false;

    destaqueElemento.textContent =
      destaque;
  } else {
    destaqueElemento.hidden =
      true;

    destaqueElemento.textContent =
      "";
  }

  return new Promise(resolve => {
    let finalizado = false;

    const finalizar = resultado => {
      if (finalizado) return;

      finalizado = true;

      removerEventos();

      if (dialog.open) {
        dialog.close();
      }

      resolve(resultado);
    };

    const confirmar = () =>
      finalizar(true);

    const cancelar = () =>
      finalizar(false);

    const aoCancelarDialog = evento => {
      evento.preventDefault();
      cancelar();
    };

    const aoClicarFora = evento => {
      const caixa =
        dialog.getBoundingClientRect();

      const fora =
        evento.clientX < caixa.left ||
        evento.clientX > caixa.right ||
        evento.clientY < caixa.top ||
        evento.clientY > caixa.bottom;

      if (fora) {
        cancelar();
      }
    };

    const removerEventos = () => {
      botaoConfirmar.removeEventListener(
        "click",
        confirmar
      );

      botaoCancelar.removeEventListener(
        "click",
        cancelar
      );

      botaoFechar.removeEventListener(
        "click",
        cancelar
      );

      dialog.removeEventListener(
        "cancel",
        aoCancelarDialog
      );

      dialog.removeEventListener(
        "click",
        aoClicarFora
      );
    };

    botaoConfirmar.addEventListener(
      "click",
      confirmar
    );

    botaoCancelar.addEventListener(
      "click",
      cancelar
    );

    botaoFechar.addEventListener(
      "click",
      cancelar
    );

    dialog.addEventListener(
      "cancel",
      aoCancelarDialog
    );

    dialog.addEventListener(
      "click",
      aoClicarFora
    );

    dialog.showModal();

    window.setTimeout(() => {
      botaoCancelar.focus();
    }, 60);
  });
}

/* ==========================================================================
   RENDERIZAÇÃO
========================================================================== */

function statusBadge(status) {
  if (status === "COMPLETO") {
    return `
      <span class="compras-badge compras-success">
        COMPLETO
      </span>
    `;
  }

  if (status === "PARCIAL") {
    return `
      <span class="compras-badge compras-warning">
        PARCIAL
      </span>
    `;
  }

  return `
    <span class="compras-badge compras-danger">
      NÃO ATINGIU
    </span>
  `;
}

function badgeIndicador(
  atingiu,
  textoAtingiu = "ATINGIU",
  textoNao = "NÃO"
) {
  return atingiu
    ? `
      <span class="compras-badge compras-success">
        ${textoAtingiu}
      </span>
    `
    : `
      <span class="compras-badge compras-danger">
        ${textoNao}
      </span>
    `;
}

function renderizarDashboard() {
  const totalInvestido =
    somar(
      state.apuracao.map(item =>
        item.bonusTotal
      )
    );

  const completos =
    state.apuracao.filter(item =>
      item.status === "COMPLETO"
    ).length;

  const parciais =
    state.apuracao.filter(item =>
      item.status === "PARCIAL"
    ).length;

  const unidades =
    new Set(
      state.indicadores
        .filter(item =>
          item.competencia ===
            state.competencia
        )
        .map(item =>
          normalizar(item.unidade)
        )
    ).size;

  $("#comprasDashboardKpis")
    .innerHTML = `
      <article class="compras-kpi">
        <span>Total investido</span>
        <strong>${moeda(totalInvestido)}</strong>
      </article>

      <article class="compras-kpi">
        <span>Campanha completa</span>
        <strong>${completos}</strong>
      </article>

      <article class="compras-kpi">
        <span>Resultado parcial</span>
        <strong>${parciais}</strong>
      </article>

      <article class="compras-kpi">
        <span>Unidades avaliadas</span>
        <strong>${unidades}</strong>
      </article>
    `;

  const totalA =
    state.apuracao.filter(item =>
      item.atingiuA
    ).length;

  const totalB =
    state.apuracao.filter(item =>
      item.atingiuB
    ).length;

  const totalObs =
    somar(
      state.apuracao.map(item =>
        item.detalhesUnidades.filter(unidade =>
          unidade.reduziuObsolescencia
        ).length
      )
    );

  const totalOs =
    state.apuracao.filter(item =>
      item.atingiuOs
    ).length;

  $("#comprasResumoIndicadores")
    .innerHTML = `
      <table class="compras-table">
        <thead>
          <tr>
            <th>Indicador</th>
            <th>Meta</th>
            <th>Quem atingiu</th>
            <th>Investimento</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td><strong>Disponibilidade A</strong></td>
            <td>≥ 95%</td>
            <td>${totalA}</td>
            <td>${moeda(totalA * POLITICA.disponibilidadeA.bonus)}</td>
          </tr>

          <tr>
            <td><strong>Disponibilidade B</strong></td>
            <td>≥ 90%</td>
            <td>${totalB}</td>
            <td>${moeda(totalB * POLITICA.disponibilidadeB.bonus)}</td>
          </tr>

          <tr>
            <td><strong>Obsolescência</strong></td>
            <td>Reduzir vs. mês anterior</td>
            <td>${totalObs}</td>
            <td>${moeda(totalObs * POLITICA.obsolescencia.bonus)}</td>
          </tr>

          <tr>
            <td><strong>Controle de O.S.</strong></td>
            <td>≤ 10%</td>
            <td>${totalOs}</td>
            <td>${moeda(totalOs * POLITICA.controleOs.bonus)}</td>
          </tr>
        </tbody>
      </table>
    `;

  const ranking =
    [...state.apuracao]
      .sort(
        (a, b) =>
          b.bonusTotal -
          a.bonusTotal ||
          b.indicadoresAtingidos -
          a.indicadoresAtingidos
      );

  $("#comprasRanking")
    .innerHTML =
      ranking.length
        ? `
          <table class="compras-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Colaborador</th>
                <th>Indicadores</th>
                <th>Bônus</th>
              </tr>
            </thead>

            <tbody>
              ${
                ranking
                  .map((item, indice) => `
                    <tr>
                      <td>${indice + 1}</td>
                      <td><strong>${escapar(item.nome)}</strong></td>
                      <td>${item.indicadoresAtingidos}/4</td>
                      <td>${moeda(item.bonusTotal)}</td>
                    </tr>
                  `)
                  .join("")
              }
            </tbody>
          </table>
        `
        : `
          <div class="compras-empty">
            Sem dados para exibir.
          </div>
        `;

  $("#comprasResumoMensal")
    .innerHTML =
      htmlTabelaApuracao(
        state.apuracao,
        false
      );
}

function htmlTabelaApuracao(
  dados,
  detalhada = true
) {
  if (!dados.length) {
    return `
      <div class="compras-empty">
        Nenhuma apuração registrada para
        ${escapar(competenciaBr(state.competencia))}.
      </div>
    `;
  }

  return `
    <div class="compras-table-wrap">
      <table class="compras-table">
        <thead>
          <tr>
            <th>Colaborador</th>
            <th>Apuração por núcleo/região</th>
            <th>Controle O.S.</th>
            <th>Metas atingidas</th>
            <th>Bônus A</th>
            <th>Bônus B</th>
            <th>Bônus Obsolescência</th>
            <th>Bônus O.S.</th>
            <th>Bônus total</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          ${
            dados.map(item => `
              <tr>
                <td>
                  <strong>${escapar(item.nome)}</strong>
                </td>

                <td style="min-width:330px">
                  ${
                    item.detalhesNucleosDisponibilidade?.length
                      ? `
                        <div style="margin-bottom:8px">
                          <b style="color:#087354">
                            DISPONIBILIDADE ABC — MÉDIA DAS CASAS
                          </b>

                          ${
                            item.detalhesNucleosDisponibilidade
                              .map(nucleo => `
                                <div style="margin:5px 0;padding:8px 10px;border:1px solid #d8e5eb;border-radius:9px;background:#f7fafb">
                                  <strong>
                                    ${escapar(nucleo.nucleo)}
                                  </strong>
                                  <br>

                                  <small>
                                    Casas:
                                    ${escapar(nucleo.casas.join(", "))}
                                  </small>
                                  <br>

                                  Média A:
                                  ${percentual(nucleo.mediaA)}
                                  ${nucleo.atingiuA ? "✅" : "❌"}

                                  · Média B:
                                  ${percentual(nucleo.mediaB)}
                                  ${nucleo.atingiuB ? "✅" : "❌"}

                                  · Média C:
                                  ${percentual(nucleo.mediaC)}

                                  · Total:
                                  ${percentual(nucleo.mediaTotal)}
                                </div>
                              `)
                              .join("")
                          }

                          <div style="padding:7px 9px;border-radius:8px;background:#eef6f2">
                            <b>
                              Política paga uma única vez:
                              A ${moeda(item.bonusA)}
                              · B ${moeda(item.bonusB)}
                            </b>
                          </div>
                        </div>
                      `
                      : ""
                  }

                  ${
                    item.detalhesUnidades.some(unidade =>
                      unidade.obsolescenciaAtual !== null &&
                      unidade.obsolescenciaAtual !== undefined
                    )
                      ? `
                        <div>
                          <b style="color:#087354">
                            OBSOLESCÊNCIA POR CASA
                          </b>

                          ${
                            item.detalhesUnidades
                              .filter(unidade =>
                                unidade.obsolescenciaAtual !== null &&
                                unidade.obsolescenciaAtual !== undefined
                              )
                              .map(unidade => `
                            <div style="margin:5px 0;padding:7px 9px;border:1px solid #e0e8ec;border-radius:8px;background:#f8fafb">
                              <strong>${escapar(unidade.unidade)}</strong>
                              ${
                                unidade.regiao
                                  ? ` · ${escapar(unidade.regiao)}`
                                  : ""
                              }
                              <br>
                              A:
                              ${percentual(unidade.disponibilidadeA)}
                              ${unidade.atingiuA ? "✅" : "❌"}
                              · B:
                              ${percentual(unidade.disponibilidadeB)}
                              ${unidade.atingiuB ? "✅" : "❌"}
                              <br>
                              Obsolescência:
                              ${
                                unidade.obsolescenciaAtual ===
                                  null ||
                                unidade.obsolescenciaAtual ===
                                  undefined
                                  ? "sem medição"
                                  : `
                                    anterior:
                                    ${percentual(unidade.obsolescenciaAnterior)}
                                    → atual:
                                    ${percentual(unidade.obsolescenciaAtual)}
                                    · ${
                                      unidade.reducaoObsolescencia === null
                                        ? "primeira medição"
                                        : unidade.reducaoObsolescencia > 0
                                          ? `reduziu ${percentual(unidade.reducaoObsolescencia)} ✅`
                                          : unidade.reducaoObsolescencia < 0
                                            ? `aumentou ${percentual(Math.abs(unidade.reducaoObsolescencia))} ❌`
                                            : "sem redução ❌"
                                    }
                                    · bônus:
                                    ${moeda(unidade.bonusObsolescencia)}
                                  `
                              }
                              <br>
                              <b>
                                Bônus do núcleo:
                                ${moeda(
                                  unidade.bonusA +
                                  unidade.bonusB +
                                  unidade.bonusObsolescencia
                                )}
                              </b>
                            </div>
                              `)
                              .join("")
                          }
                        </div>
                      `
                      : (
                          item.detalhesNucleosDisponibilidade?.length
                            ? ""
                            : `
                              <span class="compras-badge compras-neutral">
                                SEM DADOS VINCULADOS
                              </span>
                            `
                        )
                  }
                </td>

                <td>
                  <div class="compras-metric">
                    <strong>${percentual(item.controleOs)}</strong>
                    <small>
                      ${badgeIndicador(item.atingiuOs)}
                    </small>
                  </div>
                </td>

                <td>
                  <strong>
                    ${item.indicadoresAtingidos}/${item.totalMetasPossiveis}
                  </strong>
                </td>

                <td><strong>${moeda(item.bonusA)}</strong></td>
                <td><strong>${moeda(item.bonusB)}</strong></td>
                <td><strong>${moeda(item.bonusObsolescencia)}</strong></td>
                <td><strong>${moeda(item.bonusOs)}</strong></td>
                <td><strong>${moeda(item.bonusTotal)}</strong></td>

                <td>
                  ${statusBadge(item.status)}
                  ${
                    item.ajusteManual
                      ? `
                        <small
                          style="display:block;margin-top:5px;color:#6b7d8a"
                          title="${escapar(item.observacaoAjuste || "")}"
                        >
                          Ajuste manual
                        </small>
                      `
                      : ""
                  }
                </td>

                <td>
                  <div class="compras-actions">
                    <button
                      type="button"
                      class="compras-btn compras-btn-light"
                      data-compras-editar-apuracao="${escapar(item.responsavelId)}"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      class="compras-btn compras-btn-danger"
                      data-compras-excluir-apuracao="${escapar(item.responsavelId)}"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            `).join("")
          }
        </tbody>
      </table>
    </div>
  `;
}


function renderizarEvidenciasCompras() {
  const container =
    $("#comprasEvidenciasTabela");

  if (!container) return;

  const evidencias =
    state.importacoes
      .filter(item =>
        item.competencia ===
          state.competencia
      )
      .sort((a, b) =>
        texto(a.tipoEfetivo)
          .localeCompare(
            texto(b.tipoEfetivo),
            "pt-BR"
          )
      );

  container.innerHTML =
    evidencias.length
      ? `
        <div class="compras-table-wrap">
          <table class="compras-table">
            <thead>
              <tr>
                <th>Competência</th>
                <th>Tipo</th>
                <th>Arquivo</th>
                <th>Aba</th>
                <th>Registros</th>
                <th>Ação</th>
              </tr>
            </thead>

            <tbody>
              ${
                evidencias
                  .map(item => `
                    <tr>
                      <td>${escapar(item.competencia)}</td>
                      <td>
                        <strong>
                          ${escapar(item.tipoEfetivo || item.tipo)}
                        </strong>
                      </td>
                      <td>${escapar(item.arquivo || "—")}</td>
                      <td>${escapar(item.aba || "—")}</td>
                      <td>
                        ${
                          Array.isArray(item.registros)
                            ? item.registros.length
                            : Number(item.quantidade || 0)
                        }
                      </td>
                      <td>
                        <button
                          type="button"
                          class="compras-btn compras-btn-light"
                          data-compras-baixar-evidencia="${escapar(item.id)}"
                        >
                          Baixar evidência
                        </button>
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
        <div class="compras-empty">
          Nenhuma planilha importada foi salva como evidência neste mês.
        </div>
      `;

  $$("[data-compras-baixar-evidencia]")
    .forEach(botao => {
      botao.onclick =
        () => {
          const evidencia =
            state.importacoes.find(item =>
              item.id ===
                botao.dataset.comprasBaixarEvidencia
            );

          baixarEvidenciaImportacao(
            evidencia
          );
        };
    });
}

function baixarEvidenciaImportacao(
  evidencia
) {
  if (!evidencia) return;

  if (!window.XLSX) {
    alerta(
      "A biblioteca XLSX não foi carregada."
    );

    return;
  }

  const registros =
    Array.isArray(evidencia.registros)
      ? evidencia.registros
      : [];

  if (!registros.length) {
    alerta(
      "Esta evidência não possui registros disponíveis para download."
    );

    return;
  }

  const planilha =
    XLSX.utils.json_to_sheet(
      registros
    );

  const livro =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    livro,
    planilha,
    "EVIDENCIA"
  );

  XLSX.writeFile(
    livro,
    [
      "evidencia-compras",
      evidencia.competencia,
      slug(
        evidencia.tipoEfetivo ||
        evidencia.tipo ||
        "importacao"
      )
    ].join("-") + ".xlsx"
  );
}

function configurarEventosApuracao() {
  $$("[data-compras-editar-apuracao]")
    .forEach(botao => {
      botao.onclick =
        () => {
          const apuracao =
            state.apuracao.find(item =>
              item.responsavelId ===
                botao.dataset.comprasEditarApuracao
            );

          if (apuracao) {
            abrirModalApuracao(
              apuracao
            );
          }
        };
    });

  $$("[data-compras-excluir-apuracao]")
    .forEach(botao => {
      botao.onclick =
        async () => {
          const apuracao =
            state.apuracao.find(item =>
              item.responsavelId ===
                botao.dataset.comprasExcluirApuracao
            );

          if (!apuracao) return;

          const confirmou =
            await confirmarPremium({
              titulo:
                "Excluir apuração mensal?",
              mensagem:
                `Você está prestes a excluir a apuração de ${apuracao.nome} na competência ${state.competencia}.`,
              destaque:
                "A planilha importada continuará salva como evidência. Uma nova importação no mesmo mês recriará automaticamente esta apuração.",
              textoConfirmar:
                "Excluir apuração",
              textoCancelar:
                "Manter apuração",
              tipo:
                "danger"
            });

          if (!confirmou) return;

          await excluirApuracaoResponsavel(
            apuracao
          );

          await carregarDados();

          toast(
            "Apuração excluída."
          );
        };
    });
}

function renderizarApuracao() {
  $("#comprasApuracaoTabela")
    .innerHTML =
      htmlTabelaApuracao(
        state.apuracao,
        true
      );

  configurarEventosApuracao();
  renderizarEvidenciasCompras();
}

function renderizarResponsaveis() {
  const container =
    $("#comprasResponsaveisTabela");

  container.innerHTML =
    state.responsaveis.length
      ? `
        <div class="compras-table-wrap">
          <table class="compras-table">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Regiões</th>
                <th>Unidades específicas</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              ${
                state.responsaveis
                  .map(item => `
                    <tr>
                      <td>
                        <strong>${escapar(item.nome)}</strong>
                      </td>

                      <td>
                        ${escapar((item.regioes || []).join(", ") || "—")}
                      </td>

                      <td>
                        ${escapar((item.unidades || []).join(", ") || "—")}
                      </td>

                      <td>
                        ${
                          item.ativo !== false
                            ? '<span class="compras-badge compras-success">ATIVO</span>'
                            : '<span class="compras-badge compras-neutral">INATIVO</span>'
                        }
                      </td>

                      <td>
                        <div class="compras-actions">
                          <button
                            type="button"
                            class="compras-btn compras-btn-light"
                            data-compras-editar="${escapar(item.id)}"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            class="compras-btn compras-btn-danger"
                            data-compras-excluir="${escapar(item.id)}"
                          >
                            Excluir
                          </button>
                        </div>
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
        <div class="compras-empty">
          Nenhum responsável cadastrado.
        </div>
      `;

  $$("[data-compras-editar]")
    .forEach(botao => {
      botao.onclick = () => {
        const responsavel =
          state.responsaveis
            .find(item =>
              item.id ===
              botao.dataset.comprasEditar
            );

        abrirModalResponsavel(
          responsavel
        );
      };
    });

  $$("[data-compras-excluir]")
    .forEach(botao => {
      botao.onclick = async () => {
        const responsavel =
          state.responsaveis.find(item =>
            item.id ===
              botao.dataset.comprasExcluir
          );

        const confirmou =
          await confirmarPremium({
            titulo:
              "Excluir responsável?",
            mensagem:
              `O cadastro de ${responsavel?.nome || "este responsável"} será removido da base da Campanha Central de Compras.`,
            destaque:
              "As apurações históricas e evidências importadas não serão apagadas, mas o responsável deixará de participar das próximas apurações.",
            textoConfirmar:
              "Excluir responsável",
            textoCancelar:
              "Cancelar",
            tipo:
              "danger"
          });

        if (!confirmou) {
          return;
        }

        await excluirResponsavel(
          botao.dataset.comprasExcluir
        );

        await carregarDados();

        toast(
          "Responsável excluído."
        );
      };
    });
}

function renderizarImportacao() {
  const importacao =
    state.importacao;

  const nome =
    $("#comprasImportNome");

  if (!nome) return;

  nome.textContent =
    importacao.arquivo?.name ||
    "Nenhum";

  $("#comprasImportValidos")
    .textContent =
      importacao.registros.length;

  $("#comprasImportErros")
    .textContent =
      importacao.erros.length;

  $("#comprasImportAvisos")
    .textContent =
      importacao.avisos.length;

  const campos = [
    "competencia",
    "unidade",
    "regiao",
    "disponibilidadeA",
    "disponibilidadeB",
    "disponibilidadeC",
    "disponibilidadeTotal",
    "indiceObsolescencia",
    "controleOs"
  ];

  $("#comprasImportPreview")
    .innerHTML =
      importacao.registros.length
        ? `
          <table class="compras-table">
            <thead>
              <tr>
                ${
                  campos.map(campo =>
                    `<th>${escapar(campo)}</th>`
                  ).join("")
                }
              </tr>
            </thead>

            <tbody>
              ${
                importacao.registros
                  .slice(0, 12)
                  .map(item => `
                    <tr>
                      ${
                        campos.map(campo => `
                          <td>
                            ${
                              [
                                "disponibilidadeA",
                                "disponibilidadeB",
                                "disponibilidadeC",
                                "disponibilidadeTotal",
                                "indiceObsolescencia",
                                "controleOs"
                              ].includes(campo)
                                ? percentual(item[campo])
                                : escapar(item[campo])
                            }
                          </td>
                        `).join("")
                      }
                    </tr>
                  `)
                  .join("")
              }
            </tbody>
          </table>
        `
        : `
          <div class="compras-empty">
            Selecione um arquivo para visualizar os dados.
          </div>
        `;

  const mensagens = [
    ...importacao.erros.map(mensagem => ({
      tipo: "error",
      mensagem
    })),
    ...importacao.avisos.map(mensagem => ({
      tipo: "alert",
      mensagem
    }))
  ];

  $("#comprasImportValidacao")
    .innerHTML =
      mensagens.length
        ? mensagens.map(item => `
            <div class="compras-${item.tipo}">
              ${escapar(item.mensagem)}
            </div>
          `).join("")
        : `
          <div class="compras-ok">
            Nenhum erro encontrado.
          </div>
        `;

  const confirmar =
    $("#btnConfirmarImportacaoCompras");

  confirmar.disabled =
    importacao.processando ||
    importacao.erros.length > 0 ||
    importacao.registros.length === 0;

  confirmar.textContent =
    importacao.processando
      ? "Importando..."
      : "Confirmar importação";
}

function renderizarCompetencias() {
  $$(".compras-competencia-input")
    .forEach(input => {
      input.value =
        state.competencia;
    });

  if ($("#comprasImportCompetencia")) {
    $("#comprasImportCompetencia")
      .value =
        state.importacao.competencia;
  }

  $$(".compras-export-filter")
    .forEach(select => {
      select.value =
        state.exportacaoFiltro;
    });
}

async function renderizarTudo() {
  recalcularApuracao();
  renderizarCompetencias();
  renderizarDashboard();
  renderizarApuracao();
  renderizarResponsaveis();
  renderizarImportacao();
}


/* ==========================================================================
   MODAL DE AJUSTE DA APURAÇÃO
========================================================================== */

function garantirModalApuracao() {
  if ($("#comprasApuracaoModal")) {
    return;
  }

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <dialog
      id="comprasApuracaoModal"
      class="compras-modal"
    >
      <form method="dialog">
        <header class="compras-modal-header">
          <div>
            <small>CORREÇÃO MANUAL</small>
            <h3 id="comprasApuracaoModalTitulo">
              Editar apuração
            </h3>
          </div>

          <button
            type="button"
            id="comprasApuracaoModalFechar"
            class="compras-modal-close"
          >
            ×
          </button>
        </header>

        <div class="compras-modal-body">
          <input
            type="hidden"
            id="comprasApuracaoResponsavelId"
          >

          <div class="compras-form-grid">
            <label class="compras-field">
              <span>Bônus Curva A</span>
              <input
                type="number"
                min="0"
                step="0.01"
                id="comprasAjusteBonusA"
              >
            </label>

            <label class="compras-field">
              <span>Bônus Curva B</span>
              <input
                type="number"
                min="0"
                step="0.01"
                id="comprasAjusteBonusB"
              >
            </label>

            <label class="compras-field">
              <span>Bônus Obsolescência</span>
              <input
                type="number"
                min="0"
                step="0.01"
                id="comprasAjusteBonusObsolescencia"
              >
            </label>

            <label class="compras-field">
              <span>Bônus Controle O.S.</span>
              <input
                type="number"
                min="0"
                step="0.01"
                id="comprasAjusteBonusOs"
              >
            </label>

            <label class="compras-field">
              <span>Status</span>
              <select id="comprasAjusteStatus">
                <option value="AJUSTADO">AJUSTADO</option>
                <option value="COMPLETO">COMPLETO</option>
                <option value="PARCIAL">PARCIAL</option>
                <option value="NÃO ATINGIU">NÃO ATINGIU</option>
              </select>
            </label>
          </div>

          <label
            class="compras-field"
            style="margin-top:11px"
          >
            <span>Motivo da correção</span>
            <textarea
              id="comprasAjusteObservacao"
              placeholder="Explique por que a apuração foi corrigida."
            ></textarea>
          </label>
        </div>

        <footer class="compras-modal-footer">
          <button
            type="button"
            id="comprasApuracaoModalCancelar"
            class="compras-btn compras-btn-light"
          >
            Cancelar
          </button>

          <button
            type="button"
            id="comprasApuracaoModalSalvar"
            class="compras-btn compras-btn-primary"
          >
            Salvar correção
          </button>
        </footer>
      </form>
    </dialog>
    `
  );

  $("#comprasApuracaoModalFechar")
    .onclick =
      fecharModalApuracao;

  $("#comprasApuracaoModalCancelar")
    .onclick =
      fecharModalApuracao;

  $("#comprasApuracaoModalSalvar")
    .onclick =
      salvarModalApuracao;
}

function abrirModalApuracao(
  apuracao
) {
  garantirModalApuracao();

  $("#comprasApuracaoResponsavelId")
    .value =
      apuracao.responsavelId;

  $("#comprasApuracaoModalTitulo")
    .textContent =
      `Editar apuração — ${apuracao.nome}`;

  $("#comprasAjusteBonusA")
    .value =
      Number(apuracao.bonusA || 0);

  $("#comprasAjusteBonusB")
    .value =
      Number(apuracao.bonusB || 0);

  $("#comprasAjusteBonusObsolescencia")
    .value =
      Number(
        apuracao.bonusObsolescencia || 0
      );

  $("#comprasAjusteBonusOs")
    .value =
      Number(apuracao.bonusOs || 0);

  $("#comprasAjusteStatus")
    .value =
      apuracao.status === "AJUSTADO"
        ? "AJUSTADO"
        : apuracao.status;

  $("#comprasAjusteObservacao")
    .value =
      apuracao.observacaoAjuste || "";

  $("#comprasApuracaoModal")
    .showModal();
}

function fecharModalApuracao() {
  $("#comprasApuracaoModal")
    ?.close();
}

async function salvarModalApuracao() {
  const responsavelId =
    texto(
      $("#comprasApuracaoResponsavelId")
        .value
    );

  const apuracao =
    state.apuracao.find(item =>
      item.responsavelId ===
        responsavelId
    );

  if (!apuracao) {
    await alerta(
      "A apuração selecionada não foi encontrada."
    );

    return;
  }

  await salvarAjusteApuracao({
    competencia:
      state.competencia,
    responsavelId,
    nome:
      apuracao.nome,
    bonusA:
      numero(
        $("#comprasAjusteBonusA")
          .value
      ),
    bonusB:
      numero(
        $("#comprasAjusteBonusB")
          .value
      ),
    bonusObsolescencia:
      numero(
        $("#comprasAjusteBonusObsolescencia")
          .value
      ),
    bonusOs:
      numero(
        $("#comprasAjusteBonusOs")
          .value
      ),
    status:
      $("#comprasAjusteStatus")
        .value,
    observacao:
      texto(
        $("#comprasAjusteObservacao")
          .value
      ),
    excluida:
      false
  });

  fecharModalApuracao();

  await carregarDados();

  toast(
    "Apuração corrigida com sucesso."
  );
}

/* ==========================================================================
   MODAL RESPONSÁVEL
========================================================================== */

function garantirModalResponsavel() {
  if ($("#comprasResponsavelModal")) {
    return;
  }

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <dialog
      id="comprasResponsavelModal"
      class="compras-modal"
    >
      <form method="dialog">
        <header class="compras-modal-header">
          <div>
            <small>BASE DE RESPONSÁVEIS</small>
            <h3 id="comprasResponsavelTitulo">
              Novo responsável
            </h3>
          </div>

          <button
            type="button"
            id="comprasResponsavelFechar"
            class="compras-modal-close"
          >
            ×
          </button>
        </header>

        <div class="compras-modal-body">
          <input
            type="hidden"
            id="comprasResponsavelId"
          >

          <div class="compras-form-grid">
            <label class="compras-field">
              <span>Nome</span>
              <input
                type="text"
                id="comprasResponsavelNome"
                required
              >
            </label>

            <label class="compras-field">
              <span>Status</span>
              <select id="comprasResponsavelAtivo">
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
          </div>

          <label
            class="compras-field"
            style="margin-top:11px"
          >
            <span>Regiões, separadas por vírgula</span>
            <input
              type="text"
              id="comprasResponsavelRegioes"
              placeholder="MT, RO"
            >
          </label>

          <label
            class="compras-field"
            style="margin-top:11px"
          >
            <span>Unidades específicas, separadas por vírgula</span>
            <textarea
              id="comprasResponsavelUnidades"
              placeholder="JATAI, MINEIROS, JEEP RAM"
            ></textarea>
          </label>
        </div>

        <footer class="compras-modal-footer">
          <button
            type="button"
            id="comprasResponsavelCancelar"
            class="compras-btn compras-btn-light"
          >
            Cancelar
          </button>

          <button
            type="button"
            id="comprasResponsavelSalvar"
            class="compras-btn compras-btn-primary"
          >
            Salvar
          </button>
        </footer>
      </form>
    </dialog>
    `
  );

  $("#comprasResponsavelFechar")
    .onclick =
      fecharModalResponsavel;

  $("#comprasResponsavelCancelar")
    .onclick =
      fecharModalResponsavel;

  $("#comprasResponsavelSalvar")
    .onclick =
      salvarModalResponsavel;
}

function abrirModalResponsavel(
  responsavel = null
) {
  garantirModalResponsavel();

  $("#comprasResponsavelTitulo")
    .textContent =
      responsavel
        ? "Editar responsável"
        : "Novo responsável";

  $("#comprasResponsavelId")
    .value =
      responsavel?.id || "";

  $("#comprasResponsavelNome")
    .value =
      responsavel?.nome || "";

  $("#comprasResponsavelAtivo")
    .value =
      responsavel?.ativo === false
        ? "false"
        : "true";

  $("#comprasResponsavelRegioes")
    .value =
      (responsavel?.regioes || [])
        .join(", ");

  $("#comprasResponsavelUnidades")
    .value =
      (responsavel?.unidades || [])
        .join(", ");

  $("#comprasResponsavelModal")
    .showModal();
}

function fecharModalResponsavel() {
  $("#comprasResponsavelModal")
    ?.close();
}

function listaSeparada(valor) {
  return texto(valor)
    .split(",")
    .map(item =>
      normalizar(item)
    )
    .filter(Boolean);
}

async function salvarModalResponsavel() {
  const botaoSalvar =
    $("#comprasResponsavelSalvar");

  if (botaoSalvar?.disabled) {
    return;
  }

  const nome =
    texto(
      $("#comprasResponsavelNome")
        .value
    );

  if (!nome) {
    await alerta(
      "Informe o nome do responsável."
    );

    return;
  }

  const idAtual =
    texto(
      $("#comprasResponsavelId")
        .value
    );

  const responsavelAnterior =
    state.responsaveis.find(item =>
      item.id === idAtual
    );

  const regioes =
    listaSeparada(
      $("#comprasResponsavelRegioes")
        .value
    );

  const unidades =
    listaSeparada(
      $("#comprasResponsavelUnidades")
        .value
    );

  const responsavel = {
    ...(
      responsavelAnterior ||
      {}
    ),
    id:
      idAtual ||
      slug(nome),
    nome,
    regioes,
    unidades,
    ativo:
      $("#comprasResponsavelAtivo")
        .value === "true"
  };

  try {
    if (botaoSalvar) {
      botaoSalvar.disabled =
        true;

      botaoSalvar.textContent =
        "Salvando...";
    }

    const salvo =
      await salvarResponsavel(
        responsavel
      );

    /*
    Confere os arrays retornados pelo Firestore antes de fechar.
    */
    const regioesSalvas =
      (salvo.regioes || [])
        .map(normalizar);

    const unidadesSalvas =
      (salvo.unidades || [])
        .map(normalizar);

    const regioesCorretas =
      JSON.stringify(regioesSalvas) ===
      JSON.stringify(regioes);

    const unidadesCorretas =
      JSON.stringify(unidadesSalvas) ===
      JSON.stringify(unidades);

    if (
      !regioesCorretas ||
      !unidadesCorretas
    ) {
      throw new Error(
        "O Firebase respondeu, mas as atribuições salvas não correspondem ao que foi informado."
      );
    }

    fecharModalResponsavel();

    recalcularApuracao();
    await renderizarTudo();

    toast(
      "Atribuições atualizadas com sucesso."
    );
  } catch (erro) {
    console.error(
      "[CAMPANHA COMPRAS] Erro ao editar responsável:",
      erro
    );

    await alerta(
      erro.message ||
      "Não foi possível atualizar as atribuições."
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

/* ==========================================================================
   EXPORTAÇÃO
========================================================================== */

function obterApuracaoParaExportacao() {
  const dados =
    state.exportacaoFiltro ===
      "atingiram"
      ? state.apuracao.filter(item =>
          Number(item.bonusTotal || 0) > 0
        )
      : [...state.apuracao];

  return dados;
}

function linhaApuracaoExportacao(
  item
) {
  return {
    Competencia:
      item.competencia,
    Colaborador:
      item.nome,
    Unidades:
      item.unidadesAvaliadas.join(", "),
    Disponibilidade_A:
      item.disponibilidadeA,
    Atingiu_A:
      item.atingiuA
        ? "SIM"
        : "NÃO",
    Bonus_A:
      item.bonusA,
    Disponibilidade_B:
      item.disponibilidadeB,
    Atingiu_B:
      item.atingiuB
        ? "SIM"
        : "NÃO",
    Bonus_B:
      item.bonusB,
    Obsolescencia_Atual:
      item.obsolescenciaAtual,
    Obsolescencia_Anterior:
      item.obsolescenciaAnterior,
    Diferenca_Obsolescencia:
      item.diferencaObsolescencia,
    Reduziu_Obsolescencia:
      item.reduziuObsolescencia
        ? "SIM"
        : "NÃO",
    Bonus_Obsolescencia:
      item.bonusObsolescencia,
    Controle_OS:
      item.controleOs,
    Atingiu_OS:
      item.atingiuOs
        ? "SIM"
        : "NÃO",
    Bonus_OS:
      item.bonusOs,
    Indicadores_Atingidos:
      item.indicadoresAtingidos,
    Bonus_Total:
      item.bonusTotal,
    Status:
      item.status,
    Detalhamento_Disponibilidade_ABC:
      (item.detalhesNucleosDisponibilidade || [])
        .map(nucleo => [
          `Núcleo ${nucleo.nucleo}`,
          `Casas ${nucleo.casas.join(", ")}`,
          `Média A ${percentual(nucleo.mediaA)} (${nucleo.atingiuA ? "ATINGIU" : "NÃO ATINGIU"})`,
          `Média B ${percentual(nucleo.mediaB)} (${nucleo.atingiuB ? "ATINGIU" : "NÃO ATINGIU"})`,
          `Média C ${percentual(nucleo.mediaC)}`,
          `Total ${percentual(nucleo.mediaTotal)}`
        ].join(" | "))
        .join(" ; "),
    Detalhamento_Obsolescencia:
      item.detalhesUnidades
        .filter(unidade =>
          unidade.obsolescenciaAtual !== null &&
          unidade.obsolescenciaAtual !== undefined
        )
        .map(unidade => [
          unidade.unidade,
          `A ${percentual(unidade.disponibilidadeA)} (${unidade.atingiuA ? "SIM" : "NÃO"})`,
          `B ${percentual(unidade.disponibilidadeB)} (${unidade.atingiuB ? "SIM" : "NÃO"})`,
          `Obsolescência anterior ${percentual(unidade.obsolescenciaAnterior)}`,
          `Obsolescência atual ${percentual(unidade.obsolescenciaAtual)}`,
          `Redução ${percentual(unidade.reducaoObsolescencia)}`,
          `Bônus obsolescência ${moeda(unidade.bonusObsolescencia)}`,
          `Bônus ${moeda(
            unidade.bonusA +
            unidade.bonusB +
            unidade.bonusObsolescencia
          )}`
        ].join(" | "))
        .join(" ; ")
  };
}

function evidenciasDaCompetencia() {
  return state.importacoes
    .filter(item =>
      item.competencia ===
        state.competencia
    )
    .sort((a, b) =>
      texto(
        a.tipoEfetivo ||
        a.tipo
      ).localeCompare(
        texto(
          b.tipoEfetivo ||
          b.tipo
        ),
        "pt-BR"
      )
    );
}

function nomeAbaExcel(
  valor,
  indice
) {
  const base =
    texto(valor)
      .replace(/[\\/?*\[\]:]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 24) ||
    `EVIDENCIA ${indice + 1}`;

  return `${indice + 1}-${base}`
    .slice(0, 31);
}

function exportarApuracaoExcel() {
  if (!window.XLSX) {
    alerta(
      "A biblioteca XLSX não foi carregada."
    );

    return;
  }

  const apuracao =
    obterApuracaoParaExportacao();

  if (!apuracao.length) {
    alerta(
      "Nenhum responsável corresponde ao filtro selecionado."
    );

    return;
  }

  const livro =
    XLSX.utils.book_new();

  const dadosApuracao =
    apuracao.map(
      linhaApuracaoExportacao
    );

  const planilhaApuracao =
    XLSX.utils.json_to_sheet(
      dadosApuracao
    );

  XLSX.utils.book_append_sheet(
    livro,
    planilhaApuracao,
    "APURACAO COMPRAS"
  );

  /*
  Cada planilha usada na importação é incluída como uma aba
  de evidência no mesmo arquivo Excel exportado.
  */
  evidenciasDaCompetencia()
    .forEach((evidencia, indice) => {
      const registros =
        Array.isArray(
          evidencia.registros
        )
          ? evidencia.registros
          : [];

      const dados =
        registros.length
          ? registros
          : [
              {
                Competencia:
                  evidencia.competencia,
                Tipo:
                  evidencia.tipoEfetivo ||
                  evidencia.tipo,
                Arquivo:
                  evidencia.arquivo ||
                  "—",
                Aba:
                  evidencia.aba ||
                  "—",
                Quantidade:
                  evidencia.quantidade ||
                  0,
                Observacao:
                  "Os dados completos desta evidência não estavam armazenados nesta versão."
              }
            ];

      const planilhaEvidencia =
        XLSX.utils.json_to_sheet(
          dados
        );

      XLSX.utils.book_append_sheet(
        livro,
        planilhaEvidencia,
        nomeAbaExcel(
          evidencia.tipoEfetivo ||
          evidencia.tipo ||
          "EVIDENCIA",
          indice
        )
      );
    });

  const sufixo =
    state.exportacaoFiltro ===
      "atingiram"
      ? "atingiram-meta"
      : "todos";

  XLSX.writeFile(
    livro,
    `campanha-compras-${state.competencia}-${sufixo}.xlsx`
  );

  toast(
    "Excel exportado com apuração e evidências."
  );
}

function htmlEvidenciasParaImpressao() {
  const evidencias =
    evidenciasDaCompetencia();

  if (!evidencias.length) {
    return `
      <section class="print-section">
        <h2>Evidências das importações</h2>
        <p class="print-empty">
          Nenhuma evidência registrada para esta competência.
        </p>
      </section>
    `;
  }

  return `
    <section class="print-section print-page-break">
      <h2>Evidências das importações</h2>

      ${
        evidencias.map(
          (evidencia, indice) => {
            const registros =
              Array.isArray(
                evidencia.registros
              )
                ? evidencia.registros
                : [];

            const colunas =
              registros.length
                ? Object.keys(
                    registros[0]
                  ).filter(chave =>
                    ![
                      "arquivoOrigem",
                      "linhaOrigem",
                      "tipoImportacao",
                      "aplicacaoGlobal"
                    ].includes(chave)
                  )
                : [];

            return `
              <article class="evidence-block">
                <h3>
                  Evidência ${indice + 1} —
                  ${escapar(
                    evidencia.tipoEfetivo ||
                    evidencia.tipo ||
                    "Importação"
                  )}
                </h3>

                <div class="evidence-meta">
                  <b>Arquivo:</b>
                  ${escapar(evidencia.arquivo || "—")}
                  &nbsp; | &nbsp;
                  <b>Aba:</b>
                  ${escapar(evidencia.aba || "—")}
                  &nbsp; | &nbsp;
                  <b>Registros:</b>
                  ${
                    registros.length ||
                    Number(
                      evidencia.quantidade ||
                      0
                    )
                  }
                </div>

                ${
                  registros.length
                    ? `
                      <table>
                        <thead>
                          <tr>
                            ${
                              colunas
                                .map(coluna =>
                                  `<th>${escapar(coluna)}</th>`
                                )
                                .join("")
                            }
                          </tr>
                        </thead>

                        <tbody>
                          ${
                            registros
                              .map(registro => `
                                <tr>
                                  ${
                                    colunas
                                      .map(coluna =>
                                        `<td>${escapar(
                                          registro[coluna] ??
                                          ""
                                        )}</td>`
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
                      <p class="print-empty">
                        Metadados da evidência preservados, mas os registros completos não estavam disponíveis.
                      </p>
                    `
                }
              </article>
            `;
          }
        ).join("")
      }
    </section>
  `;
}

function exportarApuracaoPdf() {
  const apuracao =
    obterApuracaoParaExportacao();

  if (!apuracao.length) {
    alerta(
      "Nenhum responsável corresponde ao filtro selecionado."
    );

    return;
  }

  const janela =
    window.open(
      "",
      "_blank",
      "width=1200,height=850"
    );

  if (!janela) {
    alerta(
      "O navegador bloqueou a janela de impressão. Autorize pop-ups para este site."
    );

    return;
  }

  const totalInvestido =
    somar(
      apuracao.map(item =>
        item.bonusTotal
      )
    );

  const filtroDescricao =
    state.exportacaoFiltro ===
      "atingiram"
      ? "Somente responsáveis que atingiram pelo menos uma meta"
      : "Todos os responsáveis";

  janela.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>
          Campanha Central de Compras —
          ${escapar(state.competencia)}
        </title>

        <style>
          *{
            box-sizing:border-box
          }

          body{
            margin:0;
            padding:24px;
            color:#132b3c;
            font-family:Arial,Helvetica,sans-serif;
            font-size:10px
          }

          .report-header{
            padding:22px;
            border-radius:14px;
            color:#fff;
            background:linear-gradient(135deg,#0b3154,#4d4517)
          }

          .report-header small{
            font-weight:bold;
            letter-spacing:.12em
          }

          .report-header h1{
            margin:7px 0 5px;
            font-size:24px
          }

          .report-header p{
            margin:0;
            color:#e6edf2
          }

          .summary{
            display:grid;
            grid-template-columns:repeat(3,1fr);
            gap:10px;
            margin:14px 0
          }

          .summary article{
            padding:12px;
            border:1px solid #dce6ec;
            border-radius:9px
          }

          .summary span{
            display:block;
            color:#647987;
            font-size:9px;
            text-transform:uppercase
          }

          .summary strong{
            display:block;
            margin-top:5px;
            font-size:16px
          }

          .print-section{
            margin-top:18px
          }

          h2{
            margin:0 0 9px;
            font-size:17px
          }

          h3{
            margin:0 0 7px;
            font-size:13px
          }

          table{
            width:100%;
            margin-bottom:14px;
            border-collapse:collapse;
            page-break-inside:auto
          }

          th,
          td{
            padding:6px;
            border:1px solid #cfdbe2;
            text-align:left;
            vertical-align:top
          }

          th{
            background:#eef3f6;
            font-size:8px;
            text-transform:uppercase
          }

          tr{
            page-break-inside:avoid
          }

          .money{
            white-space:nowrap;
            font-weight:bold
          }

          .evidence-block{
            margin:0 0 18px;
            padding:12px;
            border:1px solid #d5e1e7;
            border-radius:9px;
            page-break-inside:avoid
          }

          .evidence-meta{
            margin-bottom:9px;
            color:#526c7d
          }

          .print-empty{
            padding:14px;
            border:1px dashed #cbd8df;
            border-radius:8px;
            color:#657a88
          }

          .print-page-break{
            break-before:page;
            page-break-before:always
          }

          @page{
            size:landscape;
            margin:10mm
          }

          @media print{
            body{
              padding:0
            }
          }
        </style>
      </head>

      <body>
        <header class="report-header">
          <small>RELATÓRIO MENSAL</small>
          <h1>Campanha Central de Compras</h1>
          <p>
            Competência:
            ${escapar(competenciaBr(state.competencia))}
            · Filtro:
            ${escapar(filtroDescricao)}
          </p>
        </header>

        <section class="summary">
          <article>
            <span>Responsáveis exportados</span>
            <strong>${apuracao.length}</strong>
          </article>

          <article>
            <span>Total investido</span>
            <strong>${moeda(totalInvestido)}</strong>
          </article>

          <article>
            <span>Evidências anexadas</span>
            <strong>${evidenciasDaCompetencia().length}</strong>
          </article>
        </section>

        <section class="print-section">
          <h2>Apuração mensal</h2>

          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Núcleos/Regiões</th>
                <th>Metas</th>
                <th>Bônus A</th>
                <th>Bônus B</th>
                <th>Bônus Obsolescência</th>
                <th>Bônus O.S.</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              ${
                apuracao.map(item => `
                  <tr>
                    <td><b>${escapar(item.nome)}</b></td>
                    <td>
                      ${escapar(
                        item.unidadesAvaliadas.join(", ") ||
                        "—"
                      )}
                    </td>
                    <td>
                      ${item.indicadoresAtingidos}/
                      ${item.totalMetasPossiveis}
                    </td>
                    <td class="money">${moeda(item.bonusA)}</td>
                    <td class="money">${moeda(item.bonusB)}</td>
                    <td class="money">${moeda(item.bonusObsolescencia)}</td>
                    <td class="money">${moeda(item.bonusOs)}</td>
                    <td class="money">${moeda(item.bonusTotal)}</td>
                    <td>${escapar(item.status)}</td>
                  </tr>
                `).join("")
              }
            </tbody>
          </table>
        </section>

        ${htmlEvidenciasParaImpressao()}
      </body>
    </html>
  `);

  janela.document.close();

  janela.addEventListener(
    "load",
    () => {
      window.setTimeout(() => {
        janela.focus();
        janela.print();
      }, 350);
    },
    {
      once: true
    }
  );
}

/* ==========================================================================
   EVENTOS
========================================================================== */

function configurarEventosPaginas() {
  document.addEventListener(
    "click",
    evento => {
      const botaoMes =
        evento.target.closest(
          "[data-compras-mes]"
        );

      if (!botaoMes) return;

      state.competencia =
        deslocarCompetencia(
          state.competencia,
          Number(
            botaoMes.dataset.comprasMes
          )
        );

      state.importacao.competencia =
        state.competencia;

      renderizarTudo();
    }
  );

  document.addEventListener(
    "change",
    evento => {
      if (
        evento.target.matches(
          ".compras-competencia-input"
        )
      ) {
        state.competencia =
          evento.target.value;

        state.importacao.competencia =
          state.competencia;

        renderizarTudo();
      }
    }
  );

  $("#btnNovoResponsavelCompras")
    .onclick =
      () =>
        abrirModalResponsavel();

  $("#btnModeloCompras")
    .onclick =
      baixarModelo;

  $("#btnVerApuracaoCompras")
    .onclick =
      () =>
        abrirView("apuracao");

  $("#comprasImportCompetencia")
    .onchange =
      evento => {
        state.importacao.competencia =
          evento.target.value;

        processarImportacao();
      };

  $("#comprasImportTipo")
    .onchange =
      evento => {
        state.importacao.tipo =
          evento.target.value;

        processarImportacao();
      };

  $("#comprasImportAba")
    .onchange =
      evento => {
        carregarAbaImportacao(
          evento.target.value
        );
      };

  $("#comprasImportArquivo")
    .onchange =
      async evento => {
        try {
          await lerArquivoImportacao(
            evento.target.files?.[0]
          );
        } catch (erro) {
          await alerta(
            erro.message
          );
        }
      };

  $("#btnLimparImportacaoCompras")
    .onclick =
      limparImportacao;

  $("#btnConfirmarImportacaoCompras")
    .onclick =
      confirmarImportacao;

  document.addEventListener(
    "change",
    evento => {
      if (
        !evento.target.matches(
          ".compras-export-filter"
        )
      ) {
        return;
      }

      state.exportacaoFiltro =
        evento.target.value;

      $$(".compras-export-filter")
        .forEach(select => {
          select.value =
            state.exportacaoFiltro;
        });
    }
  );

  document.addEventListener(
    "click",
    evento => {
      const botao =
        evento.target.closest(
          "[data-compras-exportar]"
        );

      if (!botao) return;

      const tipo =
        botao.dataset.comprasExportar;

      if (tipo === "excel") {
        exportarApuracaoExcel();
      }

      if (tipo === "pdf") {
        exportarApuracaoPdf();
      }
    }
  );
}

/* ==========================================================================
   CARREGAMENTO
========================================================================== */

async function carregarDados() {
  if (state.carregando) {
    return;
  }

  state.carregando = true;

  try {
    state.responsaveis =
      await garantirResponsaveisPadrao();

    const [
      indicadores,
      importacoes,
      ajustes
    ] = await Promise.all([
      lerColecaoOpcional(
        COLECOES.indicadores,
        []
      ),
      lerColecaoOpcional(
        COLECOES.importacoes,
        []
      ),
      lerColecaoOpcional(
        COLECOES.ajustes,
        []
      )
    ]);

    state.indicadores =
      indicadores;

    state.importacoes =
      importacoes;

    state.ajustes =
      ajustes;

    recalcularApuracao();

    await renderizarTudo();
  } catch (erro) {
    console.error(
      "[CAMPANHA COMPRAS]",
      erro
    );

    /*
    Mesmo com erro de Firebase, o menu e as páginas permanecem
    disponíveis. O erro fica no console para diagnóstico.
    */
    toast(
      "O módulo de Compras abriu, mas alguns dados não puderam ser carregados."
    );
  } finally {
    state.carregando = false;
  }
}

async function iniciar() {
  if (state.inicializado) {
    garantirMenu();
    return;
  }

  state.inicializado = true;

  try {
    estilos();
  } catch (erro) {
    console.error(
      "[CAMPANHA COMPRAS] Erro ao carregar estilos:",
      erro
    );
  }

  try {
    garantirPaginas();
    garantirModalResponsavel();
    garantirModalApuracao();
    garantirConfirmacaoPremium();
  } catch (erro) {
    console.error(
      "[CAMPANHA COMPRAS] Erro ao criar páginas:",
      erro
    );
  }

  /*
  O menu é criado antes de qualquer consulta ao Firebase.
  Assim ele não desaparece por erro de permissão ou rede.
  */
  garantirMenu();
  observarMenuCompras();

  let tentativas = 0;

  const timer =
    window.setInterval(() => {
      tentativas += 1;

      const encontrou =
        garantirMenu();

      if (encontrou) {
        configurarOcultacaoExterna();
      }

      if (
        encontrou ||
        tentativas >= 60
      ) {
        window.clearInterval(timer);
      }
    }, 250);

  try {
    await carregarDados();
  } catch (erro) {
    console.error(
      "[CAMPANHA COMPRAS] Falha não bloqueante ao carregar dados:",
      erro
    );
  }

  /*
  Revalida o menu depois do carregamento porque module-switcher
  ou outros scripts podem reconstruir a sidebar.
  */
  garantirMenu();
  configurarOcultacaoExterna();

  window.comprasModule = {
    abrir(view = "visao-geral") {
      garantirMenu();
      return abrirView(view);
    },

    recarregar:
      carregarDados,

    restaurarMenu() {
      return garantirMenu();
    },

    restaurarResponsaveisPadrao,

    obterEstado() {
      return {
        ...state,
        responsaveis:
          [...state.responsaveis],
        indicadores:
          [...state.indicadores],
        apuracao:
          [...state.apuracao]
      };
    },

    versao:
      VERSAO
  };

  console.info(
    `[CAMPANHA COMPRAS] ${VERSAO} carregado`
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