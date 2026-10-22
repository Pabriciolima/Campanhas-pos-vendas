import {normalizar} from './garantia-dados.js?v=20261022-fontes';
import {temAbasMensais,importarRecebimento} from './garantia-recebimento.js?v=20261022-fontes';
import {temBaseFaturamento,importarFaturamento} from './garantia-faturamento.js?v=20261022-faturamento';
import {importarOriginal} from './garantia-dados.js?v=20261022-fontes';
// Classifica pela estrutura interna. O nome do arquivo não determina o indicador.
export function reconhecerFonte(wb){
 if(!wb?.SheetNames)return null;
 if(wb.SheetNames.some(n=>normalizar(n)==='VALIDACAOINDICADORES')&&wb.SheetNames.some(n=>normalizar(n)==='BONIFICACAODAEQUIPE'))return 'campanha';
 const liquidity=wb.SheetNames.some(n=>Object.entries(wb.Sheets[n]).some(([a,c])=>/^[A-Z]+[1-9]\d?$/.test(a)&&Number(a.match(/\d+/)[0])<=15&&normalizar(c?.v)==='CREDITOLIQUIDO'));
 if(temAbasMensais(wb)&&liquidity)return 'recebimento';
 if(temBaseFaturamento(wb))return 'faturamento';return null;
}
export function importarFonte(wb,month,participantes=[],atuais={}){
 const tipo=reconhecerFonte(wb);let lote;
 if(tipo==='recebimento')lote=importarRecebimento(wb,month,participantes);
 else if(tipo==='faturamento')lote=importarFaturamento(wb,month,participantes);
 else if(tipo==='campanha')lote=importarOriginal(wb,month);
 else throw Error('Formato ainda não reconhecido automaticamente. Use o cartão do indicador para mapear as colunas. Nenhum dado foi aplicado.');
 lote.identificacao={tipo,destino:tipo==='recebimento'?'Recebimento em reais':tipo==='faturamento'?'Contador de notas / O.S. abertas e fechadas':'Validação da campanha completa'};
 if(tipo==='recebimento'){
  lote.comparacao=Object.entries(lote.metricas).map(([escopo,v])=>{const base=atuais[escopo]?.valorFaturado;return {escopo,valorFaturado:base??null,valorRecebido:v.valorRecebido,percentual:typeof base==='number'&&base>0?v.valorRecebido/base*100:null};});
  const missing=lote.comparacao.filter(x=>x.valorFaturado===null).length;
  if(missing)lote.avisos.push(missing+' escopos sem faturamento-base em reais. O recebimento será preenchido; o percentual permanece pendente até informar essa base. Crédito bruto não substitui faturamento.');
 }
 return lote;
}
