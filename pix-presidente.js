import { escaparHtml as protegerHtml } from "./security/seguranca.js";
/*
 * AUDITORIA ESTRUTURAL — 2026.08.26 — ETAPA 04 SUPABASE
 *
 * Arquivo reconstruído e comparado integralmente com a versão
 * atual de 4.501 linhas enviada por Pabricio.
 *
 * Resultado da conferência:
 * - 65 funções originais preservadas;
 * - 1 nova função adicionada: idPixSupabase;
 * - 32 registros de eventos preservados;
 * - todos os seletores e IDs de interface preservados;
 * - cargos, políticas, cálculos, filtros e regras preservados;
 * - leitura e CRUD do Pix direcionados ao Supabase;
 * - listeners Firebase substituídos por Supabase Realtime;
 * - recópia automática do Firebase desativada após migração.
 *
 * A diferença na quantidade de linhas decorre exclusivamente da
 * substituição de blocos Firebase extensos por operações Supabase
 * equivalentes e mais compactas. Nenhuma funcionalidade foi removida.
 */

/*
 * PATCH 2026.08.19 — COERÊNCIA DE CAMPOS + TRAVA DE BONIFICAÇÃO
 * Mantém todas as funções anteriores.
 *
 * - Todos os cargos válidos informam O.S. em aberto na Semana 4.
 * - O campo é obrigatório na S4 e participa da penalidade quando superar 28%.
 * - Ticket/Margem obrigatórios vazios impedem qualquer bonificação.
 * - O.S. obrigatória vazia impede qualquer bonificação até ser informada.
 * - NPS continua exclusivo da S4 e apenas para cargos com bônus de NPS.
 * - "0" informado é aceito; campo vazio é diferente de zero.
 * - Lançamentos antigos manuais continuam compatíveis.
 * - Importações passam a registrar flags de presença dos campos.
 */
/*
 * VERSÃO: 2026.08.08-PIX-DESLIGAMENTO-SEGURO-v12
 * Exclusão de participante vira desligamento lógico com senha.
 * Histórico de lançamentos é preservado integralmente.
 */
/*
 * VERSÃO: 2026.08.06-PIX-MOTIVO-NAO-HABILITADO-v11
 * Exibe o motivo abaixo do status somente para não habilitados,
 * tanto em Lançamentos quanto em Apuração.
 */
import { firestore } from "./firebase-config.js";

import { supabase } from "./supabase-config.js";
import { criarNpsUnidadePix } from "./pix-nps-unidade.js?v=20261022-vigencia-novembro";
import { mensagemNpsUnidade } from "./pix-nps-unidade-core.js?v=20261022-vigencia-novembro";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

console.info(
  "[PIX] Versão 2026.07.24-06 carregada"
);

const SENHA_EXCLUSAO_PARTICIPANTE_PIX =
  "123321";



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

/*
===============================================================================
ATUALIZAÇÃO DA IMPORTAÇÃO SEMANAL — 2026.07.23-02

- O relatório semanal localiza o vendedor na base do Pix.
- Filial, DN, cargo e nome oficial são recuperados da base.
- Vlr. Acumulado é a meta individual.
- Vlr. Total é o realizado individual.
- Ticket Médio é o indicador de ticket.
- Meta zerada resulta obrigatoriamente em NÃO HABILITADO.
- A mesma competência + semana + funcionário é atualizada pela nova importação.
- Outras semanas e competências continuam preservadas.
===============================================================================
*/

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
  { dn: "4774", unidade: "AGUA BOA" },
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

const npsUnidadePix = criarNpsUnidadePix({
  supabase,
  filiais: () => [...new Set(FILIAIS_PIX.map(f => f.unidade))],
  competencia: () => $("#competenciaGlobal")?.value || $("#pixDashboardCompetencia")?.value || pixMesAtual(),
  filialAtual: () => $(document.querySelector("#pix-apuracao.active") ? "#pixFiltroFilialApuracao" : "#pixFiltroFilialLancamento")?.value || "",
  bloqueado: () => !!window.bloqueioLancamentos?.bloqueado || document.body.classList.contains("lancamentos-bloqueados"),
  alertar: pixAlert,
  aoAtualizar: () => {
    renderTudoPix();
    if (document.querySelector("#modalPixPresidente[open]")) atualizarPreviewPix();
  }
});
window.recarregarNpsFilialPix = () => npsUnidadePix.carregar();

const funcionariosPixRef = collection(
  firestore,
  "pix_presidente_funcionarios"
);
const lancamentosPixRef = collection(
  firestore,
  "pix_presidente_lancamentos"
);

/* =========================================================
   ETAPA 02 — PIX FIREBASE → SUPABASE

   O Firebase continua como fonte oficial nesta etapa.
   A rotina copia os participantes e lançamentos do Pix,
   preserva os IDs e corrige no Supabase a mistura histórica
   de participantes do Pix na tabela dos Produtivos.

   Nenhuma exclusão ou alteração é feita no Firebase.
========================================================= */

const MIGRACAO_PIX_SUPABASE_KEY =
  "pix_supabase_etapa_02_v1";

function serializarValorFirestorePix(
  valor
) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return valor;
  }

  if (
    typeof valor?.toDate ===
    "function"
  ) {
    return valor
      .toDate()
      .toISOString();
  }

  if (Array.isArray(valor)) {
    return valor.map(
      serializarValorFirestorePix
    );
  }

  if (
    typeof valor === "object"
  ) {
    return Object.fromEntries(
      Object.entries(valor).map(
        ([chave, item]) => [
          chave,
          serializarValorFirestorePix(
            item
          )
        ]
      )
    );
  }

  return valor;
}

function textoMigracaoPix(
  ...valores
) {
  const encontrado =
    valores.find(
      valor =>
        valor !== null &&
        valor !== undefined &&
        String(valor).trim() !== ""
    );

  return encontrado === undefined
    ? ""
    : String(encontrado);
}

function normalizarCampanhaMigracaoPix(
  valor
) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");
}

function pertenceAoPixMigracao(
  dados
) {
  const campanha =
    normalizarCampanhaMigracaoPix(
      dados?.campanha ||
      dados?.modulo ||
      dados?.origemCampanha
    );

  return (
    campanha === "PIX" ||
    campanha === "PIX_DO_PRESIDENTE" ||
    campanha.includes("PIX_PRESIDENTE")
  );
}

async function upsertLotesPixSupabase(
  tabela,
  linhas
) {
  const TAMANHO_LOTE = 200;

  for (
    let inicio = 0;
    inicio < linhas.length;
    inicio += TAMANHO_LOTE
  ) {
    const lote = linhas.slice(
      inicio,
      inicio + TAMANHO_LOTE
    );

    if (!lote.length) {
      continue;
    }

    const {
      error
    } = await supabase
      .from(tabela)
      .upsert(
        lote,
        {
          onConflict: "id"
        }
      );

    if (error) {
      throw new Error(
        `${tabela}: ${error.message}`
      );
    }
  }
}

async function contarTabelaPixSupabase(
  tabela
) {
  const {
    count,
    error
  } = await supabase
    .from(tabela)
    .select(
      "id",
      {
        count: "exact",
        head: true
      }
    );

  if (error) {
    throw new Error(
      `${tabela}: ${error.message}`
    );
  }

  return Number(count || 0);
}

async function removerPixMisturadoDosProdutivosSupabase() {
  const {
    data,
    error
  } = await supabase
    .from("produtivos_funcionarios")
    .select("id,dados");

  if (error) {
    throw new Error(
      `produtivos_funcionarios: ${error.message}`
    );
  }

  const idsMisturados =
    (data || [])
      .filter(
        linha =>
          pertenceAoPixMigracao(
            linha.dados
          )
      )
      .map(
        linha => linha.id
      );

  const TAMANHO_LOTE = 100;

  for (
    let inicio = 0;
    inicio < idsMisturados.length;
    inicio += TAMANHO_LOTE
  ) {
    const lote = idsMisturados.slice(
      inicio,
      inicio + TAMANHO_LOTE
    );

    const {
      error: erroExclusao
    } = await supabase
      .from("produtivos_funcionarios")
      .delete()
      .in("id", lote);

    if (erroExclusao) {
      throw new Error(
        `Separação Pix/Produtivos: ${erroExclusao.message}`
      );
    }
  }

  return idsMisturados.length;
}

async function migrarPixFirebaseParaSupabase() {
  if (
    window.__MIGRACAO_PIX_SUPABASE_EM_ANDAMENTO__
  ) {
    return null;
  }

  window.__MIGRACAO_PIX_SUPABASE_EM_ANDAMENTO__ =
    true;

  try {
    console.info(
      "[PIX/SUPABASE] Iniciando cópia segura dos dados."
    );

    const [
      snapshotFuncionarios,
      snapshotLancamentos
    ] = await Promise.all([
      getDocs(funcionariosPixRef),
      getDocs(lancamentosPixRef)
    ]);

    const funcionarios =
      snapshotFuncionarios.docs.map(
        documento => {
          const dados =
            serializarValorFirestorePix(
              documento.data()
            );

          return {
            id: documento.id,
            dados,
            ativo:
              dados.ativo !== false,
            updated_at:
              new Date().toISOString()
          };
        }
      );

    const lancamentos =
      snapshotLancamentos.docs.map(
        documento => {
          const dados =
            serializarValorFirestorePix(
              documento.data()
            );

          return {
            id: documento.id,
            competencia:
              textoMigracaoPix(
                dados.competencia,
                dados.mes,
                dados.periodo
              ),
            semana:
              textoMigracaoPix(
                dados.semana,
                dados.numeroSemana
              ),
            filial:
              textoMigracaoPix(
                dados.filial,
                dados.unidade
              ),
            colaborador:
              textoMigracaoPix(
                dados.colaborador,
                dados.nome,
                dados.funcionarioNome,
                dados.funcionarioId
              ),
            dados,
            updated_at:
              new Date().toISOString()
          };
        }
      );

    await upsertLotesPixSupabase(
      "pix_funcionarios",
      funcionarios
    );

    await upsertLotesPixSupabase(
      "pix_lancamentos",
      lancamentos
    );

    const removidosDosProdutivos =
      await removerPixMisturadoDosProdutivosSupabase();

    const [
      totalFuncionariosSupabase,
      totalLancamentosSupabase
    ] = await Promise.all([
      contarTabelaPixSupabase(
        "pix_funcionarios"
      ),
      contarTabelaPixSupabase(
        "pix_lancamentos"
      )
    ]);

    const resultado = {
      firebase: {
        participantes:
          funcionarios.length,
        lancamentos:
          lancamentos.length
      },
      supabase: {
        participantes:
          totalFuncionariosSupabase,
        lancamentos:
          totalLancamentosSupabase
      },
      removidosDosProdutivos,
      concluida:
        totalFuncionariosSupabase >=
          funcionarios.length &&
        totalLancamentosSupabase >=
          lancamentos.length,
      executadaEm:
        new Date().toISOString()
    };

    window.__MIGRACAO_PIX_SUPABASE_RESULTADO__ =
      resultado;

    if (!resultado.concluida) {
      throw new Error(
        "A conferência final do Pix encontrou menos registros no Supabase que no Firebase. O Firebase permanece intacto."
      );
    }

    localStorage.setItem(
      MIGRACAO_PIX_SUPABASE_KEY,
      JSON.stringify(resultado)
    );

    console.info(
      "[PIX/SUPABASE] Cópia, separação e conferência concluídas:",
      resultado
    );

    window.dispatchEvent(
      new CustomEvent(
        "pix:supabase-migracao-concluida",
        {
          detail: resultado
        }
      )
    );

    return resultado;
  } catch (erro) {
    console.error(
      "[PIX/SUPABASE] A cópia foi interrompida com segurança:",
      erro
    );

    window.__MIGRACAO_PIX_SUPABASE_ERRO__ =
      erro;

    return null;
  } finally {
    window.__MIGRACAO_PIX_SUPABASE_EM_ANDAMENTO__ =
      false;
  }
}

window.migrarPixFirebaseParaSupabase =
  migrarPixFirebaseParaSupabase;

