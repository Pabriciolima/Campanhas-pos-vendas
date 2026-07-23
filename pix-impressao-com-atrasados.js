
(() => {
  "use strict";

  const C = {
    dashboard: "#pix-dashboard",
    tabela: "#pixTabelaApuracao",
    competenciaDashboard: "#pixDashboardCompetencia",
    competenciaGlobal: "#competenciaGlobal",
    filtroCompetencia: "#pixFiltroCompetenciaApuracao",
    filtroFilial: "#pixFiltroFilialApuracao",
    filtroCargo: "#pixFiltroCargoApuracao",
    filtroSemana: "#pixFiltroSemanaApuracao",
    filtroStatus: "#pixFiltroStatusApuracao"
  };

  const E = {
    pagamento: "",
    origem: "",
    status: "HABILITADO",
    pessoas: [],
    selecionadas: new Set(),
    lendo: false
  };

  const $ = s => document.querySelector(s);
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  const txt = v => String(v ?? "").trim();
  const norm = v => txt(v).normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toUpperCase()
    .replace(/\s+/g, " ").trim();
  const esc = v => String(v ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const num = v => {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    let s = txt(v).replace(/\s/g, "").replace(/R\$/gi, "").replace(/%/g, "");
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    const n = Number(s.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  const moeda = v => num(v).toLocaleString("pt-BR", {
    style: "currency", currency: "BRL"
  });
  const comp = v => {
    const s = txt(v);
    if (/^\d{4}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{2})\/(\d{4})$/);
    return m ? `${m[2]}-${m[1]}` : s;
  };
  const compBr = v => {
    const m = comp(v).match(/^(\d{4})-(\d{2})$/);
    return m ? `${m[2]}/${m[1]}` : txt(v);
  };
  const anterior = v => {
    const m = comp(v).match(/^(\d{4})-(\d{2})$/);
    if (!m) return "";
    const d = new Date(Number(m[1]), Number(m[2]) - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const status = v => {
    const s = norm(v);
    if (s.includes("NAO HABILITADO") || s.includes("NÃO HABILITADO")) {
      return "NÃO HABILITADO";
    }
    return s.includes("HABILITADO") ? "HABILITADO" : s;
  };
  const atual = () => comp(
    $(C.competenciaDashboard)?.value ||
    $(C.competenciaGlobal)?.value ||
    new Date().toISOString().slice(0, 7)
  );

  function alerta(m) {
    if (window.CampanhaUI?.alert) return window.CampanhaUI.alert(m);
    alert(m);
  }

  function evento(campo) {
    campo?.dispatchEvent(new Event("input", { bubbles: true }));
    campo?.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function lerTabela() {
    const tbody = $(C.tabela);
    if (!tbody) return [];

    return [...tbody.querySelectorAll("tr")].map(tr => {
      const td = [...tr.children];
      if (td.length < 12) return null;
      const linha = norm(tr.textContent);
      if (linha.includes("NENHUM") || linha.includes("CARREGANDO")) return null;

      return {
        origem: comp(td[0]?.textContent),
        semana: txt(td[1]?.textContent),
        filial: txt(td[2]?.textContent),
        nome: txt(td[3]?.textContent),
        cargo: txt(td[4]?.textContent),
        indicadores: txt(td[5]?.textContent).replace(/\s+/g, " "),
        bonusBase: num(td[6]?.textContent),
        bonusFaixa: num(td[7]?.textContent),
        bonusNps: num(td[8]?.textContent),
        penalidade: num(td[9]?.textContent),
        total: num(td[10]?.textContent),
        status: status(td[11]?.textContent)
      };
    }).filter(Boolean);
  }

  function filtrosAtuais() {
    return {
      competencia: $(C.filtroCompetencia)?.value || "",
      filial: $(C.filtroFilial)?.value || "",
      cargo: $(C.filtroCargo)?.value || "",
      semana: $(C.filtroSemana)?.value || "",
      status: $(C.filtroStatus)?.value || ""
    };
  }

  async function aplicarFiltros(f) {
    [
      [C.filtroCompetencia, f.competencia],
      [C.filtroFilial, f.filial],
      [C.filtroCargo, f.cargo],
      [C.filtroSemana, f.semana],
      [C.filtroStatus, f.status]
    ].forEach(([s, v]) => {
      const c = $(s);
      if (!c) return;
      c.value = v || "";
      evento(c);
    });
    await esperar(220);
  }

  async function registrosCompetencia(competencia, filtroStatus) {
    const original = filtrosAtuais();

    try {
      await aplicarFiltros({
        competencia,
        filial: "",
        cargo: "",
        semana: "",
        status: filtroStatus || ""
      });

      for (let i = 0; i < 20; i += 1) {
        const dados = lerTabela();
        if (
          dados.length &&
          dados.every(x => !x.origem || x.origem === competencia)
        ) return dados;

        await esperar(120);
      }

      return lerTabela();
    } finally {
      await aplicarFiltros(original);
    }
  }

  const assinatura = r => [
    norm(r.nome), norm(r.filial), norm(r.cargo)
  ].join("|");

  function agrupar(registros) {
    const mapa = new Map();

    registros.forEach(r => {
      const id = assinatura(r);
      if (!mapa.has(id)) {
        mapa.set(id, {
          id, nome: r.nome, filial: r.filial, cargo: r.cargo,
          total: 0, registros: []
        });
      }
      const p = mapa.get(id);
      p.total += r.total;
      p.registros.push(r);
    });

    return [...mapa.values()].sort(
      (a, b) => a.nome.localeCompare(b.nome, "pt-BR")
    );
  }

  function estilos() {
    if ($("#pixAtrasadosCss")) return;

    document.head.insertAdjacentHTML("beforeend", `
      <style id="pixAtrasadosCss">
        .pix-atrasados-btn{min-height:42px;padding:10px 14px;border:0;border-radius:12px;background:linear-gradient(135deg,#8a4b08,#d47a12);color:#fff;font-weight:800;cursor:pointer}
        .pix-atrasados-modal{width:min(930px,calc(100vw - 26px));max-height:calc(100vh - 28px);padding:0;border:0;border-radius:20px;overflow:hidden}
        .pix-atrasados-modal::backdrop{background:rgba(10,25,36,.68);backdrop-filter:blur(3px)}
        .pix-atrasados-form{display:flex;flex-direction:column;max-height:calc(100vh - 28px)}
        .pix-atrasados-header{display:flex;justify-content:space-between;gap:15px;padding:20px 22px;background:linear-gradient(135deg,#0b3154,#087354);color:#fff}
        .pix-atrasados-header h2{margin:4px 0 6px}.pix-atrasados-header p{margin:0;opacity:.85}
        .pix-atrasados-x{width:40px;height:40px;border:1px solid rgba(255,255,255,.35);border-radius:11px;background:rgba(255,255,255,.12);color:#fff;font-size:1.3rem;cursor:pointer}
        .pix-atrasados-corpo{padding:20px 22px;overflow:auto}
        .pix-atrasados-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}
        .pix-atrasados-campo{display:grid;gap:6px}.pix-atrasados-campo span{font-size:.72rem;font-weight:800;color:#677b89;text-transform:uppercase}
        .pix-atrasados-campo input,.pix-atrasados-campo select,.pix-atrasados-busca{min-height:42px;padding:9px 11px;border:1px solid #dce6ec;border-radius:10px;background:#fff}
        .pix-atrasados-aviso{margin-top:13px;padding:12px 13px;border:1px solid #efd2a5;border-radius:11px;background:#fff8ec;color:#74420b}
        .pix-atrasados-topo{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-top:16px}.pix-atrasados-topo h3{margin:0 0 4px}
        .pix-atrasados-busca{min-width:280px}
        .pix-atrasados-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
        .pix-atrasados-chip{padding:7px 10px;border-radius:999px;background:#eef4f7;color:#254457;font-size:.78rem;font-weight:700}
        .pix-atrasados-lista{display:grid;gap:8px;margin-top:12px}
        .pix-atrasados-pessoa{display:grid;grid-template-columns:auto 1fr auto;gap:11px;align-items:center;padding:12px;border:1px solid #dce6ec;border-radius:12px}
        .pix-atrasados-pessoa input{width:19px;height:19px}.pix-atrasados-pessoa strong{display:block}.pix-atrasados-pessoa small{display:block;margin-top:3px;color:#687c8b}
        .pix-atrasados-valor{font-weight:800;color:#0b3154}.pix-atrasados-vazio{padding:24px;border:1px dashed #dce6ec;border-radius:12px;text-align:center;color:#687c8b}
        .pix-atrasados-acoes{display:flex;justify-content:flex-end;gap:9px;padding:15px 22px;border-top:1px solid #dce6ec;background:#f7f9fa}
        .pix-atrasados-acoes button{min-height:42px;padding:10px 14px;border-radius:10px;font-weight:800;cursor:pointer}
        .pix-atrasados-cancelar{border:1px solid #cad8df;background:#fff}.pix-atrasados-excel{border:0;background:#087344;color:#fff}.pix-atrasados-pdf{border:0;background:#a42121;color:#fff}
        .pix-atrasados-loading{opacity:.6;pointer-events:none}
        @media(max-width:700px){.pix-atrasados-grid{grid-template-columns:1fr}.pix-atrasados-topo{align-items:stretch;flex-direction:column}.pix-atrasados-busca{min-width:0;width:100%}.pix-atrasados-pessoa{grid-template-columns:auto 1fr}.pix-atrasados-valor{grid-column:2}.pix-atrasados-acoes{flex-direction:column}}
      </style>
    `);
  }

  function modal() {
    if ($("#modalPixAtrasados")) return;

    document.body.insertAdjacentHTML("beforeend", `
      <dialog id="modalPixAtrasados" class="pix-atrasados-modal">
        <form class="pix-atrasados-form" method="dialog">
          <header class="pix-atrasados-header">
            <div>
              <small>PIX DO PRESIDENTE</small>
              <h2>Imprimir com pagamentos atrasados</h2>
              <p>Selecione pessoas de uma competência anterior.</p>
            </div>
            <button type="button" id="pixAtrasadosFechar" class="pix-atrasados-x">×</button>
          </header>

          <div id="pixAtrasadosCorpo" class="pix-atrasados-corpo">
            <div class="pix-atrasados-grid">
              <label class="pix-atrasados-campo">
                <span>Competência do pagamento</span>
                <input type="month" id="pixAtrasadosPagamento">
              </label>

              <label class="pix-atrasados-campo">
                <span>Competência dos atrasados</span>
                <input type="month" id="pixAtrasadosOrigem">
              </label>

              <label class="pix-atrasados-campo">
                <span>Registros</span>
                <select id="pixAtrasadosStatus">
                  <option value="HABILITADO">Somente habilitados</option>
                  <option value="">Todos os status</option>
                </select>
              </label>
            </div>

            <div class="pix-atrasados-aviso">
              A pessoa continuará registrada no mês original. Ela será incluída
              somente no PDF ou Excel do mês de pagamento.
            </div>

            <div class="pix-atrasados-topo">
              <div>
                <h3>Pessoas atrasadas</h3>
                <small id="pixAtrasadosLegenda">Carregando...</small>
              </div>
              <input id="pixAtrasadosBusca" class="pix-atrasados-busca" type="search" placeholder="Buscar nome, filial ou cargo">
            </div>

            <div class="pix-atrasados-chips">
              <span id="pixAtrasadosQtd" class="pix-atrasados-chip">0 pessoa(s)</span>
              <span id="pixAtrasadosTotal" class="pix-atrasados-chip">R$ 0,00</span>
            </div>

            <div id="pixAtrasadosLista" class="pix-atrasados-lista"></div>
          </div>

          <footer class="pix-atrasados-acoes">
            <button type="button" id="pixAtrasadosCancelar" class="pix-atrasados-cancelar">Cancelar</button>
            <button type="button" id="pixAtrasadosExcel" class="pix-atrasados-excel">Gerar Excel</button>
            <button type="button" id="pixAtrasadosPdf" class="pix-atrasados-pdf">Gerar PDF</button>
          </footer>
        </form>
      </dialog>
    `);

    $("#pixAtrasadosFechar").onclick = fechar;
    $("#pixAtrasadosCancelar").onclick = fechar;
    $("#pixAtrasadosOrigem").onchange = carregar;
    $("#pixAtrasadosStatus").onchange = carregar;
    $("#pixAtrasadosBusca").oninput = renderPessoas;
    $("#pixAtrasadosPdf").onclick = gerarPdf;
    $("#pixAtrasadosExcel").onclick = gerarExcel;
  }

  function botao() {
    if ($("#btnPixAtrasados")) return;

    const alvo =
      $("#pix-dashboard .pix-page-header") ||
      $("#pix-dashboard .panel-header") ||
      $(C.dashboard);

    if (!alvo) return;

    const b = document.createElement("button");
    b.type = "button";
    b.id = "btnPixAtrasados";
    b.className = "pix-atrasados-btn";
    b.textContent = "Imprimir com atrasados";
    b.onclick = abrir;
    alvo.appendChild(b);
  }

  async function abrir() {
    modal();

    E.pagamento = atual();
    E.origem = anterior(E.pagamento);
    E.status = "HABILITADO";
    E.selecionadas.clear();

    $("#pixAtrasadosPagamento").value = E.pagamento;
    $("#pixAtrasadosOrigem").value = E.origem;
    $("#pixAtrasadosStatus").value = E.status;
    $("#pixAtrasadosBusca").value = "";
    $("#modalPixAtrasados").showModal();

    await carregar();
  }

  function fechar() {
    $("#modalPixAtrasados")?.close();
  }

  async function carregar() {
    if (E.lendo) return;

    E.lendo = true;
    E.origem = comp($("#pixAtrasadosOrigem").value);
    E.status = $("#pixAtrasadosStatus").value || "";
    E.selecionadas.clear();

    const corpo = $("#pixAtrasadosCorpo");
    corpo.classList.add("pix-atrasados-loading");
    $("#pixAtrasadosLista").innerHTML =
      `<div class="pix-atrasados-vazio">Carregando ${compBr(E.origem)}...</div>`;

    try {
      E.pessoas = agrupar(
        await registrosCompetencia(E.origem, E.status)
      );
      renderPessoas();
      resumo();
    } catch (erro) {
      console.error("[PIX ATRASADOS]", erro);
      $("#pixAtrasadosLista").innerHTML =
        `<div class="pix-atrasados-vazio">${esc(erro.message || erro)}</div>`;
    } finally {
      corpo.classList.remove("pix-atrasados-loading");
      E.lendo = false;
    }
  }

  function renderPessoas() {
    const busca = norm($("#pixAtrasadosBusca")?.value);
    const lista = E.pessoas.filter(p =>
      !busca || norm(`${p.nome} ${p.filial} ${p.cargo}`).includes(busca)
    );

    $("#pixAtrasadosLegenda").textContent =
      `${E.pessoas.length} pessoa(s) encontrada(s) em ${compBr(E.origem)}.`;

    $("#pixAtrasadosLista").innerHTML = lista.length
      ? lista.map(p => `
          <label class="pix-atrasados-pessoa">
            <input type="checkbox" data-atrasado="${esc(p.id)}" ${E.selecionadas.has(p.id) ? "checked" : ""}>
            <span>
              <strong>${esc(p.nome)}</strong>
              <small>${esc(p.filial)} · ${esc(p.cargo)} · ${p.registros.length} lançamento(s)</small>
            </span>
            <span class="pix-atrasados-valor">${moeda(p.total)}</span>
          </label>
        `).join("")
      : `<div class="pix-atrasados-vazio">Nenhuma pessoa encontrada.</div>`;

    document.querySelectorAll("[data-atrasado]").forEach(c => {
      c.onchange = e => {
        const id = e.target.dataset.atrasado;
        e.target.checked ? E.selecionadas.add(id) : E.selecionadas.delete(id);
        resumo();
      };
    });
  }

  function selecionadas() {
    return E.pessoas.filter(p => E.selecionadas.has(p.id));
  }

  function resumo() {
    const pessoas = selecionadas();
    const total = pessoas.reduce((s, p) => s + p.total, 0);
    $("#pixAtrasadosQtd").textContent = `${pessoas.length} pessoa(s) selecionada(s)`;
    $("#pixAtrasadosTotal").textContent = `${moeda(total)} em atrasados`;
  }

  async function dadosRelatorio() {
    E.pagamento = comp($("#pixAtrasadosPagamento").value);
    E.origem = comp($("#pixAtrasadosOrigem").value);
    E.status = $("#pixAtrasadosStatus").value || "";

    if (!E.pagamento || !E.origem) {
      throw new Error("Informe as duas competências.");
    }

    const atuais = (await registrosCompetencia(E.pagamento, E.status))
      .map(r => ({
        ...r,
        pagamento: E.pagamento,
        tipo: "COMPETÊNCIA ATUAL"
      }));

    const atrasados = selecionadas().flatMap(p =>
      p.registros.map(r => ({
        ...r,
        pagamento: E.pagamento,
        tipo: "PAGAMENTO ATRASADO"
      }))
    );

    return {
      atuais,
      atrasados,
      todos: [...atuais, ...atrasados].sort(
        (a, b) =>
          a.filial.localeCompare(b.filial, "pt-BR") ||
          a.nome.localeCompare(b.nome, "pt-BR") ||
          a.origem.localeCompare(b.origem) ||
          a.semana.localeCompare(b.semana)
      )
    };
  }

  async function gerarPdf() {
    try {
      if (!window.jspdf?.jsPDF) {
        throw new Error("jsPDF não foi carregado.");
      }

      const { atuais, atrasados, todos } = await dadosRelatorio();
      if (!todos.length) throw new Error("Não há registros para o PDF.");

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const largura = doc.internal.pageSize.getWidth();

      doc.setFillColor(11, 49, 84);
      doc.rect(0, 0, largura, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text("Pix do Presidente — Fechamento de pagamento", 12, 12);
      doc.setFontSize(9);
      doc.text(`Pagamento: ${compBr(E.pagamento)}`, 12, 19);
      doc.text(`Atrasados de: ${compBr(E.origem)} · ${selecionadas().length} pessoa(s)`, 12, 24);

      const totalAtual = atuais.reduce((s, x) => s + x.total, 0);
      const totalAtrasado = atrasados.reduce((s, x) => s + x.total, 0);

      doc.setTextColor(23, 48, 68);
      doc.text(`Mês atual: ${moeda(totalAtual)}`, 12, 35);
      doc.text(`Atrasados: ${moeda(totalAtrasado)}`, 92, 35);
      doc.setFont(undefined, "bold");
      doc.text(`Total: ${moeda(totalAtual + totalAtrasado)}`, 185, 35);
      doc.setFont(undefined, "normal");

      doc.autoTable({
        startY: 41,
        head: [[
          "Tipo", "Origem", "Pagamento", "Semana", "Filial",
          "Colaborador", "Cargo", "Total", "Status"
        ]],
        body: todos.map(x => [
          x.tipo, compBr(x.origem), compBr(x.pagamento), x.semana,
          x.filial, x.nome, x.cargo, moeda(x.total), x.status
        ]),
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 2, valign: "middle" },
        headStyles: { fillColor: [11, 49, 84], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 29 }, 1: { cellWidth: 17 },
          2: { cellWidth: 18 }, 3: { cellWidth: 14 },
          4: { cellWidth: 30 }, 5: { cellWidth: 43 },
          6: { cellWidth: 48 }, 7: { cellWidth: 24, halign: "right" },
          8: { cellWidth: 25, halign: "center" }
        },
        didParseCell(d) {
          if (d.section === "body" && d.column.index === 0 &&
              d.cell.raw === "PAGAMENTO ATRASADO") {
            d.cell.styles.fillColor = [255, 244, 216];
            d.cell.styles.textColor = [130, 83, 0];
            d.cell.styles.fontStyle = "bold";
          }
        }
      });

      doc.save(`pix-${E.pagamento}-com-atrasados-${E.origem}.pdf`);
    } catch (erro) {
      console.error(erro);
      alerta(erro.message || "Não foi possível gerar o PDF.");
    }
  }

  async function gerarExcel() {
    try {
      if (!window.ExcelJS) throw new Error("ExcelJS não foi carregado.");

      const { atuais, atrasados, todos } = await dadosRelatorio();
      if (!todos.length) throw new Error("Não há registros para o Excel.");

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Pagamento Pix", {
        views: [{ state: "frozen", ySplit: 5 }]
      });

      ws.mergeCells("A1:N1");
      ws.getCell("A1").value = "PIX DO PRESIDENTE — FECHAMENTO DE PAGAMENTO";
      ws.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
      ws.getCell("A1").fill = {
        type: "pattern", pattern: "solid", fgColor: { argb: "FF0B3154" }
      };
      ws.getCell("A1").alignment = { horizontal: "center" };

      ws.mergeCells("A2:G2");
      ws.getCell("A2").value = `Competência de pagamento: ${compBr(E.pagamento)}`;
      ws.mergeCells("H2:N2");
      ws.getCell("H2").value = `Atrasados de: ${compBr(E.origem)}`;

      const totalAtual = atuais.reduce((s, x) => s + x.total, 0);
      const totalAtrasado = atrasados.reduce((s, x) => s + x.total, 0);

      ws.mergeCells("A3:E3");
      ws.getCell("A3").value = `Mês atual: ${moeda(totalAtual)}`;
      ws.mergeCells("F3:J3");
      ws.getCell("F3").value = `Atrasados: ${moeda(totalAtrasado)}`;
      ws.mergeCells("K3:N3");
      ws.getCell("K3").value = `Total: ${moeda(totalAtual + totalAtrasado)}`;

      const cab = [
        "Tipo", "Competência de origem", "Competência de pagamento",
        "Semana", "DN", "Filial", "Colaborador", "Cargo",
        "Bônus base", "Bônus faixa", "NPS", "Penalidade", "Total", "Status"
      ];

      const h = ws.addRow(cab);
      h.eachCell(c => {
        c.font = { bold: true, color: { argb: "FFFFFFFF" } };
        c.fill = {
          type: "pattern", pattern: "solid", fgColor: { argb: "FF0B3154" }
        };
        c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      });

      todos.forEach(x => {
        const r = ws.addRow([
          x.tipo, x.origem, x.pagamento, x.semana, x.dn || "",
          x.filial, x.nome, x.cargo, x.bonusBase, x.bonusFaixa,
          x.bonusNps, x.penalidade, x.total, x.status
        ]);

        [9, 10, 11, 12, 13].forEach(i => {
          r.getCell(i).numFmt = '"R$" #,##0.00';
        });

        if (x.tipo === "PAGAMENTO ATRASADO") {
          r.eachCell(c => {
            c.fill = {
              type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF4D8" }
            };
          });
        }
      });

      ws.columns = [
        { width: 23 }, { width: 21 }, { width: 24 }, { width: 12 },
        { width: 12 }, { width: 24 }, { width: 34 }, { width: 40 },
        { width: 16 }, { width: 16 }, { width: 14 }, { width: 16 },
        { width: 16 }, { width: 19 }
      ];

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pix-${E.pagamento}-com-atrasados-${E.origem}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (erro) {
      console.error(erro);
      alerta(erro.message || "Não foi possível gerar o Excel.");
    }
  }

  function iniciar() {
    estilos();
    modal();
    botao();

    let tentativas = 0;
    const timer = setInterval(() => {
      tentativas += 1;
      botao();
      if ($("#btnPixAtrasados") || tentativas >= 20) clearInterval(timer);
    }, 300);

    window.pixImpressaoComAtrasados = {
      abrir, gerarPdf, gerarExcel, versao: "2026.07.21-02"
    };
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", iniciar, { once: true })
    : iniciar();
})();