/*
===============================================================================
PRESENÇA COLABORATIVA — HUB DE CAMPANHAS
Salve este arquivo como: presenca-colaborativa.js
===============================================================================
Usa Supabase Realtime Presence. Não grava presença em tabelas.
===============================================================================
*/

const PC_STORAGE = "campanhas_perfil_presenca_v1";
const PC_SESSION = "campanhas_sessao_presenca_v1";
const PC_CHANNEL = "hub-campanhas-presenca-v1";
const PC_VERSION = "2026.08.28-05";
const PC_SENHA_ONLINE = "123321";

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
  compras: "Central de Compras",
  garantia: "Garantia"
};

let pcPerfil = lerPerfil();
let pcSupabase = null;
let pcCanal = null;
let pcConectado = false;
let pcPainelAberto = false;
let pcAcessoOnline = false;
let pcUltimoEstado = "";
let pcTimer = 0;
let pcUltimoCursorEnviado = 0;
const pcTimersCursores = new Map();

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

function elementoEstaVisivel(elemento) {
  if (!elemento) return false;
  const estilo = window.getComputedStyle(elemento);
  return estilo.display !== "none" && estilo.visibility !== "hidden" && !elemento.hidden;
}

function secaoAtivaContem(termo) {
  const normalizado = String(termo).toLowerCase();
  return [...document.querySelectorAll("section.active,.view.active,[data-view].active,[data-module].active")]
    .some(elemento => {
      if (!elementoEstaVisivel(elemento)) return false;
      const assinatura = [
        elemento.id,
        elemento.className,
        elemento.getAttribute("data-view"),
        elemento.getAttribute("data-module")
      ].join(" ").toLowerCase();
      return assinatura.includes(normalizado);
    });
}

function moduloAtual() {
  if (
    elementoEstaVisivel(document.querySelector("#comprasCampanhas.active,#comprasCampanha.active,#comprasModule.active,#compras-module.active")) ||
    secaoAtivaContem("compra")
  ) return "compras";

  if (elementoEstaVisivel(document.querySelector("#crmCampanhas.active"))) return "crm";

  const tituloVisivel = document.querySelector("#pageTitle")?.textContent?.toUpperCase() || "";
  if (tituloVisivel.includes("COMPRA")) return "compras";
  if (tituloVisivel.includes("CRM")) return "crm";

  if (document.body.classList.contains("crm-mode-active")) return "crm";
  if (document.body.classList.contains("modulo-crm-ativo")) return "crm";
  if (
    document.body.classList.contains("modulo-compras-ativo") ||
    document.body.classList.contains("compras-mode-active") ||
    [...document.body.classList].some(classe => classe.includes("compras") && classe.includes("active"))
  ) return "compras";
  if (document.body.classList.contains("modulo-garantia-ativo")) return "garantia";
  if (document.body.classList.contains("modulo-pix-ativo")) return "pix";
  if (document.body.classList.contains("modulo-produtivos-ativo")) return "produtivos";

  if (document.querySelector(".crm-menu-btn.active[data-crm-view]")) return "crm";
  if (document.querySelector(".compras-menu-btn.active,[data-compras-view].active,[data-module='compras'].active,[data-module-group='compras'] .active")) return "compras";
  if (document.querySelector(".garantia-menu-btn.active[data-garantia-view]")) return "garantia";
  if (document.querySelector(".pix-menu-btn.active[data-pix-view]")) return "pix";
  if (document.querySelector(".nav-btn.active[data-view]")) return "produtivos";

  const titulo = tituloVisivel;
  if (titulo.includes("CRM")) return "crm";
  if (titulo.includes("COMPRA")) return "compras";
  if (titulo.includes("GARANTIA")) return "garantia";
  if (titulo.includes("PIX")) return "pix";

  const salvo = localStorage.getItem("modulo_campanha_ativo");
  if (salvo && PC_MODULOS[salvo]) return salvo;
  return "produtivos";
}

