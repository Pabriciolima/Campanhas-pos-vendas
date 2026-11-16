// Somente anexos confirmados. PDFs originais nunca são enviados ao Storage.
export const PREFIXO_PIX='pix-importacoes-v1';
const referencias=d=>Object.values(d?.evidenciasImportacao?.diarias||{}).flat().concat(Object.values(d?.evidenciasImportacao?.semanais||{}).flat());
export function criarEvidenciasImportacaoPix(client,{compactar=compactarArquivoPix,agora=()=>Date.now()}={}){
 const bucket=client.storage.from('evidencias-produtivos');
 async function registros(){const todos=[];for(let offset=0;;offset+=500){const {data,error}=await client.from('pix_lancamentos').select('dados').order('id').range(offset,offset+499);if(error)throw error; todos.push(...(data||[]).map(r=>r.dados));if(!data||data.length<500)return todos;}}
 return {
 async preparar(lote,planos,{arquivos=[]}={}){
  const cache=new Map();
  async function guardar(desc){const key=desc.nome+'|'+(desc.pagina||1);if(cache.has(key))return cache.get(key);const tarefa=(async()=>{const file=arquivos.find(f=>f.name===desc.nome);if(!file)throw Error('Arquivo de evidência não encontrado: '+desc.nome);const blob=await compactar(file,desc.pagina||1),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join(''),caminho=`${PREFIXO_PIX}/${hash}.jpg`;const {error}=await bucket.upload(caminho,blob,{contentType:'image/jpeg',upsert:false});if(error&&!['409','Duplicate'].includes(String(error.statusCode))&&!/already exists|duplicate/i.test(error.message||''))throw error;return {caminho,nomeOriginal:desc.nome,pagina:desc.pagina||1,tipo:desc.tipo||'pdf'};})();cache.set(key,tarefa);return tarefa;}
  for(const r of lote){const p=planos[r.id],ant=r.dados.evidenciasImportacao||{};const refs={diarias:{...ant.diarias},semanais:{...ant.semanais}};for(const [campo,ds] of Object.entries(p)){if(campo==='data'||ds===null)continue;const anexos=await Promise.all(ds.map(guardar));if(campo==='diario')refs.diarias[p.data]=anexos;else refs.semanais[campo]=anexos;}r.dados.evidenciasImportacao=refs;}
  return lote;
 },
 async limpar(){
  // A carência protege uploads concorrentes. Uma leitura incompleta nunca autoriza exclusão.
  const itens=[];for(let offset=0;;offset+=500){const {data,error}=await bucket.list(PREFIXO_PIX,{limit:500,offset});if(error)throw error;itens.push(...(data||[]));if(!data||data.length<500)break;}
  const usados=new Set((await registros()).flatMap(referencias).map(r=>r.caminho));
  const apagar=itens.filter(i=>i.id&&/^[a-f0-9]{64}\.jpg$/.test(i.name)&&Date.parse(i.created_at)<agora()-86400000&&!usados.has(`${PREFIXO_PIX}/${i.name}`)).map(i=>`${PREFIXO_PIX}/${i.name}`);
  for(let i=0;i<apagar.length;i+=100){const {error}=await bucket.remove(apagar.slice(i,i+100));if(error)throw error;}
 },
 async listar(contexto){return (await registros()).filter(r=>r.competencia===contexto.competencia&&Number(r.semana)===Number(contexto.numeroSemana||String(contexto.semana).match(/[1-4]/)?.[0])&&(r.filial===contexto.filial||r.nucleoFiliais?.includes(contexto.filial))).flatMap(referencias).map(r=>({...r,nome:r.nomeOriginal,url:bucket.getPublicUrl(r.caminho).data.publicUrl}));}
 };
}
async function compactarArquivoPix(file,pagina){
 let fonte,destruir=()=>{};
 if(/\.pdf$/i.test(file.name)){const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';const tarefa=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});const pdf=await tarefa.promise,p=await pdf.getPage(pagina),v=p.getViewport({scale:1}),view=p.getViewport({scale:Math.min(2,1800/Math.max(v.width,v.height))}),canvas=document.createElement('canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);await p.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;fonte=canvas;destruir=()=>tarefa.destroy();}
 else{fonte=await createImageBitmap(file);destruir=()=>fonte.close();}
 try{const ratio=Math.min(1,1800/Math.max(fonte.width,fonte.height)),c=document.createElement('canvas');c.width=Math.round(fonte.width*ratio);c.height=Math.round(fonte.height*ratio);const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(fonte,0,0,c.width,c.height);return await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Falha ao compactar evidência.')),'image/jpeg',.82));}finally{await destruir();}
}
