// Metas avaliadas na própria casa: o resultado de outra unidade não altera seu bônus.
export function calcularDisponibilidadeCasa(casa,politica){
 const atingiu=(valor,meta)=>typeof valor==='number'&&Number.isFinite(valor)&&valor>=0&&valor<=100&&valor>=meta;
 const atingiuA=atingiu(casa.disponibilidadeA,politica.disponibilidadeA.meta);
 const atingiuB=atingiu(casa.disponibilidadeB,politica.disponibilidadeB.meta);
 const bonusA=atingiuA?politica.disponibilidadeA.bonus:0;
 const bonusB=atingiuB?politica.disponibilidadeB.bonus:0;
 return {atingiuA,atingiuB,bonusA,bonusB,bonusDisponibilidade:bonusA+bonusB};
}
