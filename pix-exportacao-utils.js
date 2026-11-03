// Recursos carregados somente sob demanda. Caches limitados e invalidados pela versão do arquivo.
export function cancelarSeNecessario(signal){if(signal?.aborted)throw new DOMException('Operação cancelada.','AbortError');}
export async function mapearLimitadoPix(itens,limite,fn){const saida=new Array(itens.length);let proximo=0;await Promise.all(Array.from({length:Math.min(limite,itens.length)},async()=>{while(proximo<itens.length){const i=proximo++;saida[i]=await fn(itens[i],i);}}));return saida;}
export function criarExecucaoUnicaPix(){let atual=null;return fn=>{if(atual)return atual;atual=Promise.resolve().then(fn).finally(()=>{atual=null;});return atual;};}
export function versaoArquivoPix(a){return a.updated_at||a.etag?JSON.stringify([a.caminho||a.url,a.id||'',a.updated_at||'',a.etag||'',a.tamanho||0]):'';}
const cacheBlobs=new Map();let bytesCache=0;const MAX_BYTES=24*1024*1024;
export function limparCacheImagensPix(){cacheBlobs.clear();bytesCache=0;}
export async function carregarBlobPix(arquivo,{signal,assets=new Map()}={}){
 cancelarSeNecessario(signal);const versao=versaoArquivoPix(arquivo),key=versao||arquivo.url;
 if(versao&&cacheBlobs.has(key)){const blob=cacheBlobs.get(key);cacheBlobs.delete(key);cacheBlobs.set(key,blob);return blob;}
 if(assets.has(key))return assets.get(key);
 const tarefa=(async()=>{const timeout=AbortSignal.timeout(25000),sinal=signal?AbortSignal.any([signal,timeout]):timeout;const r=await fetch(arquivo.url,{cache:versao?'default':'no-store',signal:sinal});if(!r.ok)throw new Error('Não foi possível baixar uma evidência.');const blob=await r.blob();cancelarSeNecessario(signal);if(blob.size>20*1024*1024||!blob.type.startsWith('image/'))throw new Error('Formato ou tamanho de evidência não suportado.');
 if(versao&&blob.size<=MAX_BYTES){while(cacheBlobs.size>=16||bytesCache+blob.size>MAX_BYTES){const old=cacheBlobs.keys().next().value;bytesCache-=cacheBlobs.get(old).size;cacheBlobs.delete(old);}cacheBlobs.set(key,blob);bytesCache+=blob.size;}return blob;})();
 assets.set(key,tarefa);while(assets.size>16)assets.delete(assets.keys().next().value);try{return await tarefa;}catch(e){assets.delete(key);throw e;}
}
export function cederTelaPix(){return new Promise(resolve=>setTimeout(resolve,0));}
export function compactarOcrPix(data){return {blocks:(data.blocks||[]).map(b=>({paragraphs:(b.paragraphs||[]).map(p=>({lines:(p.lines||[]).map(l=>({words:(l.words||[]).map(w=>({text:w.text,confidence:w.confidence,bbox:w.bbox}))}))}))}))};}
export function aguardarCancelavelPix(promessa,signal,aposCancelar){return new Promise((resolve,reject)=>{const abortar=()=>reject(new DOMException('Operação cancelada.','AbortError'));signal?.addEventListener('abort',abortar,{once:true});if(signal?.aborted)abortar();Promise.resolve(promessa).then(v=>{if(signal?.aborted)aposCancelar?.(v);else resolve(v);},reject).finally(()=>signal?.removeEventListener('abort',abortar));});}
