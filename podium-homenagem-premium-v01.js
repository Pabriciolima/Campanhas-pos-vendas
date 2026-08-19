
(() => {
  "use strict";

  const VERSAO = "2026.08.19-01";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const texto = v => String(v ?? "").replace(/\s+/g, " ").trim();
  const escapar = v => String(v ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function competencia(podium) {
    const p = texto($(".podium-head p", podium)?.textContent);
    return p.match(/\b(20\d{2}-\d{2})\b/)?.[1]
      || $("#competenciaGlobal")?.value
      || $("#pixDashboardCompetencia")?.value
      || $("#pixFiltroCompetencia")?.value
      || "";
  }

  function competenciaExtenso(v) {
    if (!/^\d{4}-\d{2}$/.test(v)) return v || "Competência atual";
    const [a, m] = v.split("-");
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    return `${meses[Number(m)-1]} de ${a}`;
  }

  function extrair(card, posicao) {
    if (!card || card.classList.contains("podium-vazio")) return null;
    const nome = texto($("h3", card)?.textContent);
    if (!nome) return null;
    return {
      posicao,
      nome,
      cargo: texto($(":scope > p", card)?.textContent),
      filial: texto($(".podium-filial", card)?.textContent),
      valor: texto($(".podium-valor strong", card)?.textContent),
      meta: texto($(".podium-meta", card)?.textContent),
      bandeira: $("img", card)?.src || ""
    };
  }

  function colocados(podium) {
    const cards = $$(".podium-card", podium);
    return [
      extrair(cards.find(c => c.classList.contains("podium-ouro")), 1),
      extrair(cards.find(c => c.classList.contains("podium-prata")), 2),
      extrair(cards.find(c => c.classList.contains("podium-bronze")), 3)
    ].filter(Boolean);
  }

  function coroa(pos) {
    const cls = pos === 1 ? "ouro" : pos === 2 ? "prata" : "bronze";
    return `<svg class="coroa ${cls}" viewBox="0 0 64 48"><path d="M7 36 4 12l14 11L31 5l14 18 15-11-4 24H7Z" fill="currentColor"/><path d="M9 39h46v5H9z" fill="currentColor"/><circle cx="4" cy="9" r="4" fill="currentColor"/><circle cx="31" cy="4" r="4" fill="currentColor"/><circle cx="60" cy="9" r="4" fill="currentColor"/></svg>`;
  }

  function frase(pos) {
    if (pos === 1) return "Seu resultado representa excelência, dedicação e compromisso. Parabéns por alcançar o topo e inspirar toda a equipe!";
    if (pos === 2) return "Seu desempenho é motivo de reconhecimento. Parabéns por transformar esforço em resultado e estar entre os grandes destaques do mês!";
    return "Seu trabalho e sua consistência fizeram a diferença. Parabéns por conquistar seu lugar entre os destaques e elevar o nosso padrão!";
  }

  function card(p) {
    const cls = p.posicao === 1 ? "ouro" : p.posicao === 2 ? "prata" : "bronze";
    return `<article class="premiado ${cls}">
      <div class="coroa-box">${coroa(p.posicao)}</div>
      ${p.bandeira ? `<img class="flag" src="${escapar(p.bandeira)}" alt="Bandeira">` : ""}
      <span class="pos">${p.posicao}º LUGAR</span>
      <h2>${escapar(p.nome)}</h2>
      <p class="cargo">${escapar(p.cargo || "Colaborador")}</p>
      <div class="filial">${escapar(p.filial || "")}</div>
      <div class="linha"></div>
      <small>FATURAMENTO DO MÊS</small>
      <strong class="valor">${escapar(p.valor || "—")}</strong>
      ${p.meta ? `<div class="meta">${escapar(p.meta)}</div>` : ""}
      <p class="mensagem">${escapar(frase(p.posicao))}</p>
    </article>`;
  }

  function htmlImpressao(podium) {
    const tipo = podium.dataset.podiumTipo || (podium.id.toLowerCase().includes("pix") ? "pix" : "produtivos");
    const modulo = tipo === "pix" ? "Pix do Presidente" : "Campanha dos Produtivos";
    const comp = competencia(podium);
    const periodo = competenciaExtenso(comp);
    const modo = $("[data-podium-modo]", podium)?.value === "filial"
      ? `Pódio da filial ${$("[data-podium-filial]", podium)?.value || ""}`
      : "Pódio Geral";
    const lista = colocados(podium);
    if (!lista.length) return "";

    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
    <title>Homenagem — ${escapar(modulo)}</title>
    <style>
      @page{size:A4 landscape;margin:0}
      *{box-sizing:border-box}
      html,body{margin:0;font-family:Segoe UI,Arial,sans-serif;color:#102b3e;background:#eef3f5;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      body{padding:16px}
      .folha{width:297mm;min-height:210mm;margin:auto;position:relative;overflow:hidden;background:radial-gradient(circle at 10% 8%,rgba(7,132,94,.10),transparent 25%),radial-gradient(circle at 88% 7%,rgba(211,166,33,.12),transparent 24%),linear-gradient(145deg,#fff,#fbfdfd 55%,#f5f9fa)}
      .faixa{height:5px;background:linear-gradient(90deg,#c89a16 0 33.33%,#aeb9c2 33.33% 66.66%,#ad6739 66.66%)}
      .water{position:absolute;right:-6mm;top:8mm;font-size:48mm;font-weight:950;color:rgba(13,52,77,.035)}
      .conteudo{position:relative;z-index:2;padding:11mm 15mm 8mm}
      .cab{display:flex;justify-content:space-between;gap:10mm}.eyebrow{color:#087b59;font-size:8pt;font-weight:900;letter-spacing:.15em}.eyebrow:before{content:"";display:inline-block;width:2mm;height:2mm;margin-right:2mm;border-radius:50%;background:#d3a621}
      h1{margin:2mm 0 0;font-size:23pt;color:#0e2d43}.sub{margin-top:2mm;color:#687f8e;font-size:9pt}.selo{padding:3.5mm 5mm;border:1px solid #d9e4e9;border-radius:4mm;background:#fff}.selo small{display:block;color:#8899a4;font-size:6pt}.selo strong{font-size:10pt}
      .intro{text-align:center;margin:5mm auto 0;max-width:225mm}.intro strong{font:700 13pt Georgia,serif;color:#16384f}.intro p{margin:1.5mm 0 0;color:#718591;font-size:8pt}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;align-items:end;margin-top:10mm}
      .premiado{position:relative;min-height:112mm;padding:15mm 5mm 5mm;border:1px solid #dce6eb;border-radius:5mm;background:#fff;text-align:center;box-shadow:0 4mm 10mm rgba(18,47,67,.08)}
      .premiado.ouro{min-height:121mm;border-color:#dfc25f;background:radial-gradient(circle at 50% 0,rgba(232,187,49,.18),transparent 31%),linear-gradient(180deg,#fffaf0,#fff 51%)}
      .premiado.prata{background:radial-gradient(circle at 50% 0,rgba(168,181,192,.18),transparent 30%),linear-gradient(180deg,#f8fafb,#fff 52%)}
      .premiado.bronze{border-color:#e4bea8;background:radial-gradient(circle at 50% 0,rgba(183,111,62,.15),transparent 30%),linear-gradient(180deg,#fff6f0,#fff 52%)}
      .coroa-box{position:absolute;top:-9mm;left:50%;transform:translateX(-50%);width:16mm;height:15mm;display:grid;place-items:center;border:1px solid #dae5ea;border-radius:5mm;background:#fff;box-shadow:0 3mm 7mm rgba(18,47,67,.12)}
      .coroa{width:11mm;height:8mm}.coroa.ouro{color:#d3a313}.coroa.prata{color:#98a4ae}.coroa.bronze{color:#b66e3d}.flag{position:absolute;right:4mm;top:3mm;width:11mm;height:8mm;object-fit:contain;padding:1mm;border:1px solid #dce6eb;border-radius:2.5mm;background:#fff}
      .pos{display:inline-flex;align-items:center;min-height:7mm;padding:0 3mm;border-radius:999px;font-size:6.5pt;font-weight:900;letter-spacing:.10em}.ouro .pos{background:#fff0b8;color:#896000}.prata .pos{background:#edf1f4;color:#65727d}.bronze .pos{background:#f8e3d5;color:#8f4e26}
      .premiado h2{margin:5mm 0 0;font-size:14pt}.cargo{min-height:8mm;margin:2mm 0 0;color:#6d818f;font-size:7.5pt}.filial{display:inline-flex;align-items:center;min-height:6.5mm;padding:0 2.5mm;border-radius:999px;background:#f0f5f7;color:#758895;font-size:6.5pt;font-weight:800}.linha{height:1px;margin:5mm 0 4mm;background:#e5ecef}
      .premiado small{display:block;color:#84949e;font-size:5.6pt;font-weight:900;letter-spacing:.12em}.valor{display:block;margin-top:1.5mm;color:#087956;font-size:16pt}.ouro .valor{color:#a77800;font-size:18pt}.meta{margin-top:3mm;padding:2mm;border-radius:2.5mm;background:#eef8f4;color:#4c7163;font-size:6pt}.mensagem{margin:4mm 1mm 0;color:#617986;font:italic 7.2pt/1.45 Georgia,serif}
      .rodape{display:flex;justify-content:space-between;align-items:flex-end;margin-top:7mm;padding-top:4mm;border-top:1px solid #e2eaee}.rodape strong{font-size:8pt}.rodape span{display:block;margin-top:1mm;color:#82929d;font-size:6.5pt}.frase{max-width:145mm;text-align:right;color:#718490;font:italic 8pt/1.45 Georgia,serif}
      .acoes{width:297mm;margin:10px auto 0;display:flex;justify-content:flex-end;gap:8px}.acoes button{min-height:40px;padding:0 16px;border-radius:10px;font-weight:800;cursor:pointer}.print{border:0;background:#087f5b;color:#fff}.close{border:1px solid #d4e0e6;background:#fff;color:#315064}
      @media print{html,body{width:297mm;height:210mm;background:#fff}body{padding:0}.folha{width:297mm;height:210mm}.acoes{display:none!important}}
    </style></head><body>
      <main class="folha"><div class="faixa"></div><div class="water">${tipo === "pix" ? "PIX" : "TOP"}</div><div class="conteudo">
        <header class="cab"><div><div class="eyebrow">RECONHECIMENTO · CAMPANHAS PÓS-VENDAS</div><h1>Pódio de Destaques do Mês</h1><div class="sub">${escapar(modulo)} · ${escapar(periodo)}</div></div><div class="selo"><small>CATEGORIA</small><strong>${escapar(modo)}</strong></div></header>
        <section class="intro"><strong>Resultado se constrói com pessoas que fazem a diferença.</strong><p>Esta homenagem reconhece os colaboradores que transformaram dedicação, excelência e foco em resultado, alcançando posição de destaque neste mês.</p></section>
        <section class="grid">${lista.map(card).join("")}</section>
        <footer class="rodape"><div><strong>Campanhas Pós-Vendas</strong><span>Reconhecimento de performance · ${escapar(periodo)}</span></div><div class="frase">“Grandes resultados merecem ser reconhecidos. Que este pódio seja mais um capítulo de muitas conquistas.”</div></footer>
      </div></main>
      <div class="acoes"><button class="close" onclick="window.close()">Fechar</button><button class="print" onclick="window.print()">Imprimir / Salvar em PDF</button></div>
    </body></html>`;
  }

  function imprimir(podium) {
    const html = htmlImpressao(podium);
    if (!html) return alert("Ainda não há colaboradores elegíveis neste pódio para imprimir.");
    const w = window.open("", "_blank", "width=1400,height=900");
    if (!w) return alert("Libere pop-ups para este sistema e tente novamente.");
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
  }

  function garantirCss() {
    if ($("#podiumHomenagemCss")) return;
    const style = document.createElement("style");
    style.id = "podiumHomenagemCss";
    style.textContent = `
      .podium-homenagem-btn{min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 14px;border:1px solid rgba(185,137,20,.32);border-radius:12px;background:linear-gradient(145deg,#fffdf6,#fff7d9);color:#826000;font:inherit;font-size:11px;font-weight:900;white-space:nowrap;cursor:pointer;box-shadow:0 7px 18px rgba(150,109,0,.08)}
      .podium-homenagem-btn:hover{border-color:rgba(185,137,20,.52);box-shadow:0 11px 24px rgba(150,109,0,.12)}
      .podium-homenagem-btn svg{width:16px;height:16px}
      @media(max-width:900px){.podium-homenagem-btn{width:100%;min-height:44px}}
    `;
    document.head.appendChild(style);
  }

  function instalarBotao(podium) {
    const controles = $(".podium-controles", podium);
    if (!controles || $(".podium-homenagem-btn", controles)) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "podium-homenagem-btn";
    btn.innerHTML = `🖨️ Imprimir homenagem`;
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      imprimir(podium);
    });
    controles.prepend(btn);
  }

  function instalar() {
    garantirCss();
    $$(".podium-campanhas").forEach(instalarBotao);
  }

  function iniciar() {
    instalar();
    setInterval(instalar, 700);
    window.podiumHomenagem = { atualizar: instalar, versao: VERSAO };
    console.info(`[PÓDIO HOMENAGEM] v${VERSAO} carregado.`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();