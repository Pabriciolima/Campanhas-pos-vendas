/*
 * AUDITORIA PREMIUM v08 — 19/08/2026
 * Interface de leitura humana: ação clara, antes → depois, contexto e dados técnicos.
 * Mantém senha, Firebase, histórico, filtros, Excel e PDF.
 */
/*
 * AJUSTE 2026.08.19-06
 * - Campo da senha da Auditoria sempre abre vazio.
 * - Reduz autofill de navegadores/gerenciadores de senha.
 * - Senha permanece 123321 internamente, sem aparecer pré-preenchida.
 * - Nenhuma regra de auditoria, filtros, Firebase ou histórico foi alterada.
 */

/*
 * AUDITORIA AVANÇADA v05 — 19/08/2026
 *
 * Correções críticas:
 * - senha 123321 para abrir a Auditoria;
 * - ID único por evento (não sobrescreve logs idênticos);
 * - horário autoritativo via serverTimestamp do Firebase;
 * - grava epoch, ISO local com offset, timezone e sessão;
 * - remove limite de 250 e carrega todo o histórico existente;
 * - filtros de filial, data inicial, data final, módulo, ação e busca;
 * - exportações continuam usando exatamente os filtros aplicados;
 * - helper opcional de snapshot histórico dos registros atuais;
 * - não altera regras de Produtivos, Pix, importação, cálculo ou banco principal.
 *
 * Limite técnico honesto:
 * alterações antigas que nunca foram registradas pela coleção de auditoria
 * não podem ser reconstruídas fielmente depois do fato. O helper de backfill
 * registra o estado atual e aproveita timestamps existentes nos documentos,
 * sem inventar eventos passados.
 */

/*
 * AJUSTE 2026.08.09-04
 * - Auditoria identifica editor autorizado por sessão.
 * - Registra/exibe IP público quando disponível.
 * - Registra ID da sessão de edição.
 * - Compatível com controle-edicao-campanhas.js.
 */
/*
===============================================================================
AUDITORIA COMPLETA — CAMPANHAS PÓS-VENDAS
Arquivo: auditoria-campanhas.js
Versão: 2026.08.08-01
===============================================================================

OBJETIVO
- Auditar Produtivos e Pix do Presidente sem alterar os módulos existentes.
- Registra criação, alteração, exclusão, importação e desligamento.
- Mantém antes/depois dos campos alterados.
- Mostra painel visual de auditoria dentro do sistema.
- A coleção de auditoria é somente de histórico; o script não edita registros antigos.

COLEÇÃO FIRESTORE
auditoria_campanhas

IMPORTANTE SOBRE "QUEM ALTEROU"
O sistema atual não possui autenticação individual por usuário. Por isso este módulo
identifica a sessão/dispositivo de forma persistente no navegador e usa um nome
salvo em localStorage quando existir. Caso futuramente seja adicionado Firebase Auth,
a função resolverAutor() pode ser ligada ao usuário autenticado.
===============================================================================
*/

import { firestore } from "./firebase-config.js";

import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const AUDITORIA_VERSAO = "2026.08.19-08";
const COLECAO_AUDITORIA = "auditoria_campanhas";

const FONTES_AUDITORIA = [
  {
    colecao: "funcionarios",
    modulo: "PRODUTIVOS",
    entidade: "FUNCIONÁRIO"
  },
  {
    colecao: "produtivos_lancamentos",
    modulo: "PRODUTIVOS",
    entidade: "LANÇAMENTO"
  },
  {
    colecao: "pix_presidente_funcionarios",
    modulo: "PIX",
    entidade: "PARTICIPANTE"
  },
  {
    colecao: "pix_presidente_lancamentos",
    modulo: "PIX",
    entidade: "LANÇAMENTO"
  }
];

const estadoAuditoria = {
  bases: new Map(),
  logs: [],
  pronto: false,

  // A auditoria pode ser consultada somente após a senha.
  acessoLiberado:
    sessionStorage.getItem(
      "auditoria_acesso_liberado_v1"
    ) === "true"
};

const SENHA_AUDITORIA = "123321";

function texto(valor) {
  return String(valor ?? "").trim();
}

