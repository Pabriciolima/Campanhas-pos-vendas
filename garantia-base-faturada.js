import {numero,mesclar,mesEstado,escopoPessoa} from './garantia-dados.js?v=20261022-fontes';
const FILIAIS=['ANANINDEUA','MACAPÁ','SÃO LUIS','BACABAL','TERESINA','URUÇUI','CUIABÁ','RONDONOPOLIS','AGUA BOA','SINOP','PORTO VELHO','VILHENA','JIPARANÁ'];
export function lancarBaseFaturada(state,month,branch,input){
 if(!FILIAIS.includes(branch))throw Error('Selecione uma filial válida.');
 const raw=numero(input);if(raw===null)throw Error('Informe um valor faturado válido, maior ou igual a zero.');
 const value=Math.round((raw+Number.EPSILON)*100)/100,current=mesEstado(state,month),metricas={[branch]:{valorFaturado:value,origem:'Lançamento manual de faturamento-base · '+month}};
 const base=u=>u===branch?value:numero(current.metricas[u]?.valorFaturado);
 const soma=units=>units.length&&units.every(u=>base(u)!==null)?Math.round(units.reduce((s,u)=>s+base(u),0)*100)/100:null;
 // Consolida somente valores monetários. Não altera recebido nem contagem de O.S.
 metricas.GERAL={valorFaturado:soma(FILIAIS),origem:'Soma do faturamento-base das 13 filiais · '+month};
 for(const p of current.participantes.filter(p=>p.perfil==='analista')){const units=[...new Set(p.unidades||[])];if(units.includes(branch))metricas[escopoPessoa(p)]={valorFaturado:soma(units),origem:'Soma do faturamento-base das unidades vinculadas · '+month};}
 return mesclar(state,{competencia:month,metricas});
}
