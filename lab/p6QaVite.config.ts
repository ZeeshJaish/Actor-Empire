/** Disposable P6 browser journeys: keep unrelated workspace edits from
 * reloading an in-progress career. This config does not affect port 3000. */
import { defineConfig } from 'vite';
import baseConfig from '../vite.config';

export default defineConfig(async environment => {
  const base = await (typeof baseConfig === 'function' ? baseConfig(environment) : baseConfig);
  return { ...base, server: { ...base.server, hmr: false } };
});
