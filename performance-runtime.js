(() => {
  "use strict";

  const root = document.documentElement;

  /*
   * Evita trabalho visual desnecessário quando a aba não está visível.
   * Não pausa Supabase/Firebase nem dados.
   */
  function atualizarVisibilidade() {
    root.classList.toggle(
      "app-tab-hidden",
      document.hidden
    );
  }

  document.addEventListener(
    "visibilitychange",
    atualizarVisibilidade,
    { passive: true }
  );

  atualizarVisibilidade();

  /*
   * Permite que elementos ocultos por módulos não participem de pintura
   * e composição até voltarem a ficar visíveis.
   */
  const style = document.createElement("style");
  style.id = "performance-runtime-css";
  style.textContent = `
    .view:not(.active),
    .pix-subview:not(.active) {
      content-visibility: hidden;
    }

    .app-tab-hidden *,
    .app-tab-hidden *::before,
    .app-tab-hidden *::after {
      animation-play-state: paused !important;
    }

    @media (max-width: 760px) {
      .table-wrap,
      [class*="table-wrap"],
      [class*="table-container"] {
        contain: inline-size;
      }
    }
  `;
  document.head.appendChild(style);

  /*
   * Marca de telemetria local: não envia nada para servidor.
   * Ajuda a comparar versões pelo console.
   */
  window.addEventListener(
    "load",
    () => {
      try {
        const nav =
          performance.getEntriesByType("navigation")[0];

        if (!nav) return;

        const metricas = {
          domInteractive:
            Math.round(nav.domInteractive),
          domContentLoaded:
            Math.round(nav.domContentLoadedEventEnd),
          load:
            Math.round(nav.loadEventEnd),
          transferSize:
            nav.transferSize || 0
        };

        window.__CAMPANHAS_PERFORMANCE__ =
          metricas;

        console.info(
          "[PERFORMANCE V3]",
          metricas
        );
      } catch (_) {}
    },
    { once: true }
  );
})();
