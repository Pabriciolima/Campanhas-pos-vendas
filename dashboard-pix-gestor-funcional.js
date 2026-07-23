(function () {
  "use strict";

  const VERSAO = "2026.07.21-04";

  const CONFIG = {
    container: "#pix-dashboard",
    tabelaApuracao: "#pixTabelaApuracao",
    tabelaLancamentos: "#pixTabelaLancamentos",
    competencia: "#pixDashboardCompetencia",
    semanas: ["S1", "S2", "S3", "S4"],
    maxTentativasIniciais: 30,
    intervaloTentativas: 500
  };

  const estado = {
    semana: "",
    filial: "",
    dn: "",
    tentativa: 0,
    timerInicial: null,
    renderizando: false
  };

  const moeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

  function $(seletor) {
    return document.querySelector(seletor);
  }

  function texto(valor) {
    return String(valor ?? "").trim();
  }

  function normalizar(valor) {
    return texto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapar(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function numero(valor) {
    if (typeof valor === "number") {
      return Number.isFinite(valor) ? valor : 0;
    }

    let resultado = texto(valor)
      .replace(/\s/g, "")
      .replace(/R\$/gi, "")
      .replace(/%/g, "");

    if (!resultado) return 0;

    if (resultado.includes(",")) {
      resultado = resultado
        .replace(/\./g, "")
        .replace(",", ".");
    }

    resultado = resultado.replace(/[^\d.-]/g, "");

    const convertido = Number(resultado);

    return Number.isFinite(convertido)
      ? convertido
      : 0;
  }

  function formatarMoeda(valor) {
    return moeda.format(numero(valor));
  }

  function semanaNormalizada(valor) {
    const resultado = normalizar(valor)
      .replace(/\s+/g, "")
      .match(/(?:SEMANA)?([1-4])/);

    return resultado
      ? `S${resultado[1]}`
      : "";
  }

  function statusNormalizado(valor) {
    const resultado = normalizar(valor);

    if (
      resultado.includes("NAO HABILITADO") ||
      resultado.includes("NÃO HABILITADO")
    ) {
      return "NÃO HABILITADO";
    }

    if (resultado.includes("HABILITADO")) {
      return "HABILITADO";
    }

    return resultado;
  }

  function resolverTabela(seletor) {
    const elemento = $(seletor);

    if (!elemento) return null;

    return elemento.tagName === "TABLE"
      ? elemento
      : elemento.closest("table");
  }

  function mapearCabecalho(tabela) {
    const mapa = {};

    [...tabela.querySelectorAll("thead th")]
      .forEach((th, indice) => {
        const cabecalho = normalizar(
          th.textContent
        );

        if (cabecalho.includes("COMPET")) {
          mapa.competencia = indice;
        }

        if (cabecalho.includes("SEMANA")) {
          mapa.semana = indice;
        }

        if (
          cabecalho === "DN" ||
          cabecalho.includes("CODIGO DN")
        ) {
          mapa.dn = indice;
        }

        if (
          cabecalho.includes("FILIAL") ||
          cabecalho.includes("UNIDADE")
        ) {
          mapa.filial = indice;
        }

        if (
          cabecalho.includes("COLABORADOR") ||
          cabecalho.includes("FUNCIONARIO") ||
          cabecalho.includes("PARTICIPANTE") ||
          cabecalho === "NOME"
        ) {
          mapa.nome = indice;
        }

        if (
          cabecalho.includes("CARGO") ||
          cabecalho.includes("FUNCAO")
        ) {
          mapa.cargo = indice;
        }

        if (
          cabecalho === "TOTAL" ||
          cabecalho.includes("BONUS FINAL") ||
          cabecalho.includes("BÔNUS FINAL") ||
          cabecalho.includes("VALOR PAGO")
        ) {
          mapa.total = indice;
        }

        if (cabecalho.includes("STATUS")) {
          mapa.status = indice;
        }
      });

    return mapa;
  }

  function lerTabela(seletor) {
    const tabela = resolverTabela(seletor);

    if (!tabela) return [];

    const mapa = mapearCabecalho(tabela);
    const resultados = [];

    [...tabela.querySelectorAll("tbody tr")]
      .forEach(linha => {
        const celulas = [...linha.children];

        if (!celulas.length) return;

        const obter = indice => {
          if (
            indice === undefined ||
            indice < 0
          ) {
            return "";
          }

          return texto(
            celulas[indice]?.textContent
          ).replace(/\s+/g, " ");
        };

        const linhaCompleta = normalizar(
          linha.textContent
        );

        if (
          linhaCompleta.includes("NENHUM") ||
          linhaCompleta.includes("CARREGANDO")
        ) {
          return;
        }

        /*
        O Pix atual possui 12 colunas.
        Os fallbacks abaixo só são usados caso
        algum título do cabeçalho seja diferente.
        */
        const semana = semanaNormalizada(
          obter(
            mapa.semana !== undefined
              ? mapa.semana
              : 1
          )
        );

        const nome = obter(
          mapa.nome !== undefined
            ? mapa.nome
            : 3
        );

        const filial = obter(
          mapa.filial !== undefined
            ? mapa.filial
            : 2
        );

        const dn = obter(
          mapa.dn !== undefined
            ? mapa.dn
            : 0
        );

        const cargo = obter(
          mapa.cargo !== undefined
            ? mapa.cargo
            : 4
        );

        const total = numero(
          obter(
            mapa.total !== undefined
              ? mapa.total
              : celulas.length - 3
          )
        );

        const status = statusNormalizado(
          obter(
            mapa.status !== undefined
              ? mapa.status
              : celulas.length - 2
          )
        );

        if (
          !semana ||
          !nome
        ) {
          return;
        }

        resultados.push({
          semana,
          nome,
          filial,
          dn,
          cargo,
          total,
          status
        });
      });

    return resultados;
  }

  function obterDados() {
    let dados = lerTabela(
      CONFIG.tabelaApuracao
    );

    if (!dados.length) {
      dados = lerTabela(
        CONFIG.tabelaLancamentos
      );
    }

    return dados;
  }

  function aplicarFiltros(dados) {
    return dados.filter(item => {
      if (
        estado.semana &&
        item.semana !== estado.semana
      ) {
        return false;
      }

      if (
        estado.filial &&
        normalizar(item.filial) !==
        normalizar(estado.filial)
      ) {
        return false;
      }

      if (
        estado.dn &&
        texto(item.dn) !==
        texto(estado.dn)
      ) {
        return false;
      }

      return true;
    });
  }

  function somenteHabilitados(dados) {
    return dados.filter(
      item =>
        item.status === "HABILITADO"
    );
  }

  function valoresUnicos(dados, campo) {
    return [
      ...new Set(
        dados
          .map(item => texto(item[campo]))
          .filter(Boolean)
      )
    ].sort(
      (a, b) =>
        a.localeCompare(b, "pt-BR")
    );
  }

  function agrupar(dados, campo) {
    const mapa = new Map();

    dados.forEach(item => {
      const chave = texto(item[campo]);

      if (!chave) return;

      mapa.set(
        chave,
        (mapa.get(chave) || 0) +
        item.total
      );
    });

    return [...mapa.entries()]
      .map(([nome, valor]) => ({
        nome,
        valor
      }))
      .sort(
        (a, b) =>
          b.valor - a.valor
      );
  }

  function resumoSemanal(dados) {
    const resumo = {};

    CONFIG.semanas.forEach(semana => {
      const registros = dados.filter(
        item =>
          item.semana === semana
      );

      const premiados =
        somenteHabilitados(registros);

      const investimento = premiados
        .reduce(
          (soma, item) =>
            soma + item.total,
          0
        );

      resumo[semana] = {
        registros: registros.length,
        habilitados: premiados.length,
        investimento,
        ticket: premiados.length
          ? investimento / premiados.length
          : 0,
        percentual: registros.length
          ? (
              premiados.length /
              registros.length
            ) * 100
          : 0
      };
    });

    return resumo;
  }

  function garantirEstilos() {
    if (
      $("#dashboardPixGestorFuncionalStyles")
    ) {
      return;
    }

    document.head.insertAdjacentHTML(
      "beforeend",
      `
      <style id="dashboardPixGestorFuncionalStyles">
        .pix-gestor-funcional{
          --azul:#0b3154;
          --verde:#087354;
          --texto:#173044;
          --muted:#687c8b;
          --borda:#dce6ec;
          --fundo:#f5f8fa;
          margin:18px 0 28px;
          color:var(--texto)
        }

        .pix-gestor-funcional *{
          box-sizing:border-box
        }

        .pix-gestor-cabecalho{
          display:flex;
          justify-content:space-between;
          gap:16px;
          padding:21px;
          border-radius:19px;
          color:#fff;
          background:linear-gradient(
            135deg,
            var(--azul),
            var(--verde)
          )
        }

        .pix-gestor-cabecalho h2{
          margin:4px 0 7px
        }

        .pix-gestor-cabecalho p{
          margin:0;
          opacity:.84
        }

        .pix-gestor-acoes{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          align-items:flex-start
        }

        .pix-gestor-botao{
          padding:9px 12px;
          border:1px solid
            rgba(255,255,255,.38);
          border-radius:10px;
          background:
            rgba(255,255,255,.14);
          color:#fff;
          font-weight:700;
          cursor:pointer
        }

        .pix-gestor-filtros{
          display:grid;
          grid-template-columns:
            repeat(3,minmax(150px,1fr));
          gap:10px;
          margin-top:14px;
          padding:14px;
          border:1px solid var(--borda);
          border-radius:15px;
          background:#fff
        }

        .pix-gestor-campo{
          display:grid;
          gap:5px
        }

        .pix-gestor-campo label{
          font-size:.71rem;
          font-weight:800;
          color:var(--muted);
          text-transform:uppercase
        }

        .pix-gestor-campo select{
          min-height:40px;
          padding:8px 10px;
          border:1px solid var(--borda);
          border-radius:9px;
          background:#fff
        }

        .pix-gestor-kpis{
          display:grid;
          grid-template-columns:
            repeat(4,minmax(0,1fr));
          gap:12px;
          margin-top:14px
        }

        .pix-gestor-card,
        .pix-gestor-painel{
          padding:17px;
          border:1px solid var(--borda);
          border-radius:15px;
          background:#fff;
          box-shadow:
            0 8px 20px
            rgba(18,40,56,.05)
        }

        .pix-gestor-card span{
          display:block;
          font-size:.71rem;
          font-weight:800;
          color:var(--muted);
          text-transform:uppercase
        }

        .pix-gestor-card strong{
          display:block;
          margin-top:8px;
          color:var(--azul);
          font-size:1.55rem
        }

        .pix-gestor-card small{
          display:block;
          margin-top:5px;
          color:var(--muted)
        }

        .pix-gestor-painel{
          margin-top:13px
        }

        .pix-gestor-painel h3{
          margin:0;
          color:var(--azul)
        }

        .pix-gestor-subtitulo{
          margin:5px 0 15px;
          color:var(--muted);
          font-size:.83rem
        }

        .pix-gestor-semanas{
          display:grid;
          grid-template-columns:
            repeat(4,minmax(0,1fr));
          gap:10px
        }

        .pix-gestor-semana{
          padding:14px;
          border:1px solid var(--borda);
          border-radius:12px;
          background:var(--fundo)
        }

        .pix-gestor-semana b{
          color:var(--muted);
          font-size:.73rem
        }

        .pix-gestor-semana strong{
          display:block;
          margin:7px 0 4px;
          color:var(--azul);
          font-size:1.14rem
        }

        .pix-gestor-grid{
          display:grid;
          grid-template-columns:
            1.2fr .8fr;
          gap:13px
        }

        .pix-gestor-barras{
          display:grid;
          gap:11px
        }

        .pix-gestor-barra{
          display:grid;
          grid-template-columns:
            32px 1fr auto;
          align-items:center;
          gap:9px
        }

        .pix-gestor-trilho{
          height:13px;
          overflow:hidden;
          border-radius:999px;
          background:#e6edf1
        }

        .pix-gestor-preenchimento{
          height:100%;
          border-radius:inherit;
          background:linear-gradient(
            90deg,
            var(--azul),
            var(--verde)
          )
        }

        .pix-gestor-tabela-wrap{
          overflow:auto
        }

        .pix-gestor-tabela{
          width:100%;
          border-collapse:collapse
        }

        .pix-gestor-tabela th,
        .pix-gestor-tabela td{
          padding:9px;
          border-bottom:
            1px solid var(--borda);
          text-align:left;
          white-space:nowrap
        }

        .pix-gestor-tabela th{
          font-size:.69rem;
          color:var(--muted);
          text-transform:uppercase
        }

        .pix-gestor-tabela th:last-child,
        .pix-gestor-tabela td:last-child{
          text-align:right
        }

        .pix-gestor-vazio{
          padding:24px;
          border:1px dashed var(--borda);
          border-radius:12px;
          color:var(--muted);
          text-align:center
        }

        .pix-gestor-rodape{
          margin-top:10px;
          color:var(--muted);
          font-size:.75rem;
          text-align:right
        }

        @media(max-width:900px){
          .pix-gestor-kpis,
          .pix-gestor-semanas{
            grid-template-columns:
              repeat(2,1fr)
          }

          .pix-gestor-grid{
            grid-template-columns:1fr
          }
        }

        @media(max-width:600px){
          .pix-gestor-cabecalho{
            flex-direction:column
          }

          .pix-gestor-filtros,
          .pix-gestor-kpis,
          .pix-gestor-semanas{
            grid-template-columns:1fr
          }
        }

        @media print{
          body *{
            visibility:hidden!important
          }

          #dashboardPixGestorFuncional,
          #dashboardPixGestorFuncional *{
            visibility:visible!important
          }

          #dashboardPixGestorFuncional{
            position:absolute;
            inset:0;
            width:100%;
            margin:0
          }

          .pix-gestor-filtros,
          .pix-gestor-acoes{
            display:none!important
          }
        }
      </style>
      `
    );
  }

  function garantirHtml() {
    const existente = $(
      "#dashboardPixGestorFuncional"
    );

    if (existente) {
      return existente;
    }

    const container = $(
      CONFIG.container
    );

    if (!container) {
      console.error(
        "[DASHBOARD PIX] O elemento #pix-dashboard não foi encontrado."
      );

      return null;
    }

    container.insertAdjacentHTML(
      "afterbegin",
      `
      <section
        id="dashboardPixGestorFuncional"
        class="pix-gestor-funcional"
      >
        <header class="pix-gestor-cabecalho">
          <div>
            <small>
              VISÃO GERAL DO GESTOR
            </small>

            <h2>
              Investimento por semana
            </h2>

            <p id="pixGestorPeriodo">
              Aguardando os dados do Firebase...
            </p>
          </div>

          <div class="pix-gestor-acoes">
            <button
              type="button"
              class="pix-gestor-botao"
              id="pixGestorAtualizar"
            >
              Atualizar painel
            </button>

            <button
              type="button"
              class="pix-gestor-botao"
              id="pixGestorPdf"
            >
              Exportar PDF
            </button>
          </div>
        </header>

        <div class="pix-gestor-filtros">
          <div class="pix-gestor-campo">
            <label for="pixGestorSemana">
              Semana
            </label>

            <select id="pixGestorSemana">
              <option value="">
                Todas
              </option>

              <option value="S1">
                Semana 1
              </option>

              <option value="S2">
                Semana 2
              </option>

              <option value="S3">
                Semana 3
              </option>

              <option value="S4">
                Semana 4
              </option>
            </select>
          </div>

          <div class="pix-gestor-campo">
            <label for="pixGestorDn">
              DN
            </label>

            <select id="pixGestorDn">
              <option value="">
                Todos
              </option>
            </select>
          </div>

          <div class="pix-gestor-campo">
            <label for="pixGestorFilial">
              Filial
            </label>

            <select id="pixGestorFilial">
              <option value="">
                Todas
              </option>
            </select>
          </div>
        </div>

        <div id="pixGestorConteudo">
          <div class="pix-gestor-vazio">
            Carregando lançamentos do Pix...
          </div>
        </div>

        <div
          class="pix-gestor-rodape"
          id="pixGestorRodape"
        ></div>
      </section>
      `
    );

    configurarEventos();

    return $(
      "#dashboardPixGestorFuncional"
    );
  }

  function preencherSelect(
    seletor,
    valores,
    selecionado,
    padrao
  ) {
    const select = $(seletor);

    if (!select) return;

    select.innerHTML =
      `<option value="">${padrao}</option>` +
      valores.map(valor => `
        <option
          value="${escapar(valor)}"
          ${valor === selecionado ? "selected" : ""}
        >
          ${escapar(valor)}
        </option>
      `).join("");
  }

  function tabelaRanking(
    titulo,
    itens
  ) {
    return `
      <section class="pix-gestor-painel">
        <h3>${escapar(titulo)}</h3>

        <p class="pix-gestor-subtitulo">
          Ordenado do maior para o menor
        </p>

        ${
          itens.length
            ? `
              <div class="pix-gestor-tabela-wrap">
                <table class="pix-gestor-tabela">
                  <thead>
                    <tr>
                      <th>Posição</th>
                      <th>Descrição</th>
                      <th>Investimento</th>
                    </tr>
                  </thead>

                  <tbody>
                    ${itens.slice(0, 10).map(
                      (item, indice) => `
                        <tr>
                          <td>${indice + 1}º</td>
                          <td>${escapar(item.nome)}</td>
                          <td>${formatarMoeda(item.valor)}</td>
                        </tr>
                      `
                    ).join("")}
                  </tbody>
                </table>
              </div>
            `
            : `
              <div class="pix-gestor-vazio">
                Nenhum resultado encontrado.
              </div>
            `
        }
      </section>
    `;
  }

  function renderizar() {
    if (estado.renderizando) return;

    estado.renderizando = true;

    try {
      garantirEstilos();

      if (!garantirHtml()) {
        return false;
      }

      const todos = obterDados();

      preencherSelect(
        "#pixGestorDn",
        valoresUnicos(todos, "dn"),
        estado.dn,
        "Todos"
      );

      preencherSelect(
        "#pixGestorFilial",
        valoresUnicos(todos, "filial"),
        estado.filial,
        "Todas"
      );

      const filtrados = aplicarFiltros(
        todos
      );

      const resumo = resumoSemanal(
        filtrados
      );

      const premiados =
        somenteHabilitados(
          filtrados
        );

      const totalInvestido = premiados
        .reduce(
          (soma, item) =>
            soma + item.total,
          0
        );

      const ticketMedio = premiados.length
        ? totalInvestido /
          premiados.length
        : 0;

      const filiaisPremiadas = new Set(
        premiados.map(
          item =>
            normalizar(item.filial)
        )
      ).size;

      const maiorSemana = Math.max(
        1,
        ...CONFIG.semanas.map(
          semana =>
            resumo[semana].investimento
        )
      );

      const rankingFiliais = agrupar(
        premiados,
        "filial"
      );

      const rankingDns = agrupar(
        premiados,
        "dn"
      );

      const conteudo = $(
        "#pixGestorConteudo"
      );

      if (!todos.length) {
        conteudo.innerHTML = `
          <div class="pix-gestor-vazio">
            Os lançamentos ainda não foram carregados.
            <br>
            Aguarde alguns segundos ou clique em
            <strong>Atualizar painel</strong>.
          </div>
        `;

        return false;
      }

      conteudo.innerHTML = `
        <div class="pix-gestor-kpis">
          <article class="pix-gestor-card">
            <span>Total investido</span>
            <strong>${formatarMoeda(totalInvestido)}</strong>
            <small>Somente habilitados</small>
          </article>

          <article class="pix-gestor-card">
            <span>Habilitados</span>
            <strong>${premiados.length}</strong>
            <small>Colaboradores premiados</small>
          </article>

          <article class="pix-gestor-card">
            <span>Filiais premiadas</span>
            <strong>${filiaisPremiadas}</strong>
            <small>Unidades com investimento</small>
          </article>

          <article class="pix-gestor-card">
            <span>Ticket médio</span>
            <strong>${formatarMoeda(ticketMedio)}</strong>
            <small>Média por habilitado</small>
          </article>
        </div>

        <section class="pix-gestor-painel">
          <h3>Investimento por semana</h3>

          <p class="pix-gestor-subtitulo">
            S1, S2, S3 e S4 da competência selecionada
          </p>

          <div class="pix-gestor-semanas">
            ${CONFIG.semanas.map(semana => `
              <article class="pix-gestor-semana">
                <b>SEMANA ${semana.replace("S", "")}</b>

                <strong>
                  ${formatarMoeda(
                    resumo[semana].investimento
                  )}
                </strong>

                <small>
                  ${resumo[semana].habilitados}
                  habilitado(s)
                </small>
              </article>
            `).join("")}
          </div>
        </section>

        <div class="pix-gestor-grid">
          <section class="pix-gestor-painel">
            <h3>Evolução semanal</h3>

            <p class="pix-gestor-subtitulo">
              Comparativo entre os investimentos
            </p>

            <div class="pix-gestor-barras">
              ${CONFIG.semanas.map(semana => {
                const valor =
                  resumo[semana].investimento;

                const largura = valor
                  ? Math.max(
                      3,
                      valor / maiorSemana * 100
                    )
                  : 0;

                return `
                  <div class="pix-gestor-barra">
                    <b>${semana}</b>

                    <div class="pix-gestor-trilho">
                      <div
                        class="pix-gestor-preenchimento"
                        style="width:${largura}%"
                      ></div>
                    </div>

                    <strong>
                      ${formatarMoeda(valor)}
                    </strong>
                  </div>
                `;
              }).join("")}
            </div>
          </section>

          <section class="pix-gestor-painel">
            <h3>Ticket médio semanal</h3>

            <p class="pix-gestor-subtitulo">
              Média paga por habilitado
            </p>

            <div class="pix-gestor-tabela-wrap">
              <table class="pix-gestor-tabela">
                <thead>
                  <tr>
                    <th>Semana</th>
                    <th>Habilitados</th>
                    <th>Ticket</th>
                  </tr>
                </thead>

                <tbody>
                  ${CONFIG.semanas.map(semana => `
                    <tr>
                      <td>${semana}</td>
                      <td>${resumo[semana].habilitados}</td>
                      <td>
                        ${formatarMoeda(
                          resumo[semana].ticket
                        )}
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div class="pix-gestor-grid">
          ${tabelaRanking(
            "Ranking das filiais",
            rankingFiliais
          )}

          ${tabelaRanking(
            "Ranking dos DNs",
            rankingDns
          )}
        </div>
      `;

      const competencia = texto(
        $(CONFIG.competencia)?.value
      );

      const periodo = $(
        "#pixGestorPeriodo"
      );

      if (periodo) {
        periodo.textContent =
          `Competência ${competencia || "atual"} · ${todos.length} lançamento(s) carregado(s)`;
      }

      const rodape = $(
        "#pixGestorRodape"
      );

      if (rodape) {
        rodape.textContent =
          `Atualizado em ${new Date().toLocaleString("pt-BR")}`;
      }

      console.info(
        "[DASHBOARD PIX] Dados exibidos:",
        {
          versao: VERSAO,
          registros: todos.length,
          filtrados: filtrados.length
        }
      );

      return true;
    } catch (erro) {
      console.error(
        "[DASHBOARD PIX] Erro ao renderizar:",
        erro
      );

      const conteudo = $(
        "#pixGestorConteudo"
      );

      if (conteudo) {
        conteudo.innerHTML = `
          <div class="pix-gestor-vazio">
            Erro ao carregar o dashboard:
            <br>
            ${escapar(erro.message || erro)}
          </div>
        `;
      }

      return false;
    } finally {
      estado.renderizando = false;
    }
  }

  function pararTentativasIniciais() {
    if (estado.timerInicial) {
      clearInterval(
        estado.timerInicial
      );

      estado.timerInicial = null;
    }
  }

  function iniciarTentativasIniciais() {
    pararTentativasIniciais();

    estado.tentativa = 0;

    /*
    Esta verificação existe porque o onSnapshot do Firebase
    é assíncrono. São no máximo 30 tentativas de 500 ms.
    Depois disso o intervalo é encerrado.
    */
    estado.timerInicial = setInterval(
      () => {
        estado.tentativa += 1;

        const carregou = renderizar();

        if (
          carregou ||
          estado.tentativa >=
            CONFIG.maxTentativasIniciais
        ) {
          pararTentativasIniciais();
        }
      },
      CONFIG.intervaloTentativas
    );
  }

  function configurarEventos() {
    const dashboard = $(
      "#dashboardPixGestorFuncional"
    );

    if (
      !dashboard ||
      dashboard.dataset.eventos === "true"
    ) {
      return;
    }

    dashboard.dataset.eventos = "true";

    $("#pixGestorAtualizar")
      ?.addEventListener(
        "click",
        renderizar
      );

    $("#pixGestorPdf")
      ?.addEventListener(
        "click",
        () => window.print()
      );

    $("#pixGestorSemana")
      ?.addEventListener(
        "change",
        evento => {
          estado.semana =
            evento.target.value;

          renderizar();
        }
      );

    $("#pixGestorDn")
      ?.addEventListener(
        "change",
        evento => {
          estado.dn =
            evento.target.value;

          renderizar();
        }
      );

    $("#pixGestorFilial")
      ?.addEventListener(
        "change",
        evento => {
          estado.filial =
            evento.target.value;

          renderizar();
        }
      );
  }

  /*
  Atualiza quando o usuário abre a Visão Geral.
  Não existe observação contínua.
  */
  document.addEventListener(
    "click",
    evento => {
      if (
        evento.target.closest(
          [
            '[data-pix-view="dashboard"]',
            '.pix-menu-btn[data-pix-view="dashboard"]'
          ].join(",")
        )
      ) {
        setTimeout(
          renderizar,
          80
        );
      }

      /*
      Após salvar, editar ou excluir,
      aguarda o Firebase atualizar a tabela.
      */
      if (
        evento.target.closest(
          [
            '#formPixPresidente button[type="submit"]',
            "[data-pix-delete]",
            "[data-pix-edit]"
          ].join(",")
        )
      ) {
        setTimeout(
          renderizar,
          700
        );

        setTimeout(
          renderizar,
          1500
        );
      }
    },
    true
  );

  function iniciar() {
    garantirEstilos();

    const dashboard = garantirHtml();

    if (!dashboard) {
      return;
    }

    renderizar();
    iniciarTentativasIniciais();

    console.info(
      `[DASHBOARD PIX] Versão ${VERSAO} carregada`
    );
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      iniciar,
      {
        once: true
      }
    );
  } else {
    iniciar();
  }

  window.atualizarDashboardGestorPix =
    renderizar;

  window.dashboardPixGestor = {
    atualizar: renderizar,
    versao: VERSAO
  };
})();