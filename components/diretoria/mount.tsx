import React from 'react';
import {createRoot} from 'react-dom/client';
import BiInvestimentoCampanhas from './BiInvestimentoCampanhas';
import {carregarDiretoriaBi} from '../../services/diretoriaBiService';
import {apmsGateway,conectarApms,desconectarApms,apmsConectado} from '../../services/apmsGateway';
export function montarDiretoria(host:HTMLElement,props:any){
 const root=createRoot(host);
 const carregar=(signal:AbortSignal)=>carregarDiretoriaBi(props.carregar,apmsGateway,signal);
 root.render(<BiInvestimentoCampanhas {...props} carregar={carregar} conectarApms={conectarApms} desconectarApms={desconectarApms} apmsConectado={apmsConectado}/>);
 return ()=>root.unmount();
}
