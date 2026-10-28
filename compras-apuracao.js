// Divide a verba entre TODAS as casas cadastradas, inclusive as sem medição.
// O centavo residual é distribuído pela ordem do cadastro para fechar exatamente a verba.
export function parcelaCasa(verba,quantidade,indice){
 if(!Number.isInteger(quantidade)||quantidade<1||!Number.isInteger(indice)||indice<0||indice>=quantidade)return 0;
 const centavos=Math.round(verba*100),base=Math.floor(centavos/quantidade),resto=centavos%quantidade;
 return (base+Number(indice<resto))/100;
}
export function calcularDisponibilidadeCasa(casa,politica,quantidade=1,indice=0){
 const atingiu=(valor,meta)=>typeof valor==='number'&&Number.isFinite(valor)&&valor>=0&&valor<=100&&valor>=meta;
 const atingiuA=atingiu(casa.disponibilidadeA,politica.disponibilidadeA.meta),atingiuB=atingiu(casa.disponibilidadeB,politica.disponibilidadeB.meta);
 const parcelaA=parcelaCasa(politica.disponibilidadeA.bonus,quantidade,indice),parcelaB=parcelaCasa(politica.disponibilidadeB.bonus,quantidade,indice);
 const bonusA=atingiuA?parcelaA:0,bonusB=atingiuB?parcelaB:0;
 return {atingiuA,atingiuB,parcelaA,parcelaB,bonusA,bonusB,bonusDisponibilidade:Math.round((bonusA+bonusB)*100)/100};
}
