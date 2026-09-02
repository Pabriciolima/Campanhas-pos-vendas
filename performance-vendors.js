(() => {
  "use strict";

  const urls = {
    excel:
      "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js",
    pdf:
      "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js",
    pdfTable:
      "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js",
    xlsx:
      "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
  };

  const promises = new Map();

  function loadScript(key, src, test) {
    if (test()) return Promise.resolve(true);
    if (promises.has(key)) return promises.get(key);

    const promise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-perf-vendor="${key}"]`);

      if (existing) {
        existing.addEventListener("load", () => resolve(true), { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.perfVendor = key;

      script.addEventListener(
        "load",
        () => resolve(true),
        { once: true }
      );

      script.addEventListener(
        "error",
        () => {
          promises.delete(key);
          reject(new Error(`Falha ao carregar biblioteca: ${key}`));
        },
        { once: true }
      );

      document.head.appendChild(script);
    });

    promises.set(key, promise);
    return promise;
  }

  async function ensureExcel() {
    return loadScript(
      "exceljs",
      urls.excel,
      () => Boolean(window.ExcelJS)
    );
  }

  async function ensurePdf() {
    await loadScript(
      "jspdf",
      urls.pdf,
      () => Boolean(window.jspdf?.jsPDF)
    );

    await loadScript(
      "jspdf-autotable",
      urls.pdfTable,
      () =>
        Boolean(
          window.jspdf?.jsPDF?.API?.autoTable ||
          window.jspdf?.jsPDF?.API?.lastAutoTable
        )
    );

    return true;
  }

  async function ensureXlsx() {
    return loadScript(
      "xlsx",
      urls.xlsx,
      () => Boolean(window.XLSX)
    );
  }

  async function ensure(kind) {
    if (kind === "excel") return ensureExcel();
    if (kind === "pdf") return ensurePdf();
    if (kind === "xlsx") return ensureXlsx();

    if (kind === "all") {
      await Promise.all([
        ensureExcel(),
        ensureXlsx(),
        ensurePdf()
      ]);
      return true;
    }

    return true;
  }

  function vendorForButton(button) {
    const assinatura = [
      button.id,
      button.className,
      button.getAttribute("aria-label"),
      button.getAttribute("title"),
      button.textContent
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (
      assinatura.includes("pdf")
    ) {
      return "pdf";
    }

    if (
      assinatura.includes("excel")
    ) {
      return "excel";
    }

    if (
      assinatura.includes("import") ||
      assinatura.includes("xlsx") ||
      assinatura.includes("xls") ||
      assinatura.includes("modelo")
    ) {
      /*
       * Os importadores atuais usam XLSX; alguns modelos usam ExcelJS.
       * Carregamos os dois somente quando o usuário solicitar esta ação.
       */
      return "import";
    }

    return "";
  }

  let replaying = false;

  document.addEventListener(
    "click",
    async event => {
      if (replaying) return;

      const button =
        event.target.closest?.(
          "button,a,[role='button']"
        );

      if (!button) return;

      const kind = vendorForButton(button);
      if (!kind) return;

      const needsExcel =
        kind === "excel" ||
        kind === "import";

      const needsXlsx =
        kind === "import";

      const needsPdf =
        kind === "pdf";

      const ready =
        (!needsExcel || window.ExcelJS) &&
        (!needsXlsx || window.XLSX) &&
        (!needsPdf || window.jspdf?.jsPDF);

      if (ready) return;

      /*
       * Intercepta ANTES dos listeners/onclick já existentes.
       * Depois das bibliotecas carregarem, refaz exatamente o mesmo clique.
       */
      event.preventDefault();
      event.stopImmediatePropagation();

      const estavaDesabilitado = button.disabled;
      const textoOriginal = button.innerHTML;

      if ("disabled" in button) {
        button.disabled = true;
      }

      button.setAttribute("aria-busy", "true");

      try {
        const jobs = [];

        if (needsExcel) jobs.push(ensureExcel());
        if (needsXlsx) jobs.push(ensureXlsx());
        if (needsPdf) jobs.push(ensurePdf());

        await Promise.all(jobs);

        replaying = true;

        if ("disabled" in button) {
          button.disabled = estavaDesabilitado;
        }

        button.removeAttribute("aria-busy");
        button.click();
      } catch (error) {
        console.error(
          "[PERFORMANCE] Falha ao carregar biblioteca sob demanda:",
          error
        );

        button.removeAttribute("aria-busy");

        if ("disabled" in button) {
          button.disabled = estavaDesabilitado;
        }

        window.CampanhaUI?.alert?.(
          "Não foi possível preparar a biblioteca necessária. Verifique a internet e tente novamente.",
          {
            tipo: "erro",
            titulo: "Recurso indisponível"
          }
        );
      } finally {
        replaying = false;
        if (button.innerHTML !== textoOriginal && !button.disabled) {
          // Não força texto: os módulos podem ter atualizado o botão.
        }
      }
    },
    true
  );

  /*
   * Preload ocioso: depois que a tela já está utilizável, aproveita
   * tempo ocioso do navegador para deixar exportações prontas.
   */
  function preloadIdle() {
    if (
      navigator.connection?.saveData ||
      ["slow-2g", "2g"].includes(
        navigator.connection?.effectiveType
      )
    ) {
      return;
    }

    const carregar = () => {
      Promise.allSettled([
        ensureExcel(),
        ensureXlsx()
      ]);
    };

    if ("requestIdleCallback" in window) {
      requestIdleCallback(carregar, {
        timeout: 8000
      });
    } else {
      setTimeout(carregar, 4500);
    }
  }

  if (document.readyState === "complete") {
    preloadIdle();
  } else {
    window.addEventListener(
      "load",
      preloadIdle,
      { once: true }
    );
  }

  window.CampanhasVendors = Object.freeze({
    ensure,
    excel: ensureExcel,
    pdf: ensurePdf,
    xlsx: ensureXlsx
  });
})();
