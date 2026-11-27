import {build} from 'esbuild';
import {resolve} from 'node:path';
await build({entryPoints:[resolve('../components/diretoria/mount.tsx')],bundle:true,format:'esm',minify:true,target:'es2020',outfile:resolve('../assets/diretoria-bi.js'),legalComments:'linked',nodePaths:[resolve('node_modules')],define:{'process.env.NODE_ENV':'"production"'}});
