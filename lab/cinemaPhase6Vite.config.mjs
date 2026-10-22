import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
export default defineConfig({cacheDir:join('/private/tmp','actor-phase6-vite-'+Buffer.from(process.cwd()).toString('hex').slice(-24)),optimizeDeps:{entries:['cinema-phase6-qa.html']},plugins:[react(),{name:'authored-cinema-fixtures',configureServer(server){server.middlewares.use('/cinema-benchmark-fixture',async(req,res,next)=>{const name=(req.url||'').split('?')[0].replace(/^\//,'');if(!['early','late'].includes(name)){res.statusCode=404;res.end();return}try{res.setHeader('Content-Type','application/json');res.end(await readFile(join(process.env.CINEMA_BENCH_FIXTURES||'/private/tmp/actor-phase6-benchmark-fixtures',name+'.json')))}catch(e){res.statusCode=500;res.end(String(e))}})}}],server:{host:'127.0.0.1',strictPort:true},define:{'process.env.API_KEY':'undefined','process.env.GEMINI_API_KEY':'undefined'}});
