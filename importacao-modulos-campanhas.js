/*
IMPORTAÇÃO DO RELATÓRIO DO SISTEMA — PIX + PRODUTIVOS
Versão 2026.07.22-05

No index.html:
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<script type="module" src="./importacao-relatorio-sistema.js?v=20260722-05"></script>

Carregue depois de script.js e pix-presidente.js.
Remova versões antigas da importação de lançamentos.
*/

import { firestore } from "./firebase-config.js";
import {
  collection, getDocs, addDoc, updateDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const $ = s => document.querySelector(s);
const txt = v => String(v ?? "").trim();
const norm = v => txt(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toUpperCase().replace(/\s+/g, " ").trim();
const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;")
  .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

function num(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = txt(v).replace(/\s/g,"").replace(/R\$/gi,"").replace(/%/g,"");
  if (s.includes(",")) s = s.replace(/\./g,"").replace(",",".");
  const n = Number(s.replace(/[^\d.-]/g,""));
  return Number.isFinite(n) ? n : 0;
}

function bool(v) {
  return ["SIM","S","TRUE","1","X"].includes(norm(v));
}

function competencia(v) {
  const s = txt(v);
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\/(\d{4})$/);
  return m ? `${m[2]}-${m[1]}` : "";
}

function alertar(m) {
  if (window.CampanhaUI?.alert) return window.CampanhaUI.alert(m);
  alert(m);
  return Promise.resolve();
}

const CONFIG = {
  pix: {
    nome: "Pix do Presidente",
    header: "#pix-lancamentos .panel-header",
    funcionarios: "pix_presidente_funcionarios",
    lancamentos: "pix_presidente_lancamentos"
  },
  produtivos: {
    nome: "Campanha dos Produtivos",
    header: "#lancamentos .panel-header",
    funcionarios: "funcionarios"
  }
};

const CARGOS = {
  consultor: ["CONSULTOR TECNICO","CONSULTOR TÉCNICO"],
  supervisor: ["SUPERVISOR DE ASSISTENCIA","SUPERVISOR DE ASSISTÊNCIA"],
  orcamentista: [
    "ORCAMENTISTA / FACILITADOR DE NEGOCIOS",
    "ORÇAMENTISTA / FACILITADOR DE NEGÓCIOS",
    "ORCAMENTISTA","ORÇAMENTISTA"
  ]
};

const state = {
  tipo: "pix", arquivo: null, workbook: null, aba: "",
  competencia: new Date().toISOString().slice(0,7),
  semana: 1, filial: "", estrategia: "novos",
  headers: [], rows: [], brutos: [], gerados: [],
  erros: [], avisos: [], processando: false
};

function col(aliases) {
  const headers = state.headers.map(norm);
  for (const alias of aliases) {
    const a = norm(alias);
    let i = headers.findIndex(h => h === a);
    if (i >= 0) return i;
    i = headers.findIndex(h => h.includes(a) || a.includes(h));
    if (i >= 0) return i;
  }
  return -1;
}

const val = (row,i) => i >= 0 ? row[i] ?? "" : "";

function mapaPix() {
  return {
    vendedor: col(["Vendedor","Colaborador","Nome"]),
    total: col(["Vlr. Total","Valor Total"]),
    ticket: col(["Ticket Médio","Ticket Medio"]),
    objetivoMo: col(["Objetivo M.O.","Objetivo MO"]),
    valorMo: col(["Vlr. M.O.","Valor M.O.","Vlr. MO"]),
    objetivoPecas: col(["Objetivo Peças","Objetivo Pecas"]),
    valorPecas: col(["Vlr. Peças","Valor Peças","Vlr. Pecas"]),
    qtdTotal: col(["Qtd. Total","Quantidade Total"]),
    qtdPassagens: col(["Qtd. Passagens","Quantidade Passagens"]),
    ticketPecas: col(["Ticket Médio Peças","Ticket Medio Pecas"]),
    filial: col(["Filial","Unidade","Loja"]),
    dn: col(["DN","Código DN","Codigo DN"])
  };
}

function mapaProd() {
  return {
    competencia: col(["Competencia","Competência","Mes","Mês"]),
    dn: col(["DN","Código DN","Codigo DN"]),
    filial: col(["Filial","Unidade"]),
    colaborador: col(["Colaborador","Funcionário","Funcionario","Mecânico","Mecanico","Nome"]),
    cargo: col(["Cargo","Função","Funcao"]),
    faturamento: col(["Faturamento","Faturamento Individual","Vlr. Total","Valor Total"]),
    disponiveis: col(["Horas Disponíveis","Horas Disponiveis"]),
    trabalhadas: col(["Horas Trabalhadas"]),
    vendidas: col(["Horas Vendidas","Horas Cobradas"]),
    treinamento: col(["Treinamento Pendente"]),
    retrabalho: col(["Retrabalho","Imperícia","Impericia","OS Interna"])
  };
}

function processarPix() {
  const m = mapaPix();
  const erros = [];
  [
    [m.vendedor,"Vendedor"],[m.total,"Vlr. Total"],[m.ticket,"Ticket Médio"],
    [m.objetivoMo,"Objetivo M.O."],[m.valorMo,"Vlr. M.O."],
    [m.objetivoPecas,"Objetivo Peças"],[m.valorPecas,"Vlr. Peças"]
  ].forEach(([i,n]) => { if (i < 0) erros.push(`A coluna ${n} não foi encontrada.`); });

  const brutos = [];
  if (erros.length) return { brutos, erros };

  state.rows.forEach((row,index) => {
    const vendedor = txt(val(row,m.vendedor));
    if (!vendedor || /^\d+$/.test(vendedor) || norm(vendedor) === "TOTAL") return;

    const item = {
      linha: index + 2,
      vendedor,
      filial: txt(val(row,m.filial)) || state.filial,
      dn: txt(val(row,m.dn)),
      valorTotal: num(val(row,m.total)),
      ticketMedio: num(val(row,m.ticket)),
      objetivoMo: num(val(row,m.objetivoMo)),
      valorMo: num(val(row,m.valorMo)),
      objetivoPecas: num(val(row,m.objetivoPecas)),
      valorPecas: num(val(row,m.valorPecas)),
      qtdTotal: num(val(row,m.qtdTotal)),
      qtdPassagens: num(val(row,m.qtdPassagens)),
      ticketMedioPecas: num(val(row,m.ticketPecas))
    };

    if (!item.filial) erros.push(`Linha ${item.linha}: informe a filial no modal.`);
    brutos.push(item);
  });

  return { brutos, erros };
}

function processarProd() {
  const m = mapaProd();
  const brutos = [];
  const erros = [];

  state.rows.forEach((row,index) => {
    if (!row.some(v => txt(v))) return;

    const item = {
      linha: index + 2,
      competencia: competencia(val(row,m.competencia)) || state.competencia,
      dn: txt(val(row,m.dn)),
      filial: txt(val(row,m.filial)) || state.filial,
      colaborador: txt(val(row,m.colaborador)),
      cargo: txt(val(row,m.cargo)),
      faturamento: num(val(row,m.faturamento)),
      horasDisponiveis: num(val(row,m.disponiveis)),
      horasTrabalhadas: num(val(row,m.trabalhadas)),
      horasVendidas: num(val(row,m.vendidas)),
      treinamentoPendente: bool(val(row,m.treinamento)),
      retrabalho: bool(val(row,m.retrabalho))
    };

    if (!item.filial) erros.push(`Linha ${item.linha}: filial não informada.`);
    if (!item.colaborador) erros.push(`Linha ${item.linha}: colaborador não informado.`);
    if (!item.cargo) erros.push(`Linha ${item.linha}: cargo não informado.`);
    if (item.horasDisponiveis <= 0) erros.push(`Linha ${item.linha}: Horas Disponíveis deve ser maior que zero.`);
    brutos.push(item);
  });

  return { brutos, erros };
}

function processar() {
  const r = state.tipo === "pix" ? processarPix() : processarProd();
  state.brutos = r.brutos;
  state.gerados = [];
  state.erros = r.erros;
  state.avisos = [];
  render();
}

async function lerArquivo(file) {
  if (!window.XLSX) throw new Error("A biblioteca XLSX não foi carregada.");
  if (!file) return;

  const ext = file.name.split(".").pop().toLowerCase();
  if (!["xlsx","xls","csv"].includes(ext)) throw new Error("Utilize XLSX, XLS ou CSV.");

  state.arquivo = file;
  const buffer = await file.arrayBuffer();
  state.workbook = XLSX.read(buffer,{type:"array",cellDates:true});
  state.aba = state.workbook.SheetNames[0];

  $("#irsAba").innerHTML = state.workbook.SheetNames
    .map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("");

  carregarAba(state.aba);
}

function carregarAba(nome) {
  const sheet = state.workbook?.Sheets[nome];
  if (!sheet) return;

  state.aba = nome;
  const matrix = XLSX.utils.sheet_to_json(sheet,{header:1,defval:"",raw:false});

  let headerIndex = matrix.findIndex(row =>
    row.some(cell => ["VENDEDOR","COLABORADOR","FUNCIONARIO","FUNCIONÁRIO"].includes(norm(cell)))
  );
  if (headerIndex < 0) headerIndex = 0;

  state.headers = (matrix[headerIndex] || []).map(txt);
  state.rows = matrix.slice(headerIndex + 1);
  processar();
}

async function buscar(colecao) {
  const snap = await getDocs(collection(firestore,colecao));
  return snap.docs.map(d => ({id:d.id,...d.data()}));
}

function encontrarPessoa(lista,nome,filial,cargos=[]) {
  const candidatos = lista.filter(p =>
    norm(p.nome) === norm(nome) && norm(p.filial) === norm(filial)
  );
  if (!cargos.length) return candidatos[0] || null;
  return candidatos.find(p => cargos.includes(norm(p.cargo))) || null;
}

function encontrarCargo(lista,filial,cargos) {
  return lista.find(p =>
    norm(p.filial) === norm(filial) &&
    cargos.includes(norm(p.cargo)) &&
    p.ativo !== false && p.ativo !== "false"
  ) || null;
}

function ticketUnidade(itens) {
  const qtd = itens.reduce((s,r) => s + r.qtdTotal,0);
  const total = itens.reduce((s,r) => s + r.valorTotal,0);
  if (qtd > 0) return total / qtd;
  const tickets = itens.map(r => r.ticketMedio).filter(v => v > 0);
  return tickets.length ? tickets.reduce((s,v) => s+v,0) / tickets.length : 0;
}

function gerarPix(brutos,funcionarios) {
  const gerados = [];
  const avisos = [];

  brutos.forEach(r => {
    const pessoa = encontrarPessoa(funcionarios,r.vendedor,r.filial,CARGOS.consultor);

    if (!pessoa) {
      avisos.push(`Linha ${r.linha}: ${r.vendedor} não localizado como Consultor Técnico em ${r.filial}.`);
      return;
    }

    gerados.push({
      competencia: state.competencia,
      semana: state.semana,
      funcionarioId: pessoa.id,
      nome: pessoa.nome,
      filial: pessoa.filial,
      dn: pessoa.dn || r.dn || "",
      cargo: pessoa.cargo,
      metaSemanal: r.objetivoMo,
      realizadoSemanal: r.valorTotal,
      ticketMedio: r.ticketMedio,
      margem: 0, metaNps: 0, realizadoNps: 0, osAbertaPercentual: 0,
      objetivoMo: r.objetivoMo, realizadoMo: r.valorMo,
      objetivoPecas: r.objetivoPecas, realizadoPecas: r.valorPecas,
      valorTotalSistema: r.valorTotal, ticketMedioPecas: r.ticketMedioPecas,
      qtdTotal: r.qtdTotal, qtdPassagens: r.qtdPassagens,
      origemImportacao: "RELATORIO SISTEMA",
      arquivoImportado: state.arquivo?.name || ""
    });
  });

  const grupos = new Map();
  brutos.forEach(r => {
    const key = norm(r.filial);
    if (!grupos.has(key)) grupos.set(key,[]);
    grupos.get(key).push(r);
  });

  grupos.forEach(itens => {
    const filial = itens[0]?.filial || "";
    const metaMo = itens.reduce((s,r) => s+r.objetivoMo,0);
    const realizadoMo = itens.reduce((s,r) => s+r.valorMo,0);
    const metaPecas = itens.reduce((s,r) => s+r.objetivoPecas,0);
    const realizadoPecas = itens.reduce((s,r) => s+r.valorPecas,0);
    const meta = metaMo + metaPecas;
    const realizado = realizadoMo + realizadoPecas;
    const ticket = ticketUnidade(itens);

    [
      [CARGOS.supervisor,"Supervisor de Assistência"],
      [CARGOS.orcamentista,"Orçamentista"]
    ].forEach(([cargos,label]) => {
      const pessoa = encontrarCargo(funcionarios,filial,cargos);

      if (!pessoa) {
        avisos.push(`${label} não encontrado na base da filial ${filial}.`);
        return;
      }

      gerados.push({
        competencia: state.competencia,
        semana: state.semana,
        funcionarioId: pessoa.id,
        nome: pessoa.nome,
        filial: pessoa.filial,
        dn: pessoa.dn || itens[0]?.dn || "",
        cargo: pessoa.cargo,
        metaSemanal: meta,
        realizadoSemanal: realizado,
        ticketMedio: ticket,
        margem: 0, metaNps: 0, realizadoNps: 0, osAbertaPercentual: 0,
        objetivoMo: metaMo, realizadoMo,
        objetivoPecas: metaPecas, realizadoPecas,
        quantidadeColaboradores: itens.length,
        origemImportacao: "AGREGACAO AUTOMATICA DO RELATORIO",
        arquivoImportado: state.arquivo?.name || ""
      });
    });
  });

  return { gerados, avisos };
}

const chavePix = r => [r.funcionarioId,r.competencia,Number(r.semana)].join("|");

async function salvarPix(registros) {
  const existentes = await buscar(CONFIG.pix.lancamentos);
  const mapa = new Map(existentes.map(r => [chavePix(r),r]));
  let criados=0, atualizados=0, ignorados=0;

  for (const registro of registros) {
    const antigo = mapa.get(chavePix(registro));

    if (antigo && state.estrategia === "novos") {
      ignorados++;
      continue;
    }

    const dados = {...registro,atualizadoEm:serverTimestamp()};

    if (antigo) {
      await updateDoc(doc(firestore,CONFIG.pix.lancamentos,antigo.id),dados);
      atualizados++;
    } else {
      await addDoc(collection(firestore,CONFIG.pix.lancamentos),{
        ...dados,criadoEm:serverTimestamp()
      });
      criados++;
    }
  }

  return {criados,atualizados,ignorados};
}

function carregarDb() {
  try {
    return JSON.parse(localStorage.getItem("campanha_oficina_mvp_v1") || '{"lancamentos":[]}');
  } catch {
    return {lancamentos:[]};
  }
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() :
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function salvarProd(brutos) {
  const funcionarios = await buscar(CONFIG.produtivos.funcionarios);
  const db = carregarDb();
  if (!Array.isArray(db.lancamentos)) db.lancamentos = [];

  const chave = r => [r.funcionarioId,r.competencia].join("|");
  const mapa = new Map(db.lancamentos.map(r => [chave(r),r]));
  let criados=0, atualizados=0, ignorados=0;
  const falhas=[];

  for (const r of brutos) {
    const pessoa = encontrarPessoa(funcionarios,r.colaborador,r.filial);

    if (!pessoa) {
      falhas.push(`Linha ${r.linha}: ${r.colaborador} não encontrado em ${r.filial}.`);
      continue;
    }

    const registro = {
      competencia:r.competencia, funcionarioId:pessoa.id, nome:pessoa.nome,
      filial:pessoa.filial, dn:pessoa.dn || r.dn || "", cargo:pessoa.cargo || r.cargo,
      faturamento:r.faturamento, horasDisponiveis:r.horasDisponiveis,
      horasTrabalhadas:r.horasTrabalhadas, horasVendidas:r.horasVendidas,
      treinamentoPendente:r.treinamentoPendente, retrabalho:r.retrabalho,
      produtividade:r.horasDisponiveis > 0 ? r.horasTrabalhadas/r.horasDisponiveis*100 : 0,
      eficiencia:r.horasTrabalhadas > 0 ? r.horasVendidas/r.horasTrabalhadas*100 : 0,
      origemImportacao:"RELATORIO SISTEMA",
      arquivoImportado:state.arquivo?.name || ""
    };

    const antigo = mapa.get(chave(registro));

    if (antigo && state.estrategia === "novos") {
      ignorados++;
      continue;
    }

    if (antigo) {
      const i = db.lancamentos.findIndex(x => x.id === antigo.id);
      db.lancamentos[i] = {...antigo,...registro,id:antigo.id};
      atualizados++;
    } else {
      const novo = {...registro,id:uid()};
      db.lancamentos.push(novo);
      mapa.set(chave(novo),novo);
      criados++;
    }
  }

  localStorage.setItem("campanha_oficina_mvp_v1",JSON.stringify(db));
  return {criados,atualizados,ignorados,falhas};
}

async function confirmar() {
  if (state.processando || state.erros.length || !state.brutos.length) return;

  state.processando = true;
  render();

  try {
    let resultado;

    if (state.tipo === "pix") {
      const funcionarios = await buscar(CONFIG.pix.funcionarios);
      const montagem = gerarPix(state.brutos,funcionarios);
      state.gerados = montagem.gerados;
      state.avisos = montagem.avisos;

      if (!state.gerados.length) {
        throw new Error("Nenhum lançamento foi associado à base de participantes.");
      }

      resultado = await salvarPix(state.gerados);
    } else {
      resultado = await salvarProd(state.brutos);
    }

    const mensagem = [
      "Importação concluída.","",
      `${resultado.criados} criado(s)`,
      `${resultado.atualizados} atualizado(s)`,
      `${resultado.ignorados} ignorado(s)`
    ];

    if (resultado.falhas?.length) {
      mensagem.push("","Não importados:",...resultado.falhas.slice(0,20));
    }

    if (state.avisos.length) {
      mensagem.push("","Avisos:",...state.avisos.slice(0,20));
    }

    await alertar(mensagem.join("\n"));
    $("#irsModal").close();

    window.dispatchEvent(new CustomEvent(
      state.tipo === "pix" ? "pix:importacao-concluida" : "produtivos:importacao-concluida",
      {detail:resultado}
    ));

    if (state.tipo === "produtivos") {
      setTimeout(() => location.reload(),500);
    }
  } catch (erro) {
    console.error(erro);
    await alertar(erro.message || "Erro na importação.");
  } finally {
    state.processando = false;
    render();
  }
}

function modelo(tipo) {
  if (!window.XLSX) return alertar("A biblioteca XLSX não foi carregada.");

  const headers = tipo === "pix"
    ? ["Vendedor","Vlr. Acumulado","Vlr. Franquia","Vlr. Dia","Vlr. Franquia Dia",
       "Vlr. Total","Ticket Médio","Objetivo M.O.","Vlr. M.O.","Dif. M.O.",
       "Objetivo Peças","Vlr. Peças","Dif. Peças","Qtd. Acumulada","Qtd. Dia",
       "Qtd. Total","Qtd. Passagens","Ticket Médio Peças","Ticket Médio M.O.",
       "Vlr. Obj. Diário","Perc. Objetivo"]
    : ["Competencia","DN","Filial","Colaborador","Cargo","Faturamento",
       "Horas Disponiveis","Horas Trabalhadas","Horas Vendidas",
       "Treinamento Pendente","Retrabalho"];

  const example = tipo === "pix"
    ? ["NOME DO CONSULTOR",283736.19,0,17983.05,0,301719.24,4437.05,
       64000,99379.54,35379.54,160000,202339.70,42339.70,61,7,68,
       60,2975.58,1461.46,64000,155.28]
    : ["2026-07","4700","ANANINDEUA","NOME DO MECÂNICO",
       "Mecânico Produtivo",65000,176,150,145,"NÃO","NÃO"];

  const sheet = XLSX.utils.aoa_to_sheet([headers,example]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book,sheet,tipo === "pix" ? "RELATORIO SISTEMA" : "PRODUTIVOS");
  XLSX.writeFile(book,tipo === "pix" ? "modelo-relatorio-pix.xlsx" : "modelo-importacao-produtivos.xlsx");
}

function css() {
  if ($("#irsCss")) return;

  document.head.insertAdjacentHTML("beforeend",`
    <style id="irsCss">
      .irs-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-left:auto;margin-right:10px}
      .irs-btn{min-height:40px;padding:9px 13px;border-radius:10px;font-weight:800;cursor:pointer}
      .irs-model{border:1px solid #d4e0e6;background:#fff;color:#0b3154}
      .irs-import{border:0;background:#0b3154;color:#fff}
      .irs-dialog{width:min(980px,calc(100vw - 28px));max-height:calc(100vh - 28px);padding:0;border:0;border-radius:20px;overflow:hidden}
      .irs-dialog::backdrop{background:rgba(8,25,38,.68);backdrop-filter:blur(3px)}
      .irs-form{display:flex;flex-direction:column;max-height:calc(100vh - 28px)}
      .irs-header{display:flex;justify-content:space-between;padding:20px 22px;color:#fff;background:linear-gradient(135deg,#0b3154,#087354)}
      .irs-header h2{margin:4px 0}.irs-header p{margin:0;opacity:.85}
      .irs-close{width:40px;height:40px;border:1px solid #ffffff55;border-radius:11px;background:#ffffff18;color:#fff;font-size:1.3rem}
      .irs-body{padding:20px 22px;overflow:auto}
      .irs-grid{display:grid;grid-template-columns:repeat(5,minmax(130px,1fr));gap:10px}
      .irs-field{display:grid;gap:6px}.irs-field span{font-size:.7rem;font-weight:800;color:#687c8b;text-transform:uppercase}
      .irs-field input,.irs-field select{min-height:41px;padding:8px;border:1px solid #dce6ec;border-radius:9px;background:#fff}
      .irs-drop{display:block;margin-top:13px;padding:25px;border:2px dashed #9eb3c0;border-radius:13px;text-align:center;cursor:pointer}
      .irs-drop strong,.irs-drop small{display:block}.irs-drop small{margin-top:5px;color:#687c8b}
      .irs-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:12px}
      .irs-summary article{padding:12px;border:1px solid #dce6ec;border-radius:11px}
      .irs-summary span{font-size:.68rem;font-weight:800;color:#687c8b;text-transform:uppercase}
      .irs-summary strong{display:block;margin-top:6px;color:#0b3154}
      .irs-note{margin-top:12px;padding:12px;border:1px solid #d7e4ea;border-radius:10px;background:#f6f9fa;color:#36566a}
      .irs-preview{margin-top:12px;overflow:auto}.irs-table{width:100%;border-collapse:collapse}
      .irs-table th,.irs-table td{padding:8px;border-bottom:1px solid #dce6ec;text-align:left;white-space:nowrap}
      .irs-table th{font-size:.67rem;color:#687c8b;text-transform:uppercase}
      .irs-msg{display:grid;gap:7px;margin-top:12px;max-height:190px;overflow:auto}
      .irs-error,.irs-warning,.irs-ok{padding:9px 11px;border-radius:9px}
      .irs-error{background:#fdeaea;color:#922727}.irs-warning{background:#fff4d8;color:#825800}
      .irs-ok{border:1px dashed #dce6ec;color:#687c8b;text-align:center}
      .irs-footer{display:flex;justify-content:flex-end;gap:9px;padding:15px 22px;border-top:1px solid #dce6ec;background:#f7f9fa}
      .irs-footer button{min-height:41px;padding:9px 14px;border-radius:10px;font-weight:800}
      .irs-cancel{border:1px solid #d2dee5;background:#fff;color:#0b3154}
      .irs-confirm{border:0;background:#087354;color:#fff}.irs-confirm:disabled{opacity:.5}
      @media(max-width:900px){.irs-grid{grid-template-columns:repeat(2,1fr)}.irs-summary{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:580px){.irs-grid,.irs-summary{grid-template-columns:1fr}.irs-footer{flex-direction:column}}
    </style>
  `);
}

function modal() {
  if ($("#irsModal")) return;

  document.body.insertAdjacentHTML("beforeend",`
    <dialog id="irsModal" class="irs-dialog">
      <form class="irs-form" method="dialog">
        <header class="irs-header">
          <div><small>IMPORTAÇÃO OPCIONAL</small><h2 id="irsTitle">Importar relatório</h2>
          <p>Os lançamentos manuais continuarão funcionando.</p></div>
          <button type="button" id="irsClose" class="irs-close">×</button>
        </header>

        <div class="irs-body">
          <div class="irs-grid">
            <label class="irs-field"><span>Competência</span><input type="month" id="irsCompetencia"></label>
            <label class="irs-field" id="irsSemanaField"><span>Semana</span>
              <select id="irsSemana"><option value="1">Semana 1</option><option value="2">Semana 2</option>
              <option value="3">Semana 3</option><option value="4">Semana 4</option></select>
            </label>
            <label class="irs-field"><span>Filial do arquivo</span>
              <select id="irsFilial"><option value="">Usar coluna da planilha</option>
                <option>ANANINDEUA</option><option>SÃO LUIS</option><option>BACABAL</option>
                <option>MACAPÁ</option><option>TERESINA</option><option>URUÇUI</option>
                <option>SINOP</option><option>CUIABÁ</option><option>AGUA BOA</option>
                <option>RONDONOPOLIS</option><option>PORTO VELHO</option>
                <option>JIPARANÁ</option><option>VILHENA</option>
              </select>
            </label>
            <label class="irs-field"><span>Aba</span><select id="irsAba"><option>Aguardando arquivo</option></select></label>
            <label class="irs-field"><span>Duplicidades</span>
              <select id="irsStrategy"><option value="novos">Somente novos</option>
              <option value="atualizar">Atualizar existentes</option></select>
            </label>
          </div>

          <label class="irs-drop"><strong>Clique ou arraste o XLSX, XLS ou CSV</strong>
            <small id="irsDescription"></small><input type="file" id="irsFile" accept=".xlsx,.xls,.csv" hidden>
          </label>

          <div class="irs-summary">
            <article><span>Arquivo</span><strong id="irsFileName">Nenhum</strong></article>
            <article><span>Linhas válidas</span><strong id="irsRaw">0</strong></article>
            <article><span>Lançamentos gerados</span><strong id="irsGenerated">0</strong></article>
            <article><span>Erros / avisos</span><strong><span id="irsErrors">0</span> / <span id="irsWarnings">0</span></strong></article>
          </div>

          <div id="irsRule" class="irs-note"></div>
          <div id="irsPreview" class="irs-preview"></div>
          <div id="irsMessages" class="irs-msg"></div>
        </div>

        <footer class="irs-footer">
          <button type="button" id="irsCancel" class="irs-cancel">Cancelar</button>
          <button type="button" id="irsConfirm" class="irs-confirm" disabled>Confirmar importação</button>
        </footer>
      </form>
    </dialog>
  `);

  $("#irsClose").onclick = () => $("#irsModal").close();
  $("#irsCancel").onclick = () => $("#irsModal").close();
  $("#irsFile").onchange = async e => {
    try { await lerArquivo(e.target.files?.[0]); }
    catch (erro) { alertar(erro.message); }
  };
  $("#irsCompetencia").onchange = e => { state.competencia = competencia(e.target.value); processar(); };
  $("#irsSemana").onchange = e => { state.semana = Number(e.target.value); processar(); };
  $("#irsFilial").onchange = e => { state.filial = e.target.value; processar(); };
  $("#irsAba").onchange = e => carregarAba(e.target.value);
  $("#irsStrategy").onchange = e => { state.estrategia = e.target.value; };
  $("#irsConfirm").onclick = confirmar;
}

function render() {
  if (!$("#irsModal")) return;

  $("#irsFileName").textContent = state.arquivo?.name || "Nenhum";
  $("#irsRaw").textContent = state.brutos.length;
  $("#irsGenerated").textContent = state.gerados.length;
  $("#irsErrors").textContent = state.erros.length;
  $("#irsWarnings").textContent = state.avisos.length;

  const fields = state.tipo === "pix"
    ? ["vendedor","filial","valorTotal","ticketMedio","objetivoMo","valorMo","objetivoPecas","valorPecas"]
    : ["colaborador","filial","cargo","faturamento","horasDisponiveis","horasTrabalhadas","horasVendidas"];

  $("#irsPreview").innerHTML = state.brutos.length
    ? `<table class="irs-table"><thead><tr>${fields.map(f=>`<th>${esc(f)}</th>`).join("")}</tr></thead>
       <tbody>${state.brutos.slice(0,12).map(r=>`<tr>${fields.map(f=>`<td>${esc(r[f])}</td>`).join("")}</tr>`).join("")}</tbody></table>`
    : '<div class="irs-ok">Selecione um arquivo.</div>';

  const msgs = [
    ...state.erros.map(m=>({tipo:"error",m})),
    ...state.avisos.map(m=>({tipo:"warning",m}))
  ];

  $("#irsMessages").innerHTML = msgs.length
    ? msgs.slice(0,80).map(x=>`<div class="irs-${x.tipo}">${esc(x.m)}</div>`).join("")
    : '<div class="irs-ok">Nenhum erro encontrado.</div>';

  $("#irsRule").innerHTML = state.tipo === "pix"
    ? "<strong>Regras:</strong> Consultor: realizado = Vlr. Total, meta = Objetivo M.O. e indicador = Ticket Médio. Supervisor e Orçamentista: meta = Objetivo M.O. + Objetivo Peças; realizado = Vlr. M.O. + Vlr. Peças; ticket = Vlr. Total ÷ Qtd. Total. O Orçamentista usa sua política atual, com premiação menor."
    : "<strong>Produtivos:</strong> importe faturamento e horas. Produtividade e eficiência serão calculadas automaticamente.";

  $("#irsConfirm").disabled = state.processando || state.erros.length > 0 || state.brutos.length === 0;
  $("#irsConfirm").textContent = state.processando ? "Importando..." : "Confirmar importação";
}

function abrir(tipo) {
  modal();

  state.tipo = tipo;
  state.arquivo = null;
  state.workbook = null;
  state.aba = "";
  state.competencia = $("#competenciaGlobal")?.value ||
    $("#pixDashboardCompetencia")?.value || new Date().toISOString().slice(0,7);
  state.semana = 1;
  state.filial = "";
  state.estrategia = "novos";
  state.headers = [];
  state.rows = [];
  state.brutos = [];
  state.gerados = [];
  state.erros = [];
  state.avisos = [];

  $("#irsTitle").textContent = `Importar relatório — ${CONFIG[tipo].nome}`;
  $("#irsCompetencia").value = state.competencia;
  $("#irsSemana").value = "1";
  $("#irsFilial").value = "";
  $("#irsAba").innerHTML = "<option>Aguardando arquivo</option>";
  $("#irsStrategy").value = "novos";
  $("#irsFile").value = "";
  $("#irsSemanaField").hidden = tipo !== "pix";
  $("#irsDescription").textContent = tipo === "pix"
    ? "Relatório com Vendedor, Vlr. Total, Ticket Médio, Objetivo M.O., Vlr. M.O., Objetivo Peças e Vlr. Peças."
    : "Arquivo com faturamento e horas dos produtivos.";

  render();
  $("#irsModal").showModal();
}

function inserir(tipo) {
  const header = $(CONFIG[tipo].header);
  if (!header) return false;
  if (header.querySelector(`[data-irs="${tipo}"]`)) return true;

  const wrap = document.createElement("div");
  wrap.className = "irs-actions";
  wrap.dataset.irs = tipo;
  wrap.innerHTML = `
    <button type="button" class="irs-btn irs-model">Baixar modelo</button>
    <button type="button" class="irs-btn irs-import">Importar relatório</button>
  `;

  const novo = header.querySelector("#btnNovoLancamentoPix,#btnNovoLancamento,.primary");
  if (novo) novo.insertAdjacentElement("beforebegin",wrap);
  else header.appendChild(wrap);

  wrap.querySelector(".irs-model").onclick = () => modelo(tipo);
  wrap.querySelector(".irs-import").onclick = () => abrir(tipo);
  return true;
}

function iniciar() {
  css();
  modal();
  inserir("pix");
  inserir("produtivos");

  let tentativas = 0;
  const timer = setInterval(() => {
    tentativas++;
    const p = inserir("pix");
    const m = inserir("produtivos");
    if ((p && m) || tentativas >= 30) clearInterval(timer);
  },300);

  window.importacaoRelatorioSistema = {
    abrirPix: () => abrir("pix"),
    abrirProdutivos: () => abrir("produtivos"),
    versao: "2026.07.22-05"
  };
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded",iniciar,{once:true})
  : iniciar();