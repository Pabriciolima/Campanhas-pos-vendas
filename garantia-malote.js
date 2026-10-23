import {normalizar,escopoPessoa} from './garantia-dados.js?v=20261022-fontes';
import {DNS} from './garantia-insercao.js?v=20261023-malote-conformidade';
// Compara dias civis, sem depender do cache das fórmulas Excel.
function dia(cell,date1904){const v=cell?.v;if(cell?.t==='e')return null;if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);if(typeof v==='number'&&v>=20000&&v<100000)return new Date(Date.UTC(date1904?1904:1899,date1904?0:11,date1904?1:30)+Math.floor(v)*86400000).toISOString().slice(0,10);const m=String(v??'').trim().match(/^(\d{2})\/(\d{2})\/(20\d{2})$/);if(m){const key=m[3]+'-'+m[2]+'-'+m[1],d=new Date(key+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===key?key:null;}return null;}
function tabelas(wb){const found=[];for(const name of wb?.SheetNames||[]){const ws=wb.Sheets[name],rows=new Map();for(const [addr,cell] of Object.entries(ws)){const m=addr.match(/^([A-Z]+)(\d+)$/);if(!m||+m[2]>15)continue;const row=+m[2];if(!rows.has(row))rows.set(row,{});rows.get(row)[normalizar(cell?.v)]=m[1];}for(const [row,cols] of rows)if(cols.DN&&cols.DATALANCAM&&cols.PRAZOMONACO&&cols.DATACOLETA)found.push({name,ws,row,cols});}return found;}
export function temMalote(wb){return tabelas(wb).length>0;}
export function analisarMalote(wb,competencia){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia))throw Error('Selecione uma competência válida.');
 const tabs=tabelas(wb);if(tabs.length!==1)throw Error('Não foi identificada uma única tabela de controle de malote.');const {name,ws,row,cols}=tabs[0],date1904=!!wb.Workbook?.WBProps?.date1904,records=[],byDN=new Map(),seen=new Set();
 const max=Object.keys(ws).reduce((n,a)=>Math.max(n,Number(a.match(/\d+$/)?.[0])||0),row);if(max>50000)throw Error('Limite de 50 mil linhas.');
 for(let r=row+1;r<=max;r++){const dn=String(ws[cols.DN+r]?.v??'').trim();// Uma nova tabela (ex.: DATA DO E-MAIL) encerra o controle atual.
 if(normalizar(dn)==='DN')break;if(!dn||normalizar(dn)==='TOTAL')continue;const launch=dia(ws[cols.DATALANCAM+r],date1904);if(!launch)throw Error('Data de lançamento inválida em '+name+'!'+cols.DATALANCAM+r+'.');if(launch.slice(0,7)!==competencia)continue;if(!Object.hasOwn(DNS,dn))throw Error('DN não reconhecido: '+dn);
 const number=ws['C'+r]?.v;if(number!==undefined&&String(number).trim()){const id=dn+'|'+launch+'|'+number;if(seen.has(id))throw Error('Lançamento duplicado na linha '+r+'.');seen.add(id);}
 if(!byDN.has(dn)){const record={dn,c:0,nc:0,pendentes:0,linhasPendentes:[],opcoes:DNS[dn],origem:name+' · DN '+dn+' · '+competencia+' · coleta comparada ao prazo Mônaco'};byDN.set(dn,record);records.push(record);}
 const rec=byDN.get(dn),prazo=dia(ws[cols.PRAZOMONACO+r],date1904),coleta=dia(ws[cols.DATACOLETA+r],date1904);
 if(!prazo||!coleta||coleta<launch){rec.pendentes++;rec.linhasPendentes.push(r);}else if(coleta>prazo)rec.nc++;else rec.c++;
 }
 if(!records.length)throw Error('Nenhum lançamento de malote na competência '+competencia+'.');
 for(const rec of records){rec.percentual=rec.pendentes?null:rec.c/(rec.c+rec.nc)*100;rec.origem+=' · '+rec.c+' conformes / '+(rec.c+rec.nc)+' avaliados · '+rec.pendentes+' pendentes';}
 return {name,records,compartilhados:records.filter(r=>r.opcoes.length>1)};
}
export function importarMalote(wb,competencia,participantes=[],vinculos={}){
 const analysis=analisarMalote(wb,competencia),metricas={},origens=new Map(),avisos=['Malote: coleta após o prazo Mônaco é NÃO CONFORME. No prazo é CONFORME. Registros sem datas válidas ficam pendentes e impedem o percentual do escopo até correção.','Somente lançamentos de '+competencia+' foram considerados. A quantidade de processos continua vinculada às notas fechadas.'];
 const fields=records=>{const c=records.reduce((s,r)=>s+r.c,0),nc=records.reduce((s,r)=>s+r.nc,0),pendentes=records.reduce((s,r)=>s+r.pendentes,0),source=records.map(r=>r.origem).join(' + ');return {malote:pendentes?null:c/(c+nc)*100,origem:source,fontesCampos:{malote:source}};};
 for(const record of analysis.records){const units=record.opcoes.length===1?record.opcoes:vinculos[record.dn];if(!Array.isArray(units)||!units.length||units.some(u=>!record.opcoes.includes(u))||new Set(units).size!==units.length)throw Error('Confirme o destino do DN compartilhado '+record.dn+'.');for(const unit of units){metricas[unit]=fields([record]);origens.set(unit,record);}if(record.opcoes.length>1)avisos.push('Vínculo confirmado: DN '+record.dn+' → '+units.join(' + ')+'.');}
 // O total da fonte considera cada amostra de DN uma vez, mesmo quando compartilhada por filiais.
 for(const r of analysis.records)if(r.pendentes)avisos.push('DN '+r.dn+': '+r.pendentes+' registro(s) pendente(s). Corrija prazo/coleta nas linhas '+r.linhasPendentes.join(', ')+'. Percentual não finalizado.');
 const covered=new Set(origens.keys());const pending=[...new Set(Object.values(DNS).flat())].filter(u=>!covered.has(u));if(pending.length)avisos.push('Sem vínculo nesta importação: '+pending.join(', ')+'. Dados anteriores dessas filiais são preservados; nenhum resultado foi presumido.');
 if(analysis.records.length===Object.keys(DNS).length)metricas.GERAL=fields(analysis.records);else avisos.push('Fonte parcial: consolidado GERAL exige revisão.');
 for(const p of participantes.filter(p=>p.perfil==='analista')){const units=[...new Set(p.unidades||[])];if(units.length&&units.every(u=>origens.has(u)))metricas[escopoPessoa(p)]=fields([...new Set(units.map(u=>origens.get(u)))]);}
 return {competencia,metricas,participantes:[],avisos};
}
