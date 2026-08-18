/*
 * MOTION PREMIUM v06
 * Inspirado em padrões de motion design observados no Jitter:
 * reveal em camadas, stagger, overshoot suave, shimmer, floating,
 * microinterações e movimento ambiente.
 * Mantém intactos Firebase, ranking, regras e filtros.
 */

/*
 * AJUSTE 2026.08.18-08
 * - Orçamentista removido do pódio.
 * - Mantida toda a lógica funcional do arquivo enviado pelo usuário.
 * - Upgrade visual premium aplicado somente no CSS do próprio módulo.
 * - Continua 100% somente leitura no Firebase.
 */

/*
===============================================================================
PÓDIO MENSAL — PRODUTIVOS + PIX DO PRESIDENTE
Versão: 2026.08.18-08
===============================================================================
Módulo SOMENTE LEITURA.
Não altera lançamentos, regras, importação, exportação, auditoria ou Firebase.
===============================================================================
*/

import { firestore } from "./firebase-config.js";
import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const PODIUM_VERSAO = "2026.08.18-08";

const estado = {
  funcionariosProdutivos: [],
  lancamentosProdutivos: [],
  funcionariosPix: [],
  lancamentosPix: [],
  modoProdutivos: "geral",
  filialProdutivos: "",
  modoPix: "geral",
  filialPix: ""
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const $ = seletor => document.querySelector(seletor);

function texto(valor) {
  return String(valor ?? "").trim();
}

function numero(valor) {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  let t = texto(valor)
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/%/g, "");

  if (!t) return 0;

  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  }

  t = t.replace(/[^\d.-]/g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function normalizar(valor) {
  return texto(valor)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
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


const PODIUM_UF_POR_FILIAL=Object.freeze({
 "ANANINDEUA":"PA","BELEM":"PA","SAO LUIS":"MA","BACABAL":"MA",
 "TERESINA":"PI","URUCUI":"PI","CUIABA":"MT","RONDONOPOLIS":"MT",
 "SINOP":"MT","AGUA BOA":"MT","PORTO VELHO":"RO","JI PARANA":"RO",
 "VILHENA":"RO","MACAPA":"AP"
});
const PODIUM_BANDEIRAS=Object.freeze({
 PA:"https://upload.wikimedia.org/wikipedia/commons/0/02/Bandeira_do_Par%C3%A1.svg",
 MA:"https://upload.wikimedia.org/wikipedia/commons/4/45/Bandeira_do_Maranh%C3%A3o.svg",
 PI:"https://upload.wikimedia.org/wikipedia/commons/3/33/Bandeira_do_Piau%C3%AD.svg",
 MT:"https://upload.wikimedia.org/wikipedia/commons/0/0b/Bandeira_de_Mato_Grosso.svg",
 RO:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Bandeira_de_Rond%C3%B4nia.svg",
 AP:"https://upload.wikimedia.org/wikipedia/commons/0/0c/Bandeira_do_Amap%C3%A1.svg"
});
const PODIUM_NOME_UF=Object.freeze({PA:"Pará",MA:"Maranhão",PI:"Piauí",MT:"Mato Grosso",RO:"Rondônia",AP:"Amapá"});
function podiumBandeiraEstado(filial){
 const uf=PODIUM_UF_POR_FILIAL[normalizar(filial)]||"";
 if(!uf)return "";
 const nome=PODIUM_NOME_UF[uf];
 return `<div class="podium-bandeira-estado" title="${escapar(nome)} · ${uf}">
 <img src="${PODIUM_BANDEIRAS[uf]}" alt="Bandeira de ${escapar(nome)}" draggable="false"><span>${uf}</span></div>`;
}

function competenciaAtual() {
  return (
    $("#competenciaGlobal")?.value ||
    $("#pixDashboardCompetencia")?.value ||
    $("#pixFiltroCompetencia")?.value ||
    new Date().toISOString().slice(0, 7)
  );
}

function cargoExcluido(cargo) {
  const c = normalizar(cargo);

  /*
   * PÓDIO = RESULTADO INDIVIDUAL.
   *
   * Não participam cargos cujo cálculo/premiação depende
   * do resultado de outros colaboradores ou da equipe.
   *
   * Exemplos já existentes no sistema:
   * - Gerente;
   * - Supervisor;
   * - Coordenador;
   * - Orçamentista / Facilitador de Negócios;
   * - Chefe de Oficina;
   * - Mecânico Líder;
   * - Controlador de Produtividade.
   *
   * A regra abaixo também protege contra variações do nome
   * do cargo, pois procura os termos dentro da descrição.
   */
  const termosExcluidos = [
    "GERENTE",
    "SUPERVISOR",
    "COORDENADOR",
    "ORCAMENTISTA",
    "CHEFE",
    "LIDER",
    "CONTROLADOR"
  ];

  return termosExcluidos.some(
    termo => c.includes(termo)
  );
}

function funcionarioPorId(id, lista) {
  return lista.find(item => texto(item.id) === texto(id));
}

function dadosPessoa(registro, lista) {
  const pessoa = funcionarioPorId(registro.funcionarioId, lista);

  return {
    nome:
      texto(registro.nome) ||
      texto(registro.colaborador) ||
      texto(pessoa?.nome) ||
      "Colaborador",
    cargo: texto(registro.cargo) || texto(pessoa?.cargo),
    filial: texto(registro.filial) || texto(pessoa?.filial),
    dn: texto(registro.dn) || texto(pessoa?.dn)
  };
}

function produtivoBateuMeta(item) {
  if (normalizar(item.status) === "HABILITADO") {
    return true;
  }

  const hd = numero(item.horasDisponiveis ?? item.horasDisponivel);
  const ht = numero(item.horasTrabalhadas ?? item.horasTrabalhada);
  const hv = numero(item.horasVendidas ?? item.horasCobradas);

  const produtividade =
    numero(item.produtividade) ||
    (hd > 0 ? (ht / hd) * 100 : 0);

  const eficiencia =
    numero(item.eficiencia) ||
    (ht > 0 ? (hv / ht) * 100 : 0);

  const relacaoVendidaDisponivel =
    hd > 0 ? (hv / hd) * 100 : 0;

  const bloqueios = [
    item.retrabalho,
    item.osInterna,
    item.osInternaPrejuizo,
    item.prejuizo,
    item.impericia
  ].map(normalizar);

  const possuiBloqueio = bloqueios.some(v =>
    ["SIM", "S", "TRUE", "1", "COM", "POSSUI"].includes(v)
  );

  return (
    produtividade >= 70 &&
    eficiencia >= 80 &&
    relacaoVendidaDisponivel >= 70 &&
    !possuiBloqueio
  );
}

function rankingProdutivos(competencia, filial = "") {
  const filialChave = normalizar(filial);
  const mapa = new Map();

  estado.lancamentosProdutivos
    .filter(item => texto(item.competencia) === competencia)
    .forEach(item => {
      const pessoa = dadosPessoa(item, estado.funcionariosProdutivos);

      if (cargoExcluido(pessoa.cargo)) return;
      if (filialChave && normalizar(pessoa.filial) !== filialChave) return;

      const faturamento = numero(
        item.faturamento ??
        item.faturamentoIndividual ??
        item.realizado ??
        item.realizadoMensal
      );

      if (faturamento <= 0) return;
      if (!produtivoBateuMeta(item)) return;

      const chave =
        texto(item.funcionarioId) ||
        `${normalizar(pessoa.nome)}::${normalizar(pessoa.filial)}`;

      const atual = mapa.get(chave) || {
        ...pessoa,
        faturamento: 0,
        metaMensal: 0
      };

      // Produtivos é mensal: evita inflar em caso de documento duplicado.
      atual.faturamento = Math.max(atual.faturamento, faturamento);
      mapa.set(chave, atual);
    });

  return [...mapa.values()]
    .sort((a, b) =>
      b.faturamento - a.faturamento ||
      String(a.nome).localeCompare(String(b.nome), "pt-BR")
    )
    .slice(0, 3);
}

function rankingPix(competencia, filial = "") {
  const filialChave = normalizar(filial);
  const mapa = new Map();

  estado.lancamentosPix
    .filter(item => texto(item.competencia) === competencia)
    .forEach(item => {
      const pessoa = dadosPessoa(item, estado.funcionariosPix);

      if (cargoExcluido(pessoa.cargo)) return;
      if (filialChave && normalizar(pessoa.filial) !== filialChave) return;

      const meta = numero(
        item.metaSemanal ??
        item.meta ??
        item.valorAcumulado
      );

      const realizado = numero(
        item.realizadoSemanal ??
        item.realizado ??
        item.valorTotal
      );

      const chave =
        texto(item.funcionarioId) ||
        `${normalizar(pessoa.nome)}::${normalizar(pessoa.filial)}`;

      const atual = mapa.get(chave) || {
        ...pessoa,
        faturamento: 0,
        metaMensal: 0,
        semanas: new Set()
      };

      const semana = String(item.semana ?? texto(item.id));

      if (!atual.semanas.has(semana)) {
        atual.semanas.add(semana);
        atual.faturamento += realizado;
        atual.metaMensal += meta;
      }

      mapa.set(chave, atual);
    });

  return [...mapa.values()]
    .filter(item =>
      item.metaMensal > 0 &&
      item.faturamento >= item.metaMensal
    )
    .sort((a, b) =>
      b.faturamento - a.faturamento ||
      String(a.nome).localeCompare(String(b.nome), "pt-BR")
    )
    .slice(0, 3);
}

function filiaisDisponiveis(tipo, competencia) {
  const lancamentos =
    tipo === "pix" ? estado.lancamentosPix : estado.lancamentosProdutivos;

  const funcionarios =
    tipo === "pix" ? estado.funcionariosPix : estado.funcionariosProdutivos;

  return [...new Set(
    lancamentos
      .filter(item => texto(item.competencia) === competencia)
      .map(item => dadosPessoa(item, funcionarios).filial)
      .filter(Boolean)
  )].sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
}

function coroaSvg(classe) {
  return `
    <svg class="podium-coroa ${classe}" viewBox="0 0 64 48" aria-hidden="true">
      <path d="M7 36 4 12l14 11L31 5l14 18 15-11-4 24H7Z" fill="currentColor"/>
      <path d="M9 39h46v5H9z" fill="currentColor"/>
      <circle cx="4" cy="9" r="4" fill="currentColor"/>
      <circle cx="31" cy="4" r="4" fill="currentColor"/>
      <circle cx="60" cy="9" r="4" fill="currentColor"/>
    </svg>
  `;
}

function card(pessoa, posicao) {
  const cfg = {
    1: { classe: "ouro", titulo: "1º LUGAR" },
    2: { classe: "prata", titulo: "2º LUGAR" },
    3: { classe: "bronze", titulo: "3º LUGAR" }
  }[posicao];

  if (!pessoa) {
    return `
      <article class="podium-card podium-vazio podium-${cfg.classe}">
        <div class="podium-coroa-wrap">${coroaSvg(cfg.classe)}</div>
        <span class="podium-posicao">${cfg.titulo}</span>
        <strong>Aguardando resultado</strong>
        <small>Nenhum colaborador elegível</small>
      </article>
    `;
  }

  const percentual =
    pessoa.metaMensal > 0
      ? (pessoa.faturamento / pessoa.metaMensal) * 100
      : 0;

  return `
    <article class="podium-card podium-${cfg.classe}">
      <div class="podium-brilho" aria-hidden="true"></div>${podiumBandeiraEstado(pessoa.filial)}
      <div class="podium-coroa-wrap">${coroaSvg(cfg.classe)}</div>
      <span class="podium-posicao">${cfg.titulo}</span>
      <h3>${escapar(pessoa.nome)}</h3>
      <p>${escapar(pessoa.cargo || "Colaborador")}</p>
      <div class="podium-filial">
        ${escapar(pessoa.filial || "—")}
        ${pessoa.dn ? ` · DN ${escapar(pessoa.dn)}` : ""}
      </div>
      <div class="podium-valor">
        <small>FATURAMENTO DO MÊS</small>
        <strong>${moeda.format(pessoa.faturamento)}</strong>
      </div>
      ${
        pessoa.metaMensal > 0
          ? `<div class="podium-meta">
               Meta: <strong>${moeda.format(pessoa.metaMensal)}</strong>
               <span>${percentual.toFixed(1).replace(".", ",")}%</span>
             </div>`
          : `<div class="podium-meta podium-meta-ok">
               <strong>✓ Meta da campanha atingida</strong>
             </div>`
      }
    </article>
  `;
}

function garantirEstilos() {
  if ($("#podiumCampanhasCss")) return;

  const style = document.createElement("style");
  style.id = "podiumCampanhasCss";
  style.textContent = `
    .podium-campanhas{
      --ink:#0f2a3d;
      --muted:#718392;
      --border:#dce6eb;
      --green:#07845e;
      --navy:#0d344d;
      position:relative;
      overflow:hidden;
      isolation:isolate;
      margin:18px 0;
      padding:26px;
      border:1px solid rgba(204,218,226,.92);
      border-radius:24px;
      background:
        radial-gradient(circle at 14% 0%,rgba(19,108,91,.10),transparent 28%),
        radial-gradient(circle at 86% 5%,rgba(194,146,30,.10),transparent 24%),
        linear-gradient(145deg,#ffffff 0%,#fbfdfd 48%,#f6fafb 100%);
      box-shadow:
        0 24px 60px rgba(18,47,67,.10),
        inset 0 1px 0 rgba(255,255,255,.95)
    }
    .podium-campanhas::before{
      content:"";
      position:absolute;
      inset:0 0 auto;
      height:5px;
      z-index:3;
      background:
        linear-gradient(
          90deg,
          #c99a12 0 33%,
          #b9c2ca 33% 66%,
          #b56d3f 66% 100%
        );
      box-shadow:0 2px 10px rgba(0,0,0,.07)
    }

    .podium-campanhas::after{
      content:"";
      position:absolute;
      width:260px;
      height:260px;
      right:-100px;
      bottom:-125px;
      z-index:-1;
      border-radius:50%;
      background:radial-gradient(circle,rgba(12,83,69,.09),transparent 68%);
      pointer-events:none
    }
    .podium-head{
      display:flex;
      align-items:flex-end;
      justify-content:space-between;
      gap:22px;
      margin-bottom:22px
    }
    .podium-eyebrow{
      display:inline-flex;
      align-items:center;
      gap:7px;
      margin:0 0 7px;
      color:var(--green);
      font-size:10px;
      font-weight:900;
      letter-spacing:.15em;
      text-transform:uppercase
    }
    .podium-eyebrow::before{
      content:"";
      width:7px;
      height:7px;
      border-radius:50%;
      background:#d1a72a;
      box-shadow:0 0 0 4px rgba(209,167,42,.11)
    }
    .podium-head h2{
      margin:0;
      color:var(--ink);
      font-size:24px;
      font-weight:900;
      line-height:1.12;
      letter-spacing:-.025em
    }
    .podium-head p{
      margin:8px 0 0;
      color:var(--muted);
      font-size:12px;
      line-height:1.5
    }
    .podium-controles{
      display:flex;
      align-items:center;
      gap:10px;
      flex-wrap:wrap
    }
    .podium-controles select{
      min-height:42px;
      padding:0 38px 0 13px;
      border:1px solid #cedce4;
      border-radius:12px;
      background:
        linear-gradient(180deg,#fff,#f9fbfc);
      color:#173249;
      font:inherit;
      font-size:12px;
      font-weight:800;
      outline:none;
      box-shadow:0 7px 18px rgba(18,47,67,.055);
      cursor:pointer;
      transition:.18s ease
    }
    .podium-controles select:hover{
      border-color:#b7cbd5;
      transform:translateY(-1px)
    }
    .podium-controles select:focus{
      border-color:#0b8a64;
      box-shadow:0 0 0 3px rgba(11,138,100,.10),0 8px 20px rgba(18,47,67,.07)
    }
    .podium-controles select:disabled{
      opacity:.62;
      cursor:not-allowed;
      transform:none
    }
    .podium-grid{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:16px;
      align-items:end;
      padding-top:34px
    }
    .podium-card{
      position:relative;
      min-height:290px;
      box-sizing:border-box;
      display:flex;
      flex-direction:column;
      align-items:center;
      overflow:visible;
      padding:58px 20px 20px;
      border:1px solid var(--border);
      border-radius:21px;
      background:#fff;
      text-align:center;
      box-shadow:
        0 14px 34px rgba(18,47,67,.085),
        inset 0 1px 0 rgba(255,255,255,.9);
      transition:
        transform .20s ease,
        box-shadow .20s ease,
        border-color .20s ease
    }
    .podium-card:hover{
      transform:translateY(-5px);
      box-shadow:
        0 24px 46px rgba(18,47,67,.14),
        inset 0 1px 0 rgba(255,255,255,.9)
    }
    .podium-ouro{
      order:2;
      min-height:330px;
      border-color:#e1c466;
      background:
        radial-gradient(circle at 50% 0%,rgba(231,188,51,.17),transparent 32%),
        linear-gradient(180deg,#fffaf0 0%,#fffdf8 36%,#fff 100%);
      box-shadow:
        0 20px 46px rgba(169,123,0,.13),
        inset 0 1px 0 rgba(255,255,255,.95)
    }
    .podium-prata{
      order:1;
      border-color:#d5dde3;
      background:
        radial-gradient(circle at 50% 0%,rgba(168,181,192,.18),transparent 33%),
        linear-gradient(180deg,#f7f9fb,#fff 46%)
    }
    .podium-bronze{
      order:3;
      border-color:#e7c3ae;
      background:
        radial-gradient(circle at 50% 0%,rgba(183,111,62,.16),transparent 33%),
        linear-gradient(180deg,#fff6f0,#fff 46%)
    }
    .podium-coroa-wrap{
      position:absolute;
      top:-34px;
      left:50%;
      width:78px;
      height:66px;
      display:grid;
      place-items:center;
      transform:translateX(-50%);
      border:1px solid rgba(220,230,235,.9);
      border-radius:22px;
      background:linear-gradient(180deg,#fff,#fbfcfd);
      box-shadow:0 13px 30px rgba(23,49,68,.16)
    }
    .podium-coroa{
      width:53px;
      height:42px;
      filter:drop-shadow(0 7px 8px rgba(0,0,0,.14))
    }
    .podium-coroa.ouro{color:#d6a514}
    .podium-coroa.prata{color:#98a4ae}
    .podium-coroa.bronze{color:#b66e3d}
    .podium-posicao{display:inline-flex;align-items:center;justify-content:center;min-height:25px;margin-bottom:12px;padding:0 10px;border-radius:999px;font-size:9px;font-weight:900;letter-spacing:.10em}
    .podium-ouro .podium-posicao{background:#fff1bd;color:#896000}.podium-prata .podium-posicao{background:#edf1f4;color:#65727d}.podium-bronze .podium-posicao{background:#f8e3d5;color:#8f4e26}
    .podium-card h3{
      margin:0;
      color:#102b3e;
      font-size:18px;
      font-weight:900;
      line-height:1.18;
      letter-spacing:-.015em
    }
    .podium-card>p{
      min-height:32px;
      margin:8px 0 4px;
      color:#667b8b;
      font-size:11px;
      line-height:1.4
    }
    .podium-filial{
      display:inline-flex;
      align-items:center;
      min-height:24px;
      margin-top:4px;
      padding:0 9px;
      border-radius:999px;
      background:#f1f5f7;
      color:#738794;
      font-size:9px;
      font-weight:800
    }
    .podium-valor{
      width:100%;
      margin-top:auto;
      padding:17px 0 11px;
      border-top:1px solid #e6edf1
    }
    .podium-valor small{
      display:block;
      margin-bottom:6px;
      color:#81919d;
      font-size:8px;
      font-weight:900;
      letter-spacing:.10em
    }
    .podium-valor strong{
      display:block;
      color:#0b7655;
      font-size:21px;
      font-weight:900;
      line-height:1;
      letter-spacing:-.03em
    }
    .podium-ouro .podium-valor strong{
      color:#a77800;
      font-size:25px
    }
    .podium-meta{width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:7px;margin-top:8px;padding:8px 9px;border-radius:9px;background:#eef8f4;color:#527064;font-size:9px}
    .podium-meta span{padding:3px 6px;border-radius:999px;background:#d9f2e8;color:#08704f;font-weight:900}.podium-meta-ok{color:#08704f;font-weight:800}
    .podium-brilho{position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none}
    .podium-ouro .podium-brilho::after{content:"";position:absolute;top:-80%;left:-30%;width:50%;height:250%;transform:rotate(22deg);background:linear-gradient(90deg,transparent,rgba(255,226,117,.22),transparent)}
    .podium-vazio{opacity:.65}.podium-vazio strong{margin-top:28px;color:#6f818f}.podium-vazio small{margin-top:8px;color:#95a3ad}
    .podium-legenda{
      display:flex;
      align-items:flex-start;
      gap:8px;
      margin-top:17px;
      padding:11px 13px;
      border:1px solid #e4ecef;
      border-radius:11px;
      background:rgba(248,251,252,.88);
      color:#728592;
      font-size:10px;
      line-height:1.45
    }
    .podium-legenda::before{
      content:"";
      width:7px;
      height:7px;
      flex:0 0 7px;
      margin-top:3px;
      border-radius:50%;
      background:#0a8b62;
      box-shadow:0 0 0 4px rgba(10,139,98,.08)
    }


    .podium-bandeira-estado{position:absolute;top:18px;right:18px;z-index:8;width:58px;height:42px;padding:4px;border-radius:11px;background:rgba(255,255,255,.94);border:1px solid rgba(255,255,255,.96);box-shadow:0 12px 28px rgba(17,42,61,.14),0 2px 7px rgba(17,42,61,.08);backdrop-filter:blur(10px);opacity:0;animation:podiumFlagReveal .72s .68s cubic-bezier(.16,1,.3,1) forwards;transform-origin:100% 0;transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s ease}
    .podium-bandeira-estado img{display:block;width:100%;height:100%;object-fit:cover;border-radius:7px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)}
    .podium-bandeira-estado span{position:absolute;right:-7px;bottom:-8px;min-width:25px;height:18px;padding:0 6px;display:flex;align-items:center;justify-content:center;border-radius:999px;background:#123047;color:#fff;border:2px solid #fff;box-shadow:0 4px 10px rgba(17,42,61,.18);font-size:8px;font-weight:950;letter-spacing:.08em}
    .podium-ouro .podium-bandeira-estado{border-color:rgba(223,174,37,.45);box-shadow:0 13px 30px rgba(171,126,0,.15),0 2px 8px rgba(17,42,61,.08)}
    .podium-card:hover .podium-bandeira-estado{transform:translateY(-3px) rotate(1.5deg) scale(1.045);box-shadow:0 17px 34px rgba(17,42,61,.18)}
    @keyframes podiumFlagReveal{0%{opacity:0;transform:translate(13px,-11px) rotate(5deg) scale(.74)}65%{opacity:1;transform:translate(-2px,2px) rotate(-1deg) scale(1.04)}100%{opacity:1;transform:translate(0,0) rotate(0) scale(1)}}
    @media(max-width:720px){.podium-bandeira-estado{top:14px;right:14px;width:50px;height:36px}}

    /* ==========================================================
       MOTION PREMIUM v06 — inspirado em princípios de motion UI:
       stagger, reveal, float, shimmer, glow e microinterações.
       ========================================================== */

    @keyframes podiumReveal {
      0% {
        opacity:0;
        transform:translateY(34px) scale(.94);
        filter:blur(8px)
      }
      65% {
        opacity:1;
        transform:translateY(-5px) scale(1.012);
        filter:blur(0)
      }
      100% {
        opacity:1;
        transform:translateY(0) scale(1);
        filter:blur(0)
      }
    }

    @keyframes podiumCrownDrop {
      0% {
        opacity:0;
        transform:translateX(-50%) translateY(-24px) rotate(-8deg) scale(.62)
      }
      58% {
        opacity:1;
        transform:translateX(-50%) translateY(4px) rotate(3deg) scale(1.08)
      }
      78% {
        transform:translateX(-50%) translateY(-2px) rotate(-1deg) scale(.98)
      }
      100% {
        opacity:1;
        transform:translateX(-50%) translateY(0) rotate(0) scale(1)
      }
    }

    @keyframes podiumCrownFloat {
      0%,100% { transform:translateY(0) rotate(-1deg) }
      50% { transform:translateY(-5px) rotate(1deg) }
    }

    @keyframes podiumGoldPulse {
      0%,100% {
        box-shadow:
          0 20px 46px rgba(169,123,0,.13),
          0 0 0 0 rgba(214,165,20,0)
      }
      50% {
        box-shadow:
          0 25px 58px rgba(169,123,0,.20),
          0 0 0 7px rgba(214,165,20,.055)
      }
    }

    @keyframes podiumShine {
      0% { transform:translateX(-180%) rotate(20deg) }
      55%,100% { transform:translateX(340%) rotate(20deg) }
    }

    @keyframes podiumBadgePop {
      0% { opacity:0; transform:scale(.72) translateY(8px) }
      70% { opacity:1; transform:scale(1.06) translateY(-1px) }
      100% { opacity:1; transform:scale(1) translateY(0) }
    }

    @keyframes podiumValueReveal {
      0% { opacity:0; transform:translateY(12px); letter-spacing:.04em }
      100% { opacity:1; transform:translateY(0); letter-spacing:-.03em }
    }

    @keyframes podiumAmbient {
      0%,100% { transform:translate3d(0,0,0) scale(1); opacity:.55 }
      50% { transform:translate3d(-18px,-8px,0) scale(1.08); opacity:.85 }
    }

    .podium-campanhas{
      animation:podiumReveal .72s cubic-bezier(.16,1,.3,1) both
    }

    .podium-campanhas::after{
      animation:podiumAmbient 7s ease-in-out infinite
    }

    .podium-card{
      opacity:0;
      animation:podiumReveal .78s cubic-bezier(.16,1,.3,1) forwards;
      will-change:transform,opacity
    }

    .podium-prata{animation-delay:.10s}
    .podium-ouro{animation-delay:.20s}
    .podium-bronze{animation-delay:.30s}

    .podium-ouro{
      animation:
        podiumReveal .78s .20s cubic-bezier(.16,1,.3,1) forwards,
        podiumGoldPulse 3.8s 1.1s ease-in-out infinite
    }

    .podium-coroa-wrap{
      opacity:0;
      animation:podiumCrownDrop .82s cubic-bezier(.16,1,.3,1) forwards
    }

    .podium-prata .podium-coroa-wrap{animation-delay:.30s}
    .podium-ouro .podium-coroa-wrap{animation-delay:.42s}
    .podium-bronze .podium-coroa-wrap{animation-delay:.54s}

    .podium-coroa{
      transform-origin:50% 70%;
      animation:podiumCrownFloat 3.2s 1.2s ease-in-out infinite
    }

    .podium-posicao{
      opacity:0;
      animation:podiumBadgePop .55s cubic-bezier(.16,1,.3,1) forwards
    }

    .podium-prata .podium-posicao{animation-delay:.48s}
    .podium-ouro .podium-posicao{animation-delay:.60s}
    .podium-bronze .podium-posicao{animation-delay:.72s}

    .podium-valor strong{
      opacity:0;
      animation:podiumValueReveal .62s .72s cubic-bezier(.16,1,.3,1) forwards
    }

    .podium-brilho::after{
      content:"";
      position:absolute;
      top:-45%;
      left:-35%;
      width:18%;
      height:190%;
      pointer-events:none;
      background:linear-gradient(
        90deg,
        transparent,
        rgba(255,255,255,.72),
        transparent
      );
      filter:blur(1px);
      animation:podiumShine 4.8s 1.4s cubic-bezier(.4,0,.2,1) infinite
    }

    .podium-ouro .podium-brilho::after{
      background:linear-gradient(
        90deg,
        transparent,
        rgba(255,222,104,.58),
        rgba(255,255,255,.82),
        transparent
      )
    }

    .podium-card:hover .podium-coroa{
      animation-duration:1.45s
    }

    .podium-card:hover .podium-posicao{
      transform:translateY(-2px)
    }

    .podium-card h3,
    .podium-card>p,
    .podium-filial,
    .podium-meta{
      transition:transform .22s ease,box-shadow .22s ease
    }

    .podium-card:hover h3{transform:translateY(-2px)}
    .podium-card:hover .podium-filial{
      transform:translateY(-1px);
      box-shadow:0 6px 14px rgba(18,47,67,.07)
    }

    .podium-controles select{
      transition:
        transform .2s cubic-bezier(.16,1,.3,1),
        box-shadow .2s ease,
        border-color .2s ease
    }

    .podium-controles select:active{
      transform:scale(.98)
    }

    /* Respeita acessibilidade do dispositivo */
    @media (prefers-reduced-motion: reduce){
      .podium-campanhas,
      .podium-card,
      .podium-coroa-wrap,
      .podium-coroa,
      .podium-posicao,
      .podium-valor strong,
      .podium-brilho::after,
      .podium-campanhas::after{
        animation:none !important;
        opacity:1 !important;
        transform:none !important;
        filter:none !important
      }
    }

    @media(max-width:900px){
      .podium-head{align-items:stretch;flex-direction:column}
      .podium-controles{display:grid;grid-template-columns:1fr 1fr}
      .podium-controles select{width:100%}
      .podium-grid{grid-template-columns:1fr;padding-top:34px;gap:48px}
      .podium-card,.podium-ouro{min-height:260px}
      .podium-ouro{order:1}
      .podium-prata{order:2}
      .podium-bronze{order:3}
    }
    @media(max-width:520px){
      .podium-campanhas{
        margin:14px 0;
        padding:20px 14px;
        border-radius:18px
      }
      .podium-controles{grid-template-columns:1fr}
      .podium-head h2{font-size:20px}
      .podium-card{padding-left:16px;padding-right:16px}
      .podium-valor strong{font-size:20px}
      .podium-ouro .podium-valor strong{font-size:23px}
    }
  `;
  document.head.appendChild(style);
}

function htmlPainel(tipo) {
  const competencia = competenciaAtual();
  const modo = tipo === "pix" ? estado.modoPix : estado.modoProdutivos;
  const filial = tipo === "pix" ? estado.filialPix : estado.filialProdutivos;
  const filiais = filiaisDisponiveis(tipo, competencia);

  const ranking = tipo === "pix"
    ? rankingPix(competencia, modo === "filial" ? filial : "")
    : rankingProdutivos(competencia, modo === "filial" ? filial : "");

  const id = tipo === "pix" ? "podiumMensalPix" : "podiumMensalProdutivos";
  const titulo = tipo === "pix" ? "Pódio mensal do Pix" : "Pódio mensal dos Produtivos";
  const modulo = tipo === "pix" ? "PIX DO PRESIDENTE" : "CAMPANHA DOS PRODUTIVOS";

  return `
    <section id="${id}" class="podium-campanhas" data-podium-tipo="${tipo}">
      <header class="podium-head">
        <div>
          <div class="podium-eyebrow">RECONHECIMENTO · ${modulo}</div>
          <h2>${titulo}</h2>
          <p>Top 3 de faturamento que atingiram a meta · ${escapar(competencia)}</p>
        </div>
        <div class="podium-controles">
          <select data-podium-modo="${tipo}">
            <option value="geral" ${modo === "geral" ? "selected" : ""}>Pódio geral</option>
            <option value="filial" ${modo === "filial" ? "selected" : ""}>Pódio por filial</option>
          </select>
          <select data-podium-filial="${tipo}" ${modo !== "filial" ? "disabled" : ""}>
            <option value="">Selecione a filial</option>
            ${filiais.map(unidade => `
              <option value="${escapar(unidade)}" ${normalizar(unidade) === normalizar(filial) ? "selected" : ""}>
                ${escapar(unidade)}
              </option>`).join("")}
          </select>
        </div>
      </header>
      <div class="podium-grid">
        ${card(ranking[0], 1)}
        ${card(ranking[1], 2)}
        ${card(ranking[2], 3)}
      </div>
      <div class="podium-legenda">
        Somente colaboradores com resultado individual participam. Gerentes, Supervisores, Coordenadores, Orçamentistas e cargos cujo cálculo depende da equipe ficam fora. O ranking considera o faturamento do mês selecionado.
      </div>
    </section>
  `;
}

function ancoraProdutivos() {
  return (
    $("#dashboard") ||
    $("#visao-geral") ||
    $("#visaoGeral") ||
    $('[data-view="dashboard"]')
  );
}

function ancoraPix() {
  return $("#dashboardPixGestorConteudo") || $("#pix-dashboard");
}

function inserirOuAtualizar(tipo) {
  const id = tipo === "pix" ? "podiumMensalPix" : "podiumMensalProdutivos";
  const atual = $("#" + id);
  const html = htmlPainel(tipo).trim();

  if (atual) {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const novo = temp.firstElementChild;
    if (novo) {
      atual.replaceWith(novo);
      reiniciarMotionPodium(novo);
    }
    return;
  }

  const ancora = tipo === "pix" ? ancoraPix() : ancoraProdutivos();
  if (!ancora) return;

  if (tipo === "pix") {
    ancora.insertAdjacentHTML("afterbegin", html);
    reiniciarMotionPodium($("#" + id));
  } else {
    const comparativo = $("#comparativoMensalProdutivos");
    if (comparativo) comparativo.insertAdjacentHTML("afterend", html);
    else ancora.insertAdjacentHTML("afterbegin", html);
    reiniciarMotionPodium($("#" + id));
  }
}

function reiniciarMotionPodium(elemento) {
  if (!elemento) return;

  elemento.classList.remove("podium-motion-ready");

  // Força somente o recálculo visual necessário para reiniciar as animações.
  void elemento.offsetWidth;

  requestAnimationFrame(() => {
    elemento.classList.add("podium-motion-ready");
  });
}

let timer = null;
function renderizar() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    garantirEstilos();
    inserirOuAtualizar("produtivos");
    inserirOuAtualizar("pix");
  }, 60);
}

