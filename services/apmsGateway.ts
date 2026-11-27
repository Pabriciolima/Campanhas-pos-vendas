import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';
import {apmsConfig} from './apmsConfig';
import {lerTudo} from '../diretoria/pagination.mjs';
import {perfilDiretoria} from '../diretoria/core.mjs';
import type {ApmsGateway} from './diretoriaBiService';
let client:any=null,geracao=0;
const erro=(message:string,status:number)=>Object.assign(Error(message),{status});
function exigirPerfil(){if(!perfilDiretoria((window as any).obterPerfilCampanhas?.()))throw erro('Selecione o perfil Abel para consultar a Diretoria.',403);}
export function limparConexaoApms(){geracao++;client?.auth.stopAutoRefresh();client=null;}
export function apmsConectado(){return !!client;}
async function validarCliente(c:any,signal?:AbortSignal){
 exigirPerfil();if(!c)throw erro('Conecte sua conta administrativa APMs.',401);
 const sess=await c.auth.getSession();if(!sess.data.session)throw erro('Entre novamente na conta APMs.',401);
 if(sess.data.session.expires_at<Date.now()/1000+60){const r=await c.auth.refreshSession();if(r.error)throw erro('A sessão APMs expirou. Conecte novamente.',401);}
 const {data,error}=await c.auth.getUser();if(error||!data.user)throw erro('Não foi possível validar sua sessão APMs.',401);
 let q=c.from('apms_campaign_members').select('role').eq('user_id',data.user.id);if(signal)q=q.abortSignal(signal);
 const {data:members,error:me}=await q;if(me)throw me;
 if(members?.length!==1||members[0].role!=='admin')throw erro('Use uma conta administrativa da campanha APMs para consultar todas as regiões.',403);
 exigirPerfil();
}
export async function conectarApms(usuario:string,senha:string){
 exigirPerfil();limparConexaoApms();const inicio=geracao;
 const email=/^(PABRICIO|RENAN|DANIELA|LUANA|CAROLINY)2026$/i.test(usuario.trim())?usuario.trim().toLowerCase()+'@apms.internal':usuario.trim();
 const c=createClient(apmsConfig.url,apmsConfig.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'diretoria-apms-isolado'}});
 try{const r=await c.auth.signInWithPassword({email,password:senha});if(r.error)throw erro('Usuário ou senha APMs incorretos, ou acesso indisponível.',r.error.status||401);await validarCliente(c);if(inicio!==geracao)throw erro('A identificação mudou. Entre novamente.',401);client=c;}
 catch(e){await c.auth.signOut({scope:'local'}).catch(()=>{});throw e;}
}
export async function desconectarApms(){const c=client;limparConexaoApms();if(c)await c.auth.signOut({scope:'local'}).catch(()=>{});}
const colunas='id,competence,contract,closed_on,consultant,branch_id,state,seller,manager,apm_amount,seller_amount,manager_amount,model,chassis_quantity,modality,policy_version,created_at';
export const apmsGateway:ApmsGateway={
 validarAdmin:async signal=>{try{await validarCliente(client,signal);}catch(e:any){if(e.status===401||e.status===403)limparConexaoApms();throw e;}},
 lerContratos:async signal=>{exigirPerfil();if(!client)throw erro('Conexão APMs encerrada.',401);return lerTudo(client,'apms_campaign_claims',signal,colunas);},
 lerFiliais:async signal=>{exigirPerfil();if(!client)throw erro('Conexão APMs encerrada.',401);return lerTudo(client,'apms_campaign_branches',signal,'id,name,state');}
};
window.addEventListener('campanhas:perfil-alterado',limparConexaoApms);
