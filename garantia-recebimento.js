import {filial,normalizar,numero,escopoPessoa} from './garantia-dados.js?v=20261022-fontes';
export const MESES=['JANEIRO','FEVEREIRO','MARCO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
export function competenciaValor(value){const s=String(value??'').trim();if(/^\d{4}-(0[1-9]|1[0-2])$/.test(s))return s;const n=normalizar(s),year=s.match(/\b(20\d{2})\b/)?.[1];const i=MESES.findIndex(m=>n.includes(m));if(i>=0&&year)return year+'-'+String(i+1).padStart(2,'0');const m=s.match(/^(0?[1-9]|1[0-2])\/(20\d{2})$/);return m?m[2]+'-'+m[1].padStart(2,'0'):null;}
function nomeMes(name){const n=normalizar(name);return MESES.findIndex(m=>n===m||new RegExp('^'+m+'20\\d{2}$').test(n));}
export function temAbasMensais(wb){return wb.SheetNames.some(s=>nomeMes(s)>=0);}
function anoData(cell,date1904){if(typeof cell.v==='string')return cell.v.match(/\b(20\d{2})\b/)?.[1]||null;if(typeof cell.v==='number'&&/[dy]/i.test((cell.z||'').replace(/"[^"]*"/g,'').replace(/\[[^\]]*\]/g,''))&&cell.v>20000&&cell.v<100000){const base=Date.UTC(date1904?1904:1899,date1904?0:11,date1904?1:30);return String(new Date(base+cell.v*86400000).getUTCFullYear());}return null;}
export function importarRecebimento(wb,competencia,participantes=[]){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia))throw Error('Selecione uma competência válida.');
 const [ano,mes]=competencia.split('-');const names=wb.SheetNames.filter(s=>nomeMes(s)===Number(mes)-1);const withYear=names.filter(s=>normalizar(s).endsWith(ano));const selected=withYear.length?withYear:names.filter(s=>!s.match(/20\d{2}/));if(selected.length!==1)throw Error('Não foi encontrada uma única aba de '+MESES[Number(mes)-1]+' compatível com '+competencia+'. Nenhum outro mês será importado.');
 const name=selected[0],ws=wb.Sheets[name],years=new Set();const date1904=!!wb.Workbook?.WBProps?.date1904;const titleYear=name.match(/20\d{2}/)?.[0];if(titleYear)years.add(titleYear);
 for(const [address,c] of Object.entries(ws)){if(address.startsWith('!')||!c)continue;const y=anoData(c,date1904);if(y)years.add(y);}
 // O arquivo completo pode ter abas históricas: nunca usa o ano de outra aba.
 const fileYears=[...new Set(String(wb.arquivoOrigem||'').match(/\b20\d{2}\b/g)||[])];
 if(fileYears.length>1)throw Error('O nome do arquivo informa mais de um ano. Confirme a competência antes de importar.');
 if(fileYears.length===1&&fileYears[0]!==ano)throw Error('O ano do arquivo não corresponde a '+ano+'. Nenhum dado foi importado.');
 const yearFromFile=!years.size&&fileYears.length===1;
 if(yearFromFile)years.add(fileYears[0]);
 if(!years.size)throw Error('A aba '+name+' não identifica o ano. Use o relatório com datas, cabeçalho de ano ou ano no nome do arquivo para validar '+competencia+'.');if(years.size!==1||!years.has(ano))throw Error('O ano identificado na aba '+name+' não corresponde a '+ano+'. Nenhum dado foi importado.');
 // Identifica o cabeçalho, em vez de depender da ordem das abas ou somar o bloco semanal.
 const heads=Object.entries(ws).filter(([a,c])=>!a.startsWith('!')&&/^[A-Z]+\d+$/.test(a)&&Number(a.match(/\d+/)[0])<=15&&normalizar(c.v)==='CREDITOLIQUIDO');if(heads.length!==1)throw Error('Cabeçalho CRÉDITO LÍQUIDO do resumo mensal não identificado.');
 const address=heads[0][0],col=address.match(/^[A-Z]+/)[0],header=Number(address.match(/\d+/)[0]);
 const headerColumn=title=>Object.entries(ws).find(([a,c])=>/^[A-Z]+\d+$/.test(a)&&Number(a.match(/\d+/)[0])===header&&normalizar(c?.v)===title)?.[0]?.match(/^[A-Z]+/)[0];
 const grossCol=headerColumn('CREDITOBRUTO'),debitCol=headerColumn('TOTALESTORNADO');
 const allowed=new Set(['ANANINDEUA','TERESINA','URUÇUI','SÃO LUIS','BACABAL','CUIABÁ','SINOP','RONDONOPOLIS','AGUA BOA','MACAPÁ','PORTO VELHO','JIPARANÁ','VILHENA']);
 const metricas={},avisos=['Competência filtrada: '+competencia+' · somente a aba '+name+'.','Importado exclusivamente o Crédito Líquido do resumo mensal (coluna '+col+'). Crédito bruto, estornos e bloco semanal não são somados.','O valor faturado e os demais indicadores existentes são preservados.'];let totalCell=null,foundTotal=false;
 if(yearFromFile)avisos.push('Ano validado pelo nome do arquivo: '+wb.arquivoOrigem+'. A aba '+name+' não possui ano interno.');
 for(let row=header+1;row<=header+100;row++){
  const label=String(ws['A'+row]?.v??'').trim();if(!label)continue;
  if(normalizar(label)==='TOTAL'){const c=ws[col+row];if(c?.t==='e')throw Error('Total mensal com erro em '+name+'!'+col+row);totalCell=numero(c?.v);foundTotal=true;break;}
  const match=label.match(/^DN\s*\d+\s*-\s*(?:DIESEL\s*)?(.+)$/i);if(!match)continue;const branch=filial(match[1]);if(!allowed.has(branch))throw Error('Filial não reconhecida em '+name+'!A'+row+': '+label);if(metricas[branch])throw Error('Filial duplicada no resumo mensal: '+branch);
  const cell=ws[col+row];if(cell?.t==='e')throw Error('Crédito Líquido com erro em '+name+'!'+col+row);const rawValue=numero(cell?.v),value=rawValue===null?null:Math.round((rawValue+Number.EPSILON)*100)/100;if(value===null)throw Error('Crédito Líquido ausente ou inválido em '+name+'!'+col+row+'. Zero deve estar explicitamente informado.');
  // Confere o líquido com bruto menos estornos, sem executar fórmulas arbitrárias.
  const gross=numero(ws[grossCol+row]?.v),debit=numero(ws[debitCol+row]?.v);
  if(grossCol&&debitCol&&gross!==null&&debit!==null&&Math.abs(gross-debit-value)>.02)throw Error('Crédito Líquido diverge de Crédito Bruto menos Estornos em '+name+'!'+col+row+'. Recalcule e salve o Excel antes de importar.');
  const source=name+'!'+col+row;
  metricas[branch]={valorRecebido:value,origem:'Recebimento '+competencia+' · '+source,fontesCampos:{valorRecebido:source}};
 }
 if(!foundTotal||!Object.keys(metricas).length)throw Error('Resumo mensal sem filiais e linha TOTAL reconhecíveis.');const sum=Math.round(Object.values(metricas).reduce((n,x)=>n+x.valorRecebido,0)*100)/100;if(totalCell===null||Math.abs(sum-totalCell)>.02)throw Error('O total de Crédito Líquido não confere com a soma das filiais. Revise a planilha antes de aplicar.');
 // Um total incompleto não pode substituir o consolidado de toda a rede.
 if(Object.keys(metricas).length===allowed.size)metricas.GERAL={valorRecebido:sum,origem:'Soma de Crédito Líquido · '+name+' · '+competencia,fontesCampos:{valorRecebido:name+'!'+col+(header+1)+':'+col+(header+allowed.size)+' (soma conferida com TOTAL)'}};else avisos.push('Resumo parcial: '+Object.keys(metricas).length+' de '+allowed.size+' filiais. O GERAL não será substituído e ficará pendente de revisão.');
 for(const p of participantes.filter(p=>p.perfil==='analista')){const units=[...new Set(p.unidades||[])];if(units.length&&units.every(u=>metricas[u]))metricas[escopoPessoa(p)]={valorRecebido:Math.round(units.reduce((n,u)=>n+metricas[u].valorRecebido,0)*100)/100,origem:'Crédito Líquido das unidades vinculadas · '+name+' · '+competencia,fontesCampos:{valorRecebido:units.map(u=>metricas[u].fontesCampos.valorRecebido).join(' + ')}};}
 if(Object.values(metricas).every(v=>v.valorRecebido===0))avisos.push('ATENÇÃO: a aba '+name+' contém somente valores zerados de Crédito Líquido. Confira antes de confirmar; nenhum valor de outro mês será utilizado.');
 avisos.push('Total de recebimento das filiais selecionadas: R$ '+sum.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'.');
 return {competencia,metricas,participantes:[],avisos};
}
