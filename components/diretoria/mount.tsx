import React from 'react';
import {createRoot} from 'react-dom/client';
import BiInvestimentoCampanhas from './BiInvestimentoCampanhas';
export function montarDiretoria(host:HTMLElement,props:any){const root=createRoot(host);root.render(<BiInvestimentoCampanhas {...props}/>);return ()=>root.unmount();}
