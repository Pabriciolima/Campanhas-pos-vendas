// Pagamento depende de evidência nominal conferida; a ausência nunca libera valores.
import {normalizarOcrPix,filialOcrPix} from './pix-auditoria-imagens-core.js?v=20261103-evidencia3';
const estados=new Map();
const bruto=r=>({...r,...(r.auditoriaDados||{})});
export function chaveAuditoriaStatusPix(linha){const r=bruto(linha);return [r.competencia||r.origem,Number(String(r.semana).replace(/\D/g,'')),normalizarOcrPix(r.nome||r.colaborador),filialOcrPix(r.filial)].join('|');}
const assinatura=linha=>{const r=bruto(linha);return JSON.stringify(['metaSemanal','realizadoSemanal','ticketMedio','margem','realizadoNps','metaNps','osAbertaPercentual','cargo'].map(k=>r[k]??null));};
export function registrarAuditoriaStatusPix(linhas,resultado,atuais=linhas){let mudou=false;
 for(const r of linhas){const key=chaveAuditoriaStatusPix(r),atual=atuais.find(a=>chaveAuditoriaStatusPix(a)===key);if(!atual||assinatura(r)!==assinatura(atual))continue;
  const divergencias=resultado.divergencias.filter(a=>chaveAuditoriaStatusPix(a)===key);
  const check=resultado.checagens?.find(c=>chaveAuditoriaStatusPix(c)===key);
  const revisoes=(resultado.revisoes||[]).filter(c=>chaveAuditoriaStatusPix(c)===key);
  const novo={assinatura:assinatura(r),validada:check?.evidenciaNominalValidada===true&&divergencias.length===0,divergencias,motivos:revisoes.map(a=>a.motivo)};
  if(JSON.stringify(estados.get(key))!==JSON.stringify(novo)){estados.set(key,novo);mudou=true;}
 }
 return mudou;
}
export function invalidarEvidenciasStatusPix(contexto={}){let mudou=false;
 for(const [key] of estados){const [cp,sw,,filial]=key.split('|');if((!contexto.competencia||cp===contexto.competencia)&&(!contexto.semana||Number(sw)===Number(String(contexto.semana).replace(/\D/g,'')))&&(!contexto.filial||filial===filialOcrPix(contexto.filial))){estados.delete(key);mudou=true;}}
 return mudou;
}
export function aplicarStatusAuditoriaPix(resultado){
 // Idempotência: snapshots já retidos não apagam a elegibilidade/valor da política.
 const base=resultado.auditoriaPendente?{...resultado,status:resultado.statusAntesAuditoria||'NÃO HABILITADO',bonusFinal:resultado.bonusFinalAntesAuditoria??0,observacao:resultado.observacaoAntesAuditoria||''}:resultado;
 const estado=estados.get(chaveAuditoriaStatusPix(base));
 if(estado?.validada&&estado.assinatura===assinatura(base))return {...base,auditoriaPendente:false,evidenciaNominalValidada:true,divergenciasEvidencia:[]};
 const divergencias=estado?.divergencias||[],corrigir=divergencias.length>0;
 return {...base,statusAntesAuditoria:base.status,observacaoAntesAuditoria:base.observacao,bonusFinalAntesAuditoria:base.bonusFinal,bonusFinal:0,auditoriaPendente:true,evidenciaNominalValidada:false,divergenciasEvidencia:divergencias,status:corrigir?'CORRIGIR PENDÊNCIA':'PENDENTE DE PAGAMENTO',observacao:corrigir?'Corrigir pendência nas evidências: '+divergencias.map(a=>a.ponto).join(' '):'Anexar evidência legível com o nome completo deste colaborador, na mesma competência, semana e filial, e conferir os indicadores. '+(estado?.motivos?.join(' ')||'Pagamento retido até a conferência da evidência nominal.')};
}
