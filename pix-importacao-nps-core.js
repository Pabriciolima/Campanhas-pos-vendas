import {normalizar} from './pix-importacao-core.js?v=20261116-confirmar2';
const MESES=['JANEIRO','FEVEREIRO','MARCO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
export function percentualNpsImportacao(texto){
 const s=String(texto??'').replace(/[−–—]/g,'-').replace(/\s|%/g,'').replace(',','.');
 if(!/^-?\d{1,3}(?:\.\d{1,2})?$/.test(s))return null;
 const n=Number(s);return Number.isFinite(n)&&n>=-100&&n<=100?n:null;
}
const cx=w=>(w.bbox.x0+w.bbox.x1)/2,cy=w=>(w.bbox.y0+w.bbox.y1)/2;
export function interpretarOcrNps(cabecalho,palavras,competencia,arquivo='Imagem NPS'){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia))throw Error('Selecione a competência antes de ler o NPS.');
 const mes=MESES[Number(competencia.slice(5))-1],h=cabecalho.filter(w=>w.text?.trim()).sort((a,b)=>a.bbox.x0-b.bbox.x0);
 let meta=h.find(w=>normalizar(w.text)==='META '+mes);
 if(!meta){const i=h.findIndex((w,i)=>normalizar(w.text)==='META'&&normalizar(h[i+1]?.text)===mes);if(i>=0)meta={text:'META '+mes,bbox:{...h[i].bbox,x1:h[i+1].bbox.x1}};}
 const realizado=h.find(w=>normalizar(w.text)===mes&&meta&&w.bbox.x0>meta.bbox.x1);
 if(!meta||!realizado)throw Error(`Não identifiquei as colunas META ${mes} e ${mes}. Envie a imagem completa com os títulos legíveis.`);
 const anterior=h.filter(w=>w.bbox.x1<meta.bbox.x0).at(-1),proximo=h.find(w=>w.bbox.x0>realizado.bbox.x1);
 const min=anterior?(anterior.bbox.x1+meta.bbox.x0)/2:meta.bbox.x0-80;
 const meio=(meta.bbox.x1+realizado.bbox.x0)/2,max=proximo?(realizado.bbox.x1+proximo.bbox.x0)/2:realizado.bbox.x1+30;
 const hy=Math.max(meta.bbox.y1,realizado.bbox.y1),rows=[];
 for(const w of palavras.filter(w=>w.text?.trim()&&w.bbox.y0>hy).sort((a,b)=>cy(a)-cy(b))){let r=rows.find(r=>Math.abs(r.y-cy(w))<Math.max(7,(w.bbox.y1-w.bbox.y0)*.65));if(!r){r={y:cy(w),words:[]};rows.push(r);}r.words.push(w);}
 const linhas=[];
 for(const r of rows){
  const ws=r.words.sort((a,b)=>a.bbox.x0-b.bbox.x0);
  const cell=(a,b)=>ws.filter(w=>cx(w)>=a&&cx(w)<b).map(w=>w.text).join('');
  const metaValor=percentualNpsImportacao(cell(min,meio)),valor=percentualNpsImportacao(cell(meio,max));
  if(metaValor===null&&valor===null)continue;
  const dn=ws.find(w=>/^\d{4}[A-Z]?$/.test(w.text)&&cx(w)<min);
  const total=ws.some(w=>normalizar(w.text)==='TOTAL');
  if(total)continue;
  const nome=total?'TOTAL':ws.filter(w=>w.bbox.x0<(dn?.bbox.x0??min*.35)-3).map(w=>w.text).join(' ').trim();
  if(!nome)continue;
  linhas.push({nome,dn:dn?.text||'',total,meta:metaValor,realizado:valor,competencia,arquivo,truncado:/\.{2,}|…/.test(nome),confianca:Math.min(...ws.filter(w=>cx(w)>=min&&cx(w)<max).map(w=>w.confidence??100)),erro:metaValor===null||valor===null?'Confira os percentuais: leitura incompleta.':''});
 }
 if(!linhas.length)throw Error('Nenhum resultado de NPS foi encontrado na imagem.');
 const dns=[...new Set(linhas.filter(r=>!r.total).map(r=>r.dn).filter(Boolean))];
 if(dns.length===1)linhas.filter(r=>r.total&&!r.dn).forEach(r=>r.dn=dns[0]);
 return {competencia,arquivo,linhas};
}
export function vincularNps(documentos,participantes,vinculos={}){
 const saida=[];
 documentos.forEach((doc,di)=>doc.linhas.forEach((r,ri)=>{
  const key=`${di}:${ri}`,manual=vinculos[key];
  const filiais=[...new Set(participantes.filter(p=>String(p.dn||'').trim()===r.dn).map(p=>p.filial))];
  // O total da lista de consultores não é uma fonte autorizada de NPS geral.
  if(r.total)return;
  if(doc.tipo==='geral' && r.origem==='painel-unidade'){
    const compacto=v=>normalizar(v).replace(/ /g,'');
    const declaradas=participantes.filter(p=>compacto(r.nome).includes(compacto(p.filial))).map(p=>p.filial);
    const unidades=[...new Map([...(manual?[manual]:[...declaradas,...filiais])].map(f=>[normalizar(f),f])).values()];
    saida.push({...r,key,geral:true,filiais:unidades,filial:unidades.length===1?unidades[0]:unidades.join(' / '),vinculado:unidades.length>0});return;
  }
  const nome=normalizar(r.nome),prefixo=nome;
  const porNome=participantes.filter(p=>normalizar(p.nome)===nome||(r.truncado&&prefixo.length>=20&&prefixo.split(' ').length>=3&&normalizar(p.nome).startsWith(prefixo)));
  const candidatos=porNome.filter(p=>!r.dn||String(p.dn||'').trim()===r.dn);
  const p=manual?participantes.find(p=>String(p.id)===manual):candidatos.length===1?candidatos[0]:null;
  saida.push({...r,key,funcionarioId:p?.id,nomeCadastro:p?.nome,filial:p?.filial||'',elegivel:p?.usaNps===true,vinculado:!!p,motivo:!p?'Vincule o nome ao cadastro.':!p.usaNps?'Cargo sem bônus de NPS.':''});
 }));return saida;
}
export function aplicarNpsImportacao(linhas,nps,participantes,{semana}={}){
 const escolher=rs=>{if(!rs.length)return null;const distintos=new Set(rs.map(r=>`${r.meta}|${r.realizado}`));return distintos.size===1&&rs.every(r=>!r.erro&&r.meta!=null&&r.realizado!=null)?rs[0]:null;};
 return linhas.map(linha=>{
  const p=participantes.find(p=>String(p.id)===String(linha.funcionarioId));
  if(!p?.usaNps)return {...linha,npsStatus:'Não se aplica'};
  const validos=nps.filter(r=>r.competencia===linha.inicio.slice(0,7)&&r.vinculado&&!r.total);
  const gerais=Number(semana)===4?validos.filter(r=>r.geral&&r.origem==='painel-unidade'):[];
  let encontrado;
  if(linha.origem==='Individual')encontrado=escolher(validos.filter(r=>!r.geral&&r.elegivel&&String(r.funcionarioId)===String(linha.funcionarioId)));
  else if(linha.nucleoFiliais?.length){
   const porFilial=linha.nucleoFiliais.map(f=>escolher(gerais.filter(r=>r.filiais?.some(u=>normalizar(u)===normalizar(f)))));
   if(porFilial.every(Boolean)){
    // Regra aprovada: uma filial atingindo a meta habilita o gerente; sem somar percentuais.
    encontrado=porFilial.find(r=>r.realizado>=r.meta)||porFilial[0];
    return {...linha,npsStatus:'NPS das filiais',npsImportado:{meta:encontrado.meta,realizado:encontrado.realizado,competencia:encontrado.competencia,arquivo:porFilial.map(r=>r.arquivo).join(' / '),escopo:'nucleo',origem:'painel-unidade',semana:4,filiais:Object.fromEntries(linha.nucleoFiliais.map((f,i)=>[f,{meta:porFilial[i].meta,realizado:porFilial[i].realizado}]))}};
   }
  }else encontrado=escolher(gerais.filter(r=>r.filiais?.some(f=>normalizar(f)===normalizar(linha.filial))));
  if(!encontrado)return {...linha,npsStatus:linha.origem!=='Individual'&&Number(semana)!==4?'NPS geral somente na S4 · mantém o valor salvo':'NPS não identificado · mantém o valor salvo'};
  return {...linha,npsStatus:linha.origem==='Individual'?'NPS individual':'NPS da filial',npsImportado:{meta:encontrado.meta,realizado:encontrado.realizado,competencia:encontrado.competencia,arquivo:encontrado.arquivo,escopo:linha.origem==='Individual'?'individual':'filial',...(linha.origem==='Individual'?{}:{origem:'painel-unidade',semana:4})}};
 });
}

