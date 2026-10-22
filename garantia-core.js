/* Fonte: GARANTIA METRICAS.xlsx, Plan1, versão junho/2025.
 * Confirmações de 22/10/2026: AEG adicional (teto fixo R$700);
 * erros >=5% descontam 30% do bônus total, incluindo adicionais.
 * Métricas de rede devem usar totais consolidados, nunca média de percentuais.
 */
export const POLITICA_GARANTIA = Object.freeze({
 versao:'junho/2025 — definições confirmadas em 22/10/2026',
 fonte:'GARANTIA METRICAS.xlsx · Plan1',
 perfis:{assistente:'Assistente Administrativo de Garantia',lider:'Líder de Garantia',supervisora:'Supervisora de Qualidade e Processos'},
 indicadores:[
  {id:'faturamento',nome:'Faturamento',formula:'Quantidade de O.S. faturadas ÷ O.S. fechadas no mês × 100; total de todas as unidades.',faixas:[80,90,100],assistente:[150,170,200],lider:[400,500,600],celulas:'A5:D7; A35:D37'},
  {id:'recebimento',nome:'Recebimento',formula:'Valor recebido de garantia ÷ valor faturado do respectivo mês × 100; total de todas as unidades.',faixas:[80,90,100],assistente:[75,100,150],lider:[400,500,600],celulas:'A9:D11; A39:D41'},
  {id:'insercao',nome:'Inserção',formula:'Percentual de conformidade na avaliação final; resultado geral das unidades.',faixas:[75,80,100],assistente:[75,100,150],lider:[400,500,600],celulas:'A13:D15; A43:D45'},
  {id:'malote',nome:'Malote',formula:'Percentual de conformidade; total de todas as unidades. Exclusivo da liderança e supervisora.',faixas:[75,80,100],lider:[400,500,600],celulas:'A47:D49'},
  {id:'aeg',nome:'Central de AEG',formula:'Não conformidade abaixo de 5%, considerando D+2 no preenchimento e nas correções. Central de AEG no Sismônaco.',assistente:[200],celulas:'A21:D21'},
  {id:'chamevolks',nome:'Chamevolks',formula:'R$25 por processo faturado, atribuído ao usuário que enviou à frente de caixa no relatório de faturamento. Exclusivo do assistente.',assistente:[25],celulas:'A17:D17'},
  {id:'extra',nome:'Bônus extra',formula:'R$150 a cada bloco completo de 5 pontos percentuais de recebimento acima de 100%. Exclusivo da liderança e supervisora.',lider:[150],celulas:'A51:D51'}
 ]
});
const centavos=n=>Math.round((n+Number.EPSILON)*100)/100;
function numero(value,{inteiro=false,max=Number.MAX_SAFE_INTEGER}={}){
 if(!['number','string'].includes(typeof value)||String(value).trim()==='')return null;
 const n=typeof value==='number'?value:Number(value);
 return Number.isFinite(n)&&n>=0&&n<=max&&(!inteiro||Number.isSafeInteger(n))?n:null;
}
export function calcularGarantia(dados={}){
 const perfil=dados.perfil,assistente=perfil==='assistente',pendencias=[],itens=[];
 if(!Object.hasOwn(POLITICA_GARANTIA.perfis,perfil))return {completo:false,pendencias:['Selecione um perfil válido.'],itens:[],total:null};
 function obter(key,label,opcoes){const n=numero(dados[key],opcoes);if(n===null)pendencias.push(label+': informe um valor válido.');return n;}
 function razao(nkey,dkey,label,inteiro=false){const n=obter(nkey,label+' — realizado',{inteiro}),d=obter(dkey,label+' — base',{inteiro});if(d===0)pendencias.push(label+': a base deve ser maior que zero.');return n!==null&&d!==null&&d>0?n/d*100:null;}
 const faturamento=razao('osFaturadas','osFechadas','Faturamento',true);
 const recebimento=razao('valorRecebido','valorFaturado','Recebimento');
 const insercao=obter('insercao','Conformidade de inserção');
 const erros=obter('erros','Índice de erros no Sivolks',{max:100});
 function faixa(id,percentual){const regra=POLITICA_GARANTIA.indicadores.find(x=>x.id===id),premios=regra[assistente?'assistente':'lider'];let valor=0;if(percentual!==null)regra.faixas.forEach((limite,i)=>{if(percentual>=limite)valor=premios[i];});itens.push({id,nome:regra.nome,percentual,valor:percentual===null?null:valor});}
 faixa('faturamento',faturamento);faixa('recebimento',recebimento);faixa('insercao',insercao);
 if(assistente){const aeg=obter('aeg','Não conformidade da Central de AEG',{max:100}),qtd=obter('chamevolks','Processos Chamevolks faturados e atribuídos ao assistente',{inteiro:true});itens.push({id:'aeg',nome:'Central de AEG',percentual:aeg,valor:aeg===null?null:aeg<5?200:0},{id:'chamevolks',nome:'Chamevolks',quantidade:qtd,valor:qtd===null?null:centavos(qtd*25)});}
 else{faixa('malote',obter('malote','Conformidade de malote'));itens.push({id:'extra',nome:'Bônus extra',percentual:recebimento,valor:recebimento===null?null:Math.max(0,Math.floor((recebimento-100+1e-10)/5))*150});}
 const subtotal=centavos(itens.reduce((n,item)=>n+(item.valor??0),0));
 if(!Number.isFinite(subtotal)||subtotal>Number.MAX_SAFE_INTEGER/100)pendencias.push('Valores acima do limite de precisão monetária; revise os dados.');
 const penalidade=erros===null?null:centavos(erros>=5?subtotal*.3:0);
 return {perfil,completo:pendencias.length===0,pendencias,itens,subtotal,erros,penalidade,total:pendencias.length?null:centavos(subtotal-penalidade)};
}