function normalizar(valor) {
  return texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
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

function objetoSeguro(valor) {
  if (valor === null || valor === undefined) return valor;

  if (typeof valor?.toDate === "function") {
    try {
      return valor.toDate().toISOString();
    } catch (_) {
      return String(valor);
    }
  }

  if (Array.isArray(valor)) {
    return valor.map(objetoSeguro);
  }

  if (typeof valor === "object") {
    const saida = {};
    Object.keys(valor)
      .sort()
      .forEach(chave => {
        saida[chave] = objetoSeguro(valor[chave]);
      });
    return saida;
  }

  return valor;
}

function jsonEstavel(valor) {
  try {
    return JSON.stringify(objetoSeguro(valor));
  } catch (_) {
    return String(valor ?? "");
  }
}

function hashTexto(valor) {
  const str = String(valor ?? "");
  let hash = 2166136261;

  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function idDispositivo() {
  const chave = "campanhas_auditoria_dispositivo_v1";
  let id = localStorage.getItem(chave);

  if (!id) {
    id =
      "DEV-" +
      Math.random().toString(36).slice(2, 8).toUpperCase() +
      "-" +
      Date.now().toString(36).toUpperCase();

    localStorage.setItem(chave, id);
  }

  return id;
}

function resolverAutor() {
  /*
   * Prioridade:
   * 1. Sessão de edição autorizada;
   * 2. Identificação antiga/local;
   * 3. Usuário genérico.
   *
   * A sessão é criada pelo arquivo
   * controle-edicao-campanhas.js.
   */
  const nomeSessao =
    sessionStorage.getItem(
      "campanhas_editor_nome"
    );

  const ipSessao =
    sessionStorage.getItem(
      "campanhas_editor_ip"
    );

  const sessaoId =
    sessionStorage.getItem(
      "campanhas_editor_sessao"
    );

  if (texto(nomeSessao)) {
    return {
      nome: texto(nomeSessao),
      dispositivo: idDispositivo(),
      ip: texto(ipSessao),
      sessaoId: texto(sessaoId)
    };
  }

  const chaves = [
    "campanhas_usuario_nome",
    "usuario_nome",
    "userName",
    "nomeUsuario",
    "nome_usuario"
  ];

  for (const chave of chaves) {
    const valor =
      sessionStorage.getItem(chave) ||
      localStorage.getItem(chave);

    if (texto(valor)) {
      return {
        nome: texto(valor),
        dispositivo: idDispositivo(),
        ip:
          texto(
            sessionStorage.getItem(
              "campanhas_editor_ip"
            )
          ),
        sessaoId:
          texto(
            sessionStorage.getItem(
              "campanhas_editor_sessao"
            )
          )
      };
    }
  }

  return {
    nome: "Usuário do sistema",
    dispositivo: idDispositivo(),
    ip: "",
    sessaoId: ""
  };
}

function nomeRegistro(dados, id) {
  return (
    texto(dados?.nome) ||
    texto(dados?.descricao) ||
    texto(dados?.funcionarioNome) ||
    texto(dados?.colaborador) ||
    texto(dados?.arquivoImportado) ||
    id
  );
}

const CAMPOS_IGNORADOS = new Set([
  "atualizadoEm",
  "criadoEm",
  "desligadoEm",
  "importadoEm",
  "timestamp",
  "updatedAt",
  "createdAt"
]);

function diffObjetos(antes = {}, depois = {}) {
  const chaves = new Set([
    ...Object.keys(antes || {}),
    ...Object.keys(depois || {})
  ]);

  const alteracoes = [];

  [...chaves]
    .sort()
    .forEach(campo => {
      if (CAMPOS_IGNORADOS.has(campo)) return;

      const valorAntes = objetoSeguro(antes?.[campo]);
      const valorDepois = objetoSeguro(depois?.[campo]);

      if (jsonEstavel(valorAntes) !== jsonEstavel(valorDepois)) {
        alteracoes.push({
          campo,
          antes: valorAntes ?? null,
          depois: valorDepois ?? null
        });
      }
    });

  return alteracoes;
}

function classificarAcao(tipoMudanca, antes, depois) {
  if (tipoMudanca === "removed") {
    return "EXCLUSÃO";
  }

  if (
    depois?.ativo === false &&
    antes?.ativo !== false
  ) {
    return "DESLIGAMENTO";
  }

  if (
    texto(depois?.origemImportacao) ||
    texto(depois?.arquivoImportado)
  ) {
    return "IMPORTAÇÃO";
  }

  if (tipoMudanca === "added") {
    return "CRIAÇÃO";
  }

  return "ALTERAÇÃO";
}

function resumoAcao(acao, entidade, nome, alteracoes) {
  if (acao === "ALTERAÇÃO" && alteracoes?.length) {
    return `${entidade} alterado: ${nome} (${alteracoes.length} campo(s))`;
  }

  const rotulos = {
    "CRIAÇÃO": "criado",
    "EXCLUSÃO": "excluído",
    "IMPORTAÇÃO": "importado/atualizado",
    "DESLIGAMENTO": "desligado"
  };

  return `${entidade} ${rotulos[acao] || "alterado"}: ${nome}`;
}

async function gravarAuditoria({
  fonte,
  idDocumento,
  tipoMudanca,
  antes,
  depois
}) {
  try {
    const acao =
      classificarAcao(
        tipoMudanca,
        antes,
        depois
      );

    const baseRegistro =
      depois || antes || {};

    const alteracoes =
      tipoMudanca === "modified"
        ? diffObjetos(
            antes || {},
            depois || {}
          )
        : [];

    if (
      tipoMudanca === "modified" &&
      alteracoes.length === 0
    ) {
      return;
    }

    const nome =
      nomeRegistro(
        baseRegistro,
        idDocumento
      );

    const autor = resolverAutor();

    const assinatura = [
      fonte.colecao,
      idDocumento,
      acao,
      jsonEstavel(objetoSeguro(depois)),
      jsonEstavel(objetoSeguro(antes))
    ].join("|");

    const idLog =
      idLogUnico(
        fonte,
        idDocumento,
        acao,
        assinatura
      );

    const payload = {
      versao: AUDITORIA_VERSAO,
      modulo: fonte.modulo,
      colecaoOrigem: fonte.colecao,
      entidade: fonte.entidade,
      acao,
      documentoId: idDocumento,
      nomeRegistro: nome,
      competencia:
        texto(baseRegistro?.competencia),
      semana:
        Number(baseRegistro?.semana || 0) || null,
      filial:
        texto(baseRegistro?.filial),
      dn:
        texto(baseRegistro?.dn),
      cargo:
        texto(baseRegistro?.cargo),
      arquivoImportado:
        texto(baseRegistro?.arquivoImportado),
      origemImportacao:
        texto(baseRegistro?.origemImportacao),
      resumo:
        resumoAcao(
          acao,
          fonte.entidade,
          nome,
          alteracoes
        ),
      alteracoes,
      antes:
        tipoMudanca === "removed"
          ? objetoSeguro(antes)
          : null,
      depois:
        tipoMudanca === "added"
          ? objetoSeguro(depois)
          : null,
      autorNome: autor.nome,
      autorDispositivo: autor.dispositivo,
      autorIp: autor.ip || "",
      sessaoEdicaoId: autor.sessaoId || "",

      /*
       * registradoEm = horário AUTORITATIVO do Firebase.
       * registradoEmEpoch/Cliente são apoio de diagnóstico.
       */
      registradoEm:
        serverTimestamp(),

      registradoEmEpoch:
        Date.now(),

      registradoEmCliente:
        dataLocalIsoComOffset(),

      timezoneCliente:
        Intl.DateTimeFormat()
          .resolvedOptions()
          .timeZone || "",

      offsetMinutosCliente:
        new Date()
          .getTimezoneOffset(),

      dataEventoOrigem:
        extrairDataEventoOrigem(
          baseRegistro
        ),

      auditoriaId:
        idLog
    };

    await setDoc(
      doc(
        firestore,
        COLECAO_AUDITORIA,
        idLog
      ),
      payload,
      {
        merge: false
      }
    );
  } catch (erro) {
    console.error(
      "[AUDITORIA] Não foi possível registrar a mudança:",
      erro
    );
  }
}

function observarFonte(fonte) {
  const mapa = new Map();
  estadoAuditoria.bases.set(
    fonte.colecao,
    mapa
  );

  let primeiraCarga = true;

  onSnapshot(
    collection(
      firestore,
      fonte.colecao
    ),
    snapshot => {
      if (primeiraCarga) {
        snapshot.docs.forEach(documento => {
          mapa.set(
            documento.id,
            objetoSeguro(
              documento.data()
            )
          );
        });

        primeiraCarga = false;
        return;
      }

      snapshot.docChanges().forEach(mudanca => {
        const id = mudanca.doc.id;

        const antes =
          mapa.has(id)
            ? structuredClone(
                mapa.get(id)
              )
            : null;

        const depois =
          mudanca.type === "removed"
            ? null
            : objetoSeguro(
                mudanca.doc.data()
              );

        if (mudanca.type === "removed") {
          mapa.delete(id);
        } else {
          mapa.set(
            id,
            structuredClone(
              depois
            )
          );
        }

        gravarAuditoria({
          fonte,
          idDocumento: id,
          tipoMudanca:
            mudanca.type,
          antes,
          depois
        });
      });
    },
    erro => {
      console.error(
        `[AUDITORIA] Erro ao observar ${fonte.colecao}:`,
        erro
      );
    }
  );
}


function timestampParaMillis(valor) {
  if (!valor) {
    return 0;
  }

  try {
    if (
      typeof valor?.toMillis ===
      "function"
    ) {
      return valor.toMillis();
    }

    if (
      typeof valor?.toDate ===
      "function"
    ) {
      return valor
        .toDate()
        .getTime();
    }

    if (
      typeof valor ===
      "number"
    ) {
      return valor;
    }

    const data =
      new Date(valor);

    return Number.isNaN(
      data.getTime()
    )
      ? 0
      : data.getTime();
  } catch (_) {
    return 0;
  }
}

function millisDoLog(log) {
  return (
    timestampParaMillis(
      log.registradoEm
    ) ||
    Number(
      log.registradoEmEpoch ||
      0
    ) ||
    timestampParaMillis(
      log.registradoEmCliente
    ) ||
    timestampParaMillis(
      log.dataEventoOrigem
    ) ||
    0
  );
}

function extrairDataEventoOrigem(
  registro
) {
  if (!registro) {
    return "";
  }

  const campos = [
    "atualizadoEm",
    "updatedAt",
    "dataAtualizacao",
    "dataAlteracao",
    "alteradoEm",
    "criadoEm",
    "createdAt",
    "dataCriacao",
    "salvoEm",
    "timestamp"
  ];

  for (
    const campo of campos
  ) {
    if (
      registro[campo] !==
      undefined &&
      registro[campo] !==
      null &&
      registro[campo] !==
      ""
    ) {
      return objetoSeguro(
        registro[campo]
      );
    }
  }

  return "";
}

function dataLocalIsoComOffset() {
  const agora =
    new Date();

  const pad =
    valor =>
      String(valor)
        .padStart(2, "0");

  const offsetMinutos =
    -agora.getTimezoneOffset();

  const sinal =
    offsetMinutos >= 0
      ? "+"
      : "-";

  const absoluto =
    Math.abs(
      offsetMinutos
    );

  const offset =
    sinal +
    pad(
      Math.floor(
        absoluto / 60
      )
    ) +
    ":" +
    pad(
      absoluto % 60
    );

  return (
    agora.getFullYear() +
    "-" +
    pad(
      agora.getMonth() + 1
    ) +
    "-" +
    pad(
      agora.getDate()
    ) +
    "T" +
    pad(
      agora.getHours()
    ) +
    ":" +
    pad(
      agora.getMinutes()
    ) +
    ":" +
    pad(
      agora.getSeconds()
    ) +
    "." +
    String(
      agora.getMilliseconds()
    ).padStart(3, "0") +
    offset
  );
}

function idLogUnico(
  fonte,
  idDocumento,
  acao,
  assinatura
) {
  /*
   * A versão antiga usava somente um hash estável.
   * Se a mesma alteração acontecesse novamente,
   * o setDoc podia sobrescrever um log anterior.
   *
   * Agora CADA evento possui ID próprio.
   */
  const agora =
    Date.now();

  const aleatorio =
    Math.random()
      .toString(36)
      .slice(2, 9);

  return [
    fonte.modulo
      .toLowerCase(),
    fonte.colecao,
    idDocumento,
    acao,
    agora,
    hashTexto(
      assinatura
    ),
    aleatorio
  ]
    .join("-")
    .replace(
      /[^a-zA-Z0-9_-]/g,
      "_"
    );
}


function rotuloCampoAuditoria(campo) {
  const chave = normalizar(campo);

  const mapa = {
    ID:"Identificador",
    METASEMANAL:"Meta semanal",
    REALIZADOSEMANAL:"Realizado semanal",
    TICKETMEDIO:"Ticket médio",
    MARGEMREALIZADA:"Margem realizada",
    METANPS:"Meta de NPS",
    NPSREALIZADO:"NPS realizado",
    OSEMABERTO:"O.S. em aberto",
    FATURAMENTO:"Faturamento",
    HORASDISPONIVEIS:"Horas disponíveis",
    HORASTRABALHADAS:"Horas trabalhadas",
    HORASVENDIDAS:"Horas vendidas",
    PRODUTIVIDADE:"Produtividade",
    EFICIENCIA:"Eficiência",
    TREINAMENTO:"Treinamento",
    RETRABALHO:"Retrabalho",
    FILIAL:"Filial",
    DN:"DN",
    CARGO:"Cargo",
    NOME:"Nome",
    COLABORADOR:"Colaborador",
    COMPETENCIA:"Competência",
    SEMANA:"Semana",
    STATUS:"Status",
    TOTAL:"Total",
    BONUS:"Bônus",
    BONUSTOTAL:"Bônus total",
    BONUSTICKET:"Bônus ticket",
    PENALIDADE:"Penalidade",
    META:"Meta",
    REALIZADO:"Realizado"
  };

  return mapa[chave] ||
    texto(campo)
      .replace(/([a-z])([A-Z])/g,"$1 $2")
      .replace(/_/g," ")
      .replace(/\b\w/g,letra=>letra.toUpperCase());
}

function campoEhMoeda(campo) {
  const chave = normalizar(campo);

  return [
    "META","REALIZADO","METASEMANAL","REALIZADOSEMANAL",
    "TICKETMEDIO","FATURAMENTO","BONUS","BONUSTOTAL",
    "BONUSTICKET","PENALIDADE","TOTAL"
  ].some(termo=>chave.includes(termo));
}

function campoEhPercentual(campo) {
  const chave = normalizar(campo);

  return [
    "MARGEM","NPS","PRODUTIVIDADE","EFICIENCIA","OSEMABERTO"
  ].some(termo=>chave.includes(termo));
}

function formatarValorAuditoria(campo,valor) {
  if (valor===null || valor===undefined || valor==="") return "—";

  if (typeof valor==="object") {
    try {
      return JSON.stringify(valor,null,2);
    } catch (_) {
      return String(valor);
    }
  }

  const numeroValor =
    typeof valor==="number"
      ? valor
      : Number(
          String(valor)
            .replace(/\./g,"")
            .replace(",",".")
            .replace(/[^\d.-]/g,"")
        );

  if (campoEhMoeda(campo) && Number.isFinite(numeroValor)) {
    return new Intl.NumberFormat(
      "pt-BR",
      {style:"currency",currency:"BRL"}
    ).format(numeroValor);
  }

  if (campoEhPercentual(campo) && Number.isFinite(numeroValor)) {
    return numeroValor.toFixed(2).replace(".",",")+"%";
  }

  return String(valor);
}

function descreverAcaoAuditoria(log) {
  const acao = normalizar(log.acao);
  const entidade = texto(log.entidade) || "Registro";
  const nome = texto(log.nomeRegistro) || "Sem identificação";

  if (acao==="CRIACAO") {
    return {
      titulo:`${entidade} incluído`,
      destaque:nome,
      descricao:"Novo registro inserido no sistema.",
      icone:"+",
      classe:"criacao"
    };
  }

  if (acao==="ALTERACAO") {
    return {
      titulo:`${entidade} alterado`,
      destaque:nome,
      descricao:"Um ou mais dados foram modificados.",
      icone:"↻",
      classe:"alteracao"
    };
  }

  if (acao==="IMPORTACAO") {
    return {
      titulo:`${entidade} atualizado por importação`,
      destaque:nome,
      descricao:"Dados alterados por uma importação de arquivo.",
      icone:"⇩",
      classe:"importacao"
    };
  }

  if (acao==="EXCLUSAO" || acao==="DESLIGAMENTO") {
    return {
      titulo:acao==="DESLIGAMENTO"
        ? `${entidade} desligado`
        : `${entidade} excluído`,
      destaque:nome,
      descricao:acao==="DESLIGAMENTO"
        ? "Retirado da base ativa, com histórico preservado."
        : "Registro removido do sistema.",
      icone:"×",
      classe:"exclusao"
    };
  }

  if (acao==="SESSAO DE EDICAO") {
    return {
      titulo:"Sessão de edição iniciada",
      destaque:texto(log.autorNome)||nome,
      descricao:"Um usuário autorizado iniciou uma sessão de alteração.",
      icone:"🔐",
      classe:"sessao"
    };
  }

  return {
    titulo:texto(log.resumo)||`${entidade} atualizado`,
    destaque:nome,
    descricao:"Evento registrado pela auditoria.",
    icone:"•",
    classe:"neutro"
  };
}

function resumoAlteracoesAuditoria(log) {
  const alteracoes = Array.isArray(log.alteracoes) ? log.alteracoes : [];

  if (!alteracoes.length && normalizar(log.acao)==="CRIACAO" && log.depois) {
    return Object.entries(log.depois)
      .filter(([campo,valor])=>
        !["id","createdAt","updatedAt","criadoEm","atualizadoEm"].includes(campo) &&
        valor!==null && valor!==undefined && valor!==""
      )
      .slice(0,10)
      .map(([campo,valor])=>({
        rotulo:rotuloCampoAuditoria(campo),
        antes:"—",
        depois:formatarValorAuditoria(campo,valor)
      }));
  }

  return alteracoes.map(item=>({
    rotulo:rotuloCampoAuditoria(item.campo),
    antes:formatarValorAuditoria(item.campo,item.antes),
    depois:formatarValorAuditoria(item.campo,item.depois)
  }));
}

function formatarData(valor) {
  let data = null;

  if (valor?.toDate) {
    data = valor.toDate();
  } else if (valor) {
    data = new Date(valor);
  }

  if (!data || Number.isNaN(data.getTime())) {
    return "Agora";
  }

  return data.toLocaleString(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short"
    }
  );
}

function rotuloModulo(valor) {
  return valor === "PIX"
    ? "Pix do Presidente"
    : "Campanha dos Produtivos";
}

function valorBonito(valor) {
  if (valor === null || valor === undefined) {
    return "—";
  }

  if (typeof valor === "boolean") {
    return valor ? "Sim" : "Não";
  }

  if (typeof valor === "object") {
    const json = jsonEstavel(valor);
    return json.length > 120
      ? `${json.slice(0, 117)}...`
      : json;
  }

  const str = String(valor);
  return str.length > 120
    ? `${str.slice(0, 117)}...`
    : str;
}

function garantirInterfaceAuditoria() {
  if (
    document.querySelector(
      "#auditoriaCampanhasModal"
    )
  ) {
    return;
  }

  const estilo =
    document.createElement("style");

  estilo.id =
    "auditoriaCampanhasStyle";

  estilo.textContent = `
    .auditoria-atalho {
      display:inline-flex;
      align-items:center;
      gap:8px;
      min-height:38px;
      padding:0 14px;
      border:1px solid #d6e2e8;
      border-radius:11px;
      background:#fff;
      color:#17324a;
      font:inherit;
      font-size:12px;
      font-weight:800;
      cursor:pointer;
      box-shadow:0 6px 18px rgba(23,50,74,.06);
    }

    .auditoria-atalho:hover {
      transform:translateY(-1px);
      box-shadow:0 9px 24px rgba(23,50,74,.10);
    }

    .auditoria-modal {
      position:fixed;
      inset:0;
      z-index:999998;
      display:none;
      padding:20px;
      background:rgba(5,22,38,.72);
      backdrop-filter:blur(7px);
      -webkit-backdrop-filter:blur(7px);
    }

    .auditoria-modal.aberto {
      display:grid;
      place-items:center;
    }

    .auditoria-card {
      width:min(1180px,100%);
      max-height:min(88vh,920px);
      overflow:hidden;
      display:grid;
      grid-template-rows:auto auto 1fr;
      border:1px solid rgba(255,255,255,.72);
      border-radius:24px;
      background:#f8fbfc;
      box-shadow:0 32px 90px rgba(0,0,0,.32);
    }

    .auditoria-cabecalho {
      display:flex;
      justify-content:space-between;
      gap:20px;
      padding:24px 26px 18px;
      background:#fff;
      border-bottom:1px solid #e2ebef;
    }

    .auditoria-cabecalho small {
      display:block;
      margin-bottom:5px;
      color:#087a54;
      font-size:10px;
      font-weight:900;
      letter-spacing:.12em;
    }

    .auditoria-cabecalho h2 {
      margin:0;
      color:#112a3f;
      font-size:24px;
    }

    .auditoria-cabecalho-acoes {
      display:flex;
      align-items:center;
      gap:8px;
      flex-wrap:wrap;
      justify-content:flex-end;
    }

    .auditoria-exportar {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:38px;
      padding:0 13px;
      border:1px solid #d5e1e7;
      border-radius:10px;
      background:#fff;
      color:#17324a;
      font:inherit;
      font-size:11px;
      font-weight:900;
      cursor:pointer;
    }

    .auditoria-exportar.excel {
      border-color:#b9dfd0;
      color:#087346;
      background:#f4fbf8;
    }

    .auditoria-exportar.pdf {
      border-color:#efcaca;
      color:#b52b2b;
      background:#fff7f7;
    }

    .auditoria-fechar {
      width:38px;
      height:38px;
      border:0;
      border-radius:50%;
      background:#edf3f6;
      color:#526b7b;
      font-size:24px;
      cursor:pointer;
    }


    .auditoria-senha-backdrop {
      position:fixed;
      inset:0;
      z-index:2147483647;
      display:grid;
      place-items:center;
      padding:20px;
      background:rgba(4,21,37,.76);
      backdrop-filter:blur(8px);
    }

    .auditoria-senha-card {
      width:min(420px,100%);
      box-sizing:border-box;
      padding:28px;
      border-radius:22px;
      background:#fff;
      color:#173249;
      box-shadow:0 32px 90px rgba(0,0,0,.32);
    }

    .auditoria-senha-icon {
      width:54px;
      height:54px;
      display:grid;
      place-items:center;
      margin-bottom:14px;
      border-radius:17px;
      background:#e6f5ef;
      font-size:23px;
    }

    .auditoria-senha-card small {
      color:#07845e;
      font-size:9px;
      font-weight:900;
      letter-spacing:.13em;
    }

    .auditoria-senha-card h3 {
      margin:6px 0 8px;
      font-size:22px;
    }

    .auditoria-senha-card p {
      margin:0 0 17px;
      color:#718392;
      font-size:12px;
      line-height:1.5;
    }

    .auditoria-senha-card input {
      width:100%;
      min-height:46px;
      box-sizing:border-box;
      padding:0 13px;
      border:1px solid #cddbe3;
      border-radius:11px;
      outline:none;
      font:inherit;
    }

    .auditoria-senha-card input:focus {
      border-color:#07845e;
      box-shadow:0 0 0 3px rgba(7,132,94,.11);
    }

    .auditoria-senha-erro {
      margin-top:9px;
      color:#c52e2e;
      font-size:11px;
      font-weight:800;
    }

    .auditoria-senha-acoes {
      display:flex;
      justify-content:flex-end;
      gap:9px;
      margin-top:18px;
    }

    .auditoria-senha-acoes button {
      min-height:40px;
      padding:0 15px;
      border-radius:10px;
      font:inherit;
      font-size:11px;
      font-weight:900;
      cursor:pointer;
    }

    .auditoria-senha-cancelar {
      border:1px solid #d8e2e8;
      background:#fff;
      color:#536b7a;
    }

    .auditoria-senha-entrar {
      border:0;
      background:#07845e;
      color:#fff;
    }

    .auditoria-filtros {
      display:grid;
      grid-template-columns:1fr 1fr minmax(220px,2fr);
      gap:10px;
      padding:14px 26px;
      background:#fff;
      border-bottom:1px solid #e2ebef;
    }

    .auditoria-filtros select,
    .auditoria-filtros input {
      width:100%;
      min-height:42px;
      box-sizing:border-box;
      padding:0 12px;
      border:1px solid #d5e0e6;
      border-radius:10px;
      background:#fff;
      font:inherit;
      font-size:12px;
      outline:none;
    }

    .auditoria-lista {
      overflow:auto;
      padding:18px 20px 24px;
    }

    .auditoria-item {
      position:relative;
      margin-bottom:12px;
      padding:17px 18px;
      border:1px solid #dfe9ed;
      border-radius:15px;
      background:#fff;
      box-shadow:0 8px 20px rgba(16,42,63,.045);
    }

    .auditoria-item-topo {
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:14px;
    }

    .auditoria-item-meta {
      display:flex;
      flex-wrap:wrap;
      gap:7px;
      margin-bottom:7px;
    }

    .auditoria-chip {
      display:inline-flex;
      align-items:center;
      min-height:24px;
      padding:0 8px;
      border-radius:999px;
      background:#edf4f7;
      color:#496272;
      font-size:9px;
      font-weight:900;
      letter-spacing:.04em;
    }

    .auditoria-chip.acao {
      background:#e5f6ee;
      color:#087346;
    }

    .auditoria-chip.exclusao,
    .auditoria-chip.desligamento {
      background:#ffe8e5;
      color:#a72d23;
    }

    .auditoria-chip.importacao {
      background:#fff1cf;
      color:#8c6000;
    }

    .auditoria-item h3 {
      margin:0 0 4px;
      color:#17324a;
      font-size:14px;
    }

    .auditoria-item p {
      margin:0;
      color:#6a7d89;
      font-size:11px;
      line-height:1.55;
    }

    .auditoria-data {
      white-space:nowrap;
      color:#718490;
      font-size:10px;
      font-weight:700;
    }

    .auditoria-diffs {
      margin-top:12px;
      display:grid;
      gap:7px;
    }

    .auditoria-diff {
      display:grid;
      grid-template-columns:minmax(120px,.8fr) 1fr 30px 1fr;
      align-items:center;
      gap:8px;
      padding:8px 10px;
      border-radius:10px;
      background:#f7fafb;
      color:#536b79;
      font-size:10px;
    }

    .auditoria-diff strong {
      color:#253f53;
      overflow-wrap:anywhere;
    }

    .auditoria-vazio {
      padding:44px 20px;
      text-align:center;
      color:#71838f;
      font-size:13px;
    }

    @media (max-width:720px) {
      .auditoria-modal { padding:10px; }
      .auditoria-card {
        max-height:94vh;
        border-radius:18px;
      }
      .auditoria-cabecalho {
        padding:19px 17px 15px;
      }
      .auditoria-cabecalho h2 {
        font-size:20px;
      }
      .auditoria-filtros {
        grid-template-columns:1fr;
        padding:12px 17px;
      }
      .auditoria-lista {
        padding:13px;
      }
      .auditoria-item-topo {
        display:block;
      }
      .auditoria-data {
        display:block;
        margin-top:8px;
      }
      .auditoria-diff {
        grid-template-columns:1fr;
      }
      .auditoria-diff .seta {
        display:none;
      }
    }

    .auditoria-item {
      position:relative;
      overflow:hidden;
      padding:18px;
      border:1px solid #dce6eb;
      border-radius:16px;
      background:linear-gradient(180deg,#fff,#fbfcfd);
      box-shadow:0 10px 26px rgba(18,47,67,.055);
      transition:.18s ease;
    }

    .auditoria-item:hover {
      transform:translateY(-1px);
      border-color:#c8d8e0;
      box-shadow:0 16px 34px rgba(18,47,67,.09);
    }

    .auditoria-item::before {
      content:"";
      position:absolute;
      inset:0 auto 0 0;
      width:4px;
      background:#9bb2c0;
    }

    .auditoria-item[data-tipo="criacao"]::before{background:#0b9a69}
    .auditoria-item[data-tipo="alteracao"]::before{background:#3178c6}
    .auditoria-item[data-tipo="importacao"]::before{background:#d39a13}
    .auditoria-item[data-tipo="exclusao"]::before{background:#d94a4a}
    .auditoria-item[data-tipo="sessao"]::before{background:#7055d9}

    .auditoria-leitura-topo {
      display:grid;
      grid-template-columns:auto 1fr auto;
      gap:12px;
      align-items:start;
    }

    .auditoria-leitura-icone {
      width:38px;
      height:38px;
      display:grid;
      place-items:center;
      border-radius:12px;
      background:#eef4f7;
      color:#27465b;
      font-size:17px;
      font-weight:900;
    }

    .auditoria-item[data-tipo="criacao"] .auditoria-leitura-icone {
      background:#e6f7ef;color:#087852;
    }
    .auditoria-item[data-tipo="alteracao"] .auditoria-leitura-icone {
      background:#eaf3ff;color:#2f6fb3;
    }
    .auditoria-item[data-tipo="importacao"] .auditoria-leitura-icone {
      background:#fff4d7;color:#9a6b00;
    }
    .auditoria-item[data-tipo="exclusao"] .auditoria-leitura-icone {
      background:#fff0f0;color:#bd3434;
    }

    .auditoria-leitura-titulo {
      margin:0;
      color:#102b3e;
      font-size:14px;
      font-weight:900;
      line-height:1.3;
    }

    .auditoria-leitura-titulo span {
      color:#087453;
    }

    .auditoria-leitura-descricao {
      margin:4px 0 0;
      color:#738591;
      font-size:10px;
      line-height:1.45;
    }

    .auditoria-chips {
      display:flex;
      flex-wrap:wrap;
      gap:6px;
      margin-top:10px;
    }

    .auditoria-chip {
      display:inline-flex;
      align-items:center;
      min-height:23px;
      padding:0 8px;
      border-radius:999px;
      background:#eef3f6;
      color:#526b7a;
      font-size:8px;
      font-weight:850;
    }

    .auditoria-chip strong {
      margin-left:4px;
      color:#19374b;
    }

    .auditoria-data-humana {
      text-align:right;
      white-space:nowrap;
    }

    .auditoria-data-humana strong {
      display:block;
      color:#304c60;
      font-size:10px;
    }

    .auditoria-data-humana small {
      display:block;
      margin-top:2px;
      color:#94a2ac;
      font-size:7px;
    }

    .auditoria-contexto-humano {
      display:flex;
      flex-wrap:wrap;
      gap:7px 14px;
      margin-top:12px;
      padding-top:10px;
      border-top:1px dashed #dfe7eb;
      color:#71828f;
      font-size:9px;
    }

    .auditoria-contexto-humano strong {
      color:#425f71;
    }

    .auditoria-mudancas {
      margin-top:13px;
      overflow:hidden;
      border:1px solid #e1e9ed;
      border-radius:12px;
      background:#fbfcfd;
    }

    .auditoria-mudancas-cabecalho {
      display:flex;
      justify-content:space-between;
      gap:10px;
      padding:9px 11px;
      background:#f1f6f8;
      border-bottom:1px solid #e1e9ed;
      color:#375267;
      font-size:9px;
      font-weight:900;
      text-transform:uppercase;
      letter-spacing:.05em;
    }

    .auditoria-mudanca {
      display:grid;
      grid-template-columns:minmax(120px,.7fr) 1fr auto 1fr;
      gap:9px;
      align-items:center;
      padding:9px 11px;
      border-top:1px solid #edf1f3;
    }

    .auditoria-mudanca:first-of-type {border-top:0}

    .auditoria-mudanca-campo {
      color:#25455a;
      font-size:10px;
      font-weight:900;
    }

    .auditoria-mudanca-valor {
      min-height:32px;
      display:flex;
      align-items:center;
      box-sizing:border-box;
      padding:6px 8px;
      border-radius:8px;
      background:#f1f4f6;
      color:#59707f;
      font-size:10px;
      word-break:break-word;
    }

    .auditoria-mudanca-valor.novo {
      background:#e9f7f1;
      color:#08704f;
      font-weight:850;
    }

    .auditoria-mudanca-seta {
      color:#8ca0ad;
      font-weight:900;
    }

    .auditoria-rodape-tecnico {
      display:flex;
      flex-wrap:wrap;
      gap:7px 14px;
      margin-top:11px;
      color:#8a99a4;
      font-size:8px;
    }

    @media(max-width:800px) {
      .auditoria-leitura-topo {
        grid-template-columns:auto 1fr;
      }
      .auditoria-data-humana {
        grid-column:1/-1;
        padding-left:50px;
        text-align:left;
      }
      .auditoria-mudanca {
        grid-template-columns:1fr;
      }
      .auditoria-mudanca-seta {
        justify-self:center;
        transform:rotate(90deg);
      }
    }

  `;

  document.head.appendChild(
    estilo
  );

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        id="auditoriaCampanhasModal"
        class="auditoria-modal"
        aria-hidden="true"
      >
        <section
          class="auditoria-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auditoriaCampanhasTitulo"
        >
          <header class="auditoria-cabecalho">
            <div>
              <small>RASTREABILIDADE</small>
              <h2 id="auditoriaCampanhasTitulo">
                Auditoria completa
              </h2>
            </div>

            <div class="auditoria-cabecalho-acoes">
              <button
                type="button"
                class="auditoria-exportar excel"
                id="btnAuditoriaExportarExcel"
              >
                Exportar Excel
              </button>

              <button
                type="button"
                class="auditoria-exportar pdf"
                id="btnAuditoriaExportarPdf"
              >
                Exportar PDF
              </button>

              <button
                type="button"
                class="auditoria-fechar"
                data-auditoria-fechar
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
          </header>

          <div class="auditoria-filtros">
            <select id="auditoriaFiltroModulo">
              <option value="">Todos os módulos</option>
              <option value="PRODUTIVOS">Produtivos</option>
              <option value="PIX">Pix do Presidente</option>
            </select>

            <select id="auditoriaFiltroAcao">
              <option value="">Todas as ações</option>
              <option value="CRIAÇÃO">Criação</option>
              <option value="ALTERAÇÃO">Alteração</option>
              <option value="IMPORTAÇÃO">Importação</option>
              <option value="DESLIGAMENTO">Desligamento</option>
              <option value="EXCLUSÃO">Exclusão</option>
              <option value="SESSÃO DE EDIÇÃO">Sessão de edição</option>
            </select>

            <select id="auditoriaFiltroFilial">
              <option value="">Todas as filiais</option>
            </select>

            <input
              id="auditoriaDataInicio"
              type="date"
              title="Data inicial"
            >

            <input
              id="auditoriaDataFim"
              type="date"
              title="Data final"
            >

            <input
              id="auditoriaBusca"
              type="search"
              placeholder="Buscar nome, filial, cargo, competência, autor..."
            >
          </div>

          <div
            id="auditoriaCampanhasLista"
            class="auditoria-lista"
          ></div>
        </section>
      </div>
    `
  );

  document
    .querySelectorAll(
      "[data-auditoria-fechar]"
    )
    .forEach(botao =>
      botao.addEventListener(
        "click",
        fecharAuditoria
      )
    );

  const modal =
    document.querySelector(
      "#auditoriaCampanhasModal"
    );

  modal.addEventListener(
    "click",
    evento => {
      if (evento.target === modal) {
        fecharAuditoria();
      }
    }
  );

  [
    "#auditoriaFiltroModulo",
    "#auditoriaFiltroAcao",
    "#auditoriaFiltroFilial",
    "#auditoriaDataInicio",
    "#auditoriaDataFim",
    "#auditoriaBusca"
  ].forEach(seletor => {
    document
      .querySelector(seletor)
      ?.addEventListener(
        "input",
        renderizarAuditoria
      );

    document
      .querySelector(seletor)
      ?.addEventListener(
        "change",
        renderizarAuditoria
      );
  });

  document
    .querySelector(
      "#btnAuditoriaExportarExcel"
    )
    ?.addEventListener(
      "click",
      exportarAuditoriaExcel
    );

  document
    .querySelector(
      "#btnAuditoriaExportarPdf"
    )
    ?.addEventListener(
      "click",
      exportarAuditoriaPdf
    );

  document.addEventListener(
    "keydown",
    evento => {
      if (
        evento.key === "Escape" &&
        modal.classList.contains(
          "aberto"
        )
      ) {
        fecharAuditoria();
      }
    }
  );
}

function inserirBotoesAuditoria() {
  garantirInterfaceAuditoria();

  const configuracoes = [
    {
      modulo: "PRODUTIVOS",
      id: "btnAuditoriaPRODUTIVOS",
      destino:
        document.querySelector(
          "#produtivosTopbarActions"
        ) ||
        document.querySelector(
          "#dashboard"
        )
    },
    {
      modulo: "PIX",
      id: "btnAuditoriaPIX",
      destino:
        document.querySelector(
          "#pix-dashboard .pix-page-header"
        ) ||
        document.querySelector(
          "#pix-dashboard"
        )
    }
  ];

  configuracoes.forEach(
    ({ modulo, id, destino }) => {
      if (!destino) return;

      if (
        document.querySelector(
          `#${id}`
        )
      ) {
        return;
      }

      const botao =
        document.createElement(
          "button"
        );

      botao.id = id;
      botao.type = "button";
      botao.className =
        "auditoria-atalho";
      botao.innerHTML =
        "◉ Auditoria";
      botao.title =
        `Abrir auditoria — ${rotuloModulo(modulo)}`;

      botao.addEventListener(
        "click",
        () => abrirAuditoria(
          modulo
        )
      );

      destino.appendChild(
        botao
      );
    }
  );
}


