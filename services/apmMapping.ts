import {registroFinanceiro,centavos} from '../diretoria/core.mjs';
export interface ApmCampanhaRow {
 id:string; competence:string; contract:string; closed_on:string;
 consultant:string; branch_id?:string|null; state?:string|null;
 seller?:string|null; manager:string; apm_amount:number|string;
 seller_amount:number|string; manager_amount:number|string;
 model?:string|null; chassis_quantity?:number|null; modality?:string|null;
 policy_version?:string; created_at?:string; updated_at?:string;
 deleted_at?:string|null; status?:string; statusPagamento?:string;
 pago?:boolean; pagamentoConfirmado?:boolean; valorPago?:number|string;
}
export interface ApmBranch {id:string;name:string;state?:string}
export interface ApmBeneficiario {nome:string;papel:'APM'|'Vendedor'|'Gerente';valorCentavos:number}
export interface ApmBiRecord {
 campanha:'apms';id:string;chave:string;competencia:string;ciclo:string;
 apurado:number;pago:number;confirmado:boolean;inicio:string;atualizado:string;origem:string;
 apm:{contrato:string;fechamento:string;filial:string;filialId:string;uf:string;
  modelo:string;chassis:number;modalidade:string;politica:string;beneficiarios:ApmBeneficiario[]};
}
const norm=(s:unknown)=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
const nomes:Record<string,string>={RENAN:'Renan',DANIELA:'Daniela',LUANA:'Luana',CAROLINY:'Caroliny'};
function dinheiro(v:unknown):number {if(!['number','string'].includes(typeof v)||String(v).trim()===''||!/^\d+(\.\d+)?$/.test(String(v)))throw Error('Valor APMs ausente ou inválido.');const c=centavos(v);if(c===null||!Number.isSafeInteger(c))throw Error('Valor APMs inválido.');return c;}
export function mapApmCampanhaToBi(row:ApmCampanhaRow,branches:ApmBranch[]=[]):ApmBiRecord|null {
 if(row.deleted_at||['CANCELADO','CANCELADA','EXCLUIDO','EXCLUIDA'].includes(norm(row.status)))return null;
 const competencia=String(row.competence||'').slice(0,7),contrato=norm(row.contract);
 if(!row.id||!contrato||!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)||!/^\d{4}-\d{2}-\d{2}$/.test(row.closed_on)||row.closed_on.slice(0,7)!==competencia)throw Error('Contrato APMs com identificação ou competência inválida.');
 const valores=[dinheiro(row.apm_amount),dinheiro(row.seller_amount),dinheiro(row.manager_amount)];
 if((valores[0]>0&&!row.consultant?.trim())||(valores[1]>0&&!row.seller?.trim())||(valores[2]>0&&!row.manager?.trim()))throw Error('Beneficiário APMs não identificado.');
 const pessoas=[nomes[row.consultant]||row.consultant,row.seller||'',row.manager];
 const papeis=['APM','Vendedor','Gerente'] as const;
 const beneficiarios=papeis.map((papel,i)=>({nome:pessoas[i].trim(),papel,valorCentavos:valores[i]})).filter(b=>b.valorCentavos>0);
 // Valores gerados pela base, por contrato: chassis não multiplicam os bônus.
 const total=valores.reduce((a,b)=>a+b,0);const base=registroFinanceiro('apms',{...row,id:contrato,competencia,origem:'Sistema APMs'},total/100);
 if(!base)throw Error('Contrato APMs não pôde ser consolidado.');
 const filial=branches.find(b=>b.id===row.branch_id);
 return {...base,campanha:'apms',id:row.id,apm:{contrato,fechamento:row.closed_on,filial:filial?.name||'Filial não identificada',filialId:row.branch_id||'sem-filial',uf:filial?.state||row.state||'',modelo:row.model||'Modelo não informado',chassis:row.chassis_quantity||1,modalidade:row.modality||'Não informada',politica:row.policy_version||'Não informada',beneficiarios}};
}
export function resumirApms(registros:ApmBiRecord[],{ano='',mes='',filial='',base='apurado'}={}) {
 const map=new Map<string,ApmBiRecord>();for(const r of registros){if(r.campanha!=='apms'||!r.apm)continue;const old=map.get(r.chave);if(!old||r.atualizado>old.atualizado)map.set(r.chave,r);}
 const todos=[...map.values()],porPeriodo=todos.filter(r=>(!ano||r.competencia.startsWith(ano+'-'))&&(!mes||r.competencia.slice(5)===mes));
 const filtrados=porPeriodo.filter(r=>!filial||r.apm.filialId===filial).sort((a,b)=>b.apm.fechamento.localeCompare(a.apm.fechamento)||a.apm.contrato.localeCompare(b.apm.contrato)),pessoas=new Set<string>();
 const soma=(rs:ApmBiRecord[],field:'apurado'|'pago')=>rs.reduce((n,r)=>n+r[field],0);
 const valor=(r:ApmBiRecord)=>base==='pago'?r.pago:r.apurado;
 for(const r of filtrados)if(valor(r)>0)for(const b of r.apm.beneficiarios)pessoas.add(norm(b.nome));
 const meses=[...new Set(filtrados.map(r=>r.competencia))].sort();
 const evolucao=meses.map(competencia=>{const rs=filtrados.filter(r=>r.competencia===competencia);const pessoasMes=new Set(rs.filter(r=>r.apurado>0).flatMap(r=>r.apm.beneficiarios.map(b=>norm(b.nome))));return {competencia,apurado:soma(rs,'apurado'),pago:soma(rs,'pago'),valorCentavos:rs.reduce((s,r)=>s+valor(r),0),contratos:rs.length,pessoas:pessoasMes.size,ticketMedio:pessoasMes.size?Math.round(soma(rs,'apurado')/pessoasMes.size):0};});
 const ids=[...new Set(porPeriodo.map(r=>r.apm.filialId))];
 const filiais=ids.map(id=>{const rs=porPeriodo.filter(r=>r.apm.filialId===id);return {id,nome:rs[0].apm.filial,contratos:rs.length,valorCentavos:rs.reduce((s,r)=>s+valor(r),0)};}).sort((a,b)=>b.valorCentavos-a.valorCentavos);
 const papeis=['APM','Vendedor','Gerente'].map(papel=>({papel,valorCentavos:filtrados.filter(r=>valor(r)>0).reduce((s,r)=>s+r.apm.beneficiarios.filter(b=>b.papel===papel).reduce((a,b)=>a+b.valorCentavos,0),0)}));
 const total=filtrados.reduce((s,r)=>s+valor(r),0);
 return {registros:filtrados,evolucao,filiais,papeis,total,contratos:filtrados.length,pessoas:pessoas.size,habilitados:filtrados.filter(r=>valor(r)>0).length,ticketMedio:pessoas.size?Math.round(total/pessoas.size):0,confirmados:filtrados.filter(r=>r.confirmado).length};
}
export function demonstracaoApms():ApmBiRecord[] {
 const branches=[{id:'demo-pa',name:'Ananindeua',state:'PA'},{id:'demo-ma',name:'São Luís',state:'MA'},{id:'demo-mt',name:'Cuiabá',state:'MT'}];
 const rows:ApmBiRecord[]=[];for(let m=6;m<=11;m++)for(let i=0;i<6+m%3;i++){const b=branches[i%3];rows.push(mapApmCampanhaToBi({id:`demo-apm-${m}-${i}`,competence:`2026-${String(m).padStart(2,'0')}-01`,closed_on:`2026-${String(m).padStart(2,'0')}-15`,contract:`DEMO-${m}-${i}`,consultant:['CAROLINY','LUANA','RENAN'][i%3],manager:['Gerente A','Gerente B','Gerente C'][i%3],seller:i%2?'Vendedor '+i:null,branch_id:b.id,apm_amount:200,seller_amount:i%2?200:0,manager_amount:90,model:'VW 19.180',chassis_quantity:1,modality:'VOLKS TOTAL PREV',policy_version:'DEMONSTRAÇÃO'},branches)!);}return rows;
}
