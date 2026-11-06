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
 const work=abrirAcesso(modulo);logins.set(modulo,work);try{await work;}finally{logins.delete(modulo);}
}
function abrirAcesso(modulo){return new Promise((resolve,reject)=>{
 aplicarEstiloAcesso();
 const nome=modulo==='garantia'?'Garantia':'Compras';
 const d=document.createElement('dialog');d.className='mc-access';d.setAttribute('aria-labelledby','mc-access-title');d.setAttribute('aria-describedby','mc-access-description');
 d.innerHTML=`<form class="mc-access-form">
 <div class="mc-access-top"><span class="mc-access-brand">MÔNACO <span>·</span> CAMPANHAS</span><button class="mc-access-close" type="button" aria-label="Fechar acesso"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
 <div class="mc-access-icon" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10" width="15" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg></div>
 <p class="mc-access-eyebrow">ACESSO AO MÓDULO</p><h2 id="mc-access-title">Entrar em ${nome}</h2>
 <p id="mc-access-description">Informe a senha do módulo para acessar os dados e continuar seus lançamentos.</p>
 <div class="mc-access-fields"><label class="mc-access-label" for="mc-access-password">Senha de ${nome}</label>
 <div class="mc-access-input-wrap"><input id="mc-access-password" name="password" type="password" autocomplete="current-password" placeholder="Digite sua senha" required maxlength="200" autofocus><button type="button" class="mc-access-reveal" aria-label="Mostrar senha" aria-pressed="false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
 <p class="mc-access-hint">Primeiro acesso? Use a senha master recebida.</p>
 <div class="mc-access-confirm" hidden><label class="mc-access-label" for="mc-access-confirmation">Confirme a nova senha</label><div class="mc-access-input-wrap"><input id="mc-access-confirmation" name="confirmation" type="password" autocomplete="new-password" placeholder="Repita a nova senha" maxlength="72"></div></div></div>
 <p class="mc-access-error" role="alert" hidden></p>
 <div class="mc-access-actions"><button type="button" class="mc-access-cancel">Cancelar</button><button type="submit" class="mc-access-submit"><span>Entrar no módulo</span><span aria-hidden="true">→</span></button></div>
 <p class="mc-access-footer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-5"/></svg> Acesso protegido · Sessão de até 8 horas</p>
 </form>`;
 const form=d.querySelector('form'),input=d.querySelector('#mc-access-password'),confirmation=d.querySelector('#mc-access-confirmation'),error=d.querySelector('.mc-access-error'),submit=d.querySelector('.mc-access-submit'),reveal=d.querySelector('.mc-access-reveal');
 let master='',troca=false,busy=false,concluido=false;
 const fechar=()=>{if(!busy)d.close();};d.querySelector('.mc-access-close').onclick=fechar;d.querySelector('.mc-access-cancel').onclick=fechar;
 reveal.onclick=()=>{const visivel=input.type==='password';input.type=visivel?'text':'password';reveal.setAttribute('aria-label',visivel?'Ocultar senha':'Mostrar senha');reveal.setAttribute('aria-pressed',String(visivel));input.focus();};
 d.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 d.onclose=()=>{master='';input.value='';confirmation.value='';d.remove();if(!concluido)reject(Error('Acesso cancelado.'));};
 form.onsubmit=async e=>{e.preventDefault();if(busy)return;error.hidden=true;input.removeAttribute('aria-invalid');confirmation.removeAttribute('aria-invalid');
 if(troca&&input.value!==confirmation.value){error.textContent='As senhas não coincidem. Confira a confirmação.';error.hidden=false;confirmation.setAttribute('aria-invalid','true');confirmation.focus();return;}
 busy=true;submit.disabled=true;form.setAttribute('aria-busy','true');submit.querySelector('span').textContent=troca?'Ativando acesso…':'Verificando…';
 try{const data=await chamarModulo(modulo,{acao:'login',senha:troca?master:input.value,...(troca?{novaSenha:input.value}:{})});
 sessions.set(modulo,data.token);globalThis.sessionStorage?.setItem('modulo-v2-'+modulo,data.token);concluido=true;d.close();resolve();
 }catch(err){if(err.trocaObrigatoria&&!troca){master=input.value;troca=true;d.querySelector('#mc-access-title').textContent='Crie sua senha de '+nome;d.querySelector('.mc-access-eyebrow').textContent='PRIMEIRO ACESSO';d.querySelector('#mc-access-description').textContent='Defina a senha que será usada pela equipe neste módulo. A senha master será desativada após a confirmação.';d.querySelector('.mc-access-label').textContent='Nova senha';input.value='';input.type='password';input.autocomplete='new-password';input.minLength=8;input.maxLength=72;input.placeholder='Crie uma senha segura';reveal.setAttribute('aria-label','Mostrar senha');reveal.setAttribute('aria-pressed','false');d.querySelector('.mc-access-hint').textContent='Use de 8 a 72 caracteres e uma senha diferente da master.';d.querySelector('.mc-access-confirm').hidden=false;confirmation.required=true;confirmation.minLength=8;input.focus();}
 else{error.textContent=err.message;error.hidden=false;input.setAttribute('aria-invalid','true');input.focus();}
 }finally{busy=false;submit.disabled=false;form.removeAttribute('aria-busy');submit.querySelector('span').textContent=troca?'Salvar senha e entrar':'Entrar no módulo';}
 };
 document.body.append(d);d.showModal();input.focus();
 });}
