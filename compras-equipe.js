// Base aprovada em 28/10/2026. A migração é aplicada uma vez e mantém os cadastros anteriores arquivados.
export const VERSAO_EQUIPE_COMPRAS='20261030-assistentes';
const VERSAO_ANALISTAS='20261028-analistas';
const normalizar=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
const grupos=[
 ['jessica','diesel',['Cuiabá','Rondonópolis','Sinop','Água Boa','Porto Velho','Vilhena','Ji-Paraná']],
 ['gabriel','diesel',['Ananindeua','Macapá','São Luís','Bacabal','Teresina','Uruçuí']],
 ['mykaela','fiat',['BR','Doca','Altamira','Jataí','Mineiros','Rondonópolis','Primavera do Leste','Barra do Garça']],
 ['mykaela','jeep',['Barra do Garça']]
];
export const CASAS_EQUIPE_COMPRAS=grupos.flatMap(([responsavel,categoria,casas])=>casas.map(cidade=>({responsavel,categoria,cidade,unidade:(categoria==='diesel'?'D. ':categoria==='fiat'?'Fiat ':'JEEP RAM - ')+cidade})));
export const EQUIPE_COMPRAS=[
 {id:'jessica',nome:'JÉSSICA ALVES DE JESUS',regioes:['DIESEL MT','DIESEL RO']},
 {id:'gabriel',nome:'GABRIEL CAMPOS DIAS',regioes:['DIESEL PA','DIESEL AP','DIESEL MA','DIESEL PI']},
 {id:'mykaela',nome:'Mykaela de Araújo Marques',regioes:['FIAT PA','FIAT MT','FIAT GO']},
 {id:'rodrigo',nome:'Rodrigo Santos da Silva',politica:'assistente',regioes:['FIAT PA'],casas:['Fiat BR','Fiat Doca','Fiat Altamira']},
 {id:'juliana',nome:'Juliana Lima Martins',politica:'assistente',regioes:['FIAT GO','FIAT MT','JEEP RAM MT'],casas:['Fiat Jataí','Fiat Mineiros','Fiat Rondonópolis','Fiat Primavera do Leste','Fiat Barra do Garça','JEEP RAM - Barra do Garça']},
 {id:'rone',nome:'Rone César Praseres Chaves Filho',politica:'assistente',regioes:['DIESEL MT','DIESEL RO'],analista:'jessica'},
 {id:'joao-marcelo',nome:'João Marcelo Costa Leite Silva',politica:'assistente',regioes:['DIESEL PA','DIESEL AP','DIESEL MA','DIESEL PI'],analista:'gabriel'}
].map(({casas,analista,...p})=>({...p,cargo:p.politica==='assistente'?'Assistente de Compras':'Analista de Compras',politica:p.politica||'analista',escopoRestrito:true,unidades:casas||CASAS_EQUIPE_COMPRAS.filter(c=>c.responsavel===(analista||p.id)).map(c=>c.unidade),ativo:true,foraDaBase:false,versaoBase:p.politica==='assistente'?VERSAO_EQUIPE_COMPRAS:VERSAO_ANALISTAS}));
export const LIDERANCA_COMPRAS=[
 {id:'bruno-vitor',nome:'BRUNO VITOR DA PAZ SILVA',cargo:'Analista Sênior de Compras',politica:'senior'},
 {id:'ricardo-wendell',nome:'RICARDO WENDELL PEREIRA',cargo:'Supervisor de Compras',politica:'supervisor'}
].map(p=>({...p,unidades:[],regioes:[],escopoRestrito:true,ativo:true,foraDaBase:false,competenciaInicio:'2026-10',versaoBase:'20261030-lideranca'}));
// Migração incremental: não redefine casas, cargos ou status já editados após a aprovação.
export function planejarBaseCompras(existentes){
 const alteracoes=[];
 for(const p of [...EQUIPE_COMPRAS,...LIDERANCA_COMPRAS]){
  const anterior=existentes.find(e=>e.id===p.id);
  if(anterior?.versaoBase===p.versaoBase)continue;
  // Os analistas existentes mantêm suas atribuições; apenas a nova equipe é ativada.
  if(anterior&&p.politica==='analista')continue;
  alteracoes.push({id:p.id,dados:{...p,...(anterior?{cadastroAnterior:{nome:anterior.nome||'',cargo:anterior.cargo||'',regioes:anterior.regioes||[],unidades:anterior.unidades||[],ativo:anterior.ativo!==false}}:{})}});
 }
 return alteracoes;
}

function categoria(texto){const n=normalizar(texto);if(n.includes('LEAPMOTOR'))return 'fora';if(n.includes('JEEP')||n.includes('RAM'))return 'jeep';if(n.includes('FIAT'))return 'fiat';if(/^D |^(?:M )?DIESEL |D MATO GROSSO|D RONDONIA|D PIAUI|D PARA|D MARANHAO|M AMAPA/.test(n))return 'diesel';return '';}
function cidade(texto){let n=normalizar(texto).replace(/^MONACO VEICULOS /,'').replace(/^M DIESEL /,'').replace(/^(?:DIESEL|D|M|FIAT) /,'').replace(/^JEEP RAM /,'').replace(/ MT$/,'');if(n==='ALTAMIRA NOVA')n='ALTAMIRA';if(n==='PRIMAVERA')n='PRIMAVERA DO LESTE';if(n==='BARRA DO GARCAS')n='BARRA DO GARCA';if(n==='BELEM')n='ANANINDEUA';return n.replace(/ /g,'');}
export function casaEquipeCompras(indicador){
 const unidade=indicador.unidade||indicador.nucleo||'',tipo=categoria(unidade)||categoria(indicador.nucleo||'');
 if(tipo==='fora')return null;
 const chave=cidade(unidade),candidatas=CASAS_EQUIPE_COMPRAS.filter(c=>(!tipo||tipo===c.categoria)&&cidade(c.cidade)===chave);
 return candidatas.length===1?candidatas[0]:null;
}
export function recebeCasaEquipeCompras(pessoa,indicador){
 if(!pessoa.escopoRestrito)return null;
 const casa=casaEquipeCompras(indicador);
 if(!casa)return false;
 return (pessoa.unidades||[]).some(unidade=>{const configurada=casaEquipeCompras({unidade});return configurada?.unidade===casa.unidade;});
}
