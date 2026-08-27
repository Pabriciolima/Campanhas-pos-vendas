/*
===============================================================================
PRESENÇA COLABORATIVA — HUB DE CAMPANHAS
Salve este arquivo como: presenca-colaborativa.js
===============================================================================
Usa Supabase Realtime Presence. Não grava presença em tabelas.
===============================================================================
*/

import { supabase } from "./supabase-config.js";

const PC_STORAGE = "campanhas_perfil_presenca_v1";
const PC_SESSION = "campanhas_sessao_presenca_v1";
const PC_CHANNEL = "hub-campanhas-presenca-v1";
const PC_VERSION = "2026.08.27-01";

const PC_FILIAIS = [
  "ÁGUA BOA-MT",
  "ANANINDEUA-PA",
  "BACABAL-MA",
  "BELÉM-PA",
  "CUIABÁ-MT",
  "JI-PARANÁ-RO",
  "MACAPÁ-AP",
  "PORTO VELHO-RO",
  "RONDONÓPOLIS-MT",
  "SÃO LUÍS-MA",
  "SINOP-MT",
  "TERESINA-PI",
  "URUÇUÍ-PI",
  "VILHENA-RO"
];

const PC_MODULOS = {
  produtivos: "Produtivos",
  pix: "Pix do Presidente",
  crm: "CRM",
  garantia: "Garantia"
};

let pcPerfil = lerPerfil();
let pcCanal = null;
let pcConectado = false;
let pcPainelAberto = false;
let pcUltimoEstado = "";
let pcTimer = 0;