function aplicarEstiloAcesso(){if(document.getElementById('mc-access-style'))return;const style=document.createElement('style');style.id='mc-access-style';style.textContent=ESTILO_ACESSO;document.head.append(style);}
const ESTILO_ACESSO=`
html body dialog.mc-access{box-sizing:border-box!important;position:fixed!important;inset:0!important;margin:auto!important;width:min(460px,calc(100vw - 32px))!important;max-width:460px!important;max-height:calc(100dvh - 32px)!important;padding:0!important;border:1px solid var(--monaco-line,#d8dbe1)!important;border-radius:24px!important;background:var(--monaco-surface,#fff)!important;color:var(--monaco-text,#1d1d1f)!important;box-shadow:0 32px 100px #02061750!important;overflow:auto!important;font-family:var(--monaco-font,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif)!important;}
html body dialog.mc-access::backdrop{background:rgba(5,15,26,.65);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);}
html body .mc-access *,html body .mc-access *::before{box-sizing:border-box;}
html body .mc-access-form{display:block!important;margin:0!important;padding:28px!important;background:transparent!important;}
html body .mc-access-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:22px;}
html body .mc-access-brand{font-size:10px!important;line-height:1.5!important;font-weight:750;letter-spacing:1.6px;color:var(--monaco-muted,#5d6370)!important;}
html body .mc-access-brand span{padding:0 5px;color:var(--monaco-accent,#08745e);}
html body .mc-access button{font-family:inherit!important;cursor:pointer;box-shadow:none!important;transform:none!important;text-transform:none!important;letter-spacing:normal!important;transition:background .16s,border-color .16s,box-shadow .16s;}
html body dialog.mc-access .mc-access-top .mc-access-close{display:grid!important;place-items:center!important;flex:0 0 36px!important;width:36px!important;min-width:36px!important;min-height:36px!important;height:36px!important;margin:0!important;padding:0!important;position:relative!important;visibility:visible!important;opacity:1!important;border:1px solid rgba(248,113,113,.32)!important;border-radius:11px!important;background:rgba(239,68,68,.13)!important;color:#fb7185!important;cursor:pointer!important;transition:background .2s ease,border-color .2s ease,box-shadow .2s ease,transform .25s cubic-bezier(.2,.8,.2,1)!important;}
html body dialog.mc-access .mc-access-close svg{display:block!important;width:18px!important;height:18px!important;stroke:currentColor!important;stroke-width:2.5!important;transition:transform .28s cubic-bezier(.2,.8,.2,1)!important;pointer-events:none!important;}
html body dialog.mc-access .mc-access-close:hover{background:#dc2626!important;border-color:#f87171!important;color:#fff!important;box-shadow:0 5px 18px rgba(220,38,38,.35)!important;transform:translateY(-2px)!important;}
html body dialog.mc-access .mc-access-close:hover svg{transform:rotate(90deg) scale(1.12)!important;}
html body dialog.mc-access .mc-access-close:active{transform:scale(.94)!important;}
html body dialog.mc-access .mc-access-close:focus-visible{outline:3px solid #f87171!important;outline-offset:3px!important;}
@media(prefers-reduced-motion:reduce){html body dialog.mc-access .mc-access-close,html body dialog.mc-access .mc-access-close svg{transition:none!important;}}
html body .mc-access-icon{display:grid;place-items:center;width:54px;height:54px;border-radius:17px;background:var(--monaco-soft,#e3f3ed);color:var(--monaco-accent,#08745e);border:1px solid color-mix(in srgb,var(--monaco-accent,#08745e) 18%,transparent);margin-bottom:20px;}
html body .mc-access-eyebrow{margin:0 0 8px!important;font-size:10px!important;font-weight:750!important;letter-spacing:1.5px!important;line-height:1.5!important;color:var(--monaco-accent,#08745e)!important;}
html body .mc-access #mc-access-title{margin:0 0 10px!important;font-size:27px!important;line-height:1.2!important;font-weight:720!important;letter-spacing:-.8px!important;color:var(--monaco-text,#1d1d1f)!important;-webkit-text-fill-color:currentColor!important;}
html body .mc-access #mc-access-description{margin:0!important;color:var(--monaco-muted,#5d6370)!important;font-size:14px!important;line-height:1.65!important;}
html body .mc-access-fields{margin:25px 0 0;}
html body .mc-access-label{display:block!important;margin:0 0 8px!important;color:var(--monaco-text,#1d1d1f)!important;font-size:13px!important;font-weight:650!important;line-height:1.5!important;}
html body .mc-access-input-wrap{position:relative;display:flex;align-items:center;}
html body .mc-access input{display:block!important;box-sizing:border-box!important;width:100%!important;min-width:0!important;height:52px!important;min-height:52px!important;margin:0!important;padding:0 48px 0 15px!important;border:1px solid var(--monaco-line,#d8dbe1)!important;border-radius:12px!important;background:var(--monaco-bg,#f5f5f7)!important;color:var(--monaco-text,#1d1d1f)!important;font-size:16px!important;line-height:1.5!important;box-shadow:none!important;outline:none!important;}
html body .mc-access input::placeholder{color:var(--monaco-muted,#5d6370)!important;opacity:.8;}
html body .mc-access input:focus{border-color:var(--monaco-accent,#08745e)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--monaco-accent,#08745e) 18%,transparent)!important;}
html body .mc-access input[aria-invalid=true]{border-color:#d94d64!important;}
html body .mc-access-reveal{position:absolute!important;right:7px!important;top:7px!important;display:grid!important;place-items:center!important;width:38px!important;height:38px!important;min-height:38px!important;min-width:38px!important;margin:0!important;padding:0!important;border:0!important;border-radius:8px!important;background:transparent!important;color:var(--monaco-muted,#5d6370)!important;}
html body .mc-access-reveal:hover{background:var(--monaco-secondary,#f0f1f4)!important;}
html body .mc-access-hint{margin:9px 0 0!important;font-size:12px!important;line-height:1.5!important;color:var(--monaco-muted,#5d6370)!important;}
html body .mc-access-confirm{margin-top:18px;}
html body .mc-access [hidden]{display:none!important;}
html body .mc-access-error{margin:18px 0 0!important;border:1px solid #d94d6440;border-radius:10px;padding:11px 13px!important;background:#d94d6412!important;color:#b62540!important;font-size:13px!important;line-height:1.5!important;}
html[data-theme=dark] body .mc-access-error{color:#ffabb9!important;}
html body .mc-access-actions{display:flex;gap:10px;margin-top:25px;}
html body .mc-access-actions button{display:flex!important;align-items:center!important;justify-content:center!important;gap:14px!important;min-height:48px!important;height:auto!important;margin:0!important;padding:13px 17px!important;border-radius:12px!important;font-size:14px!important;font-weight:650!important;line-height:1.4!important;}
html body .mc-access-cancel{flex:0 0 auto!important;border:1px solid var(--monaco-line,#d8dbe1)!important;background:transparent!important;color:var(--monaco-muted,#5d6370)!important;}
html body .mc-access-cancel:hover{background:var(--monaco-secondary,#f0f1f4)!important;}
html body .mc-access-submit{flex:1!important;border:1px solid #08745e!important;background:#08745e!important;color:#fff!important;}
html body .mc-access-submit:hover{background:#075e4d!important;}
html body .mc-access-submit:disabled{opacity:.65;cursor:wait;}
html body .mc-access button:focus-visible{outline:3px solid var(--monaco-focus,#0875d1)!important;outline-offset:3px!important;}
html body .mc-access-footer{display:flex;align-items:center;justify-content:center;gap:7px;margin:22px 0 0!important;padding-top:19px!important;border-top:1px solid var(--monaco-line,#d8dbe1);color:var(--monaco-muted,#5d6370)!important;font-size:11px!important;line-height:1.5!important;}
@media(max-width:480px){html body .mc-access-form{padding:23px!important;}html body .mc-access #mc-access-title{font-size:25px!important;}html body .mc-access-actions{flex-direction:column-reverse;}html body .mc-access-actions button{width:100%!important;}}
@media(prefers-reduced-motion:no-preference){html body dialog.mc-access[open]{animation:mc-access-enter .2s ease-out;}@keyframes mc-access-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}}
`;

/* Proteção de navegação: cancelar a senha não abre a área restrita. */
const liberados=new Set();
let repetindo=false;
if(typeof document!=='undefined'){
 document.addEventListener('click',async event=>{
  if(repetindo||!event.isTrusted)return;
  const target=event.target.closest('[data-module-group="garantia"] button, [data-module-group="compras"] button');
  if(!target)return;
  const group=target.closest('[data-module-group]'),modulo=group?.dataset.moduleGroup;
  if(!['garantia','compras'].includes(modulo)||liberados.has(modulo))return;
  event.preventDefault();event.stopImmediatePropagation();
  try{
   await autenticarModulo(modulo,{interativo:true});
   // Validar a sessão no servidor antes de revelar a navegação.
   await chamarModulo(modulo,{acao:'ler'});
   liberados.add(modulo);
   repetindo=true;try{target.click();}finally{repetindo=false;}
  }catch(err){
   if(err?.message!=='Acesso cancelado.')console.warn('Acesso ao módulo negado:',err?.message);
  }
 },true);
}
