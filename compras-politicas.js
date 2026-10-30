// Outubro/2026: pesos aprovados por atuação. Cobertura atual menor ou igual a 4 para todos os colaboradores.
const criar=(a,b,obs,os,cobertura=0)=>({disponibilidadeA:{meta:95,bonus:a},disponibilidadeB:{meta:90,bonus:b},obsolescencia:{bonusMaximo:obs},controleOs:{meta:10,bonus:os},cobertura:{bonusMaximo:cobertura,pendente:false,meta:4}});
const LEGADO_ANALISTA=criar(300,300,300,300),LEGADO_ASSISTENTE=criar(250,250,250,250);
export const POLITICA_ANALISTA=criar(200,200,300,200,300);
export const POLITICA_ASSISTENTE=criar(112.50,112.50,300,375,300);
export function politicaCompras(pessoa,competencia='2026-10'){
 const assistente=pessoa?.politica==='assistente'||/assistente/i.test(pessoa?.cargo||'');
 return competencia<'2026-10'?(assistente?LEGADO_ASSISTENTE:LEGADO_ANALISTA):(assistente?POLITICA_ASSISTENTE:POLITICA_ANALISTA);
}
