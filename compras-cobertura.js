// Cobertura é um índice (não percentual). A meta usa a precisão original.
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
export const formatarCobertura=v=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('pt-BR',{maximumFractionDigits:8}):'Sem dados';
export function calcularCoberturaCasa(anterior,atual,parcela,politica={meta:4,pendente:false}){
 const valido=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 const temAtual=valido(atual),temAnterior=valido(anterior),atingiu=!politica.pendente&&temAtual&&atual<=politica.meta;
 return {atual:temAtual?atual:null,anterior:temAnterior?anterior:null,variacao:temAtual&&temAnterior?anterior-atual:null,atingiu,bonus:atingiu?parcela:0,status:politica.pendente?'REGRA PENDENTE PARA ANALISTAS':!temAtual?'SEM DADOS DO MÊS':atingiu?'ATINGIU · COBERTURA ≤ 4':'ACIMA DA META 4'};
}
const meses=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
function mes(v){if(v instanceof Date&&!Number.isNaN(+v))return v.toISOString().slice(0,7);const t=norm(v),m=t.match(/^(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[A-Z]*[ /-](\d{4})$/);if(m)return m[2]+'-'+String(meses.indexOf(m[1])+1).padStart(2,'0');return /^\d{4}-\d{2}$/.test(t)?t:null;}
function numero(v){if(v==null||String(v).trim()===''||typeof v==='boolean')return null;const n=typeof v==='number'?v:Number(String(v).includes(',')?String(v).trim().replace(/\./g,'').replace(',','.'):String(v).trim());return Number.isFinite(n)&&n>=0?n:null;}
const coluna=i=>{let t='';for(i++;i>0;i=Math.floor((i-1)/26))t=String.fromCharCode(65+(i-1)%26)+t;return t;};
export function ehPlanilhaCobertura(matriz){return matriz.slice(0,8).some(r=>r.some(v=>norm(v)==='EMPRESA')&&r.some(v=>norm(v)==='COBERTURA'))&&matriz.slice(0,8).some(r=>r.some(v=>mes(v)));}
export function lerCoberturaEstoque(matriz,competencia){
 const erros=[],avisos=[],registros=[];const h=matriz.findIndex(r=>r.some(v=>norm(v)==='EMPRESA')&&r.some(v=>norm(v)==='COBERTURA'));
 if(h<1)return {erros:['Cabeçalhos de mês, Empresa e Cobertura não encontrados.'],avisos,registros};
 const campos=matriz[h],empresa=campos.findIndex(v=>norm(v)==='EMPRESA'),nucleo=campos.findIndex(v=>norm(v)==='NUCLEO'),mapa=new Map();let cp=null;
 for(let c=0;c<campos.length;c++){for(let row=0;row<h;row++){const m=mes(matriz[row]?.[c]);if(m)cp=m;}if(norm(campos[c])==='COBERTURA'&&cp){if(mapa.has(cp))erros.push('Mais de uma coluna Cobertura para '+cp);mapa.set(cp,c);}}
 const data=new Date(competencia+'-01T12:00:00Z');if(Number.isNaN(+data))erros.push('Competência inválida.');else data.setUTCMonth(data.getUTCMonth()-1);const anterior=Number.isNaN(+data)?'':data.toISOString().slice(0,7);
 if(!mapa.has(competencia))erros.push('A planilha não possui Cobertura de '+competencia+'. Selecione um mês presente no arquivo.');
 if(erros.length)return {erros,avisos,registros};
 const atualCol=mapa.get(competencia),antCol=mapa.get(anterior);if(antCol==null)avisos.push('Mês anterior ausente no arquivo. A evolução ficará sem comparação; a bonificação depende da cobertura atual ≤ 4.');
 let grupo='';const vistos=new Map();
 for(let i=h+1;i<matriz.length;i++){
  const row=matriz[i];if(nucleo>=0&&row[nucleo])grupo=String(row[nucleo]);const nome=String(row[empresa]||'').trim();if(!nome||norm(nome)==='TOTAL'||/^FILTROS/.test(norm(nome)))continue;
  const atual=numero(row[atualCol]),ant=antCol==null?null:numero(row[antCol]);if(atual==null){avisos.push('Linha '+(i+1)+': cobertura atual ausente/inválida em '+nome+'.');continue;}
  const key=norm(nome);if(vistos.has(key)){erros.push('Empresa duplicada na linha '+(i+1)+': '+nome);continue;}vistos.set(key,true);
  registros.push({competencia,unidade:nome,nucleo:grupo,tipoImportacao:'cobertura',coberturaEstoque:atual,coberturaAnteriorFonte:ant,competenciaAnteriorFonte:anterior,linhaOrigem:i+1,colunaCobertura:coluna(atualCol),colunaCoberturaAnterior:antCol==null?'':coluna(antCol),origemCobertura:`Linha ${i+1} · ${competencia}: ${coluna(atualCol)} · ${anterior}: ${antCol==null?'ausente':coluna(antCol)}`});
 }
 if(!registros.length)erros.push('Nenhuma casa com cobertura válida para o mês selecionado.');return {erros,avisos,registros};
}
