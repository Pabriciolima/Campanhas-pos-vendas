import {apmsConfig} from './apmsConfig';
import {perfilDiretoria} from '../diretoria/core.mjs';
import type {ApmsGateway} from './diretoriaBiService';
export const apmsGateway:ApmsGateway={async lerResumo(signal){
 if(!perfilDiretoria((window as any).obterPerfilCampanhas?.()))throw Error('Perfil não autorizado.');
 const rows=[];
 for(let offset=0;;offset+=500){
  const params=new URLSearchParams({select:'competencia,apm,apm_nome,filial_id,filial_nome,uf,contratos,valor_apm,data_inicio,atualizado_em',order:'competencia.asc,apm.asc,filial_id.asc',offset:String(offset),limit:'500'});
  const response=await fetch(apmsConfig.url+'/rest/v1/apms_diretoria_resumo?'+params,{headers:{apikey:apmsConfig.key,Authorization:'Bearer '+apmsConfig.key},signal,cache:'no-store'});
  if(!response.ok)throw Object.assign(Error('Não foi possível consultar os totais APMs.'),{status:response.status});
  const batch=await response.json();if(!Array.isArray(batch))throw Error('Resumo APMs inválido.');rows.push(...batch);if(batch.length<500)return rows;
 }
}};