function idPixSupabase() {
  return globalThis.crypto?.randomUUID?.() ||
    `pix_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}


function solicitarSenhaExclusaoParticipantePix() {
  return new Promise(
    resolve => {
      const existente =
        document.querySelector(
          "#modalSenhaExclusaoParticipantePix"
        );

      if (existente) {
        existente.remove();
      }

      const modal =
        document.createElement(
          "div"
        );

      modal.id =
        "modalSenhaExclusaoParticipantePix";

      modal.innerHTML = `
        <div
          class="pix-senha-participante-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pixSenhaParticipanteTitulo"
        >
          <div
            class="pix-senha-participante-card"
          >
            <button
              type="button"
              class="pix-senha-participante-fechar"
              aria-label="Fechar"
            >
              ×
            </button>

            <div
              class="pix-senha-participante-icone"
            >
              🔐
            </div>

            <small>
              SEGURANÇA
            </small>

            <h2
              id="pixSenhaParticipanteTitulo"
            >
              Confirmar desligamento
            </h2>

            <p>
              Informe a senha administrativa para remover
              o participante da base ativa sem apagar o histórico.
            </p>

            <label>
              Senha
              <input
                type="password"
                autocomplete="off"
                inputmode="numeric"
                placeholder="Digite a senha"
                class="pix-senha-participante-input"
              />
            </label>

            <div
              class="pix-senha-participante-erro"
              hidden
            >
              Senha incorreta.
            </div>

            <div
              class="pix-senha-participante-acoes"
            >
              <button
                type="button"
                class="pix-senha-participante-cancelar"
              >
                Cancelar
              </button>

              <button
                type="button"
                class="pix-senha-participante-confirmar"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      `;

      const estilo =
        document.createElement(
          "style"
        );

      estilo.textContent = `
        #modalSenhaExclusaoParticipantePix {
          position: fixed;
          inset: 0;
          z-index: 999999;
        }

        .pix-senha-participante-backdrop {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(5, 22, 38, .70);
          backdrop-filter: blur(7px);
        }

        .pix-senha-participante-card {
          position: relative;
          width: min(430px, 100%);
          padding: 30px;
          border-radius: 24px;
          background: #ffffff;
          box-shadow: 0 28px 80px rgba(0, 0, 0, .28);
          color: #102236;
        }

        .pix-senha-participante-card small {
          display: block;
          margin-top: 14px;
          color: #07835d;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .16em;
        }

        .pix-senha-participante-card h2 {
          margin: 7px 0 8px;
          font-size: 24px;
          line-height: 1.15;
        }

        .pix-senha-participante-card p {
          margin: 0 0 20px;
          color: #5e7183;
          font-size: 13px;
          line-height: 1.6;
        }

        .pix-senha-participante-card label {
          display: grid;
          gap: 7px;
          color: #42576a;
          font-size: 12px;
          font-weight: 800;
        }

        .pix-senha-participante-input {
          width: 100%;
          min-height: 46px;
          box-sizing: border-box;
          padding: 0 13px;
          border: 1px solid #cfdae3;
          border-radius: 11px;
          outline: none;
          font: inherit;
        }

        .pix-senha-participante-input:focus {
          border-color: #0a9468;
          box-shadow: 0 0 0 3px rgba(10, 148, 104, .12);
        }

        .pix-senha-participante-icone {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          background: #e3f7ef;
          font-size: 25px;
        }

        .pix-senha-participante-fechar {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 35px;
          height: 35px;
          border: 0;
          border-radius: 50%;
          background: #eff4f7;
          color: #627586;
          font-size: 22px;
          cursor: pointer;
        }

        .pix-senha-participante-erro {
          margin-top: 10px;
          color: #c92e2e;
          font-size: 12px;
          font-weight: 800;
        }

        .pix-senha-participante-acoes {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 22px;
        }

        .pix-senha-participante-acoes button {
          min-height: 42px;
          padding: 0 18px;
          border-radius: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .pix-senha-participante-cancelar {
          border: 1px solid #d5dfe6;
          background: #ffffff;
          color: #263d50;
        }

        .pix-senha-participante-confirmar {
          border: 0;
          background: #078d63;
          color: #ffffff;
          box-shadow: 0 10px 24px rgba(7, 141, 99, .22);
        }
      `;

      modal.appendChild(
        estilo
      );

      document.body.appendChild(
        modal
      );

      const input =
        modal.querySelector(
          ".pix-senha-participante-input"
        );

      const erro =
        modal.querySelector(
          ".pix-senha-participante-erro"
        );

      const finalizar =
        resultado => {
          modal.remove();
          resolve(
            resultado
          );
        };

      const validar =
        () => {
          const senha =
            String(
              input?.value || ""
            );

          if (
            senha !==
            SENHA_EXCLUSAO_PARTICIPANTE_PIX
          ) {
            if (erro) {
              erro.hidden = false;
            }

            input?.focus();
            input?.select();
            return;
          }

          finalizar(
            true
          );
        };

      modal
        .querySelector(
          ".pix-senha-participante-confirmar"
        )
        ?.addEventListener(
          "click",
          validar
        );

      modal
        .querySelector(
          ".pix-senha-participante-cancelar"
        )
        ?.addEventListener(
          "click",
          () =>
            finalizar(
              false
            )
        );

      modal
        .querySelector(
          ".pix-senha-participante-fechar"
        )
        ?.addEventListener(
          "click",
          () =>
            finalizar(
              false
            )
        );

      input?.addEventListener(
        "keydown",
        evento => {
          if (
            evento.key ===
            "Enter"
          ) {
            evento.preventDefault();
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

      window.setTimeout(
        () =>
          input?.focus(),
        30
      );
    }
  );
}


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
  const agora = new Date();

  return [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, "0")
  ].join("-");
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

const PIX_NOVA_VIGENCIA = "2026-11";
const PIX_DIAS_SEMANA = [
  { chave: "seg", rotulo: "Segunda" },
  { chave: "ter", rotulo: "Terça" },
  { chave: "qua", rotulo: "Quarta" },
  { chave: "qui", rotulo: "Quinta" },
  { chave: "sex", rotulo: "Sexta" },
  { chave: "sab", rotulo: "Sábado", opcional: true }
];

function usaRegraPixDiaria(competencia) {
  return String(competencia || "").slice(0, 7) >= PIX_NOVA_VIGENCIA;
}

function pixPoliticaVigente(cargo, competencia) {
  const base = pixPolitica(cargo);
  if (!base || !usaRegraPixDiaria(competencia)) return base;

  const bonusBaseNovo = {
    "Gerente": 1100, "Coordenador": 1100, "Supervisor Pós-vendas": 1100,
    "Supervisor Peças": 900, "Supervisor de Assistência": 900,
    "Consultor Peças Balcão": 800, "Consultor Técnico": 800
  };

  const politica = { ...base, bonusBase: bonusBaseNovo[cargo] ?? base.bonusBase };

  if (cargo === "Consultor Técnico") {
    politica.faixas = [
      { minimo: 7300, bonus: 600 }, { minimo: 7500, bonus: 700 },
      { minimo: 7800, bonus: 800 }, { minimo: 8100, bonus: 900 }
    ];
  }

  /* NPS novo: R$ 250 por semana atingida, teto mensal de R$ 1.000. */
  if (pixNumero(base.bonusNps) > 0) politica.bonusNpsSemanal = 250;
  return politica;
}

function pixChaveData(dataIso) {
  return String(dataIso || "").replace(/-/g, "");
}

function pixDataLocal(dataIso) {
  const [ano, mes, dia] = String(dataIso || "").split("-").map(Number);
  return new Date(ano, (mes || 1) - 1, dia || 1);
}

function pixRotuloData(dataIso) {
  const data = pixDataLocal(dataIso);
  const semana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][data.getDay()];
  return { semana, dia: String(data.getDate()).padStart(2, "0") };
}

function pixDatasCompetencia(competencia) {
  const [ano, mes] = String(competencia || "").split("-").map(Number);
  if (!ano || !mes) return [];
  const ultimo = new Date(ano, mes, 0).getDate();
  return Array.from({ length: ultimo }, (_, i) => {
    const dia = i + 1;
    const iso = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    return { iso, ...pixRotuloData(iso), domingo: pixDataLocal(iso).getDay() === 0 };
  });
}

function pixDiasSelecionadosFormulario() {
  return [...document.querySelectorAll(".pix-calendar-day.is-selected[data-date]")]
    .map(el => el.dataset.date)
    .sort();
}

function normalizarDiasPix(lancamento = {}) {
  const porData = lancamento.diasCalendario || {};
  const datas = Array.isArray(lancamento.datasAvaliadas) ? lancamento.datasAvaliadas : [];

  if (datas.length) {
    return datas.map(data => ({
      chave: data,
      data,
      rotulo: pixRotuloData(data).semana,
      naoTrabalhado: false,
      realizado: pixNumero(porData?.[data]?.realizado),
      informado: porData?.[data]?.realizado !== null && porData?.[data]?.realizado !== undefined && String(porData[data].realizado).trim() !== ""
    }));
  }

  /* Compatibilidade com lançamentos criados na primeira versão diária. */
  const antigos = lancamento.diasSemana || {};
  return PIX_DIAS_SEMANA
    .filter(dia => !(antigos?.[dia.chave]?.naoTrabalhado === true || antigos?.[dia.chave]?.naoTrabalhado === "true"))
    .map(dia => ({
      chave: dia.chave,
      data: "",
      rotulo: dia.rotulo,
      naoTrabalhado: false,
      realizado: pixNumero(antigos?.[dia.chave]?.realizado),
      informado: antigos?.[dia.chave]?.realizado !== null && antigos?.[dia.chave]?.realizado !== undefined && String(antigos[dia.chave].realizado).trim() !== ""
    }));
}

function pixAvaliarSaldoDias(dias, metaDia, saldoInicial = 0) {
  let saldo = saldoInicial;
  return dias.map(dia => {
    const realizado = pixNumero(dia.realizado);
    const informado = dia.informado !== false;
    const anterior = saldo;
    const metaAjustada = Math.max(0, metaDia - anterior);
    const atingiu = informado && metaDia > 0 && realizado + anterior >= metaDia - 0.000001;
    if (informado) saldo = Math.round((anterior + realizado - metaDia) * 100) / 100;
    return { ...dia, realizado, informado, atingiu, metaAjustada,
      saldoAnterior: anterior, disponivel: realizado + Math.max(0, anterior),
      gorduraAposDia: Math.max(0, saldo), deficitAposDia: Math.max(0, -saldo) };
  });
}

// Carrega o histórico completo da competência antes de bloquear datas no formulário.
// Os filtros da tabela podem deixar outras semanas fora do estado em memória.
let pixHistoricoModalToken = 0;
let pixHistoricoModalConferido = false;
async function atualizarHistoricoModalPix() {
  const token = ++pixHistoricoModalToken;
  pixHistoricoModalConferido = false;
  const competencia = normalizarCompetenciaPix($("#pixLancamentoCompetencia")?.value);
  const funcionarioId = $("#pixLancamentoFuncionario")?.value;
  if (!competencia || !funcionarioId) return;
  const calendario = $("#pixCalendarioDias");
  if (calendario && Number($("#pixLancamentoSemana")?.value) > 1) calendario.querySelectorAll(".pix-calendar-day:not(.is-sunday)").forEach(el => el.disabled = true);
  const resumo = $("#pixSaldoAnterior");
  if (resumo) { resumo.hidden = false; resumo.textContent = "Conferindo lançamentos anteriores…"; }
  try {
    const { data, error } = await supabase.from("pix_lancamentos").select("id,dados").eq("competencia", competencia);
    if (error) throw error;
    if (token !== pixHistoricoModalToken || !$("#modalPixPresidente")?.open) return;
    const encontrados = (data || []).map(linha => ({ ...(linha.dados || {}), id: linha.id }));
    const ids = new Set(encontrados.map(item => String(item.id)));
    estadoPix.lancamentos = [...estadoPix.lancamentos.filter(item => !ids.has(String(item.id))), ...encontrados];
    pixHistoricoModalConferido = true;
    atualizarContextoSemanalPix();
    renderDiasSelecionadosPix();
    atualizarPainelDiarioPix();
    atualizarPreviewPix();
  } catch (erro) {
    console.error("[PIX] Não foi possível conferir os dias já utilizados:", erro);
    if (resumo) { resumo.hidden = false; resumo.textContent = "Não foi possível conferir as datas. Tente novamente."; }
    // Falha de rede não deve liberar datas que podem pertencer a outra semana.
  }
}

function pixContextoSemanasAnteriores(lancamento) {
  const semana = Number(normalizarSemanaPix(lancamento.semana));
  if (!usaRegraPixDiaria(lancamento.competencia) || semana < 1) return { saldo: 0, datasOcupadas: new Set() };
  const registros = estadoPix.lancamentos
    .filter(item => String(item.funcionarioId) === String(lancamento.funcionarioId)
      && normalizarCompetenciaPix(item.competencia) === normalizarCompetenciaPix(lancamento.competencia)
      && item.id !== lancamento.id && Number(normalizarSemanaPix(item.semana)) < semana)
    .sort((a,b) => Number(normalizarSemanaPix(a.semana)) - Number(normalizarSemanaPix(b.semana)));
  const datasOcupadas = new Set();
  let saldo = 0;
  registros.forEach(item => {
    const dias = normalizarDiasPix(item).sort((a,b) => String(a.data).localeCompare(String(b.data)));
    const metaDia = dias.length ? pixNumero(item.metaSemanal) / dias.length : 0;
    dias.forEach(dia => {
      if (dia.data) datasOcupadas.add(dia.data);
      if (dia.informado) saldo = Math.round((saldo + pixNumero(dia.realizado) - metaDia) * 100) / 100;
    });
  });
  return { saldo, datasOcupadas };
}

function calcularBaseDiariaPix(lancamento, politica) {
  const metaSemanal = pixNumero(lancamento.metaSemanal);
  const dias = normalizarDiasPix(lancamento);
  const quantidadeDias = dias.length;
  const metaDiaria = quantidadeDias > 0 ? metaSemanal / quantidadeDias : 0;
  const valorDiario = quantidadeDias > 0 ? pixNumero(politica?.bonusBase) / quantidadeDias : 0;
  const saldoInicial = pixContextoSemanasAnteriores(lancamento).saldo;
  const avaliados = pixAvaliarSaldoDias(dias, metaDiaria, saldoInicial);
  const diasAtingidos = avaliados.filter(dia => dia.atingiu).length;
  const ultimo = avaliados[avaliados.length - 1];
  const realizadoSemanal = dias.reduce((soma, dia) => soma + pixNumero(dia.realizado), 0);
  const todosDiasInformados = quantidadeDias > 0 && avaliados.every(dia => dia.informado);
  const todosDiasAtingidos = todosDiasInformados && diasAtingidos === quantidadeDias;
  // A gordura/déficit transportada participa do resultado acumulado da semana.
  const atingiuAcumulado = todosDiasInformados && metaSemanal > 0 &&
    realizadoSemanal + saldoInicial >= metaSemanal - 0.000001;
  const baseIntegral = pixNumero(politica?.bonusBase);
  // Sem atingir o acumulado semanal, nenhum dia gera bônus-base.
  // 100% exige todos os dias; 50% vale para acumulado atingido com falhas diárias.
  const bonusBase = !atingiuAcumulado ? 0
    : todosDiasAtingidos ? baseIntegral
    : baseIntegral * 0.5;
  return {
    dias: avaliados, quantidadeDias, metaDiaria, valorDiario, realizadoSemanal, saldoInicial,
    diasAtingidos, todosDiasInformados, todosDiasAtingidos, atingiuAcumulado,
    gorduraFinal: ultimo?.gorduraAposDia || 0,
    deficitFinal: ultimo?.deficitAposDia || 0,
    bonusBase: Math.round(bonusBase * 100) / 100
  };
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
    .replace(/\u00A0/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function cargoUsaNpsPix(cargo) {
  const politica =
    pixPolitica(cargo);

  return Boolean(
    politica &&
    pixNumero(
      politica.bonusNps
    ) > 0
  );
}

function cargoUsaOsPix(cargo) {
  /*
   * REGRA OFICIAL DE O.S.:
   * Na Semana 4, todo cargo válido da campanha deve informar
   * o percentual de O.S. em aberto. Acima de 28%, aplica-se
   * a penalidade de 50% prevista nas políticas do sistema.
   */
  return Boolean(
    pixPolitica(cargo)
  );
}

/*
 * Mantido por compatibilidade com qualquer trecho antigo
 * que ainda faça referência ao nome anterior.
 */
function cargoSemNpsEOsPix(cargo) {
  return (
    !cargoUsaNpsPix(cargo) &&
    !cargoUsaOsPix(cargo)
  );
}

function campoPixRealmenteInformado(
  lancamento,
  campo,
  flag
) {
  /*
   * Novos registros usam flag explícita:
   * true  = usuário/arquivo informou o campo
   * false = campo estava vazio
   */
  if (
    lancamento?.[flag] === true ||
    lancamento?.[flag] === "true"
  ) {
    return true;
  }

  if (
    lancamento?.[flag] === false ||
    lancamento?.[flag] === "false"
  ) {
    return false;
  }

  const valor =
    lancamento?.[campo];

  const origem =
    normalizarTextoPix(
      lancamento?.origemImportacao ||
      lancamento?.regraImportacao ||
      ""
    );

  const veioDeImportacao =
    origem.includes("RELATORIO") ||
    origem.includes("IMPORT") ||
    origem.includes("MODELO DIRETO");

  /*
   * Compatibilidade com histórico:
   * - registro manual antigo: se o campo existe, preservamos como válido;
   * - importação antiga: zero sem flag é tratado como pendente, pois
   *   antes o importador convertia vazio em 0.
   */
  if (
    veioDeImportacao &&
    (
      valor === undefined ||
      valor === null ||
      valor === "" ||
      pixNumero(valor) === 0
    )
  ) {
    return false;
  }

  return !(
    valor === undefined ||
    valor === null ||
    (
      typeof valor === "string" &&
      valor.trim() === ""
    )
  );
}

function pendenciasCriticasPix(
  lancamento,
  politica,
  cargo
) {
  const pendencias = [];

  if (!politica) {
    return pendencias;
  }

  if (
    politica.metrica === "margem"
  ) {
    if (
      !campoPixRealmenteInformado(
        lancamento,
        "margem",
        "margemInformada"
      )
    ) {
      pendencias.push(
        "Margem realizada não informada"
      );
    }
  } else {
    if (
      !campoPixRealmenteInformado(
        lancamento,
        "ticketMedio",
        "ticketMedioInformado"
      )
    ) {
      pendencias.push(
        "Ticket médio não informado"
      );
    }
  }

  if (
    usaRegraPixDiaria(lancamento?.competencia) &&
    cargoUsaNpsPix(cargo) &&
    (
      !campoPixRealmenteInformado(lancamento, "realizadoNps", "realizadoNpsInformado")
    )
  ) {
    pendencias.push("NPS semanal não informado");
  }

  if (
    Number(
      lancamento?.semana
    ) === 4 &&
    cargoUsaOsPix(
      cargo
    ) &&
    !campoPixRealmenteInformado(
      lancamento,
      "osAbertaPercentual",
      "osAbertaInformada"
    )
  ) {
    pendencias.push(
      "O.S. em aberto não informada"
    );
  }

  return pendencias;
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

function realizadoSemanalLegadoPix(lancamento = {}) {
  const valor = lancamento.realizadoSemanal;
  if (valor !== null && valor !== undefined && String(valor).trim() !== "") return pixNumero(valor);
  return normalizarDiasPix(lancamento).filter(dia => dia.informado)
    .reduce((soma, dia) => soma + pixNumero(dia.realizado), 0);
}

function calcularPix(lancamento) {
  const funcionario =
    pixFuncionarioPorId(lancamento.funcionarioId);

  const cargo =
    funcionario?.cargo ||
    lancamento.cargo;

  const politica = pixPoliticaVigente(cargo, lancamento.competencia);

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
      dadosCriticosCompletos: false,
      dadosCriticosPendentes: [
        "Cargo não pertence ao Pix do Presidente"
      ],
      status: "NÃO HABILITADO",
      observacao: "Cargo não pertence ao Pix do Presidente."
    };
  }

  const meta =
    pixNumero(
      lancamento.metaSemanal
    );

  const regraDiaria = usaRegraPixDiaria(lancamento.competencia);
  const apuracaoDiaria = regraDiaria
    ? calcularBaseDiariaPix(lancamento, politica)
    : null;

  const realizado = regraDiaria
    ? apuracaoDiaria.realizadoSemanal
    : realizadoSemanalLegadoPix(lancamento);

  const percentualMeta =
    meta > 0
      ? realizado / meta * 100
      : 0;

  const semMeta =
    lancamento.semMetaIndividual === true ||
    lancamento.semMetaIndividual === "true" ||
    meta <= 0;

  const atingiuMeta =
    !semMeta &&
    percentualMeta >= 100;

  const indicador =
    politica.metrica === "margem"
      ? pixNumero(
          lancamento.margem
        )
      : pixNumero(
          lancamento.ticketMedio
        );

  /*
   * TRAVA FINANCEIRA:
   * se faltar um campo que influencia a bonificação/penalidade,
   * o lançamento permanece registrado, porém não paga nada.
   */
  const dadosCriticosPendentes =
    pendenciasCriticasPix(
      lancamento,
      politica,
      cargo
    );

  const dadosCriticosCompletos =
    dadosCriticosPendentes.length === 0;

  /*
   * ACÚMULO PROGRESSIVO (Nov/2026+):
   * cada componente já preenchido e atingido entra no total imediatamente.
   * Campos ainda pendentes deixam apenas o respectivo componente em R$ 0,
   * sem apagar valores já conquistados em outros indicadores.
   * O legado anterior a Nov/2026 preserva a trava financeira histórica.
   */
  const bonusBase =
    regraDiaria
      ? apuracaoDiaria.bonusBase
      : (
          dadosCriticosCompletos && atingiuMeta
            ? politica.bonusBase
            : 0
        );

  /*
   * Nov/2026+: bônus-base E bônus de ticket/margem exigem a meta semanal
   * acumulada (incluindo saldo transportado) atingida. O NPS mantém
   * sua regra independente de cofrinho e liberação na quarta semana.
   */
  const indicadorInformado =
    politica.metrica === "margem"
      ? campoPixRealmenteInformado(lancamento, "margem", "margemInformada")
      : campoPixRealmenteInformado(lancamento, "ticketMedio", "ticketMedioInformado");

  const metaSemanalElegivel = regraDiaria
    ? !!apuracaoDiaria?.atingiuAcumulado
    : dadosCriticosCompletos && atingiuMeta;
  const bonusFaixa =
    indicadorInformado && metaSemanalElegivel
      ? pixBonusFaixa(politica, indicador)
      : 0;

  /*
   * NPS é mensal e entra somente no fechamento da Semana 4.
   * Ele só aparece nos cargos cuja política possui bônus de NPS.
   */
  const usaNps =
    cargoUsaNpsPix(
      cargo
    );

  const metaNps =
    usaNps
      ? pixNumero(
          lancamento.metaNps
        )
      : 0;

  const realizadoNps =
    usaNps
      ? pixNumero(
          lancamento.realizadoNps
        )
      : 0;

  const percentualNps =
    metaNps > 0
      ? realizadoNps / metaNps * 100
      : 0;

  const atingiuNps =
    usaNps &&
    metaNps > 0 &&
    realizadoNps >= metaNps;

  const npsInformado =
    campoPixRealmenteInformado(lancamento, "realizadoNps", "realizadoNpsInformado");

  /*
   * COFRINHO NPS — vigência novembro/2026+:
   * Semanas 1-3 acumulam apenas saldo potencial. Na semana 4,
   * o NPS da própria semana é o gatilho para liberar todo o saldo.
   * Não duplica valores nas semanas anteriores nem altera o legado.
   */
  const semanaNps = Number(lancamento.semana);
  const npsSemanalElegivel = atingiuNps && npsInformado;
  const valorNpsSemanal = pixNumero(politica.bonusNpsSemanal || 250);
  const semanasNpsAtingidas = regraDiaria && usaNps
    ? estadoPix.lancamentos.filter(item =>
        String(item.funcionarioId) === String(lancamento.funcionarioId) &&
        String(item.competencia) === String(lancamento.competencia) &&
        Number(item.semana) >= 1 && Number(item.semana) <= 3 &&
        campoPixRealmenteInformado(item, "realizadoNps", "realizadoNpsInformado") &&
        pixNumero(item.metaNps) > 0 &&
        pixNumero(item.realizadoNps) >= pixNumero(item.metaNps)
      ).reduce((mapa, item) => {
        mapa.add(Number(item.semana));
        return mapa;
      }, new Set())
    : new Set();
  const saldoCofrinhoNps = regraDiaria && usaNps
    ? semanasNpsAtingidas.size * valorNpsSemanal
    : 0;
  // Condição adicional compartilhada. Nunca usa o NPS individual como NPS da filial.
  const exigeNpsUnidade = regraDiaria && usaNps && semanaNps === 4;
  const npsUnidade = regraDiaria && usaNps
    ? npsUnidadePix.avaliar(lancamento.filial || funcionario?.filial, lancamento.competencia)
    : { status: "NAO_APLICAVEL", atingiu: true, meta: null, realizado: null };
  const bonusNps = regraDiaria
    ? (usaNps && semanaNps === 4 && npsSemanalElegivel && npsUnidade.atingiu
        ? saldoCofrinhoNps + valorNpsSemanal
        : 0)
    : (npsSemanalElegivel && dadosCriticosCompletos && semanaNps === 4
        ? politica.bonusNps
        : 0);
  const npsCofrinhoStatus = !regraDiaria || !usaNps
    ? ""
    : semanaNps === 4
      ? (!npsUnidade.atingiu ? (npsUnidade.status === "NAO_ATINGIDO" ? "BLOQUEADO PELA FILIAL" : "AGUARDANDO NPS DA FILIAL") : npsSemanalElegivel ? "LIBERADO" : npsInformado ? "NÃO LIBERADO" : "AGUARDANDO SEMANA 4")
      : "ACUMULANDO";
  const npsCofrinhoPotencial = regraDiaria && usaNps
    ? saldoCofrinhoNps + (semanaNps < 4 && npsSemanalElegivel && !semanasNpsAtingidas.has(semanaNps) ? valorNpsSemanal : 0)
    : 0;

  const subtotal =
    bonusBase +
    bonusFaixa +
    bonusNps;

  const usaOs =
    Number(
      lancamento.semana
    ) === 4 &&
    cargoUsaOsPix(
      cargo
    );

  const osAberta =
    usaOs
      ? pixNumero(
          lancamento.osAbertaPercentual
        )
      : 0;

  const aplicaPenalidade =
    usaOs &&
    dadosCriticosCompletos &&
    osAberta > LIMITE_OS_ABERTA;

  const penalidade =
    aplicaPenalidade
      ? subtotal * PENALIDADE_OS
      : 0;

  const bonusFinal =
    regraDiaria
      ? Math.max(0, subtotal - penalidade)
      : (
          dadosCriticosCompletos
            ? Math.max(0, subtotal - penalidade)
            : 0
        );

  /*
   * Justificativa da regra diária (novembro/2026+).
   * O percentual semanal é informativo: a base depende dos dias
   * atingidos, e ticket/margem/NPS possuem critérios próprios.
   * A regra legada permanece inalterada.
   */
  const diasAvaliadosPix = regraDiaria
    ? (apuracaoDiaria?.dias || []).filter(dia => dia.informado)
    : [];
  const diasPremiadosPix = diasAvaliadosPix.filter(dia => dia.atingiu).length;
  const diasPendentesPix = regraDiaria
    ? Math.max(0, (apuracaoDiaria?.quantidadeDias || 0) - diasAvaliadosPix.length)
    : 0;
  const justificativaDiariaPix = () => {
    if (semMeta) return lancamento.motivoNaoHabilitado || "Meta semanal não cadastrada; não é possível calcular as metas diárias.";
    if (!apuracaoDiaria?.quantidadeDias) return "Nenhum dia selecionado para avaliação. Selecione os dias e informe o realizado.";
    if (!diasAvaliadosPix.length) return "Aguardando lançamento do realizado nos dias selecionados.";
    const partes = [];
    if (apuracaoDiaria.todosDiasAtingidos) {
      partes.push("Todos os dias selecionados atingidos: 100% do bônus-base semanal");
    } else if (apuracaoDiaria.atingiuAcumulado) {
      partes.push("Meta semanal acumulada atingida, mas nem todos os dias cumpridos: bônus-base limitado a 50%");
    } else {
      partes.push("Meta semanal acumulada não atingida: bônus-base e bônus de ticket/margem R$ 0,00, mesmo com dias individuais cumpridos");
    }
    if (diasPendentesPix > 0) partes.push(`${diasPendentesPix} dia(s) ainda sem lançamento`);
    if (apuracaoDiaria.deficitFinal > 0) partes.push(`déficit acumulado: ${pixMoeda(apuracaoDiaria.deficitFinal)}`);
    if (bonusFaixa > 0) partes.push(`bônus de ${politica.metrica === "margem" ? "margem" : "ticket médio"} conquistado`);
    if (regraDiaria && usaNps && semanaNps < 4 && npsSemanalElegivel) partes.push("NPS atingido: R$ 250,00 reservado no cofrinho, pagamento condicionado ao NPS individual da semana 4 e ao NPS geral da filial");
    if (regraDiaria && usaNps && semanaNps === 4 && !npsSemanalElegivel) partes.push("NPS do mês não liberado: semana 4 não atingiu a meta ou está pendente");
    if (exigeNpsUnidade) partes.push(mensagemNpsUnidade(npsUnidade));
    if (bonusNps > 0) partes.push(`cofrinho NPS liberado na semana 4: ${pixMoeda(bonusNps)}`);
    if (bonusFinal <= 0 && diasPremiadosPix > 0 && aplicaPenalidade) partes.push("bonificação impactada pela penalidade de O.S.");
    if (bonusFinal > 0) partes.push("colaborador habilitado com bonificação calculada pelos indicadores alcançados");
    else if (diasPremiadosPix === 0 && bonusFaixa === 0 && bonusNps === 0) partes.push("nenhum componente de bonificação conquistado até o momento");
    return partes.join(". ") + ".";
  };

  let observacao = "";

  if (regraDiaria) {
    observacao = justificativaDiariaPix();
    if (!dadosCriticosCompletos) observacao += ` Dados pendentes: ${dadosCriticosPendentes.join(" • ")}.`;
  } else if (!dadosCriticosCompletos) {
    observacao =
      `INFORMAÇÃO PENDENTE: ${dadosCriticosPendentes.join(
        " • "
      )}. Sem bonificação até o preenchimento.`;
  } else if (semMeta) {
    observacao =
      lancamento.motivoNaoHabilitado ||
      "Sem meta válida para esta semana.";
  } else if (!atingiuMeta && bonusNps > 0) {
    observacao =
      "NPS atingido e pago mesmo sem atingir a meta semanal.";
  } else if (
    usaNps &&
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
    regraDiaria,
    realizadoSemanal: realizado,
    apuracaoDiaria,
    percentualMeta,
    semMeta,
    atingiuMeta,
    indicador,
    dadosCriticosPendentes,
    dadosCriticosCompletos,
    bonusBase,
    bonusFaixa,
    metaNps,
    realizadoNps,
    percentualNps,
    atingiuNps,
    bonusNps,
    exigeNpsUnidade,
    npsUnidade,
    saldoCofrinhoNps,
    npsCofrinhoPotencial,
    npsCofrinhoStatus,
    osAbertaPercentual:
      osAberta,
    usaNps,
    usaOs,
    subtotal,
    penalidade,
    bonusFinal,
    status:
      bonusFinal > 0 &&
      dadosCriticosCompletos
        ? "HABILITADO"
        : "NÃO HABILITADO",
    observacao
  };
}

window.calcularPagamentoPixHistorico = function(lancamento, todosLancamentos = []) {
  /*
   * Usa exatamente o mesmo motor de cálculo exibido em Lançamentos/Apuração.
   * O relatório entrega ao calcularPix() o lançamento histórico completo;
   * a função oficial resolve cargo/política e devolve bonusFinal.
   */
  const anteriores = estadoPix.lancamentos;
  try {
    if (Array.isArray(todosLancamentos) && todosLancamentos.length) estadoPix.lancamentos = todosLancamentos;
    const resultado = calcularPix(lancamento);
    return Math.max(0, pixNumero(resultado?.bonusFinal));
  } catch (erro) {
    console.warn("[PAGAMENTOS/PIX] Falha ao recalcular histórico:", erro);
    return 0;
  } finally {
    estadoPix.lancamentos = anteriores;
  }
};

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
  const filiaisUnicas =
    new Map();

  participantesPix().forEach(
    funcionario => {
      const filialOriginal =
        String(
          funcionario.filial || ""
        )
          .replace(
            /\u00A0/g,
            " "
          )
          .replace(
            /\s+/g,
            " "
          )
          .trim();

      if (!filialOriginal) {
        return;
      }

      const chave =
        normalizarTextoPix(
          filialOriginal
        );

      if (
        !filiaisUnicas.has(
          chave
        )
      ) {
        const filialOficial =
          FILIAIS_PIX.find(
            item =>
              normalizarTextoPix(
                item.unidade
              ) ===
                chave
          );

        filiaisUnicas.set(
          chave,
          filialOficial?.unidade ||
          filialOriginal.toUpperCase()
        );
      }
    }
  );

  return [
    ...filiaisUnicas.values()
  ].sort(
    (a, b) =>
      a.localeCompare(
        b,
        "pt-BR"
      )
  );
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

  const competenciaAtiva =
    competenciaHistoricoPix();

  [
    "#pixFiltroCompetenciaLancamento",
    "#pixFiltroCompetenciaApuracao"
  ].forEach(seletor => {
    const campo = $(seletor);

    if (!campo) {
      return;
    }

    const possuiOpcao =
      [...campo.options].some(
        opcao =>
          opcao.value === competenciaAtiva
      );

    if (possuiOpcao) {
      campo.value = competenciaAtiva;
    }
  });
}

function normalizarCompetenciaPix(
  valor
) {
  const textoCompetencia =
    String(
      valor || ""
    )
      .trim()
      .replace(
        "/",
        "-"
      );

  const correspondencia =
    textoCompetencia.match(
      /(\d{4})\D?(\d{1,2})/
    );

  if (!correspondencia) {
    return textoCompetencia;
  }

  return (
    correspondencia[1] +
    "-" +
    String(
      Number(
        correspondencia[2]
      )
    ).padStart(
      2,
      "0"
    )
  );
}

function normalizarSemanaPix(
  valor
) {
  const numeroSemana =
    String(
      valor || ""
    ).match(
      /[1-4]/
    )?.[0];

  return numeroSemana || "";
}

function resultadosPixFiltrados(tipo) {
  const prefixo =
    tipo === "apuracao"
      ? "Apuracao"
      : "Lancamento";

  const competenciaAtiva =
    competenciaHistoricoPix();

  const competenciaSelecionada =
    $(`#pixFiltroCompetencia${prefixo}`)?.value || "";

  const competencia =
    normalizarCompetenciaPix(
      competenciaSelecionada ||
      competenciaAtiva
    );

  const filial =
    normalizarTextoPix(
      $(`#pixFiltroFilial${prefixo}`)?.value || ""
    );

  const cargo =
    normalizarTextoPix(
      $(`#pixFiltroCargo${prefixo}`)?.value || ""
    );

  const semana =
    normalizarSemanaPix(
      $(`#pixFiltroSemana${prefixo}`)?.value || ""
    );

  const status =
    tipo === "apuracao"
      ? normalizarTextoPix(
          $("#pixFiltroStatusApuracao")?.value || ""
        )
      : "";

  /*
   * Os filtros agora comparam versões normalizadas.
   *
   * Isso permite localizar registros antigos ou importados com:
   * - SÃO LUÍS / SAO LUIS;
   * - espaços invisíveis;
   * - espaços extras;
   * - Semana 4 / S4 / 4;
   * - 2026-7 / 2026-07;
   * - pequenas diferenças de acentuação no cargo.
   */
  const resultados =
    estadoPix.lancamentos
      .map(
        calcularPix
      )
      .filter(
        resultado => {
          const competenciaResultado =
            normalizarCompetenciaPix(
              resultado.competencia
            );

          const filialResultado =
            normalizarTextoPix(
              resultado.filial
            );

          const cargoResultado =
            normalizarTextoPix(
              resultado.cargo
            );

          const semanaResultado =
            normalizarSemanaPix(
              resultado.semana
            );

          const statusResultado =
            normalizarTextoPix(
              resultado.status
            );

          return (
            (
              !competencia ||
              competenciaResultado ===
                competencia
            ) &&
            (
              !filial ||
              filialResultado ===
                filial
            ) &&
            (
              !cargo ||
              cargoResultado ===
                cargo
            ) &&
            (
              !semana ||
              semanaResultado ===
                semana
            ) &&
            (
              !status ||
              statusResultado ===
                status
            )
          );
        }
      )
      .sort(
        (a, b) =>
          String(
            b.competencia
          ).localeCompare(
            String(
              a.competencia
            )
          ) ||
          Number(
            a.semana
          ) -
          Number(
            b.semana
          ) ||
          String(
            a.nome
          ).localeCompare(
            String(
              b.nome
            ),
            "pt-BR"
          )
      );

  console.info(
    "[PIX FILTROS]",
    {
      tipo,
      competencia,
      filial,
      cargo,
      semana,
      status,
      totalBanco:
        estadoPix.lancamentos.length,
      encontrados:
        resultados.length
    }
  );

  return resultados;
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
        resultado.semMeta
          ? `
            <span class="pix-import-warning">
              Motivo:
              <b>
                ${protegerHtml(resultado.motivoNaoHabilitado || "SEM META")}
              </b>
            </span>
          `
          : ""
      }

      ${
        resultado.origemImportacao
          ? `
            <span>
              Origem:
              <b>${resultado.origemImportacao}</b>
            </span>
          `
          : ""
      }

      ${
        Number(resultado.semana) === 4 &&
        !cargoSemNpsEOsPix(
          resultado.cargo
        )
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
      ${resultado.exigeNpsUnidade ? `<span class="pix-nps-unidade-indicador"><b>NPS geral da filial:</b> ${mensagemNpsUnidade(resultado.npsUnidade)}</span>` : ""}
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

let sincronizacaoPixEmAndamento =
  false;

let ultimaCompetenciaSincronizadaPix =
  "";

function sincronizarCompetenciaPix(
  competencia,
  origem = "global"
) {
  const competenciaSuperior =
    $("#competenciaGlobal")?.value;

  competencia =
    competenciaSuperior ||
    competencia ||
    pixMesAtual();

  if (
    !competencia ||
    sincronizacaoPixEmAndamento
  ) {
    return;
  }

  if (
    ultimaCompetenciaSincronizadaPix ===
      competencia &&
    $("#pixFiltroCompetenciaLancamento")?.value ===
      competencia &&
    $("#pixFiltroCompetenciaApuracao")?.value ===
      competencia
  ) {
    return;
  }

  sincronizacaoPixEmAndamento =
    true;

  try {
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
    campoPix.tabIndex = -1;
    campoPix.setAttribute("aria-hidden", "true");
    campoPix.closest("label")?.setAttribute("hidden", "");
  }

  atualizarRotuloHistoricoPix(
    competencia
  );

  [
    "#pixFiltroCompetenciaLancamento",
    "#pixFiltroCompetenciaApuracao"
  ].forEach(seletor => {
    const campo = $(seletor);

    if (campo) {
      if (![...campo.options].some(opcao => opcao.value === competencia)) {
        campo.add(new Option(competencia, competencia));
      }
      campo.value = competencia;
      campo.hidden = true;
      campo.tabIndex = -1;
      campo.setAttribute("aria-hidden", "true");
    }
  });

  const campoModal =
    $("#pixLancamentoCompetencia");

  if (
    campoModal &&
    !campoModal.closest("dialog")?.open
  ) {
    campoModal.value = competencia;
  }

  ultimaCompetenciaSincronizadaPix =
    competencia;

  renderDashboardPix();
  renderLancamentosPix();
  renderApuracaoPix();
  } finally {
    sincronizacaoPixEmAndamento =
      false;
  }
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
    participantesPix()
      .filter(
        funcionario =>
          funcionarioPixAtivo(
            funcionario
          )
      )
      .filter(
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
                <td>${protegerHtml(funcionario.dn || "")}</td>
                <td>${protegerHtml(funcionario.filial || "")}</td>
                <td>
                  <strong>${protegerHtml(funcionario.nome || "")}</strong>
                </td>
                <td>${protegerHtml(funcionario.cargo || "")}</td>
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
                      data-pix-func-edit="${protegerHtml(funcionario.id)}"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      class="mini-btn delete"
                      data-pix-func-delete="${protegerHtml(funcionario.id)}"
                      title="Remover da base ativa preservando todo o histórico"
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
    "2026.08.06-11-MOTIVO-STATUS";
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
              <td>${protegerHtml(resultado.filial)}</td>
              <td><strong>${protegerHtml(resultado.nome)}</strong></td>
              <td>${protegerHtml(resultado.cargo)}</td>
              <td>${indicadorPixTexto(resultado)}</td>
              <td>${pixMoeda(resultado.bonusBase)}</td>
              <td>${pixMoeda(resultado.bonusFaixa)}</td>
              <td>${pixMoeda(resultado.bonusNps)}</td>
              <td class="pix-penalty">
                ${pixMoeda(resultado.penalidade)}
              </td>
              <td><strong>${pixMoeda(resultado.bonusFinal)}</strong></td>
              <td>
                <div
                  class="pix-status-com-motivo"
                  style="
                    display:flex;
                    flex-direction:column;
                    align-items:flex-start;
                    gap:5px;
                    min-width:126px;
                  "
                >
                  <span
                    class="badge ${
                      resultado.status === "HABILITADO"
                        ? "ok"
                        : "no"
                    }"
                    title="${protegerHtml(resultado.observacao)}"
                  >
                    ${protegerHtml(resultado.status)}
                  </span>

                  ${
                    resultado.status !== "HABILITADO"
                      ? `
                        <small
                          class="pix-motivo-nao-habilitado"
                          title="${protegerHtml(resultado.observacao)}"
                          style="
                            display:block;
                            max-width:190px;
                            color:#a52a2a;
                            font-size:10px;
                            font-weight:700;
                            line-height:1.35;
                            white-space:normal;
                            overflow-wrap:anywhere;
                          "
                        >
                          Motivo: ${protegerHtml(resultado.observacao)}
                        </small>
                      `
                      : ""
                  }
                </div>
              </td>
              ${
                comAcoes
                  ? `
                    <td>
                      <div class="actions">
                        <button
                          type="button"
                          class="mini-btn"
                          data-pix-edit="${protegerHtml(resultado.id)}"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          class="mini-btn delete"
                          data-pix-delete="${protegerHtml(resultado.id)}"
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

/* Cofrinho visual do NPS — acompanhamento individual por competência. */
function renderCofrinhoNpsPix() {
  const area = document.querySelector("#pixCofrinhoNps");
  if (!area) return;
  const competencia = normalizarCompetenciaPix(document.querySelector("#pixLancamentoCompetencia")?.value || pixMesAtual());
  const funcionarioId = document.querySelector("#pixLancamentoFuncionario")?.value;
  const funcionario = pixFuncionarioPorId(funcionarioId);
  if (!usaRegraPixDiaria(competencia) || !funcionario || !cargoUsaNpsPix(funcionario.cargo)) {
    area.hidden = true;
    return;
  }
  const porSemana = new Map();
  estadoPix.lancamentos
    .filter(item => normalizarCompetenciaPix(item.competencia) === competencia && String(item.funcionarioId) === String(funcionarioId))
    .forEach(item => porSemana.set(Number(normalizarSemanaPix(item.semana)), calcularPix(item)));
  // Exibe uma prévia do lançamento em edição sem alterar dados persistidos.
  try {
    const rascunho = coletarLancamentoPix();
    if (String(rascunho.funcionarioId) === String(funcionarioId)) {
      porSemana.set(Number(rascunho.semana), calcularPix(rascunho));
    }
  } catch (_) { /* Os registros salvos continuam visíveis. */ }
  const semanas = [1, 2, 3, 4].map(numero => {
    const item = porSemana.get(numero);
    const informado = !!(item && campoPixRealmenteInformado(item, "realizadoNps", "realizadoNpsInformado"));
    return { numero, informado, atingiu: informado && !!item.atingiuNps };
  });
  const quarta = semanas[3];
  const npsUnidade = npsUnidadePix.avaliar(funcionario.filial, competencia);
  const acumulado = semanas.filter(item => item.atingiu).length * 250;
  const guardado = quarta.informado ? 0 : semanas.slice(0, 3).filter(item => item.atingiu).length * 250;
  const liberado = quarta.atingiu && npsUnidade.atingiu ? acumulado : 0;
  const status = quarta.informado && !npsUnidade.atingiu
    ? (npsUnidade.status === "NAO_ATINGIDO" ? "Bloqueado pela filial" : "Aguardando filial")
    : quarta.atingiu ? "Liberado" : quarta.informado ? "Não liberado" : "Acumulando";
  const detalhe = quarta.informado && !npsUnidade.atingiu ? mensagemNpsUnidade(npsUnidade)
    : quarta.atingiu ? "NPS individual e da filial atingidos" : quarta.informado ? "NPS individual da semana 4 não atingido" : "Reservado · exige NPS individual e geral da filial";
  const quantidade = semanas.filter(item => item.atingiu).length;
  area.hidden = false;
  area.innerHTML = `<div class="pix-piggy-mini">
    <div class="pix-piggy-mini-main">
      <span class="pix-piggy-mini-icon" aria-hidden="true">🐷</span>
      <div class="pix-piggy-mini-info">
        <span class="pix-piggy-mini-label">Cofrinho NPS <span class="pix-piggy-mini-state">${status}</span></span>
        <strong>${pixMoeda(quarta.atingiu ? liberado : guardado)}</strong>
        <small>${detalhe}</small>
      </div>
    </div>
    <div class="pix-piggy-mini-weeks" aria-label="${quantidade} de 4 semanas com NPS atingido">
      ${semanas.map(item => `<span class="pix-piggy-mini-week ${item.atingiu ? "is-ok" : item.informado ? "is-fail" : "is-pending"}" title="Semana ${item.numero}: ${item.atingiu ? "NPS atingido" : item.informado ? "NPS não atingido" : "Aguardando"}" aria-label="Semana ${item.numero}: ${item.atingiu ? "atingida" : item.informado ? "não atingida" : "pendente"}">${item.atingiu ? "✓" : item.numero}</span>`).join("")}
    </div>
  </div>`;
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
  const competencia =
    $("#competenciaGlobal")?.value ||
    $("#pixDashboardCompetencia")?.value ||
    pixMesAtual();
  const novaRegra = usaRegraPixDiaria(competencia);

  const grupos = novaRegra
    ? [
        {
          classe: "lideranca",
          icone: "♛",
          titulo: "Gerente / Coordenador / Supervisor Pós-vendas",
          cargos: ["Gerente", "Coordenador", "Supervisor Pós-vendas"],
          base: 1100,
          metrica: "ticket",
          nps: true,
          nota: "Pagamento semanal condicionado ao resultado acumulado."
        },
        {
          classe: "pecas",
          icone: "⚙",
          titulo: "Supervisor de Peças",
          cargos: ["Supervisor Peças"],
          base: 900,
          metrica: "margem",
          nps: false,
          dynamo: "Meta de contato semanal na Dynamo Peças vinculada aos Consultores de Balcão."
        },
        {
          classe: "assistencia",
          icone: "🔧",
          titulo: "Supervisor de Assistência Técnica",
          cargos: ["Supervisor de Assistência"],
          base: 900,
          metrica: "ticket",
          nps: true
        },
        {
          classe: "balcao",
          icone: "👥",
          titulo: "Consultor de Balcão",
          cargos: ["Consultor Peças Balcão"],
          base: 800,
          metrica: "margem",
          nps: false,
          dynamo: "Meta de contato semanal na Dynamo Peças."
        },
        {
          classe: "tecnico",
          icone: "🎧",
          titulo: "Consultor Técnico",
          cargos: ["Consultor Técnico"],
          base: 800,
          metrica: "ticket",
          nps: true
        },
        {
          classe: "lideranca", icone: "🧾", titulo: "Orçamentista / Facilitador de Negócios",
          cargos: ["Orçamentista / Facilitador de Negócios"],
          base: pixPoliticaVigente("Orçamentista / Facilitador de Negócios", competencia)?.bonusBase || 300,
          metrica: "ticket", nps: false
        }
      ]
    : CARGOS_PIX.map(cargo => {
        const p = pixPolitica(cargo);
        return { classe:"legacy", icone:"•", titulo:cargo, cargos:[cargo], base:p.bonusBase, metrica:p.metrica, nps:p.bonusNps > 0 };
      });

  $("#pixPolicyGrid").dataset.policyManaged = "true";
  $("#pixPolicyGrid").innerHTML = `
    <div class="pix-policy-hero">
      <div><span>🏆 CAMPANHA PIX DO PRESIDENTE</span><strong>Faturamento, margem e excelência no atendimento</strong></div>
      <div class="pix-policy-hero-rule">📊 Pagamento conforme atingimento</div>
      <div class="pix-policy-hero-rule">📅 ${novaRegra ? "Vigência: novembro/2026 em diante" : "Regulamento histórico: " + competencia}</div>
    </div>
    <div class="pix-policy-role-grid">
      ${grupos.map(grupo => {
        const politica = pixPoliticaVigente(grupo.cargos[0], competencia);
        const faixas = politica?.faixas || [];
        
        return `
          <article class="pix-policy-pro ${grupo.classe}">
            <header>
              <span class="pix-policy-icon">${grupo.icone}</span>
              <div><h3>${grupo.titulo}</h3><small>${grupo.metrica === "margem" ? "Margem e resultado" : "Atendimento e resultado"}</small></div>
            </header>
            <section class="pix-policy-base">
              <small>BÔNUS-BASE SEMANAL</small>
              <strong>${pixMoeda(grupo.base)}</strong>
              ${novaRegra ? "<span>Base conforme os dias e o resultado semanal</span>" : "<span>Regulamento histórico da competência</span>"}
              ${novaRegra ? `<div class="pix-policy-payout">
                <div><b class="pix-rule-ok">100%</b><span>Meta semanal + todos os dias atingidos</span><strong>${pixMoeda(grupo.base)}</strong></div>
                <div><b class="pix-rule-half">50%</b><span>Meta semanal atingida, mas algum dia não</span><strong>${pixMoeda(grupo.base / 2)}</strong></div>
                <div><b class="pix-rule-zero">0%</b><span>Meta semanal não atingida, mesmo com dias cumpridos</span><strong>R$ 0,00</strong></div>
              </div>` : ""}
            </section>
            <section class="pix-policy-band">
              <h4>📊 ${grupo.metrica === "margem" ? "MARGEM" : "TICKET MÉDIO"} <small>(por faixa)</small></h4>
              ${novaRegra ? '<p>Aplica-se a maior faixa atingida, após cumprir a meta semanal.</p>' : ""}
              <table><thead><tr><th>Meta</th><th>Bônus</th></tr></thead><tbody>
                ${faixas.map(faixa => `<tr><td>${grupo.metrica === "margem" ? pixPct(faixa.minimo) : pixMoeda(faixa.minimo)}</td><td>${pixMoeda(faixa.bonus)}</td></tr>`).join("")}
              </tbody></table>
            </section>
            ${grupo.nps ? `
              <section class="pix-policy-nps">
                <h4>★ ${novaRegra ? "COFRINHO NPS" : "NPS HISTÓRICO"}</h4>
                <p>${novaRegra ? "R$ 250 por semana atingida · até R$ 1.000 na competência. Consulte as condições conjuntas abaixo." : `Meta: ${politica.objetivoNps} · Bônus: ${pixMoeda(politica.bonusNps)}. Apuração mensal na semana 4, conforme a competência.`}</p>
              </section>` : ""}
            ${!grupo.nps ? '<section class="pix-policy-nps"><h4>NPS</h4><p>Este cargo não possui bônus de NPS.</p></section>' : ""}
            ${grupo.dynamo ? `
              <section class="pix-policy-dynamo">
                <h4>✓ DYNAMO PEÇAS</h4><p>${grupo.dynamo}</p>
              </section>` : ""}
            ${!novaRegra ? `
              <section class="pix-policy-cargo-rules pix-policy-legacy-rules">
                <h4>REGRAS E PENALIDADES — ${grupo.titulo}</h4>
                <p><b>Meta semanal:</b> exige pelo menos 100% da meta e dados obrigatórios completos para pagar a base de ${pixMoeda(politica.bonusBase)} e o adicional de ${grupo.metrica === "margem" ? "margem" : "ticket médio"}. Abaixo da meta, ambos ficam em R$ 0. Meta zerada ou sem meta individual também não libera esses componentes.</p>
                <p><b>Faixas:</b> paga somente a maior faixa atingida na tabela acima. Não soma faixas. Abaixo da primeira faixa, o adicional é R$ 0.</p>
                <p><b>NPS:</b> ${grupo.nps ? `bônus mensal de ${pixMoeda(politica.bonusNps)}, somente na semana 4, ao atingir a meta informada (${politica.objetivoNps}), com dados obrigatórios completos. Abaixo da meta, o NPS é R$ 0; base e adicional seguem seus próprios critérios. Não depende da meta de faturamento.` : "este cargo não participa do bônus de NPS."}</p>
                <p><b>Penalidade de O.S. — semana 4:</b> acima de ${LIMITE_OS_ABERTA}% de O.S. em aberto, desconta ${PENALIDADE_OS * 100}% do subtotal da própria semana 4 (base + adicional${grupo.nps ? " + NPS mensal, quando devido" : ""}). Com exatamente ${LIMITE_OS_ABERTA}%, não há desconto. Não se aplica às semanas 1, 2 e 3.</p>
                <p><b>Campos obrigatórios:</b> ${grupo.metrica === "margem" ? "margem realizada" : "ticket médio"} e, na semana 4, O.S. em aberto. Se faltar informação obrigatória, o lançamento não paga até a regularização. Vazio não equivale a zero.</p>
              </section>` : ""}
          </article>`;
      }).join("")}
    </div>
    ${novaRegra ? `<section class="pix-policy-general">
      <h3>📋 REGRAS GERAIS — PIX DO PRESIDENTE</h3><div>
        <span><b>Meta semanal e faixas:</b> abaixo de 100% da meta acumulada, base e ticket/margem são R$ 0. Ao atingir a semana, aplica-se a maior faixa do cargo, sem somar faixas anteriores.</span>
        <span><b>Base diária:</b> meta semanal dividida pelos dias selecionados. Semana e todos os dias atingidos: base integral; semana atingida e algum dia não cumprido: metade da base.</span>
        <span><b>Calendário:</b> gordura ou déficit segue para os próximos dias e semanas da mesma competência. Datas não se repetem para o colaborador; domingos não podem ser selecionados.</span>
        <span><b>O.S. na semana 4:</b> todos os cargos informam o percentual. Acima de 28%, desconto de 50% sobre o subtotal da semana, incluindo o NPS liberado.</span>
</div></section>` : `<p class="pix-policy-legacy-period">Regulamento histórico da competência selecionada, até outubro de 2026, inclusive. Regras e penalidades detalhadas abaixo de cada cargo. O modelo diário e o cofrinho semanal começam em novembro/2026.</p>`}
    ${novaRegra ? `
    <section class="pix-policy-general pix-policy-nps-geral">
      <h3>🏦 COFRINHO NPS — INDIVIDUAL + FILIAL</h3>
      <div>
        <span><b>Reserva individual:</b> cada semana com NPS individual atingindo a meta informada para a filial e competência reserva R$ 250; máximo de R$ 1.000. Somente cargos com NPS participam.</span>
        <span><b>Liberação na semana 4:</b> exige a meta individual da própria semana 4 e a meta geral cadastrada para a filial na competência. O NPS é independente da meta de faturamento.</span>
        <span><b>Filial abaixo da meta:</b> zera o cofrinho NPS de todos os elegíveis daquela unidade. Resultado geral não informado: fica aguardando, sem liberação. Base e ticket/margem mantêm suas próprias regras.</span>
        <span><b>Lançamento único:</b> na semana 4, abaixo do NPS individual, cadastre o resultado oficial consolidado da filial uma vez por competência. Ele vale para todos da unidade; não é a média dos NPS individuais.</span>
        <span><b>Alterações:</b> após salvar, a edição pela interface exige a senha administrativa. A meta geral é obrigatória e variável por filial e mês, sem valor padrão.</span>
        <span><b>Exemplo antes de O.S.:</b> com o NPS individual da semana 4 atingido, uma filial que cumpra a meta geral cadastrada no mês pode liberar até R$ 1.000. Abaixo dessa meta, o cofrinho é R$ 0 para todos os elegíveis.</span>
      </div>
    </section>` : ""}
    <section class="pix-policy-flow">
      <h3>⚙ FLUXO DE APURAÇÃO</h3>
      <div><b>Coleta de dados</b><i>→</i><b>Validação das metas</b><i>→</i><b>Cálculo da bonificação</b><i>→</i><b>Resultado final</b><i>→</i><b>Pagamento</b></div>
    </section>
  `;
}

function renderTudoPix() {
  atualizarSelectsPix();

  const competenciaAtiva =
    $("#competenciaGlobal")?.value ||
    $("#pixDashboardCompetencia")?.value ||
    pixMesAtual();

  const dashboardCompetencia =
    $("#pixDashboardCompetencia");

  if (dashboardCompetencia) {
    dashboardCompetencia.value =
      competenciaAtiva;
  }

  [
    "#pixFiltroCompetenciaLancamento",
    "#pixFiltroCompetenciaApuracao"
  ].forEach(seletor => {
    const campo = $(seletor);

    if (campo) {
      campo.value =
        competenciaAtiva;
    }
  });

  const renderizacoes = [
    ["dashboard", renderDashboardPix],
    ["funcionários", renderFuncionariosPix],
    ["lançamentos", renderLancamentosPix],
    ["apuração", renderApuracaoPix],
    ["políticas", renderPoliticasPix]
  ];

  npsUnidadePix.atualizarResumo();

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
    atualizadoEm: new Date().toISOString()
  };

  try {
    if (botao) {
      botao.disabled = true;
      botao.dataset.textoOriginal =
        botao.textContent;

      botao.textContent =
        "Salvando...";
    }

    const idFinal = id || idPixSupabase();
    const anterior = estadoPix.funcionarios.find(
      item => item.id === idFinal
    ) || {};
    const dadosFinais = {
      ...anterior,
      ...dados,
      criadoEm: anterior.criadoEm || new Date().toISOString()
    };
    delete dadosFinais.id;

    const { error } = await supabase
      .from("pix_funcionarios")
      .upsert({
        id: idFinal,
        dados: dadosFinais,
        ativo,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });

    if (error) throw error;

    await carregarParticipantesPixUmaVez();

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
  const funcionario =
    estadoPix.funcionarios.find(
      item =>
        item.id === id
    );

  if (!funcionario) {
    await pixAlert(
      "Participante não encontrado."
    );

    return;
  }

  /*
   * REGRA DE DESLIGAMENTO:
   *
   * O participante NÃO é apagado fisicamente do Firestore.
   * Apenas fica inativo e desaparece da base ativa e dos
   * novos lançamentos.
   *
   * Os lançamentos já existentes continuam intactos e,
   * portanto, permanecem nos históricos dos meses anteriores,
   * PDFs, Excel, apuração e auditoria.
   */
  const possuiLancamentos =
    estadoPix.lancamentos.some(
      lancamento =>
        lancamento.funcionarioId === id
    );

  const confirmou =
    await pixDeleteConfirm({
      titulo:
        "Desligar participante?",
      mensagem:
        possuiLancamentos
          ? `Este participante possui histórico de lançamentos. Ele será removido apenas da base ativa; todo o histórico anterior será preservado.`
          : `O participante será removido da base ativa. O cadastro continuará preservado internamente para auditoria.`,
      textoConfirmar:
        "Continuar",
      textoCancelar:
        "Cancelar"
    });

  if (!confirmou) {
    return;
  }

  const senhaValida =
    await solicitarSenhaExclusaoParticipantePix();

  if (!senhaValida) {
    return;
  }

  try {
    const competenciaDesligamento =
      $("#competenciaGlobal")?.value ||
      pixMesAtual();

    const dadosDesligamento = {
      ...funcionario,
      ativo: false,
      desligado: true,
      desligadoEm: new Date().toISOString(),
      desligadoCompetencia: competenciaDesligamento,
      motivoDesligamento: "REMOVIDO DA BASE ATIVA",
      atualizadoEm: new Date().toISOString()
    };
    delete dadosDesligamento.id;

    const { error } = await supabase
      .from("pix_funcionarios")
      .upsert({
        id,
        dados: dadosDesligamento,
        ativo: false,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });

    if (error) throw error;

    /*
     * Atualização imediata da tela.
     * O onSnapshot continuará sendo a fonte oficial do banco,
     * mas esta atualização evita qualquer sensação de atraso.
     */
    const indice =
      estadoPix.funcionarios.findIndex(
        item =>
          item.id === id
      );

    if (indice >= 0) {
      estadoPix.funcionarios[
        indice
      ] = {
        ...estadoPix.funcionarios[
          indice
        ],
        ativo:
          false,
        desligado:
          true,
        desligadoCompetencia:
          competenciaDesligamento
      };
    }

    renderFuncionariosPix();
    atualizarSelectsPix();

    await pixAlert(
      [
        "Participante removido da base ativa com sucesso.",
        "",
        possuiLancamentos
          ? "O histórico de lançamentos anteriores foi preservado."
          : "O cadastro foi mantido internamente para auditoria.",
        "",
        "Ele não aparecerá mais para novos lançamentos."
      ].join(
        "\n"
      ),
      {
        tipo:
          "success",
        titulo:
          "Participante desligado",
        rotulo:
          "Concluído"
      }
    );
  } catch (erro) {
    console.error(
      "Erro ao desligar participante:",
      erro
    );

    await pixAlert(
      "Não foi possível desligar o participante.",
      {
        tipo:
          "error",
        titulo:
          "Falha ao desligar",
        rotulo:
          "Erro"
      }
    );
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

  const competenciaLancamento =
    $("#pixLancamentoCompetencia")?.value ||
    dados.competencia ||
    pixCompetenciaAtual();

  const politica =
    pixPoliticaVigente(
      cargoPolitica,
      competenciaLancamento
    );

  if (!politica) {
    area.innerHTML = `
      <p class="pix-empty">
        Não foi encontrada uma política para o cargo
        ${protegerHtml(funcionario.cargo)}.
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
    <div id="pixSaldoAnterior" class="pix-carry-summary" hidden></div>

    ${
      usaRegraPixDiaria(competenciaLancamento)
        ? `
          <div class="pix-daily-block">
            <div class="pix-daily-head">
              <div>
                <strong>Calendário real da apuração</strong>
                <small>Selecione os dias que pertencem a esta semana/ciclo. Domingos ficam bloqueados.</small>
              </div>
              <span id="pixResumoDias"></span>
            </div>
            <div class="pix-calendar" id="pixCalendarioDias">
              ${pixDatasCompetencia(competenciaLancamento).map(item => {
                const selecionadas = Array.isArray(dados.datasAvaliadas) && dados.datasAvaliadas.length
                  ? dados.datasAvaliadas
                  : [];
                const ativo = selecionadas.includes(item.iso);
                return `<button type="button" class="pix-calendar-day ${ativo ? "is-selected" : ""} ${item.domingo ? "is-sunday" : ""}"
                  data-date="${item.iso}" ${item.domingo ? "disabled" : ""}>
                  <small>${item.semana}</small><b>${item.dia}</b>
                </button>`;
              }).join("")}
            </div>
            <div class="pix-selected-label">Dias selecionados para avaliação</div>
            <div class="pix-daily-grid" id="pixDiasSelecionados"></div>
          </div>
        `
        : `
          <label>
            Realizado semanal
            <input type="text" inputmode="decimal" id="pixRealizadoSemanal"
              placeholder="R$ 0,00"
              value="${(dados.realizadoSemanal !== null && dados.realizadoSemanal !== undefined && String(dados.realizadoSemanal).trim() !== "") || normalizarDiasPix(dados).some(dia => dia.informado) ? pixMoeda(realizadoSemanalLegadoPix(dados)) : ""}"
              required />
          </label>
        `
    }

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

    <div class="pix-base-potential">
      <span>🏆 Potencial base semanal</span>
      <strong>${pixMoeda(politica.bonusBase)}</strong>
      <small>Valor máximo da base. O pagamento real depende dos dias em que a meta diária for atingida.</small>
    </div>
    <div id="pixCofrinhoNps" class="pix-piggy pix-piggy-modal" hidden></div>

    ${
      (usaRegraPixDiaria(competenciaLancamento) || semana === 4) &&
      politica.bonusNps > 0 &&
      cargoUsaNpsPix(
        funcionario?.cargo ||
        dados.cargo
      )
        ? `
          <label>
            Meta de NPS
            <input
              type="number"
              step="0.01"
              min="0"
              id="pixMetaNps"
              value="${dados.metaNps ?? ""}"
              placeholder="Informe a meta deste mês"
              required
            />

            <small>
              ${usaRegraPixDiaria(competenciaLancamento) ? "Meta informada para a filial e competência" : politica.objetivoNps} ·
              prêmio de ${pixMoeda(usaRegraPixDiaria(competenciaLancamento) ? (politica.bonusNpsSemanal || 250) : politica.bonusNps)}.
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
              Cada semana com NPS atingido reserva R$ 250,00 no cofrinho.\n              O saldo só é pago na semana 4 se o NPS individual da própria semana 4 E o NPS geral da filial atingirem suas metas. O resultado geral é cadastrado uma única vez no bloco “NPS geral da filial”, logo abaixo, e vale para todos os colaboradores da unidade.
            </small>
          </label>
        `
        : ""
    }

    ${usaRegraPixDiaria(competenciaLancamento) && semana === 4
      ? npsUnidadePix.blocoLancamento(funcionario.filial || dados.filial, competenciaLancamento)
      : ""}

    ${
      semana === 4 &&
      cargoUsaOsPix(
        funcionario?.cargo ||
        dados.cargo
      )
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
        () => {
          atualizarPainelDiarioPix();
          atualizarPreviewPix();
        }
      );
    }
  );

  npsUnidadePix.vincularBotoes(area);
  npsUnidadePix.atualizarResumo();
  iniciarCalendarioPix();
  atualizarPainelDiarioPix();
  atualizarPreviewPix();
}

