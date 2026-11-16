const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderizarCartoesPix(itens){
 return itens.map(i=>'<figure class="pin-attachment"><div class="pin-attachment-thumb">'+(i.preview?'<img src="'+esc(i.preview)+'" alt="Miniatura de '+esc(i.nome)+'" loading="lazy">':'<span class="pin-attachment-placeholder" aria-hidden="true">'+(i.grupo==='pdf'?'PDF':'IMG')+'</span>')+'</div><figcaption><span class="pin-attachment-type">'+esc(i.tipo|| (i.grupo==='pdf'?'PDF':'Imagem NPS'))+'</span><strong title="'+esc(i.nome)+'">'+esc(i.nome)+'</strong><small>'+esc(i.tamanho)+(i.paginas?' · '+i.paginas+' pág.':'')+'</small><span class="pin-attachment-state '+(i.estado==='erro'?'is-error':'')+'">'+esc(i.estado==='pronto'?'✓ Arquivo lido':i.estado==='erro'?'Falha na leitura · selecione novamente':'Lendo arquivo…')+'</span></figcaption></figure>').join('');
}
export function criarMiniaturasPix({render=()=>{},urlApi=URL}={}){
 let itens=[];
 const avisar=()=>render(itens);
 const revogar=i=>{if(i.urlLocal)urlApi.revokeObjectURL(i.urlLocal);};
 return {
 selecionar(files,grupo){for(const file of files){const antigo=itens.find(i=>i.nome===file.name&&i.grupo===grupo);if(antigo){revogar(antigo);itens=itens.filter(i=>i!==antigo);}const urlLocal=grupo==='pdf'?'':urlApi.createObjectURL(file);itens.push({nome:file.name,grupo,urlLocal,preview:urlLocal,estado:'lendo',tamanho:file.size>=1048576?(file.size/1048576).toFixed(1)+' MB':Math.max(1,Math.round(file.size/1024))+' KB'});}avisar();},
 atualizar(nome,grupo,dados){const i=itens.find(i=>i.nome===nome&&i.grupo===grupo);if(i)Object.assign(i,dados);avisar();},
 removerGrupo(grupo){itens.filter(i=>i.grupo===grupo).forEach(revogar);itens=itens.filter(i=>i.grupo!==grupo);avisar();},
 limpar(){itens.forEach(revogar);itens=[];avisar();}
 };
}
