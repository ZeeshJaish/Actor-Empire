import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
const lab = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({root:lab,publicDir:path.join(path.dirname(lab),'public'),resolve:{alias:{'@':path.dirname(lab)}},server:{host:'127.0.0.1',port:5196,strictPort:true,hmr:false,watch:null,fs:{allow:[path.dirname(lab)]}},define:{'process.env.API_KEY':'""','process.env.GEMINI_API_KEY':'""'}});
