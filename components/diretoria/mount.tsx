import React from 'react';
import {createRoot} from 'react-dom/client';
import BiInvestimentoCampanhas from './BiInvestimentoCampanhas';
import {carregarDiretoriaBi} from '../../services/diretoriaBiService';
import {apmsGateway} from '../../services/apmsGateway';
export function montarDiretoria(host:HTMLElement,props:any){
 const root=createRoot(host);
 const carregar=(signal:AbortSignal)=>carregarDiretoriaBi(props.carregar,apmsGateway,signal);
 root.render(<BiInvestimentoCampanhas {...props} carregar={carregar}/>);
 return ()=>root.unmount();
}
