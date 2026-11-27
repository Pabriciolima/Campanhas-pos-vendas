import {supabase} from '../supabase-config.js';
import {autenticarModulo,chamarModulo} from '../modulos-edge.js';
import {apurarPessoa,chavePessoa} from '../garantia-dados.js?v=20261027-minimo80';
import {CAMPANHAS,registroFinanceiro} from './core.mjs';
import {lerTudo} from './pagination.mjs';
const financeiro=(id,rows,valor)=>rows.map((r,i)=>registroFinanceiro(id,r,valor(r),i)).filter(Boolean);
const raw=rows=>rows.map(r=>({...r.dados,id:r.id,competencia:r.competencia||r.dados?.competencia,filial:r.filial||r.dados?.filial,created_at:r.created_at||r.dados?.created_at,updated_at:r.updated_at||r.dados?.updated_at}));
async function calculador(nome){for(let t=0;t<80;t++){if(typeof window[nome]==='function')return window[nome];await new Promise(r=>setTimeout(r,100));}throw Error('Motor de cálculo indisponível. Atualize a página.');}
export async function carregarInvestimento(signal){
 const leitores={
  pix:async()=>{const rows=raw(await lerTudo(supabase,'pix_lancamentos',signal)),calc=await calculador('obterHistoricoDiretoriaPix');await window.recarregarNpsFilialPix?.();return financeiro('pix',await calc(rows),r=>r.bonusFinal);},
  oficina:async()=>{const rows=raw(await lerTudo(supabase,'produtivos_lancamentos',signal)),calc=await calculador('obterHistoricoDiretoriaOficina');return financeiro('oficina',await calc(rows),r=>r.bonusFinal);},
  crm:async()=>{const [ps,cs]=await Promise.all([lerTudo(supabase,'crm_participantes',signal),lerTudo(supabase,'crm_competencias',signal)]),calc=await calculador('obterHistoricoDiretoriaCRM');return financeiro('crm',calc(ps,cs),r=>r.total);},
  garantia:async()=>{await autenticarModulo('garantia');const {state}=await chamarModulo('garantia',{acao:'ler'});if(!state?.competencias)throw Error('Histórico de Garantia indisponível.');const rows=[];for(const [competencia,mes] of Object.entries(state.competencias))for(const p of mes.participantes||[]){const r=apurarPessoa(p,mes);if(r.total!==null&&r.status==='VALIDADO')rows.push({...p,...mes.validados?.[chavePessoa(p)],id:competencia+'|'+chavePessoa(p),competencia,total:r.total});}return financeiro('garantia',rows,r=>r.total);},
  compras:async()=>{await autenticarModulo('compras');const calc=await calculador('obterHistoricoDiretoriaCompras');return financeiro('compras',await calc(),r=>r.bonusTotal);}
 };
 const resultados=await Promise.allSettled(CAMPANHAS.map(async c=>({id:c.id,registros:await leitores[c.id]()})));
 if(signal?.aborted)throw new DOMException('Cancelado','AbortError');
 const registros=[],fontes=[];resultados.forEach((r,i)=>{const c=CAMPANHAS[i];if(r.status==='fulfilled'){registros.push(...r.value.registros);fontes.push({id:c.id,status:'ok',nota:c.id==='crm'?'Recalculado com os cadastros disponíveis.':c.id==='garantia'?'Apurações validadas do módulo.':'Motor oficial de apuração.'});}else fontes.push({id:c.id,status:r.reason?.status===401?'protegido':'erro',nota:r.reason?.status===401?'Entre no módulo com a senha já existente e atualize este painel.':'Não foi possível consultar esta campanha. Atualize para tentar novamente.'});});
 return {registros,fontes,atualizado:new Date().toISOString(),demo:false};
}