function solicitarSenhaAuditoria() {
  if (
    estadoAuditoria
      .acessoLiberado
  ) {
    return Promise.resolve(
      true
    );
  }

  return new Promise(
    resolve => {
      const backdrop =
        document.createElement(
          "div"
        );

      backdrop.className =
        "auditoria-senha-backdrop";

      backdrop.innerHTML = `
        <section
          class="auditoria-senha-card"
          role="dialog"
          aria-modal="true"
        >
          <div
            class="auditoria-senha-icon"
          >
            🔐
          </div>

          <small>
            ACESSO RESTRITO
          </small>

          <h3>
            Auditoria completa
          </h3>

          <p>
            Informe a senha para consultar os registros
            de rastreabilidade do sistema.
          </p>

          <input
            type="password"
            inputmode="numeric"
            autocomplete="new-password"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            name="auditoria_senha_${Date.now()}"
            value=""
            placeholder="Digite a senha"
            data-auditoria-senha
            readonly
          >

          <div
            class="auditoria-senha-erro"
            data-auditoria-senha-erro
            hidden
          >
            Senha incorreta.
          </div>

          <div
            class="auditoria-senha-acoes"
          >
            <button
              type="button"
              class="auditoria-senha-cancelar"
              data-auditoria-senha-cancelar
            >
              Cancelar
            </button>

            <button
              type="button"
              class="auditoria-senha-entrar"
              data-auditoria-senha-entrar
            >
              Acessar
            </button>
          </div>
        </section>
      `;

      document.body.appendChild(
        backdrop
      );

      const input =
        backdrop.querySelector(
          "[data-auditoria-senha]"
        );

      /*
       * Proteção contra preenchimento automático.
       * O campo sempre nasce vazio e readonly.
       * Só é liberado depois de uma interação real do usuário.
       */
      if (input) {
        input.value = "";

        window.setTimeout(
          () => {
            input.value = "";
          },
          30
        );

        const liberarDigitacao =
          () => {
            input.removeAttribute(
              "readonly"
            );

            input.value = "";
          };

        input.addEventListener(
          "pointerdown",
          liberarDigitacao,
          {
            once:true
          }
        );

        input.addEventListener(
          "focus",
          liberarDigitacao,
          {
            once:true
          }
        );
      }

      const erro =
        backdrop.querySelector(
          "[data-auditoria-senha-erro]"
        );

      const finalizar =
        resultado => {
          backdrop.remove();
          resolve(
            resultado
          );
        };

      const validar =
        () => {
          if (
            texto(
              input?.value
            ) !==
            SENHA_AUDITORIA
          ) {
            if (erro) {
              erro.hidden =
                false;
            }

            input?.focus();
            input?.select();
            return;
          }

          estadoAuditoria
            .acessoLiberado =
              true;

          sessionStorage.setItem(
            "auditoria_acesso_liberado_v1",
            "true"
          );

          finalizar(
            true
          );
        };

      backdrop
        .querySelector(
          "[data-auditoria-senha-cancelar]"
        )
        ?.addEventListener(
          "click",
          () =>
            finalizar(
              false
            )
        );

      backdrop
        .querySelector(
          "[data-auditoria-senha-entrar]"
        )
        ?.addEventListener(
          "click",
          validar
        );

      input?.addEventListener(
        "keydown",
        evento => {
          if (
            evento.key ===
            "Enter"
          ) {
            validar();
          }

          if (
            evento.key ===
            "Escape"
          ) {
            finalizar(
              false
            );
          }
        }
      );

      /*
       * Não damos foco automático.
       * Isso evita que o navegador tente restaurar uma senha salva
       * antes de qualquer interação do usuário.
       */
      window.setTimeout(
        () => {
          if (input) {
            input.value = "";
          }
        },
        80
      );
    }
  );
}

