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
import { supabase } from "./supabase-config.js";
import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const PODIUM_VERSAO = "2026.09.01-13-SUPABASE-PRODUTIVOS";

const estado = {
  funcionariosProdutivos: [],
  lancamentosProdutivos: [],
  funcionariosPix: [],
  lancamentosPix: [],
  modoProdutivos: "geral",
  filialProdutivos: "",
  modoPix: "geral",
  filialPix: "",
  categoriaPix: "consultor-tecnico"
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

function chaveFilialPodium(valor) {
  return normalizar(valor)
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+(MA|PI|MT|PA|RO|AP)$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function rotuloFilialPodium(valor) {
  const chave = chaveFilialPodium(valor);

  if (chave === "SAO LUIS") return "SÃO LUÍS";
  if (chave === "URUCUI") return "URUÇUÍ-PI";

  return texto(valor);
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
 const uf=PODIUM_UF_POR_FILIAL[chaveFilialPodium(filial)]||"";
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


function percentualSeguro(valor) {
  const n = numero(valor);
  return Number.isFinite(n) ? n : 0;
}

function metaMonetariaProdutivo(item) {
  return numero(
    item.metaIndividual ??
    item.metaFaturamento ??
    item.metaMensal ??
    item.objetivoMensal ??
    item.objetivo ??
    item.meta ??
    0
  );
}

function ticketMedioRegistro(item) {
  return numero(
    item.ticketMedio ??
    item.ticketMedioMensal ??
    item.ticket ??
    0
  );
}

function dadosTecnicosProdutivo(item) {
  const hd = numero(
    item.horasDisponiveis ??
    item.horasDisponivel
  );

  const ht = numero(
    item.horasTrabalhadas ??
    item.horasTrabalhada
  );

  const hv = numero(
    item.horasVendidas ??
    item.horasCobradas
  );

  const produtividade =
    numero(item.produtividade) ||
    (
      hd > 0
        ? (ht / hd) * 100
        : 0
    );

  const eficiencia =
    numero(item.eficiencia) ||
    (
      ht > 0
        ? (hv / ht) * 100
        : 0
    );

  const relacaoVendidaDisponivel =
    hd > 0
      ? (hv / hd) * 100
      : 0;

  /*
   * O colaborador precisa cumprir os três critérios.
   * Para o ranking técnico, usamos o menor atingimento relativo
   * entre eles; assim ninguém sobe no pódio por estourar apenas
   * um indicador e ficar no limite dos demais.
   */
  const atingimentos = [
    produtividade > 0
      ? produtividade / 70 * 100
      : 0,
    eficiencia > 0
      ? eficiencia / 80 * 100
      : 0,
    relacaoVendidaDisponivel > 0
      ? relacaoVendidaDisponivel / 70 * 100
      : 0
  ];

  const atingimento =
    Math.min(
      ...atingimentos
    );

  return {
    produtividade,
    eficiencia,
    relacaoVendidaDisponivel,
    atingimento:
      Number.isFinite(atingimento)
        ? atingimento
        : 0
  };
}

function compararRankingJusto(a, b) {
  const diferencaPercentual =
    numero(b.percentualAtingimento) -
    numero(a.percentualAtingimento);

  /*
   * Consideramos empate quando a diferença é inferior
   * a 0,005 ponto percentual, evitando ruído de casas decimais.
   */
  if (
    Math.abs(
      diferencaPercentual
    ) >= 0.005
  ) {
    return diferencaPercentual;
  }

  const diferencaTicket =
    numero(b.ticketMedioDesempate) -
    numero(a.ticketMedioDesempate);

  if (
    Math.abs(
      diferencaTicket
    ) >= 0.005
  ) {
    return diferencaTicket;
  }

  const diferencaRealizado =
    numero(b.faturamento) -
    numero(a.faturamento);

  if (
    Math.abs(
      diferencaRealizado
    ) >= 0.005
  ) {
    return diferencaRealizado;
  }

  return String(
    a.nome
  ).localeCompare(
    String(
      b.nome
    ),
    "pt-BR"
  );
}

function rankingProdutivos(competencia, filial = "") {
  const filialChave =
    chaveFilialPodium(
      filial
    );

  const mapa =
    new Map();

  estado.lancamentosProdutivos
    .filter(
      item =>
        texto(
          item.competencia
        ) === competencia
    )
    .forEach(
      item => {
        const pessoa =
          dadosPessoa(
            item,
            estado.funcionariosProdutivos
          );

        if (
          cargoExcluido(
            pessoa.cargo
          )
        ) {
          return;
        }

        if (
          filialChave &&
          chaveFilialPodium(
            pessoa.filial
          ) !== filialChave
        ) {
          return;
        }

        const faturamento =
          numero(
            item.faturamento ??
            item.faturamentoIndividual ??
            item.realizado ??
            item.realizadoMensal
          );

        if (
          faturamento <= 0
        ) {
          return;
        }

        const metaMonetaria =
          metaMonetariaProdutivo(
            item
          );

        const ticket =
          ticketMedioRegistro(
            item
          );

        const tecnico =
          dadosTecnicosProdutivo(
            item
          );

        const chave =
          texto(
            item.funcionarioId
          ) ||
          `${normalizar(
            pessoa.nome
          )}::${normalizar(
            pessoa.filial
          )}`;

        const atual =
          mapa.get(
            chave
          ) || {
            ...pessoa,
            faturamento: 0,
            metaMensal: 0,
            percentualAtingimento: 0,
            percentualSuperacao: 0,
            ticketMedioDesempate: 0,
            tipoMetaPodium:
              metaMonetaria > 0
                ? "monetaria"
                : "tecnica",
            produtividade: 0,
            eficiencia: 0,
            relacaoVendidaDisponivel: 0
          };

        /*
         * Produtivos é mensal.
         * Mantemos apenas o registro de maior faturamento,
         * como a versão anterior já fazia para evitar duplicidade.
         */
        if (
          faturamento >=
          atual.faturamento
        ) {
          atual.faturamento =
            faturamento;

          atual.ticketMedioDesempate =
            ticket;

          if (
            metaMonetaria > 0
          ) {
            atual.tipoMetaPodium =
              "monetaria";

            atual.metaMensal =
              metaMonetaria;

            atual.percentualAtingimento =
              faturamento /
              metaMonetaria *
              100;
          } else {
            atual.tipoMetaPodium =
              "tecnica";

            atual.metaMensal =
              0;

            atual.produtividade =
              tecnico.produtividade;

            atual.eficiencia =
              tecnico.eficiencia;

            atual.relacaoVendidaDisponivel =
              tecnico.relacaoVendidaDisponivel;

            atual.percentualAtingimento =
              tecnico.atingimento;
          }

          atual.percentualSuperacao =
            Math.max(
              0,
              atual.percentualAtingimento -
              100
            );
        }

        mapa.set(
          chave,
          atual
        );
      }
    );

  return [
    ...mapa.values()
  ]
    .filter(
      item =>
        numero(item.faturamento) > 0 &&
        numero(item.percentualAtingimento) > 0
    )
    .sort(
      compararRankingJusto
    )
    .slice(
      0,
      3
    );
}

function categoriaPixDoCargo(cargo) {
  const c =
    normalizar(
      cargo
    );

  if (
    c.includes(
      "CONSULTOR TECNICO"
    )
  ) {
    return "consultor-tecnico";
  }

  if (
    c.includes(
      "CONSULTOR PECAS BALCAO"
    ) ||
    c.includes(
      "CONSULTOR DE PECAS BALCAO"
    ) ||
    c.includes(
      "CONSULTOR DE PECAS"
    )
  ) {
    return "consultor-balcao";
  }

  return "";
}

function rotuloCategoriaPix(categoria) {
  if (
    categoria ===
    "consultor-tecnico"
  ) {
    return "Consultor Técnico";
  }

  if (
    categoria ===
    "consultor-balcao"
  ) {
    return "Consultor de Balcão";
  }

  return "Pix do Presidente";
}

function rankingPix(competencia, filial = "", categoria = "") {
  const filialChave =
    chaveFilialPodium(
      filial
    );

  const mapa =
    new Map();

  estado.lancamentosPix
    .filter(
      item =>
        texto(
          item.competencia
        ) === competencia
    )
    .forEach(
      item => {
        const pessoa =
          dadosPessoa(
            item,
            estado.funcionariosPix
          );

        if (
          cargoExcluido(
            pessoa.cargo
          )
        ) {
          return;
        }

        const categoriaPessoa =
          categoriaPixDoCargo(
            pessoa.cargo
          );

        /*
         * No Pix, o diretor solicitou pódios independentes.
         * Consultor Técnico não concorre com Consultor de Balcão.
         */
        if (
          categoria &&
          categoriaPessoa !==
            categoria
        ) {
          return;
        }

        /*
         * Quando uma categoria foi solicitada, somente os cargos
         * reconhecidos daquela categoria entram no ranking.
         */
        if (
          categoria &&
          !categoriaPessoa
        ) {
          return;
        }

        if (
          filialChave &&
          chaveFilialPodium(
            pessoa.filial
          ) !== filialChave
        ) {
          return;
        }

        const meta =
          numero(
            item.metaSemanal ??
            item.meta ??
            item.valorAcumulado
          );

        const realizado =
          numero(
            item.realizadoSemanal ??
            item.realizado ??
            item.valorTotal
          );

        const ticket =
          ticketMedioRegistro(
            item
          );

        const chave =
          texto(
            item.funcionarioId
          ) ||
          `${normalizar(
            pessoa.nome
          )}::${normalizar(
            pessoa.filial
          )}`;

        const atual =
          mapa.get(
            chave
          ) || {
            ...pessoa,
            faturamento: 0,
            metaMensal: 0,
            percentualAtingimento: 0,
            percentualSuperacao: 0,
            ticketMedioDesempate: 0,
            ticketSoma: 0,
            ticketQtd: 0,
            semanas: new Set(),
            tipoMetaPodium: "monetaria"
          };

        const semana =
          String(
            item.semana ??
            texto(
              item.id
            )
          );

        /*
         * Continua protegendo contra duplicidade semanal,
         * exatamente como a versão anterior.
         */
        if (
          !atual.semanas.has(
            semana
          )
        ) {
          atual.semanas.add(
            semana
          );

          atual.faturamento +=
            realizado;

          atual.metaMensal +=
            meta;

          if (
            ticket > 0
          ) {
            atual.ticketSoma +=
              ticket;

            atual.ticketQtd +=
              1;
          }
        }

        atual.ticketMedioDesempate =
          atual.ticketQtd > 0
            ? atual.ticketSoma /
              atual.ticketQtd
            : 0;

        atual.percentualAtingimento =
          atual.metaMensal > 0
            ? atual.faturamento /
              atual.metaMensal *
              100
            : 0;

        atual.percentualSuperacao =
          Math.max(
            0,
            atual.percentualAtingimento -
            100
          );

        mapa.set(
          chave,
          atual
        );
      }
    );

  return [
    ...mapa.values()
  ]
    .filter(
      item =>
        item.metaMensal > 0 &&
        item.faturamento >=
          item.metaMensal
    )
    .sort(
      compararRankingJusto
    )
    .slice(
      0,
      3
    );
}
function filiaisDisponiveis(tipo, competencia) {
  const lancamentos =
    tipo === "pix" ? estado.lancamentosPix : estado.lancamentosProdutivos;

  const funcionarios =
    tipo === "pix" ? estado.funcionariosPix : estado.funcionariosProdutivos;

  const unidades = new Map();

  lancamentos
    .filter(item => texto(item.competencia) === competencia)
    .map(item => dadosPessoa(item, funcionarios).filial)
    .filter(Boolean)
    .forEach(filial => {
      const chave = chaveFilialPodium(filial);
      if (chave && !unidades.has(chave)) {
        unidades.set(chave, rotuloFilialPodium(filial));
      }
    });

  if (!unidades.has("URUCUI")) {
    unidades.set("URUCUI", "URUÇUÍ-PI");
  }

  return [...unidades.values()]
    .sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
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
    1: {
      classe: "ouro",
      titulo: "1º LUGAR"
    },
    2: {
      classe: "prata",
      titulo: "2º LUGAR"
    },
    3: {
      classe: "bronze",
      titulo: "3º LUGAR"
    }
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

  const atingimento =
    numero(
      pessoa.percentualAtingimento
    );

  const superacao =
    Math.max(
      0,
      numero(
        pessoa.percentualSuperacao
      )
    );

  const percentualPrincipal =
    atingimento >= 100
      ? superacao
      : atingimento;

  const percentualFormatado =
    percentualPrincipal
      .toFixed(1)
      .replace(
        ".",
        ","
      );

  const atingimentoFormatado =
    atingimento
      .toFixed(1)
      .replace(
        ".",
        ","
      );

  const ticket =
    numero(
      pessoa.ticketMedioDesempate
    );

  const detalheMeta =
    pessoa.tipoMetaPodium ===
    "tecnica"
      ? `
        <div class="podium-meta podium-meta-tecnica">
          <div>
            <small>META TÉCNICA</small>
            <strong>
              Prod. 70% · Efic. 80% · HV/HD 70%
            </strong>
          </div>
          <div>
            <small>REALIZADO</small>
            <strong>
              Prod. ${numero(pessoa.produtividade).toFixed(1).replace(".", ",")}%
              · Efic. ${numero(pessoa.eficiencia).toFixed(1).replace(".", ",")}%
              · HV/HD ${numero(pessoa.relacaoVendidaDisponivel).toFixed(1).replace(".", ",")}%
            </strong>
          </div>
        </div>
      `
      : `
        <div class="podium-meta podium-meta-financeira">
          <div>
            <small>META</small>
            <strong>
              ${moeda.format(
                pessoa.metaMensal
              )}
            </strong>
          </div>

          <span
            class="podium-meta-seta"
            aria-hidden="true"
          >
            →
          </span>

          <div>
            <small>REALIZADO</small>
            <strong>
              ${moeda.format(
                pessoa.faturamento
              )}
            </strong>
          </div>
        </div>
      `;

  return `
    <article class="podium-card podium-${cfg.classe}">
      <div class="podium-brilho" aria-hidden="true"></div>

      ${podiumBandeiraEstado(
        pessoa.filial
      )}

      <div class="podium-coroa-wrap">
        ${coroaSvg(
          cfg.classe
        )}
      </div>

      <span class="podium-posicao">
        ${cfg.titulo}
      </span>

      <h3>
        ${escapar(
          pessoa.nome
        )}
      </h3>

      <p>
        ${escapar(
          pessoa.cargo ||
          "Colaborador"
        )}
      </p>

      <div class="podium-filial">
        ${escapar(
          pessoa.filial ||
          "—"
        )}

        ${
          pessoa.dn
            ? ` · DN ${escapar(
                pessoa.dn
              )}`
            : ""
        }
      </div>

      <div class="podium-superacao">
        <small>
          ${atingimento >= 100 ? "SUPERAÇÃO DA META" : "ATINGIMENTO DA META"}
        </small>

        <strong>
          ${atingimento >= 100 ? "+" : ""}${percentualFormatado}%
        </strong>

        <span>
          ${atingimentoFormatado}% de atingimento
        </span>
      </div>

      ${detalheMeta}

      ${
        ticket > 0
          ? `
            <div
              class="podium-desempate"
              title="Usado apenas quando houver empate no percentual de atingimento"
            >
              Critério de desempate · Ticket médio:
              <strong>
                ${moeda.format(
                  ticket
                )}
              </strong>
            </div>
          `
          : ""
      }

      <!--
        Compatibilidade com o módulo de homenagem já instalado:
        mantém o realizado disponível no mesmo seletor antigo,
        porém sem exibi-lo como destaque visual.
      -->
      <div
        class="podium-valor podium-valor-compat"
        aria-hidden="true"
      >
        <small>REALIZADO</small>
        <strong>
          ${moeda.format(
            pessoa.faturamento
          )}
        </strong>
      </div>
    </article>
  `;
}
function garantirEstilos() {
  if ($("#podiumCampanhasCss")) return;

  const style = document.createElement("style");
  style.id = "podiumCampanhasCss";
  style.textContent = `

    .podium-pix-switch{display:inline-flex;align-items:center;gap:7px;padding:5px;border:1px solid #d8e4e8;border-radius:14px;background:rgba(255,255,255,.84);box-shadow:0 8px 22px rgba(15,48,68,.07),inset 0 1px 0 rgba(255,255,255,.95);backdrop-filter:blur(12px)}
    .podium-pix-switch button{appearance:none;border:0;min-height:36px;padding:0 15px;border-radius:10px;background:transparent;color:#587080;font:inherit;font-size:9px;font-weight:950;cursor:pointer;transition:transform .22s ease,box-shadow .22s ease,background .22s ease,color .22s ease}
    .podium-pix-switch button:hover{transform:translateY(-1px);color:#12364a;background:#f1f6f7}
    .podium-pix-switch button.is-active{color:#fff;background:linear-gradient(135deg,#0b7459,#07936b);box-shadow:0 7px 18px rgba(8,126,91,.20),inset 0 1px 0 rgba(255,255,255,.18)}
    .podium-pix-switch button.is-active[data-podium-categoria-escolha="consultor-balcao"]{background:linear-gradient(135deg,#174f78,#2b78aa);box-shadow:0 7px 18px rgba(38,105,164,.20),inset 0 1px 0 rgba(255,255,255,.18)}
    @media(max-width:720px){.podium-pix-switch{display:grid;grid-template-columns:1fr 1fr;width:100%}.podium-pix-switch button{padding:0 9px;white-space:normal;line-height:1.15}}

    .podium-pix-categorias{
      display:grid;
      gap:28px;
      margin-top:22px
    }

    .podium-pix-categorias > .podium-campanhas{
      margin-top:0
    }

    .podium-categoria-selo{
      display:inline-flex;
      align-items:center;
      gap:7px;
      margin-top:9px;
      padding:6px 10px;
      border:1px solid #dce7eb;
      border-radius:999px;
      background:rgba(247,250,251,.90);
      color:#456375;
      font-size:8px;
      font-weight:950;
      letter-spacing:.08em;
      text-transform:uppercase
    }

    .podium-categoria-selo::before{
      content:"";
      width:7px;
      height:7px;
      border-radius:50%;
      background:#0a8b62;
      box-shadow:0 0 0 4px rgba(10,139,98,.08)
    }

    #podiumMensalPixTecnico{
      border-top:3px solid rgba(12,126,91,.70)
    }

    #podiumMensalPixBalcao{
      border-top:3px solid rgba(38,105,164,.65)
    }

    #podiumMensalPixBalcao .podium-categoria-selo::before{
      background:#356fa4;
      box-shadow:0 0 0 4px rgba(53,111,164,.08)
    }

    @media(max-width:720px){
      .podium-pix-categorias{
        gap:20px;
        margin-top:16px
      }
    }

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
    /* ==========================================================
       RANKING JUSTO v09 — percentual em destaque
       ========================================================== */
    .podium-superacao{
      width:100%;
      margin-top:auto;
      padding:18px 10px 14px;
      border-top:1px solid #e6edf1;
      text-align:center
    }
    .podium-superacao small{
      display:block;
      margin-bottom:7px;
      color:#81919d;
      font-size:8px;
      font-weight:950;
      letter-spacing:.13em
    }
    .podium-superacao strong{
      display:block;
      color:#087956;
      font-size:36px;
      font-weight:950;
      line-height:.95;
      letter-spacing:-.045em;
      text-shadow:0 8px 20px rgba(8,121,86,.10)
    }
    .podium-superacao span{
      display:block;
      margin-top:7px;
      color:#718592;
      font-size:9px;
      font-weight:800
    }
    .podium-ouro .podium-superacao strong{
      color:#a77800;
      font-size:42px;
      text-shadow:0 9px 22px rgba(167,120,0,.13)
    }
    .podium-meta-financeira{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);
      align-items:center;
      gap:9px;
      text-align:left
    }
    .podium-meta-financeira>div{
      min-width:0
    }
    .podium-meta-financeira small,
    .podium-meta-tecnica small{
      display:block;
      margin-bottom:3px;
      color:#84949f;
      font-size:7px;
      font-weight:900;
      letter-spacing:.08em
    }
    .podium-meta-financeira strong{
      display:block;
      overflow:hidden;
      color:#345266;
      font-size:10px;
      font-weight:900;
      text-overflow:ellipsis;
      white-space:nowrap
    }
    .podium-meta-financeira>div:last-child{
      text-align:right
    }
    .podium-meta-seta{
      color:#9aabb5;
      font-size:13px;
      font-weight:900
    }
    .podium-meta-tecnica{
      display:grid!important;
      grid-template-columns:1fr;
      gap:7px;
      text-align:left
    }
    .podium-meta-tecnica strong{
      display:block;
      color:#345266;
      font-size:8px;
      font-weight:850;
      line-height:1.35
    }
    .podium-desempate{
      width:100%;
      margin-top:8px;
      padding:7px 9px;
      border:1px dashed #dfe8ec;
      border-radius:9px;
      background:rgba(249,251,252,.86);
      color:#84949e;
      font-size:7.5px;
      line-height:1.3
    }
    .podium-desempate strong{
      color:#526a79;
      font-weight:900
    }
    .podium-valor-compat{
      display:none!important
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
       V10 — CAMPEÃO EM DESTAQUE
       O 1º lugar precisa dominar visualmente o pódio no desktop,
       sem prejudicar a leitura mobile.
       ========================================================== */
    @media (min-width: 721px){
      .podium-grid{
        align-items:end;
        padding-top:54px;
      }

      .podium-card{
        min-height:330px;
      }

      .podium-card.podium-ouro{
        min-height:392px;
        margin-top:-34px;
        padding-top:54px;
        border-width:2px;
        transform:scale(1.035);
        transform-origin:center bottom;
        z-index:12;
        box-shadow:
          0 30px 70px rgba(169,123,0,.20),
          0 10px 26px rgba(17,42,61,.10),
          0 0 0 5px rgba(214,165,20,.055);
      }

      .podium-card.podium-ouro:hover{
        transform:translateY(-7px) scale(1.045);
      }

      .podium-ouro .podium-coroa-wrap{
        width:78px;
        height:78px;
        top:-39px;
        box-shadow:
          0 18px 38px rgba(169,123,0,.20),
          0 5px 14px rgba(17,42,61,.12);
      }

      .podium-ouro .podium-coroa-wrap svg{
        width:54px;
        height:54px;
      }

      .podium-ouro .podium-posicao{
        padding:7px 14px;
        font-size:9px;
        letter-spacing:.10em;
      }

      .podium-ouro h3{
        margin-top:12px;
        font-size:17px;
        line-height:1.15;
      }

      .podium-ouro p{
        font-size:10px;
      }

      .podium-ouro .podium-filial{
        margin-top:13px;
        padding:6px 10px;
        font-size:9px;
      }

      .podium-ouro .podium-superacao{
        margin-top:auto;
        padding-top:22px;
        padding-bottom:18px;
      }

      .podium-ouro .podium-superacao small{
        font-size:9px;
      }

      .podium-ouro .podium-superacao strong{
        font-size:52px;
        line-height:.92;
      }

      .podium-ouro .podium-superacao span{
        margin-top:9px;
        font-size:10px;
      }

      .podium-ouro .podium-meta{
        padding:11px 12px;
      }

      .podium-ouro .podium-meta-financeira strong{
        font-size:11px;
      }

      .podium-ouro .podium-bandeira-estado{
        top:20px;
        right:20px;
        width:64px;
        height:46px;
      }
    }

    @media (max-width: 720px){
      .podium-card.podium-ouro{
        order:-1;
        min-height:360px;
        border-width:2px;
        box-shadow:
          0 24px 54px rgba(169,123,0,.18),
          0 8px 20px rgba(17,42,61,.09);
      }

      .podium-ouro .podium-superacao strong{
        font-size:44px;
      }
    }


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
      .podium-superacao strong{font-size:34px}
      .podium-ouro .podium-superacao strong{font-size:38px}
      .podium-meta-financeira{grid-template-columns:1fr auto 1fr}
      .podium-meta-financeira strong{font-size:9px}
      .podium-valor strong{font-size:20px}
      .podium-ouro .podium-valor strong{font-size:23px}
    }
  `;
  document.head.appendChild(style);
}

function htmlPainelPixCategoria(
  categoria,
  competencia,
  modo,
  filial,
  filiais
) {
  const ranking =
    rankingPix(
      competencia,
      modo === "filial"
        ? filial
        : "",
      categoria
    );

  const tecnico =
    categoria ===
    "consultor-tecnico";

  const id =
    tecnico
      ? "podiumMensalPixTecnico"
      : "podiumMensalPixBalcao";

  const titulo =
    tecnico
      ? "Pódio · Consultor Técnico"
      : "Pódio · Consultor de Balcão";

  const descricao =
    tecnico
      ? "Ranking exclusivo dos Consultores Técnicos"
      : "Ranking exclusivo dos Consultores de Balcão";

  return `
    <section
      id="${id}"
      class="podium-campanhas"
      data-podium-tipo="pix"
      data-podium-categoria="${categoria}"
    >
      <header
        class="podium-head"
      >
        <div>
          <div
            class="podium-eyebrow"
          >
            RECONHECIMENTO · PIX DO PRESIDENTE
          </div>

          <h2>
            ${titulo}
          </h2>

          <div
            class="podium-categoria-selo"
          >
            ${descricao}
          </div>

          <p>
            Top 3 por percentual de superação da meta
            · desempate por Ticket Médio
            · ${escapar(competencia)}
          </p>
        </div>

        <div
          class="podium-controles"
        >
          <div class="podium-pix-switch" role="group" aria-label="Escolher categoria do pódio">
            <button type="button" data-podium-categoria-escolha="consultor-tecnico" class="${tecnico ? "is-active" : ""}" aria-pressed="${tecnico ? "true" : "false"}">Consultor Técnico</button>
            <button type="button" data-podium-categoria-escolha="consultor-balcao" class="${!tecnico ? "is-active" : ""}" aria-pressed="${!tecnico ? "true" : "false"}">Consultor de Balcão</button>
          </div>

          <select
            data-podium-modo="pix"
          >
            <option
              value="geral"
              ${modo === "geral" ? "selected" : ""}
            >
              Pódio geral
            </option>

            <option
              value="filial"
              ${modo === "filial" ? "selected" : ""}
            >
              Pódio por filial
            </option>
          </select>

          <select
            data-podium-filial="pix"
            ${modo !== "filial" ? "disabled" : ""}
          >
            <option value="">
              Selecione a filial
            </option>

            ${filiais
              .map(
                unidade => `
                  <option
                    value="${escapar(unidade)}"
                    ${
                      chaveFilialPodium(unidade) ===
                      chaveFilialPodium(filial)
                        ? "selected"
                        : ""
                    }
                  >
                    ${escapar(unidade)}
                  </option>
                `
              )
              .join("")}
          </select>
        </div>
      </header>

      <div
        class="podium-grid"
      >
        ${card(ranking[0], 1)}
        ${card(ranking[1], 2)}
        ${card(ranking[2], 3)}
      </div>

      <div
        class="podium-legenda"
      >
        Este pódio é exclusivo para
        <strong>
          ${rotuloCategoriaPix(categoria)}
        </strong>.
        O ranking é definido pelo maior percentual de atingimento
        da meta individual. Em caso de empate percentual,
        vence o maior Ticket Médio.
      </div>
    </section>
  `;
}

function htmlPainel(tipo) {
  const competencia =
    competenciaAtual();

  const modo =
    tipo === "pix"
      ? estado.modoPix
      : estado.modoProdutivos;

  const filial =
    tipo === "pix"
      ? estado.filialPix
      : estado.filialProdutivos;

  const filiais =
    filiaisDisponiveis(
      tipo,
      competencia
    );

  /*
   * PIX DO PRESIDENTE
   * Dois pódios totalmente separados:
   * 1) Consultor Técnico
   * 2) Consultor de Balcão
   *
   * Ambos continuam respeitando:
   * - competência;
   * - pódio geral/filial;
   * - percentual de atingimento;
   * - desempate por Ticket Médio;
   * - bandeiras;
   * - impressão de homenagem.
   */
  if (
    tipo === "pix"
  ) {
    const categoria = estado.categoriaPix || "consultor-tecnico";

    return `
      <div id="podiumMensalPix" class="podium-pix-categorias">
        ${htmlPainelPixCategoria(
          categoria,
          competencia,
          modo,
          filial,
          filiais
        )}
      </div>
    `;
  }

  /*
   * PRODUTIVOS
   * Mantido exatamente no formato anterior.
   */
  const ranking =
    rankingProdutivos(
      competencia,
      modo === "filial"
        ? filial
        : ""
    );

  return `
    <section
      id="podiumMensalProdutivos"
      class="podium-campanhas"
      data-podium-tipo="produtivos"
    >
      <header
        class="podium-head"
      >
        <div>
          <div
            class="podium-eyebrow"
          >
            RECONHECIMENTO · CAMPANHA DOS PRODUTIVOS
          </div>

          <h2>
            Pódio mensal dos Produtivos
          </h2>

          <p>
            Top 3 por percentual de superação da meta
            · desempate por Ticket Médio
            · ${escapar(competencia)}
          </p>
        </div>

        <div
          class="podium-controles"
        >
          <select
            data-podium-modo="produtivos"
          >
            <option
              value="geral"
              ${modo === "geral" ? "selected" : ""}
            >
              Pódio geral
            </option>

            <option
              value="filial"
              ${modo === "filial" ? "selected" : ""}
            >
              Pódio por filial
            </option>
          </select>

          <select
            data-podium-filial="produtivos"
            ${modo !== "filial" ? "disabled" : ""}
          >
            <option value="">
              Selecione a filial
            </option>

            ${filiais
              .map(
                unidade => `
                  <option
                    value="${escapar(unidade)}"
                    ${
                      chaveFilialPodium(unidade) ===
                      chaveFilialPodium(filial)
                        ? "selected"
                        : ""
                    }
                  >
                    ${escapar(unidade)}
                  </option>
                `
              )
              .join("")}
          </select>
        </div>
      </header>

      <div
        class="podium-grid"
      >
        ${card(ranking[0], 1)}
        ${card(ranking[1], 2)}
        ${card(ranking[2], 3)}
      </div>

      <div
        class="podium-legenda"
      >
        Somente colaboradores com resultado individual participam.
        Gerentes, Supervisores, Coordenadores, Orçamentistas e cargos
        cujo cálculo depende da equipe ficam fora.
        O ranking é definido pelo maior percentual de atingimento da meta;
        em caso de empate, vence o maior Ticket Médio.
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

    if (botao.matches("[data-podium-categoria-escolha]")) {
      const categoria = botao.dataset.podiumCategoriaEscolha;

      if (
        categoria === "consultor-tecnico" ||
        categoria === "consultor-balcao"
      ) {
        estado.categoriaPix = categoria;
        renderizar();
      }

      return;
    }

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

async function carregarProdutivosSupabasePodium() {
  const [funcionariosResposta, lancamentosResposta] = await Promise.all([
    supabase
      .from("produtivos_funcionarios")
      .select("id,dados,ativo"),
    supabase
      .from("produtivos_lancamentos")
      .select("id,competencia,filial,colaborador,dados")
  ]);

  if (funcionariosResposta.error) {
    throw funcionariosResposta.error;
  }

  if (lancamentosResposta.error) {
    throw lancamentosResposta.error;
  }

  estado.funcionariosProdutivos = (funcionariosResposta.data || [])
    .map(linha => ({
      ...(linha.dados || {}),
      id: linha.id,
      ativo: linha.ativo !== false
    }));

  estado.lancamentosProdutivos = (lancamentosResposta.data || [])
    .map(linha => ({
      ...(linha.dados || {}),
      id: linha.id,
      competencia:
        texto(linha.dados?.competencia) ||
        texto(linha.competencia),
      filial:
        texto(linha.dados?.filial) ||
        texto(linha.filial),
      colaborador:
        texto(linha.dados?.colaborador) ||
        texto(linha.dados?.nome) ||
        texto(linha.colaborador)
    }));

  renderizar();

  console.info(
    `[PÓDIO/SUPABASE] Produtivos sincronizados: ${estado.funcionariosProdutivos.length} funcionário(s) e ${estado.lancamentosProdutivos.length} lançamento(s).`
  );
}

function observarProdutivosSupabasePodium() {
  let temporizador = null;

  const atualizar = () => {
    window.clearTimeout(temporizador);
    temporizador = window.setTimeout(() => {
      carregarProdutivosSupabasePodium().catch(erro => {
        console.error("[PÓDIO/SUPABASE] Falha ao carregar Produtivos:", erro);
      });
    }, 180);
  };

  carregarProdutivosSupabasePodium().catch(erro => {
    console.error("[PÓDIO/SUPABASE] Falha na carga inicial dos Produtivos:", erro);
  });

  supabase
    .channel("podium-produtivos-realtime-v13")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "produtivos_funcionarios"
      },
      atualizar
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "produtivos_lancamentos"
      },
      atualizar
    )
    .subscribe();
}

function iniciar() {
  garantirEstilos();
  eventos();

  observarProdutivosSupabasePodium();
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
  rankingPix:
    competencia =>
      rankingPix(
        competencia ||
        competenciaAtual()
      ),

  rankingPixConsultorTecnico:
    competencia =>
      rankingPix(
        competencia ||
        competenciaAtual(),
        "",
        "consultor-tecnico"
      ),

  rankingPixConsultorBalcao:
    competencia =>
      rankingPix(
        competencia ||
        competenciaAtual(),
        "",
        "consultor-balcao"
      ),

  versao: PODIUM_VERSAO
};
