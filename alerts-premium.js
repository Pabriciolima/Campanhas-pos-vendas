/* ALERTAS PREMIUM — SISTEMA DE CAMPANHAS PÓS-VENDAS */
(() => {
  "use strict";

  const fila = [];
  let exibindo = false;

  const icones = {
    success:
      '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error:
      '<svg viewBox="0 0 24 24"><path d="M12 8v5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17" r="1.2" fill="currentColor"/><path d="M10.3 3.7 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    warning:
      '<svg viewBox="0 0 24 24"><path d="M12 8v5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17" r="1.2" fill="currentColor"/><path d="M10.3 3.7 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1.2" fill="currentColor"/></svg>',
    question:
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.8 9.2a2.4 2.4 0 0 1 4.6 1c0 1.8-2.4 2-2.4 3.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.1" fill="currentColor"/></svg>',
  };

  const $ = (seletor) => document.querySelector(seletor);

  function garantirEstrutura() {
    if ($("#appAlertOverlay")) return;

    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <div id="appAlertOverlay" class="app-alert-overlay" aria-hidden="true">
        <section id="appAlertCard" class="app-alert-card" role="alertdialog" aria-modal="true" aria-labelledby="appAlertTitle" aria-describedby="appAlertMessage">
          <button type="button" id="appAlertClose" class="app-alert-close" aria-label="Fechar">×</button>
          <div id="appAlertIcon" class="app-alert-icon"></div>
          <div class="app-alert-content">
            <span id="appAlertLabel" class="app-alert-label">Sistema</span>
            <h2 id="appAlertTitle">Informação</h2>
            <p id="appAlertMessage"></p>
          </div>
          <div id="appAlertActions" class="app-alert-actions"></div>
        </section>
      </div>
      <div id="appToastContainer" class="app-toast-container" aria-live="polite" aria-atomic="true"></div>
    `,
    );
  }

  function inferirTipo(mensagem) {
    const texto = String(mensagem ?? "").toLowerCase();
    if (
      /sucesso|salvo|cadastrado|criado|atualizado|enviado|exclu[ií]do/.test(
        texto,
      )
    )
      return "success";
    if (
      /erro|falha|não foi possível|nao foi possivel|inválido|invalido/.test(
        texto,
      )
    )
      return "error";
    if (/atenção|atencao|aviso|selecione|limite|nenhum/.test(texto))
      return "warning";
    return "info";
  }

  function tituloPadrao(tipo) {
    return (
      {
        success: "Tudo certo!",
        error: "Algo deu errado",
        warning: "Atenção",
        info: "Informação",
        question: "Confirmação",
      }[tipo] || "Informação"
    );
  }

  function rotuloPadrao(tipo) {
    return (
      {
        success: "Concluído",
        error: "Erro",
        warning: "Aviso",
        info: "Sistema",
        question: "Confirme a ação",
      }[tipo] || "Sistema"
    );
  }

  function normalizarOpcoes(opcoes = {}) {
    const mensagem =
      typeof opcoes === "string"
        ? opcoes
        : opcoes.message || opcoes.mensagem || "";
    const tipo = opcoes.type || opcoes.tipo || inferirTipo(mensagem);
    return {
      tipo,
      titulo: opcoes.title || opcoes.titulo || tituloPadrao(tipo),
      rotulo: opcoes.label || opcoes.rotulo || rotuloPadrao(tipo),
      mensagem,
      textoConfirmar: opcoes.confirmText || opcoes.textoConfirmar || "Entendi",
      textoCancelar: opcoes.cancelText || opcoes.textoCancelar || "Cancelar",
      mostrarCancelar: Boolean(opcoes.showCancel || opcoes.mostrarCancelar),
      fecharAoClicarFora:
        opcoes.closeOnBackdrop !== false && opcoes.fecharAoClicarFora !== false,
    };
  }

  function fecharAlerta(resultado = true) {
    const overlay = $("#appAlertOverlay");
    const card = $("#appAlertCard");
    if (!overlay || !card) return;

    overlay.classList.remove("is-visible");
    card.classList.remove("is-visible");

    setTimeout(() => {
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("app-alert-open");
      const atual = fila.shift();
      if (atual) atual.resolve(resultado);
      exibindo = false;
      processarFila();
    }, 220);
  }

  function processarFila() {
    if (exibindo || !fila.length) return;
    exibindo = true;
    garantirEstrutura();

    const item = fila[0];
    const opcoes = normalizarOpcoes(item.opcoes);
    const overlay = $("#appAlertOverlay");
    const card = $("#appAlertCard");
    const icon = $("#appAlertIcon");
    const label = $("#appAlertLabel");
    const title = $("#appAlertTitle");
    const message = $("#appAlertMessage");
    const actions = $("#appAlertActions");
    const close = $("#appAlertClose");

    card.className = `app-alert-card type-${opcoes.tipo}`;
    icon.className = `app-alert-icon type-${opcoes.tipo}`;
    icon.innerHTML = icones[opcoes.tipo] || icones.info;
    label.textContent = opcoes.rotulo;
    title.textContent = opcoes.titulo;
    message.textContent = opcoes.mensagem;
    actions.innerHTML = "";

    if (opcoes.mostrarCancelar) {
      const cancelar = document.createElement("button");
      cancelar.type = "button";
      cancelar.className = "app-alert-button secondary";
      cancelar.textContent = opcoes.textoCancelar;
      cancelar.addEventListener("click", () => fecharAlerta(false), {
        once: true,
      });
      actions.appendChild(cancelar);
    }

    const confirmar = document.createElement("button");
    confirmar.type = "button";
    confirmar.className = "app-alert-button primary";
    confirmar.textContent = opcoes.textoConfirmar;
    confirmar.addEventListener("click", () => fecharAlerta(true), {
      once: true,
    });
    actions.appendChild(confirmar);

    close.onclick = () => fecharAlerta(false);
    overlay.onclick = (evento) => {
      if (evento.target === overlay && opcoes.fecharAoClicarFora)
        fecharAlerta(false);
    };

    document.body.classList.add("app-alert-open");
    overlay.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      overlay.classList.add("is-visible");
      card.classList.add("is-visible");
      confirmar.focus();
    });
  }

  function appAlert(opcoes) {
    return new Promise((resolve) => {
      fila.push({ opcoes, resolve });
      processarFila();
    });
  }

  function appConfirm(opcoes = {}) {
    const base = typeof opcoes === "string" ? { mensagem: opcoes } : opcoes;
    return appAlert({
      ...base,
      tipo: base.tipo || "question",
      mostrarCancelar: true,
      textoConfirmar: base.textoConfirmar || base.confirmText || "Confirmar",
      textoCancelar: base.textoCancelar || base.cancelText || "Cancelar",
    });
  }

  function appToast(opcoes) {
    garantirEstrutura();
    const config =
      typeof opcoes === "string" ? { mensagem: opcoes } : opcoes || {};
    const mensagem = config.message || config.mensagem || "";
    const tipo = config.type || config.tipo || inferirTipo(mensagem);
    const duracao = Number(config.duration || config.duracao || 3500);
    const container = $("#appToastContainer");
    const toast = document.createElement("article");

    toast.className = `app-toast type-${tipo}`;
    toast.innerHTML = `
      <div class="app-toast-icon">${icones[tipo] || icones.info}</div>
      <div class="app-toast-content"><strong>${config.titulo || tituloPadrao(tipo)}</strong><span></span></div>
      <button type="button" class="app-toast-close" aria-label="Fechar">×</button>
      <div class="app-toast-progress"></div>
    `;

    toast.querySelector(".app-toast-content span").textContent = mensagem;
    const remover = () => {
      toast.classList.remove("is-visible");
      setTimeout(() => toast.remove(), 220);
    };
    toast
      .querySelector(".app-toast-close")
      .addEventListener("click", remover, { once: true });
    toast.querySelector(".app-toast-progress").style.animationDuration =
      `${duracao}ms`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    setTimeout(remover, duracao);
    return toast;
  }

  window.nativeAlert = window.alert.bind(window);
  window.alert = (mensagem) => {
    appAlert({ mensagem: String(mensagem ?? "") });
    return undefined;
  };

  window.appAlert = appAlert;
  window.appConfirm = appConfirm;
  window.appToast = appToast;

  document.addEventListener("keydown", (evento) => {
    if (
      evento.key === "Escape" &&
      $("#appAlertOverlay")?.classList.contains("is-visible")
    )
      fecharAlerta(false);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", garantirEstrutura, {
      once: true,
    });
  } else {
    garantirEstrutura();
  }
})();
