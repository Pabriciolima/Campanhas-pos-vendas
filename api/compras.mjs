import {abrir,proteger} from '../garantia-nuvem.js';
import {COLECOES_COMPRAS,validarBaseCompras,validarOperacoesCompras,aplicarOperacoesCompras,mesclarLegadoCompras} from '../compras-persistencia.js';
import {planejarBaseCompras} from '../compras-equipe.js';
export const ID_COMPRAS='compras_campanha_criptografada_v1';
export function decodificarLegado(v){if('stringValue'in v)return v.stringValue;if('booleanValue'in v)return v.booleanValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return v.doubleValue;if('timestampValue'in v)return v.timestampValue;if('nullValue'in v)return null;if('arrayValue'in v)return (v.arrayValue.values||[]).map(decodificarLegado);if('mapValue'in v)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,decodificarLegado(x)]));throw Error('Tipo legado incompatível.');}
export async function lerLegadoCompras(fetcher=fetch){const dados={};for(const c of COLECOES_COMPRAS){dados[c]={};let token='',paginas=0;do{if(++paginas>30)throw Error('Histórico excede o limite seguro de recuperação.');const r=await fetcher('https://firestore.googleapis.com/v1/projects/campanhasposvendas/databases/(default)/documents/'+c+'?pageSize=1000'+(token?'&pageToken='+encodeURIComponent(token):''),{signal:AbortSignal.timeout(15000)});if(!r.ok){const e=Error(r.status===429?'O Firebase ainda está com a cota esgotada. O Supabase continua disponível.':'Não foi possível recuperar o histórico do Firebase.');e.status=r.status;throw e;}const p=await r.json();for(const d of p.documents||[]){const id=d.name.split('/').pop();dados[c][id]={...Object.fromEntries(Object.entries(d.fields||{}).map(([k,v])=>[k,decodificarLegado(v)])),id};}token=p.nextPageToken||'';}while(token);}return dados;}
export function criarHandlerCompras({fetcher=(...args)=>fetch(...args),env=process.env}={}){return async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Método não permitido.'});
 const password=env.COMPRAS_CLOUD_PASSWORD,url=env.CAMPANHAS_SUPABASE_URL||env.GARANTIA_SUPABASE_URL,key=env.CAMPANHAS_SUPABASE_ANON_KEY||env.GARANTIA_SUPABASE_ANON_KEY;
 if(!password||!url||!key)return res.status(503).json({error:'Supabase de Compras aguardando configuração do servidor.'});
 const endpoint=url+'/rest/v1/campanhas_configuracoes?id=eq.'+ID_COMPRAS,headers={apikey:key,Authorization:'Bearer '+key};
 try{
  if(req.method==='POST'){let valid=false;try{valid=!!req.headers.origin&&new URL(req.headers.origin).host===req.headers.host;}catch{}if(!valid)return res.status(403).json({error:'Origem inválida.'});}
  const read=await fetcher(endpoint+'&select='+(req.method==='GET'&&req.query?.revision?'updated_at':'dados,updated_at'),{headers,signal:AbortSignal.timeout(15000)});if(!read.ok)throw Error('Leitura do Supabase falhou.');let [row]=await read.json();if(!row)return res.status(503).json({error:'Base de Compras aguardando importação inicial. Nenhum histórico foi substituído.'});
  if(req.method==='GET'&&req.query?.revision===row.updated_at)return res.status(200).json({unchanged:true,revision:row.updated_at});
  if(!row.dados){const r=await fetcher(endpoint+'&select=dados,updated_at',{headers,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();[row]=await r.json();}
  let base=await abrir(row.dados,password);if(!validarBaseCompras(base))throw Error('Base inválida.');
  if(req.method==='GET')return res.status(200).json({base,revision:row.updated_at});
  let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{return res.status(400).json({error:'Solicitação inválida.'});}
  if(!body||Buffer.byteLength(JSON.stringify(body))>3000000||typeof body.revision!=='string')return res.status(400).json({error:'Solicitação inválida ou grande demais.'});
  if(body.revision!==row.updated_at)return res.status(409).json({error:'Outro computador atualizou Compras. Recarregue a base antes de salvar; a prévia e o formulário foram mantidos.'});
  if(body.acao==='recuperar-legado'){
   if(base.migracao.status==='concluida'||Date.now()-Date.parse(base.migracao.tentativaEm||0)<900000)return res.status(200).json({base,revision:row.updated_at});
   const tentativaEm=new Date().toISOString();
   try{base=mesclarLegadoCompras(base,await lerLegadoCompras(fetcher));const planos=planejarBaseCompras(Object.values(base.colecoes.compras_campanha_responsaveis));for(const {id,dados} of planos)base.colecoes.compras_campanha_responsaveis[id]={...base.colecoes.compras_campanha_responsaveis[id],...dados};base.migracao.tentativaEm=tentativaEm;}
   catch(e){base.migracao={...base.migracao,status:'pendente',tentativaEm,erro:e.message};}
  }else{if(!validarOperacoesCompras(body.operacoes))return res.status(400).json({error:'Operações inválidas.'});base=aplicarOperacoesCompras(base,body.operacoes);}
  if(Buffer.byteLength(JSON.stringify(base))>3000000)return res.status(413).json({error:'A base excede o limite desta operação. Nenhum dado foi substituído.'});
  const dados=await proteger(base,password),r=await fetcher(endpoint+'&updated_at=eq.'+encodeURIComponent(row.updated_at)+'&select=updated_at',{method:'PATCH',headers:{...headers,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({dados,updated_at:new Date().toISOString()}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error('Gravação do Supabase falhou.');const rows=await r.json();if(rows.length!==1)return res.status(409).json({error:'Outro computador atualizou Compras. Atualize a base antes de salvar; seus dados não foram sobrescritos.'});
  return res.status(200).json({base,revision:rows[0].updated_at});
 }catch(e){console.error('[COMPRAS SUPABASE]',e.message);return res.status(502).json({error:'Não foi possível acessar o Supabase de Compras. Formulário e prévia preservados.'});}
};}
export default criarHandlerCompras();
