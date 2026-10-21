/* Codificação por contexto de saída. Não altera os dados financeiros persistidos. */
export function escaparHtml(valor) {
 return String(valor ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function perfilValido(perfil, agora=Date.now()) {
 return !!(perfil && typeof perfil.nome==='string' && typeof perfil.filial==='string' &&
 Number.isFinite(perfil.expiresAt) && perfil.expiresAt>agora && perfil.expiresAt<=agora+8*60*60*1000);
}
export function nomeMinimizado(nome) {
 const partes=String(nome||'').trim().split(/\s+/).filter(Boolean);
 return partes.length>1 ? partes[0]+' '+partes.at(-1).charAt(0)+'.' : partes[0]||'';
}