function coletarLancamentoPix() {
  const funcionario =
    pixFuncionarioPorId(
      $("#pixLancamentoFuncionario")?.value
    );

  if (
    !funcionario ||
    !participantePixValido(
      funcionario
    )
  ) {
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
    pixPoliticaVigente(
      cargoPolitica,
      $("#pixLancamentoCompetencia")?.value
    );

  const semana =
    Number(
      $("#pixLancamentoSemana").value
    );

  const campoTicket =
    $("#pixTicketMedio");

  const campoMargem =
    $("#pixMargem");

  const campoMetaNps =
    $("#pixMetaNps");

  const campoRealizadoNps =
    $("#pixRealizadoNps");

  const campoOs =
    $("#pixOsAberta");

  const usaNps =
    (usaRegraPixDiaria($("#pixLancamentoCompetencia")?.value) || semana === 4) &&
    cargoUsaNpsPix(
      funcionario.cargo
    );

  const usaOs =
    semana === 4 &&
    cargoUsaOsPix(
      funcionario.cargo
    );

  const anterior = estadoPix.lancamentos.find(item => String(item.id) === String($("#pixLancamentoId")?.value)) || {};
  return {
    id:
      $("#pixLancamentoId").value ||
      "",

    competencia:
      $("#pixLancamentoCompetencia").value,

    semana,

    funcionarioId:
      funcionario.id,

    nome:
      funcionario.nome,

    filial:
      funcionario.filial,

    dn:
      funcionario.dn,

    cargo:
      funcionario.cargo,

    metaSemanal:
      pixNumero(
        $("#pixMetaSemanal")?.value
      ),

    realizadoSemanal:
      usaRegraPixDiaria($("#pixLancamentoCompetencia")?.value)
        ? Object.values(coletarDiasPixFormulario()).reduce(
            (soma, dia) => soma + pixNumero(dia.realizado), 0
          )
        : pixNumero($("#pixRealizadoSemanal")?.value),

    datasAvaliadas:
      usaRegraPixDiaria($("#pixLancamentoCompetencia")?.value)
        ? pixDiasSelecionadosFormulario()
        : (anterior.datasAvaliadas || []),

    diasCalendario:
      usaRegraPixDiaria($("#pixLancamentoCompetencia")?.value)
        ? coletarDiasPixFormulario()
        : (anterior.diasCalendario || {}),

    ticketMedio:
      politica.metrica === "ticket"
        ? pixNumero(
            campoTicket?.value
          )
        : 0,

    ticketMedioInformado:
      politica.metrica === "ticket"
        ? Boolean(
            campoTicket?.value?.trim()
          )
        : true,

    margem:
      politica.metrica === "margem"
        ? pixNumero(
            campoMargem?.value
          )
        : 0,

    margemInformada:
      politica.metrica === "margem"
        ? Boolean(
            String(
              campoMargem?.value ?? ""
            ).trim()
          )
        : true,

    diasSemana: anterior.diasSemana || {},

    metaNps:
      usaNps
        ? pixNumero(
            campoMetaNps?.value
          )
        : (anterior.metaNps ?? 0),

    metaNpsInformada:
      usaNps
        ? Boolean(
            String(
              campoMetaNps?.value ?? ""
            ).trim()
          )
        : (anterior.metaNpsInformada ?? true),

    realizadoNps:
      usaNps
        ? pixNumero(
            campoRealizadoNps?.value
          )
        : (anterior.realizadoNps ?? 0),

    realizadoNpsInformado:
      usaNps
        ? Boolean(
            String(
              campoRealizadoNps?.value ?? ""
            ).trim()
          )
        : (anterior.realizadoNpsInformado ?? true),

    osAbertaPercentual:
      usaOs
        ? pixNumero(
            campoOs?.value
          )
        : 0,

    osAbertaInformada:
      usaOs
        ? Boolean(
            String(
              campoOs?.value ?? ""
            ).trim()
          )
        : true
  };
}

function renderDiasSelecionadosPix() {
  const area = $("#pixDiasSelecionados");
  if (!area) return;
  const selecionadas = pixDiasSelecionadosFormulario();
  const dadosAtuais = coletarDiasPixFormulario(true);
  area.innerHTML = selecionadas.map(data => {
    const rotulo = pixRotuloData(data);
    const salvo = dadosAtuais[data] || {};
    return `
      <div class="pix-day-card" data-pix-dia="${data}">
        <div class="pix-day-title"><b>${rotulo.semana} · ${rotulo.dia}</b><small>${data.slice(5).replace("-", "/")}</small></div>
        <small class="pix-meta-dia" data-meta-dia="${data}">Meta: —</small>
        <input type="text" inputmode="decimal" class="pix-realizado-dia" data-dia="${data}"
          placeholder="Realizado R$ 0,00" value="${salvo.realizado !== null && salvo.realizado !== undefined && String(salvo.realizado).trim() !== "" ? pixMoeda(salvo.realizado) : ""}">
        <span class="pix-dia-status" data-status-dia="${data}">Aguardando</span>
      </div>`;
  }).join("");

  area.querySelectorAll(".pix-realizado-dia").forEach(input => {
    input.addEventListener("input", () => {
      atualizarPainelDiarioPix();
      atualizarPreviewPix();
    });
  });
}

function coletarDiasPixFormulario(preservar = false) {
  const dias = {};
  document.querySelectorAll(".pix-realizado-dia[data-dia]").forEach(input => {
    dias[input.dataset.dia] = { realizado: input.value.trim() === "" ? null : pixNumero(input.value) };
  });
  if (preservar) {
    const id = $("#pixLancamentoId")?.value;
    const salvo = estadoPix.lancamentos.find(item => item.id === id)?.diasCalendario || {};
    return { ...salvo, ...dias };
  }
  return dias;
}

function atualizarPainelDiarioPix() {
  const competencia = $("#pixLancamentoCompetencia")?.value || "";
  if (!usaRegraPixDiaria(competencia)) return;
  atualizarContextoSemanalPix();
  const meta = pixNumero($("#pixMetaSemanal")?.value);
  const selecionadas = pixDiasSelecionadosFormulario();
  const metaDia = selecionadas.length ? meta / selecionadas.length : 0;
  const politica = (() => {
    const func = pixFuncionarioPorId($("#pixLancamentoFuncionario")?.value);
    return pixPoliticaVigente(func?.cargo, competencia);
  })();
  const valorDia = selecionadas.length ? pixNumero(politica?.bonusBase) / selecionadas.length : 0;

  const saldoInicial = pixContextoSemanasAnteriores({ competencia, funcionarioId: $("#pixLancamentoFuncionario")?.value, semana: $("#pixLancamentoSemana")?.value, id: $("#pixLancamentoId")?.value }).saldo;
  const dias = pixAvaliarSaldoDias(selecionadas.map(data => {
    const input = document.querySelector(`.pix-realizado-dia[data-dia="${data}"]`);
    return { data, realizado: pixNumero(input?.value), informado: Boolean(input?.value?.trim()) };
  }), metaDia, saldoInicial);

  dias.forEach(dia => {
    const metaEl = document.querySelector(`[data-meta-dia="${dia.data}"]`);
    const status = document.querySelector(`[data-status-dia="${dia.data}"]`);
    const deficitAnterior = Math.max(0, -dia.saldoAnterior);
    const creditoAnterior = Math.max(0, dia.saldoAnterior);
    if (metaEl) metaEl.textContent = `Meta: ${pixMoeda(dia.metaAjustada)}${deficitAnterior > 0 ? ` · déficit anterior: +${pixMoeda(deficitAnterior)}` : ""}${creditoAnterior > 0 ? ` · gordura usada: ${pixMoeda(creditoAnterior)}` : ""}`;
    if (!status) return;
    const percentual = dia.metaAjustada > 0 ? dia.realizado / dia.metaAjustada * 100 : 100;
    status.textContent = !dia.informado ? "Aguardando lançamento"
      : dia.atingiu ? `Meta atingida ✓ · +${pixMoeda(valorDia)}${dia.gorduraAposDia > 0 ? ` · gordura → ${pixMoeda(dia.gorduraAposDia)}` : ""}`
      : `Meta não atingida · ${pixPct(percentual)} · déficit → ${pixMoeda(dia.deficitAposDia)}`;
    status.classList.toggle("ok", dia.informado && dia.atingiu);
    status.classList.toggle("miss", dia.informado && !dia.atingiu);
    status.closest(".pix-day-card")?.classList.toggle("is-miss", dia.informado && !dia.atingiu);
    status.closest(".pix-day-card")?.classList.toggle("has-fat", dia.informado && dia.atingiu && dia.gorduraAposDia > 0);
  });

  const resumo = $("#pixResumoDias");
  if (resumo) resumo.textContent = selecionadas.length
    ? `${selecionadas.length} dia(s) · ${pixMoeda(metaDia)}/dia`
    : "Selecione os dias";
}

function atualizarContextoSemanalPix() {
  const calendario = $("#pixCalendarioDias");
  if (!calendario) return;
  const competencia = $("#pixLancamentoCompetencia")?.value;
  const funcionarioId = $("#pixLancamentoFuncionario")?.value;
  const semana = Number($("#pixLancamentoSemana")?.value);
  const id = $("#pixLancamentoId")?.value;
  const contexto = pixContextoSemanasAnteriores({ competencia, funcionarioId, semana, id });
  calendario.querySelectorAll(".pix-calendar-day[data-date]").forEach(botao => {
    const ocupado = contexto.datasOcupadas.has(botao.dataset.date);
    if (ocupado) botao.classList.remove("is-selected");
    botao.disabled = (semana > 1 && !pixHistoricoModalConferido) || botao.classList.contains("is-sunday") || ocupado;
    botao.classList.toggle("is-occupied", ocupado);
    if (ocupado) botao.title = "Dia já utilizado em uma semana anterior";
    else botao.removeAttribute("title");
  });
  const resumo = $("#pixSaldoAnterior");
  if (resumo) {
    resumo.hidden = semana <= 1 || !funcionarioId;
    const saldo = contexto.saldo;
    const meta = pixNumero($("#pixMetaSemanal")?.value);
    const ajuste = Math.max(0, meta - saldo);
    if (!pixHistoricoModalConferido) { resumo.textContent = "Conferindo lançamentos anteriores…"; return; }
    resumo.innerHTML = '<span>Saldo anterior</span><strong class="' + (saldo < 0 ? 'is-deficit' : saldo > 0 ? 'is-credit' : '') + '">' +
      (saldo < 0 ? 'Déficit +' : saldo > 0 ? 'Gordura +' : 'Sem saldo') + (saldo ? pixMoeda(Math.abs(saldo)) : '') +
      '</strong><small>Meta ajustada: <b>' + pixMoeda(ajuste) + '</b></small>';
  }
}

function iniciarCalendarioPix() {
  const calendario = $("#pixCalendarioDias");
  if (!calendario) return;
  calendario.querySelectorAll(".pix-calendar-day").forEach(botao => {
    botao.addEventListener("click", () => {
      if (botao.disabled || botao.classList.contains("is-occupied") || botao.classList.contains("is-sunday")) return;
      const atuais = coletarDiasPixFormulario(true);
      botao.classList.toggle("is-selected");
      renderDiasSelecionadosPix();
      Object.entries(atuais).forEach(([data, valor]) => {
        const input = document.querySelector(`.pix-realizado-dia[data-dia="${data}"]`);
        if (input && valor?.realizado) input.value = pixMoeda(valor.realizado);
      });
      atualizarPainelDiarioPix();
      atualizarPreviewPix();
    });
  });
  atualizarContextoSemanalPix();
  renderDiasSelecionadosPix();
  atualizarPainelDiarioPix();
}

function atualizarPreviewPix() {
  const preview = $("#pixResultadoPreview");
  if (!preview) return;

  try {
    const resultado =
      calcularPix(coletarLancamentoPix());

    renderCofrinhoNpsPix();

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
          ${protegerHtml(resultado.status)}
        </span>

        <small>${protegerHtml(resultado.observacao)}</small>
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
  atualizarHistoricoModalPix();
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
  atualizarHistoricoModalPix();
}

async function salvarLancamentoPix(evento) {
  evento.preventDefault();

  if (
    window.bloqueioLancamentos?.bloqueado ||
    document.body.classList.contains("lancamentos-bloqueados")
  ) {
    pixAlert("Os lançamentos estão bloqueados pelo diretor.");
    return;
  }

  const botao = evento.submitter;

  try {
    if (usaRegraPixDiaria($("#pixLancamentoCompetencia")?.value) && Number($("#pixLancamentoSemana")?.value) > 1 && !pixHistoricoModalConferido) {
      pixAlert("Aguarde a conferência das datas das semanas anteriores antes de salvar.");
      return;
    }
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

    if (usaRegraPixDiaria(item.competencia)) {
      const ocupadas = pixContextoSemanasAnteriores(item).datasOcupadas;
      const repetidas = (item.datasAvaliadas || []).filter(data => ocupadas.has(data));
      if (repetidas.length) {
        pixAlert("Os dias " + repetidas.map(data => data.slice(8,10) + "/" + data.slice(5,7)).join(", ") +
          " já pertencem a uma semana anterior deste colaborador. Selecione outras datas.");
        return;
      }
    }

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
      atualizadoEm: new Date().toISOString()
    };

    const idFinal = item.id || idPixSupabase();
    delete dados.id;
    dados.criadoEm = dados.criadoEm || new Date().toISOString();

    const { error } = await supabase
      .from("pix_lancamentos")
      .upsert({
        id: idFinal,
        competencia: textoMigracaoPix(dados.competencia),
        semana: textoMigracaoPix(dados.semana),
        filial: textoMigracaoPix(dados.filial, dados.unidade),
        colaborador: textoMigracaoPix(
          dados.colaborador,
          dados.nome,
          dados.funcionarioNome,
          dados.funcionarioId
        ),
        dados,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });

    if (error) throw error;

    await carregarLancamentosPixUmaVez();

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
    const { error } = await supabase
      .from("pix_lancamentos")
      .delete()
      .eq("id", id);

    if (error) throw error;

    await carregarLancamentosPixUmaVez();
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
        agendarConsultaLancamentosPix();
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
          agendarConsultaLancamentosPix();
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
      () => {
        renderCamposLancamentoPix();
        atualizarHistoricoModalPix();
      }
    );

  $("#pixLancamentoSemana")
    ?.addEventListener(
      "change",
      () => {
        renderCamposLancamentoPix();
        atualizarHistoricoModalPix();
      }
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
        () => {
          renderLancamentosPix();
          agendarConsultaLancamentosPix();
        }
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
        () => {
          renderApuracaoPix();
          agendarConsultaLancamentosPix();
        }
      )
  );
}

