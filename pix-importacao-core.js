// Leitura e consolidação independentes da interface e da gravação.
export const normalizar = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
export const centavos = n => Math.round((n + Number.EPSILON) * 100) / 100;
export function numeroBR(v) {
 const t=String(v??'').replace(/R\$|%|\s/g,'');
 if(!/^-?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}$/.test(t))return null;
 return Number(t.replace(/\./g,'').replace(',','.'));
}
export function cargoTipo(cargo) {
 const c=normalizar(cargo);
 if(c.includes('GERENTE'))return 'gerente';
 if(c.includes('ORCAMENT')||c.includes('FACILITADOR'))return 'orcamentista';
 if(c.includes('SUPERVISOR')&&/PECAS|BALCAO/.test(c))return 'supervisor-balcao';
 if(c.includes('SUPERVISOR')&&/ASSIST|ATEND|TECNIC/.test(c))return 'supervisor-tecnico';
 if(c.includes('SUPERVISOR')&&/POS\s*VENDAS/.test(c))return 'supervisor-posvendas';
 if(c.includes('CONSULTOR')&&/BALCAO|PECAS/.test(c))return 'balcao';
 if(c.includes('CONSULTOR')&&c.includes('TECNIC'))return 'tecnico';
 return 'outro';
}
function iso(s){const [d,m,y]=s.split('/');const v=`${y}-${m}-${d}`;if(new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v)throw Error('Data inválida no relatório.');return v;}
export function analisarPaginas(paginas, arquivo='Relatório.pdf') {
 const textos=paginas.flatMap(p=>p.items.map(i=>i.str)).join(' ');
 const n=normalizar(textos);
 const tipo=n.includes('CONSULTOR TECNICO')&&n.includes('O S FATURADAS')?'tecnico':n.includes('VENDA DE PECAS POR VENDEDOR')?'balcao':null;
 if(!tipo)throw Error(`${arquivo}: formato não reconhecido. Use o relatório de peças por vendedor ou consultor técnico / O.S. faturadas.`);
 const periodo=textos.match(/Data\s*Ref\.?\s*:\s*(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/i);
 if(!periodo)throw Error(`${arquivo}: período de referência não identificado.`);
 const inicio=iso(periodo[1]),fim=iso(periodo[2]);if(inicio>fim||inicio.slice(0,7)!==fim.slice(0,7))throw Error('Use um período dentro da mesma competência.');
 const linhas=[];
 for(let pagina=0;pagina<paginas.length;pagina++){
  const items=paginas[pagina].items.filter(i=>i.str?.trim());
  const vendedor=items.find(i=>normalizar(i.str)==='VENDEDOR');if(!vendedor)continue;
  const hy=vendedor.transform[5],tol=Math.max(1,Math.abs(vendedor.transform[0])*.3);
  const headers=items.filter(i=>Math.abs(i.transform[5]-hy)<=tol);
  const header=label=>headers.find(i=>normalizar(i.str)===label);
  const requeridas=tipo==='tecnico'?['VLR TOTAL','TICKET MEDIO','OBJETIVO M O','OBJETIVO PECAS']:['VALOR VENDA','OBJETIVO','RENT'];
  const cols={};for(const label of requeridas){let h=header(label);if(label==='RENT'&&tipo==='balcao')h=headers.find(i=>/%/.test(i.str)&&normalizar(i.str)==='RENT');if(!h)throw Error(`${arquivo}: coluna ${label} não encontrada na página ${pagina+1}.`);const x=h.transform[4];const proximo=headers.filter(i=>i.transform[4]>x+1).sort((a,b)=>a.transform[4]-b.transform[4])[0];cols[label]=[x,proximo?.transform[4]??Infinity];}
  const rows=[];
  for(const item of items.filter(i=>i.transform[5]<hy-tol).sort((a,b)=>b.transform[5]-a.transform[5])){let row=rows.find(r=>Math.abs(r.y-item.transform[5])<=tol);if(!row){row={y:item.transform[5],items:[]};rows.push(row);}row.items.push(item);}
  for(const row of rows){
   const nomes=row.items.filter(i=>Math.abs(i.transform[4]-vendedor.transform[4])<4&&/[A-Za-zÀ-ÿ]/.test(i.str)&&numeroBR(i.str)===null);
   if(!nomes.length)continue;
   const nome=nomes.sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(' ').trim();
   const obter=label=>{const [min,max]=cols[label];const values=row.items.filter(i=>{const mid=i.transform[4]+i.width/2;return mid>=min-2&&mid<max-2&&numeroBR(i.str)!==null;});if(values.length!==1)throw Error(`${arquivo}: valor ausente ou ambíguo em ${label}, ${nome}.`);return numeroBR(values[0].str);};
   // Rodapés sem valores nunca viram colaboradores.
   if(!row.items.some(i=>numeroBR(i.str)!==null))continue;
   const realizado=obter(tipo==='tecnico'?'VLR TOTAL':'VALOR VENDA');
   // Sem movimento: não exigir ticket/margem nem criar dia de trabalho.
   if(realizado<=0){linhas.push({nome,tipo,realizado,meta:null,ticket:null,margem:null,semMovimento:true,inicio,fim,arquivo,pagina:pagina+1});continue;}
   linhas.push({nome,tipo,realizado,meta:tipo==='tecnico'?centavos(obter('OBJETIVO M O')+obter('OBJETIVO PECAS')):obter('OBJETIVO'),ticket:tipo==='tecnico'?obter('TICKET MEDIO'):null,margem:tipo==='balcao'?obter('RENT'):null,inicio,fim,arquivo,pagina:pagina+1});
  }
 }
 if(!linhas.length)throw Error(`${arquivo}: nenhuma linha de vendedor foi identificada.`);
 return {arquivo,tipo,inicio,fim,linhas};
}
export function consolidar(documentos, participantes, nucleos=[], vinculos={}, excluidos=new Set()) {
 const periodos=new Set(documentos.map(d=>d.inicio+'|'+d.fim));if(periodos.size>1)throw Error('Importe documentos do mesmo período. Os arquivos atuais têm datas diferentes.');
 const ativos=participantes.filter(p=>p.ativo!==false&&p.ativo!=='false');const individuais=[],semMovimento=[],pendencias=[],ignorados=[],vistos=new Set();
 documentos.forEach((doc,di)=>doc.linhas.forEach((r,ri)=>{
  const key=`${di}:${ri}`;const candidatos=ativos.filter(p=>normalizar(p.nome)===normalizar(r.nome));
  const manual=vinculos[key];if(manual==='__ignorar__'){ignorados.push({...r,key,motivo:'Fora da campanha, confirmado na conferência.'});return;}const p=manual?ativos.find(p=>String(p.id)===String(manual)):candidatos.length===1?candidatos[0]:null;
  if(!p&&Number.isFinite(r.realizado)&&r.realizado<=0){ignorados.push({...r,key,motivo:'Sem movimento no relatório (realizado zerado ou negativo): não será considerado dia trabalhado.'});return;}
  if(!p){pendencias.push({...r,key,motivo:candidatos.length?'Nome presente em mais de uma filial. Selecione o cadastro correto.':'Nome não localizado. Selecione o cadastro ou deixe fora da importação.'});return;}
  if(excluidos.has(String(p.id))){ignorados.push({...r,key,motivo:'Removido deste lote de importação.'});return;}
  const cargo=cargoTipo(p.cargo);
  if(cargo!==r.tipo){ignorados.push({...r,key,motivo:`Cargo cadastrado: ${p.cargo}. Esta linha não pertence a este setor.`});return;}
  const identidade=[p.id,r.tipo,r.inicio,r.fim].join('|');
  if(vistos.has(identidade))throw Error(`Linha duplicada para ${p.nome}. Remova o documento repetido.`);vistos.add(identidade);
  if(Number.isFinite(r.realizado)&&r.realizado<=0){semMovimento.push({...r,filial:p.filial});ignorados.push({...r,key,nome:p.nome,filial:p.filial,motivo:'Sem movimento no relatório (realizado zerado ou negativo): não será considerado dia trabalhado.'});return;}
  individuais.push({...r,key,funcionarioId:p.id,nome:p.nome,filial:p.filial,cargo:p.cargo,dn:p.dn,origem:'Individual',arquivosDetalhes:[{nome:r.arquivo,pagina:r.pagina,tipo:'pdf'}],arquivos:r.arquivo?[r.arquivo]:[],fontes:[r.nome],completo:true});
 }));
 const saida=[...individuais];const cobertura=[...individuais,...semMovimento];const filiais=new Set(cobertura.map(r=>normalizar(r.filial)));
 for(const p of ativos){
  if(excluidos.has(String(p.id)))continue;
  const tipo=cargoTipo(p.cargo);if(!['supervisor-tecnico','supervisor-balcao','supervisor-posvendas','orcamentista','gerente'].includes(tipo))continue;
  const nucleo=tipo==='gerente'?nucleos.find(n=>normalizar(n.nome)===normalizar(p.nome)):null;
  const unidades=nucleo?.filiais?.length?nucleo.filiais:[p.filial];if(!unidades.some(f=>filiais.has(normalizar(f))))continue;
  // Replica de cadastro do mesmo gerente não cria um segundo pagamento.
  if(saida.some(r=>r.origem==='Consolidado'&&normalizar(r.nome)===normalizar(p.nome)))continue;
  const tipos=['gerente','supervisor-posvendas'].includes(tipo)?['tecnico','balcao']:tipo==='supervisor-balcao'?['balcao']:['tecnico'];
  const fontes=individuais.filter(r=>unidades.some(f=>normalizar(f)===normalizar(r.filial))&&tipos.includes(r.tipo));
  // Um setor enviado só com valores não positivos está conferido, mas não gera lançamento zerado.
  if(!fontes.length)continue;
  const faltantes=unidades.flatMap(f=>tipos.filter(t=>!cobertura.some(r=>normalizar(r.filial)===normalizar(f)&&r.tipo===t)).map(t=>`${f} / ${t==='tecnico'?'Técnicos':'Balcão'}`));
  const pendentes=pendencias.length>0;
  const sum=k=>centavos(fontes.reduce((s,r)=>s+(r[k]??0),0));const margens=fontes.filter(r=>r.tipo==='balcao');
  // Supervisão técnica: média dos tickets de quem teve movimento na filial.
  const tecnicos=fontes.filter(r=>r.tipo==='tecnico');
  const ticketConsolidado=['supervisor-tecnico','supervisor-posvendas'].includes(tipo)?(tecnicos.length?centavos(tecnicos.reduce((s,r)=>s+(r.ticket??0),0)/tecnicos.length):null):tipos.includes('tecnico')?sum('ticket'):null;
  saida.push({funcionarioId:p.id,nome:p.nome,cargo:p.cargo,filial:nucleo?unidades[0]:p.filial,dn:p.dn,tipo,origem:'Consolidado',inicio:documentos[0]?.inicio,fim:documentos[0]?.fim,meta:sum('meta'),realizado:sum('realizado'),ticket:ticketConsolidado,margem:margens.length?centavos(margens.reduce((s,r)=>s+r.margem,0)/margens.length):null,arquivosDetalhes:[...new Map(fontes.map(r=>[r.arquivo+'|'+r.pagina,{nome:r.arquivo,pagina:r.pagina,tipo:'pdf'}])).values()],arquivos:[...new Set(fontes.map(r=>r.arquivo).filter(Boolean))],fontes:fontes.map(r=>`${r.nome} · ${r.filial}`),nucleoFiliais:nucleo?unidades:[],completo:!faltantes.length&&!pendentes,motivo:faltantes.length?'Aguardando '+faltantes.join(', '):pendentes?'Há nomes sem vínculo; total sujeito à conferência.':'',faltantes});
 }
 return {linhas:saida,pendencias,ignorados,periodo:documentos[0]?{inicio:documentos[0].inicio,fim:documentos[0].fim}:null};
}
