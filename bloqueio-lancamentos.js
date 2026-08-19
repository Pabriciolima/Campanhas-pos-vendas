/*
 * BLOQUEIO GLOBAL v02 — PROGRAMAÇÃO AUTOMÁTICA
 * - Mantém bloqueio/liberação manual com senha 123321.
 * - Adiciona programação de bloqueio + desbloqueio no horário de Belém/PA.
 * - Programação é salva no Firebase e vale para Produtivos e Pix em qualquer máquina.
 * - O estado é calculado ao abrir o sistema e atualizado a cada 10 segundos.
 * - Ação manual cancela uma programação ativa para evitar conflito.
 * - Nenhuma lógica de lançamentos existente foi alterada.
 */

/* =========================================================
   BLOQUEIO GLOBAL DE LANÇAMENTOS
   Campanha dos Produtivos + Pix do Presidente

   Salve como: bloqueio-lancamentos.js
   Senha: 123321
========================================================= */

import { firestore } from "./firebase-config.js";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

(() => {
  "use strict";

  const SENHA_DIRETOR = "123321";
  const CONFIG_REF = doc(
    firestore,
    "configuracoes_sistema",
    "bloqueio_lancamentos"
  );

  const estado = {
    bloqueadoManual: false,
    bloqueado: false,
    carregando: true,
    salvando: false,

    programacao: {
      ativa: false,
      bloquearEmEpoch: 0,
      liberarEmEpoch: 0,
      timezone: "America/Belem"
    }
  };

  const TIMEZONE_OPERACAO =
    "America/Belem";

  const MODULOS = {
    produtivos: "#lancamentos",
    pix: "#pix-lancamentos"
  };

  const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
  const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

  function normalizar(valor) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  function garantirEstrutura() {
    if ($("#modalSenhaBloqueio")) return;

    document.body.insertAdjacentHTML(
      "beforeend",
      `
        <dialog id="modalSenhaBloqueio" class="lock-password-dialog">
          <form id="formSenhaBloqueio" class="lock-password-card" method="dialog">
            <button type="button" id="fecharModalSenhaBloqueio" class="lock-password-close">×</button>

            <div id="iconeModalSenhaBloqueio" class="lock-password-icon">🔒</div>
            <span class="lock-password-eyebrow">Controle do diretor</span>
            <h2 id="tituloModalSenhaBloqueio">Bloquear lançamentos</h2>
            <p id="descricaoModalSenhaBloqueio">Informe a senha para continuar.</p>

            <label class="lock-password-field">
              <span>Senha</span>
              <div class="lock-password-input-wrap">
                <input
                  type="password"
                  id="senhaBloqueioLancamentos"
                  autocomplete="current-password"
                  inputmode="numeric"
                  maxlength="20"
                  placeholder="Digite a senha"
                />
                <button type="button" id="alternarVisibilidadeSenha" class="lock-password-visibility">Mostrar</button>
              </div>
            </label>

            <p id="erroSenhaBloqueio" class="lock-password-error" hidden>Senha incorreta.</p>

            <div class="lock-password-actions">
              <button type="button" id="cancelarSenhaBloqueio" class="lock-secondary-button">Cancelar</button>
              <button type="submit" id="confirmarSenhaBloqueio" class="lock-primary-button">Confirmar</button>
            </div>
          </form>
        </dialog>

        <dialog id="modalProgramacaoBloqueio" class="lock-schedule-dialog">
          <form id="formProgramacaoBloqueio" class="lock-schedule-card" method="dialog">
            <button
              type="button"
              id="fecharModalProgramacaoBloqueio"
              class="lock-password-close"
              aria-label="Fechar"
            >×</button>

            <div class="lock-schedule-hero">
              <div class="lock-schedule-icon">⏱</div>
              <div>
                <span class="lock-password-eyebrow">AUTOMAÇÃO DE ACESSO</span>
                <h2>Programar bloqueio</h2>
                <p>
                  Defina quando os lançamentos serão bloqueados e liberados
                  automaticamente para todos os usuários.
                </p>
              </div>
            </div>

            <div id="resumoProgramacaoAtual" class="lock-schedule-current" hidden></div>

            <div class="lock-schedule-grid">
              <label class="lock-schedule-field">
                <span>Bloquear em</span>
                <input
                  type="datetime-local"
                  id="programarBloquearEm"
                  step="60"
                  required
                />
                <small>Início automático do bloqueio.</small>
              </label>

              <label class="lock-schedule-field">
                <span>Desbloquear em</span>
                <input
                  type="datetime-local"
                  id="programarLiberarEm"
                  step="60"
                  required
                />
                <small>Liberação automática dos lançamentos.</small>
              </label>
            </div>

            <div class="lock-schedule-info">
              <strong>Horário de referência: Belém/PA</strong>
              <span>
                A programação fica salva no Firebase e vale para Produtivos e
                Pix do Presidente em qualquer máquina.
              </span>
            </div>

            <label class="lock-password-field">
              <span>Senha para confirmar</span>
              <div class="lock-password-input-wrap">
                <input
                  type="password"
                  id="senhaProgramacaoBloqueio"
                  autocomplete="new-password"
                  inputmode="numeric"
                  maxlength="20"
                  placeholder="Digite a senha"
                />
              </div>
            </label>

            <p
              id="erroProgramacaoBloqueio"
              class="lock-password-error"
              hidden
            ></p>

            <div class="lock-schedule-actions">
              <button
                type="button"
                id="cancelarProgramacaoExistente"
                class="lock-danger-outline-button"
                hidden
              >
                Cancelar programação
              </button>

              <div class="lock-schedule-actions-right">
                <button
                  type="button"
                  id="cancelarModalProgramacao"
                  class="lock-secondary-button"
                >
                  Fechar
                </button>

                <button
                  type="submit"
                  id="salvarProgramacaoBloqueio"
                  class="lock-schedule-save"
                >
                  Salvar programação
                </button>
              </div>
            </div>
          </form>
        </dialog>

        <div id="toastBloqueioLancamentos" class="lock-toast" aria-live="polite"></div>
      `
    );

    configurarModal();
    configurarModalProgramacao();
  }

  let resolverModal = null;

  function abrirModalSenha(acao) {
    garantirEstrutura();

    const dialog = $("#modalSenhaBloqueio");
    const input = $("#senhaBloqueioLancamentos");
    const vaiBloquear = acao === "bloquear";

    $("#tituloModalSenhaBloqueio").textContent =
      vaiBloquear ? "Bloquear lançamentos" : "Liberar lançamentos";

    $("#descricaoModalSenhaBloqueio").textContent = vaiBloquear
      ? "Nenhum usuário poderá incluir, editar ou excluir lançamentos."
      : "Os usuários voltarão a incluir, editar e excluir lançamentos.";

    $("#iconeModalSenhaBloqueio").textContent = vaiBloquear ? "🔒" : "🔓";
    $("#confirmarSenhaBloqueio").textContent = vaiBloquear ? "Bloquear agora" : "Liberar agora";
    $("#confirmarSenhaBloqueio").classList.toggle("unlock-action", !vaiBloquear);

    input.value = "";
    input.type = "password";
    $("#alternarVisibilidadeSenha").textContent = "Mostrar";
    $("#erroSenhaBloqueio").hidden = true;

    dialog.showModal();
    setTimeout(() => input.focus(), 80);

    return new Promise(resolve => {
      resolverModal = resolve;
    });
  }

  function fecharModal(resultado = false) {
    const dialog = $("#modalSenhaBloqueio");
    if (dialog?.open) dialog.close();

    if (resolverModal) {
      resolverModal(resultado);
      resolverModal = null;
    }
  }

  function configurarModal() {
    $("#fecharModalSenhaBloqueio")?.addEventListener("click", () => fecharModal(false));
    $("#cancelarSenhaBloqueio")?.addEventListener("click", () => fecharModal(false));

    $("#alternarVisibilidadeSenha")?.addEventListener("click", () => {
      const input = $("#senhaBloqueioLancamentos");
      const mostrar = input.type === "password";
      input.type = mostrar ? "text" : "password";
      $("#alternarVisibilidadeSenha").textContent = mostrar ? "Ocultar" : "Mostrar";
    });

    $("#formSenhaBloqueio")?.addEventListener("submit", evento => {
      evento.preventDefault();

      if ($("#senhaBloqueioLancamentos").value !== SENHA_DIRETOR) {
        $("#erroSenhaBloqueio").hidden = false;
        $("#senhaBloqueioLancamentos").focus();
        return;
      }

      fecharModal(true);
    });
  }


  function dataLocalInputParaEpochBelem(valor) {
    if (!valor) return 0;

    /*
     * O datetime-local não contém timezone.
     * Fixamos a operação em Belém/PA (UTC-03:00),
     * garantindo o mesmo instante para todas as filiais.
     */
    const iso = `${valor}:00-03:00`;
    const epoch = new Date(iso).getTime();

    return Number.isFinite(epoch)
      ? epoch
      : 0;
  }

  function epochParaInputBelem(epoch) {
    if (!epoch) return "";

    const data = new Date(
      Number(epoch) - (3 * 60 * 60 * 1000)
    );

    const pad = valor =>
      String(valor).padStart(2, "0");

    return [
      data.getUTCFullYear(),
      "-",
      pad(data.getUTCMonth() + 1),
      "-",
      pad(data.getUTCDate()),
      "T",
      pad(data.getUTCHours()),
      ":",
      pad(data.getUTCMinutes())
    ].join("");
  }

  function formatarEpoch(epoch) {
    if (!epoch) return "—";

    try {
      return new Intl.DateTimeFormat(
        "pt-BR",
        {
          timeZone: TIMEZONE_OPERACAO,
          dateStyle: "short",
          timeStyle: "short"
        }
      ).format(new Date(Number(epoch)));
    } catch (_) {
      return new Date(Number(epoch))
        .toLocaleString("pt-BR");
    }
  }

  function calcularEstadoEfetivo() {
    const agora = Date.now();
    const programacao = estado.programacao;

    if (
      !programacao.ativa ||
      !programacao.bloquearEmEpoch ||
      !programacao.liberarEmEpoch
    ) {
      return {
        bloqueado: estado.bloqueadoManual,
        fase: "manual"
      };
    }

    if (agora < programacao.bloquearEmEpoch) {
      return {
        bloqueado: estado.bloqueadoManual,
        fase: "aguardando"
      };
    }

    if (agora < programacao.liberarEmEpoch) {
      return {
        bloqueado: true,
        fase: "bloqueio-programado"
      };
    }

    return {
      bloqueado: false,
      fase: "concluida"
    };
  }

  function sincronizarEstadoEfetivo() {
    const anterior = estado.bloqueado;
    const efetivo = calcularEstadoEfetivo();

    estado.bloqueado = efetivo.bloqueado;
    estado.faseProgramacao = efetivo.fase;

    atualizarVisual();

    if (
      anterior !== estado.bloqueado &&
      !estado.carregando
    ) {
      mostrarToast(
        estado.bloqueado
          ? "Bloqueio programado ativado automaticamente."
          : "Lançamentos liberados automaticamente pela programação.",
        "success"
      );
    }
  }

  function atualizarResumoProgramacaoModal() {
    const resumo = $("#resumoProgramacaoAtual");
    const cancelar = $("#cancelarProgramacaoExistente");

    if (!resumo || !cancelar) return;

    if (!estado.programacao.ativa) {
      resumo.hidden = true;
      cancelar.hidden = true;
      return;
    }

    resumo.hidden = false;
    cancelar.hidden = false;

    resumo.innerHTML = `
      <span>PROGRAMAÇÃO ATIVA</span>
      <strong>
        ${formatarEpoch(estado.programacao.bloquearEmEpoch)}
        <b>→</b>
        ${formatarEpoch(estado.programacao.liberarEmEpoch)}
      </strong>
      <small>
        ${estado.faseProgramacao === "bloqueio-programado"
          ? "Bloqueio automático em andamento."
          : estado.faseProgramacao === "concluida"
            ? "Programação concluída; lançamentos liberados."
            : "Aguardando o horário de bloqueio."}
      </small>
    `;
  }

  function abrirModalProgramacao() {
    garantirEstrutura();

    const dialog = $("#modalProgramacaoBloqueio");
    const bloquear = $("#programarBloquearEm");
    const liberar = $("#programarLiberarEm");
    const senha = $("#senhaProgramacaoBloqueio");
    const erro = $("#erroProgramacaoBloqueio");

    const agora = Date.now();
    const inicioPadrao =
      estado.programacao.ativa
        ? estado.programacao.bloquearEmEpoch
        : agora + (30 * 60 * 1000);

    const fimPadrao =
      estado.programacao.ativa
        ? estado.programacao.liberarEmEpoch
        : inicioPadrao + (12 * 60 * 60 * 1000);

    bloquear.value = epochParaInputBelem(inicioPadrao);
    liberar.value = epochParaInputBelem(fimPadrao);

    senha.value = "";
    erro.hidden = true;
    erro.textContent = "";

    atualizarResumoProgramacaoModal();

    dialog.showModal();
  }

  function fecharModalProgramacao() {
    const dialog = $("#modalProgramacaoBloqueio");
    if (dialog?.open) dialog.close();
  }

  async function salvarProgramacao(evento) {
    evento.preventDefault();

    if (estado.salvando) return;

    const senha = $("#senhaProgramacaoBloqueio").value;
    const erro = $("#erroProgramacaoBloqueio");

    if (senha !== SENHA_DIRETOR) {
      erro.textContent = "Senha incorreta.";
      erro.hidden = false;
      $("#senhaProgramacaoBloqueio").focus();
      return;
    }

    const bloquearEmEpoch =
      dataLocalInputParaEpochBelem(
        $("#programarBloquearEm").value
      );

    const liberarEmEpoch =
      dataLocalInputParaEpochBelem(
        $("#programarLiberarEm").value
      );

    if (!bloquearEmEpoch || !liberarEmEpoch) {
      erro.textContent =
        "Informe a data e o horário de bloqueio e desbloqueio.";
      erro.hidden = false;
      return;
    }

    if (liberarEmEpoch <= bloquearEmEpoch) {
      erro.textContent =
        "O desbloqueio precisa ocorrer depois do horário de bloqueio.";
      erro.hidden = false;
      return;
    }

    try {
      estado.salvando = true;
      atualizarVisual();

      /*
       * Ao criar uma nova programação, o estado manual fica liberado
       * até a chegada do horário programado.
       */
      await setDoc(
        CONFIG_REF,
        {
          bloqueado: false,
          programacao: {
            ativa: true,
            bloquearEmEpoch,
            liberarEmEpoch,
            timezone: TIMEZONE_OPERACAO,
            criadoEm: serverTimestamp(),
            criadoPor: "DIRETOR"
          },
          atualizadoEm: serverTimestamp(),
          atualizadoPor: "DIRETOR"
        },
        { merge: true }
      );

      fecharModalProgramacao();

      mostrarToast(
        `Programação salva: bloqueio em ${formatarEpoch(bloquearEmEpoch)} e liberação em ${formatarEpoch(liberarEmEpoch)}.`
      );
    } catch (erroSalvar) {
      console.error(
        "Erro ao salvar programação de bloqueio:",
        erroSalvar
      );

      erro.textContent =
        "Não foi possível salvar a programação. Verifique as permissões do Firestore.";
      erro.hidden = false;
    } finally {
      estado.salvando = false;
      atualizarVisual();
    }
  }

  async function cancelarProgramacao() {
    if (estado.salvando) return;

    const senha = $("#senhaProgramacaoBloqueio").value;
    const erro = $("#erroProgramacaoBloqueio");

    if (senha !== SENHA_DIRETOR) {
      erro.textContent =
        "Digite a senha 123321 para cancelar a programação.";
      erro.hidden = false;
      $("#senhaProgramacaoBloqueio").focus();
      return;
    }

    try {
      estado.salvando = true;

      await setDoc(
        CONFIG_REF,
        {
          programacao: {
            ativa: false,
            bloquearEmEpoch: 0,
            liberarEmEpoch: 0,
            timezone: TIMEZONE_OPERACAO,
            canceladoEm: serverTimestamp(),
            canceladoPor: "DIRETOR"
          },
          atualizadoEm: serverTimestamp(),
          atualizadoPor: "DIRETOR"
        },
        { merge: true }
      );

      fecharModalProgramacao();

      mostrarToast(
        "Programação automática cancelada."
      );
    } catch (erroCancelar) {
      console.error(
        "Erro ao cancelar programação:",
        erroCancelar
      );

      erro.textContent =
        "Não foi possível cancelar a programação.";
      erro.hidden = false;
    } finally {
      estado.salvando = false;
      atualizarVisual();
    }
  }

  function configurarModalProgramacao() {
    $("#fecharModalProgramacaoBloqueio")
      ?.addEventListener(
        "click",
        fecharModalProgramacao
      );

    $("#cancelarModalProgramacao")
      ?.addEventListener(
        "click",
        fecharModalProgramacao
      );

    $("#formProgramacaoBloqueio")
      ?.addEventListener(
        "submit",
        salvarProgramacao
      );

    $("#cancelarProgramacaoExistente")
      ?.addEventListener(
        "click",
        cancelarProgramacao
      );

    $("#modalProgramacaoBloqueio")
      ?.addEventListener(
        "click",
        evento => {
          if (
            evento.target ===
            $("#modalProgramacaoBloqueio")
          ) {
            fecharModalProgramacao();
          }
        }
      );
  }

  function mostrarToast(mensagem, tipo = "success") {
    const toast = $("#toastBloqueioLancamentos");
    if (!toast) return;

    toast.className = `lock-toast type-${tipo}`;
    toast.textContent = mensagem;
    toast.classList.add("show");

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("show"), 4200);
  }

  function criarControle(modulo, seletorView) {
    const view = $(seletorView);
    if (!view || view.querySelector(`[data-lock-module="${modulo}"]`)) return;

    const headers = [...view.querySelectorAll(".panel-header, .section-header, .card-header")];
    const header = headers.find(elemento => {
      const texto = normalizar(elemento.textContent);
      return texto.includes("LANCAMENTO") || texto.includes("MENSURACAO") || texto.includes("SEMANAS 1 A 4");
    }) || view.querySelector(".panel") || view.firstElementChild;

    if (!header) return;

    const controle = document.createElement("div");
    controle.className = "launch-lock-control";
    controle.dataset.lockModule = modulo;
    controle.innerHTML = `
      <div class="launch-lock-status">
        <span class="launch-lock-status-icon" data-lock-icon>🔓</span>
        <div>
          <strong data-lock-title>Lançamentos liberados</strong>
          <small data-lock-description>Inclusão e edição permitidas</small>
        </div>
      </div>

      <button
        type="button"
        class="launch-lock-schedule-button"
        data-lock-schedule
        title="Programar bloqueio e desbloqueio automáticos"
      >
        <span>◷</span>
        Programar
      </button>

      <button type="button" class="launch-lock-button" data-lock-toggle>
        Bloquear lançamentos
      </button>
    `;

    const botaoNovo = [...header.querySelectorAll("button")].find(botao =>
      normalizar(botao.textContent).includes("NOVO LANCAMENTO")
    );

    if (botaoNovo) {
      botaoNovo.insertAdjacentElement("beforebegin", controle);
    } else {
      header.appendChild(controle);
    }

    controle
      .querySelector("[data-lock-schedule]")
      .addEventListener(
        "click",
        abrirModalProgramacao
      );

    controle
      .querySelector("[data-lock-toggle]")
      .addEventListener(
        "click",
        alternarBloqueio
      );

    atualizarVisual();
  }

  function instalarControles() {
    Object.entries(MODULOS).forEach(([modulo, seletor]) => criarControle(modulo, seletor));
  }

  async function alternarBloqueio() {
    if (estado.carregando || estado.salvando) return;

    const autorizado = await abrirModalSenha(estado.bloqueado ? "liberar" : "bloquear");
    if (!autorizado) return;

    try {
      estado.salvando = true;
      atualizarVisual();

      const novoEstado = !estado.bloqueado;

      /*
       * Uma ação manual tem prioridade e encerra qualquer programação
       * existente para evitar que o sistema volte a bloquear/desbloquear
       * logo após a decisão do diretor.
       */
      await setDoc(
        CONFIG_REF,
        {
          bloqueado: novoEstado,
          programacao: {
            ativa: false,
            bloquearEmEpoch: 0,
            liberarEmEpoch: 0,
            timezone: TIMEZONE_OPERACAO,
            canceladoEm: serverTimestamp(),
            canceladoPor: "DIRETOR"
          },
          atualizadoEm: serverTimestamp(),
          atualizadoPor: "DIRETOR"
        },
        { merge: true }
      );

      mostrarToast(
        novoEstado
          ? "Lançamentos bloqueados para todos os usuários."
          : "Lançamentos liberados para todos os usuários."
      );
    } catch (erro) {
      console.error("Erro ao alterar bloqueio:", erro);
      mostrarToast("Não foi possível alterar o bloqueio. Verifique as permissões do Firestore.", "error");
    } finally {
      estado.salvando = false;
      atualizarVisual();
    }
  }

  function botaoEhAcaoLancamento(botao) {
    if (!botao) return false;

    const texto = normalizar(botao.textContent);

    return (
      texto.includes("NOVO LANCAMENTO") ||
      texto === "EDITAR" ||
      texto === "EXCLUIR" ||
      texto.includes("SALVAR LANCAMENTO") ||
      texto.includes("ATUALIZAR LANCAMENTO") ||
      botao.matches(
        "#btnNovoLancamento, #btnNovoLancamentoPix, [data-action='editar-lancamento'], [data-action='excluir-lancamento'], [data-edit-lancamento], [data-delete-lancamento]"
      )
    );
  }

  function dentroDeLancamentos(elemento) {
    return Boolean(
      elemento.closest(
        "#lancamentos, #pix-lancamentos, #modalLancamento, #modalPixPresidente, #modalLancamentoPix, .launch-modal, .pix-dialog"
      )
    );
  }

  function aplicarBloqueioBotoes() {
    $$(
      "#lancamentos button, #pix-lancamentos button, #modalLancamento button, #modalPixPresidente button, #modalLancamentoPix button"
    ).forEach(botao => {
      if (botao.closest(".launch-lock-control, .lock-password-dialog")) return;
      if (!botaoEhAcaoLancamento(botao)) return;

      botao.classList.toggle("launch-action-locked", estado.bloqueado);
      botao.setAttribute("aria-disabled", String(estado.bloqueado));
      botao.title = estado.bloqueado ? "Bloqueado pelo diretor" : "";
    });
  }

  function atualizarVisual() {
    document.body.classList.toggle("lancamentos-bloqueados", estado.bloqueado);

    $$('[data-lock-module]').forEach(controle => {
      controle.classList.toggle("is-locked", estado.bloqueado);
      $("[data-lock-icon]", controle).textContent = estado.bloqueado ? "🔒" : "🔓";
      $("[data-lock-title]", controle).textContent = estado.bloqueado
        ? "Lançamentos bloqueados"
        : "Lançamentos liberados";
      const programacao = estado.programacao;

      $("[data-lock-description]", controle).textContent =
        estado.faseProgramacao === "bloqueio-programado"
          ? `Programado até ${formatarEpoch(programacao.liberarEmEpoch)}`
          : estado.faseProgramacao === "aguardando"
            ? `Bloqueio em ${formatarEpoch(programacao.bloquearEmEpoch)}`
            : estado.faseProgramacao === "concluida"
              ? `Programação concluída às ${formatarEpoch(programacao.liberarEmEpoch)}`
              : estado.bloqueado
                ? "Inclusão, edição e exclusão bloqueadas"
                : "Inclusão e edição permitidas";

      controle.classList.toggle(
        "has-schedule",
        Boolean(programacao.ativa)
      );

      const botaoProgramar =
        $("[data-lock-schedule]", controle);

      if (botaoProgramar) {
        botaoProgramar.classList.toggle(
          "is-active",
          Boolean(programacao.ativa)
        );

        botaoProgramar.innerHTML =
          programacao.ativa
            ? "<span>◷</span> Agendado"
            : "<span>◷</span> Programar";

        botaoProgramar.disabled =
          estado.carregando ||
          estado.salvando;
      }

      const botao = $("[data-lock-toggle]", controle);
      botao.textContent = estado.carregando
        ? "Carregando..."
        : estado.salvando
          ? "Salvando..."
          : estado.bloqueado
            ? "Liberar lançamentos"
            : "Bloquear lançamentos";
      botao.disabled = estado.carregando || estado.salvando;
    });

    aplicarBloqueioBotoes();
  }

  function bloquearClique(evento) {
    if (!estado.bloqueado) return;

    const botao = evento.target.closest("button, a");
    if (!botao || !dentroDeLancamentos(botao) || !botaoEhAcaoLancamento(botao)) return;

    evento.preventDefault();
    evento.stopPropagation();
    evento.stopImmediatePropagation();

    mostrarToast(
      "Os lançamentos estão bloqueados pelo diretor. Libere o módulo para continuar.",
      "warning"
    );
  }

  function bloquearSubmit(evento) {
    if (!estado.bloqueado) return;

    const form = evento.target;
    if (!form.matches("form") || !dentroDeLancamentos(form)) return;

    evento.preventDefault();
    evento.stopPropagation();
    evento.stopImmediatePropagation();

    mostrarToast(
      "Não é possível salvar alterações enquanto os lançamentos estiverem bloqueados.",
      "warning"
    );
  }

  async function iniciarEstado() {
    try {
      const snapshot = await getDoc(CONFIG_REF);

      if (!snapshot.exists()) {
        await setDoc(CONFIG_REF, {
          bloqueado: false,
          programacao: {
            ativa: false,
            bloquearEmEpoch: 0,
            liberarEmEpoch: 0,
            timezone: TIMEZONE_OPERACAO
          },
          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp()
        });
      }

      onSnapshot(
        CONFIG_REF,
        documento => {
          const dados =
            documento.data() || {};

          estado.bloqueadoManual =
            Boolean(
              dados.bloqueado
            );

          const programacao =
            dados.programacao || {};

          estado.programacao = {
            ativa:
              Boolean(
                programacao.ativa
              ),
            bloquearEmEpoch:
              Number(
                programacao.bloquearEmEpoch ||
                0
              ),
            liberarEmEpoch:
              Number(
                programacao.liberarEmEpoch ||
                0
              ),
            timezone:
              programacao.timezone ||
              TIMEZONE_OPERACAO
          };

          estado.carregando =
            false;

          sincronizarEstadoEfetivo();
          atualizarResumoProgramacaoModal();
        },
        erro => {
          console.error("Erro ao acompanhar bloqueio:", erro);
          estado.carregando = false;
          atualizarVisual();
          mostrarToast("Não foi possível sincronizar o bloqueio global.", "error");
        }
      );
    } catch (erro) {
      console.error("Erro ao iniciar bloqueio:", erro);
      estado.carregando = false;
      atualizarVisual();
      mostrarToast("Não foi possível carregar o estado do bloqueio.", "error");
    }
  }

  function iniciar() {
    garantirEstrutura();
    instalarControles();
    atualizarVisual();
    iniciarEstado();

    document.addEventListener("click", bloquearClique, true);
    document.addEventListener("submit", bloquearSubmit, true);

    new MutationObserver(() => {
      instalarControles();
      aplicarBloqueioBotoes();
    }).observe(document.body, { childList: true, subtree: true });

    document.addEventListener(
      "click",
      evento => {
        if (
          evento.target.closest(
            '[data-view="lancamentos"], [data-pix-view="lancamentos"], .nav-btn, .pix-menu-btn'
          )
        ) {
          setTimeout(() => {
            instalarControles();
            sincronizarEstadoEfetivo();
          }, 120);
        }
      },
      true
    );

    /*
     * Não é necessário um servidor ficar "rodando" no momento exato.
     * A programação é persistida no Firebase e cada cliente calcula
     * o estado correto ao abrir o sistema. Enquanto estiver aberto,
     * este relógio atualiza a transição automaticamente.
     */
    window.setInterval(
      sincronizarEstadoEfetivo,
      10000
    );

    document.addEventListener(
      "visibilitychange",
      () => {
        if (!document.hidden) {
          sincronizarEstadoEfetivo();
        }
      }
    );

    window.addEventListener(
      "focus",
      sincronizarEstadoEfetivo
    );

    window.bloqueioLancamentos = {
      get bloqueado() {
        return estado.bloqueado;
      },

      get programacao() {
        return {
          ...estado.programacao
        };
      },

      atualizar:
        sincronizarEstadoEfetivo,

      abrirProgramacao:
        abrirModalProgramacao
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();