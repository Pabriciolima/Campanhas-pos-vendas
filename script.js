import { firestore } from "./firebase-config.js";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const FILIAIS = [
  { dn: '4700', unidade: 'ANANINDEUA' }, { dn: '4731', unidade: 'SÃO LUIS' },
  { dn: '1960', unidade: 'BACABAL' }, { dn: '4700', unidade: 'BELÉM' },
  { dn: '4756', unidade: 'MACAPÁ' }, { dn: '4730', unidade: 'TERESINA' },
  { dn: '4730', unidade: 'URUÇUI' }, { dn: '1928', unidade: 'SINOP' },
  { dn: '4738', unidade: 'CUIABÁ' }, { dn: '4738', unidade: 'AGUA BOA' },
  { dn: '4774', unidade: 'RONDONOPOLIS' }, { dn: '4977', unidade: 'PORTO VELHO' },
  { dn: '4977', unidade: 'JIPARANÁ' }, { dn: '1970', unidade: 'VILHENA' }
];

const CARGOS = ['Mecânico Produtivo', 'Chefe de Oficina', 'Mecânico Líder', 'Controlador de Produtividade'];
const DB_KEY = 'campanha_oficina_mvp_v1';
let db = carregarDB();
let apuracaoAtual = [];

const funcionariosRef = collection(firestore, "funcionarios");

function carregarDB() {
  try {
    const salvo = localStorage.getItem(DB_KEY);

    if (!salvo) {
      return {
        funcionarios: [],
        lancamentos: []
      };
    }

    const dados = JSON.parse(salvo);

    return {
      funcionarios: [],
      lancamentos: dados.lancamentos || []
    };
  } catch (erro) {
    console.error("Erro ao carregar dados locais:", erro);

    return {
      funcionarios: [],
      lancamentos: []
    };
  }
}

function salvarDB() {
  const dadosLocais = {
    lancamentos: db.lancamentos
  };

  localStorage.setItem(DB_KEY, JSON.stringify(dadosLocais));
}

function uid() { return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2); }
function moeda(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function pct(v) { return Number.isFinite(v) ? `${v.toFixed(2).replace('.', ',')}%` : '0,00%'; }
function numero(v) { return Number(String(v ?? '').replace(',', '.')) || 0; }
function mesAtual() { return new Date().toISOString().slice(0, 7); }
function filialPorNome(nome) { return FILIAIS.find(f => f.unidade === nome); }
function funcionarioPorId(id) { return db.funcionarios.find(f => f.id === id); }
function toast(msg) { const el = document.querySelector('#toast'); el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); }

function iniciarFuncionariosTempoReal() {
  onSnapshot(
    funcionariosRef,

    snapshot => {
      db.funcionarios = snapshot.docs.map(documento => ({
        id: documento.id,
        ...documento.data()
      }));

      renderTudo();

      console.log(
        `${db.funcionarios.length} funcionário(s) carregado(s) do Firebase.`
      );
    },

    erro => {
      console.error("Erro ao buscar funcionários no Firebase:", erro);

      alert(
        "Não foi possível carregar os funcionários do Firebase. Verifique a conexão e as regras do Firestore."
      );
    }
  );
}

function bonusMecanicoProdutividade(valor) {
  if (valor >= 100) return 1000;
  if (valor >= 90) return 790;
  if (valor >= 80) return 690;
  if (valor >= 70) return 600;
  return 0;
}
function bonusMecanicoEficiencia(valor) {
  if (valor >= 100) return 1000;
  if (valor >= 90) return 790;
  if (valor >= 80) return 690;
  return 0;
}
function bonusControladorProd(valor) {
  if (valor >= 90) return 500;
  if (valor >= 80) return 300;
  if (valor >= 70) return 100;
  return 0;
}
function bonusControladorEfic(valor) {
  if (valor >= 100) return 500;
  if (valor >= 90) return 300;
  if (valor >= 80) return 100;
  return 0;
}

