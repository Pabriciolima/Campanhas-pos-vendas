// Apresentação do saldo já apurado; não altera metas, elegibilidade nem pagamentos.
export function resumoGorduraPix(resultado={}){
 const a=resultado.apuracaoDiaria;if(!a)return null;
 const numero=v=>Number.isFinite(Number(v))?Number(v):0;
 const anterior=Math.max(0,numero(a.saldoInicial));if(anterior<=0)return null;
 const meta=numero(resultado.metaSemanal),realizado=numero(resultado.realizadoSemanal);
 const usada=Math.min(anterior,Math.max(0,meta-realizado));
 return {anterior,usada,restante:Math.max(0,numero(a.gorduraFinal)),metaAjustada:Math.max(0,meta-anterior),cobriuMeta:usada>0&&realizado+anterior>=meta-.000001};
}
export function linhasGorduraPix(resultado){
 const r=resumoGorduraPix(resultado);if(!r)return [];
 const moeda=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 return ['Gordura anterior: '+moeda(r.anterior),'Gordura usada na meta: '+moeda(r.usada),'Saldo de gordura: '+moeda(r.restante),...(r.cobriuMeta?['Meta atingida com a gordura anterior.']:[])];
}
export function criarDestaqueGorduraPix(documento,resultados){
 return {
  didParseCell(d){
   if(d.section!=='body'||d.column.index!==5)return;
   const linhas=linhasGorduraPix(resultados[d.row.index]?.auditoriaDados);
   if(!linhas.length)return;
   d.cell.text=[...d.cell.text,...linhas];d.cell._temGorduraPix=true;
  },
  willDrawCell(d){
   if(!d.cell._temGorduraPix)return;
   const inicio=d.cell.text.findIndex(l=>/^Gordura(?:\s|$)/.test(l));if(inicio<0)return;
   d.cell._gorduraTextoPix={inicio,linhas:d.cell.text.slice(inicio)};
   // Mantém o espaço medido pelo AutoTable e pinta só o bloco de saldo em verde.
   d.cell.text=d.cell.text.map((l,i)=>i<inicio?l:'');
  },
  didDrawCell(d){
   const bloco=d.cell._gorduraTextoPix;if(!bloco)return;
   const cor=documento.getTextColor(),fonte=documento.getFont(),tamanho=documento.getFontSize();
   documento.setFont(d.cell.styles.font,d.cell.styles.fontStyle);documento.setFontSize(d.cell.styles.fontSize);documento.setTextColor(8,115,68);
   const pos=d.cell.getTextPos(),fonteMm=d.cell.styles.fontSize/documento.internal.scaleFactor,altura=fonteMm*documento.getLineHeightFactor();
   // getTextPos fornece o centro vertical; reproduz o baseline do AutoTable 3.8.4.
   const ajuste=d.cell.styles.valign==='middle'?d.cell.text.length*altura/2:d.cell.styles.valign==='bottom'?d.cell.text.length*altura:0;
   const y=pos.y+fonteMm*.85-ajuste+bloco.inicio*altura;
   documento.text(bloco.linhas,pos.x,y,{lineHeightFactor:documento.getLineHeightFactor()});
   documento.setTextColor(cor);documento.setFont(fonte.fontName,fonte.fontStyle);documento.setFontSize(tamanho);
  }
 };
}