function preencherFiltroFiliaisAuditoria() {
  const select =
    document.querySelector(
      "#auditoriaFiltroFilial"
    );

  if (!select) {
    return;
  }

  const atual =
    select.value;

  const filiais =
    [
      ...new Set(
        estadoAuditoria
          .logs
          .map(
            log =>
              texto(
                log.filial
              )
          )
          .filter(
            Boolean
          )
      )
    ].sort(
      (a, b) =>
        a.localeCompare(
          b,
          "pt-BR"
        )
    );

  select.innerHTML =
    `
      <option value="">
        Todas as filiais
      </option>
    ` +
    filiais
      .map(
        filial =>
          `
            <option
              value="${escapar(filial)}"
            >
              ${escapar(filial)}
            </option>
          `
      )
      .join("");

  if (
    filiais.includes(
      atual
    )
  ) {
    select.value =
      atual;
  }
}

async function abrirAuditoria(modulo = "") {
  garantirInterfaceAuditoria();

  const liberado =
    await solicitarSenhaAuditoria();

  if (!liberado) {
    return;
  }

  preencherFiltroFiliaisAuditoria();

  const modal =
    document.querySelector(
      "#auditoriaCampanhasModal"
    );

  const filtroModulo =
    document.querySelector(
      "#auditoriaFiltroModulo"
    );

  if (filtroModulo) {
    filtroModulo.value =
      modulo || "";
  }

  modal.classList.add("aberto");
  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";

  renderizarAuditoria();
}