function calcularLancamento(l) {
  const f = funcionarioPorId(l.funcionarioId) || { nome: 'Funcionário removido', cargo: l.cargo, filial: l.filial, dn: l.dn };
  const base = { ...l, nome: f.nome, cargo: f.cargo || l.cargo, filial: f.filial || l.filial, dn: f.dn || l.dn, produtividade: 0, eficiencia: 0, bonusBruto: 0, penalidade: 0, bonusFinal: 0, status: 'NÃO HABILITADO', motivo: '' };

  if (base.cargo === 'Mecânico Produtivo') {
    base.produtividade = l.horasDisponiveis > 0 ? (l.horasTrabalhadas / l.horasDisponiveis) * 100 : 0;
    base.eficiencia = l.horasTrabalhadas > 0 ? (l.horasVendidas / l.horasTrabalhadas) * 100 : 0;
    const minimoHoraVendida = l.horasVendidas >= l.horasDisponiveis * 0.70;
    const atingiu = base.produtividade >= 70 && base.eficiencia >= 80 && minimoHoraVendida;
    if (!atingiu) base.motivo = !minimoHoraVendida ? 'Horas vendidas abaixo de 70% das disponíveis' : 'Métricas mínimas não atingidas';
    else {
      base.bonusBruto = bonusMecanicoProdutividade(base.produtividade) + bonusMecanicoEficiencia(base.eficiencia);
      base.status = 'HABILITADO';
    }
    if (l.osPrejuizo) { base.status = 'NÃO HABILITADO'; base.motivo = 'OS interna/retrabalho/imperícia'; base.bonusBruto = 0; }
    else if (base.status === 'HABILITADO' && l.treinamentoPendente) base.penalidade = base.bonusBruto * 0.5;
  }

  if (base.cargo === 'Chefe de Oficina' || base.cargo === 'Mecânico Líder') {
    const qtd50 = Math.max(0, numero(l.qtdAcima50));
    const qtd60 = Math.max(0, numero(l.qtdAcima60));
    const somente50 = Math.max(0, qtd50 - qtd60);
    base.bonusBruto = somente50 * 300 + qtd60 * 500;
    if (base.cargo === 'Mecânico Líder') base.bonusBruto *= 0.5;
    base.status = base.bonusBruto > 0 ? 'HABILITADO' : 'NÃO HABILITADO';
    if (l.treinamentoPendente) { base.status = 'NÃO HABILITADO'; base.motivo = 'Treinamento individual pendente'; base.bonusBruto = 0; }
    else if (base.status === 'HABILITADO' && numero(l.percentualEquipeTreinada) < 95) base.penalidade = base.bonusBruto * 0.5;
  }

  if (base.cargo === 'Controlador de Produtividade') {
    base.produtividade = numero(l.produtividadeInformada);
    base.eficiencia = numero(l.eficienciaInformada);
    if (base.produtividade >= 70 && base.eficiencia >= 80) {
      base.bonusBruto = bonusControladorProd(base.produtividade) + bonusControladorEfic(base.eficiencia);
      base.status = 'HABILITADO';
    } else base.motivo = 'Métricas mínimas não atingidas';
  }

  base.bonusFinal = Math.max(0, base.bonusBruto - base.penalidade);
  return base;
}

function preencherSelect(select, itens, placeholder = 'Selecione') {
  select.innerHTML = `<option value="">${placeholder}</option>` + itens.map(i => `<option value="${i.value}">${i.label}</option>`).join('');
}

function iniciarSelects() {
  const filiais = FILIAIS.map(f => ({ value: f.unidade, label: `${f.dn} - ${f.unidade}` }));
  ['funcionarioFilial','lancamentoFilial','filtroFilialFuncionario','filtroFilialLancamento','filtroFilialApuracao'].forEach(id => preencherSelect(document.querySelector(`#${id}`), filiais, id.startsWith('filtro') ? 'Todas as filiais' : 'Selecione a filial'));
  const cargos = CARGOS.map(c => ({ value: c, label: c }));
  ['funcionarioCargo','filtroCargoFuncionario','filtroCargoLancamento'].forEach(id => preencherSelect(document.querySelector(`#${id}`), cargos, id.startsWith('filtro') ? 'Todos os cargos' : 'Selecione o cargo'));
}

