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
 * - Consultor Técnico NÃO usa O.S. em aberto.
 * - O.S. em aberto só é exigida na S4 para cargos que realmente usam esse indicador.
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
  const c =
    normalizarTextoPix(
      cargo
    );

  /*
   * REGRA OFICIAL DE O.S.:
   * Consultor Técnico NÃO usa O.S.
   * Peças e Orçamentista também não usam O.S.
   *
   * A informação de O.S. em aberto fica restrita aos
   * cargos de gestão/assistência em que ela interfere
   * na penalidade do fechamento da S4.
   */
  return (
    c === normalizarTextoPix(
      "Supervisor de Assistência"
    ) ||
    c === normalizarTextoPix(
      "Supervisor Pós-vendas"
    ) ||
    c === normalizarTextoPix(
      "Coordenador"
    ) ||
    c === normalizarTextoPix(
      "Gerente"
    )
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

  const realizado =
    pixNumero(
      lancamento.realizadoSemanal
    );

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

  const bonusBase =
    atingiuMeta &&
    dadosCriticosCompletos
      ? politica.bonusBase
      : 0;

  const bonusFaixa =
    atingiuMeta &&
    dadosCriticosCompletos
      ? pixBonusFaixa(
          politica,
          indicador
        )
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

  const bonusNps =
    Number(
      lancamento.semana
    ) === 4 &&
    atingiuNps &&
    dadosCriticosCompletos
      ? politica.bonusNps
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
    dadosCriticosCompletos
      ? Math.max(
          0,
          subtotal - penalidade
        )
      : 0;

  let observacao = "";

  if (!dadosCriticosCompletos) {
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
                ${resultado.motivoNaoHabilitado || "SEM META"}
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
      campo.value = competencia;
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
                    title="${resultado.observacao}"
                  >
                    ${resultado.status}
                  </span>

                  ${
                    resultado.status !== "HABILITADO"
                      ? `
                        <small
                          class="pix-motivo-nao-habilitado"
                          title="${resultado.observacao}"
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
                          Motivo: ${resultado.observacao}
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
      semana === 4 &&
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
    pixPolitica(
      cargoPolitica
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
    semana === 4 &&
    cargoUsaNpsPix(
      funcionario.cargo
    );

  const usaOs =
    semana === 4 &&
    cargoUsaOsPix(
      funcionario.cargo
    );

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
      pixNumero(
        $("#pixRealizadoSemanal")?.value
      ),

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

    metaNps:
      usaNps
        ? pixNumero(
            campoMetaNps?.value
          )
        : 0,

    metaNpsInformada:
      usaNps
        ? Boolean(
            String(
              campoMetaNps?.value ?? ""
            ).trim()
          )
        : true,

    realizadoNps:
      usaNps
        ? pixNumero(
            campoRealizadoNps?.value
          )
        : 0,

    realizadoNpsInformado:
      usaNps
        ? Boolean(
            String(
              campoRealizadoNps?.value ?? ""
            ).trim()
          )
        : true,

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
  const { data, error } = await supabase
    .from("pix_lancamentos")
    .select("id,dados");

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

async function iniciarFirebasePix() {
  /*
  Primeiro executa uma leitura simples com getDocs.
  Assim os participantes aparecem mesmo quando o canal em tempo
  real onSnapshot estiver bloqueado pela rede ou pelo navegador.
  */
  try {
    await Promise.all([
      carregarParticipantesPixUmaVez(),
      carregarLancamentosPixUmaVez()
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

  let timerFuncionarios = null;
  let timerLancamentos = null;

  supabase
    .channel("pix-funcionarios-realtime")
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "pix_funcionarios"
    }, () => {
      window.clearTimeout(timerFuncionarios);
      timerFuncionarios = window.setTimeout(
        carregarParticipantesPixUmaVez,
        350
      );
    })
    .subscribe();

  supabase
    .channel("pix-lancamentos-realtime")
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "pix_lancamentos"
    }, () => {
      window.clearTimeout(timerLancamentos);
      timerLancamentos = window.setTimeout(
        carregarLancamentosPixUmaVez,
        350
      );
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

    /* A recópia automática do Firebase foi desligada. */
  }
);

window.recarregarBaseParticipantesPix =
  carregarParticipantesPixUmaVez;
window.atualizarDashboardGestorPix?.();

window.sincronizarCompetenciaPix =
  sincronizarCompetenciaPix;