async function carregarParticipantesPixUmaVez() {
  const { data, error } = await supabase
    .from("pix_funcionarios")
    .select("id,dados,ativo");

  if (error) throw error;

  estadoPix.funcionarios =
    (data || [])
      .map(linha => ({
        ...(linha.dados || {}),
        id: linha.id,
        ativo: linha.ativo !== false
      }))
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

  console.info(
    `[PIX/SUPABASE] ${estadoPix.funcionarios.length} participante(s) carregado(s).`
  );

  renderTudoPix();
  renderFuncionariosPix();

  return estadoPix.funcionarios;
}

async function carregarLancamentosPixUmaVez() {
  const competencia = String(
    $("#competenciaGlobal")?.value ||
    $("#pixDashboardCompetencia")?.value ||
    pixMesAtual()
  ).trim();
  const subviewAtiva = document.querySelector(".pix-subview.active")?.id || "pix-dashboard";
  const seletorFilial = {
    "pix-lancamentos": "#pixFiltroFilialLancamento",
    "pix-apuracao": "#pixFiltroFilialApuracao"
  }[subviewAtiva];
  const filial = seletorFilial
    ? String($(seletorFilial)?.value || "").trim()
    : "";

  let consulta = supabase
    .from("pix_lancamentos")
    .select("id,dados");

  if (competencia) consulta = consulta.eq("competencia", competencia);
  if (filial) consulta = consulta.eq("filial", filial);

  const { data, error } = await consulta;

  if (error) throw error;

  estadoPix.lancamentos = (data || []).map(
    linha => ({
      ...(linha.dados || {}),
      id: linha.id
    })
  );

  console.info(
    `[PIX/SUPABASE] ${estadoPix.lancamentos.length} lançamento(s) carregado(s).`
  );

  renderTudoPix();

  return estadoPix.lancamentos;
}

