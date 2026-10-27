import {tipoAuxiliar} from './garantia-arquivos.js?v=20261023-lote';
import {prepararCampanha,importarArquivoAuditavel,importarInsercaoCampanha,eCampanha} from './garantia-lote.js?v=20261027-diesel';
import {temMalote,importarMalote} from './garantia-malote.js?v=20261023-malote-conformidade';
import {temInsercao,importarInsercao} from './garantia-insercao.js?v=20261023-insercao';
import {temFaturadoMonetario,importarFaturadoMonetario} from './garantia-faturado-importacao.js?v=20261023-importacao';
import {normalizar} from './garantia-dados.js?v=20261022-fontes';
import {temAbasMensais,importarRecebimento} from './garantia-recebimento.js?v=20261027-diesel';
import {temBaseFaturamento,importarFaturamento} from './garantia-faturamento.js?v=20261022-faturamento';
import {importarOriginal} from './garantia-dados.js?v=20261022-fontes';
// Classifica pela estrutura interna. O nome do arquivo não determina o indicador.
export function reconhecerFonte(wb){
 if(!wb?.SheetNames)return null;
 const auxiliar=tipoAuxiliar(wb);if(auxiliar)return auxiliar;
 if(temFaturadoMonetario(wb))return 'faturado';
 if(temMalote(wb))return 'malote';
 if(temInsercao(wb))return 'insercao';
 if(wb.SheetNames.some(n=>normalizar(n)==='VALIDACAOINDICADORES')&&wb.SheetNames.some(n=>normalizar(n)==='BONIFICACAODAEQUIPE'))return 'campanha';
 const liquidity=wb.SheetNames.some(n=>Object.entries(wb.Sheets[n]).some(([a,c])=>/^[A-Z]+[1-9]\d?$/.test(a)&&Number(a.match(/\d+/)[0])<=15&&normalizar(c?.v)==='CREDITOLIQUIDO'));
 if(temAbasMensais(wb)&&liquidity)return 'recebimento';
 if(temBaseFaturamento(wb))return 'faturamento';return null;
}
export function importarFonte(wb,month,participantes=[],atuais={},vinculos={},preferido=null){
 if(preferido==='insercao'&&temMalote(wb))throw Error('Este arquivo é o controle de Malote. A matriz C/NC dele não substitui Inserção. Envie a campanha validada ou a fonte de Não inseridas.');
 if(preferido==='insercao'&&eCampanha(wb))return importarInsercaoCampanha(wb,month);
 const auditavel=importarArquivoAuditavel(wb,month,participantes,preferido);if(auditavel){auditavel.identificacao={tipo:reconhecerFonte(wb),destino:preferido||reconhecerFonte(wb)};return auditavel;}
 const tipo=preferido==='malote'&&temMalote(wb)?'malote':reconhecerFonte(wb);let lote;
 if(tipo==='malote')lote=importarMalote(wb,month,participantes,vinculos);
 else if(tipo==='insercao')lote=importarInsercao(wb,month,participantes,vinculos);
 else if(tipo==='faturado')lote=importarFaturadoMonetario(wb,month,participantes);
 else if(tipo==='recebimento')lote=importarRecebimento(wb,month,participantes);
 else if(tipo==='faturamento')lote=importarFaturamento(wb,month,participantes);
 else if(tipo==='campanha')lote=prepararCampanha(wb,month);
 else throw Error('Formato ainda não reconhecido automaticamente. Use o cartão do indicador para mapear as colunas. Nenhum dado foi aplicado.');
 lote.identificacao={tipo,destino:tipo==='malote'?'Malote — % conformidades':tipo==='insercao'?'Inserção %':tipo==='faturado'?'Faturado R$ — base do recebimento':tipo==='recebimento'?'Recebimento em reais':tipo==='faturamento'?'Contador de notas / O.S. abertas e fechadas':'Validação da campanha completa'};
 if(tipo==='recebimento'){
  lote.comparacao=Object.entries(lote.metricas).map(([escopo,v])=>{const base=atuais[escopo]?.valorFaturado;return {escopo,valorFaturado:base??null,valorRecebido:v.valorRecebido,percentual:typeof base==='number'&&base>0?v.valorRecebido/base*100:null};});
  const missing=lote.comparacao.filter(x=>x.valorFaturado===null).length;
  if(missing)lote.avisos.push(missing+' escopos sem faturamento-base em reais. O recebimento será preenchido; o percentual permanece pendente até informar essa base. Crédito bruto não substitui faturamento.');
 }
 return lote;
}
