import {CAMPANHAS} from '../diretoria/core.mjs';
export type CampanhaId='pix'|'oficina'|'garantia'|'crm'|'compras'|'apms';
export type BaseFinanceira='apurado'|'pago';
export interface PessoaFonte {id?:string;nome?:string;cargo?:string;filiais?:string[]}
export interface RegistroFonte {campanha:string;id:string;chave:string;competencia:string;ciclo:string;apurado:number;pago:number;confirmado:boolean;inicio?:string;atualizado?:string;origem?:string;pessoa?:PessoaFonte;apmResumo?:{apm:string;nome:string;filialId:string;filial:string;ganhoApm:number;ganhoVendedor:number;ganhoGerente:number}}
export interface Fonte {id:CampanhaId;status:'ok'|'erro'|'protegido'|'indisponivel';nota:string}
export interface DatasetFonte {registros:RegistroFonte[];fontes:{id:string;status:string;nota?:string}[];demo?:boolean;atualizado?:string}
export interface RegistroAnalitico {id:string;campanha:CampanhaId;competencia:string;ciclo:string;pessoaId:string|null;nome:string|null;cargo:string;filiais:string[];valor:number;origem:string;agregado:boolean;atualizado:string}
export interface DatasetAnalitico {registros:RegistroAnalitico[];fontes:Fonte[];demo:boolean;atualizado:string;base:BaseFinanceira}
export interface FiltrosGlobais {periodo:'historico'|'ano'|'seis'|'mes';ano:string;mes:string;filial:string;campanha:CampanhaId|''}
export interface FiltrosDetalhe {competencia:string;ciclo:string;cargo:string;filial:string;busca:string}
export interface Intervalo {de:string;ate:string;meses:number;rotulo:string}
export interface Grupo {id:string;nome:string;valor:number;registros:number}
export interface PessoaRanking {id:string;nome:string;cargos:string[];filiais:string[];campanhas:CampanhaId[];ciclos:number;valor:number;media:number;posicao:number}
export interface Analise {registros:RegistroAnalitico[];intervalo:Intervalo;total:number;totalAnterior:number;variacao:number|null;mediaMensal:number;pessoas:number;ticket:number|null;ticketIdentificado:number;naoIdentificado:number;ciclos:number;ranking:PessoaRanking[];agregados:Grupo[];campanhas:Grupo[];mensal:Grupo[];cargos:Grupo[];filiais:Grupo[];porCiclo:Grupo[];lider:Grupo|null}
const ids=new Set<string>(CAMPANHAS.map(c=>c.id));
export const campanhas=()=>CAMPANHAS as ReadonlyArray<{id:CampanhaId;nome:string;cor:string}>;
export const normalizar=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
const canonical=(s:string)=>{const n=normalizar(s).replace(/[^A-Z0-9]/g,'');return ({BELEM:'Ananindeua',ANANINDEUAPA:'Ananindeua',ANANINDEUA:'Ananindeua',SAOLUIS:'São Luís',SAOLUIZ:'São Luís',JIPARANA:'Ji-Paraná',AGUABOA:'Água Boa',RONDONOPOLIS:'Rondonópolis',MACAPA:'Macapá',TERESINA:'Teresina',URUCUI:'Uruçuí',BACABAL:'Bacabal',CUIABA:'Cuiabá',SINOP:'Sinop',PORTOVELHO:'Porto Velho',VILHENA:'Vilhena'} as Record<string,string>)[n]||s.trim();};
const centavos=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
export function prepararDataset(raw:DatasetFonte,base:BaseFinanceira='apurado'):DatasetAnalitico {
 const fontes:Fonte[]=campanhas().map(c=>{const f=raw.fontes.find(f=>f.id===c.id);return {id:c.id,status:f?.status==='ok'?'ok':f?.status==='protegido'?'protegido':f?.status==='erro'?'erro':'indisponivel',nota:f?.nota||''};});
 const unicos=new Map<string,RegistroFonte>();for(const r of raw.registros){if(!ids.has(r.campanha))continue;const fonte=fontes.find(f=>f.id===r.campanha);if(fonte?.status!=='ok')continue;const a=r.apmResumo,partes=a?[a.ganhoApm,a.ganhoVendedor,a.ganhoGerente]:[];if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.competencia)||!r.chave||!centavos(r.apurado)||!centavos(r.pago)||(a&&(!partes.every(centavos)||partes.reduce((s,v)=>s+v,0)!==r.apurado))){fonte.status='erro';fonte.nota='Dados financeiros incompatíveis: esta campanha não foi somada para evitar um subtotal incorreto.';continue;}const old=unicos.get(r.chave);if(!old||String(r.atualizado||'')>String(old.atualizado||''))unicos.set(r.chave,r);}
 const registros:RegistroAnalitico[]=[];
 for(const r of unicos.values()){
  if(fontes.find(f=>f.id===r.campanha)?.status!=='ok')continue;
  const adicionar=(sufixo:string,nome:string|null,cargo:string,filiais:string[],valor:number)=>{const informado=typeof nome==='string'?nome.trim():'';const n=informado&&!/^(?:[0-9]+|[a-f0-9]{8}-[a-f0-9-]{27,})$/i.test(informado)?informado:null;const fs=[...new Set(filiais.filter(Boolean).map(canonical))];registros.push({id:r.chave+sufixo,campanha:r.campanha as CampanhaId,competencia:r.competencia,ciclo:r.ciclo||r.competencia,pessoaId:n?'nome:'+normalizar(n):null,nome:n,cargo:cargo||'Não informado',filiais:fs.length?fs:['Não informada'],valor,origem:r.origem||'Base oficial',agregado:!n,atualizado:r.atualizado||''});};
  if(r.apmResumo){const a=r.apmResumo;if(base==='pago'){adicionar('|confirmado',null,'Confirmação sem detalhamento',[a.filial],r.confirmado?r.pago:0);}else{const partes=[a.ganhoApm,a.ganhoVendedor,a.ganhoGerente];if(!partes.every(centavos)||partes.reduce((s,v)=>s+v,0)!==r.apurado)throw Error('Parcelas APMs não conferem com o total.');adicionar('|apm',a.nome,'APM',[a.filial],a.ganhoApm);adicionar('|vendedor',null,'Vendedor',[a.filial],a.ganhoVendedor);adicionar('|gerente',null,'Gerente',[a.filial],a.ganhoGerente);}continue;}
  adicionar('',r.pessoa?.nome||null,r.pessoa?.cargo||'Não informado',r.pessoa?.filiais||[],base==='pago'?(r.confirmado?r.pago:0):r.apurado);
 }
 return {registros,fontes,demo:!!raw.demo,atualizado:raw.atualizado||'',base};
}
export const deslocarMes=(m:string,n:number)=>{const [a,b]=m.split('-').map(Number);const d=new Date(Date.UTC(a,b-1+n,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;};
const indiceMes=(m:string)=>Number(m.slice(0,4))*12+Number(m.slice(5))-1;
export function mesAtual(now=new Date()){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).formatToParts(now);return parts.find(p=>p.type==='year')!.value+'-'+parts.find(p=>p.type==='month')!.value;}

export function resolverIntervalo(registros:readonly RegistroAnalitico[],f:FiltrosGlobais,agora=mesAtual()):Intervalo {
 const meses=registros.map(r=>r.competencia).sort();let de=meses[0]||agora,ate=meses[meses.length-1]||agora,rotulo='Todo o histórico';
 if(f.periodo==='ano'){de=f.ano+'-01';ate=f.ano===agora.slice(0,4)?agora:f.ano+'-12';rotulo=`Ano ${f.ano}`;}
 if(f.periodo==='seis'){ate=agora;de=deslocarMes(ate,-5);rotulo='Últimos 6 meses';}
 if(f.periodo==='mes'){de=ate=f.mes;rotulo=`Mês ${f.mes}`;}
 return {de,ate,meses:Math.max(1,indiceMes(ate)-indiceMes(de)+1),rotulo};
}
function filialAceita(r:RegistroAnalitico,f:string){if(!f)return true;if(normalizar(r.filiais.join(' / '))===normalizar(f))return true;if(f==='@matriz')return r.filiais.some(s=>normalizar(s)==='ANANINDEUA');if(f==='@regionais')return r.filiais.every(s=>!['ANANINDEUA','NAO INFORMADA','FILIAL NAO IDENTIFICADA'].includes(normalizar(s)));return r.filiais.some(s=>normalizar(s)===normalizar(f));}
function agrupar(rs:readonly RegistroAnalitico[],chave:(r:RegistroAnalitico)=>string,nome?:(id:string)=>string):Grupo[]{const map=new Map<string,Grupo>();for(const r of rs){const id=chave(r),v=map.get(id)||{id,nome:nome?.(id)||id,valor:0,registros:0};v.valor+=r.valor;v.registros++;map.set(id,v);}return [...map.values()].sort((a,b)=>b.valor-a.valor||a.nome.localeCompare(b.nome,'pt-BR'));}
export function analisar(dataset:DatasetAnalitico,f:FiltrosGlobais,d:FiltrosDetalhe,campanha:CampanhaId|''='',agora=mesAtual()):Analise {
 const escopo=dataset.registros.filter(r=>(!f.campanha||r.campanha===f.campanha)&&(!campanha||r.campanha===campanha));let intervalo=resolverIntervalo(escopo,f,agora);const mesLocal=d.competencia||(d.ciclo?d.ciclo.slice(0,7):'');if(mesLocal)intervalo={de:intervalo.de>mesLocal?intervalo.de:mesLocal,ate:intervalo.ate<mesLocal?intervalo.ate:mesLocal,meses:1,rotulo:`Mês ${mesLocal}`};
 const dimensoes=(r:RegistroAnalitico)=> (!f.campanha||r.campanha===f.campanha)&&(!campanha||r.campanha===campanha)&&filialAceita(r,f.filial)&&filialAceita(r,d.filial)&&(!d.cargo||r.cargo===d.cargo)&&(!d.ciclo||r.ciclo===d.ciclo)&&(!d.busca||normalizar(r.nome||'').includes(normalizar(d.busca)));
 const registros=dataset.registros.filter(r=>r.competencia>=intervalo.de&&r.competencia<=intervalo.ate&&dimensoes(r));
 const positivos=registros.filter(r=>r.valor>0),total=positivos.reduce((s,r)=>s+r.valor,0),naoIdentificado=positivos.filter(r=>r.agregado).reduce((s,r)=>s+r.valor,0);
 const anoComparavel=f.periodo==='ano'&&!mesLocal;const anteriorDe=anoComparavel?deslocarMes(intervalo.de,-12):deslocarMes(intervalo.de,-intervalo.meses),anteriorAte=anoComparavel?deslocarMes(intervalo.ate,-12):deslocarMes(intervalo.de,-1);
 const prev=dataset.registros.filter(r=>r.competencia>=anteriorDe&&r.competencia<=anteriorAte&&dimensoes(r));const totalAnterior=prev.reduce((s,r)=>s+r.valor,0);
 const pessoas=new Map<string,{nome:string;cargos:Set<string>;filiais:Set<string>;campanhas:Set<CampanhaId>;ciclos:Set<string>;valor:number}>();
 for(const r of positivos){if(!r.pessoaId||!r.nome)continue;const p=pessoas.get(r.pessoaId)||{nome:r.nome,cargos:new Set<string>(),filiais:new Set<string>(),campanhas:new Set<CampanhaId>(),ciclos:new Set<string>(),valor:0};p.cargos.add(r.cargo);r.filiais.forEach(s=>p.filiais.add(s));p.campanhas.add(r.campanha);p.ciclos.add(r.campanha+'|'+r.ciclo);p.valor+=r.valor;pessoas.set(r.pessoaId,p);}
 const ranking:PessoaRanking[]=[...pessoas.entries()].map(([id,p])=>({id,nome:p.nome,cargos:[...p.cargos],filiais:[...p.filiais],campanhas:[...p.campanhas],ciclos:p.ciclos.size,valor:p.valor,media:Math.round(p.valor/p.ciclos.size),posicao:0})).sort((a,b)=>b.valor-a.valor||a.nome.localeCompare(b.nome,'pt-BR'));ranking.forEach((p,i)=>p.posicao=i+1);
 const campanhasG=agrupar(positivos,r=>r.campanha,id=>campanhas().find(c=>c.id===id)?.nome||id);
 const porMes=new Map(agrupar(registros,r=>r.competencia).map(g=>[g.id,g]));const mensal:Grupo[]=[];for(let m=intervalo.de;m<=intervalo.ate;m=deslocarMes(m,1))mensal.push(porMes.get(m)||{id:m,nome:m,valor:0,registros:0});
 return {registros,intervalo,total,totalAnterior,variacao:totalAnterior>0?(total-totalAnterior)/totalAnterior*100:null,mediaMensal:Math.round(total/intervalo.meses),pessoas:ranking.length,ticket:naoIdentificado>0?null:ranking.length?Math.round(total/ranking.length):0,ticketIdentificado:ranking.length?Math.round((total-naoIdentificado)/ranking.length):0,naoIdentificado,ciclos:new Set(registros.map(r=>r.campanha+'|'+r.ciclo)).size,ranking,agregados:agrupar(positivos.filter(r=>r.agregado),r=>r.cargo+' · '+r.filiais.join(' / ')),campanhas:campanhasG,mensal,cargos:agrupar(positivos,r=>r.cargo),filiais:agrupar(positivos,r=>r.filiais.join(' / ')),porCiclo:agrupar(registros,r=>r.ciclo).sort((a,b)=>a.id.localeCompare(b.id)),lider:campanhasG[0]||null};
}
export const filtrosDetalheVazios=():FiltrosDetalhe=>({competencia:'',ciclo:'',cargo:'',filial:'',busca:''});
export function extratoPessoa(dataset:DatasetAnalitico,id:string,campanha:CampanhaId,recorte:readonly RegistroAnalitico[],completo:boolean){return (completo?dataset.registros:recorte).filter(r=>r.pessoaId===id&&r.campanha===campanha&&r.valor>0).sort((a,b)=>b.ciclo.localeCompare(a.ciclo));}
export function criarDemonstracaoAnalytics(base:BaseFinanceira='apurado',agora=mesAtual()):DatasetAnalitico {
 const primeiros=['Ana','Bruno','Carla','Daniel','Elisa','Felipe','Gabriela','Henrique','Isabela','João','Larissa','Marcos','Natália','Otávio','Paula','Rafael','Sabrina','Tiago','Vanessa','William'];const sobrenomes=['Almeida','Costa','Lima','Mendes'];const filiais=['Ananindeua','Macapá','São Luís','Cuiabá','Vilhena','Água Boa'];
 const cargos:Record<CampanhaId,string[]>={pix:['Consultor Técnico','Consultor Peças Balcão','Supervisor de Assistência','Gerente'],oficina:['Mecânico Produtivo','Mecânico Líder','Chefe de Oficina','Controlador'],garantia:['Analista de Garantia','Assistente de Garantia','Auxiliar de Garantia'],crm:['Consultor CRM','Supervisor CRM','Analista de Atendimento'],compras:['Analista de Compras','Supervisor de Compras'],apms:['APM','Vendedor','Gerente']};const registros:RegistroAnalitico[]=[];
 campanhas().forEach((c,ci)=>{for(let p=0;p<12;p++){const idx=ci*12+p,nome=primeiros[idx%20]+' '+sobrenomes[Math.floor(idx/20)];for(let m=0;m<6;m++)for(let w=1;w<=(c.id==='pix'?4:1);w++){const competencia=deslocarMes(agora,m-5),ciclo=c.id==='pix'?competencia+'|S'+w:competencia;const valor=(idx+m+w)%11===0||base==='pago'&&(idx+m)%3===0?0:(180+ci*130+p*37+m*29+w*11)*100;registros.push({id:`demo|${c.id}|${p}|${ciclo}`,campanha:c.id,competencia,ciclo,pessoaId:'demo:'+idx,nome,cargo:cargos[c.id][p%cargos[c.id].length],filiais:[filiais[p%filiais.length]],valor,origem:'Demonstração fictícia — não gravada',agregado:false,atualizado:''});}}});return {registros,fontes:campanhas().map(c=>({id:c.id,status:'ok',nota:'Demonstração fictícia — sem gravação no banco.'})),demo:true,atualizado:new Date().toISOString(),base};
}
