// Leitura local de prints ABC: nenhum percentual é estimado ou enviado a uma IA paga.
const normalizar=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
export const CASAS_ABC=[
 ['Fiat Pará',['Fiat Altamira Nova','Fiat Br','Fiat Doca']],
 ['Fiat Centro Oeste',['Fiat Barra Do Garças','Fiat Jatai','Fiat Mineiros','Fiat Primavera','Fiat Rondonopolis']],
 ['D. Rondônia',['D. Ji Parana','D. Porto Velho','D. Vilhena']],
 ['D. Piauí',['D. Teresina','D. Uruçuí']],
 ['D. Pará',['D. Ananindeua','D. Macapá']],
 ['D. Mato Grosso',['D. Agua Boa','D. Cuiabá','D. Rondonopolis','D. Sinop']],
 ['D. Maranhão',['D. São Luís','D. Bacabal']],
 ['Monaco Veículos JEEP RAM - Barra Do Garças',['JEEP RAM - Barra Do Garças']],
 ['Mônaco LEAPMOTOR - Belém',['Mônaco LEAPMOTOR - Belém']]
].flatMap(([nucleo,casas])=>casas.map(unidade=>({nucleo,unidade})));
const totais=['FIAT PARA','FIAT CENTRO OESTE','D RONDONIA','D PIAUI','D PARA','D MATO GROSSO','M AMAPA','D MARANHAO','MONACO VEICULOS JEEP','MONACO LEAPMOTOR','TOTAL'];
export function interpretarPrintABC(texto,arquivo){
 const rows=[];
 for(const [i,line] of texto.split('\n').entries()){
  const matches=[...line.matchAll(/(?<![\d.,])(\d+(?:[,.]\d+)?)\s*%/g)];
  if(!matches.length)continue;
  const nome=line.slice(0,matches[0].index).replace(/^[^\p{L}]+/u,'').trim(),n=normalizar(nome).replace(/^(?:B B|BS|BP|B|OD) /,'');
  if(totais.some(t=>n===t||t.startsWith('MONACO')&&n.startsWith(t)))continue;
  const casa=CASAS_ABC.find(c=>normalizar(c.unidade)===n||normalizar(c.unidade.replace(/^Mônaco /,''))===n);
  rows.push({unidade:casa?.unidade||'',nucleo:casa?.nucleo||'',nomeLido:nome,arquivo,linha:i+1,valores:[0,1,2,3].map(j=>{const v=matches[j]?Number(matches[j][1].replace(',','.')):NaN;return Number.isFinite(v)&&v>=0&&v<=100?v:null;})});
 }
 if(!rows.length)throw Error('Não foi possível ler linhas ABC neste print. Use uma imagem nítida com nome da unidade e as quatro colunas A, B, C e Total.');
 return rows;
}
export function consolidarPrintsABC(rows){
 const casas=new Map();
 for(const r of rows){
  const casa=CASAS_ABC.find(c=>c.unidade===r.unidade);
  if(!casa||r.valores.length!==4||r.valores.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>100))throw Error('Confira a unidade e os quatro percentuais de todas as linhas.');
  const key=normalizar(casa.unidade),anterior=casas.get(key);
  if(anterior){if(anterior.valores.some((v,i)=>v!==r.valores[i]))throw Error('Percentuais divergentes para '+casa.unidade+'. Corrija ou remova a linha duplicada antes de continuar.');anterior.fontes.push(r.arquivo);}
  else casas.set(key,{...casa,valores:[...r.valores],fontes:[r.arquivo]});
 }
 if(!casas.size)throw Error('Inclua ao menos uma unidade.');
 return [...casas.values()];
}
let loading;
async function engine(){if(window.Tesseract)return window.Tesseract;if(!loading)loading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';const timer=setTimeout(()=>{loading=null;s.remove();reject(Error('A leitura de imagens não carregou. Verifique a conexão.'));},30000);s.onload=()=>{clearTimeout(timer);resolve(window.Tesseract);};s.onerror=()=>{clearTimeout(timer);loading=null;s.remove();reject(Error('Não foi possível carregar o leitor de imagens.'));};document.head.append(s);});return loading;}

// Cada célula é lida isoladamente: uma falha em B nunca desloca C ou Total.
export function interpretarCelulaABC(texto){
 const t=String(texto).replace(/\s/g,'');
 if(!/^\d{1,3}(?:[,.]\d{2})?%?$/.test(t))return null;
 const v=Number(t.replace('%','').replace(',','.'));
 return Number.isFinite(v)&&v>=0&&v<=100?v:null;
}
export function conciliarCelulaABC(leituras){
 const validas=leituras.filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100);
 const votos=new Map();for(const v of validas)votos.set(v,(votos.get(v)||0)+1);
 const melhor=[...votos].sort((a,b)=>b[1]-a[1])[0];
 // Um resultado legível não é descartado por outras tentativas vazias ou fora da faixa.
 // Leituras válidas contraditórias exigem maioria ou conferência manual.
 return melhor&&(votos.size===1||melhor[1]>=2)?melhor[0]:null;
}
export function localizarCabecalhoABC(data,scale=1){
 const words=data.words||[];
 for(const total of words.filter(w=>normalizar(w.text)==='TOTAL')){
  const cy=(total.bbox.y0+total.bbox.y1)/2;
  const nearby=words.filter(w=>Math.abs((w.bbox.y0+w.bbox.y1)/2-cy)<Math.max(10,(total.bbox.y1-total.bbox.y0)*.7));
  const abc=['A','B','C'].map(l=>nearby.find(w=>normalizar(w.text)===l||l==='C'&&normalizar(w.text)==='CC'));
  if(abc.some(w=>!w))continue;
  const centers=[...abc,total].map(w=>(w.bbox.x0+w.bbox.x1)/2/scale);
  const gaps=centers.slice(1).map((c,i)=>c-centers[i]);
  if(gaps.some(g=>g<=0)||Math.max(...gaps)/Math.min(...gaps)>1.5)continue;
  const edges=[centers[0]-gaps[0]/2,...centers.slice(1).map((c,i)=>(c+centers[i])/2),centers[3]+gaps[2]/2];
  return {edges,bottom:Math.max(...[...abc,total].map(w=>w.bbox.y1))/scale};
 }
 throw Error('Não foi possível localizar as colunas A, B, C e Total. Envie o cabeçalho junto com a tabela.');
}
export function detectarLinhasABC(pixels,width,height,{edges,bottom}){
 const left=Math.ceil(edges[0]+3),right=Math.min(width-1,Math.floor(edges[4]-2)),span=right-left;
 const bands=[];let start=-1,last=-1;
 for(let y=Math.ceil(bottom+2);y<height;y++){
  let dark=0;for(let x=left;x<right;x++){const i=(y*width+x)*4;if(pixels[i]*.299+pixels[i+1]*.587+pixels[i+2]*.114<150)dark++;}
  const ink=dark>=Math.max(4,span*.02)&&dark<span*.65;
  if(ink){if(start<0)start=y;last=y;}
  else if(start>=0&&y-last>2){if(last-start>=3)bands.push({top:start,bottom:last+1});start=-1;}
 }
 if(start>=0&&last-start>=3)bands.push({top:start,bottom:last+1});
 if(!bands.length||bands.length>100)throw Error('Não foi possível separar as linhas da tabela. Use um print completo, nítido e sem sobreposição.');
 return bands;
}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);return c;}
function empilharCelulas(original,grade,bands,variant){
 const stride=76,c=canvas(260,bands.length*4*stride),ctx=c.getContext('2d',{willReadFrequently:true});
 for(const [r,b] of bands.entries())for(let col=0;col<4;col++){
  const x=grade.edges[col]+1,w=grade.edges[col+1]-x-1,h=b.bottom-b.top+4,scale=Math.min(4.2,220/w,60/h);
  ctx.drawImage(original,x,b.top-2,w,h,16,(r*4+col)*stride+8,w*scale,h*scale);
 }
 const d=ctx.getImageData(0,0,c.width,c.height);
 for(let i=0;i<d.data.length;i+=4){let v=.299*d.data[i]+.587*d.data[i+1]+.114*d.data[i+2];v=variant===0?Math.max(0,Math.min(255,(v-128)*1.8+128)):v<175?0:255;d.data[i]=d.data[i+1]=d.data[i+2]=v;}
 ctx.putImageData(d,0,0);return {c,stride};
}
export function mapearCelulasABC(data,stride,count){
 const slots=Array.from({length:count},()=>[]);
 for(const word of data.words||[]){const idx=Math.floor((word.bbox.y0+word.bbox.y1)/2/stride);if(idx>=0&&idx<count)slots[idx].push(word);}
 return slots.map(words=>{words.sort((a,b)=>a.bbox.x0-b.bbox.x0);const text=words.map(w=>w.text).join('');return interpretarCelulaABC(text);});
}
function nomeCasaABC(nome){
 const n=normalizar(nome).replace(/^(?:B B|BS|BP|B|OD) /,'').replace(/^D RONDDNIA$/,'D RONDONIA');
 if(totais.some(t=>n===t||t.startsWith('MONACO')&&n.startsWith(t)))return {total:true};
 // Somente variantes conhecidas de grafia; não há correspondência aproximada entre casas.
 const aliases={'FIAT BARRA DO GARGAS':'FIAT BARRA DO GARCAS','D URUGUI':'D URUCUI','D AQUA BOA':'D AGUA BOA','JEEP RAM BARRA DO':'JEEP RAM BARRA DO GARCAS'};
 const key=aliases[n]||n;
 return {casa:CASAS_ABC.find(c=>normalizar(c.unidade)===key||normalizar(c.unidade.replace(/^Mônaco /,''))===key)};
}
async function lerGradeABC(worker,original,arquivo,onProgress){
 const scale=Math.min(3,2000/original.width),full=canvas(Math.round(original.width*scale),Math.round(original.height*scale));
 full.getContext('2d').drawImage(original,0,0,full.width,full.height);
 await worker.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:''});
 const initial=(await worker.recognize(full)).data,grade=localizarCabecalhoABC(initial,scale);
 const ctx=original.getContext('2d',{willReadFrequently:true}),bands=detectarLinhasABC(ctx.getImageData(0,0,original.width,original.height).data,original.width,original.height,grade);
 // Recortes dos nomes usam a mesma linha física dos números, incluindo nomes quebrados.
 const nameStride=100,names=canvas(700,bands.length*nameStride),nc=names.getContext('2d');
 for(const [i,b] of bands.entries()){
  const h=b.bottom-b.top+6,w=grade.edges[0]-4,scale=Math.min(4,650/w,80/h);
  nc.drawImage(original,3,b.top-3,w,h,12,i*nameStride+8,w*scale,h*scale);
 }
 const labels=(await worker.recognize(names)).data,byName=Array.from({length:bands.length},()=>[]);
 for(const word of labels.words||[]){const i=Math.floor((word.bbox.y0+word.bbox.y1)/2/nameStride);if(i>=0&&i<byName.length)byName[i].push(word);}
 const namesText=byName.map(words=>words.sort((a,b)=>a.bbox.x0-b.bbox.x0).map(w=>w.text).join(' '));
 await worker.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:'0123456789.,%'});
 const passes=[];
 for(let v=0;v<2;v++){onProgress('Conferindo células ABC — passagem '+(v+1)+' de 2');const batch=empilharCelulas(original,grade,bands,v);passes.push(mapearCelulasABC((await worker.recognize(batch.c)).data,batch.stride,bands.length*4));}
 // Células discordantes recebem uma terceira leitura em linha única e escala maior.
 const terceira=new Map();
 await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'0123456789.,%'});
 for(let slot=0;slot<bands.length*4;slot++){
  const a=passes[0][slot],b=passes[1][slot];if(a!==null&&a===b)continue;
  const row=bands[Math.floor(slot/4)],col=slot%4,w=grade.edges[col+1]-grade.edges[col]-2,h=row.bottom-row.top+6;
  const cell=canvas(Math.ceil(w*6+40),Math.ceil(h*6+40)),cc=cell.getContext('2d');
  cc.drawImage(original,grade.edges[col]+1,row.top-3,w,h,20,20,w*6,h*6);
  const v=interpretarCelulaABC((await worker.recognize(cell)).data.text);
  terceira.set(slot,v);
 }
 const rows=[];
 for(const [i,b] of bands.entries()){
  let nome=namesText[i],resolved=nomeCasaABC(nome);
  // O OCR da tabela inteira ajuda somente a identificar nomes; nunca substitui números isolados.
  if(!resolved.total&&!resolved.casa){const line=(initial.lines||[]).find(l=>Math.abs((l.bbox.y0+l.bbox.y1)/2/scale-(b.top+b.bottom)/2)<6);if(line){const prefix=line.text.split(/\d/)[0].replace(/\|/g,'').trim(),alt=nomeCasaABC(prefix);if(alt.total||alt.casa){nome=prefix;resolved=alt;}}}
  if(resolved.total)continue;
  const valores=[0,1,2,3].map(col=>{const slot=i*4+col,a=passes[0][slot],b=passes[1][slot],c=terceira.get(slot);return conciliarCelulaABC([a,b,c]);});
  rows.push({unidade:resolved.casa?.unidade||'',nucleo:resolved.casa?.nucleo||'',nomeLido:nome,arquivo,linha:i+1,valores,leitura:'Células isoladas · dupla leitura e desempate',pendencias:valores.some(v=>v===null)});
 }
 if(!rows.length)throw Error('Nenhuma casa foi identificada. Envie um print com as linhas das unidades.');
 return rows;
}
export async function lerPrintsABC(files,onProgress=()=>{}){
 if(!files.length||files.length>8)throw Error('Selecione de 1 a 8 prints por vez.');
 if(files.some(f=>!/^image\/(png|jpeg|webp)$/.test(f.type)||f.size>10*1024*1024))throw Error('Use imagens PNG, JPG ou WebP de até 10 MB cada.');
 const T=await engine(),rows=[];let worker;
 try{
  // Inglês é usado para algarismos e sinais; os nomes são normalizados sem acentos.
  worker=await T.createWorker('eng',1,{logger:m=>{if(m.status==='recognizing text')onProgress('Lendo tabela: '+Math.round(m.progress*100)+'%');}});
  for(const [i,file] of files.entries()){
   onProgress(`Print ${i+1} de ${files.length}: ${file.name}`);const bitmap=await createImageBitmap(file);
   try{if(bitmap.width*bitmap.height>16000000||bitmap.width<250)throw Error('O print precisa ter largura mínima de 250 pixels e até 16 milhões de pixels.');const original=canvas(bitmap.width,bitmap.height);original.getContext('2d').drawImage(bitmap,0,0);rows.push(...await lerGradeABC(worker,original,file.name,onProgress));}finally{bitmap.close();}
  }
  return rows;
 }finally{if(worker)await worker.terminate();}
}
