import {interpretarOcrNps,interpretarOcrNpsGeral} from './pix-importacao-nps-core.js?v=20261116-s4geral2';
import {normalizar} from './pix-importacao-core.js?v=20261116-confirmar2';
let biblioteca;
async function engine(){if(window.Tesseract?.createWorker)return window.Tesseract;if(!biblioteca)biblioteca=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';s.crossOrigin='anonymous';const timer=setTimeout(()=>{biblioteca=null;s.remove();reject(Error('O leitor de NPS demorou para carregar. Tente novamente.'));},30000);s.onload=()=>{clearTimeout(timer);resolve(window.Tesseract);};s.onerror=()=>{clearTimeout(timer);biblioteca=null;reject(Error('Não foi possível carregar a leitura de NPS.'));};document.head.append(s);});return biblioteca;}
function palavras(data){if(data.words)return data.words;return (data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>(p.lines||[]).flatMap(l=>l.words||[])));}
export function localizarFaixaCabecalho(data,w,h){
 let inicio=-1;
 for(let y=0;y<h;y++){
  let n=0;for(let x=0;x<w;x++){const i=(y*w+x)*4,r=data[i],g=data[i+1],b=data[i+2];if((r+g+b)/3<190&&Math.max(r,g,b)-Math.min(r,g,b)>35)n++;}
  if(n>w*.5){if(inicio<0)inicio=y;}else if(inicio>=0){if(y-inicio>=8)return {top:inicio,bottom:y};inicio=-1;}
 }
 throw Error('Não identifiquei o cabeçalho colorido da tabela. Envie o print completo, com os nomes das colunas.');
}
export async function lerImagemNps(file,competencia,informar=()=>{}){
 if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>12*1024*1024)throw Error('Envie o NPS em JPG, PNG ou WebP, até 12 MB.');
 const image=await createImageBitmap(file);let worker;
 try{
  if(image.width<900||image.width*image.height>16000000)throw Error('Use uma imagem nítida, com largura mínima de 900 pixels.');
  const origem=document.createElement('canvas');origem.width=image.width;origem.height=image.height;const ctx=origem.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const faixa=localizarFaixaCabecalho(ctx.getImageData(0,0,image.width,image.height).data,image.width,image.height);
  const escala=Math.min(3,4500/image.width,Math.sqrt(24000000/(image.width*image.height))),canvas=document.createElement('canvas');canvas.width=Math.round(image.width*escala);canvas.height=Math.round(image.height*escala);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  const header=document.createElement('canvas');header.width=canvas.width;header.height=Math.round((faixa.bottom-faixa.top+2)*escala);const hc=header.getContext('2d',{willReadFrequently:true});hc.drawImage(image,0,faixa.top,image.width,faixa.bottom-faixa.top+2,0,0,header.width,header.height);
  const pixels=hc.getImageData(0,0,header.width,header.height);for(let i=0;i<pixels.data.length;i+=4){const v=255-(pixels.data[i]*.299+pixels.data[i+1]*.587+pixels.data[i+2]*.114);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v>90?255:0;}hc.putImageData(pixels,0,0);
  informar('Carregando leitor de NPS…');const T=await engine();worker=await T.createWorker('eng',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',logger:m=>{if(m.status==='recognizing text')informar('Lendo NPS · '+Math.round(m.progress*100)+'%');}});
  await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});
  const head=await worker.recognize(header,{}, {blocks:true,text:true}),body=await worker.recognize(canvas,{}, {blocks:true,text:true});
  const words=palavras(head.data).map(w=>({...w,bbox:{...w.bbox,y0:w.bbox.y0+faixa.top*escala,y1:w.bbox.y1+faixa.top*escala}}));
  return interpretarOcrNps(words,palavras(body.data),competencia,file.name);
 }finally{image.close();if(worker)await worker.terminate();}
}


export async function lerImagemNpsGeral(file,competencia,semana,informar=()=>{}) {
 if(Number(semana)!==4)throw Error('O NPS geral das filiais só pode ser importado na Semana 4.');
 if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>12*1024*1024)throw Error('Envie o painel de NPS em JPG, PNG ou WebP, até 12 MB.');
 const image=await createImageBitmap(file);let worker;
 try{
  if(image.width<900||image.width*image.height>16000000)throw Error('Envie uma imagem nítida com largura mínima de 900 pixels.');
  const escala=Math.min(3,4500/image.width,Math.sqrt(24000000/(image.width*image.height)));
  const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*escala);canvas.height=Math.round(image.height*escala);
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
  for(let i=0;i<pixels.data.length;i+=4){const v=255-(pixels.data[i]*.299+pixels.data[i+1]*.587+pixels.data[i+2]*.114);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v>140?255:0;}ctx.putImageData(pixels,0,0);
  informar('Lendo painel de NPS geral da Semana 4…');const T=await engine();worker=await T.createWorker('eng',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',logger:m=>{if(m.status==='recognizing text')informar('Lendo painel S4 · '+Math.round(m.progress*100)+'%');}});
  await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});
  const body=await worker.recognize(canvas,{}, {blocks:true,text:true}),bodyWords=palavras(body.data);
  const anchor=bodyWords.find(w=>normalizar(w.text)==='CONCESSIONARIA');
  if(!anchor)throw Error('Envie o painel NPS POR UNIDADE completo, incluindo o cabeçalho CONCESSIONÁRIA.');
  const gerado=bodyWords.find(w=>normalizar(w.text)==='GERADO');
  if(!gerado)throw Error('O cabeçalho do painel está incompleto. Inclua as colunas de NPS e GERADO.');
  const altura=anchor.bbox.y1-anchor.bbox.y0,top=Math.max(0,Math.floor(anchor.bbox.y0-altura*1.5)),bottom=Math.min(canvas.height,Math.ceil(anchor.bbox.y1+altura*1.2));
  const left=Math.max(0,Math.floor((anchor.bbox.x1+gerado.bbox.x0)/2-altura*.5)),right=Math.ceil(gerado.bbox.x0);
  const header=document.createElement('canvas');header.width=right-left;header.height=bottom-top;header.getContext('2d').drawImage(canvas,left,top,right-left,bottom-top,0,0,header.width,header.height);
  const head=await worker.recognize(header,{}, {blocks:true,text:true});
  const hs=[anchor,gerado,...palavras(head.data).map(w=>({...w,bbox:{...w.bbox,x0:w.bbox.x0+left,x1:w.bbox.x1+left,y0:w.bbox.y0+top,y1:w.bbox.y1+top}}))];
  return interpretarOcrNpsGeral(hs,bodyWords,competencia,file.name);
 }finally{image.close();if(worker)await worker.terminate();}
}