function eventos() {
  document.addEventListener("change", evento => {
    const alvo = evento.target;

    if (alvo.matches('[data-podium-modo="produtivos"]')) {
      estado.modoProdutivos = alvo.value;
      if (alvo.value === "geral") estado.filialProdutivos = "";
      renderizar();
      return;
    }

    if (alvo.matches('[data-podium-filial="produtivos"]')) {
      estado.filialProdutivos = alvo.value;
      renderizar();
      return;
    }

    if (alvo.matches('[data-podium-modo="pix"]')) {
      estado.modoPix = alvo.value;
      if (alvo.value === "geral") estado.filialPix = "";
      renderizar();
      return;
    }

    if (alvo.matches('[data-podium-filial="pix"]')) {
      estado.filialPix = alvo.value;
      renderizar();
      return;
    }

    if (["competenciaGlobal", "pixDashboardCompetencia", "pixFiltroCompetencia"].includes(alvo.id)) {
      estado.filialProdutivos = "";
      estado.filialPix = "";
      setTimeout(renderizar, 80);
    }
  });

  document.addEventListener("click", evento => {
    const botao = evento.target.closest("button");
    if (!botao) return;

    if (["btnMesAnterior", "btnMesSeguinte"].includes(botao.id)) {
      setTimeout(renderizar, 120);
      setTimeout(renderizar, 350);
    }
  });
}

