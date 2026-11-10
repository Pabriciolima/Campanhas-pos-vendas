/* Modelo oficial premium do PIX: mesmas colunas do importador, com listas e legenda. */
(()=>{'use strict';
const CARGOS=['Consultor Técnico','Supervisor de Assistência','Consultor Peças Balcão','Supervisor Peças','Supervisor Pós-vendas','Coordenador','Gerente','Orçamentista / Facilitador de Negócios'];
const DNS=['4700','4731','1960','4730','4730F','4756','4738','1928','4774','4977','4977F','1970'];
const BASE=['Vendedor','Cargo','Filial','DN','Meta semanal','Ticket médio','Margem realizada (%)','Meta de NPS','NPS realizado','O.S. em aberto (%)'];
const COLORS={green:'0D806B',blue:'3167A8',purple:'7154BA',dark:'10263A',white:'FFFFFF'};
let loading;
function excelJS(){if(window.ExcelJS)return Promise.resolve(window.ExcelJS);if(loading)return loading;loading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';script.onload=()=>window.ExcelJS?resolve(window.ExcelJS):reject(Error('Biblioteca Excel indisponível'));script.onerror=()=>reject(Error('Falha ao carregar biblioteca Excel'));document.head.appendChild(script)});return loading;}
function competencia(){const input=document.querySelector('#pixCompetencia, #pixCompetenciaSelecionada, [data-pix-competencia]');const val=input?.value||input?.dataset?.pixCompetencia||'';const m=String(val).match(/(20\d{2})-(0[1-9]|1[0-2])/);return m?{ano:+m[1],mes:+m[2]}:{ano:new Date().getFullYear(),mes:new Date().getMonth()+1};}
function header(cell,fill){cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+fill}};cell.font={bold:true,color:{argb:'FFFFFFFF'},size:11};cell.alignment={vertical:'middle',wrapText:true};cell.border={bottom:{style:'medium',color:{argb:'FF'+COLORS.dark}}};}
async function baixar(){
 const ExcelJS=await excelJS(), wb=new ExcelJS.Workbook(), {ano,mes}=competencia();
 wb.creator='Campanhas Pós-Vendas · Grupo Mônaco';wb.subject='Modelo oficial de importação PIX';
 const sh=wb.addWorksheet('LANÇAMENTOS',{views:[{state:'frozen',ySplit:1}]});
 const dias=[];for(let d=1;d<=new Date(ano,mes,0).getDate();d++)if(new Date(ano,mes-1,d).getDay()!==0)dias.push(String(d).padStart(2,'0')+'/'+String(mes).padStart(2,'0')+' realizado');
 const nomes=[...BASE,...dias];sh.columns=nomes.map((n,i)=>({header:n,key:'c'+i,width:i===0?34:i===1?49:i===2?29:i===3?15:21}));
 sh.getRow(1).height=40;sh.autoFilter={from:'A1',to:sh.getRow(1).getCell(nomes.length).address};
 sh.getRow(1).eachCell((cell,i)=>header(cell,i<=5?COLORS.green:i<=10?COLORS.blue:COLORS.purple));
 for(let row=2;row<=301;row++){
  const rr=sh.getRow(row);rr.height=24;
  for(let col=1;col<=nomes.length;col++){
   const cell=rr.getCell(col);
   cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+(col<=5?'E6F7F0':col<=10?'EAF3FD':'F3EEFF')}};
   cell.font={color:{argb:'FF18354C'},size:10};
   cell.border={bottom:{style:'hair',color:{argb:'FFDCE5ED'}}};
   if(col===4)cell.numFmt='@';
   if(col===5||col===6||col>10)cell.numFmt='"R$" #,##0.00';
   if(col>=7&&col<=10)cell.numFmt='0.0"%"';
  }
  rr.getCell(2).dataValidation={type:'list',allowBlank:true,formulae:['"'+CARGOS.join(',')+'"'],showErrorMessage:true,errorTitle:'Cargo não reconhecido',error:'Selecione um cargo da lista.'};
  rr.getCell(4).dataValidation={type:'list',allowBlank:true,formulae:['"'+DNS.join(',')+'"'],showErrorMessage:true,errorTitle:'DN não reconhecido',error:'Selecione um DN da lista.'};
 }
 const listas=wb.addWorksheet('LISTAS DE SELEÇÃO');listas.columns=[{header:'CARGOS OFICIAIS PIX',width:50},{header:'DN DAS FILIAIS',width:24}];listas.getRow(1).height=33;listas.getRow(1).eachCell(c=>header(c,COLORS.dark));
 for(let i=0;i<Math.max(CARGOS.length,DNS.length);i++){let row=listas.getRow(i+2);row.getCell(1).value=CARGOS[i]||'';row.getCell(2).value=DNS[i]||'';row.height=25;row.eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEAF3F9'}};c.font={color:{argb:'FF16324B'}};});}
 const guia=wb.addWorksheet('COMO PREENCHER');guia.columns=[{width:36},{width:25},{width:100}];guia.mergeCells('A1:C1');guia.getCell('A1').value='PIX DO PRESIDENTE · MODELO OFICIAL';guia.getCell('A1').font={bold:true,color:{argb:'FFFFFFFF'},size:18};guia.getCell('A1').fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+COLORS.dark}};guia.getRow(1).height=48;
 const rows=[['IDENTIFICAÇÃO','VERDE','Preencha vendedor, cargo, filial, DN e meta semanal.'],['INDICADORES','AZUL','Preencha os indicadores aplicáveis ao cargo conforme a política.'],['REALIZADO DIÁRIO','ROXO','Preencha os valores realizados nos dias correspondentes.'],['LISTAS','SELEÇÃO','Use as setas de Cargo e DN, sem digitação livre.'],['IMPORTANTE','VALIDAÇÃO','Não renomeie as colunas ou abas. Mantenha valores numéricos sem texto nas células.']];
 guia.addRow([]);guia.addRow(['ÁREA','COR','ORIENTAÇÃO']);guia.getRow(3).eachCell(c=>header(c,COLORS.dark));
 rows.forEach((arr,i)=>{let row=guia.addRow(arr);row.height=30;row.eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+(i===0?'E6F7F0':i===1?'EAF3FD':i===2?'F3EEFF':'F1F5F9')}};c.alignment={vertical:'middle',wrapText:true};});});
 const bytes=await wb.xlsx.writeBuffer();const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='PIX-PREENCHIMENTO-PREMIUM-'+ano+'-'+String(mes).padStart(2,'0')+'.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
document.addEventListener('click',async e=>{const btn=e.target.closest('#btnBaixarModeloRelatorioPix');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();if(btn.disabled)return;btn.disabled=true;const old=btn.textContent;btn.textContent='Preparando Excel premium…';try{await baixar()}catch(err){console.error('[PIX] Modelo premium:',err);alert('Não foi possível gerar o modelo premium. Verifique sua conexão e tente novamente.')}finally{btn.disabled=false;btn.textContent=old;}},true);
})();