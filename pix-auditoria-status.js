// Bloqueio derivado da auditoria: nunca modifica os lançamentos financeiros gravados.
import {normalizarOcrPix,filialOcrPix} from './pix-auditoria-imagens-core.js?v=20261103-status2';
const pendencias=new Map();
const bruto=r=>({...r,...(r.auditoriaDados||{})});
export function chaveAuditoriaStatusPix(linha){const r=bruto(linha);return [r.competencia||r.origem,Number(String(r.semana).replace(/\D/g,'')),normalizarOcrPix(r.nome||r.colaborador),filialOcrPix(r.filial)].join('|');}
const assinatura=linha=>{const r=bruto(linha);return JSON.stringify(['metaSemanal','realizadoSemanal','ticketMedio','margem','realizadoNps','metaNps','osAbertaPercentual','cargo'].map(k=>r[k]??null));};
export function registrarAuditoriaStatusPix(linhas,resultado,atuais=linhas){let mudou=false;
 for(const r of linhas){const key=chaveAuditoriaStatusPix(r),atual=atuais.find(a=>chaveAuditoriaStatusPix(a)===key);if(!atual||assinatura(r)!==assinatura(atual))continue;
  const achados=resultado.divergencias.filter(a=>chaveAuditoriaStatusPix(a)===key),anterior=pendencias.get(key)||[];
  const check=resultado.checagens?.find(c=>chaveAuditoriaStatusPix(c)===key);
  const restantes=anterior.filter(a=>!check||!(check.campos.includes(a.campo)||(['semana','filial'].includes(a.campo)&&check.periodoValidado)));
  const porCampo=new Map(restantes.map(a=>[a.campo,a]));for(const a of achados)porCampo.set(a.campo,a);
  const proximas=[...porCampo.values()];
  if(JSON.stringify(anterior)!==JSON.stringify(proximas)){if(proximas.length)pendencias.set(key,proximas);else pendencias.delete(key);mudou=true;}

 }
 return mudou;
}
export function aplicarStatusAuditoriaPix(resultado){const achados=pendencias.get(chaveAuditoriaStatusPix(resultado));if(!achados?.length)return resultado;
 return {...resultado,status:'CORRIGIR PENDÊNCIA',auditoriaPendente:true,divergenciasEvidencia:achados,bonusFinalAntesAuditoria:resultado.bonusFinalAntesAuditoria??resultado.bonusFinal,bonusFinal:0,observacao:'Corrigir pendência nas evidências: '+achados.map(a=>a.ponto).join(' ')+' Bonificação retida até nova conferência sem estas divergências.'};
}