function observar(nomeColecao, chave) {
  onSnapshot(
    collection(firestore, nomeColecao),
    snapshot => {
      estado[chave] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderizar();
    },
    erro => console.error(`[PÓDIO] Erro ao ler ${nomeColecao}:`, erro)
  );
}

function iniciar() {
  garantirEstilos();
  eventos();

  observar("funcionarios", "funcionariosProdutivos");
  observar("produtivos_lancamentos", "lancamentosProdutivos");
  observar("pix_presidente_funcionarios", "funcionariosPix");
  observar("pix_presidente_lancamentos", "lancamentosPix");

  const observer = new MutationObserver(() => {
    const faltaProd = Boolean(ancoraProdutivos() && !$("#podiumMensalProdutivos"));
    const faltaPix = Boolean(ancoraPix() && !$("#podiumMensalPix"));
    if (faltaProd || faltaPix) renderizar();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(renderizar, 700);
  console.info(`[PÓDIO] ${PODIUM_VERSAO} carregado`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar, { once: true });
} else {
  iniciar();
}

window.podiumCampanhas = {
  atualizar: renderizar,
  rankingProdutivos: competencia => rankingProdutivos(competencia || competenciaAtual()),
  rankingPix: competencia => rankingPix(competencia || competenciaAtual()),
  versao: PODIUM_VERSAO
};