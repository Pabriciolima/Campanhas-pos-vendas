const endpoint='https://ksyygambidrptnwndjhr.supabase.co/functions/v1/modulos-v2';
const sessions=new Map(),logins=new Map();
export async function chamarModulo(modulo,p,fetcher=fetch){
 const token=sessions.get(modulo)||globalThis.sessionStorage?.getItem('modulo-v2-'+modulo);
 const r=await fetcher(endpoint,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({...p,modulo,token})});
 const data=await r.json();if(!r.ok){if(r.status===401){sessions.delete(modulo);globalThis.sessionStorage?.removeItem('modulo-v2-'+modulo);}const e=Error(data.error||'Falha na conexão.');Object.assign(e,{status:r.status,trocaObrigatoria:data.trocaObrigatoria});throw e;}return data;
}
export async function autenticarModulo(modulo,{interativo=false}={}){
 if(sessions.has(modulo)||globalThis.sessionStorage?.getItem('modulo-v2-'+modulo))return;
 if(logins.has(modulo))return logins.get(modulo);
 if(!interativo){const e=Error('Entre com a senha do módulo.');e.status=401;throw e;}
 const work=(async()=>{
 const senha=await pedirSenha('Senha de '+modulo);let data;
 try{data=await chamarModulo(modulo,{acao:'login',senha});}catch(e){if(!e.trocaObrigatoria)throw e;const novaSenha=await pedirSenha('Crie a senha de '+modulo+' (12 a 72 caracteres). A master será invalidada.');const confirmacao=await pedirSenha('Confirme a nova senha');if(novaSenha!==confirmacao)throw Error('As senhas não coincidem.');data=await chamarModulo(modulo,{acao:'login',senha,novaSenha});}
 sessions.set(modulo,data.token);globalThis.sessionStorage?.setItem('modulo-v2-'+modulo,data.token);
 })();logins.set(modulo,work);try{await work;}finally{logins.delete(modulo);}
}
function pedirSenha(titulo){return new Promise((resolve,reject)=>{const d=document.createElement('dialog'),form=document.createElement('form'),label=document.createElement('label'),input=document.createElement('input'),ok=document.createElement('button'),cancel=document.createElement('button');form.method='dialog';label.textContent=titulo;input.type='password';input.required=true;input.maxLength=200;input.autocomplete='off';label.append(input);ok.textContent='Entrar';cancel.textContent='Cancelar';cancel.type='button';cancel.onclick=()=>d.close();form.append(label,ok,cancel);d.append(form);document.body.append(d);let value;form.onsubmit=e=>{e.preventDefault();value=input.value;d.close();};d.onclose=()=>{d.remove();value?resolve(value):reject(Error('Acesso cancelado.'));};d.showModal();input.focus();});}
