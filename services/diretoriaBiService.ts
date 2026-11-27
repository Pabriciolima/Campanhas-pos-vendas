import {mapApmCampanhaToBi,demonstracaoApms,type ApmCampanhaRow,type ApmBranch} from './apmMapping';
import {perfilDiretoria,dadosDemonstracao} from '../diretoria/core.mjs';
export {mapApmCampanhaToBi} from './apmMapping';
type LocalResult={registros:any[];fontes:any[];atualizado:string;demo:boolean};
export interface ApmsGateway {validarAdmin:(signal?:AbortSignal)=>Promise<void>;lerContratos:(signal?:AbortSignal)=>Promise<ApmCampanhaRow[]>;lerFiliais:(signal?:AbortSignal)=>Promise<ApmBranch[]>}
export async function carregarFonteApms(gateway:ApmsGateway,signal?:AbortSignal){
 try{
  await gateway.validarAdmin(signal);const [rows,branches]=await Promise.all([gateway.lerContratos(signal),gateway.lerFiliais(signal)]);
  const registros=rows.map(r=>mapApmCampanhaToBi(r,branches)).filter(Boolean);
  return {registros,fonte:{id:'apms',status:'ok',nota:'Origem: Sistema APMs · histórico completo autorizado. Bônus do APM + indicação + gerência, por contrato.'}};
 }catch(e:any){if(signal?.aborted||e.name==='AbortError')throw e;return {registros:[],fonte:{id:'apms',status:e.status===401||e.status===403?'protegido':'erro',nota:e.status===401?'Conecte uma conta administrativa do Sistema APMs para incluir todo o histórico.':e.status===403?'Esta conta não possui acesso administrativo à campanha APMs.':'Fonte APMs indisponível ou com dados incompatíveis. Atualize a conexão; nenhum valor fictício foi somado.'}};}
}
export async function carregarDiretoriaBi(carregarLocal:(signal:AbortSignal)=>Promise<LocalResult>,gateway:ApmsGateway,signal:AbortSignal){
 if(!perfilDiretoria((window as any).obterPerfilCampanhas?.()))throw Error('Perfil não autorizado.');
 const [local,apms]=await Promise.all([carregarLocal(signal),carregarFonteApms(gateway,signal)]);
 if(signal.aborted||!perfilDiretoria((window as any).obterPerfilCampanhas?.()))throw new DOMException('Consulta cancelada','AbortError');
 return {...local,registros:[...local.registros,...apms.registros],fontes:[...local.fontes,apms.fonte],atualizado:new Date().toISOString()};
}
export function demonstracaoDiretoria(){const local=dadosDemonstracao();return {...local,registros:[...local.registros.filter(r=>r.campanha!=='apms'),...demonstracaoApms()]};}
