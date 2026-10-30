// Valores aprovados por cargo. Metas iguais, verbas independentes por colaborador.
const criar=bonus=>({disponibilidadeA:{meta:95,bonus},disponibilidadeB:{meta:90,bonus},obsolescencia:{bonusMaximo:bonus},controleOs:{meta:10,bonus}});
export const POLITICA_ANALISTA=criar(300);
export const POLITICA_ASSISTENTE=criar(250);
export function politicaCompras(pessoa){return pessoa?.politica==='assistente'||/assistente/i.test(pessoa?.cargo||'')?POLITICA_ASSISTENTE:POLITICA_ANALISTA;}
