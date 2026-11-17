// Resumo somente de registros efetivamente salvos na mesma competência e semana.
const percentual=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=-100&&Number(v)<=100;
export function resumirNpsSemanaPix(linhas,participantes,registros,competencia,semana){
 const porId=new Map(participantes.map(p=>[String(p.id),p]));
 const aptos=[...new Map(linhas.filter(l=>l.completo&&l.origem==='Individual'&&porId.get(String(l.funcionarioId))?.usaNps).map(l=>[String(l.funcionarioId),l])).values()];
 const salvos=[],pendentes=[];
 for(const l of aptos){
  const encontrados=registros.filter(r=>String(r.funcionarioId)===String(l.funcionarioId)&&r.competencia===competencia&&Number(r.semana)===Number(semana));
  const r=encontrados.length===1?encontrados[0]:null;
  const metaInformada=r&&(r.metaNpsInformada===true||(r.metaNpsInformada==null&&Number(r.metaNps)>0));
  const realizadoInformado=r&&(r.realizadoNpsInformado===true||r.realizadoNpsInformado==null);
  if(r&&metaInformada&&realizadoInformado&&percentual(r.metaNps)&&percentual(r.realizadoNps))salvos.push({...l,metaNps:Number(r.metaNps),realizadoNps:Number(r.realizadoNps)});
  else pendentes.push(l);
 }
 return {aptos,salvos,pendentes};
}
