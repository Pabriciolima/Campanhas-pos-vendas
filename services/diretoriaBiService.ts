import {mapApmCampanhaToBi,demonstracaoApms,type ApmResumoRow} from './apmMapping';
import {perfilDiretoria,dadosDemonstracao} from '../diretoria/core.mjs';
export {mapApmCampanhaToBi} from './apmMapping';
type LocalResult={registros:any[];fontes:any[];atualizado:string;demo:boolean};
export interface ApmsGateway {lerResumo:(signal?:AbortSignal)=>Promise<ApmResumoRow[]>}
export async function carregarFonteApms(gateway:ApmsGateway,signal?:AbortSignal){
 try{
  const rows=await gateway.lerResumo(signal);const registros=rows.map(mapApmCampanhaToBi);
  return {registros,fonte:{id:'apms',status:'ok',nota:'Origem: Sistema APMs · conexão automática. Somente ganhos dos APMs; vendedor e gerente não incluídos.'}};
 }catch(e:any){if(signal?.aborted||e.name==='AbortError')throw e;return {registros:[],fonte:{id:'apms',status:'erro',nota:'Não foi possível atualizar os totais APMs. Tente novamente; nenhum valor fictício foi somado.'}};}
}
export async function carregarDiretoriaBi(carregarLocal:(signal:AbortSignal)=>Promise<LocalResult>,gateway:ApmsGateway,signal:AbortSignal){
 if(!perfilDiretoria((window as any).obterPerfilCampanhas?.()))throw Error('Perfil não autorizado.');
 const [local,apms]=await Promise.all([carregarLocal(signal),carregarFonteApms(gateway,signal)]);
 if(signal.aborted||!perfilDiretoria((window as any).obterPerfilCampanhas?.()))throw new DOMException('Consulta cancelada','AbortError');
 return {...local,registros:[...local.registros,...apms.registros],fontes:[...local.fontes,apms.fonte],atualizado:new Date().toISOString()};
}
export function demonstracaoDiretoria(){const local=dadosDemonstracao();return {...local,registros:[...local.registros.filter(r=>r.campanha!=='apms'),...demonstracaoApms()]};}
