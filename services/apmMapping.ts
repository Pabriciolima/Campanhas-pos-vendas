import {registroFinanceiro,centavos} from '../diretoria/core.mjs';
export interface ApmResumoRow {
 competencia:string;apm:string;apm_nome:string;filial_id:string;filial_nome:string;
 uf:string;contratos:number;valor_apm:number|string;data_inicio:string;atualizado_em:string;
}
export interface ApmBiRecord {
 campanha:'apms';id:string;chave:string;competencia:string;ciclo:string;apurado:number;pago:number;
 confirmado:boolean;inicio:string;atualizado:string;origem:string;
 apmResumo:{apm:string;nome:string;filialId:string;filial:string;uf:string;contratos:number};
}
export function mapApmCampanhaToBi(row:ApmResumoRow):ApmBiRecord {
 const competencia=String(row.competencia||'').slice(0,7);
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)||!row.apm?.trim()||!row.apm_nome?.trim()||!row.filial_id||!Number.isInteger(row.contratos)||row.contratos<0)throw Error('Resumo APMs incompatível.');
 if(!['number','string'].includes(typeof row.valor_apm)||!/^\d+(\.\d+)?$/.test(String(row.valor_apm)))throw Error('Valor APMs inválido.');
 const valor=centavos(row.valor_apm);if(valor===null||!Number.isSafeInteger(valor))throw Error('Valor APMs inválido.');
 const id=competencia+'|'+row.apm+'|'+row.filial_id;
 const base=registroFinanceiro('apms',{id,competencia,criadoEm:row.data_inicio,atualizadoEm:row.atualizado_em,origem:'Sistema APMs · somente ganho APM'},valor/100);
 if(!base)throw Error('Resumo APMs inválido.');
 return {...base,campanha:'apms',apmResumo:{apm:row.apm,nome:row.apm_nome,filialId:row.filial_id,filial:row.filial_nome||'Filial não identificada',uf:row.uf||'',contratos:row.contratos}};
}
export function resumirApms(registros:ApmBiRecord[],{ano='',mes='',filial='',apm='',base='apurado'}={}){
 const unicos=new Map<string,ApmBiRecord>();for(const r of registros){if(!r.apmResumo)continue;const v=unicos.get(r.chave);if(!v||r.atualizado>v.atualizado)unicos.set(r.chave,r);}
 const periodo=[...unicos.values()].filter(r=>(!ano||r.competencia.startsWith(ano+'-'))&&(!mes||r.competencia.slice(5)===mes));
 const dados=periodo.filter(r=>(!filial||r.apmResumo.filialId===filial)&&(!apm||r.apmResumo.apm===apm));
 const valor=(r:ApmBiRecord)=>base==='pago'?r.pago:r.apurado;
 const total=dados.reduce((s,r)=>s+valor(r),0),pessoas=new Set(dados.filter(r=>valor(r)>0).map(r=>r.apmResumo.apm)).size;
 const meses=[...new Set(dados.map(r=>r.competencia))].sort();
 const evolucao=meses.map(competencia=>{const rs=dados.filter(r=>r.competencia===competencia),valorCentavos=rs.reduce((s,r)=>s+valor(r),0);const pessoas=new Set(rs.filter(r=>valor(r)>0).map(r=>r.apmResumo.apm)).size;return {competencia,valorCentavos,pessoas,media:pessoas?Math.round(valorCentavos/pessoas):0};});
 const filiais=[...new Set(periodo.map(r=>r.apmResumo.filialId))].map(id=>{const rs=periodo.filter(r=>r.apmResumo.filialId===id);return {id,nome:rs[0].apmResumo.filial,valorCentavos:rs.reduce((s,r)=>s+valor(r),0)};});
 const apms=[...new Set(periodo.filter(r=>!filial||r.apmResumo.filialId===filial).map(r=>r.apmResumo.apm))].map(id=>{const rs=periodo.filter(r=>r.apmResumo.apm===id&&(!filial||r.apmResumo.filialId===filial)),total=rs.reduce((s,r)=>s+valor(r),0),meses=new Set(rs.map(r=>r.competencia)).size;return {id,nome:rs[0].apmResumo.nome,total,meses,filiais:new Set(rs.map(r=>r.apmResumo.filialId)).size,media:meses?Math.round(total/meses):0};}).sort((a,b)=>b.total-a.total);
 return {total,pessoas,media:pessoas?Math.round(total/pessoas):0,evolucao,filiais,apms,registros:dados};
}
export function demonstracaoApms():ApmBiRecord[]{
 const nomes=['Caroliny','Renan','Luana','Daniela'],rows:ApmBiRecord[]=[];
 for(let m=6;m<=11;m++)for(let i=0;i<4;i++)rows.push(mapApmCampanhaToBi({competencia:`2026-${String(m).padStart(2,'0')}-01`,apm:nomes[i].toUpperCase(),apm_nome:nomes[i],filial_id:['4700','4738','4731','4730'][i],filial_nome:['Ananindeua','Cuiabá','São Luís','Teresina'][i],uf:['PA','MT','MA','PI'][i],contratos:m+i,valor_apm:(m+i)*200,data_inicio:'2026-06-01',atualizado_em:'2026-11-27T12:00:00Z'}));return rows;
}
