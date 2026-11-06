import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(async req=>{
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'https://campanhas-pos-vendas.vercel.app','Access-Control-Allow-Headers':'content-type,apikey,authorization','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
 if(req.method==='OPTIONS')return new Response(null,{headers});
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method!=='POST')return reply({error:'Método inválido.'},405);
 try{const raw=await req.text();if(new TextEncoder().encode(raw).length>3000000)return reply({error:'Limite de 3 MB.'},413);
 const p=JSON.parse(raw);if(!['garantia','compras'].includes(p.modulo))return reply({error:'Módulo inválido.'},400);
 const {data,error}=await db.rpc('campanhas_modulos_v2',{p});if(error){console.error(error.code);return reply({error:'Falha na operação. Dados preservados.'},500);}return reply(data,data.status||200);
 }catch{return reply({error:'Solicitação inválida.'},400);}
});
