/* ================================================================
   TEMA PREMIUM ESTÁVEL V4 — CAMPANHAS PÓS-VENDAS
   ---------------------------------------------------------------
   Objetivos:
   - uma única fonte de verdade para o tema;
   - eliminar alternância/piscadas claro ↔ escuro;
   - não acompanhar mudanças do sistema operacional durante a sessão;
   - transição visual SOMENTE quando o usuário clica no toggle;
   - persistência estável em localStorage.
   ================================================================ */
(() => {
  "use strict";

  const STORAGE_KEY = "campanhas_theme_v1";
  const root = document.documentElement;

  /*
   * O tema é decidido uma única vez no boot.
   *
   * Prioridade:
   * 1. escolha já salva pelo usuário;
   * 2. preferência do sistema SOMENTE na primeira visita;
   * 3. claro como fallback.
   *
   * Depois disso a escolha é persistida, evitando que Windows,
   * navegador, DevTools ou mudança de preferência do SO disputem
   * o controle do tema durante a sessão.
   */
  function resolveInitialTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved === "dark" || saved === "light") {
      return saved;
    }

    const systemDark =
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches === true;

    const initial = systemDark ? "dark" : "light";

    try {
      localStorage.setItem(STORAGE_KEY, initial);
    } catch (_) {}

    return initial;
  }

  function syncControls(theme) {
    const dark = theme === "dark";

    const btn =
      document.getElementById("themePremiumToggle");

    if (btn) {
      btn.setAttribute(
        "aria-pressed",
        String(dark)
      );

      btn.setAttribute(
        "aria-label",
        dark
          ? "Ativar modo claro"
          : "Ativar modo noturno"
      );

      btn.title =
        dark
          ? "Mudar para modo claro"
          : "Mudar para modo noturno";
    }

    const label =
      document.getElementById(
        "themePremiumLabel"
      );

    if (label) {
      label.textContent =
        dark
          ? "Modo noturno"
          : "Modo claro";
    }
  }

  function setTheme(
    theme,
    {
      persist = true,
      animate = false,
      notify = true
    } = {}
  ) {
    if (theme !== "dark" && theme !== "light") {
      return;
    }

    const changed =
      root.dataset.theme !== theme;

    /*
     * Nunca adicionamos a classe de transição no boot.
     * Ela só existe numa troca manual e por poucos milissegundos.
     */
    if (animate && changed) {
      root.classList.add(
        "theme-transitioning"
      );
    }

    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    if (persist) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          theme
        );
      } catch (_) {}
    }

    syncControls(theme);

    if (notify && changed) {
      window.dispatchEvent(
        new CustomEvent(
          "campanhas:themechange",
          {
            detail: {
              theme,
              manual: animate
            }
          }
        )
      );
    }

    if (animate && changed) {
      window.clearTimeout(
        setTheme._transitionTimer
      );

      setTheme._transitionTimer =
        window.setTimeout(
          () => {
            root.classList.remove(
              "theme-transitioning"
            );
          },
          260
        );
    } else {
      root.classList.remove(
        "theme-transitioning"
      );
    }
  }

  /*
   * Aplicação imediata.
   * Este arquivo é carregado no <head>, antes dos CSS principais.
   */
  const initialTheme =
    resolveInitialTheme();

  setTheme(
    initialTheme,
    {
      persist: false,
      animate: false,
      notify: false
    }
  );

  function installToggle() {
    let wrap =
      document.querySelector(
        ".theme-premium-wrap"
      );

    if (!wrap) {
      wrap =
        document.createElement("div");

      wrap.className =
        "theme-premium-wrap";

      wrap.innerHTML = `
        <span
          class="theme-premium-label"
          id="themePremiumLabel"
        ></span>

        <button
          type="button"
          class="theme-premium-toggle"
          id="themePremiumToggle"
          aria-label="Alternar tema"
          aria-pressed="false"
        ></button>
      `;

      const topbarActions =
        document.querySelector(
          ".topbar-actions"
        );

      const topbar =
        document.querySelector(
          ".topbar"
        );

      if (topbarActions) {
        topbarActions.appendChild(wrap);
      } else if (topbar) {
        topbar.appendChild(wrap);
      } else {
        document.body.appendChild(wrap);
      }
    }

    const btn =
      document.getElementById(
        "themePremiumToggle"
      );

    if (
      btn &&
      btn.dataset.themeBound !== "1"
    ) {
      btn.dataset.themeBound = "1";

      btn.addEventListener(
        "click",
        () => {
          const next =
            root.dataset.theme === "dark"
              ? "light"
              : "dark";

          setTheme(
            next,
            {
              persist: true,
              animate: true,
              notify: true
            }
          );
        }
      );
    }

    /*
     * Apenas sincroniza o texto/estado.
     * NÃO reaplica o tema e NÃO dispara transição.
     */
    syncControls(
      root.dataset.theme ||
      initialTheme
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      installToggle,
      { once: true }
    );
  } else {
    installToggle();
  }

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.altKey &&
        event.key.toLowerCase() === "d"
      ) {
        event.preventDefault();

        const next =
          root.dataset.theme === "dark"
            ? "light"
            : "dark";

        setTheme(
          next,
          {
            persist: true,
            animate: true,
            notify: true
          }
        );
      }
    }
  );

  /*
   * Não existe listener de prefers-color-scheme aqui de propósito.
   * O sistema operacional não pode trocar o tema no meio da sessão.
   */

  window.CampanhasTheme =
    Object.freeze({
      setDark: () =>
        setTheme(
          "dark",
          {
            persist: true,
            animate: true,
            notify: true
          }
        ),

      setLight: () =>
        setTheme(
          "light",
          {
            persist: true,
            animate: true,
            notify: true
          }
        ),

      toggle: () =>
        setTheme(
          root.dataset.theme === "dark"
            ? "light"
            : "dark",
          {
            persist: true,
            animate: true,
            notify: true
          }
        ),

      current: () =>
        root.dataset.theme,

      resetToSystem: () => {
        try {
          localStorage.removeItem(
            STORAGE_KEY
          );
        } catch (_) {}

        const next =
          window.matchMedia?.(
            "(prefers-color-scheme: dark)"
          )?.matches
            ? "dark"
            : "light";

        setTheme(
          next,
          {
            persist: true,
            animate: true,
            notify: true
          }
        );
      }
    });
})();
