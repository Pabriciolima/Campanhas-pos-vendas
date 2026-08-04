import { firestore } from "./firebase-config.js";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDocs,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

/* =========================================================
   CENTRAL DE ALERTAS PREMIUM
   Inserida sem alterar as regras existentes do sistema.
========================================================= */

if (!window.CampanhaUI) {
  window.CampanhaUI = (() => {
    const fila = [];
    let aberto = false;

    const icones = {
      success: "✓",
      error: "!",
      warning: "!",
      info: "i",
      question: "?",
      delete: "⌫"
    };

    function garantirEstrutura() {
      if (document.querySelector("#campanhaUiOverlay")) {
        return;
      }

      const estilo = document.createElement("style");
      estilo.id = "campanhaUiStyle";
      estilo.textContent = `
        body.campanha-ui-open { overflow: hidden; }

        .campanha-ui-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          padding: 20px;
          background: rgba(4, 18, 31, .68);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: grid;
          place-items: center;
          opacity: 0;
          visibility: hidden;
          transition: opacity .22s ease, visibility .22s ease;
        }

        .campanha-ui-overlay.show {
          opacity: 1;
          visibility: visible;
        }

        .campanha-ui-card {
          position: relative;
          width: min(450px, 100%);
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.76);
          border-radius: 24px;
          padding: 30px;
          background: linear-gradient(145deg, #fff, #f7fafc);
          box-shadow: 0 32px 95px rgba(3, 18, 31, .38);
          transform: translateY(18px) scale(.965);
          opacity: 0;
          transition: transform .26s cubic-bezier(.2,.85,.3,1.14), opacity .2s ease;
        }

        .campanha-ui-card.show {
          transform: translateY(0) scale(1);
          opacity: 1;
        }

        .campanha-ui-accent {
          position: absolute;
          inset: 0 0 auto;
          height: 5px;
          background: linear-gradient(90deg, #0b7a53, #24b47e);
        }

        .campanha-ui-card.error .campanha-ui-accent,
        .campanha-ui-card.delete .campanha-ui-accent {
          background: linear-gradient(90deg, #a72019, #e1493f);
        }

        .campanha-ui-card.warning .campanha-ui-accent {
          background: linear-gradient(90deg, #c47b00, #ffc83d);
        }

        .campanha-ui-card.info .campanha-ui-accent {
          background: linear-gradient(90deg, #155c92, #49a1df);
        }

        .campanha-ui-card.question .campanha-ui-accent {
          background: linear-gradient(90deg, #6941c6, #9675e8);
        }

        .campanha-ui-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 35px;
          height: 35px;
          border: 0;
          border-radius: 50%;
          background: #edf2f5;
          color: #5f707c;
          display: grid;
          place-items: center;
          font-size: 22px;
          cursor: pointer;
        }

        .campanha-ui-icon {
          width: 60px;
          height: 60px;
          border-radius: 19px;
          margin-bottom: 20px;
          background: linear-gradient(145deg, #e6f7ef, #c8eddb);
          color: #087344;
          display: grid;
          place-items: center;
          font-size: 27px;
          font-weight: 900;
          box-shadow: 0 11px 26px rgba(8,115,68,.15);
        }

        .campanha-ui-card.error .campanha-ui-icon,
        .campanha-ui-card.delete .campanha-ui-icon {
          background: linear-gradient(145deg, #fff0ef, #ffd8d4);
          color: #b42318;
        }

        .campanha-ui-card.warning .campanha-ui-icon {
          background: linear-gradient(145deg, #fff8e6, #ffe9a9);
          color: #9b6500;
        }

        .campanha-ui-card.info .campanha-ui-icon {
          background: linear-gradient(145deg, #edf7ff, #d2ebfc);
          color: #155c92;
        }

        .campanha-ui-card.question .campanha-ui-icon {
          background: linear-gradient(145deg, #f3efff, #e3d8ff);
          color: #6941c6;
        }

        .campanha-ui-label {
          color: #087344;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .campanha-ui-card.error .campanha-ui-label,
        .campanha-ui-card.delete .campanha-ui-label { color: #b42318; }
        .campanha-ui-card.warning .campanha-ui-label { color: #9b6500; }
        .campanha-ui-card.info .campanha-ui-label { color: #155c92; }
        .campanha-ui-card.question .campanha-ui-label { color: #6941c6; }

        .campanha-ui-title {
          margin: 6px 0 10px;
          color: #102030;
          font-size: 24px;
          line-height: 1.14;
          letter-spacing: -.025em;
        }

        .campanha-ui-message {
          margin: 0;
          color: #526572;
          font-size: 14px;
          line-height: 1.65;
          white-space: pre-line;
        }

        .campanha-ui-actions {
          margin-top: 26px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .campanha-ui-btn {
          min-width: 116px;
          border: 0;
          border-radius: 12px;
          padding: 11px 18px;
          font: inherit;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease;
        }

        .campanha-ui-btn:hover { transform: translateY(-1px); }

        .campanha-ui-btn.primary {
          background: linear-gradient(135deg, #0b7a53, #09915f);
          color: #fff;
          box-shadow: 0 10px 23px rgba(11,122,83,.23);
        }

        .campanha-ui-btn.danger {
          background: linear-gradient(135deg, #a72019, #d63d34);
          color: #fff;
          box-shadow: 0 10px 23px rgba(180,35,24,.23);
        }

        .campanha-ui-btn.secondary {
          border: 1px solid #d7e1e7;
          background: #fff;
          color: #425563;
        }

        @media (max-width: 560px) {
          .campanha-ui-overlay { padding: 14px; }
          .campanha-ui-card { border-radius: 20px; padding: 25px 21px 21px; }
          .campanha-ui-title { font-size: 21px; }
          .campanha-ui-actions { flex-direction: column-reverse; }
          .campanha-ui-btn { width: 100%; }
        }
      `;
      document.head.appendChild(estilo);

      document.body.insertAdjacentHTML("beforeend", `
        <div id="campanhaUiOverlay" class="campanha-ui-overlay" aria-hidden="true">
          <section id="campanhaUiCard" class="campanha-ui-card" role="alertdialog" aria-modal="true">
            <div class="campanha-ui-accent"></div>
            <button type="button" id="campanhaUiClose" class="campanha-ui-close" aria-label="Fechar">×</button>
            <div id="campanhaUiIcon" class="campanha-ui-icon"></div>
            <span id="campanhaUiLabel" class="campanha-ui-label"></span>
            <h2 id="campanhaUiTitle" class="campanha-ui-title"></h2>
            <p id="campanhaUiMessage" class="campanha-ui-message"></p>
            <div id="campanhaUiActions" class="campanha-ui-actions"></div>
          </section>
        </div>
      `);
    }

    function inferirTipo(mensagem) {
      const texto = String(mensagem ?? "").toLowerCase();
      if (texto.includes("sucesso") || texto.includes("salvo") || texto.includes("cadastrado") || texto.includes("atualizado") || texto.includes("excluído") || texto.includes("excluido")) return "success";
      if (texto.includes("erro") || texto.includes("falha") || texto.includes("não foi possível") || texto.includes("nao foi possivel")) return "error";
      if (texto.includes("selecione") || texto.includes("atenção") || texto.includes("atencao") || texto.includes("nenhum") || texto.includes("possui lançamentos")) return "warning";
      return "info";
    }

    function normalizar(opcoes = {}) {
      if (typeof opcoes === "string") opcoes = { mensagem: opcoes };
      const mensagem = opcoes.mensagem ?? opcoes.message ?? "";
      const tipo = opcoes.tipo ?? opcoes.type ?? inferirTipo(mensagem);
      const titulos = {
        success: "Tudo certo!",
        error: "Não foi possível concluir",
        warning: "Atenção",
        info: "Informação",
        question: "Confirmar ação",
        delete: "Excluir item?"
      };
      const rotulos = {
        success: "Concluído",
        error: "Erro",
        warning: "Aviso",
        info: "Sistema",
        question: "Confirmação",
        delete: "Ação irreversível"
      };
      return {
        tipo,
        titulo: opcoes.titulo ?? opcoes.title ?? titulos[tipo] ?? titulos.info,
        rotulo: opcoes.rotulo ?? opcoes.label ?? rotulos[tipo] ?? rotulos.info,
        mensagem,
        confirmar: opcoes.textoConfirmar ?? opcoes.confirmText ?? "Entendi",
        cancelar: opcoes.textoCancelar ?? opcoes.cancelText ?? "Cancelar",
        mostrarCancelar: Boolean(opcoes.mostrarCancelar ?? opcoes.showCancel),
        perigoso: Boolean(opcoes.perigoso ?? opcoes.dangerous ?? tipo === "delete")
      };
    }

    function fechar(resultado) {
      const overlay = document.querySelector("#campanhaUiOverlay");
      const card = document.querySelector("#campanhaUiCard");
      overlay?.classList.remove("show");
      card?.classList.remove("show");
      document.body.classList.remove("campanha-ui-open");
      setTimeout(() => {
        overlay?.setAttribute("aria-hidden", "true");
        const atual = fila.shift();
        atual?.resolve(resultado);
        aberto = false;
        processar();
      }, 220);
    }

    function processar() {
      if (aberto || !fila.length) return;
      aberto = true;
      garantirEstrutura();
      const atual = fila[0];
      const opcoes = normalizar(atual.opcoes);
      const overlay = document.querySelector("#campanhaUiOverlay");
      const card = document.querySelector("#campanhaUiCard");
      const actions = document.querySelector("#campanhaUiActions");

      card.className = `campanha-ui-card ${opcoes.tipo}`;
      document.querySelector("#campanhaUiIcon").textContent = icones[opcoes.tipo] ?? icones.info;
      document.querySelector("#campanhaUiLabel").textContent = opcoes.rotulo;
      document.querySelector("#campanhaUiTitle").textContent = opcoes.titulo;
      document.querySelector("#campanhaUiMessage").textContent = opcoes.mensagem;
      actions.innerHTML = "";

      if (opcoes.mostrarCancelar) {
        const cancelar = document.createElement("button");
        cancelar.type = "button";
        cancelar.className = "campanha-ui-btn secondary";
        cancelar.textContent = opcoes.cancelar;
        cancelar.addEventListener("click", () => fechar(false), { once: true });
        actions.appendChild(cancelar);
      }

      const confirmar = document.createElement("button");
      confirmar.type = "button";
      confirmar.className = opcoes.perigoso ? "campanha-ui-btn danger" : "campanha-ui-btn primary";
      confirmar.textContent = opcoes.confirmar;
      confirmar.addEventListener("click", () => fechar(true), { once: true });
      actions.appendChild(confirmar);

      document.querySelector("#campanhaUiClose").onclick = () => fechar(false);
      overlay.onclick = evento => {
        if (evento.target === overlay) fechar(false);
      };

      document.body.classList.add("campanha-ui-open");
      overlay.setAttribute("aria-hidden", "false");
      requestAnimationFrame(() => {
        overlay.classList.add("show");
        card.classList.add("show");
        (opcoes.mostrarCancelar ? actions.querySelector(".secondary") : confirmar)?.focus();
      });
    }

    function mostrar(opcoes) {
      return new Promise(resolve => {
        fila.push({ opcoes, resolve });
        processar();
      });
    }

    document.addEventListener("keydown", evento => {
      const overlay = document.querySelector("#campanhaUiOverlay");
      if (!overlay?.classList.contains("show")) return;
      if (evento.key === "Escape") {
        evento.preventDefault();
        fechar(false);
      }
      if (evento.key === "Enter") {
        evento.preventDefault();
        document.querySelector("#campanhaUiActions .danger, #campanhaUiActions .primary")?.click();
      }
    });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", garantirEstrutura, { once: true });
    } else {
      garantirEstrutura();
    }

    return {
      alert(mensagem, opcoes = {}) {
        return mostrar({ ...opcoes, mensagem });
      },
      confirm(opcoes = {}) {
        return mostrar({
          tipo: opcoes.tipo ?? "question",
          titulo: opcoes.titulo ?? "Confirmar ação",
          mensagem: opcoes.mensagem ?? "Deseja continuar?",
          textoConfirmar: opcoes.textoConfirmar ?? "Confirmar",
          textoCancelar: opcoes.textoCancelar ?? "Cancelar",
          mostrarCancelar: true
        });
      },
      deleteConfirm(opcoes = {}) {
        return mostrar({
          tipo: "delete",
          titulo: opcoes.titulo ?? "Excluir item?",
          mensagem: opcoes.mensagem ?? "Esta ação não poderá ser desfeita.",
          textoConfirmar: opcoes.textoConfirmar ?? "Excluir",
          textoCancelar: opcoes.textoCancelar ?? "Cancelar",
          mostrarCancelar: true,
          perigoso: true
        });
      }
    };
  })();
}