function renderTudo() {
  renderFuncionarios(); renderLancamentos(); renderApuracao(); renderDashboard(); atualizarFiltrosCompetencia();
}

function renderFuncionarios() {
  const busca = document.querySelector('#buscaFuncionario').value.toLowerCase();
  const filial = document.querySelector('#filtroFilialFuncionario').value;
  const cargo = document.querySelector('#filtroCargoFuncionario').value;
  const lista = db.funcionarios.filter(f => (!busca || `${f.nome} ${f.filial} ${f.cargo}`.toLowerCase().includes(busca)) && (!filial || f.filial === filial) && (!cargo || f.cargo === cargo));
  document.querySelector('#tabelaFuncionarios').innerHTML = lista.length ? lista.map(f => `<tr><td>${f.dn}</td><td>${f.filial}</td><td><strong>${f.nome}</strong></td><td>${f.cargo}</td><td><span class="badge ${f.ativo ? 'ok' : 'no'}">${f.ativo ? 'ATIVO' : 'INATIVO'}</span></td><td><div class="actions"><button class="mini-btn" onclick="editarFuncionario('${f.id}')">Editar</button><button class="mini-btn delete" onclick="excluirFuncionario('${f.id}')">Excluir</button></div></td></tr>`).join('') : `<tr><td colspan="6" class="empty">Nenhum funcionário cadastrado.</td></tr>`;
}

function renderLancamentos() {
  const comp = document.querySelector('#filtroCompetenciaLancamento').value;
  const filial = document.querySelector('#filtroFilialLancamento').value;
  const cargo = document.querySelector('#filtroCargoLancamento').value;
  const lista = db.lancamentos.map(calcularLancamento).filter(l => (!comp || l.competencia === comp) && (!filial || l.filial === filial) && (!cargo || l.cargo === cargo));
  document.querySelector('#tabelaLancamentos').innerHTML = lista.length ? lista.map(l => `<tr><td>${l.competencia}</td><td>${l.filial}</td><td><strong>${l.nome}</strong></td><td>${l.cargo}</td><td>${indicadoresTexto(l)}</td><td><strong>${moeda(l.bonusFinal)}</strong></td><td><span class="badge ${l.status === 'HABILITADO' ? 'ok' : 'no'}">${l.status}</span></td><td><div class="actions"><button class="mini-btn" onclick="editarLancamento('${l.id}')">Editar</button><button class="mini-btn delete" onclick="excluirLancamento('${l.id}')">Excluir</button></div></td></tr>`).join('') : `<tr><td colspan="8" class="empty">Nenhum lançamento registrado.</td></tr>`;
}

function indicadoresTexto(l) {
  if (l.cargo === 'Mecânico Produtivo' || l.cargo === 'Controlador de Produtividade') return `Prod. ${pct(l.produtividade)}<br>Ef. ${pct(l.eficiencia)}`;
  return `>50 mil: ${numero(l.qtdAcima50)}<br>>60 mil: ${numero(l.qtdAcima60)}`;
}

function obterApuracaoFiltrada() {
  const comp = document.querySelector('#filtroCompetenciaApuracao').value;
  const filial = document.querySelector('#filtroFilialApuracao').value;
  const status = document.querySelector('#filtroStatusApuracao').value;
  return db.lancamentos.map(calcularLancamento).filter(l => (!comp || l.competencia === comp) && (!filial || l.filial === filial) && (!status || l.status === status));
}