function agendarConsultaLancamentosPix() {
  window.clearTimeout(agendarConsultaLancamentosPix.timer);
  agendarConsultaLancamentosPix.timer = window.setTimeout(
    () => Promise.all([carregarLancamentosPixUmaVez(), npsUnidadePix.carregar()]).catch(erro =>
      console.error("[PIX/SUPABASE] Falha ao aplicar filtros:", erro)
    ),
    120
  );
}

async function iniciarFirebasePix() {
  /*
  Primeiro executa uma leitura simples com getDocs.
  Assim os participantes aparecem mesmo quando o canal em tempo
  real onSnapshot estiver bloqueado pela rede ou pelo navegador.
  */
  try {
    await Promise.all([
      carregarParticipantesPixUmaVez(),
      carregarLancamentosPixUmaVez(),
      npsUnidadePix.iniciar()
    ]);
  } catch (erro) {
    console.error(
      "Erro na leitura inicial do Pix:",
      erro
    );

    pixAlert(
      `Não foi possível carregar os dados iniciais do Pix.

${erro.message || erro}`
    );
  }

  supabase
    .channel("pix-funcionarios-realtime")
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "pix_funcionarios"
    }, evento => {
      const linha = evento.new || evento.old || {};
      const id = String(linha.id || "");
      if (!id) return;
      if (evento.eventType === "DELETE") {
        estadoPix.funcionarios = estadoPix.funcionarios.filter(item => String(item.id) !== id);
      } else {
        const atualizado = { ...(linha.dados || {}), id, ativo: linha.ativo !== false };
        const indice = estadoPix.funcionarios.findIndex(item => String(item.id) === id);
        if (indice >= 0) estadoPix.funcionarios.splice(indice, 1, atualizado);
        else estadoPix.funcionarios.push(atualizado);
        estadoPix.funcionarios.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
      }
      renderFuncionariosPix();
      renderTudoPix();
    })
    .subscribe();

  supabase
    .channel("pix-lancamentos-realtime")
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "pix_lancamentos"
    }, evento => {
      const linha = evento.new || evento.old || {};
      const id = String(linha.id || "");
      if (!id) return;
      if (evento.eventType === "DELETE") {
        estadoPix.lancamentos = estadoPix.lancamentos.filter(item => String(item.id) !== id);
      } else {
        const atualizado = { ...(linha.dados || {}), id };
        const indice = estadoPix.lancamentos.findIndex(item => String(item.id) === id);
        if (indice >= 0) estadoPix.lancamentos.splice(indice, 1, atualizado);
        else estadoPix.lancamentos.push(atualizado);
      }
      renderTudoPix();
    })
    .subscribe();

  console.info(
    "[PIX/SUPABASE] Etapa 04 ativa — leitura e gravação oficiais no Supabase."
  );
}

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    atualizarSelectsPix();
    configurarEventosPix();
    abrirViewPix("dashboard");
    renderTudoPix();

    await iniciarFirebasePix();

    window.addEventListener("campanhas:viewready", evento => {
      if (evento.detail?.modulo === "pix") {
        agendarConsultaLancamentosPix();
      }
    });

    /* A recópia automática do Firebase foi desligada. */
  }
);

window.recarregarBaseParticipantesPix =
  carregarParticipantesPixUmaVez;
window.atualizarDashboardGestorPix?.();

window.sincronizarCompetenciaPix =
  sincronizarCompetenciaPix;

// Fonte completa de resultados calculados, independente dos filtros das tabelas.
window.obterResultadosPix = () => estadoPix.lancamentos.map(calcularPix);

// Apenas dados já carregados; cópias evitam alterações de cadastro pelo assistente.
window.obterContextoAssistentePix = (incluirResultados = true) => ({
 filiais: FILIAIS_PIX.map(filial => filial.unidade),
 participantes: participantesPix().map(({id,nome,filial,cargo}) => ({id,nome,filial,cargo})),
 resultados: incluirResultados ? window.obterResultadosPix() : []
});
