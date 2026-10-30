import {casaEquipeCompras} from './compras-equipe.js?v=20261030-fiat-os';
const normalizar=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
const nome=v=>String(v??'').trim();
export function motivoCompras(v){const n=normalizar(v);return n==='AGUARDANDO CENTRAL DE COMPRAS'||n==='AGUARDANDO COMPRAS'||n==='AGUARDANDO PECAS DEPTO COMPRAS';}
export function analisarOsCompras(matriz){
 const inicio=matriz.findIndex(r=>normalizar(r[0])==='EMPRESA'&&normalizar(r[2])==='NRO OS'&&['JUSTIFICATIVA','DES JUSTIFICATIVA'].includes(normalizar(r[9])));
 if(inicio<0)throw Error('Use o relatório detalhado com EMPRESA na coluna A, NRO_OS na C e JUSTIFICATIVA na J.');
 const casas=new Map(),vistos=new Map();let duplicadas=0;
 for(let i=inicio+1;i<matriz.length;i++){
  const r=matriz[i],empresa=nome(r[0]),os=nome(r[2]);
  if(!empresa||!os||normalizar(empresa)==='TOTAL'||normalizar(empresa).startsWith('FILTROS APLICADOS'))continue;
  const unidade=casaEquipeCompras({unidade:empresa})?.unidade||empresa,chave=normalizar(unidade),justificativa=nome(r[9])||'NÃO INFORMADA',motivo=normalizar(justificativa),id=chave+'/'+os;
  if(vistos.has(id)){if(vistos.get(id)!==motivo)throw Error(`O.S. ${os} de ${empresa} tem justificativas divergentes. Corrija a planilha antes de importar.`);duplicadas++;continue;}
  vistos.set(id,motivo);
  if(!casas.has(chave))casas.set(chave,{unidade,empresaOrigem:empresa,totalOs:0,aguardandoCompras:0,motivos:new Map()});
  const c=casas.get(chave);c.totalOs++;if(motivoCompras(justificativa))c.aguardandoCompras++;
  const atual=c.motivos.get(motivo)||{motivo:justificativa,quantidade:0};atual.quantidade++;c.motivos.set(motivo,atual);
 }
 if(!casas.size)throw Error('Nenhuma O.S. válida encontrada. Totais e filtros não contam como O.S.');
 const registros=[...casas.values()].map(c=>({unidade:c.unidade,empresaOrigem:c.empresaOrigem,totalOs:c.totalOs,aguardandoCompras:c.aguardandoCompras,controleOs:c.aguardandoCompras/c.totalOs*100,osRankingJustificativas:[...c.motivos.values()].sort((a,b)=>b.quantidade-a.quantidade||a.motivo.localeCompare(b.motivo))}));
 return {registros,totalOs:registros.reduce((n,r)=>n+r.totalOs,0),aguardandoCompras:registros.reduce((n,r)=>n+r.aguardandoCompras,0),duplicadas};
}
export function calcularOsResponsavel(casas,meta=10){
 const validas=casas.filter(c=>typeof c.controleOs==='number'&&Number.isFinite(c.controleOs)&&c.controleOs>=0&&c.controleOs<=100);
 const completo=casas.length>0&&validas.length===casas.length;
 const media=validas.length?validas.reduce((n,c)=>n+c.controleOs,0)/validas.length:null;
 return {media,completo,filiaisInformadas:validas.length,filiaisEsperadas:casas.length,atingiu:completo&&media<=meta};
}
export function rankingMotivosOs(registros){
 const motivos=new Map();let total=0;
 for(const r of registros){total+=r.totalOs||0;for(const m of r.osRankingJustificativas||[]){const k=normalizar(m.motivo),atual=motivos.get(k)||{motivo:m.motivo,quantidade:0};atual.quantidade+=m.quantidade;motivos.set(k,atual);}}
 return [...motivos.values()].sort((a,b)=>b.quantidade-a.quantidade||a.motivo.localeCompare(b.motivo)).map((m,i)=>({...m,posicao:i+1,percentual:total?m.quantidade/total*100:0,compras:motivoCompras(m.motivo)}));
}

// Arquivos separados de Diesel e veículos coexistem; o escopo é inferido das casas reconhecidas.
export function escopoOsCompras(registros){
 const tipos=new Set(registros.map(r=>casaEquipeCompras(r)?.categoria).filter(Boolean));
 const diesel=tipos.has('diesel'),veiculos=tipos.has('fiat')||tipos.has('jeep');
 if(diesel&&veiculos)return 'misto';if(diesel)return 'diesel';if(veiculos)return 'fiat';
 const explicitos=new Set(registros.map(r=>r.escopoOs).filter(Boolean));return explicitos.size===1?[...explicitos][0]:'desconhecido';
}
