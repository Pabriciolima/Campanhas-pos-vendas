// Regras puras de OCR: valores vêm da imagem, nunca do lançamento ou de referências fixas.
export const normalizarOcrPix = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
export const filialOcrPix = v => normalizarOcrPix(v).replace(/\bDN \d+[A-Z]?\b/g, '').replace(/^\d+[A-Z]? /, '').replace(/ (PA|PI|MA|MT|AP|RO)$/, '').trim();
const semana = v => Number(String(v ?? '').replace(/\D/g, ''));
const dinheiro = v => Number(v).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
const campos = {
 metaSemanal: {rotulo:'Meta semanal', aliases:[/^META(?: SEMANAL)?$/, /^OBJETIVO$/]},
 realizadoSemanal: {rotulo:'Realizado', aliases:[/^REALIZADO(?: SEMANAL)?$/, /^FATURAMENTO$/, /^FATURADO$/, /^VENDAS$/, /^V[IL]R TOTAL$/, /^VALOR TOTAL$/]},
 ticketMedio: {rotulo:'Ticket médio', aliases:[/^TICKET$/, /^TICKET MEDIO$/, /^TKT$/]},
 percentualMeta: {rotulo:'Atingimento (%)', aliases:[/^ATINGIMENTO$/, /^ATINGIDO$/]},
 realizadoNps: {rotulo:'NPS (%)', aliases:[/^NPS$/, /^REALIZADO NPS$/]},
 metaNps: {rotulo:'Meta NPS (%)', aliases:[/^META NPS$/]},
 margem: {rotulo:'Margem (%)', aliases:[/^MARGEM$/]},
 quantidadeOs: {rotulo:'Quantidade de O.S.', aliases:[/^QTD OS$/, /^QUANTIDADE OS$/]}
};
export function numeroOcrPix(texto) {
 const t=String(texto ?? '').replace(/R\s*\$/gi,'').replace(/[%\s]/g,'');
 // Não troca letras por números e não transforma ausência em zero.
 if(!/^-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(t)) return null;
 const n=Number(t.replace(/\./g,'').replace(',','.')); return Number.isFinite(n)?n:null;
}
export function linhasOcrPix(data) {
 const words=(data.blocks || []).flatMap(b => (b.paragraphs || []).flatMap(p => (p.lines || []).flatMap(l => l.words || []))).filter(w=>w.text?.trim() && w.bbox && Number.isFinite(w.bbox.y0));
 // Reconstrói linhas pela geometria, mesmo quando o OCR separa cada célula em um bloco.
 const rows=[];
 for(const w of words.sort((a,b)=>(a.bbox.y0+a.bbox.y1)-(b.bbox.y0+b.bbox.y1)||a.bbox.x0-b.bbox.x0)) {
  const y=(w.bbox.y0+w.bbox.y1)/2, h=w.bbox.y1-w.bbox.y0;
  const row=rows.find(r=>Math.abs(r.y-y)<=Math.max(4,Math.min(r.h,h)*.45));
  if(row){row.words.push(w);row.y=(row.y*(row.words.length-1)+y)/row.words.length;}else rows.push({y,h,words:[w]});
 }
 return rows.sort((a,b)=>a.y-b.y).map((r,i)=>({...r,numero:i+1,words:r.words.sort((a,b)=>a.bbox.x0-b.bbox.x0),texto:r.words.sort((a,b)=>a.bbox.x0-b.bbox.x0).map(w=>w.text).join(' ')}));
}
function cabecalhos(rows) {
 const headers=[];
 for(const row of rows) {
  const cols=[];
  for(let i=0;i<row.words.length;i++) for(let len=2;len>=1;len--) {
   const ws=row.words.slice(i,i+len); if(ws.length!==len || ws.some(w=>w.confidence<60))continue;
   const t=normalizarOcrPix(ws.map(w=>w.text).join(' '));
   for(const [campo,c] of Object.entries(campos)) if(c.aliases.some(re=>re.test(t))) {
    // Meta mensal não é meta semanal. A associação não depende da ordem das colunas.
    if(campo==='metaSemanal' && /MENSAL|M O|PECAS|NPS|MARGEM|TICKET|OS/.test(normalizarOcrPix(row.words.slice(i,i+3).filter((w,j)=>j===0||w.bbox.x0-row.words[i+j-1].bbox.x1<35).map(w=>w.text).join(' '))))continue;
    if(campo==='realizadoSemanal'&&row.words[i+1]?.bbox.x0-row.words[i].bbox.x1<35&&/NPS|MARGEM|TICKET/.test(normalizarOcrPix(row.words.slice(i+1,i+2).map(w=>w.text).join(' '))))continue;
    if(campo==='realizadoNps'&&len===1&&row.words[i].bbox.x0-row.words[i-1]?.bbox.x1<35&&normalizarOcrPix(row.words[i-1]?.text)==='META')continue;
    if(!cols.some(c=>c.campo===campo))cols.push({campo,x:(ws[0].bbox.x0+ws.at(-1).bbox.x1)/2});
   }
  }
  if(cols.length>=2){
   const anchors=row.words.filter(w=>/^(V[IL]R[.,]?|QTD\.?|DIF\.?|OBJETIVO|META|REALIZADO|TICKET|FATURAMENTO)(?:$|[.,])/i.test(w.text)||/^OBJETIVO/i.test(w.text)).map(w=>w.bbox.x0);
   const sorted=cols.sort((a,b)=>a.x-b.x);
   for(const c of sorted){const a=anchors.filter(x=>x<=c.x).at(-1);c.left=a??(c.x-80);c.right=anchors.find(x=>x>c.x)??(c.x+140);}
   headers.push({y:row.y,nameRight:anchors.length?Math.min(...anchors):sorted[0].x-40,cols:sorted});
  }
 }
 return headers;
}
function lerValores(row,header) {
 const valores={},baixa=[];
 for(let i=0;i<header.cols.length;i++) {
  const c=header.cols[i],left=c.left-3,right=c.right-3;
  const ws=row.words.filter(w=>(w.bbox.x0+w.bbox.x1)/2>=left&&(w.bbox.x0+w.bbox.x1)/2<right);
  const parts=ws.filter(w=>/\d/.test(w.text));
  if(!parts.length)continue;
  const n=numeroOcrPix(parts.map(w=>w.text).join(''));
  if(n===null || parts.some(w=>w.confidence<85)){baixa.push(c.campo);continue;}
  valores[c.campo]=n;
 }
 return {valores,baixa};
}
export function extrairImagemPix(data,contexto) {
 const rows=linhasOcrPix(data),headers=cabecalhos(rows),text=rows.map(r=>r.texto).join('\n');
 const semanas=[...text.matchAll(/\b(?:SEMANA(?:L)?\s*|S\s*)0?([1-4])\b/gi)].map(m=>Number(m[1]));
 const competencias=[...text.matchAll(/\b(0[1-9]|1[0-2])[\/\-](20\d{2})\b/g)].map(m=>`${m[2]}-${m[1]}`);
 const cidades=['ANANINDEUA','SAO LUIS','BACABAL','MACAPA','TERESINA','URUCUI','RONDONOPOLIS','SINOP','CUIABA','PORTO VELHO','JI PARANA','VILHENA','AGUA BOA'];
 const textoNormal=normalizarOcrPix(text);const filiaisDeclaradas=cidades.filter(c=>textoNormal.includes('FILIAL '+c)||textoNormal.includes('UNIDADE '+c));
 const registros=[];let secao='';
 for(const row of rows){const label=normalizarOcrPix(row.texto);if(/[O0] S FATURADAS/.test(label))secao='faturadas';if(/[O0] S ABERTAS/.test(label))secao='abertas';const header=headers.filter(h=>h.y<row.y).at(-1);if(!header)continue;const {valores,baixa}=lerValores(row,header);if(!Object.keys(valores).length&&!baixa.length)continue;
  const nomeWords=row.words.filter(w=>w.bbox.x1<header.nameRight-3);
  const identidade=normalizarOcrPix(nomeWords.map(w=>w.text).join(' '));
  registros.push({secao,cabecalhoY:header.y,identidade,identidadeConfiavel:nomeWords.length>0&&nomeWords.every(w=>w.confidence>=75),total:/^(TOTAL|TOTAL GERAL|TOTAL DA UNIDADE|TOTAL UNIDADE)$/.test(identidade),valores,baixa,linha:row.numero,trecho:row.texto.slice(0,500)});
 }
 // Alguns relatórios Apollo imprimem o total sem rótulo. Só o reconhecemos
 // quando coincide com a soma das linhas identificadas da MESMA tabela fechada.
 for(const reg of registros.filter(r=>!r.identidade&&r.secao==='faturadas'&&Number.isFinite(r.valores.realizadoSemanal))){
  const anteriores=registros.filter(r=>r.cabecalhoY===reg.cabecalhoY&&r.linha<reg.linha&&r.identidade&&!r.total&&Number.isFinite(r.valores.realizadoSemanal));
  if(anteriores.length&&Math.abs(anteriores.reduce((s,r)=>s+r.valores.realizadoSemanal,0)-reg.valores.realizadoSemanal)<.015){reg.total=true;reg.identidadeConfiavel=true;}
 }
 return {...contexto,filiaisDeclaradas,semanas:[...new Set(semanas)],competencias:[...new Set(competencias)],registros};
}
const fonteResumo=fontes=>fontes.map(f=>f.nomeOriginal||f.nome||f.caminho||'Imagem').join('; ').slice(0,500);
export function compararImagensPix(linhas,imagens) {
 const divergencias=[],revisoes=[],checagens=[];let comparacoes=0;
 const revisao=(r,motivo,fonte='')=>revisoes.push({nome:r.nome||r.colaborador,filial:r.filial,competencia:r.competencia||r.origem,semana:semana(r.semana),motivo,fonte});
 const add=(r,campo,lancado,lido,fonte,extra='')=>divergencias.push({nome:r.nome||r.colaborador,competencia:r.competencia||r.origem,semana:semana(r.semana),filial:r.filial,local:`${r.competencia||r.origem} · S${semana(r.semana)} · ${r.nome||r.colaborador} / ${r.filial}`,nivel:'DIVERGÊNCIA',campo,fonte,ponto:extra||`${campos[campo]?.rotulo||campo}: lançado ${dinheiro(lancado)}; evidência ${dinheiro(lido)}; diferença ${dinheiro(Math.abs(lancado-lido))}.`,correcao:'Conferir a linha indicada na evidência, corrigir o lançamento ou substituir a evidência e recalcular a apuração.'});
 for(const linha of linhas) {
  const r={...linha,...(linha.auditoriaDados||{})},cp=r.competencia||r.origem,sw=semana(r.semana),nome=normalizarOcrPix(r.nome||r.colaborador),filial=filialOcrPix(r.filial);
  const gerente=/GERENTE/.test(normalizarOcrPix(r.cargo)),individual=/CONSULTOR|BALCAO|ORCAMENTISTA/.test(normalizarOcrPix(r.cargo));
  const casas=gerente ? (['URUCUI','TERESINA'].includes(filial)?['URUCUI','TERESINA']:(r.auditoriaFonte?.unidades||[]).map(u=>filialOcrPix(u.filial))) : [filial];
  if(!casas.length){revisao(r,'Informe as unidades do núcleo para comparar os totais das evidências.');continue;}
  const porCasa=[];
  for(const casa of [...new Set(casas)]) {
   const fontes=imagens.filter(i=>i.competencia===cp&&semana(i.semana)===sw&&filialOcrPix(i.filial)===casa);
   const candidatos=[];
   if(!fontes.length){revisao(r,`Sem evidência disponível para ${casa} neste período.`);add(r,'evidencia',0,0,'Sem arquivo anexado',`CORRIGIR PENDÊNCIA: a filial ${casa} não anexou evidência para ${cp}, semana S${sw}. Pagamento bloqueado até anexar e validar a evidência.`);}
   for(const img of fontes){
    const fonte=img.nomeOriginal||img.nome||img.caminho||'Imagem';
    if(img.erro){revisao(r,img.erro,fonte);continue;}
    if(img.filiaisDeclaradas?.length===1&&img.filiaisDeclaradas[0]!==casa){add(r,'filial',0,0,fonte,`A imagem identifica a filial ${img.filiaisDeclaradas[0]}, mas está anexada à base ${casa}.`);continue;}
    if(img.competencias.some(c=>c!==cp)){revisao(r,'A imagem contém competência diferente da pasta selecionada.',fonte);continue;}
    if(!img.semanas.length&&!/(?:semana-[1-4]|\/S[1-4]\/|\/s[1-4]\/|\/[1-4]\/)/.test(img.caminho||'')){revisao(r,'Imagem histórica sem semana identificável no texto ou no caminho; confirme o período.',fonte);continue;}
    if(img.semanas.some(s=>s!==sw)){add(r,'semana',sw,img.semanas.find(s=>s!==sw),fonte,`A evidência indica ${img.semanas.map(s=>'S'+s).join(' / ')}, mas o lançamento é S${sw}.`);continue;}
    const nomes=linhas.map(l=>normalizarOcrPix((l.auditoriaDados||l).nome||l.colaborador));
    const matches=img.registros.filter(x=>x.secao!=='abertas'&&x.identidadeConfiavel && (individual ? (x.identidade===nome||(x.identidade.split(' ').length>=3&&x.identidade.length>=18&&nome.endsWith(x.identidade)&&nomes.filter(n=>n.endsWith(x.identidade)).length===1)) : x.total));
    if(matches.length!==1){revisao(r,individual?'Linha individual não identificada com segurança (nome completo e colunas).':'Total da unidade ausente ou ambíguo. Não foram somadas linhas individuais.',fonte);continue;}
    candidatos.push({...matches[0],fonte:`${fonte} · linha ${matches[0].linha}`,casa});
   }
   if(fontes.length&&!candidatos.length)add(r,'identidade',0,0,fonteResumo(fontes),`CORRIGIR PENDÊNCIA: não foi possível validar ${individual?'a evidência no nome do colaborador':'o total da unidade'} em ${casa}, S${sw}. Anexe uma evidência legível e correspondente.`);
   porCasa.push(candidatos);
  }
  const camposComparados=new Set();
  for(const campo of Object.keys(campos)){
   // Total do núcleo exige cobertura de todas as unidades. Ticket exige total de O.S.
   if(gerente&&!['metaSemanal','realizadoSemanal','ticketMedio'].includes(campo))continue;
   const encontrados=porCasa.map(cs=>{
    const validos=cs.filter(c=>Number.isFinite(c.valores[campo]));
    const valores=[...new Set(validos.map(c=>Math.round(c.valores[campo]*100)))];
    if(valores.length>1){revisao(r,`Evidências conflitantes para ${campos[campo].rotulo}; nenhuma foi escolhida automaticamente.`,validos.map(c=>c.fonte).join('; '));return null;}
    return validos[0]||null;
   });
   if(encontrados.some(v=>!v))continue;
   let valor;
   if(gerente&&campo==='ticketMedio') {
    if(!encontrados.every(c=>Number.isFinite(c.valores.quantidadeOs)&&c.valores.quantidadeOs>0&&Number.isFinite(c.valores.realizadoSemanal)))continue;
    valor=encontrados.reduce((s,c)=>s+c.valores.realizadoSemanal,0)/encontrados.reduce((s,c)=>s+c.valores.quantidadeOs,0);
   } else valor=encontrados.reduce((s,c)=>s+c.valores[campo],0);
   const atual=r[campo];if(atual===null||atual===undefined||String(atual).trim()===''||!Number.isFinite(Number(atual)))continue;
   comparacoes++;camposComparados.add(campo);
   if(Math.round(Number(atual)*100)!==Math.round(valor*100))add(r,campo,Number(atual),valor,encontrados.map(c=>c.fonte).join('; '));
  }
  const obrigatorios=['metaSemanal','realizadoSemanal'];if(/TICKET/.test(normalizarOcrPix(r.politica?.metrica))||Number(r.ticketMedio)>0)obrigatorios.push('ticketMedio');
  checagens.push({nome:r.nome||r.colaborador,competencia:cp,semana:sw,filial:r.filial,campos:[...camposComparados],periodoValidado:camposComparados.size>0});
  const faltam=obrigatorios.filter(c=>!camposComparados.has(c));if(faltam.length){revisao(r,`Leitura incompleta: ${faltam.map(c=>campos[c].rotulo).join(', ')}. Não significa que os valores conferem.`);add(r,'cobertura',0,0,'Conferência de evidências',`CORRIGIR PENDÊNCIA: não foi possível validar ${faltam.map(c=>campos[c].rotulo).join(', ')} nas evidências do colaborador e período. Bonificação retida até conferência completa.`);}
 }
 const unicos=arr=>[...new Map(arr.map(a=>[JSON.stringify(a),a])).values()];
 return {divergencias:unicos(divergencias),revisoes:unicos(revisoes),comparacoes,checagens,imagens:imagens.length,geradoEm:new Date().toISOString()};
}
export function adicionarPaginaImagensPix(doc,resultado) {
 const divergencias=Array.isArray(resultado?.divergencias)?resultado.divergencias:[];
 const revisoes=Array.isArray(resultado?.revisoes)?resultado.revisoes:[];
 const local=a=>[a.competencia||'',a.semana?'S'+a.semana:'',a.nome||'Colaborador',a.filial||''].filter(Boolean).join(' · ');
 const chave=a=>[a.competencia||'',a.semana||'',normalizarOcrPix(a.nome),filialOcrPix(a.filial)].join('|');
 const pendentes=new Set(divergencias.map(chave));
 const linhas=[
  ...divergencias.map(a=>[a.local||local(a),a.campo==='evidencia'?'SEM EVIDÊNCIA':a.campo==='cobertura'||a.campo==='identidade'?'CORRIGIR PENDÊNCIA':'DIVERGÊNCIA',a.ponto||'Divergência identificada',[(a.fonte||''),a.correcao||'Corrigir o lançamento ou a evidência e repetir a conferência.'].filter(Boolean).join('\n')]),
  ...revisoes.filter(a=>!pendentes.has(chave(a))).map(a=>[local(a),'REVISÃO PENDENTE',a.motivo||'Evidência não validada',[(a.fonte||''),'Anexar ou corrigir a evidência da filial, semana e colaborador; repetir a conferência antes de liberar o pagamento.'].filter(Boolean).join('\n')])
 ];
 doc.addPage();doc.setCharSpace?.(0);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(20,42,58);doc.text('PENDÊNCIAS E DIVERGÊNCIAS — EVIDÊNCIAS PIX',12,16);
 doc.setFont('helvetica','normal');doc.setFontSize(8);
 doc.text(`${resultado.imagens||0} imagem(ns) · ${resultado.comparacoes||0} comparação(ões) · ${divergencias.length} divergência(s) · ${revisoes.length} leitura(s) a revisar`,12,23);
 doc.text('Situações pendentes exigem correção e nova conferência; ausência de divergência não comprova validação.',12,29);
 if(linhas.length){
  const largura=doc.internal.pageSize.getWidth()-24;
  const pesos=[.24,.15,.30,.31];
  doc.autoTable({startY:35,head:[['Colaborador / filial / período','Situação','Motivo identificado','O que corrigir / fonte']],body:linhas,
   styles:{fontSize:7,cellPadding:2.5,overflow:'linebreak',valign:'top'},headStyles:{fillColor:[90,30,40],textColor:[255,255,255]},
   columnStyles:Object.fromEntries(pesos.map((p,i)=>[i,{cellWidth:largura*p}])),
   margin:{left:12,right:12,top:16,bottom:14},
   didParseCell(data){if(data.section==='body'){data.cell.styles.textColor=[155,35,35];if(data.column.index===1)data.cell.styles.fontStyle='bold';}}
  });
 }else doc.text('Nenhuma pendência ou divergência identificada nos dados efetivamente conferidos.',12,39);
 return resultado;
}