function textoBotaoAtivo(modulo) {
  const seletores = {
    produtivos: ".nav-btn.active[data-view]",
    pix: ".pix-menu-btn.active[data-pix-view]",
    crm: ".crm-menu-btn.active[data-crm-view]",
    compras: "button.compras-menu-btn.active,button[data-compras-view].active,[data-module='compras'] button[data-view].active,[data-module-group='compras'] button.active,[data-module-group='compras'] a.active",
    garantia: ".garantia-menu-btn.active[data-garantia-view]"
  };
  const botao = document.querySelector(seletores[modulo]);
  const textoAtivo = botao?.textContent?.replace(/\s+/g, " ").trim();
  if (textoAtivo && textoAtivo.length <= 80) return textoAtivo;

  const secoes = {
    crm: "#crmCampanhas.active",
    compras: "#comprasCampanhas.active,#comprasCampanha.active,#comprasModule.active,#compras-module.active,section.active[id*='compra' i]"
  };
  const seletorSecao = secoes[modulo];
  const secao = seletorSecao ? document.querySelector(seletorSecao) : null;
  const tituloSecao = secao?.querySelector("[data-page-title],.section-title,.panel-title,h1,h2,h3")
    ?.textContent?.replace(/\s+/g, " ").trim();

  if (tituloSecao && tituloSecao.length <= 80) return tituloSecao;

  const tituloPagina = document.querySelector("#pageTitle")?.textContent?.replace(/\s+/g, " ").trim();
  if (tituloPagina && tituloPagina.length <= 80) return tituloPagina;

  return "Visão geral";
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

function formatarDataHora(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(data);
}

function areaSeguraParaExibir(valor, modulo) {
  const area = String(valor || "").replace(/\s+/g, " ").trim();
  if (area && area.length <= 80) return area;
  return modulo === "compras" ? "Visão geral" : "Área atual";
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
    const horario = formatarDataHora(pessoa.atualizado_em);
    const areaExibida = areaSeguraParaExibir(pessoa.area, pessoa.modulo);
    local.textContent = `${pessoa.modulo_rotulo || pessoa.modulo} › ${areaExibida}${comp ? ` › ${comp}` : ""}${horario ? ` · ${horario}` : ""}`;
    dados.append(nome, filial, local);

    const ponto = document.createElement("i");
    ponto.className = "pc-ponto";
    ponto.title = "Online";
    item.append(avatar, dados, ponto);
    lista.append(item);
  });
}

function contextoIgual(payload) {
  const atual = estadoAtual();
  return payload.modulo === atual.modulo && payload.area === atual.area;
}

function removerCursor(sessao) {
  document.querySelector(`[data-pc-cursor="${CSS.escape(String(sessao))}"]`)?.remove();
  clearTimeout(pcTimersCursores.get(sessao));
  pcTimersCursores.delete(sessao);
}

function receberCursor(payload) {
  if (!payload?.sessao || payload.sessao === pcIdSessao()) return;
  if (!contextoIgual(payload) || document.hidden) {
    removerCursor(payload.sessao);
    return;
  }

  const camada = document.querySelector("#pcCursores");
  if (!camada) return;

  let cursor = camada.querySelector(`[data-pc-cursor="${CSS.escape(String(payload.sessao))}"]`);
  if (!cursor) {
    cursor = document.createElement("div");
    cursor.className = "pc-cursor-remoto";
    cursor.dataset.pcCursor = payload.sessao;
    const seta = document.createElement("span");
    seta.className = "pc-cursor-seta";
    const nome = document.createElement("b");
    nome.textContent = `${payload.nome} · ${payload.filial}`;
    cursor.append(seta, nome);
    camada.append(cursor);
  }

  const x = Math.max(0, Math.min(1, Number(payload.x) || 0));
  const y = Math.max(0, Math.min(1, Number(payload.y) || 0));
  cursor.style.transform = `translate3d(${Math.round(x * window.innerWidth)}px,${Math.round(y * window.innerHeight)}px,0)`;
  cursor.classList.add("visivel");

  clearTimeout(pcTimersCursores.get(payload.sessao));
  pcTimersCursores.set(payload.sessao, setTimeout(() => removerCursor(payload.sessao), 1800));
}

function limparCursoresForaDoContexto() {
  document.querySelectorAll(".pc-cursor-remoto").forEach(cursor => cursor.remove());
  pcTimersCursores.forEach(timer => clearTimeout(timer));
  pcTimersCursores.clear();
}