function fecharAuditoria() {
  const modal =
    document.querySelector(
      "#auditoriaCampanhasModal"
    );

  modal?.classList.remove("aberto");
  modal?.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.style.overflow = "";
}

function logsAuditoriaFiltrados() {
  const modulo =
    document.querySelector(
      "#auditoriaFiltroModulo"
    )?.value || "";

  const acao =
    document.querySelector(
      "#auditoriaFiltroAcao"
    )?.value || "";

  const filial =
    normalizar(
      document.querySelector(
        "#auditoriaFiltroFilial"
      )?.value || ""
    );

  const dataInicio =
    document.querySelector(
      "#auditoriaDataInicio"
    )?.value || "";

  const dataFim =
    document.querySelector(
      "#auditoriaDataFim"
    )?.value || "";

  const inicioMillis =
    dataInicio
      ? new Date(
          `${dataInicio}T00:00:00`
        ).getTime()
      : 0;

  const fimMillis =
    dataFim
      ? new Date(
          `${dataFim}T23:59:59.999`
        ).getTime()
      : 0;

  const busca =
    normalizar(
      document.querySelector(
        "#auditoriaBusca"
      )?.value || ""
    );

  return estadoAuditoria.logs.filter(log => {
    if (
      modulo &&
      log.modulo !== modulo
    ) {
      return false;
    }

    if (
      acao &&
      log.acao !== acao
    ) {
      return false;
    }

    if (
      filial &&
      normalizar(
        log.filial
      ) !== filial
    ) {
      return false;
    }

    const momento =
      millisDoLog(
        log
      );

    if (
      inicioMillis &&
      momento &&
      momento <
        inicioMillis
    ) {
      return false;
    }

    if (
      fimMillis &&
      momento &&
      momento >
        fimMillis
    ) {
      return false;
    }

    if (busca) {
      const baseBusca =
        normalizar([
          log.nomeRegistro,
          log.filial,
          log.dn,
          log.cargo,
          log.competencia,
          log.resumo,
          log.autorNome,
          log.autorIp,
          log.sessaoEdicaoId,
          log.documentoId,
          log.auditoriaId
        ].join(" "));

      if (
        !baseBusca.includes(busca)
      ) {
        return false;
      }
    }

    return true;
  })
  .sort(
    (a, b) =>
      millisDoLog(b) -
      millisDoLog(a)
  );
}

