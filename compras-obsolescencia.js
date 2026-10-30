// Ausência de medição é diferente de 0%. Somente o mês imediatamente anterior é comparável.
export function calcularObsolescenciaCasa(anterior,atual,parcela){
 const valido=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
 if(!valido(atual))return {possuiHistorico:valido(anterior),reducao:null,reducaoBonificada:0,bonus:0,status:'SEM PLANILHA DO MÊS ATUAL'};
 if(!valido(anterior))return {possuiHistorico:false,reducao:null,reducaoBonificada:0,bonus:0,status:'SEM PLANILHA DO MÊS ANTERIOR'};
 const reducao=Number((anterior-atual).toFixed(10));
 return {possuiHistorico:true,reducao,reducaoBonificada:Math.max(0,reducao),bonus:reducao>0?parcela:0,status:reducao>0?'REDUZIU':reducao<0?'AUMENTOU':'SEM REDUÇÃO'};
}
export function consolidarMetricasCasas(registros,chave){
 const casas=new Map();
 for(const r of [...registros].sort((a,b)=>String(a.atualizadoEm||'').localeCompare(String(b.atualizadoEm||'')))){
  const k=chave(r),atual=casas.get(k)||{};
  const validos=Object.fromEntries(Object.entries(r).filter(([k,v])=>v!==null&&v!==undefined&&v!==''));
  casas.set(k,{...atual,...validos});
 }
 return casas;
}
// Cada importação substitui só a métrica do mês, preservando os demais indicadores.
export const CAMPOS_METRICAS_COMPRAS={disponibilidade:['disponibilidadeA','disponibilidadeB','disponibilidadeC','disponibilidadeTotal'],obsolescencia:['indiceObsolescencia','valorObsoleto365'],cobertura:['coberturaEstoque','coberturaAnteriorFonte','competenciaAnteriorFonte','colunaCobertura','colunaCoberturaAnterior','origemCobertura'],os:['controleOs','totalOs','aguardandoCompras','osRankingJustificativas','empresaOrigem','escopoOs']};
export function prepararSubstituicaoMetrica(existentes,competencia,tipo,aceitar=()=>true){
 const campos=CAMPOS_METRICAS_COMPRAS[tipo];
 if(!campos)return [];
 return existentes.filter(r=>aceitar(r)&&r.competencia===competencia&&(r.tipoImportacao===tipo||campos.some(c=>r[c]!=null))).map(r=>{
  const restante={...r};for(const c of campos)delete restante[c];
  const outros=Object.entries(CAMPOS_METRICAS_COMPRAS).filter(([t,cs])=>t!==tipo&&cs.some(c=>restante[c]!=null));
  if(outros.length===1)restante.tipoImportacao=outros[0][0];
  return {id:r.id,restante:outros.length?restante:null};
 });
}

export function lerPercentualObsoleto(valor){
 if(valor==null||typeof valor==='boolean'||String(valor).trim()==='')return null;
 const explicito=typeof valor==='string'&&valor.includes('%');
 const n=typeof valor==='number'?valor:Number(String(valor).trim().replace('%','').replace(',','.'));
 if(!Number.isFinite(n)||n<0||n>100)return null;
 return !explicito&&n>0&&n<=1?n*100:n;
}