function renderApuracao() {
  apuracaoAtual = obterApuracaoFiltrada();
  const total = apuracaoAtual.reduce((s,l)=>s+l.bonusFinal,0);
  const hab = apuracaoAtual.filter(l=>l.status==='HABILITADO').length;
  const nao = apuracaoAtual.length-hab;
  document.querySelector('#apuracaoCards').innerHTML = cardsHtml([
    ['Total apurado', moeda(total)], ['Lançamentos', apuracaoAtual.length], ['Habilitados', hab], ['Não habilitados', nao]
  ]);
  document.querySelector('#tabelaApuracao').innerHTML = apuracaoAtual.length ? apuracaoAtual.map(l => `<tr><td>${l.competencia}</td><td>${l.dn}</td><td>${l.filial}</td><td><strong>${l.nome}</strong></td><td>${l.cargo}</td><td>${pct(l.produtividade)}</td><td>${pct(l.eficiencia)}</td><td>${moeda(l.bonusBruto)}</td><td>${moeda(l.penalidade)}</td><td><strong>${moeda(l.bonusFinal)}</strong></td><td><span title="${l.motivo || ''}" class="badge ${l.status==='HABILITADO'?'ok':'no'}">${l.status}</span></td></tr>`).join('') : `<tr><td colspan="11" class="empty">Nenhum resultado para os filtros escolhidos.</td></tr>`;
}

function cardsHtml(items) { return items.map(([t,v]) => `<article class="stat-card"><span>${t}</span><strong>${v}</strong></article>`).join(''); }
function renderDashboard() {
  const comp = document.querySelector('#competenciaGlobal').value;
  const lista = db.lancamentos.map(calcularLancamento).filter(l => !comp || l.competencia === comp);
  const total = lista.reduce((s,l)=>s+l.bonusFinal,0);
  document.querySelector('#dashboardCards').innerHTML = cardsHtml([
    ['Funcionários ativos', db.funcionarios.filter(f=>f.ativo).length], ['Lançamentos', lista.length], ['Ganhadores', lista.filter(l=>l.status==='HABILITADO').length], ['Total investido', moeda(total)]
  ]);
  resumoAgrupado('#resumoCargo', lista, 'cargo');
  resumoAgrupado('#resumoFilial', lista, 'filial');
}
function resumoAgrupado(seletor, lista, campo) {
  const mapa = lista.reduce((a,l)=>{a[l[campo]]=(a[l[campo]]||0)+l.bonusFinal;return a;},{});
  const itens = Object.entries(mapa).sort((a,b)=>b[1]-a[1]);
  document.querySelector(seletor).innerHTML = itens.length ? itens.map(([k,v])=>`<div class="summary-row"><div><strong>${k}</strong><br><small>${lista.filter(l=>l[campo]===k).length} lançamento(s)</small></div><strong>${moeda(v)}</strong></div>`).join('') : `<p class="empty">Sem dados para exibir.</p>`;
}

function atualizarFiltrosCompetencia() {
  const comps = [...new Set(db.lancamentos.map(l=>l.competencia))].sort().reverse();
  ['filtroCompetenciaLancamento','filtroCompetenciaApuracao'].forEach(id => {
    const el = document.querySelector(`#${id}`); const atual = el.value;
    preencherSelect(el, comps.map(c=>({value:c,label:c})), 'Todas as competências'); el.value = atual;
  });
}

function abrirFuncionario() {
  document.querySelector('#formFuncionario').reset(); document.querySelector('#funcionarioId').value=''; document.querySelector('#funcionarioDn').value=''; document.querySelector('#modalFuncionario').showModal();
}
window.editarFuncionario = id => {
  const f=funcionarioPorId(id); if(!f)return;
  document.querySelector('#funcionarioId').value=f.id; document.querySelector('#funcionarioFilial').value=f.filial; document.querySelector('#funcionarioDn').value=f.dn; document.querySelector('#funcionarioNome').value=f.nome; document.querySelector('#funcionarioCargo').value=f.cargo; document.querySelector('#funcionarioAtivo').value=String(f.ativo); document.querySelector('#modalFuncionario').showModal();
};
window.excluirFuncionario = async id => {
  const possuiLancamentos = db.lancamentos.some(
    lancamento => lancamento.funcionarioId === id
  );

  if (possuiLancamentos) {
    alert(
      "Este funcionário possui lançamentos. Exclua os lançamentos primeiro ou deixe o funcionário inativo."
    );

    return;
  }

  const confirmou = confirm(
    "Deseja realmente excluir este funcionário?"
  );

  if (!confirmou) {
    return;
  }

  try {
    const funcionarioDocumento = doc(
      firestore,
      "funcionarios",
      id
    );

    await deleteDoc(funcionarioDocumento);

    toast("Funcionário excluído");
  } catch (erro) {
    console.error("Erro ao excluir funcionário:", erro);

    alert(
      "Não foi possível excluir o funcionário. Verifique o Firebase e tente novamente."
    );
  }
};

