// Estado de Compras e operações atômicas. O navegador nunca recebe a chave de criptografia.
export const COLECOES_COMPRAS=['compras_campanha_responsaveis','compras_campanha_indicadores','compras_campanha_importacoes','compras_campanha_ajustes_apuracao'];
const objeto=v=>v&&typeof v==='object'&&!Array.isArray(v);
const seguro=v=>!['__proto__','prototype','constructor'].includes(v);
export function validarBaseCompras(base){return base?.versao===1&&objeto(base.colecoes)&&COLECOES_COMPRAS.every(c=>objeto(base.colecoes[c])&&Object.entries(base.colecoes[c]).every(([id,d])=>id&&id.length<=700&&seguro(id)&&objeto(d)))&&objeto(base.exclusoes)&&objeto(base.alterados)&&objeto(base.migracao);}
export function validarOperacoesCompras(ops){return Array.isArray(ops)&&ops.length>0&&ops.length<=2000&&ops.every(o=>objeto(o)&&COLECOES_COMPRAS.includes(o.colecao)&&typeof o.id==='string'&&o.id.length>0&&o.id.length<=700&&seguro(o.id)&&['set','delete'].includes(o.tipo)&&(o.tipo==='delete'||objeto(o.dados))&&Object.keys(o.dados||{}).every(seguro));}
export function aplicarOperacoesCompras(base,ops,agora=new Date().toISOString()){
 if(!validarBaseCompras(base)||!validarOperacoesCompras(ops))throw Error('Operações de Compras inválidas.');
 const nova=structuredClone(base);
 for(const o of ops){const chave=o.colecao+'/'+o.id;
  if(o.tipo==='delete'){delete nova.colecoes[o.colecao][o.id];nova.exclusoes[chave]=agora;}
  else{nova.colecoes[o.colecao][o.id]={...(o.merge?nova.colecoes[o.colecao][o.id]||{}:{}),...o.dados,id:o.id};delete nova.exclusoes[chave];}
  nova.alterados[chave]=agora;
 }
 return nova;
}
export function mesclarLegadoCompras(base,legado){
 if(!validarBaseCompras(base)||!COLECOES_COMPRAS.every(c=>objeto(legado[c])))throw Error('Histórico legado inválido.');
 const nova=structuredClone(base),recebidos={},copiados={};
 const importacoesAlteradas=Object.entries(nova.colecoes.compras_campanha_importacoes).filter(([id])=>nova.alterados['compras_campanha_importacoes/'+id]).map(([,d])=>[d.competencia,d.tipoEfetivo||d.tipo]);
 for(const c of COLECOES_COMPRAS){recebidos[c]=Object.keys(legado[c]).length;copiados[c]=0;
  for(const [id,dados] of Object.entries(legado[c])){
   if(!seguro(id)||!objeto(dados))throw Error('Registro legado inválido.');
   const chave=c+'/'+id,atual=nova.colecoes[c][id];
   if(nova.exclusoes[chave]||nova.alterados[chave])continue;
   if(c==='compras_campanha_indicadores'&&importacoesAlteradas.some(([cp,tipo])=>cp===dados.competencia&&tipo===dados.tipoImportacao))continue;
   if(atual&&Date.parse(atual.atualizadoEm||'1970-01-01')>=Date.parse(dados.atualizadoEm||'1970-01-01'))continue;
   nova.colecoes[c][id]={...dados,id};copiados[c]++;
  }
 }
 nova.migracao={...nova.migracao,status:'concluida',concluidaEm:new Date().toISOString(),recebidos,copiados,erro:''};return nova;
}
