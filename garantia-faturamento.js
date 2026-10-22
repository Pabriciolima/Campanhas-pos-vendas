import {filial,normalizar,escopoPessoa} from './garantia-dados.js?v=20261022-recebimento';
const FILIAIS=['ANANINDEUA','TERESINA','URUÇUI','SÃO LUIS','BACABAL','CUIABÁ','SINOP','RONDONOPOLIS','AGUA BOA','MACAPÁ','PORTO VELHO','JIPARANÁ','VILHENA'];
const meses=['JANEIRO','FEVEREIRO','MARCO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
export const temBaseFaturamento=wb=>['ABERTAS','FECHADAS'].every(n=>wb.SheetNames.some(s=>normalizar(s)===n));
// Datas sem fuso: a competência é a data civil registrada no Excel.
function mesData(cell,date1904){
 if(!cell||cell.t==='e')return null;const v=cell.v;
 if(typeof v==='number'&&v>0&&v<100000){const d=new Date(Date.UTC(date1904?1904:1899,date1904?0:11,date1904?1:30)+Math.floor(v)*86400000);return d.toISOString().slice(0,7);}
 if(typeof v!=='string')return null;
 const s=v.trim(),a=s.match(/^(20\d{2})-(\d{2})-(\d{2})(?:[T ].*)?$/),b=s.match(/^(\d{1,2})\/(\d{1,2})\/(20\d{2})(?: .*)?$/);
 if(!a&&!b)return null;const y=Number(a?a[1]:b[3]),m=Number(a?a[2]:b[2]),day=Number(a?a[3]:b[1]),d=new Date(Date.UTC(y,m-1,day));return d.getUTCFullYear()===y&&d.getUTCMonth()===m-1&&d.getUTCDate()===day?d.toISOString().slice(0,7):null;
}
export function importarFaturamento(wb,competencia,participantes=[]){
 if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(competencia))throw Error('Selecione uma competência válida.');
 if(!temBaseFaturamento(wb))throw Error('O relatório deve conter as abas ABERTAS e FECHADAS.');
 const metricas={},avisos=['Competência: '+competencia+'. ABERTAS por Emissão; FECHADAS por Fatura.','Contagem de células Emp. preenchidas em registros de O.S. Valores das células, valores monetários, filtros visuais e resumo de fórmulas não são somados.'],totais={};
 for(const tipo of ['ABERTAS','FECHADAS']){
  const names=wb.SheetNames.filter(n=>normalizar(n)===tipo);if(names.length!==1)throw Error('Aba ambígua: '+tipo);const name=names[0],ws=wb.Sheets[name];
  const headers=Object.entries(ws).filter(([a,c])=>/^[A-Z]+1$/.test(a)).map(([a,c])=>[normalizar(c.v),a.replace(/1$/,'')]);
  const find=n=>{const matches=headers.filter(([h])=>h===normalizar(n));if(matches.length!==1)throw Error(name+': cabeçalho ausente ou repetido: '+n);return matches[0][1];};
  const empresa=find('EMPRESA'),emp=find('Emp.'),os=find('Nro. OS'),date=find(tipo==='ABERTAS'?'Emissão':'Fatura'),status=tipo==='FECHADAS'?find('Situação O.S.'):null;
  const last=Number(ws['!ref']?.match(/\d+$/)?.[0]||0);if(last>50001)throw Error('Limite de 50 mil registros por aba.');const key=tipo==='ABERTAS'?'osAbertas':'osFechadas';let count=0,ignored=0;const seen=new Set();
  for(let row=2;row<=last;row++){
   const cell=ws[os+row],id=cell?.v;if(id===null||id===undefined||String(id).trim()==='')continue;
   if(cell.t==='e')throw Error(name+'!'+os+row+': número da O.S. com erro.');
   const cp=mesData(ws[date+row],!!wb.Workbook?.WBProps?.date1904);if(!cp)throw Error(name+'!'+date+row+': data inválida ou ausente; não é possível conferir a competência.');if(cp!==competencia){ignored++;continue;}
   const ec=ws[emp+row];if(!ec||ec.t==='e'||ec.v===null||ec.v===undefined||String(ec.v).trim()==='')throw Error(name+'!'+emp+row+': célula Emp. ausente ou com erro.');
   const branch=filial(ws[empresa+row]?.v);if(!FILIAIS.includes(branch))throw Error(name+'!'+empresa+row+': filial desconhecida.');
   if(status&&normalizar(ws[status+row]?.v)!=='FATURADA')throw Error(name+'!'+status+row+': fechamento sem situação Faturada.');
   const unique=branch+'|'+String(ec.v).trim()+'|'+String(id).trim();if(seen.has(unique))throw Error(name+': O.S. duplicada na filial '+branch+' (linha '+row+'). Revise antes de importar.');seen.add(unique);
   metricas[branch]??={osAbertas:0,osFechadas:0,origem:'Contagem ABERTAS/FECHADAS · '+competencia};metricas[branch][key]++;count++;
  }
  totais[key]=count;avisos.push(name+': '+count+' registros no mês; '+ignored+' de outras competências ignorados.');
 }
 if(!totais.osAbertas||!totais.osFechadas)throw Error('Sem registros de ABERTAS e FECHADAS para '+competencia+'. Nenhuma outra competência será utilizada.');
 if(Object.keys(metricas).length===FILIAIS.length)metricas.GERAL={...totais,origem:'Contagem das 13 filiais · '+competencia};else avisos.push('Base parcial: GERAL não substituído; revise consolidados pendentes.');
 for(const p of participantes.filter(p=>p.perfil==='analista')){const units=[...new Set(p.unidades||[])];if(units.length&&units.every(u=>metricas[u]))metricas[escopoPessoa(p)]={osAbertas:units.reduce((n,u)=>n+metricas[u].osAbertas,0),osFechadas:units.reduce((n,u)=>n+metricas[u].osFechadas,0),origem:'Contagem das unidades vinculadas · '+competencia};}
 // O resumo é apenas conferência: não substitui datas e contagem das bases.
 for(const name of wb.SheetNames.filter(n=>normalizar(n)==='TABELAFATURAMENTO'))for(const [a,c] of Object.entries(wb.Sheets[name])){if(a.startsWith('!')||typeof c?.v!=='string')continue;const n=normalizar(c.v),i=meses.findIndex(m=>n.startsWith(m)),y=c.v.match(/20\d{2}/)?.[0];if(i>=0&&y&&y+'-'+String(i+1).padStart(2,'0')!==competencia)avisos.push('Atenção: '+name+'!'+a+' indica '+c.v+', mas o lote usa exclusivamente as datas dos registros de '+competencia+'.');}
 avisos.push('Faturamento: '+totais.osFechadas+' ÷ '+totais.osAbertas+' = '+(totais.osFechadas/totais.osAbertas*100).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%. Recebimento, valores monetários e demais indicadores preservados.');
 return {competencia,metricas,participantes:[],avisos};
}