function enviarCursor(evento) {
  const agora = performance.now();
  if (!pcConectado || !pcCanal || document.hidden || agora - pcUltimoCursorEnviado < 250) return;
  pcUltimoCursorEnviado = agora;
  const atual = estadoAtual();
  pcCanal.send({
    type: "broadcast",
    event: "cursor",
    payload: {
      sessao: atual.sessao,
      nome: atual.nome,
      filial: atual.filial,
      modulo: atual.modulo,
      area: atual.area,
      x: evento.clientX / Math.max(1, window.innerWidth),
      y: evento.clientY / Math.max(1, window.innerHeight),
      enviado_em: new Date().toISOString()
    }
  }).catch(() => {});
}

function abrirPainel() {
  if (!pcConectado) {
    abrirCadastro();
    return;
  }

  if (!pcAcessoOnline) {
    abrirAcessoOnline();
    return;
  }

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
  if (!pcConectado) return;
  document.querySelector("#pcCadastro")?.classList.remove("aberto");
}

async function conectar() {
  if (!pcPerfil || pcCanal) return;

  const statusCadastro = document.querySelector("#pcStatusCadastro");

  try {
    if (!pcSupabase) {
      const modulo = await import("./supabase-config.js?v=20260827-24");
      pcSupabase = modulo.supabase;
    }
  } catch (erro) {
    if (statusCadastro) {
      statusCadastro.textContent = "Não foi possível conectar ao servidor. Atualize a página e tente novamente.";
      statusCadastro.classList.add("erro");
    }
    console.error("[PRESENÇA] Falha ao carregar a conexão do Supabase.", erro);
    return false;
  }

  pcCanal = pcSupabase.channel(PC_CHANNEL, {
    config: { presence: { key: pcIdSessao() } }
  });
  pcCanal
    .on("presence", { event: "sync" }, renderizarPresencas)
    .on("presence", { event: "join" }, renderizarPresencas)
    .on("presence", { event: "leave" }, renderizarPresencas)
    .on("broadcast", { event: "cursor" }, ({ payload }) => receberCursor(payload))
    .subscribe(async status => {
      if (status === "SUBSCRIBED") {
        pcConectado = true;
        if (statusCadastro) {
          statusCadastro.textContent = "Entrada confirmada. Você já está online.";
          statusCadastro.classList.remove("erro");
        }
        await publicarPresenca(true);
        renderizarPresencas();
      }
    });

  return true;
}

function abrirAcessoOnline() {
  const modal = document.querySelector("#pcAcesso");
  const senha = document.querySelector("#pcSenhaOnline");
  const erro = document.querySelector("#pcErroSenha");
  if (senha) senha.value = "";
  if (erro) erro.textContent = "";
  modal?.classList.add("aberto");
  setTimeout(() => senha?.focus(), 80);
}

