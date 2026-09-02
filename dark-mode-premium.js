/* ================================================================
   MODO NOTURNO PREMIUM — CAMPANHAS PÓS-VENDAS
   Persistência local + preferência do sistema + toggle global.
   ================================================================ */
(() => {
  const STORAGE_KEY = "campanhas_theme_v1";
  const root = document.documentElement;

  function getInitialTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme, persist = false) {
    root.dataset.theme = theme;
    root.classList.add("theme-transitioning");
    if (persist) localStorage.setItem(STORAGE_KEY, theme);

    const btn = document.getElementById("themePremiumToggle");
    if (btn) {
      const dark = theme === "dark";
      btn.setAttribute("aria-pressed", String(dark));
      btn.setAttribute("aria-label", dark ? "Ativar modo claro" : "Ativar modo noturno");
      btn.title = dark ? "Mudar para modo claro" : "Mudar para modo noturno";
    }

    const label = document.getElementById("themePremiumLabel");
    if (label) label.textContent = theme === "dark" ? "Modo noturno" : "Modo claro";

    window.clearTimeout(applyTheme._timer);
    applyTheme._timer = window.setTimeout(() => root.classList.remove("theme-transitioning"), 320);

    window.dispatchEvent(new CustomEvent("campanhas:themechange", { detail: { theme } }));
  }

  // Aplicação imediata para reduzir flash da interface clara.
  applyTheme(getInitialTheme(), false);

  function installToggle() {
    if (document.getElementById("themePremiumToggle")) return;

    const wrap = document.createElement("div");
    wrap.className = "theme-premium-wrap";
    wrap.innerHTML = `
      <span class="theme-premium-label" id="themePremiumLabel"></span>
      <button
        type="button"
        class="theme-premium-toggle"
        id="themePremiumToggle"
        aria-label="Alternar tema"
        aria-pressed="false">
      </button>
    `;

    const topbarActions = document.querySelector(".topbar-actions");
    const topbar = document.querySelector(".topbar");

    if (topbarActions) {
      topbarActions.appendChild(wrap);
    } else if (topbar) {
      topbar.appendChild(wrap);
    } else {
      document.body.appendChild(wrap);
    }

    const btn = wrap.querySelector("#themePremiumToggle");
    btn.addEventListener("click", () => {
      applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
    });

    applyTheme(root.dataset.theme || getInitialTheme(), false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installToggle, { once: true });
  } else {
    installToggle();
  }

  // Atalho: Alt + D
  document.addEventListener("keydown", (event) => {
    if (event.altKey && event.key.toLowerCase() === "d") {
      event.preventDefault();
      applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
    }
  });

  // Se o usuário ainda não escolheu manualmente, acompanha o sistema operacional.
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = (event) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(event.matches ? "dark" : "light", false);
      }
    };
    if (mq.addEventListener) mq.addEventListener("change", onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);
  }

  window.CampanhasTheme = {
    setDark: () => applyTheme("dark", true),
    setLight: () => applyTheme("light", true),
    toggle: () => applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true),
    current: () => root.dataset.theme
  };
})();