const FILIAIS = [
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

const CARGOS = [
  "Mecânico Produtivo",
  "Chefe de Oficina",
  "Mecânico Líder",
  "Controlador de Produtividade"
];

const CARGOS_AUTOMATICOS = [
  "Chefe de Oficina",
  "Mecânico Líder",
  "Controlador de Produtividade"
];

const DB_KEY = "campanha_oficina_mvp_v1";

const HISTORICO_INICIO = "2026-06";

let db = carregarDB();
let apuracaoAtual = [];
let funcionariosCarregados = false;

/* =========================================================
   ORDENAÇÃO DO HISTÓRICO MENSAL
========================================================= */

const ordenacaoHistorico = {
  campo: "status",
  direcao: "asc"
};

const COLUNAS_HISTORICO = [
  { campo: "nome", rotulo: "Colaborador", tipo: "texto" },
  { campo: "filial", rotulo: "Filial", tipo: "texto" },
  { campo: "cargo", rotulo: "Cargo", tipo: "texto" },
  { campo: "faturamento", rotulo: "Faturamento", tipo: "numero" },
  { campo: "produtividade", rotulo: "Produtividade", tipo: "numero" },
  { campo: "eficiencia", rotulo: "Eficiência", tipo: "numero" },
  { campo: "bonusFinal", rotulo: "Bônus", tipo: "numero" },
  { campo: "status", rotulo: "Status", tipo: "texto" },
  { campo: "avaliacao", rotulo: "Avaliação", tipo: "texto" }
];

const funcionariosRef = collection(
  firestore,
  "funcionarios"
);

const lancamentosRef = collection(
  firestore,
  "produtivos_lancamentos"
);

const MIGRACAO_LANCAMENTOS_KEY =
  "produtivos_lancamentos_migrados_fire_v1";

let lancamentosFirebaseCarregados =
  false;

let migracaoLancamentosEmAndamento =
  false;

const SENHA_EXCLUSAO_LANCAMENTO =
  "123321";

/*
 * O onSnapshot já mantém os lançamentos em tempo real.
 * A antiga consulta completa a cada 15 segundos multiplicava
 * as leituras por usuário e levou o projeto Spark ao limite diário.
 */
const INTERVALO_ATUALIZACAO_FIREBASE =
  300000;

let intervaloAtualizacaoLancamentos =
  null;

let carregamentoManualLancamentosEmAndamento =
  false;

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

function salvarBackupLocal() {
  /*
   * O Firebase é a fonte oficial.
   * O localStorage permanece apenas como cópia de segurança
   * e como origem para a migração dos lançamentos antigos.
   */
  localStorage.setItem(
    DB_KEY,
    JSON.stringify({
      lancamentos: db.lancamentos
    })
  );
}

function salvarDB() {
  salvarBackupLocal();
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

function mesAnterior() {
  const agora =
    new Date();

  const data =
    new Date(
      agora.getFullYear(),
      agora.getMonth() - 1,
      1
    );

  return [
    data.getFullYear(),
    String(
      data.getMonth() + 1
    ).padStart(2, "0")
  ].join("-");
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

window.funcionarioPorId =
  funcionarioPorId;

function cargoAutomatico(cargo) {
  return CARGOS_AUTOMATICOS.includes(
    String(cargo || "").trim()
  );
}


function solicitarSenhaExclusao() {
  return new Promise(resolve => {
    const existente =
      document.querySelector(
        "#modalSenhaExclusaoProdutivos"
      );

    existente?.remove();

    const overlay =
      document.createElement("div");

    overlay.id =
      "modalSenhaExclusaoProdutivos";

    overlay.innerHTML = `
      <div class="senha-exclusao-backdrop">
        <div
          class="senha-exclusao-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="senhaExclusaoTitulo"
        >
          <button
            type="button"
            class="senha-exclusao-fechar"
            aria-label="Fechar"
          >
            ×
          </button>

          <div class="senha-exclusao-icone">
            🔐
          </div>

          <small>
            SEGURANÇA
          </small>

          <h2 id="senhaExclusaoTitulo">
            Autorizar exclusão
          </h2>

          <p>
            Informe a senha administrativa para excluir este lançamento.
          </p>

          <label>
            Senha
            <input
              type="password"
              id="senhaExclusaoProdutivos"
              inputmode="numeric"
              autocomplete="off"
              placeholder="Digite a senha"
              maxlength="20"
            >
          </label>

          <div
            id="senhaExclusaoErro"
            class="senha-exclusao-erro"
            hidden
          >
            Senha incorreta.
          </div>

          <div class="senha-exclusao-acoes">
            <button
              type="button"
              class="senha-exclusao-cancelar"
            >
              Cancelar
            </button>

            <button
              type="button"
              class="senha-exclusao-confirmar"
            >
              Autorizar
            </button>
          </div>
        </div>
      </div>
    `;

    if (
      !document.querySelector(
        "#senhaExclusaoProdutivosCss"
      )
    ) {
      const style =
        document.createElement("style");

      style.id =
        "senhaExclusaoProdutivosCss";

      style.textContent = `
        .senha-exclusao-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000000;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(4, 20, 35, .74);
          backdrop-filter: blur(8px);
        }

        .senha-exclusao-card {
          position: relative;
          width: min(420px, 100%);
          padding: 28px;
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 30px 80px rgba(0, 0, 0, .35);
          border-top: 4px solid #c62828;
        }

        .senha-exclusao-card small {
          display: block;
          margin-top: 14px;
          color: #a71919;
          font-weight: 800;
          letter-spacing: .12em;
        }

        .senha-exclusao-card h2 {
          margin: 8px 0;
          color: #102234;
        }

        .senha-exclusao-card p {
          margin: 0 0 18px;
          color: #607080;
          line-height: 1.45;
        }

        .senha-exclusao-card label {
          display: grid;
          gap: 7px;
          color: #34495e;
          font-weight: 700;
        }

        .senha-exclusao-card input {
          width: 100%;
          box-sizing: border-box;
          padding: 13px 14px;
          border: 1px solid #cbd7e3;
          border-radius: 12px;
          outline: none;
          font-size: 16px;
        }

        .senha-exclusao-card input:focus {
          border-color: #c62828;
          box-shadow: 0 0 0 3px rgba(198, 40, 40, .12);
        }

        .senha-exclusao-icone {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: #ffe6e6;
          font-size: 25px;
        }

        .senha-exclusao-fechar {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 50%;
          background: #eef3f6;
          font-size: 22px;
          cursor: pointer;
        }

        .senha-exclusao-erro {
          margin-top: 10px;
          color: #c62828;
          font-weight: 700;
        }

        .senha-exclusao-acoes {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 22px;
        }

        .senha-exclusao-acoes button {
          min-height: 42px;
          padding: 0 18px;
          border-radius: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .senha-exclusao-cancelar {
          border: 1px solid #cbd7e3;
          background: #fff;
          color: #33485b;
        }

        .senha-exclusao-confirmar {
          border: 0;
          background: #c62828;
          color: #fff;
        }
      `;

      document.head.appendChild(
        style
      );
    }

    document.body.appendChild(
      overlay
    );

    const input =
      overlay.querySelector(
        "#senhaExclusaoProdutivos"
      );

    const erro =
      overlay.querySelector(
        "#senhaExclusaoErro"
      );

    const concluir =
      resultado => {
        overlay.remove();
        resolve(resultado);
      };

    const validar = () => {
      if (
        input.value ===
        SENHA_EXCLUSAO_LANCAMENTO
      ) {
        concluir(true);
        return;
      }

      erro.hidden = false;
      input.value = "";
      input.focus();
    };

    overlay
      .querySelector(
        ".senha-exclusao-confirmar"
      )
      .addEventListener(
        "click",
        validar
      );

    overlay
      .querySelector(
        ".senha-exclusao-cancelar"
      )
      .addEventListener(
        "click",
        () => concluir(false)
      );

    overlay
      .querySelector(
        ".senha-exclusao-fechar"
      )
      .addEventListener(
        "click",
        () => concluir(false)
      );

    input.addEventListener(
      "keydown",
      evento => {
        if (evento.key === "Enter") {
          evento.preventDefault();
          validar();
        }

        if (evento.key === "Escape") {
          concluir(false);
        }
      }
    );

    window.setTimeout(
      () => input.focus(),
      50
    );
  });
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

      window.CampanhaUI.alert(
        "Não foi possível carregar os funcionários do Firebase. Verifique a conexão e as regras do Firestore."
      );
    }
  );
}


function normalizarLancamentoFirebase(
  documento
) {
  const dados =
    documento.data();

  return {
    ...dados,
    id:
      documento.id
  };
}

async function migrarLancamentosLocaisParaFirebase() {
  if (
    migracaoLancamentosEmAndamento ||
    localStorage.getItem(
      MIGRACAO_LANCAMENTOS_KEY
    ) === "true"
  ) {
    return;
  }

  const salvo =
    localStorage.getItem(
      DB_KEY
    );

  if (!salvo) {
    localStorage.setItem(
      MIGRACAO_LANCAMENTOS_KEY,
      "true"
    );

    return;
  }

  let lancamentosLocais = [];

  try {
    const dados =
      JSON.parse(salvo);

    lancamentosLocais =
      Array.isArray(
        dados.lancamentos
      )
        ? dados.lancamentos
        : [];
  } catch (erro) {
    console.error(
      "Erro ao ler lançamentos locais para migração:",
      erro
    );

    return;
  }

  if (!lancamentosLocais.length) {
    localStorage.setItem(
      MIGRACAO_LANCAMENTOS_KEY,
      "true"
    );

    return;
  }

  migracaoLancamentosEmAndamento =
    true;

  try {
    const snapshot =
      await getDocs(
        lancamentosRef
      );

    const idsFirebase =
      new Set(
        snapshot.docs.map(
          documento =>
            documento.id
        )
      );

    let migrados = 0;

    for (
      const lancamento
      of lancamentosLocais
    ) {
      const id =
        String(
          lancamento.id ||
          uid()
        );

      if (
        idsFirebase.has(id)
      ) {
        continue;
      }

      await setDoc(
        doc(
          firestore,
          "produtivos_lancamentos",
          id
        ),
        {
          ...lancamento,
          idLocal:
            lancamento.id ||
            id,
          migradoDoLocalStorage:
            true,
          migradoEm:
            serverTimestamp(),
          criadoEm:
            serverTimestamp(),
          atualizadoEm:
            serverTimestamp()
        },
        {
          merge: true
        }
      );

      migrados += 1;
    }

    localStorage.setItem(
      MIGRACAO_LANCAMENTOS_KEY,
      "true"
    );

    if (migrados > 0) {
      console.info(
        `${migrados} lançamento(s) local(is) migrado(s) para o Firebase.`
      );

      toast(
        `${migrados} lançamento(s) antigo(s) sincronizado(s)`
      );
    }
  } catch (erro) {
    console.error(
      "Erro ao migrar lançamentos locais para o Firebase:",
      erro
    );

    window.CampanhaUI?.alert?.(
      "Não foi possível migrar os lançamentos que estavam neste navegador. Eles não foram apagados e uma nova tentativa será feita depois."
    );
  } finally {
    migracaoLancamentosEmAndamento =
      false;
  }
}

function ordenarLancamentosFirebase(
  lancamentos
) {
  return lancamentos.sort(
    (a, b) => {
      const competencia =
        String(
          b.competencia ||
          ""
        ).localeCompare(
          String(
            a.competencia ||
            ""
          )
        );

      if (competencia !== 0) {
        return competencia;
      }

      return String(
        a.nome ||
        a.funcionarioId ||
        ""
      ).localeCompare(
        String(
          b.nome ||
          b.funcionarioId ||
          ""
        ),
        "pt-BR"
      );
    }
  );
}

function aplicarSnapshotLancamentos(
  snapshot,
  origem = "tempo real"
) {
  db.lancamentos =
    ordenarLancamentosFirebase(
      snapshot.docs.map(
        normalizarLancamentoFirebase
      )
    );

  lancamentosFirebaseCarregados =
    true;

  salvarBackupLocal();
  renderTudo();

  console.info(
    `${db.lancamentos.length} lançamento(s) dos Produtivos atualizado(s) pelo Firebase — ${origem}.`
  );
}

async function atualizarLancamentosFirebaseAgora(
  origem = "verificação automática"
) {
  if (
    carregamentoManualLancamentosEmAndamento ||
    !navigator.onLine
  ) {
    return;
  }

  carregamentoManualLancamentosEmAndamento =
    true;

  try {
    const snapshot =
      await getDocs(
        lancamentosRef
      );

    aplicarSnapshotLancamentos(
      snapshot,
      origem
    );
  } catch (erro) {
    console.warn(
      "Atualização complementar dos lançamentos indisponível:",
      erro
    );
  } finally {
    carregamentoManualLancamentosEmAndamento =
      false;
  }
}

function iniciarLancamentosTempoReal() {
  let listenerComFalha =
    false;

  onSnapshot(
    lancamentosRef,

    snapshot => {
      listenerComFalha =
        false;

      aplicarSnapshotLancamentos(
        snapshot,
        "tempo real"
      );
    },

    erro => {
      listenerComFalha =
        true;

      console.error(
        "Erro no listener em tempo real dos lançamentos:",
        erro
      );

      /*
       * Só usa getDocs como contingência quando o listener realmente
       * falha. Não consulta a coleção inteira a cada 15 segundos.
       */
      window.setTimeout(
        () =>
          atualizarLancamentosFirebaseAgora(
            "recuperação após falha do listener"
          ),
        30000
      );
    }
  );

  window.clearInterval(
    intervaloAtualizacaoLancamentos
  );

  intervaloAtualizacaoLancamentos =
    window.setInterval(
      () => {
        if (
          listenerComFalha &&
          document.visibilityState ===
            "visible"
        ) {
          atualizarLancamentosFirebaseAgora(
            "contingência periódica"
          );
        }
      },
      INTERVALO_ATUALIZACAO_FIREBASE
    );

  window.addEventListener(
    "online",
    () => {
      if (listenerComFalha) {
        atualizarLancamentosFirebaseAgora(
          "conexão restabelecida"
        );
      }
    }
  );

  window.addEventListener(
    "produtivos:solicitar-atualizacao",
    () =>
      atualizarLancamentosFirebaseAgora(
        "após importação em lote"
      )
  );
}

async function salvarLancamentoFirebase(
  item
) {
  const id =
    String(
      item.id ||
      uid()
    );

  const referencia =
    doc(
      firestore,
      "produtivos_lancamentos",
      id
    );

  const existente =
    db.lancamentos.find(
      lancamento =>
        lancamento.id === id
    );

  const payload = {
    ...item,
    idLocal:
      item.idLocal ||
      id,
    atualizadoEm:
      serverTimestamp()
  };

  if (!existente) {
    payload.criadoEm =
      serverTimestamp();
  }

  await setDoc(
    referencia,
    payload,
    {
      merge: true
    }
  );

  return id;
}

/*
 * API OFICIAL DOS LANÇAMENTOS DOS PRODUTIVOS
 *
 * O lançamento manual e a importação em lote passam obrigatoriamente
 * por salvarLancamentoFirebase(). Assim não existem mais dois formatos
 * diferentes de documento no Firestore.
 */
async function salvarMuitosLancamentosFirebase(
  itens = [],
  opcoes = {}
) {
  const lista =
    Array.isArray(itens)
      ? itens
      : [];

  const tamanhoGrupo =
    Math.max(
      1,
      Math.min(
        Number(
          opcoes.tamanhoGrupo
        ) || 15,
        30
      )
    );

  const ids = [];

  for (
    let inicio = 0;
    inicio < lista.length;
    inicio += tamanhoGrupo
  ) {
    const grupo =
      lista.slice(
        inicio,
        inicio + tamanhoGrupo
      );

    const idsGrupo =
      await Promise.all(
        grupo.map(
          item =>
            salvarLancamentoFirebase(
              item
            )
        )
      );

    ids.push(
      ...idsGrupo
    );

    if (
      typeof opcoes.onProgress ===
      "function"
    ) {
      opcoes.onProgress({
        processados:
          Math.min(
            inicio +
              grupo.length,
            lista.length
          ),
        total:
          lista.length
      });
    }
  }

  return ids;
}

window.produtivosLancamentos = {
  ...(window.produtivosLancamentos || {}),

  salvar:
    salvarLancamentoFirebase,

  salvarMuitos:
    salvarMuitosLancamentosFirebase,

  obterTodos:
    () => [
      ...db.lancamentos
    ],

  versao:
    "2026.08.04-FLUXO-UNICO-01"
};

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
  /*
   * A equipe é consolidada por mecânico.
   * Caso exista mais de um lançamento do mesmo colaborador
   * no mesmo mês, é utilizado o registro mais recente/maior,
   * evitando duplicidade no cálculo dos gestores.
   */
  const mecanicosUnicos =
    new Map();

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
      const chave =
        String(
          lancamento.funcionarioId ||
          lancamento.nome ||
          lancamento.id
        );

      const atual =
        mecanicosUnicos.get(
          chave
        );

      const faturamento =
        numero(
          lancamento.faturamento
        );

      /*
       * Preserva a regra anterior:
       * quando há duplicidade, prioriza o maior faturamento.
       */
      if (
        !atual ||
        faturamento >
          numero(
            atual.faturamento
          )
      ) {
        mecanicosUnicos.set(
          chave,
          lancamento
        );
      }
    });

  let qtdFaixa50 = 0;
  let qtdAcima60 = 0;

  let somaHorasDisponiveis = 0;
  let somaHorasTrabalhadas = 0;
  let somaHorasVendidas = 0;

  let mecanicosHabilitados = 0;

  const nomesMecanicos = [];

  mecanicosUnicos.forEach(
    lancamento => {
      const faturamento =
        numero(
          lancamento.faturamento
        );

      const horasDisponiveis =
        numero(
          lancamento.horasDisponiveis
        );

      const horasTrabalhadas =
        numero(
          lancamento.horasTrabalhadas
        );

      const horasVendidas =
        numero(
          lancamento.horasVendidas
        );

      somaHorasDisponiveis +=
        horasDisponiveis;

      somaHorasTrabalhadas +=
        horasTrabalhadas;

      somaHorasVendidas +=
        horasVendidas;

      if (faturamento >= 60000) {
        qtdAcima60 += 1;
      } else if (
        faturamento >= 50000
      ) {
        qtdFaixa50 += 1;
      }

      const resultadoMecanico =
        calcularLancamento(
          lancamento
        );

      if (
        resultadoMecanico.status ===
        "HABILITADO"
      ) {
        mecanicosHabilitados += 1;
      }

      nomesMecanicos.push(
        resultadoMecanico.nome ||
        lancamento.nome ||
        "Mecânico não identificado"
      );
    }
  );

  /*
   * Indicadores consolidados da equipe.
   *
   * Produtividade:
   * soma das horas trabalhadas ÷ soma das horas disponíveis.
   *
   * Eficiência:
   * soma das horas vendidas ÷ soma das horas trabalhadas.
   *
   * Essa forma é mais auditável do que uma média simples
   * das porcentagens individuais, pois preserva o peso real
   * das horas de cada mecânico.
   */
  const produtividadeEquipe =
    somaHorasDisponiveis > 0
      ? (
          somaHorasTrabalhadas /
          somaHorasDisponiveis
        ) * 100
      : 0;

  const eficienciaEquipe =
    somaHorasTrabalhadas > 0
      ? (
          somaHorasVendidas /
          somaHorasTrabalhadas
        ) * 100
      : 0;

  const bonusChefe =
    qtdFaixa50 * 300 +
    qtdAcima60 * 500;

  return {
    totalMecanicos:
      mecanicosUnicos.size,

    mecanicosHabilitados,

    qtdFaixa50,
    qtdAcima60,
    bonusChefe,

    somaHorasDisponiveis,
    somaHorasTrabalhadas,
    somaHorasVendidas,

    produtividadeEquipe,
    eficienciaEquipe,

    nomesMecanicos
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

  let bonusBruto = 0;

  if (
    funcionario.cargo ===
    "Chefe de Oficina"
  ) {
    bonusBruto =
      bonusChefe;
  }

  if (
    funcionario.cargo ===
    "Mecânico Líder"
  ) {
    bonusBruto =
      bonusChefe / 2;
  }

  if (
    funcionario.cargo ===
    "Controlador de Produtividade"
  ) {
    if (
      equipe.produtividadeEquipe >= 70 &&
      equipe.eficienciaEquipe >= 80
    ) {
      bonusBruto =
        bonusControladorProd(
          equipe.produtividadeEquipe
        ) +
        bonusControladorEfic(
          equipe.eficienciaEquipe
        );
    }
  }

  return {
    id: `automatico-${funcionario.id}-${competencia}`,

    funcionarioId:
      funcionario.id,

    competencia,

    dn: funcionario.dn,

    filial: funcionario.filial,

    nome: funcionario.nome,

    cargo: funcionario.cargo,

    produtividade:
      equipe.produtividadeEquipe,

    eficiencia:
      equipe.eficienciaEquipe,

    produtividadeEquipe:
      equipe.produtividadeEquipe,

    eficienciaEquipe:
      equipe.eficienciaEquipe,

    horasDisponiveisEquipe:
      equipe.somaHorasDisponiveis,

    horasTrabalhadasEquipe:
      equipe.somaHorasTrabalhadas,

    horasVendidasEquipe:
      equipe.somaHorasVendidas,

    qtdFaixa50:
      equipe.qtdFaixa50,

    qtdAcima60:
      equipe.qtdAcima60,

    totalMecanicos:
      equipe.totalMecanicos,

    mecanicosHabilitados:
      equipe.mecanicosHabilitados,

    nomesMecanicos:
      equipe.nomesMecanicos,

    indicadorOrigem:
      "EQUIPE_MECANICOS",

    bonusBruto,

    penalidade: 0,

    bonusFinal: bonusBruto,

    status:
      bonusBruto > 0
        ? "HABILITADO"
        : "NÃO HABILITADO",

    motivo:
      funcionario.cargo ===
      "Controlador de Produtividade"
        ? (
            bonusBruto > 0
              ? "Apuração automática pelos indicadores consolidados de produtividade e eficiência da equipe"
              : (
                  equipe.totalMecanicos > 0
                    ? "Indicadores consolidados da equipe abaixo das metas mínimas de 70% e 80%"
                    : "Nenhum Mecânico Produtivo lançado para calcular os indicadores da equipe"
                )
          )
        : (
            bonusBruto > 0
              ? "Apuração automática baseada no faturamento e nos indicadores consolidados da equipe"
              : (
                  equipe.totalMecanicos > 0
                    ? "A equipe possui lançamentos, mas nenhum mecânico atingiu faturamento mínimo de R$ 50 mil"
                    : "Nenhum mecânico produtivo lançado para a filial nesta competência"
                )
          ),

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
    const equipe =
      calcularResultadoEquipe(
        base.competencia,
        base.filial
      );

    /*
     * O Controlador é avaliado pelo resultado consolidado
     * dos Mecânicos Produtivos da mesma filial e competência.
     * Os campos informados manualmente permanecem no documento
     * apenas para compatibilidade histórica, mas não são mais
     * usados como fonte oficial do cálculo.
     */
    base.produtividade =
      equipe.produtividadeEquipe;

    base.eficiencia =
      equipe.eficienciaEquipe;

    base.produtividadeEquipe =
      equipe.produtividadeEquipe;

    base.eficienciaEquipe =
      equipe.eficienciaEquipe;

    base.horasDisponiveisEquipe =
      equipe.somaHorasDisponiveis;

    base.horasTrabalhadasEquipe =
      equipe.somaHorasTrabalhadas;

    base.horasVendidasEquipe =
      equipe.somaHorasVendidas;

    base.totalMecanicos =
      equipe.totalMecanicos;

    base.mecanicosHabilitados =
      equipe.mecanicosHabilitados;

    base.nomesMecanicos =
      equipe.nomesMecanicos;

    base.indicadorOrigem =
      "EQUIPE_MECANICOS";

    if (
      equipe.totalMecanicos === 0
    ) {
      base.motivo =
        "Nenhum Mecânico Produtivo lançado para calcular os indicadores da equipe";
    } else if (
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

      base.status =
        "HABILITADO";

      base.motivo =
        "Meta atingida pelos indicadores consolidados da equipe";
    } else {
      base.motivo =
        "Indicadores consolidados da equipe abaixo das métricas mínimas";
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
  const etapas = [
    [
      "funcionários",
      renderFuncionarios
    ],
    [
      "lançamentos",
      renderLancamentos
    ],
    [
      "apuração",
      renderApuracao
    ],
    [
      "visão geral",
      renderDashboard
    ],
    [
      "filtros de competência",
      atualizarFiltrosCompetencia
    ]
  ];

  etapas.forEach(
    ([nome, renderizar]) => {
      try {
        renderizar();
      } catch (erro) {
        console.error(
          `Erro ao renderizar ${nome}:`,
          erro
        );
      }
    }
  );
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

  /*
   * Usa a mesma fonte consolidada da Visão Geral e da Apuração.
   * Assim Chefe, Líder e Controlador cadastrados na filial
   * também aparecem automaticamente na área de Lançamentos.
   */
  const lista =
    obterResultadosCampanha()
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
      })
      .sort(
        (a, b) => {
          if (
            Boolean(a.automatico) !==
            Boolean(b.automatico)
          ) {
            return a.automatico
              ? 1
              : -1;
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
      );

  document.querySelector(
    "#tabelaLancamentos"
  ).innerHTML = lista.length
    ? lista
        .map(
          lancamento => `
            <tr
              class="${
                lancamento.automatico
                  ? "lancamento-automatico"
                  : ""
              }"
              data-evidencia-competencia="${lancamento.competencia || ""}"
              data-evidencia-filial="${lancamento.filial || ""}"
              data-evidencia-dn="${lancamento.dn || ""}"
            >
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

                ${
                  lancamento.automatico
                    ? `
                      <br>
                      <span
                        class="lancamento-auto-badge"
                      >
                        Automático
                      </span>
                    `
                    : ""
                }
              </td>

              <td>
                ${lancamento.cargo}
              </td>

              <td>
                ${indicadoresTexto(
                  lancamento
                )}

                ${
                  lancamento.automatico
                    ? explicacaoLancamentoAutomatico(
                        lancamento
                      )
                    : ""
                }
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
                    type="button"
                    class="mini-btn evidence-view-btn"
                    data-evidencia-competencia="${lancamento.competencia || ""}"
                    data-evidencia-filial="${lancamento.filial || ""}"
                    data-evidencia-dn="${lancamento.dn || ""}"
                    title="Visualizar evidências da filial"
                  >
                    📷 Evidências
                  </button>

                  ${
                    lancamento.automatico
                      ? `
                        <span
                          class="lancamento-auto-sem-acao"
                        >
                          Gerado pelo sistema
                        </span>
                      `
                      : `
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
                      `
                  }
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


function explicacaoLancamentoAutomatico(
  lancamento
) {
  const totalMecanicos =
    numero(
      lancamento.totalMecanicos
    );

  const habilitados =
    numero(
      lancamento.mecanicosHabilitados
    );

  if (
    lancamento.cargo ===
    "Chefe de Oficina"
  ) {
    return `
      <div class="lancamento-auto-explicacao">
        <strong>
          Lançado automaticamente
        </strong>

        <span>
          Bônus formado pelos Mecânicos Produtivos
          que atingiram as faixas de faturamento
          de R$ 50 mil e R$ 60 mil.
        </span>

        <span>
          Equipe considerada:
          ${totalMecanicos} mecânico(s),
          ${habilitados} habilitado(s).
        </span>
      </div>
    `;
  }

  if (
    lancamento.cargo ===
    "Mecânico Líder"
  ) {
    return `
      <div class="lancamento-auto-explicacao">
        <strong>
          Lançado automaticamente
        </strong>

        <span>
          O Líder recebe metade do bônus calculado
          para o Chefe de Oficina da mesma filial.
        </span>

        <span>
          Equipe considerada:
          ${totalMecanicos} mecânico(s),
          ${habilitados} habilitado(s).
        </span>
      </div>
    `;
  }

  if (
    lancamento.cargo ===
    "Controlador de Produtividade"
  ) {
    return `
      <div class="lancamento-auto-explicacao">
        <strong>
          Lançado automaticamente
        </strong>

        <span>
          Bônus calculado pela produtividade e
          eficiência consolidadas dos Mecânicos
          Produtivos da filial.
        </span>

        <span>
          Equipe considerada:
          ${totalMecanicos} mecânico(s).
        </span>
      </div>
    `;
  }

  return "";
}

function garantirCssLancamentosAutomaticos() {
  if (
    document.querySelector(
      "#cssLancamentosAutomaticos"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "cssLancamentosAutomaticos";

  style.textContent = `
    #tabelaLancamentos
      tr.lancamento-automatico {
      background:
        linear-gradient(
          90deg,
          rgba(12, 126, 94, .065),
          rgba(12, 126, 94, .018)
        );
    }

    #tabelaLancamentos
      tr.lancamento-automatico td {
      vertical-align: top;
      border-top:
        1px solid rgba(12, 126, 94, .16);
      border-bottom:
        1px solid rgba(12, 126, 94, .10);
    }

    #tabelaLancamentos
      tr.lancamento-automatico:hover {
      background:
        rgba(12, 126, 94, .075);
    }

    .lancamento-auto-badge {
      display: inline-flex;
      margin-top: 5px;
      padding: 3px 8px;
      border-radius: 999px;
      background: #e1f3ec;
      color: #087255;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .04em;
      text-transform: uppercase;
    }

    .lancamento-auto-explicacao {
      display: grid;
      gap: 4px;
      margin-top: 9px;
      max-width: 490px;
      color: #536979;
      font-size: 11px;
      line-height: 1.4;
    }

    .lancamento-auto-explicacao strong {
      color: #087255;
    }

    .lancamento-auto-sem-acao {
      display: inline-flex;
      padding: 6px 9px;
      border-radius: 9px;
      background: #eef4f6;
      color: #647786;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
  `;

  document.head.appendChild(
    style
  );
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
          Produtividade da equipe:
          <strong>
            ${pct(
              lancamento.produtividade
            )}
          </strong>
        </span>

        <small>
          ${numero(
            lancamento.horasTrabalhadasEquipe
          )
            .toFixed(2)
            .replace(".", ",")}h trabalhadas
          ÷
          ${numero(
            lancamento.horasDisponiveisEquipe
          )
            .toFixed(2)
            .replace(".", ",")}h disponíveis
        </small>

        <span>
          Eficiência da equipe:
          <strong>
            ${pct(
              lancamento.eficiencia
            )}
          </strong>
        </span>

        <small>
          ${numero(
            lancamento.horasVendidasEquipe
          )
            .toFixed(2)
            .replace(".", ",")}h vendidas
          ÷
          ${numero(
            lancamento.horasTrabalhadasEquipe
          )
            .toFixed(2)
            .replace(".", ",")}h trabalhadas
        </small>

        <small>
          Base:
          ${numero(
            lancamento.totalMecanicos
          )}
          mecânico(s) avaliado(s)
        </small>
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
          Produtividade da equipe:
          <strong>
            ${pct(
              lancamento.produtividade
            )}
          </strong>
        </span>

        <small>
          ${numero(
            lancamento.horasTrabalhadasEquipe
          )
            .toFixed(2)
            .replace(".", ",")}h trabalhadas
          ÷
          ${numero(
            lancamento.horasDisponiveisEquipe
          )
            .toFixed(2)
            .replace(".", ",")}h disponíveis
        </small>

        <span>
          Eficiência da equipe:
          <strong>
            ${pct(
              lancamento.eficiencia
            )}
          </strong>
        </span>

        <small>
          ${numero(
            lancamento.horasVendidasEquipe
          )
            .toFixed(2)
            .replace(".", ",")}h vendidas
          ÷
          ${numero(
            lancamento.horasTrabalhadasEquipe
          )
            .toFixed(2)
            .replace(".", ",")}h trabalhadas
        </small>

        <span>
          Mecânicos de R$ 50 mil a R$ 59.999,99:
          <strong>
            ${numero(
              lancamento.qtdFaixa50
            )}
          </strong>
        </span>

        <span>
          Mecânicos de R$ 60 mil ou mais:
          <strong>
            ${numero(
              lancamento.qtdAcima60
            )}
          </strong>
        </span>

        <small>
          Base:
          ${numero(
            lancamento.totalMecanicos
          )}
          mecânico(s) avaliado(s),
          ${numero(
            lancamento.mecanicosHabilitados
          )}
          habilitado(s)
        </small>
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

                <td
                  title="${
                    item.indicadorOrigem ===
                    "EQUIPE_MECANICOS"
                      ? (
                          `${numero(
                            item.horasTrabalhadasEquipe
                          ).toFixed(2)}h trabalhadas ÷ ` +
                          `${numero(
                            item.horasDisponiveisEquipe
                          ).toFixed(2)}h disponíveis`
                        )
                      : "Indicador individual"
                  }"
                >
                  <strong>
                    ${pct(
                      item.produtividade
                    )}
                  </strong>

                  ${
                    item.indicadorOrigem ===
                    "EQUIPE_MECANICOS"
                      ? `
                        <br>
                        <small>
                          equipe
                        </small>
                      `
                      : ""
                  }
                </td>

                <td
                  title="${
                    item.indicadorOrigem ===
                    "EQUIPE_MECANICOS"
                      ? (
                          `${numero(
                            item.horasVendidasEquipe
                          ).toFixed(2)}h vendidas ÷ ` +
                          `${numero(
                            item.horasTrabalhadasEquipe
                          ).toFixed(2)}h trabalhadas`
                        )
                      : "Indicador individual"
                  }"
                >
                  <strong>
                    ${pct(
                      item.eficiencia
                    )}
                  </strong>

                  ${
                    item.indicadorOrigem ===
                    "EQUIPE_MECANICOS"
                      ? `
                        <br>
                        <small>
                          equipe
                        </small>
                      `
                      : ""
                  }
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

function valorOrdenacaoHistorico(
  resultado,
  campo
) {
  if (campo === "avaliacao") {
    return motivoResultado(
      resultado
    );
  }

  if (
    [
      "faturamento",
      "produtividade",
      "eficiencia",
      "bonusFinal"
    ].includes(campo)
  ) {
    return numero(
      resultado[campo]
    );
  }

  return String(
    resultado[campo] || ""
  );
}

function ordenarResultadosHistorico(
  resultados
) {
  const coluna =
    COLUNAS_HISTORICO.find(
      item =>
        item.campo ===
        ordenacaoHistorico.campo
    ) ||
    COLUNAS_HISTORICO[0];

  const multiplicador =
    ordenacaoHistorico.direcao ===
    "asc"
      ? 1
      : -1;

  return [...resultados].sort(
    (a, b) => {
      const valorA =
        valorOrdenacaoHistorico(
          a,
          coluna.campo
        );

      const valorB =
        valorOrdenacaoHistorico(
          b,
          coluna.campo
        );

      if (
        coluna.tipo ===
        "numero"
      ) {
        const diferenca =
          numero(valorA) -
          numero(valorB);

        if (diferenca !== 0) {
          return diferenca *
            multiplicador;
        }
      } else {
        const comparacao =
          String(valorA).localeCompare(
            String(valorB),
            "pt-BR",
            {
              sensitivity: "base",
              numeric: true
            }
          );

        if (comparacao !== 0) {
          return comparacao *
            multiplicador;
        }
      }

      return String(
        a.nome || ""
      ).localeCompare(
        String(
          b.nome || ""
        ),
        "pt-BR",
        {
          sensitivity: "base"
        }
      );
    }
  );
}

function iconeOrdenacaoHistorico(
  campo
) {
  if (
    ordenacaoHistorico.campo !==
    campo
  ) {
    return "↕";
  }

  return ordenacaoHistorico.direcao ===
    "asc"
      ? "↑"
      : "↓";
}

function tituloOrdenacaoHistorico(
  coluna
) {
  const ativa =
    ordenacaoHistorico.campo ===
    coluna.campo;

  if (
    coluna.tipo ===
    "numero"
  ) {
    if (!ativa) {
      return `Ordenar ${coluna.rotulo}: maior para menor`;
    }

    return ordenacaoHistorico.direcao ===
      "desc"
        ? `Ordenar ${coluna.rotulo}: menor para maior`
        : `Ordenar ${coluna.rotulo}: maior para menor`;
  }

  if (!ativa) {
    return `Ordenar ${coluna.rotulo}: A–Z`;
  }

  return ordenacaoHistorico.direcao ===
    "asc"
      ? `Ordenar ${coluna.rotulo}: Z–A`
      : `Ordenar ${coluna.rotulo}: A–Z`;
}

function aplicarEstiloOrdenacaoHistorico() {
  if (
    document.querySelector(
      "#estiloOrdenacaoHistorico"
    )
  ) {
    return;
  }

  const estilo =
    document.createElement(
      "style"
    );

  estilo.id =
    "estiloOrdenacaoHistorico";

  estilo.textContent = `
    #tabelaHistoricoMensal
      .historico-sort-btn {
      width: 100%;
      min-width: 72px;
      border: 0;
      padding: 0;
      background: transparent;
      color: inherit;
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 7px;
      font: inherit;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .04em;
      cursor: pointer;
    }

    #tabelaHistoricoMensal
      .historico-sort-btn:hover {
      color: var(--primary);
    }

    #tabelaHistoricoMensal
      .historico-sort-btn.active {
      color: var(--primary);
    }

    #tabelaHistoricoMensal
      .historico-sort-icon {
      width: 20px;
      height: 20px;
      flex: 0 0 20px;
      border-radius: 6px;
      background: rgba(11, 122, 83, .09);
      display: inline-grid;
      place-items: center;
      font-size: 12px;
      line-height: 1;
    }
  `;

  document.head.appendChild(
    estilo
  );
}

function configurarCabecalhoHistorico() {
  aplicarEstiloOrdenacaoHistorico();

  const tabelaBody =
    document.querySelector(
      "#tabelaHistoricoMensal"
    );

  const tabela =
    tabelaBody?.closest(
      "table"
    );

  const cabecalhos =
    tabela
      ? [
          ...tabela.querySelectorAll(
            "thead th"
          )
        ]
      : [];

  if (
    cabecalhos.length <
    COLUNAS_HISTORICO.length
  ) {
    return;
  }

  COLUNAS_HISTORICO.forEach(
    (coluna, indice) => {
      const th =
        cabecalhos[indice];

      const ativo =
        ordenacaoHistorico.campo ===
        coluna.campo;

      th.innerHTML = `
        <button
          type="button"
          class="historico-sort-btn ${
            ativo
              ? "active"
              : ""
          }"
          data-historico-sort="${coluna.campo}"
          title="${tituloOrdenacaoHistorico(coluna)}"
          aria-label="${tituloOrdenacaoHistorico(coluna)}"
        >
          <span>
            ${coluna.rotulo}
          </span>

          <span
            class="historico-sort-icon"
            aria-hidden="true"
          >
            ${iconeOrdenacaoHistorico(coluna.campo)}
          </span>
        </button>
      `;
    }
  );

  tabela
    .querySelectorAll(
      "[data-historico-sort]"
    )
    .forEach(
      botao => {
        botao.addEventListener(
          "click",
          () => {
            const campo =
              botao.dataset
                .historicoSort;

            const coluna =
              COLUNAS_HISTORICO.find(
                item =>
                  item.campo ===
                  campo
              );

            if (!coluna) {
              return;
            }

            if (
              ordenacaoHistorico.campo ===
              campo
            ) {
              ordenacaoHistorico.direcao =
                ordenacaoHistorico.direcao ===
                "asc"
                  ? "desc"
                  : "asc";
            } else {
              ordenacaoHistorico.campo =
                campo;

              ordenacaoHistorico.direcao =
                coluna.tipo ===
                "numero"
                  ? "desc"
                  : "asc";
            }

            renderDashboard();
          }
        );
      }
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

  configurarCabecalhoHistorico();

  const resultadosOrdenados =
    ordenarResultadosHistorico(
      resultados
    );

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
    resultadosOrdenados.length
      ? resultadosOrdenados
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
                  <strong>
                    ${pct(
                      resultado.produtividade
                    )}
                  </strong>

                  ${
                    resultado.indicadorOrigem ===
                    "EQUIPE_MECANICOS"
                      ? `
                        <br>
                        <small>
                          Equipe ·
                          ${numero(
                            resultado.totalMecanicos
                          )}
                          mecânico(s)
                        </small>
                      `
                      : ""
                  }
                </td>

                <td>
                  <strong>
                    ${pct(
                      resultado.eficiencia
                    )}
                  </strong>

                  ${
                    resultado.indicadorOrigem ===
                    "EQUIPE_MECANICOS"
                      ? `
                        <br>
                        <small>
                          Equipe ·
                          ${numero(
                            resultado.totalMecanicos
                          )}
                          mecânico(s)
                        </small>
                      `
                      : ""
                  }
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
      window.CampanhaUI.alert(
        "Este funcionário possui lançamentos. Exclua os lançamentos primeiro ou deixe o funcionário inativo."
      );

      return;
    }

    const confirmou =
      await window.CampanhaUI.deleteConfirm({
        titulo: "Excluir funcionário?",
        mensagem:
          "O funcionário será removido definitivamente da base da Campanha dos Produtivos.",
        textoConfirmar: "Excluir funcionário",
        textoCancelar: "Cancelar"
      });

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

      window.CampanhaUI.alert(
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
    window.CampanhaUI.alert(
      "Cadastre pelo menos um Mecânico Produtivo ou Controlador ativo primeiro."
    );

    return;
  }

  document
    .querySelector(
      "#formLancamento"
    )
    .reset();

  /*
   * O lançamento recebe o ID antes do upload.
   * Assim a evidência consegue registrar qual colaborador
   * é o "matriz" da filial/competência.
   */
  document.querySelector(
    "#lancamentoId"
  ).value = uid();

  document.querySelector(
    "#lancamentoCompetencia"
  ).value =
    mesAnterior();

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

  window.setTimeout(
    () =>
      window.evidenciasProdutivos
        ?.atualizarContexto?.(),
    80
  );
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

    window.setTimeout(
      () =>
        window.evidenciasProdutivos
          ?.atualizarContexto?.(),
      80
    );
  };

window.excluirLancamento =
  async id => {
    const senhaAutorizada =
      await solicitarSenhaExclusao();

    if (!senhaAutorizada) {
      return;
    }

    const confirmou =
      await window.CampanhaUI.deleteConfirm({
        titulo: "Excluir lançamento?",
        mensagem:
          "Este lançamento será removido definitivamente da Campanha dos Produtivos.",
        textoConfirmar: "Excluir lançamento",
        textoCancelar: "Cancelar"
      });

    if (!confirmou) {
      return;
    }

    try {
      const lancamentoExcluido =
        db.lancamentos.find(
          item => item.id === id
        );

      if (!lancamentoExcluido) {
        throw new Error(
          "Lançamento não encontrado para exclusão."
        );
      }

      const demaisLancamentosDaCasa =
        db.lancamentos
          .filter(
            item =>
              item.id !== id &&
              item.competencia ===
                lancamentoExcluido.competencia &&
              item.filial ===
                lancamentoExcluido.filial
          )
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

      /*
       * Regras do anexo matriz:
       * - excluir não matriz: evidência permanece;
       * - excluir matriz com outros lançamentos: o próximo
       *   colaborador assume a matriz;
       * - excluir o último lançamento: evidência é removida.
       */
      if (
        window.evidenciasProdutivos
          ?.antesDeExcluirLancamento
      ) {
        await window.evidenciasProdutivos
          .antesDeExcluirLancamento({
            lancamento:
              lancamentoExcluido,

            restantes:
              demaisLancamentosDaCasa
          });
      }

      await deleteDoc(
        doc(
          firestore,
          "produtivos_lancamentos",
          id
        )
      );

      toast(
        "Lançamento excluído"
      );
    } catch (erro) {
      console.error(
        "Erro ao excluir lançamento no Firebase:",
        erro
      );

      await window.CampanhaUI.alert(
        erro.message ||
        "Não foi possível excluir o lançamento. Verifique a conexão e tente novamente."
      );
    }
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
    window.CampanhaUI.alert(
      "A base de funcionários ainda está carregando. Aguarde alguns segundos e tente novamente."
    );

    return;
  }

  const resultados =
    obterResultadosParaExportacao();

  if (!resultados.length) {
    window.CampanhaUI.alert(
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
        competenciaEvidencias,
        {
          resultados
        }
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

    window.CampanhaUI.alert(
      erro.message ||
      "Não foi possível gerar o arquivo Excel."
    );
  }
}

async function exportarPdf() {
  if (!funcionariosCarregados) {
    window.CampanhaUI.alert(
      "A base de funcionários ainda está carregando. Aguarde alguns segundos e tente novamente."
    );

    return;
  }

  const resultados =
    obterResultadosParaExportacao();

  if (!resultados.length) {
    window.CampanhaUI.alert(
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
        competenciaEvidencias,
        {
          resultados
        }
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

    window.CampanhaUI.alert(
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

  /*
   * A Campanha dos Produtivos é normalmente lançada no mês
   * seguinte ao mês apurado. Por isso, ao abrir o módulo,
   * a competência padrão é sempre o mês anterior.
   */
  competenciaGlobal.value =
    limitarCompetenciaHistorico(
      mesAnterior()
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
      () => {
        atualizarFuncionariosLancamento();

        window.setTimeout(
          () =>
            window.evidenciasProdutivos
              ?.atualizarContexto?.(),
          30
        );
      }
    );

  document
    .querySelector(
      "#lancamentoFuncionario"
    )
    .addEventListener(
      "change",
      () => {
        renderCamposDinamicos();

        window.setTimeout(
          () =>
            window.evidenciasProdutivos
              ?.atualizarContexto?.(),
          30
        );
      }
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
          window.CampanhaUI.alert(
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
          window.CampanhaUI.alert(
            "Informe o nome do funcionário."
          );

          return;
        }

        if (!funcionario.cargo) {
          window.CampanhaUI.alert(
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

          window.CampanhaUI.alert(
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
      async evento => {
        evento.preventDefault();

        const botaoSalvar =
          evento.submitter ||
          evento.target.querySelector(
            'button[type="submit"]'
          );

        try {
          if (botaoSalvar) {
            botaoSalvar.disabled =
              true;

            botaoSalvar.textContent =
              "Salvando...";
          }

          const item =
            coletarLancamentoFormulario();

          await window.produtivosLancamentos
            .salvar(
              item
            );

          evento.target
            .closest("dialog")
            .close();

          toast(
            "Lançamento salvo e sincronizado"
          );
        } catch (erro) {
          console.error(
            "Erro ao salvar lançamento:",
            erro
          );

          await window.CampanhaUI.alert(
            erro.message ||
            "Não foi possível salvar o lançamento no Firebase."
          );
        } finally {
          if (botaoSalvar) {
            botaoSalvar.disabled =
              false;

            botaoSalvar.textContent =
              "Salvar lançamento";
          }
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
      async () => {
        const senhaAutorizada =
          await solicitarSenhaExclusao();

        if (!senhaAutorizada) {
          return;
        }

        const confirmou =
          await window.CampanhaUI.deleteConfirm({
            titulo: "Limpar todos os lançamentos compartilhados?",
            mensagem:
              "Todos os lançamentos dos Produtivos salvos no Firebase serão apagados para todos os usuários. Esta ação não poderá ser desfeita.",
            textoConfirmar: "Limpar lançamentos",
            textoCancelar: "Cancelar"
          });

        if (!confirmou) {
          return;
        }

        try {
          const snapshot =
            await getDocs(
              lancamentosRef
            );

          for (
            const documento
            of snapshot.docs
          ) {
            await deleteDoc(
              documento.ref
            );
          }

          localStorage.removeItem(
            DB_KEY
          );

          localStorage.setItem(
            MIGRACAO_LANCAMENTOS_KEY,
            "true"
          );

          toast(
            "Lançamentos compartilhados apagados"
          );
        } catch (erro) {
          console.error(
            "Erro ao limpar lançamentos compartilhados:",
            erro
          );

          await window.CampanhaUI.alert(
            "Não foi possível limpar os lançamentos no Firebase."
          );
        }
      }
    );
}

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    iniciarSelects();
    garantirControlesHistorico();
    garantirCssLancamentosAutomaticos();
    configurarEventos();
    atualizarNavegacaoHistorico();
    renderTudo();

    iniciarFuncionariosTempoReal();
    iniciarLancamentosTempoReal();

    await atualizarLancamentosFirebaseAgora(
      "carregamento inicial"
    );

    /*
     * Migra uma única vez os lançamentos antigos que estavam
     * somente neste navegador. A cópia local não é apagada.
     */
    await migrarLancamentosLocaisParaFirebase();
  }
);