function fecharAcessoOnline() {
  document.querySelector("#pcAcesso")?.classList.remove("aberto");
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
    #pcCursores{position:fixed;inset:0;z-index:2147481500;pointer-events:none;overflow:hidden}.pc-cursor-remoto{position:absolute;left:0;top:0;opacity:0;transition:transform .12s linear,opacity .18s ease;will-change:transform}.pc-cursor-remoto.visivel{opacity:1}.pc-cursor-seta{display:block;width:0;height:0;border-top:8px solid #0d765e;border-right:6px solid transparent;filter:drop-shadow(0 2px 3px rgba(9,48,58,.2));transform:rotate(-18deg)}.pc-cursor-remoto b{display:block;max-width:190px;margin:1px 0 0 8px;padding:6px 9px;border:1px solid rgba(255,255,255,.82);border-radius:4px 11px 11px 11px;background:linear-gradient(135deg,#0d765e,#16546a);box-shadow:0 8px 22px rgba(9,48,58,.23);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:800 9px/1.1 system-ui}
    .pc-head{padding:20px 20px 16px;background:linear-gradient(145deg,#123e52,#0b725d);color:#fff;display:flex;align-items:center;justify-content:space-between}.pc-head strong{display:block;font:850 16px/1.2 system-ui}.pc-head span{display:block;margin-top:5px;color:#c8e9df;font:600 11px/1.2 system-ui}.pc-fechar{width:34px;height:34px;border:0;border-radius:11px;background:rgba(255,255,255,.12);color:#fff;font-size:21px;cursor:pointer}
    #pcLista{padding:12px;overflow:auto;max-height:410px}.pc-pessoa{position:relative;display:grid;grid-template-columns:44px 1fr 10px;gap:11px;align-items:center;padding:12px;border:1px solid transparent;border-radius:17px}.pc-pessoa+.pc-pessoa{margin-top:4px}.pc-pessoa:hover,.pc-pessoa.pc-eu{background:#f0f8f6;border-color:#dcece8}.pc-avatar{width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,#d9f4eb,#cce4ed);color:#11634f;display:grid;place-items:center;font:900 12px system-ui}.pc-pessoa strong,.pc-pessoa span,.pc-pessoa small{display:block;font-family:system-ui}.pc-pessoa strong{color:#183b4c;font-size:12px}.pc-pessoa span{margin-top:3px;color:#65808b;font-size:10px;font-weight:750}.pc-pessoa small{margin-top:5px;color:#78919a;font-size:9px;line-height:1.35}.pc-ponto{width:8px;height:8px;border-radius:50%;background:#1bc887;box-shadow:0 0 0 4px rgba(27,200,135,.11)}.pc-vazio{padding:30px 18px;text-align:center;color:#718991;font:650 11px/1.5 system-ui}.pc-footer{padding:12px 16px 16px;border-top:1px solid #e4eeec}.pc-trocar{width:100%;height:39px;border:1px solid #d9e7e4;border-radius:12px;background:#fff;color:#315665;font:800 10px system-ui;cursor:pointer}.pc-trocar:hover{border-color:#90c8ba;background:#f4faf8}
    #pcCadastro,#pcAcesso{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(8,29,40,.58);backdrop-filter:blur(9px);opacity:0;visibility:hidden;transition:.2s ease}#pcCadastro.aberto,#pcAcesso.aberto{opacity:1;visibility:visible}.pc-card{width:min(450px,100%);border:1px solid rgba(255,255,255,.86);border-radius:27px;background:#fff;box-shadow:0 34px 90px rgba(5,30,43,.34);overflow:hidden;transform:translateY(13px) scale(.98);transition:.3s cubic-bezier(.16,1,.3,1)}#pcCadastro.aberto .pc-card,#pcAcesso.aberto .pc-card{transform:none}.pc-card-top{padding:28px;background:linear-gradient(145deg,#123e52,#08785d);color:#fff}.pc-card-top em{display:inline-flex;padding:6px 9px;border-radius:8px;background:rgba(255,255,255,.12);font:800 9px system-ui;font-style:normal;letter-spacing:.08em}.pc-card-top h2{margin:13px 0 7px;font:850 23px/1.15 system-ui}.pc-card-top p{margin:0;color:#cbe7df;font:500 11px/1.5 system-ui}.pc-form{padding:24px}.pc-form label{display:block;margin-bottom:14px;color:#315565;font:800 10px system-ui}.pc-form input,.pc-form select{box-sizing:border-box;width:100%;height:48px;margin-top:7px;padding:0 14px;border:1px solid #d9e7e4;border-radius:13px;background:#f9fbfb;color:#173d4d;font:700 12px system-ui;outline:none}.pc-form input:focus,.pc-form select:focus{border-color:#39a989;box-shadow:0 0 0 4px rgba(57,169,137,.11);background:#fff}.pc-acoes{display:grid;grid-template-columns:auto 1fr;gap:9px;margin-top:20px}.pc-cancelar,.pc-entrar{height:46px;border-radius:13px;font:850 11px system-ui;cursor:pointer}.pc-cancelar{display:none;padding:0 17px;border:1px solid #dce7e5;background:#fff;color:#607984}.pc-entrar{border:0;background:linear-gradient(135deg,#123e52,#078661);color:#fff;box-shadow:0 12px 24px rgba(7,134,97,.2)}.pc-status{min-height:18px;margin:4px 0 0;color:#4d7468;font:750 10px/1.4 system-ui}.pc-status.erro,.pc-erro-senha{color:#c43d4d}.pc-acesso-card{width:min(390px,100%)}.pc-acesso-card .pc-card-top{background:linear-gradient(145deg,#172f43,#174e61)}.pc-acesso-acoes{display:grid;grid-template-columns:1fr 1.4fr;gap:9px;margin-top:18px}.pc-voltar{height:46px;border:1px solid #dce7e5;border-radius:13px;background:#fff;color:#607984;font:850 11px system-ui;cursor:pointer}.pc-erro-senha{min-height:18px;margin-top:8px;font:750 10px/1.4 system-ui}
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
    <div id="pcCursores" aria-hidden="true"></div>
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
          <div id="pcStatusCadastro" class="pc-status" aria-live="polite"></div>
          <div class="pc-acoes"><button class="pc-cancelar" type="button">Cancelar</button><button class="pc-entrar" type="submit">Entrar no sistema</button></div>
        </div>
      </form>
    </div>
    <div id="pcAcesso" role="dialog" aria-modal="true" aria-labelledby="pcAcessoTitulo">
      <form class="pc-card pc-acesso-card" id="pcFormularioAcesso">
        <div class="pc-card-top"><em>ÁREA RESTRITA</em><h2 id="pcAcessoTitulo">Quem está online?</h2><p>Informe a senha administrativa para visualizar a localização da equipe.</p></div>
        <div class="pc-form">
          <label>SENHA DE ACESSO<input id="pcSenhaOnline" type="password" inputmode="numeric" autocomplete="off" placeholder="Digite a senha" required></label>
          <div id="pcErroSenha" class="pc-erro-senha" aria-live="polite"></div>
          <div class="pc-acesso-acoes"><button class="pc-voltar" type="button">Voltar</button><button class="pc-entrar" type="submit">Acessar painel</button></div>
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
    const botaoEntrar = evento.submitter || document.querySelector("#pcFormulario .pc-entrar");
    if (botaoEntrar) {
      botaoEntrar.disabled = true;
      botaoEntrar.textContent = "Conectando...";
    }
    pcUltimoEstado = "";
    const iniciou = await conectar();

    if (iniciou !== false) {
      const limite = Date.now() + 8000;
      while (!pcConectado && Date.now() < limite) {
        await new Promise(resolve => setTimeout(resolve, 120));
      }
    }

    if (pcConectado) {
      document.querySelector("#pcCadastro")?.classList.remove("aberto");
      await publicarPresenca(true);
    } else {
      const status = document.querySelector("#pcStatusCadastro");
      if (status && !status.textContent) {
        status.textContent = "A conexão demorou mais que o esperado. Verifique a internet e tente novamente.";
        status.classList.add("erro");
      }
      pcCanal = null;
    }

    if (botaoEntrar) {
      botaoEntrar.disabled = false;
      botaoEntrar.textContent = "Entrar no sistema";
    }
  });
  document.querySelector(".pc-voltar")?.addEventListener("click", fecharAcessoOnline);
  document.querySelector("#pcFormularioAcesso")?.addEventListener("submit", evento => {
    evento.preventDefault();
    const senha = document.querySelector("#pcSenhaOnline")?.value || "";
    const erro = document.querySelector("#pcErroSenha");
    if (senha !== PC_SENHA_ONLINE) {
      if (erro) erro.textContent = "Senha incorreta. Tente novamente.";
      document.querySelector("#pcSenhaOnline")?.select();
      return;
    }
    pcAcessoOnline = true;
    fecharAcessoOnline();
    abrirPainel();
  });
}

