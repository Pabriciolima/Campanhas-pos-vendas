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
    bloqueado: false,
    carregando: true,
    salvando: false
  };

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

        <div id="toastBloqueioLancamentos" class="lock-toast" aria-live="polite"></div>
      `
    );

    configurarModal();
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

    controle.querySelector("[data-lock-toggle]").addEventListener("click", alternarBloqueio);
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

      await setDoc(
        CONFIG_REF,
        {
          bloqueado: novoEstado,
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
      $("[data-lock-description]", controle).textContent = estado.bloqueado
        ? "Inclusão, edição e exclusão bloqueadas"
        : "Inclusão e edição permitidas";

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
          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp()
        });
      }

      onSnapshot(
        CONFIG_REF,
        documento => {
          estado.bloqueado = Boolean(documento.data()?.bloqueado);
          estado.carregando = false;
          atualizarVisual();
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
            atualizarVisual();
          }, 120);
        }
      },
      true
    );

    window.bloqueioLancamentos = {
      get bloqueado() {
        return estado.bloqueado;
      },
      atualizar: atualizarVisual
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();