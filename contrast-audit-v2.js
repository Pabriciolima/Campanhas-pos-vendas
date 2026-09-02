/* =====================================================================
   AUDITOR AUTOMÁTICO DE CONTRASTE + RESPONSIVIDADE
   Detecta texto dinâmico que módulos antigos/injetados deixam ilegível.
   Não altera dados, eventos ou regras do sistema.
   ===================================================================== */
(() => {
  const MIN_NORMAL = 4.5;
  const MIN_LARGE = 3.0;
  let scheduled = false;

  function parseColor(value) {
    if (!value || value === "transparent") return null;
    const m = value.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\)/i);
    if (!m) return null;
    return {
      r: Number(m[1]), g: Number(m[2]), b: Number(m[3]),
      a: m[4] == null ? 1 : Number(m[4])
    };
  }

  function composite(fg, bg) {
    const a = fg.a + bg.a * (1 - fg.a);
    if (!a) return { r:0,g:0,b:0,a:0 };
    return {
      r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
      g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
      b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
      a
    };
  }

  function backgroundOf(el) {
    let current = el;
    let result = { r:255,g:255,b:255,a:1 };
    const stack = [];
    while (current && current.nodeType === 1) {
      const c = parseColor(getComputedStyle(current).backgroundColor);
      if (c && c.a > 0) stack.push(c);
      current = current.parentElement;
    }
    const dark = document.documentElement.dataset.theme === "dark";
    result = dark ? {r:7,g:16,b:28,a:1} : {r:255,g:255,b:255,a:1};
    for (let i = stack.length - 1; i >= 0; i--) result = composite(stack[i], result);
    return result;
  }

  function channel(v) {
    v /= 255;
    return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
  }

  function luminance(c) {
    return .2126 * channel(c.r) + .7152 * channel(c.g) + .0722 * channel(c.b);
  }

  function contrast(a, b) {
    const l1 = luminance(a), l2 = luminance(b);
    return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
  }

  function hasReadableText(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.closest("svg,canvas,script,style,noscript")) return false;
    if (el.hidden) return false;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (Number(style.opacity) < .25) return false;
    const ownText = Array.from(el.childNodes).some(
      n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length
    );
    const isControl = /^(BUTTON|A|LABEL|TH|TD|OPTION)$/.test(el.tagName);
    return ownText || isControl;
  }

  function isIntentionalBrandColor(el) {
    return !!el.closest(
      ".brand-mark,.module-icon-crm,.module-icon-garantia," +
      ".badge,.status,[class*='badge'],[class*='status']," +
      ".primary,.danger,.warning,.success,[class*='export-button']," +
      "[class*='place-chip'],[class*='crown'],[class*='icon']"
    );
  }

  function auditElement(el) {
    el.removeAttribute("data-contrast-auto");
    if (!hasReadableText(el)) return;

    const style = getComputedStyle(el);
    const fg = parseColor(style.color);
    if (!fg) return;
    const bg = backgroundOf(el);

    const px = parseFloat(style.fontSize) || 16;
    const weight = parseInt(style.fontWeight, 10) || 400;
    const large = px >= 24 || (px >= 18.66 && weight >= 700);
    const required = large ? MIN_LARGE : MIN_NORMAL;
    const ratio = contrast(fg, bg);

    if (ratio >= required) return;

    const bgLum = luminance(bg);
    const darkTheme = document.documentElement.dataset.theme === "dark";
    const muted = px <= 12 && weight < 700;
    const intentional = isIntentionalBrandColor(el);

    // Para cores de marca, só intervém quando o contraste é realmente ruim.
    if (intentional && ratio >= 3.0) return;

    if (bgLum < .42) {
      el.setAttribute("data-contrast-auto", muted ? "muted-light" : "light-text");
    } else {
      el.setAttribute("data-contrast-auto", muted ? "muted-dark" : "dark-text");
    }
  }

  function auditAll() {
    scheduled = false;
    const root = document.querySelector(".main") || document.body;
    if (!root) return;
    const elements = root.querySelectorAll(
      "h1,h2,h3,h4,h5,h6,p,span,small,strong,b,em,label,a,button,th,td,li"
    );
    elements.forEach(auditElement);
  }

  function scheduleAudit() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => requestAnimationFrame(auditAll));
  }

  window.addEventListener("campanhas:themechange", scheduleAudit);
  window.addEventListener("resize", scheduleAudit);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleAudit, { once: true });
  } else {
    scheduleAudit();
  }

  // Conteúdo dos módulos é criado dinamicamente; revalida apenas após mutações.
  const observer = new MutationObserver((mutations) => {
    if (mutations.some(m => m.addedNodes.length || m.type === "characterData" || m.attributeName === "class")) {
      scheduleAudit();
    }
  });

  const startObserver = () => {
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class","style","hidden","disabled"]
    });
  };

  if (document.body) startObserver();
  else document.addEventListener("DOMContentLoaded", startObserver, { once: true });

  window.ContrastAudit = {
    run: auditAll,
    schedule: scheduleAudit
  };
})();
