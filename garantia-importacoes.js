// Evita duplicar bytes de imagens no registro de reversão; preserva o hash e tamanho da evidência.
const fontesComparaveis=items=>items.map(a=>({...a,...(a.imagem?{imagem:{sha256:a.sha256,tamanho:a.imagem.length}}:{})}));
// Reversão limitada às células ainda pertencentes à importação; edições posteriores são preservadas.
export function registrarImportacao(before,after,month,file){
 const a=before.competencias[month]||{metricas:{},participantes:[]},b=after.competencias[month];
 const registro={id:crypto.randomUUID(),arquivo:file,data:new Date().toISOString(),celulas:[],participantes:[]};
 for(const [scope,values] of Object.entries(b.metricas))for(const [field,value] of Object.entries(values)){
  if(['origem','desatualizado'].includes(field))continue;
  const old=a.metricas[scope]?.[field];if(JSON.stringify(old)!==JSON.stringify(value))registro.celulas.push({scope,field,antes:old===undefined?null:old,existia:old!==undefined,depois:value});
 }
 const key=p=>JSON.stringify([p.nome,p.perfil,p.filial]);
 for(const p of b.participantes){const old=a.participantes.find(x=>key(x)===key(p));if(JSON.stringify(old)!==JSON.stringify(p))registro.participantes.push({antes:old||null,depois:structuredClone(p)});}
 registro.metadados=[];for(const field of ['referenciaCampanha'])if(JSON.stringify(a[field])!==JSON.stringify(b[field]))registro.metadados.push({field,antes:a[field]??null,existia:a[field]!==undefined,depois:structuredClone(b[field])});
 const antesFonte=(a.auditoriaFontes||[]).filter(x=>x.arquivo===file),depoisFonte=(b.auditoriaFontes||[]).filter(x=>x.arquivo===file);if(JSON.stringify(antesFonte)!==JSON.stringify(depoisFonte))registro.fontes={antes:structuredClone(antesFonte),depois:fontesComparaveis(depoisFonte),formato:'imagem-hash-v1',existia:a.auditoriaFontes!==undefined};
 b.importacoes=[...(a.importacoes||[]),registro];return after;
}
export function removerImportacao(state,month,id){
 const next=structuredClone(state),m=next.competencias[month],imports=m.importacoes||[],i=imports.findIndex(x=>x.id===id);if(i<0)throw Error('Importação não encontrada.');
 if(imports.slice(i+1).some(x=>!x.removida))throw Error('Remova primeiro as importações mais recentes para preservar a sequência das alterações.');
 const r=imports[i];if(r.removida)throw Error('Importação já removida.');
 for(const c of r.celulas){const v=m.metricas[c.scope];if(v&&JSON.stringify(v[c.field])===JSON.stringify(c.depois)){if(c.existia)v[c.field]=c.antes;else delete v[c.field];}}
 for(const p of r.participantes){const i=m.participantes.findIndex(x=>JSON.stringify(x)===JSON.stringify(p.depois));if(i>=0){if(p.antes)m.participantes[i]=p.antes;else m.participantes.splice(i,1);}}
 for(const [k,v] of Object.entries(m.metricas)){if(!Object.keys(v).some(f=>!['origem','desatualizado'].includes(f)))delete m.metricas[k];else if(k==='GERAL'||k.startsWith('ANALISTA:'))v.desatualizado=true;}
 for(const c of r.metadados||[])if(JSON.stringify(m[c.field])===JSON.stringify(c.depois)){if(c.existia)m[c.field]=c.antes;else delete m[c.field];}
 if(r.fontes){const atuais=(m.auditoriaFontes||[]).filter(x=>x.arquivo===r.arquivo);if(JSON.stringify(r.fontes.formato==='imagem-hash-v1'?fontesComparaveis(atuais):atuais)===JSON.stringify(r.fontes.depois)){m.auditoriaFontes=[...(m.auditoriaFontes||[]).filter(x=>x.arquivo!==r.arquivo),...r.fontes.antes];if(!m.auditoriaFontes.length&&!r.fontes.existia)delete m.auditoriaFontes;}}
 m.validados={};r.removida=true;next.historico.push({data:new Date().toISOString(),competencia:month,acao:'Importação removida; conferências invalidadas',arquivo:r.arquivo});return next;
}
