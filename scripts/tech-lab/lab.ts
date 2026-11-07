/** The Tech lab: the real Tech tab in headless Chromium, for layout audits and previews (#78).
 *  - techLabDesk: the "Full streaming company" test career's Tech desk (cached to a file when asked);
 *  - openTechLab: the tab at a phone width, with the game's fonts, the real CSS and a real desk.
 *  The page bundle is built once per run with esbuild (scripts/tech-lab/app.tsx). */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INITIAL_PLAYER, type Player, type StreamingTechId } from '../../types';
import { migratePlayerSave } from '../../services/saveMigration';
import { processGameWeek } from '../../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../../services/streamingFullPlatformQa';
import { getStreamingTechDesk, type StreamingTechDeskView } from '../../services/streamingTechDesk';

const playwrightPath = process.env.PLAYWRIGHT_MODULE
    || '/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const { chromium }: { chromium: any } = require(playwrightPath);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const esbuild: { buildSync: (options: Record<string, unknown>) => { outputFiles: Array<{ path: string; text: string }> } } = require(resolve('node_modules/esbuild'));

export const techLabPlayer = async (): Promise<Player> => {
    const fresh = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'tech-lab', name: 'Tech Lab', age: 15, currentWeek: 1 });
    const player = { ...fresh, energy: { current: 100, max: 100 }, flags: { ...fresh.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
    return buildStreamingFullPlatformQa(player, { processWeek: processGameWeek, persistWeek: async next => next });
};

/** The test company's desk; with a cache file, built once and read back after */
export const techLabDesk = async (cache?: string): Promise<StreamingTechDeskView> => {
    if (cache && existsSync(cache)) return JSON.parse(readFileSync(cache, 'utf8'));
    const desk = getStreamingTechDesk(await techLabPlayer());
    if (cache) writeFileSync(cache, JSON.stringify(desk));
    return desk;
};

let bundle: { js: string; css: string } | null = null;
const build = () => {
    if (bundle) return bundle;
    const result = esbuild.buildSync({
        entryPoints: [resolve('scripts/tech-lab/app.tsx')],
        bundle: true, write: false, outdir: '/tmp/ae-tech-lab', format: 'iife', platform: 'browser', target: 'es2022',
        define: { 'process.env.NODE_ENV': '"production"' }, loader: { '.csv': 'text' }, logLevel: 'error',
    });
    const file = (ext: string) => result.outputFiles.find(output => output.path.endsWith(ext))?.text || '';
    bundle = { js: file('.js'), css: file('.css') };
    return bundle;
};
const font = (family: string, weight: number, file: string) => `@font-face{font-family:'${family}';font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${readFileSync(resolve('public/assets/fonts', file)).toString('base64')}) format('woff2')}`;
let fonts = '';

/** The Tech tab at this width; focus opens it on a tech, as Go to Tech does; motion 'reduce' as a phone set to reduce motion */
export const openTechLab = async (browser: any, desk: StreamingTechDeskView, width: number, focus: StreamingTechId | null = null, height = 812,
    motion: 'reduce' | 'no-preference' = 'no-preference') => {
    const { js, css } = build();
    fonts ||= [font('Anton', 400, 'actor-empire-anton-400.woff2'), ...[500, 600, 700, 800].map(weight => font('Archivo', weight, `actor-empire-archivo-${weight}.woff2`))].join('');
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion: motion });
    const errors: string[] = [];
    page.on('pageerror', (error: Error) => errors.push(error.message));
    const data = JSON.stringify({ desk, focus }).replace(/</g, '\\u003c');
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${fonts}*{box-sizing:border-box;margin:0}html,body{background:#050609;color:#e8ecf3;font-family:'Archivo',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
button{font:inherit;color:inherit;background:none;border:0;padding:0;text-align:inherit;cursor:pointer}ol,ul{padding:0}${css}</style></head>
<body><div id="root"></div><script>window.__TECH_LAB__=${data}</script><script>${js}</script></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(80);
    if (errors.length) throw new Error(`The Tech lab page failed: ${errors.join(' | ')}`);
    return page;
};