function renderizarAuditoria() {
  const lista =
    document.querySelector(
      "#auditoriaCampanhasLista"
    );

  if (!lista) {
    return;
  }

  const logs =
    logsAuditoriaFiltrados();

  if (!logs.length) {
    lista.innerHTML = `
      <div class="auditoria-vazio">
        Nenhum registro de auditoria encontrado para os filtros selecionados.
      </div>
    `;
    return;
  }

  lista.innerHTML =
    logs
      .map(
        log => {
          const leitura =
            descreverAcaoAuditoria(
              log
            );

          const alteracoes =
            resumoAlteracoesAuditoria(
              log
            );

          const dataRegistro =
            formatarData(
              log.registradoEm ||
              log.registradoEmEpoch ||
              log.registradoEmCliente
            );

          return `
            <article
              class="auditoria-item"
              data-tipo="${escapar(leitura.classe)}"
            >
              <div
                class="auditoria-leitura-topo"
              >
                <div
                  class="auditoria-leitura-icone"
                  aria-hidden="true"
                >
                  ${leitura.icone}
                </div>

                <div>
                  <h3
                    class="auditoria-leitura-titulo"
                  >
                    ${escapar(leitura.titulo)}:
                    <span>
                      ${escapar(leitura.destaque)}
                    </span>
                  </h3>

                  <p
                    class="auditoria-leitura-descricao"
                  >
                    ${escapar(leitura.descricao)}
                  </p>

                  <div
                    class="auditoria-chips"
                  >
                    <span
                      class="auditoria-chip"
                    >
                      Ação
                      <strong>
                        ${escapar(log.acao || "—")}
                      </strong>
                    </span>

                    <span
                      class="auditoria-chip"
                    >
                      Autor
                      <strong>
                        ${escapar(log.autorNome || "Usuário do sistema")}
                      </strong>
                    </span>

                    ${
                      log.colecaoOrigem
                        ? `
                          <span
                            class="auditoria-chip"
                          >
                            Origem
                            <strong>
                              ${escapar(log.colecaoOrigem)}
                            </strong>
                          </span>
                        `
                        : ""
                    }
                  </div>
                </div>

                <div
                  class="auditoria-data-humana"
                >
                  <strong>
                    ${escapar(dataRegistro)}
                  </strong>

                  <small>
                    Firebase / servidor
                  </small>
                </div>
              </div>

              <div
                class="auditoria-contexto-humano"
              >
                ${
                  log.modulo
                    ? `
                      <span>
                        <strong>Módulo:</strong>
                        ${escapar(log.modulo)}
                      </span>
                    `
                    : ""
                }

                ${
                  log.competencia
                    ? `
                      <span>
                        <strong>Competência:</strong>
                        ${escapar(log.competencia)}
                      </span>
                    `
                    : ""
                }

                ${
                  log.semana
                    ? `
                      <span>
                        <strong>Semana:</strong>
                        S${escapar(log.semana)}
                      </span>
                    `
                    : ""
                }

                ${
                  log.filial
                    ? `
                      <span>
                        <strong>Filial:</strong>
                        ${escapar(log.filial)}
                      </span>
                    `
                    : ""
                }

                ${
                  log.dn
                    ? `
                      <span>
                        <strong>DN:</strong>
                        ${escapar(log.dn)}
                      </span>
                    `
                    : ""
                }

                ${
                  log.cargo
                    ? `
                      <span>
                        <strong>Cargo:</strong>
                        ${escapar(log.cargo)}
                      </span>
                    `
                    : ""
                }
              </div>

              ${
                alteracoes.length
                  ? `
                    <div
                      class="auditoria-mudancas"
                    >
                      <div
                        class="auditoria-mudancas-cabecalho"
                      >
                        <span>
                          O que mudou
                        </span>

                        <span>
                          ${alteracoes.length}
                          ${
                            alteracoes.length === 1
                              ? "campo"
                              : "campos"
                          }
                        </span>
                      </div>

                      ${alteracoes
                        .map(
                          item => `
                            <div
                              class="auditoria-mudanca"
                            >
                              <div
                                class="auditoria-mudanca-campo"
                              >
                                ${escapar(item.rotulo)}
                              </div>

                              <div
                                class="auditoria-mudanca-valor"
                              >
                                ${escapar(item.antes)}
                              </div>

                              <div
                                class="auditoria-mudanca-seta"
                                aria-hidden="true"
                              >
                                →
                              </div>

                              <div
                                class="auditoria-mudanca-valor novo"
                              >
                                ${escapar(item.depois)}
                              </div>
                            </div>
                          `
                        )
                        .join("")}
                    </div>
                  `
                  : `
                    <div
                      class="auditoria-mudancas"
                    >
                      <div
                        class="auditoria-mudancas-cabecalho"
                      >
                        <span>
                          Resumo do evento
                        </span>
                      </div>

                      <div
                        style="
                          padding:11px;
                          color:#71828f;
                          font-size:10px;
                          line-height:1.5;
                        "
                      >
                        ${escapar(
                          log.resumo ||
                          "Evento registrado sem campos detalhados."
                        )}
                      </div>
                    </div>
                  `
              }

              <div
                class="auditoria-rodape-tecnico"
              >
                <span>
                  Dispositivo:
                  <strong>
                    ${escapar(log.autorDispositivo || "—")}
                  </strong>
                </span>

                ${
                  log.autorIp
                    ? `
                      <span>
                        IP:
                        <strong>
                          ${escapar(log.autorIp)}
                        </strong>
                      </span>
                    `
                    : ""
                }

                ${
                  log.sessaoEdicaoId
                    ? `
                      <span>
                        Sessão:
                        <strong>
                          ${escapar(log.sessaoEdicaoId)}
                        </strong>
                      </span>
                    `
                    : ""
                }

                <span>
                  Documento:
                  <strong>
                    ${escapar(log.documentoId || "—")}
                  </strong>
                </span>

                <span>
                  Log:
                  <strong>
                    ${escapar(log.auditoriaId || log.id || "—")}
                  </strong>
                </span>

                ${
                  log.dataEventoOrigem
                    ? `
                      <span>
                        Horário original:
                        <strong>
                          ${escapar(formatarData(log.dataEventoOrigem))}
                        </strong>
                      </span>
                    `
                    : ""
                }
              </div>
            </article>
          `;
        }
      )
      .join("");
}