function atualizarFuncionariosLancamento() {
  const filial=document.querySelector('#lancamentoFilial').value;
  const itens=db.funcionarios.filter(f=>f.ativo&&f.filial===filial).map(f=>({value:f.id,label:`${f.nome} — ${f.cargo}`}));
  preencherSelect(document.querySelector('#lancamentoFuncionario'),itens,'Selecione o colaborador');
  renderCamposDinamicos();
}
function renderCamposDinamicos(dados={}) {
  const id=document.querySelector('#lancamentoFuncionario').value;
  const f=funcionarioPorId(id);
  const box=document.querySelector('#camposDinamicos');
  if(!f){box.innerHTML='<p class="empty">Selecione um colaborador para informar os indicadores.</p>';document.querySelector('#resultadoPreview').innerHTML='O cálculo aparecerá aqui.';return;}
  if(f.cargo==='Mecânico Produtivo') box.innerHTML=`
    <label>Faturamento individual (R$)<input type="number" step="0.01" id="faturamento" value="${dados.faturamento||''}"></label>
    <label>Horas disponíveis<input type="number" step="0.01" id="horasDisponiveis" required value="${dados.horasDisponiveis||''}"></label>
    <label>Horas trabalhadas<input type="number" step="0.01" id="horasTrabalhadas" required value="${dados.horasTrabalhadas||''}"></label>
    <label>Horas vendidas/cobradas<input type="number" step="0.01" id="horasVendidas" required value="${dados.horasVendidas||''}"></label>
    <label>Treinamento pendente?<select id="treinamentoPendente"><option value="false">Não</option><option value="true">Sim</option></select></label>
    <label>OS interna / prejuízo?<select id="osPrejuizo"><option value="false">Não</option><option value="true">Sim</option></select></label>`;
  else if(f.cargo==='Chefe de Oficina'||f.cargo==='Mecânico Líder') box.innerHTML=`
    <label>Qtd. mecânicos acima de R$ 50 mil<input type="number" min="0" id="qtdAcima50" required value="${dados.qtdAcima50||0}"></label>
    <label>Qtd. mecânicos acima de R$ 60 mil<input type="number" min="0" id="qtdAcima60" required value="${dados.qtdAcima60||0}"></label>
    <label>% da equipe com treinamento em dia<input type="number" min="0" max="100" step="0.01" id="percentualEquipeTreinada" required value="${dados.percentualEquipeTreinada??100}"></label>
    <label>Treinamento individual pendente?<select id="treinamentoPendente"><option value="false">Não</option><option value="true">Sim</option></select></label>`;
  else box.innerHTML=`
    <label>Produtividade da oficina (%)<input type="number" step="0.01" id="produtividadeInformada" required value="${dados.produtividadeInformada||''}"></label>
    <label>Eficiência da oficina (%)<input type="number" step="0.01" id="eficienciaInformada" required value="${dados.eficienciaInformada||''}"></label>`;
  if(document.querySelector('#treinamentoPendente')) document.querySelector('#treinamentoPendente').value=String(!!dados.treinamentoPendente);
  if(document.querySelector('#osPrejuizo')) document.querySelector('#osPrejuizo').value=String(!!dados.osPrejuizo);
  box.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',atualizarPreview));
  atualizarPreview();
}
function coletarLancamentoFormulario() {
  const funcionarioId=document.querySelector('#lancamentoFuncionario').value; const f=funcionarioPorId(funcionarioId);
  const get=id=>document.querySelector(`#${id}`);
  const base={id:document.querySelector('#lancamentoId').value||uid(),competencia:document.querySelector('#lancamentoCompetencia').value,funcionarioId,filial:f.filial,dn:f.dn,cargo:f.cargo};
  ['faturamento','horasDisponiveis','horasTrabalhadas','horasVendidas','qtdAcima50','qtdAcima60','percentualEquipeTreinada','produtividadeInformada','eficienciaInformada'].forEach(id=>{if(get(id))base[id]=numero(get(id).value);});
  if(get('treinamentoPendente'))base.treinamentoPendente=get('treinamentoPendente').value==='true';
  if(get('osPrejuizo'))base.osPrejuizo=get('osPrejuizo').value==='true';
  return base;
}
function atualizarPreview(){
  const fId=document.querySelector('#lancamentoFuncionario').value;if(!fId)return;
  const r=calcularLancamento(coletarLancamentoFormulario());
  document.querySelector('#resultadoPreview').innerHTML=`<strong>${r.status}</strong> · Bônus bruto: ${moeda(r.bonusBruto)} · Penalidade: ${moeda(r.penalidade)} · <strong>Total: ${moeda(r.bonusFinal)}</strong>${r.motivo?`<br><small>${r.motivo}</small>`:''}`;
}
function abrirLancamento(){
  if(!db.funcionarios.some(f=>f.ativo))return alert('Cadastre pelo menos um funcionário ativo primeiro.');
  document.querySelector('#formLancamento').reset();document.querySelector('#lancamentoId').value='';document.querySelector('#lancamentoCompetencia').value=document.querySelector('#competenciaGlobal').value||mesAtual();document.querySelector('#lancamentoFuncionario').innerHTML='<option value="">Selecione primeiro a filial</option>';renderCamposDinamicos();document.querySelector('#modalLancamento').showModal();
}
window.editarLancamento=id=>{
  const l=db.lancamentos.find(x=>x.id===id);if(!l)return;
  document.querySelector('#lancamentoId').value=l.id;document.querySelector('#lancamentoCompetencia').value=l.competencia;document.querySelector('#lancamentoFilial').value=l.filial;atualizarFuncionariosLancamento();document.querySelector('#lancamentoFuncionario').value=l.funcionarioId;renderCamposDinamicos(l);document.querySelector('#modalLancamento').showModal();
};
window.excluirLancamento=id=>{if(confirm('Excluir este lançamento?')){db.lancamentos=db.lancamentos.filter(l=>l.id!==id);salvarDB();renderTudo();toast('Lançamento excluído');}};