function instalarObservadores() {
  document.addEventListener("pointermove", enviarCursor, { passive: true });
  document.addEventListener("click", evento => {
    if (evento.target.closest(".module-toggle,.nav-btn,.pix-menu-btn,.crm-menu-btn,.compras-menu-btn,.garantia-menu-btn,[data-compras-view],[data-module='compras']")) {
      agendarPublicacao();
      setTimeout(limparCursoresForaDoContexto, 700);
    }
    if (pcPainelAberto && !evento.target.closest("#pcPainel,#pcBotao")) fecharPainel();
  }, true);
  document.addEventListener("change", evento => {
    if (evento.target.matches('input[type="month"],select')) {
      agendarPublicacao();
      limparCursoresForaDoContexto();
    }
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

  let contextoObservado = "";
  const observarContexto = new MutationObserver(() => {
    const atual = estadoAtual();
    const assinatura = `${atual.modulo}|${atual.area}|${atual.competencia}`;
    if (assinatura === contextoObservado) return;
    contextoObservado = assinatura;
    limparCursoresForaDoContexto();
    agendarPublicacao(true);
  });

  observarContexto.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "hidden", "aria-selected"]
  });
}

async function iniciarPresenca() {
  instalarInterface();
  instalarObservadores();
  abrirCadastro();
  console.info(`[PRESENÇA] Módulo ativo — ${PC_VERSION}.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarPresenca, { once: true });
} else {
  iniciarPresenca();
}