function nomeArquivoAuditoria(
  extensao
) {
  const modulo =
    document.querySelector(
      "#auditoriaFiltroModulo"
    )?.value || "TODOS";

  const acao =
    document.querySelector(
      "#auditoriaFiltroAcao"
    )?.value || "TODAS-AS-ACOES";

  const data =
    new Date()
      .toISOString()
      .slice(0, 10);

  return `auditoria-${modulo.toLowerCase()}-${normalizar(acao)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${data}.${extensao}`;
}

function linhasAuditoriaExportacao() {
  const linhas = [];

  logsAuditoriaFiltrados()
    .forEach(log => {
      const alteracoes =
        Array.isArray(log.alteracoes) &&
        log.alteracoes.length
          ? log.alteracoes
          : [
              {
                campo: "—",
                antes: "—",
                depois: "—"
              }
            ];

      alteracoes.forEach(item => {
        linhas.push({
          data:
            formatarData(
              log.registradoEm ||
              log.registradoEmCliente
            ),
          modulo:
            rotuloModulo(log.modulo),
          acao:
            log.acao || "",
          competencia:
            log.competencia || "",
          semana:
            log.semana || "",
          dn:
            log.dn || "",
          filial:
            log.filial || "",
          colaborador:
            log.nomeRegistro || "",
          cargo:
            log.cargo || "",
          campo:
            item.campo || "",
          antes:
            valorBonito(item.antes),
          depois:
            valorBonito(item.depois),
          autor:
            log.autorNome ||
            "Usuário do sistema",
          dispositivo:
            log.autorDispositivo || "",
          resumo:
            log.resumo || ""
        });
      });
    });

  return linhas;
}

async function exportarAuditoriaExcel() {
  const linhas =
    linhasAuditoriaExportacao();

  if (!linhas.length) {
    alert(
      "Não há registros de auditoria para exportar com os filtros atuais."
    );
    return;
  }

  if (!window.ExcelJS) {
    alert(
      "A biblioteca de Excel não foi carregada. Atualize a página e tente novamente."
    );
    return;
  }

  const workbook =
    new window.ExcelJS.Workbook();

  workbook.creator =
    "Sistema de Campanhas Pós-Vendas";
  workbook.created =
    new Date();

  const sheet =
    workbook.addWorksheet(
      "Auditoria"
    );

  sheet.columns = [
    { header: "Data/Hora", key: "data", width: 18 },
    { header: "Módulo", key: "modulo", width: 22 },
    { header: "Ação", key: "acao", width: 16 },
    { header: "Competência", key: "competencia", width: 13 },
    { header: "Semana", key: "semana", width: 10 },
    { header: "DN", key: "dn", width: 10 },
    { header: "Filial", key: "filial", width: 18 },
    { header: "Colaborador/Registro", key: "colaborador", width: 34 },
    { header: "Cargo", key: "cargo", width: 30 },
    { header: "Campo alterado", key: "campo", width: 23 },
    { header: "Antes", key: "antes", width: 30 },
    { header: "Depois", key: "depois", width: 30 },
    { header: "Autor", key: "autor", width: 22 },
    { header: "Dispositivo", key: "dispositivo", width: 24 },
    { header: "Resumo", key: "resumo", width: 46 }
  ];

  linhas.forEach(
    linha => sheet.addRow(linha)
  );

  const header = sheet.getRow(1);
  header.height = 28;
  header.font = {
    bold: true,
    color: { argb: "FFFFFFFF" }
  };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0B3658" }
  };
  header.alignment = {
    vertical: "middle",
    horizontal: "center"
  };

  sheet.views = [
    {
      state: "frozen",
      ySplit: 1
    }
  ];

  sheet.autoFilter = {
    from: "A1",
    to: "O1"
  };

  sheet.eachRow(
    (row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = {
          vertical: "top",
          wrapText: true
        };
      }
    }
  );

  const buffer =
    await workbook.xlsx.writeBuffer();

  const blob =
    new Blob(
      [buffer],
      {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }
    );

  const url =
    URL.createObjectURL(blob);
  const link =
    document.createElement("a");

  link.href = url;
  link.download =
    nomeArquivoAuditoria("xlsx");
  link.click();

  URL.revokeObjectURL(url);
}