function pcIdSessao() {
  let id = sessionStorage.getItem(PC_SESSION);
  if (!id) {
    id = `${Date.now().toString(36)}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(PC_SESSION, id);
  }
  return id;
}

function lerPerfil() {
  try {
    const perfil = JSON.parse(localStorage.getItem(PC_STORAGE) || "null");
    if (perfil?.nome && perfil?.filial) {
      return { nome: String(perfil.nome).trim(), filial: String(perfil.filial).trim() };
    }
  } catch (_) {}
  return null;
}

function salvarPerfil(perfil) {
  pcPerfil = perfil;
  localStorage.setItem(PC_STORAGE, JSON.stringify(perfil));
}

function moduloAtual() {
  const salvo = localStorage.getItem("modulo_campanha_ativo");
  if (salvo && PC_MODULOS[salvo]) return salvo;
  if (document.body.classList.contains("modulo-pix-ativo")) return "pix";
  if (document.body.classList.contains("modulo-crm-ativo")) return "crm";
  if (document.body.classList.contains("modulo-garantia-ativo")) return "garantia";
  return "produtivos";
}

function textoBotaoAtivo(modulo) {
  const seletores = {
    produtivos: ".nav-btn.active[data-view]",
    pix: ".pix-menu-btn.active[data-pix-view]",
    crm: ".crm-menu-btn.active[data-crm-view]",
    garantia: ".garantia-menu-btn.active[data-garantia-view]"
  };
  const botao = document.querySelector(seletores[modulo]);
  return botao?.textContent?.replace(/\s+/g, " ").trim() || "Visão geral";
}

function competenciaAtual(modulo) {
  const ids = modulo === "pix"
    ? ["pixDashboardCompetencia", "pixFiltroCompetencia", "competenciaGlobal"]
    : ["competenciaGlobal"];
  for (const id of ids) {
    const valor = document.getElementById(id)?.value;
    if (valor) return valor;
  }
  return new Date().toISOString().slice(0, 7);
}

function estadoAtual() {
  const modulo = moduloAtual();
  return {
    sessao: pcIdSessao(),
    nome: pcPerfil?.nome || "",
    filial: pcPerfil?.filial || "",
    modulo,
    modulo_rotulo: PC_MODULOS[modulo] || modulo,
    area: textoBotaoAtivo(modulo),
    competencia: competenciaAtual(modulo),
    atualizado_em: new Date().toISOString(),
    versao: PC_VERSION
  };
}

async function publicarPresenca(forcar = false) {
  if (!pcPerfil || !pcConectado || !pcCanal || document.hidden) return;
  const atual = estadoAtual();
  const assinatura = JSON.stringify({
    nome: atual.nome,
    filial: atual.filial,
    modulo: atual.modulo,
    area: atual.area,
    competencia: atual.competencia
  });
  if (!forcar && assinatura === pcUltimoEstado) return;
  pcUltimoEstado = assinatura;
  try {
    await pcCanal.track(atual);
  } catch (erro) {
    console.warn("[PRESENÇA] Não foi possível atualizar a localização.", erro);
  }
}

function agendarPublicacao(forcar = false) {
  clearTimeout(pcTimer);
  pcTimer = setTimeout(() => publicarPresenca(forcar), 650);
}

function todasAsPresencas() {
  if (!pcCanal) return [];
  const mapa = new Map();
  const estado = pcCanal.presenceState();
  Object.values(estado).flat().forEach(item => {
    if (!item?.sessao || !item?.nome) return;
    const anterior = mapa.get(item.sessao);
    if (!anterior || String(item.atualizado_em) > String(anterior.atualizado_em)) {
      mapa.set(item.sessao, item);
    }
  });
  return [...mapa.values()].sort((a, b) =>
    String(a.nome).localeCompare(String(b.nome), "pt-BR")
  );
}

function iniciais(nome) {
  return String(nome).trim().split(/\s+/).slice(0, 2).map(p => p[0] || "").join("").toUpperCase();
}

function formatarCompetencia(valor) {
  if (!/^\d{4}-\d{2}$/.test(String(valor))) return "";
  const [ano, mes] = valor.split("-");
  return `${mes}/${ano}`;
}

function renderizarPresencas() {
  const pessoas = todasAsPresencas();
  const numero = document.querySelector("#pcQuantidade");
  const lista = document.querySelector("#pcLista");
  const resumo = document.querySelector("#pcResumo");
  if (numero) numero.textContent = String(pessoas.length);
  if (resumo) resumo.textContent = pessoas.length === 1 ? "1 pessoa online" : `${pessoas.length} pessoas online`;
  if (!lista) return;
  lista.replaceChildren();

  if (!pessoas.length) {
    const vazio = document.createElement("div");
    vazio.className = "pc-vazio";
    vazio.textContent = "Nenhum colaborador online neste momento.";
    lista.append(vazio);
    return;
  }

  pessoas.forEach(pessoa => {
    const item = document.createElement("article");
    item.className = "pc-pessoa";
    if (pessoa.sessao === pcIdSessao()) item.classList.add("pc-eu");

    const avatar = document.createElement("span");
    avatar.className = "pc-avatar";
    avatar.textContent = iniciais(pessoa.nome);

    const dados = document.createElement("div");
    const nome = document.createElement("strong");
    nome.textContent = pessoa.sessao === pcIdSessao() ? `${pessoa.nome} (você)` : pessoa.nome;
    const filial = document.createElement("span");
    filial.textContent = pessoa.filial;
    const local = document.createElement("small");
    const comp = formatarCompetencia(pessoa.competencia);
    local.textContent = `${pessoa.modulo_rotulo || pessoa.modulo} › ${pessoa.area}${comp ? ` › ${comp}` : ""}`;
    dados.append(nome, filial, local);

    const ponto = document.createElement("i");
    ponto.className = "pc-ponto";
    ponto.title = "Online";
    item.append(avatar, dados, ponto);
    lista.append(item);
  });
}

function abrirPainel() {
  pcPainelAberto = true;
  document.querySelector("#pcPainel")?.classList.add("aberto");
  document.querySelector("#pcBotao")?.setAttribute("aria-expanded", "true");
  renderizarPresencas();
}

function fecharPainel() {
  pcPainelAberto = false;
  document.querySelector("#pcPainel")?.classList.remove("aberto");
  document.querySelector("#pcBotao")?.setAttribute("aria-expanded", "false");
}

function abrirCadastro() {
  fecharPainel();
  const modal = document.querySelector("#pcCadastro");
  const nome = document.querySelector("#pcNome");
  const filial = document.querySelector("#pcFilial");
  if (nome) nome.value = pcPerfil?.nome || "";
  if (filial) filial.value = pcPerfil?.filial || "";
  modal?.classList.add("aberto");
  setTimeout(() => nome?.focus(), 80);
}

function fecharCadastro() {
  if (!pcPerfil) return;
  document.querySelector("#pcCadastro")?.classList.remove("aberto");
}

async function conectar() {
  if (!pcPerfil || pcCanal) return;
  pcCanal = supabase.channel(PC_CHANNEL, {
    config: { presence: { key: pcIdSessao() } }
  });
  pcCanal
    .on("presence", { event: "sync" }, renderizarPresencas)
    .on("presence", { event: "join" }, renderizarPresencas)
    .on("presence", { event: "leave" }, renderizarPresencas)
    .subscribe(async status => {
      if (status === "SUBSCRIBED") {
        pcConectado = true;
        await publicarPresenca(true);
        renderizarPresencas();
      }
    });
}

function instalarEstilos() {
  if (document.querySelector("#pcEstilos")) return;
  const style = document.createElement("style");
  style.id = "pcEstilos";
  style.textContent = `
    :root{--pc-verde:#0a8f68;--pc-escuro:#12374a;--pc-borda:#dce9e7}
    #pcBotao{position:fixed;right:22px;bottom:22px;z-index:2147482000;height:48px;padding:0 17px;border:1px solid rgba(255,255,255,.7);border-radius:16px;background:linear-gradient(135deg,#123f52,#087e61);color:#fff;display:flex;align-items:center;gap:9px;box-shadow:0 16px 38px rgba(8,51,67,.25);font:800 12px/1 system-ui;cursor:pointer;transition:.22s ease}
    #pcBotao:hover{transform:translateY(-2px);box-shadow:0 20px 42px rgba(8,51,67,.32)}
    #pcBotao .pc-live{width:9px;height:9px;border-radius:50%;background:#62f2b4;box-shadow:0 0 0 5px rgba(98,242,180,.14);animation:pcPulse 2s infinite}
    #pcQuantidade{min-width:22px;height:22px;border-radius:9px;background:rgba(255,255,255,.17);display:grid;place-items:center}
    #pcPainel{position:fixed;right:22px;bottom:80px;z-index:2147481999;width:min(390px,calc(100vw - 28px));max-height:min(590px,calc(100vh - 110px));border:1px solid rgba(255,255,255,.9);border-radius:24px;background:rgba(250,253,253,.97);box-shadow:0 28px 70px rgba(16,53,70,.25);backdrop-filter:blur(22px);overflow:hidden;opacity:0;visibility:hidden;transform:translateY(15px) scale(.97);transition:.24s cubic-bezier(.16,1,.3,1)}
    #pcPainel.aberto{opacity:1;visibility:visible;transform:none}
    .pc-head{padding:20px 20px 16px;background:linear-gradient(145deg,#123e52,#0b725d);color:#fff;display:flex;align-items:center;justify-content:space-between}.pc-head strong{display:block;font:850 16px/1.2 system-ui}.pc-head span{display:block;margin-top:5px;color:#c8e9df;font:600 11px/1.2 system-ui}.pc-fechar{width:34px;height:34px;border:0;border-radius:11px;background:rgba(255,255,255,.12);color:#fff;font-size:21px;cursor:pointer}
    #pcLista{padding:12px;overflow:auto;max-height:410px}.pc-pessoa{position:relative;display:grid;grid-template-columns:44px 1fr 10px;gap:11px;align-items:center;padding:12px;border:1px solid transparent;border-radius:17px}.pc-pessoa+.pc-pessoa{margin-top:4px}.pc-pessoa:hover,.pc-pessoa.pc-eu{background:#f0f8f6;border-color:#dcece8}.pc-avatar{width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,#d9f4eb,#cce4ed);color:#11634f;display:grid;place-items:center;font:900 12px system-ui}.pc-pessoa strong,.pc-pessoa span,.pc-pessoa small{display:block;font-family:system-ui}.pc-pessoa strong{color:#183b4c;font-size:12px}.pc-pessoa span{margin-top:3px;color:#65808b;font-size:10px;font-weight:750}.pc-pessoa small{margin-top:5px;color:#78919a;font-size:9px;line-height:1.35}.pc-ponto{width:8px;height:8px;border-radius:50%;background:#1bc887;box-shadow:0 0 0 4px rgba(27,200,135,.11)}.pc-vazio{padding:30px 18px;text-align:center;color:#718991;font:650 11px/1.5 system-ui}.pc-footer{padding:12px 16px 16px;border-top:1px solid #e4eeec}.pc-trocar{width:100%;height:39px;border:1px solid #d9e7e4;border-radius:12px;background:#fff;color:#315665;font:800 10px system-ui;cursor:pointer}.pc-trocar:hover{border-color:#90c8ba;background:#f4faf8}
    #pcCadastro{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(8,29,40,.58);backdrop-filter:blur(9px);opacity:0;visibility:hidden;transition:.2s ease}#pcCadastro.aberto{opacity:1;visibility:visible}.pc-card{width:min(450px,100%);border:1px solid rgba(255,255,255,.86);border-radius:27px;background:#fff;box-shadow:0 34px 90px rgba(5,30,43,.34);overflow:hidden;transform:translateY(13px) scale(.98);transition:.3s cubic-bezier(.16,1,.3,1)}#pcCadastro.aberto .pc-card{transform:none}.pc-card-top{padding:28px;background:linear-gradient(145deg,#123e52,#08785d);color:#fff}.pc-card-top em{display:inline-flex;padding:6px 9px;border-radius:8px;background:rgba(255,255,255,.12);font:800 9px system-ui;font-style:normal;letter-spacing:.08em}.pc-card-top h2{margin:13px 0 7px;font:850 23px/1.15 system-ui}.pc-card-top p{margin:0;color:#cbe7df;font:500 11px/1.5 system-ui}.pc-form{padding:24px}.pc-form label{display:block;margin-bottom:14px;color:#315565;font:800 10px system-ui}.pc-form input,.pc-form select{box-sizing:border-box;width:100%;height:48px;margin-top:7px;padding:0 14px;border:1px solid #d9e7e4;border-radius:13px;background:#f9fbfb;color:#173d4d;font:700 12px system-ui;outline:none}.pc-form input:focus,.pc-form select:focus{border-color:#39a989;box-shadow:0 0 0 4px rgba(57,169,137,.11);background:#fff}.pc-acoes{display:grid;grid-template-columns:auto 1fr;gap:9px;margin-top:20px}.pc-cancelar,.pc-entrar{height:46px;border-radius:13px;font:850 11px system-ui;cursor:pointer}.pc-cancelar{padding:0 17px;border:1px solid #dce7e5;background:#fff;color:#607984}.pc-entrar{border:0;background:linear-gradient(135deg,#123e52,#078661);color:#fff;box-shadow:0 12px 24px rgba(7,134,97,.2)}
    @keyframes pcPulse{50%{box-shadow:0 0 0 8px rgba(98,242,180,0)}}
    @media(max-width:600px){#pcBotao{right:14px;bottom:14px}#pcPainel{right:14px;bottom:72px}.pc-card-top{padding:23px}.pc-form{padding:20px}}
  `;
  document.head.append(style);
}

function instalarInterface() {
  instalarEstilos();
  const raiz = document.createElement("div");
  raiz.id = "pcRaiz";
  raiz.innerHTML = `
    <button id="pcBotao" type="button" aria-expanded="false"><span class="pc-live"></span><span>Online</span><b id="pcQuantidade">0</b></button>
    <aside id="pcPainel" aria-label="Colaboradores online">
      <header class="pc-head"><div><strong>Equipe online</strong><span id="pcResumo">0 pessoas online</span></div><button class="pc-fechar" type="button" aria-label="Fechar">×</button></header>
      <div id="pcLista"></div>
      <footer class="pc-footer"><button class="pc-trocar" type="button">Trocar meu nome ou filial</button></footer>
    </aside>
    <div id="pcCadastro" role="dialog" aria-modal="true" aria-labelledby="pcTitulo">
      <form class="pc-card" id="pcFormulario">
        <div class="pc-card-top"><em>PRESENÇA COLABORATIVA</em><h2 id="pcTitulo">Como podemos identificar você?</h2><p>Seu nome e sua filial serão exibidos somente para quem estiver usando o sistema agora.</p></div>
        <div class="pc-form">
          <label>SEU NOME<input id="pcNome" maxlength="60" autocomplete="name" placeholder="Digite seu nome" required></label>
          <label>SUA FILIAL<select id="pcFilial" required><option value="">Selecione a filial</option>${PC_FILIAIS.map(f => `<option value="${f}">${f}</option>`).join("")}</select></label>
          <div class="pc-acoes"><button class="pc-cancelar" type="button">Cancelar</button><button class="pc-entrar" type="submit">Entrar no sistema</button></div>
        </div>
      </form>
    </div>`;
  document.body.append(raiz);

  document.querySelector("#pcBotao")?.addEventListener("click", () => pcPainelAberto ? fecharPainel() : abrirPainel());
  document.querySelector(".pc-fechar")?.addEventListener("click", fecharPainel);
  document.querySelector(".pc-trocar")?.addEventListener("click", abrirCadastro);
  document.querySelector(".pc-cancelar")?.addEventListener("click", fecharCadastro);
  document.querySelector("#pcCadastro")?.addEventListener("click", evento => {
    if (evento.target.id === "pcCadastro") fecharCadastro();
  });
  document.querySelector("#pcFormulario")?.addEventListener("submit", async evento => {
    evento.preventDefault();
    const nome = document.querySelector("#pcNome")?.value.trim();
    const filial = document.querySelector("#pcFilial")?.value;
    if (!nome || !filial) return;
    salvarPerfil({ nome, filial });
    document.querySelector("#pcCadastro")?.classList.remove("aberto");
    pcUltimoEstado = "";
    await conectar();
    await publicarPresenca(true);
  });
}

function instalarObservadores() {
  document.addEventListener("click", evento => {
    if (evento.target.closest(".module-toggle,.nav-btn,.pix-menu-btn,.crm-menu-btn,.garantia-menu-btn")) {
      agendarPublicacao();
    }
    if (pcPainelAberto && !evento.target.closest("#pcPainel,#pcBotao")) fecharPainel();
  }, true);
  document.addEventListener("change", evento => {
    if (evento.target.matches('input[type="month"],select')) agendarPublicacao();
  }, true);
  document.addEventListener("visibilitychange", async () => {
    if (!pcCanal) return;
    if (document.hidden) {
      try { await pcCanal.untrack(); } catch (_) {}
    } else {
      pcUltimoEstado = "";
      await publicarPresenca(true);
    }
  });
  window.addEventListener("beforeunload", () => pcCanal?.untrack());
  setInterval(() => publicarPresenca(true), 60000);
}

async function iniciarPresenca() {
  instalarInterface();
  instalarObservadores();
  if (!pcPerfil) abrirCadastro();
  else await conectar();
  console.info(`[PRESENÇA] Módulo ativo — ${PC_VERSION}.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarPresenca, { once: true });
} else {
  iniciarPresenca();
}

