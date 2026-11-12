import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { lucideBuildImports } from './scripts/build/lucideImports.mjs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      build: { target: ['safari15', 'chrome80'] },
      /* Perf plan (2026-11-08): write the few non-English characters in the code as \u escapes. The
         bundle is almost all ASCII, but one Hindi word or emoji made the phone hold all 16 MB of it
         at two bytes a character; as ASCII the browser keeps it at one, about 16 MB less memory
         from start-up on. The file grows by about 0.1 MB and the game reads the same text. */
      esbuild: { charset: 'ascii' },
      /* Week Ahead (2026-11-12): its worker loads the game code only after the main thread's portraits arrive
         (services/weekAhead/weekAhead.worker.ts), so workers are built as modules that can load a chunk. */
      worker: { format: 'es' },
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), lucideBuildImports()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
