import {apurarPessoa,escopoPessoa,indice,numero} from './garantia-dados.js?v=20261023-lote';
// Projeção de apresentação: o valor final e as conferências continuam no motor oficial.
export function acompanharPessoa(p,mes){
 const r=apurarPessoa(p,mes),m=mes.metricas[escopoPessoa(p)]||{},local=['localAssist','localAux','admPv'].includes(p.perfil),stale=!!m.desatualizado;
 const componentes={};
 for(const id of ['recebimento','faturamento','insercao','malote','aegPreenchimento','aegCorrecao','chamevolks']){const item=r.itens.find(i=>i.id===id||i.nome===id);componentes[id]=!item?undefined:stale?null:(item.percentual===null||item.quantidade===null)?null:item.valor;}
 if(local){componentes.local=stale||r.faturamento===null||numero(m.malote)===null||numero(m.osFechadas)===null?null:r.subtotal;}
 if(p.perfil==='analista'){const extra=r.itens.find(i=>i.nome.startsWith('Extra'));const units=p.unidades||[];componentes.extra=stale||!units.length||indice(m,'erros')===null||units.some(u=>!mes.metricas[u]||mes.metricas[u].desatualizado||['faturamento','recebimento','insercao'].some(k=>indice(mes.metricas[u],k)===null))?null:extra?.valor;componentes.destaque=p.destaque?300:0;}
 if(['lider','supervisora'].includes(p.perfil)){componentes.extra=stale?null:r.itens.find(i=>i.id==='extra')?.valor;}
 const conhecidos=Object.values(componentes).filter(n=>typeof n==='number');const bruto=stale||!conhecidos.length?null:Math.round(conhecidos.reduce((s,v)=>s+v,0)*100)/100;
 const parcial=p.suspenso?0:bruto===null?null:Math.round(Math.max(0,bruto-(r.penalidade||0))*100)/100;
 return{...r,componentes,brutoParcial:bruto,parcial,totalExibido:p.conferirReferencia&&r.total===null?null:r.total??parcial,provisorio:r.total===null,desatualizado:stale};
}
