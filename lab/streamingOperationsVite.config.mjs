/** Optional local QA server. Never loads real career storage. */
import {defineConfig} from 'vite';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const fixtureKeys={live:'STREAMING_OPERATIONS_LIVE_FIXTURE',prelaunch:'STREAMING_OPERATIONS_PRELAUNCH_FIXTURE','5000':'STREAMING_OPERATIONS_SCALE_FIXTURE'};
export default defineConfig({root,esbuild:{jsx:'automatic'},plugins:[{
 name:'disposable-streaming-operations-player',
 configureServer(server){server.middlewares.use((request,response,next)=>{
  const url=new URL(request.url||'/','http://localhost');
  if(url.pathname!=='/__operations-player')return next();
  response.setHeader('Cache-Control','no-store');
  if(request.method!=='GET'){response.statusCode=405;response.end('GET only');return;}
  const key=fixtureKeys[url.searchParams.get('case')||'live'];
  const path=key&&process.env[key];
  if(!path){response.statusCode=503;response.end('Set the explicit STREAMING_OPERATIONS_*_FIXTURE path for this disposable case.');return;}
  try{response.setHeader('Content-Type','application/json');response.end(readFileSync(path));}
  catch{response.statusCode=503;response.end('The configured disposable fixture is unavailable.');}
 });}
}],server:{host:'127.0.0.1',port:5176,strictPort:true}});
