/* Regra pura: um único NPS geral por filial e competência. */
export const NPS_UNIDADE_VIGENCIA = '2026-10';
export const NPS_UNIDADE_PREFIXO = 'pix_nps_filial_v1:';
export function normalizarFilialNps(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toUpperCase();
}
export function chaveNpsUnidade(filial, competencia) {
  const mes = String(competencia || '').slice(0, 7);
  if (!normalizarFilialNps(filial) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return '';
  return NPS_UNIDADE_PREFIXO + mes + ':' + encodeURIComponent(normalizarFilialNps(filial));
}
export function percentualNpsUnidade(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === '') return null;
  const texto = String(valor).trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(texto)) return null;
  const n = Number(texto);
  return Number.isFinite(n) && n >= -100 && n <= 100 ? n : null;
}
export function avaliarNpsUnidade(config, { carregado = true, erro = false } = {}) {
  const meta = percentualNpsUnidade(config?.meta);
  const realizado = percentualNpsUnidade(config?.realizado);
  if (erro) return { status: 'ERRO', atingiu: false, meta, realizado };
  if (!carregado) return { status: 'CARREGANDO', atingiu: false, meta, realizado };
  if (meta === null || realizado === null) return { status: 'PENDENTE', atingiu: false, meta, realizado };
  const atingiu = realizado >= meta;
  return { status: atingiu ? 'ATINGIDO' : 'NAO_ATINGIDO', atingiu, meta, realizado };
}
export function mensagemNpsUnidade(r) {
  if (r.status === 'ERRO') return 'Não foi possível conferir o NPS geral da filial. Cofrinho aguardando conferência.';
  if (r.status === 'CARREGANDO') return 'Conferindo o NPS geral da filial. Cofrinho aguardando.';
  if (r.status === 'PENDENTE') return 'NPS geral da filial pendente. O cofrinho aguarda a meta e o resultado da unidade.';
  const fmt = n => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
  return r.atingiu
    ? `NPS geral da filial atingido: ${fmt(r.realizado)} / meta ${fmt(r.meta)}. A liberação também exige o NPS individual da semana 4.`
    : `Cofrinho NPS zerado para todos da filial: NPS geral ${fmt(r.realizado)} abaixo da meta ${fmt(r.meta)}.`;
}
