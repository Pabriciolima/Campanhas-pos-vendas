import { chaveNpsUnidade, percentualNpsUnidade, avaliarNpsUnidade, mensagemNpsUnidade, NPS_UNIDADE_PREFIXO } from './pix-nps-unidade-core.js';

export function criarNpsUnidadePix({ supabase, aoAtualizar, filiais, competencia, filialAtual, bloqueado, alertar }) {
  const registros = new Map();
  const botoesVinculados = new WeakSet();
  let carregado = false, erro = false, consulta = null, dialogo = null, salvando = false;
  const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const avaliar = (filial, mes) => avaliarNpsUnidade(registros.get(chaveNpsUnidade(filial, mes))?.dados, { carregado, erro });
  function avisarAtualizacao() {
    aoAtualizar();
    window.dispatchEvent(new CustomEvent('pix:nps-unidade-atualizado'));
  }
  async function carregar() {
    if (consulta) return consulta;
    consulta = (async () => {
      const { data, error } = await supabase.from('campanhas_configuracoes').select('id,dados,updated_at').like('id', NPS_UNIDADE_PREFIXO + '%');
      if (error) throw error;
      registros.clear();
      for (const r of data || []) registros.set(r.id, r);
      carregado = true; erro = false;
    })().catch(e => { erro = true; throw e; }).finally(() => { consulta = null; avisarAtualizacao(); });
    return consulta;
  }
  function atualizarResumo() {
    document.querySelectorAll('[data-abrir-nps-unidade]').forEach(el => { el.hidden = String(el.dataset.npsCompetencia || competencia()).slice(0, 7) < '2026-10'; });
    document.querySelectorAll('[data-pix-nps-unidade-resumo]').forEach(el => {
      const f = el.dataset.npsFilial || filialAtual(), mes = el.dataset.npsCompetencia || competencia();
      el.hidden = String(mes).slice(0, 7) < '2026-10';
      el.textContent = f ? mensagemNpsUnidade(avaliar(f, mes)) : 'Semana 4: o cofrinho exige o NPS individual e a meta geral da filial. Cadastre o resultado por unidade e competência.';
    });
    document.querySelectorAll('[data-pix-nps-compartilhado]').forEach(el => {
      const r = avaliar(el.dataset.npsFilial, el.dataset.npsCompetencia);
      const meta = el.querySelector('[data-nps-geral-meta]');
      const realizado = el.querySelector('[data-nps-geral-realizado]');
      if (meta) meta.textContent = r.meta === null ? 'Aguardando cadastro' : r.meta.toLocaleString('pt-BR') + '%';
      if (realizado) realizado.textContent = r.realizado === null ? 'Aguardando resultado' : r.realizado.toLocaleString('pt-BR') + '%';
    });
  }
  function vincularBotoes(raiz = document) {
    raiz.querySelectorAll('[data-abrir-nps-unidade]').forEach(b => {
      if (botoesVinculados.has(b)) return;
      botoesVinculados.add(b);
      b.addEventListener('click', () => { void abrir(b.dataset.npsFilial, b.dataset.npsCompetencia); });
    });
  }
  function blocoLancamento(filial, mes) {
    const f = escape(filial), m = escape(String(mes).slice(0, 7));
    const r = avaliar(filial, mes);
    const fmt = n => n === null ? 'Aguardando' : n.toLocaleString('pt-BR') + '%';
    return `<section class="pix-nps-unidade-compartilhado" data-pix-nps-compartilhado data-nps-filial="${f}" data-nps-competencia="${m}" aria-label="NPS geral compartilhado da filial">
      <header><div><small>LANÇAMENTO ÚNICO · SEMANA 4</small><h3>NPS geral da filial</h3></div><button type="button" class="secondary" data-abrir-nps-unidade data-nps-filial="${f}" data-nps-competencia="${m}">Lançar / editar NPS da filial</button></header>
      <p><b>${f}</b> · ${m}. Informe uma única vez: o resultado é aplicado automaticamente a todos os colaboradores cadastrados nesta filial e competência.</p>
      <div class="pix-nps-unidade-valores"><div><span>Meta geral da filial</span><strong data-nps-geral-meta>${fmt(r.meta)}</strong></div><div><span>NPS geral realizado</span><strong data-nps-geral-realizado>${fmt(r.realizado)}</strong></div></div>
      <p data-pix-nps-unidade-resumo data-nps-filial="${f}" data-nps-competencia="${m}" role="status">${mensagemNpsUnidade(r)}</p>
      <small>Este resultado é compartilhado. O NPS individual de cada colaborador continua sendo informado nos campos acima.</small>
    </section>`;
  }
  function garantirDialogo() {
    if (dialogo) return;
    dialogo = document.createElement('dialog'); dialogo.id = 'pixNpsUnidadeModal'; dialogo.className = 'pix-nps-unidade-modal';
    dialogo.innerHTML = `<form id="pixNpsUnidadeForm"><header><div><small>PIX DO PRESIDENTE · SEMANA 4</small><h2>NPS geral da filial</h2></div><button type="button" data-nps-fechar aria-label="Fechar">×</button></header>
      <p>Este resultado vale para <b>todos os cofrinhos da filial</b> nesta competência. O NPS individual, as reservas semanais e as penalidades existentes continuam valendo.</p>
      <div class="pix-nps-unidade-campos"><label>Competência<input name="competencia" type="month" min="2026-10" required></label><label>Filial<select name="filial" required><option value="">Selecione a filial</option>${filiais().map(f => `<option value="${escape(f)}">${escape(f)}</option>`).join('')}</select></label><label>Meta geral de NPS (%)<input name="meta" type="number" min="-100" max="100" step="0.01" required></label><label>NPS geral realizado (%)<input name="realizado" type="number" min="-100" max="100" step="0.01" placeholder="Aguardando resultado"></label></div>
      <p class="pix-nps-unidade-situacao" role="status"></p><p class="pix-nps-unidade-dica">Informe o NPS oficial consolidado da unidade; não é a média dos percentuais individuais. Campo realizado vazio mantém os cofrinhos aguardando. Valor inicial sugerido da meta: 90%, editável.</p>
      <footer><button type="button" data-nps-fechar class="secondary">Cancelar</button><button type="submit" class="primary">Salvar NPS da filial</button></footer></form>`;
    document.body.appendChild(dialogo);
    dialogo.querySelectorAll('[data-nps-fechar]').forEach(b => b.addEventListener('click', () => { if (!salvando) dialogo.close(); }));
    const form = dialogo.querySelector('form');
    form.addEventListener('change', e => { if (e.target.name === 'filial' || e.target.name === 'competencia') preencher(); });
    form.addEventListener('input', e => { if (e.target.name === 'meta' || e.target.name === 'realizado') previa(); });
    form.addEventListener('submit', salvar);
    dialogo.addEventListener('cancel', e => { if (salvando) e.preventDefault(); });
  }
  function campos() { return dialogo.querySelector('form').elements; }
  function preencher() {
    const c = campos(), r = registros.get(chaveNpsUnidade(c.filial.value, c.competencia.value));
    c.meta.value = r?.dados?.meta ?? 90; c.realizado.value = r?.dados?.realizado ?? '';
    dialogo.dataset.versao = r?.updated_at || '';
    dialogo.dataset.existia = r ? 'true' : 'false';
    previa();
  }
  function previa() {
    const c = campos();
    const r = avaliarNpsUnidade({ meta: c.meta.value, realizado: c.realizado.value });
    const aviso = erro ? 'Falha ao consultar a configuração. Feche e tente novamente antes de salvar.' : mensagemNpsUnidade(r);
    const el = dialogo.querySelector('[role="status"]'); el.textContent = aviso; el.dataset.status = r.status;
  }
  async function abrir(filial, mes) {
    garantirDialogo();
    try { await carregar(); } catch { await alertar('Não foi possível consultar o NPS geral. Tente novamente; nenhuma alteração foi feita.'); return; }
    const c = campos();
    c.competencia.value = String(mes || competencia()).slice(0,7);
    c.filial.value = filial || filialAtual() || '';
    preencher(); dialogo.showModal();
  }
  async function salvar(e) {
    e.preventDefault(); if (salvando) return;
    if (bloqueado()) { await alertar('Os lançamentos estão bloqueados pelo diretor.'); return; }
    const c = campos(), mes = c.competencia.value, filial = c.filial.value;
    const meta = percentualNpsUnidade(c.meta.value), realizado = percentualNpsUnidade(c.realizado.value);
    const id = chaveNpsUnidade(filial, mes);
    if (!id || mes < '2026-10' || !filiais().includes(filial) || meta === null || (c.realizado.value.trim() !== '' && realizado === null)) {
      await alertar('Informe filial, competência e percentuais válidos entre -100 e 100.'); return;
    }
    const dados = { tipo: 'pix_nps_filial', competencia: mes, filial, meta, realizado, semana: 4 };
    const versaoAnterior = dialogo.dataset.versao;
    const agora = new Date().toISOString();
    salvando = true; const botoes = [...dialogo.querySelectorAll('button')]; botoes.forEach(b => b.disabled = true);
    try {
      const payload = { id, dados, updated_at: agora };
      // Atualização otimista: não sobrescreve o resultado salvo por outro usuário durante a edição.
      let q;
      if (dialogo.dataset.existia === 'true') {
        q = supabase.from('campanhas_configuracoes').update(payload).eq('id', id);
        q = versaoAnterior ? q.eq('updated_at', versaoAnterior) : q.is('updated_at', null);
      } else q = supabase.from('campanhas_configuracoes').insert(payload);
      const { data, error } = await q.select('id,dados,updated_at');
      if (error?.code === '23505') throw new Error('O NPS desta filial foi cadastrado por outro usuário. Reabra o formulário para conferir os valores.');
      if (error) throw error;
      if (!data?.length) throw new Error('Este NPS foi alterado por outro usuário. Reabra o formulário para conferir os valores atuais.');
      registros.set(id, data[0]); carregado = true; erro = false;
      dialogo.close(); avisarAtualizacao();
      // Somente sinal de atualização, sem valores da filial no broadcast.
      void canal?.send({ type: 'broadcast', event: 'atualizar', payload: {} }).catch(e => console.warn('[PIX/NPS] Atualização será sincronizada na próxima consulta.', e));
      await alertar('NPS geral salvo. Os cofrinhos desta filial foram recalculados nesta competência.');
    } catch(e) { await alertar(e.message || 'Não foi possível salvar o NPS geral. Tente novamente.'); }
    finally { salvando = false; botoes.forEach(b => b.disabled = false); }
  }
  let canal = null;
  function iniciar() {
    vincularBotoes();
    canal = supabase.channel('pix-nps-unidade-invalidacao').on('broadcast', { event: 'atualizar' }, () => { void carregar().catch(console.error); }).subscribe();
    window.addEventListener('focus', () => { void carregar().catch(console.error); });
    window.setInterval(() => { if (!document.hidden && document.querySelector('#pixPresidente.active')) void carregar().catch(console.error); }, 30000);
    return carregar();
  }
  return { avaliar, carregar, abrir, iniciar, atualizarResumo, vincularBotoes, blocoLancamento };
}
