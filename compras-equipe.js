// Base aprovada em 28/10/2026. A migração é aplicada uma vez e mantém os cadastros anteriores arquivados.
export const VERSAO_EQUIPE_COMPRAS='20261028-analistas';
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
 {id:'mykaela',nome:'Mykaela de Araújo Marques',regioes:['FIAT PA','FIAT MT','FIAT GO']}
].map(p=>({...p,cargo:'Analista de Compras',politica:'analista',escopoRestrito:true,unidades:CASAS_EQUIPE_COMPRAS.filter(c=>c.responsavel===p.id).map(c=>c.unidade),ativo:true,foraDaBase:false,versaoBase:VERSAO_EQUIPE_COMPRAS}));
export function planejarBaseCompras(existentes){
 if(EQUIPE_COMPRAS.every(p=>existentes.some(e=>e.id===p.id&&e.versaoBase===VERSAO_EQUIPE_COMPRAS)))return [];
 const alteracoes=[];
 for(const p of EQUIPE_COMPRAS){const anterior=existentes.find(e=>e.id===p.id);alteracoes.push({id:p.id,dados:{...p,...(anterior?{cadastroAnterior:{nome:anterior.nome||'',cargo:anterior.cargo||'',regioes:anterior.regioes||[],unidades:anterior.unidades||[],ativo:anterior.ativo!==false}}:{})}});}
 for(const p of existentes.filter(e=>!EQUIPE_COMPRAS.some(n=>n.id===e.id))){alteracoes.push({id:p.id,dados:{ativo:false,foraDaBase:true,motivoArquivamento:'Fora da base de analistas aprovada em 28/10/2026',versaoBase:VERSAO_EQUIPE_COMPRAS}});}
 return alteracoes;
}
function categoria(texto){const n=normalizar(texto);if(n.includes('LEAPMOTOR'))return 'fora';if(n.includes('JEEP')||n.includes('RAM'))return 'jeep';if(n.includes('FIAT'))return 'fiat';if(/^D |^DIESEL |D MATO GROSSO|D RONDONIA|D PIAUI|D PARA|D MARANHAO|M AMAPA/.test(n))return 'diesel';return '';}
function cidade(texto){let n=normalizar(texto).replace(/^MONACO VEICULOS /,'').replace(/^(?:DIESEL|D|M|FIAT) /,'').replace(/^JEEP RAM /,'').replace(/ MT$/,'');if(n==='ALTAMIRA NOVA')n='ALTAMIRA';if(n==='PRIMAVERA')n='PRIMAVERA DO LESTE';if(n==='BARRA DO GARCAS')n='BARRA DO GARCA';if(n==='BELEM')n='ANANINDEUA';return n.replace(/ /g,'');}
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
