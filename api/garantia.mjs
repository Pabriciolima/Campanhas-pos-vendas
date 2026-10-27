import {proteger,abrir} from '../garantia-nuvem.js';
// Acesso aberto autorizado; o segredo permanece no servidor e o banco mantém a cifra original.
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const password=process.env.GARANTIA_CLOUD_PASSWORD,url=process.env.GARANTIA_SUPABASE_URL,key=process.env.GARANTIA_SUPABASE_ANON_KEY;
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Método não permitido.'});
 if(!password||!url||!key)return res.status(503).json({error:'Conexão automática aguardando configuração do servidor.'});
 const base=url+'/rest/v1/campanhas_configuracoes?id=eq.garantia_campanha_criptografada_v1',headers={apikey:key,Authorization:'Bearer '+key};
 try{
  if(req.method==='GET'){const r=await fetch(base+'&select=dados,updated_at',{headers,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();const [row]=await r.json();if(!row)throw Error();return res.status(200).json({state:await abrir(row.dados,password),revision:row.updated_at});}
  if(!req.headers.origin||new URL(req.headers.origin).host!==req.headers.host)return res.status(403).json({error:'Origem inválida.'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body,s=body?.state;
  if(s?.versao!==2||!s.competencias||Array.isArray(s.competencias)||!Array.isArray(s.historico)||typeof body.revision!=='string'||body.revision.length>80||Buffer.byteLength(JSON.stringify(body))>3000000||!Object.entries(s.competencias).every(([cp,m])=>/^\d{4}-(0[1-9]|1[0-2])$/.test(cp)&&m.metricas&&Array.isArray(m.participantes)))return res.status(400).json({error:'Dados inválidos.'});
  const dados=await proteger(s,password),r=await fetch(base+'&updated_at=eq.'+encodeURIComponent(body.revision)+'&select=updated_at',{method:'PATCH',headers:{...headers,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({dados,updated_at:new Date().toISOString()}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error();const rows=await r.json();if(rows.length!==1)return res.status(409).json({error:'Outro computador alterou a campanha. Atualize a base; seus dados locais foram preservados.'});return res.status(200).json({revision:rows[0].updated_at});
 }catch{return res.status(502).json({error:'Falha ao acessar o Supabase. Dados locais preservados.'});}
}