// Fonte exclusiva do NPS geral: painel por unidade, nunca o TOTAL dos consultores.
export function interpretarOcrNpsGeral(cabecalho,palavras,competencia,arquivo='Painel NPS por unidade') {
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia))throw Error('Selecione a competência antes de ler o NPS geral.');
 const h=cabecalho.filter(w=>w.text?.trim()),unidade=h.find(w=>normalizar(w.text)==='CONCESSIONARIA');
 const realizado=h.find(w=>['REALIZ','REALIZADO','REALIZADA'].includes(normalizar(w.text)));
 const meta=realizado&&h.filter(w=>normalizar(w.text)==='META'&&w.bbox.x1<realizado.bbox.x0&&Math.abs(cy(w)-cy(realizado))<30).sort((a,b)=>b.bbox.x0-a.bbox.x0)[0];
 const gerado=h.find(w=>normalizar(w.text)==='GERADO');
 if(!unidade||!meta||!realizado||!gerado)throw Error('Não identifiquei CONCESSIONÁRIA, META e REALIZ. no painel. Envie o print completo do NPS por unidade.');
 const min=(unidade.bbox.x1+meta.bbox.x0)/2,meio=(meta.bbox.x1+realizado.bbox.x0)/2,max=(realizado.bbox.x1+gerado.bbox.x0)/2;
 const rows=[],hy=Math.max(meta.bbox.y1,realizado.bbox.y1);
 for(const w of palavras.filter(w=>w.text?.trim()&&w.bbox.y0>hy).sort((a,b)=>cy(a)-cy(b))){let r=rows.find(r=>Math.abs(r.y-cy(w))<Math.max(9,(w.bbox.y1-w.bbox.y0)*.75));if(!r){r={y:cy(w),words:[]};rows.push(r);}r.words.push(w);}
 const linhas=[];
 for(const r of rows){
  const ws=r.words.sort((a,b)=>a.bbox.x0-b.bbox.x0),nome=ws.filter(w=>cx(w)<min).map(w=>w.text).join(' ').trim();
  if(!nome||normalizar(nome).includes('CONSOLIDADO')||normalizar(nome).startsWith('TOTAL'))continue;
  const dn=normalizar(nome).match(/\bDN\s+(\d{4})\b/)?.[1];if(!dn)continue;
  const pct=(a,b)=>percentualNpsImportacao(ws.filter(w=>cx(w)>=a&&cx(w)<b).map(w=>w.text).join(''));
  const m=pct(min,meio),v=pct(meio,max);
  linhas.push({nome,dn,total:false,geral:true,origem:'painel-unidade',meta:m,realizado:v,competencia,arquivo,erro:m==null||v==null?'Confira os percentuais do painel.':''});
 }
 if(!linhas.length)throw Error('Nenhuma unidade com NPS foi identificada no painel.');
 return {tipo:'geral',competencia,arquivo,linhas};
}
