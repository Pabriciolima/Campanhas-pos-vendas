const arred=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
export function dataImportacaoPix(linha){return linha.dataImportacao||linha.inicio;}
export function diasSalvosPix(registro={}){
 const datas=[...new Set([...(registro.datasAvaliadas||[]),...Object.keys(registro.diasCalendario||{})])].sort();
 const original=registro.diasCalendario||{},dias={};
 const total=Math.round(Number(registro.metaSemanal||0)*100),base=datas.length?Math.floor(total/datas.length):0,sobra=total-base*datas.length;
 const metasValidas=datas.length&&datas.every(d=>Number.isFinite(original[d]?.meta))&&Math.abs(datas.reduce((s,d)=>s+original[d].meta,0)-Number(registro.metaSemanal||0))<.02;
 datas.forEach((d,i)=>{dias[d]={...(original[d]||{}),meta:metasValidas?original[d].meta:(base+(i<sobra?1:0))/100};});
 return dias;
}
const informado=(r,c,f)=>r?.[f]??(r?.[c]!=null&&String(r[c]).trim()!=='');
export function preverImportacaoDiariaPix(linha,anterior={}){
 const data=dataImportacaoPix(linha),dias=diasSalvosPix(anterior),dia=dias[data];
 const temDia=dia?.realizado!=null&&String(dia.realizado).trim()!=='';
 const conflitoDia=!!temDia&&(arred(dia.realizado)!==arred(linha.realizado)||arred(dia.meta)!==arred(linha.meta));
 const semanais=[];
 if(linha.ticket!=null)semanais.push({campo:'ticketMedio',flag:'ticketMedioInformado',valor:linha.ticket,rotulo:'Ticket médio'});
 if(linha.margem!=null)semanais.push({campo:'margem',flag:'margemInformada',valor:linha.margem,rotulo:'Margem'});
 if(linha.npsImportado){semanais.push({campo:'metaNps',flag:'metaNpsInformada',valor:linha.npsImportado.meta,rotulo:'Meta NPS'},{campo:'realizadoNps',flag:'realizadoNpsInformado',valor:linha.npsImportado.realizado,rotulo:'NPS realizado'});}
 const alterados=semanais.filter(c=>!informado(anterior,c.campo,c.flag)||arred(anterior[c.campo])!==arred(c.valor));
 const conflitosSemanais=alterados.filter(c=>informado(anterior,c.campo,c.flag));
 return {data,dias,dia,temDia,conflitoDia,semanais,alterados,conflitosSemanais};
}
