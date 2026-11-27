export const CAMPANHAS=Object.freeze([
 {id:'pix',nome:'Pix do Presidente',cor:'#39dcb3'},
 {id:'oficina',nome:'Campanha da Oficina',cor:'#66a9ff'},
 {id:'garantia',nome:'Campanhas de Garantia',cor:'#e8b768'},
 {id:'crm',nome:'Bonificações CRM',cor:'#a89cff'},
 {id:'compras',nome:'Campanha de Compras',cor:'#f58aa9'}
]);
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
export function perfilDiretoria(perfil,agora=Date.now()){
 return !!(perfil&&typeof perfil.filial==='string'&&Number.isFinite(perfil.expiresAt)&&perfil.expiresAt>agora&&perfil.expiresAt<=agora+8*3600000&&/^ABEL(?:\s|$)/.test(norm(perfil.nome)));
}
export function centavos(v){if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)&&n>=0?Math.round((n+Number.EPSILON)*100):null;}
export function registroFinanceiro(campanha,d,valor,index=0){
 if(d.replicaNucleo||d.excluido===true||d.excluida===true||d.deleted_at||d.lixeiraEm)return null;
 const competencia=String(d.competencia||'').slice(0,7);if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia))return null;
 const apurado=centavos(valor);if(apurado===null)return null;
 const confirmado=d.pago===true||d.pagamentoConfirmado===true||['PAGO','PAGA','PAGAMENTO CONFIRMADO'].includes(norm(d.statusPagamento||d.pagamento?.status));
 const valorPago=d.valorPago??d.pagamento?.valor??valor;
 const pago=confirmado?centavos(valorPago):0;if(pago===null)throw Error('Valor de pagamento inválido.');
 const nucleo=Array.isArray(d.nucleoFiliais)&&d.nucleoFiliais.length?norm(d.nome)+'|'+d.nucleoFiliais.map(norm).sort().join('+'):null;
 const chave=nucleo||String(d.funcionarioId||d.participanteId||d.responsavelId||d.id||index);
 return {campanha,id:String(d.id||chave),chave:`${campanha}|${competencia}|${d.semana||''}|${chave}`,competencia,ciclo:competencia+(campanha==='pix'?'|S'+String(d.semana||'sem-semana'):''),apurado,pago,confirmado,inicio:d.criadoEm||d.created_at||competencia+'-01',atualizado:d.atualizadoEm||d.updated_at||'',origem:d.origem||'Base oficial'};
}
export function consolidarInvestimento(registros,fontes,{ano='',mes='',base='pago'}={}){
 const unicos=new Map();for(const r of registros){if(!r)continue;const velho=unicos.get(r.chave);if(!velho||String(r.atualizado)>String(velho.atualizado))unicos.set(r.chave,r);}
 const todos=[...unicos.values()],filtrados=todos.filter(r=>(!ano||r.competencia.startsWith(ano+'-'))&&(!mes||r.competencia.slice(5)===mes));
 const linhas=CAMPANHAS.map(c=>{
  const historico=todos.filter(r=>r.campanha===c.id),dados=filtrados.filter(r=>r.campanha===c.id),fonte=fontes.find(f=>f.id===c.id);
  const selecionados=base==='pago'?dados.filter(r=>r.confirmado):dados;
  return {...c,disponivel:fonte?.status==='ok',status:fonte?.status||'indisponivel',nota:fonte?.nota||'',inicio:historico.map(r=>r.inicio).sort()[0]||null,ciclos:new Set(dados.map(r=>r.ciclo)).size,registros:dados.length,valorCentavos:selecionados.reduce((s,r)=>s+r[base],0)};
 });
 const total=linhas.reduce((s,c)=>s+c.valorCentavos,0);linhas.forEach(c=>c.participacao=total?c.valorCentavos/total*100:0);
 const lider=[...linhas].sort((a,b)=>b.valorCentavos-a.valorCentavos)[0];
 return {linhas,totalCentavos:total,lider:lider?.valorCentavos?lider:null,campanhas:linhas.filter(c=>c.disponivel&&c.ciclos>0).length,cobertura:linhas.filter(c=>c.disponivel).length,anos:[...new Set(todos.map(r=>r.competencia.slice(0,4)))].sort().reverse(),confirmados:filtrados.filter(r=>r.confirmado).length,apuradoCentavos:filtrados.reduce((s,r)=>s+r.apurado,0),registros:filtrados.length};
}
export function dadosDemonstracao(){const registros=[];for(let m=6;m<=11;m++)for(let i=0;i<CAMPANHAS.length;i++){registros.push(registroFinanceiro(CAMPANHAS[i].id,{id:'demo-'+m+'-'+i,competencia:'2026-'+String(m).padStart(2,'0'),semana:1,pago:true,criadoEm:'2026-06-01',origem:'Demonstração fictícia'},(6-i)*7200+m*830));}return {registros,fontes:CAMPANHAS.map(c=>({id:c.id,status:'ok',nota:'Dados fictícios de demonstração; não gravados.'})),atualizado:new Date().toISOString(),demo:true};}
