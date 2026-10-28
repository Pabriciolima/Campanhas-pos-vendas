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
export async function lerPrintsABC(files,onProgress=()=>{}){
 if(!files.length||files.length>8)throw Error('Selecione de 1 a 8 prints por vez.');
 if(files.some(f=>!/^image\/(png|jpeg|webp)$/.test(f.type)||f.size>10*1024*1024))throw Error('Use imagens PNG, JPG ou WebP de até 10 MB cada.');
 const T=await engine(),rows=[];let worker;
 try{worker=await T.createWorker('por',1,{logger:m=>{if(m.status==='recognizing text')onProgress('Lendo print: '+Math.round(m.progress*100)+'%');}});await worker.setParameters({tessedit_pageseg_mode:'6'});
  for(const [i,file] of files.entries()){
   onProgress(`Print ${i+1} de ${files.length}: ${file.name}`);
   const bitmap=await createImageBitmap(file);
   try{if(bitmap.width*bitmap.height>16000000||bitmap.width<250)throw Error('O print precisa ter largura mínima de 250 pixels e até 16 milhões de pixels.');const c=document.createElement('canvas'),scale=Math.min(3,2000/bitmap.width);c.width=Math.round(bitmap.width*scale);c.height=Math.round(bitmap.height*scale);const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(bitmap,0,0,c.width,c.height);const result=await worker.recognize(c);rows.push(...interpretarPrintABC(result.data.text,file.name));}finally{bitmap.close();}
  }
  return rows;
 }finally{if(worker)await worker.terminate();}
}