function exportarJson(){const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});baixar(blob,`campanha-oficina-${Date.now()}.json`);}
function exportarCsv(){
  const cab=['Competência','DN','Filial','Colaborador','Cargo','Produtividade','Eficiência','Bônus bruto','Penalidade','Bônus final','Status','Motivo'];
  const linhas=apuracaoAtual.map(l=>[l.competencia,l.dn,l.filial,l.nome,l.cargo,l.produtividade.toFixed(2),l.eficiencia.toFixed(2),l.bonusBruto.toFixed(2),l.penalidade.toFixed(2),l.bonusFinal.toFixed(2),l.status,l.motivo]);
  const csv='\uFEFF'+[cab,...linhas].map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\n');baixar(new Blob([csv],{type:'text/csv;charset=utf-8'}),'apuracao-campanha.csv');
}
function baixar(blob,nome){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nome;a.click();URL.revokeObjectURL(a.href);}

function configurarEventos(){
  document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.nav-btn,.view').forEach(e=>e.classList.remove('active'));btn.classList.add('active');document.querySelector(`#${btn.dataset.view}`).classList.add('active');document.querySelector('#pageTitle').textContent=btn.textContent;}));
  document.querySelector('#competenciaGlobal').value=mesAtual();
  document.querySelector('#competenciaGlobal').addEventListener('change',renderDashboard);
  document.querySelector('#btnNovoFuncionario').addEventListener('click',abrirFuncionario);
  document.querySelector('#btnNovoLancamento').addEventListener('click',abrirLancamento);
  document.querySelector('#funcionarioFilial').addEventListener('change',e=>document.querySelector('#funcionarioDn').value=filialPorNome(e.target.value)?.dn||'');
  document.querySelector('#lancamentoFilial').addEventListener('change',atualizarFuncionariosLancamento);
  document.querySelector('#lancamentoFuncionario').addEventListener('change',()=>renderCamposDinamicos());
  document.querySelectorAll('.fechar-modal').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  
  document
  .querySelector("#formFuncionario")
  .addEventListener("submit", async event => {
    event.preventDefault();

    const botaoSalvar = event.submitter;
    const funcionarioId = document.querySelector("#funcionarioId").value;
    const filial = document.querySelector("#funcionarioFilial").value;
    const dadosFilial = filialPorNome(filial);

    if (!dadosFilial) {
      alert("Selecione uma filial válida.");
      return;
    }

    const funcionario = {
      dn: dadosFilial.dn,
      filial,
      nome: document.querySelector("#funcionarioNome").value.trim(),
      cargo: document.querySelector("#funcionarioCargo").value,
      ativo: document.querySelector("#funcionarioAtivo").value === "true",
      atualizadoEm: serverTimestamp()
    };

    if (!funcionario.nome) {
      alert("Informe o nome do funcionário.");
      return;
    }

    try {
      if (botaoSalvar) {
        botaoSalvar.disabled = true;
        botaoSalvar.textContent = "Salvando...";
      }

      if (funcionarioId) {
        const funcionarioDocumento = doc(
          firestore,
          "funcionarios",
          funcionarioId
        );

        await updateDoc(funcionarioDocumento, funcionario);

        toast("Funcionário atualizado");
      } else {
        await addDoc(funcionariosRef, {
          ...funcionario,
          criadoEm: serverTimestamp()
        });

        toast("Funcionário cadastrado");
      }

      event.target.closest("dialog").close();
      event.target.reset();

      document.querySelector("#funcionarioId").value = "";
      document.querySelector("#funcionarioDn").value = "";
    } catch (erro) {
      console.error("Erro ao salvar funcionário:", erro);

      alert(
        "Não foi possível salvar o funcionário. Verifique o Firebase e tente novamente."
      );
    } finally {
      if (botaoSalvar) {
        botaoSalvar.disabled = false;
        botaoSalvar.textContent = "Salvar";
      }
    }
  });
  
  document.querySelector('#formLancamento').addEventListener('submit',e=>{e.preventDefault();const item=coletarLancamentoFormulario();const idx=db.lancamentos.findIndex(l=>l.id===item.id);idx>=0?db.lancamentos[idx]=item:db.lancamentos.push(item);salvarDB();e.target.closest('dialog').close();renderTudo();toast('Lançamento salvo');});
  ['buscaFuncionario','filtroFilialFuncionario','filtroCargoFuncionario'].forEach(id=>document.querySelector(`#${id}`).addEventListener('input',renderFuncionarios));
  ['filtroCompetenciaLancamento','filtroFilialLancamento','filtroCargoLancamento'].forEach(id=>document.querySelector(`#${id}`).addEventListener('change',renderLancamentos));
  ['filtroCompetenciaApuracao','filtroFilialApuracao','filtroStatusApuracao'].forEach(id=>document.querySelector(`#${id}`).addEventListener('change',renderApuracao));
  document.querySelector('#btnExportar').addEventListener('click',exportarJson);document.querySelector('#btnExportarCsv').addEventListener('click',exportarCsv);
  document.querySelector('#btnLimparTudo').addEventListener('click',()=>{if(confirm('Apagar todos os funcionários e lançamentos deste navegador?')){db={funcionarios:[],lancamentos:[]};salvarDB();renderTudo();toast('Dados apagados');}});
}

iniciarSelects();
configurarEventos();
renderTudo();
iniciarFuncionariosTempoReal();