function exportarAuditoriaPdf() {
  const linhas =
    linhasAuditoriaExportacao();

  if (!linhas.length) {
    alert(
      "Não há registros de auditoria para exportar com os filtros atuais."
    );
    return;
  }

  const jsPDF =
    window.jspdf?.jsPDF;

  if (!jsPDF) {
    alert(
      "A biblioteca de PDF não foi carregada. Atualize a página e tente novamente."
    );
    return;
  }

  const documento =
    new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

  documento.setFillColor(
    11,
    54,
    88
  );
  documento.rect(
    0,
    0,
    297,
    26,
    "F"
  );

  documento.setTextColor(
    255,
    255,
    255
  );
  documento.setFontSize(18);
  documento.setFont(
    "helvetica",
    "bold"
  );
  documento.text(
    "AUDITORIA COMPLETA — CAMPANHAS PÓS-VENDAS",
    12,
    11
  );

  documento.setFontSize(9);
  documento.setFont(
    "helvetica",
    "normal"
  );
  documento.text(
    `Gerado em ${new Date().toLocaleString("pt-BR")} · ${linhas.length} linha(s)`,
    12,
    18
  );

  documento.setTextColor(
    20,
    44,
    62
  );

  const body =
    linhas.map(item => [
      item.data,
      item.modulo,
      item.acao,
      item.competencia +
        (item.semana ? ` / S${item.semana}` : ""),
      item.filial,
      item.colaborador,
      item.campo,
      item.antes,
      item.depois,
      item.autor
    ]);

  documento.autoTable({
    startY: 31,
    head: [[
      "Data/Hora",
      "Módulo",
      "Ação",
      "Competência",
      "Filial",
      "Colaborador/Registro",
      "Campo",
      "Antes",
      "Depois",
      "Autor"
    ]],
    body,
    theme: "grid",
    styles: {
      fontSize: 6.5,
      cellPadding: 1.6,
      overflow: "linebreak",
      valign: "top"
    },
    headStyles: {
      fillColor: [8, 128, 91],
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: [247, 250, 251]
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 23 },
      2: { cellWidth: 18 },
      3: { cellWidth: 18 },
      4: { cellWidth: 20 },
      5: { cellWidth: 36 },
      6: { cellWidth: 24 },
      7: { cellWidth: 34 },
      8: { cellWidth: 34 },
      9: { cellWidth: 25 }
    },
    didDrawPage: data => {
      const totalPaginas =
        documento.internal.getNumberOfPages();
      documento.setFontSize(7);
      documento.setTextColor(90, 105, 115);
      documento.text(
        `Página ${data.pageNumber} de ${totalPaginas}`,
        285,
        203,
        { align: "right" }
      );
    }
  });

  documento.save(
    nomeArquivoAuditoria("pdf")
  );
}

function observarLogsAuditoria() {
  try {
    /*
     * Carrega TODOS os logs existentes na coleção.
     * A versão anterior limitava a tela a 250 registros,
     * o que escondia parte do histórico.
     *
     * A ordenação agora é feita no cliente usando,
     * prioritariamente, o serverTimestamp do Firebase.
     */
    const consulta =
      collection(
        firestore,
        COLECAO_AUDITORIA
      );

    onSnapshot(
      consulta,
      snapshot => {
        estadoAuditoria.logs =
          snapshot.docs
            .map(
              documento => ({
                id:
                  documento.id,
                ...documento.data()
              })
            )
            .sort(
              (a, b) =>
                millisDoLog(b) -
                millisDoLog(a)
            );

        preencherFiltroFiliaisAuditoria();
        renderizarAuditoria();
      },
      erro => {
        console.error(
          "[AUDITORIA] Erro ao carregar histórico:",
          erro
        );
      }
    );
  } catch (erro) {
    console.error(
      "[AUDITORIA] Falha ao iniciar consulta:",
      erro
    );
  }
}


async function registrarEstadoHistoricoAtual() {
  /*
   * IMPORTANTE:
   * Isto NÃO recria alterações antigas que nunca foram registradas.
   * Apenas cria um retrato auditável dos documentos que existem hoje,
   * preservando eventual timestamp nativo existente no documento.
   */
  const autor =
    resolverAutor();

  let total =
    0;

  for (
    const fonte of
    FONTES_AUDITORIA
  ) {
    const mapa =
      estadoAuditoria
        .bases
        .get(
          fonte.colecao
        );

    if (!mapa) {
      continue;
    }

    for (
      const [
        idDocumento,
        registro
      ] of mapa.entries()
    ) {
      const assinatura =
        [
          "BACKFILL",
          fonte.colecao,
          idDocumento,
          jsonEstavel(
            registro
          )
        ].join("|");

      const id =
        `backfill-${fonte.modulo.toLowerCase()}-${idDocumento}-${hashTexto(assinatura)}`;

      const payload = {
        versao:
          AUDITORIA_VERSAO,

        modulo:
          fonte.modulo,

        colecaoOrigem:
          fonte.colecao,

        entidade:
          fonte.entidade,

        acao:
          "ESTADO HISTÓRICO",

        documentoId:
          idDocumento,

        nomeRegistro:
          nomeRegistro(
            registro,
            idDocumento
          ),

        competencia:
          texto(
            registro?.competencia
          ),

        semana:
          Number(
            registro?.semana ||
            0
          ) || null,

        filial:
          texto(
            registro?.filial
          ),

        dn:
          texto(
            registro?.dn
          ),

        cargo:
          texto(
            registro?.cargo
          ),

        resumo:
          "Retrato histórico do registro existente na implantação da auditoria avançada.",

        alteracoes:
          [],

        antes:
          null,

        depois:
          objetoSeguro(
            registro
          ),

        autorNome:
          autor.nome,

        autorDispositivo:
          autor.dispositivo,

        autorIp:
          autor.ip || "",

        sessaoEdicaoId:
          autor.sessaoId || "",

        registradoEm:
          serverTimestamp(),

        registradoEmEpoch:
          Date.now(),

        registradoEmCliente:
          dataLocalIsoComOffset(),

        timezoneCliente:
          Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone || "",

        dataEventoOrigem:
          extrairDataEventoOrigem(
            registro
          ),

        auditoriaId:
          id,

        retroativo:
          true
      };

      await setDoc(
        doc(
          firestore,
          COLECAO_AUDITORIA,
          id
        ),
        payload,
        {
          merge:false
        }
      );

      total += 1;
    }
  }

  return total;
}

function iniciarAuditoria() {
  if (estadoAuditoria.pronto) {
    return;
  }

  estadoAuditoria.pronto = true;

  garantirInterfaceAuditoria();
  inserirBotoesAuditoria();
  observarLogsAuditoria();

  FONTES_AUDITORIA.forEach(
    observarFonte
  );

  let timerObserverAuditoria =
    null;

  const observer =
    new MutationObserver(() => {
      if (
        timerObserverAuditoria
      ) {
        clearTimeout(
          timerObserverAuditoria
        );
      }

      timerObserverAuditoria =
        window.setTimeout(
          () => {
            const faltaProdutivos =
              Boolean(
                document.querySelector(
                  "#dashboard"
                ) &&
                !document.querySelector(
                  "#btnAuditoriaPRODUTIVOS"
                )
              );

            const faltaPix =
              Boolean(
                document.querySelector(
                  "#pix-dashboard"
                ) &&
                !document.querySelector(
                  "#btnAuditoriaPIX"
                )
              );

            if (
              faltaProdutivos ||
              faltaPix
            ) {
              inserirBotoesAuditoria();
            }
          },
          150
        );
    });

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  console.info(
    `[AUDITORIA] ${AUDITORIA_VERSAO} carregada`
  );
}

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    iniciarAuditoria,
    {
      once: true
    }
  );
} else {
  iniciarAuditoria();
}

window.auditoriaCampanhas = {
  abrir: abrirAuditoria,
  registrarEstadoHistoricoAtual,
  fechar: fecharAuditoria,
  versao: AUDITORIA_VERSAO
};