// Base fixa aprovada: não inclui liderança, evitando cálculo circular ou média só dos ganhadores.
export const BASE_MEDIA_COMPRAS=['jessica','gabriel','mykaela','rodrigo','juliana','rone','joao-marcelo'];
export function fatorLideranca(p){return p?.politica==='senior'?1.3:p?.politica==='supervisor'?3:0;}
export function calcularLiderancaCompras(pessoa,apuracoes,competencia){
 const fator=fatorLideranca(pessoa),baseMedia=BASE_MEDIA_COMPRAS.map(id=>{const r=apuracoes.find(x=>x.responsavelId===id&&!x.excluida);return {id,nome:r?.nome||id,ganho:Number(r?.bonusTotal||0)};});
 const somaCentavos=baseMedia.reduce((n,p)=>n+Math.round(p.ganho*100),0),media=somaCentavos/100/7;
 const bonusLideranca=Math.round(somaCentavos*Math.round(fator*100)/700)/100;
 return {responsavelId:pessoa.id,nome:pessoa.nome,cargo:pessoa.cargo,politica:pessoa.politica,competencia,derivada:true,baseMedia,somaBase:somaCentavos/100,mediaBase:media,multiplicador:fator,bonusLideranca,bonusTotal:bonusLideranca,status:bonusLideranca>0?'APURADO':'SEM GANHOS NA BASE'};
}
