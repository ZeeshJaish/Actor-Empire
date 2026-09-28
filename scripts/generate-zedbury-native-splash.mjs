import { copyFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
const mark = await readFile(path.join(root, 'public/assets/zedbury-mark.svg'), 'utf8');
const browser = await chromium.launch({ headless: true });

const android = [
  ['drawable/splash.png', 480, 320, 1],
  ['drawable-land-mdpi/splash.png', 480, 320, 1],
  ['drawable-land-hdpi/splash.png', 800, 480, 1.5],
  ['drawable-land-xhdpi/splash.png', 1280, 720, 2],
  ['drawable-land-xxhdpi/splash.png', 1600, 960, 3],
  ['drawable-land-xxxhdpi/splash.png', 1920, 1280, 4],
  ['drawable-port-mdpi/splash.png', 320, 480, 1],
  ['drawable-port-hdpi/splash.png', 480, 800, 1.5],
  ['drawable-port-xhdpi/splash.png', 720, 1280, 2],
  ['drawable-port-xxhdpi/splash.png', 960, 1600, 3],
  ['drawable-port-xxxhdpi/splash.png', 1280, 1920, 4],
];

async function renderSplash(relativePath, width, height, density, ios = false) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const markWidth = ios ? 1070 : Math.round(Math.min(width * .7, height * .42, 326 * density));
  const captionSize = ios ? 42 : Math.max(10, Math.round(10 * density));
  const gap = ios ? 116 : Math.round(34 * density);
  await page.setContent(`<!doctype html><html><head><style>
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#050505}
    main{position:relative;width:100vw;height:100vh;overflow:hidden;background:#050505}
    .mark{position:absolute;left:50%;top:calc(50% - ${ios ? 83 : Math.round(height * .03)}px);width:${markWidth}px;transform:translate(-50%,-50%)}
    svg{display:block;width:100%;height:auto}
    .caption{position:absolute;left:50%;top:calc(50% - ${ios ? 83 : Math.round(height * .03)}px + ${Math.round(markWidth * 1394 / 1500 / 2) + gap}px);transform:translateX(-50%);font:700 ${captionSize}px Arial,sans-serif;letter-spacing:.5em;text-indent:.5em;text-transform:uppercase;color:#efe9e3;white-space:nowrap}
  </style></head><body><main><div class="mark">${mark}</div><div class="caption">Presents</div></main></body></html>`);
  await page.screenshot({ path: path.join(root, relativePath), animations: 'disabled' });
  await page.close();
}

try {
  for (const [resource, width, height, density] of android) {
    await renderSplash(`android/app/src/main/res/${resource}`, width, height, density);
  }

  const iosSplash = 'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png';
  await renderSplash(iosSplash, 2732, 2732, 1, true);
  await copyFile(path.join(root, iosSplash), path.join(root, 'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png'));
  await copyFile(path.join(root, iosSplash), path.join(root, 'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png'));

  const page = await browser.newPage({ viewport: { width: 432, height: 432 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>*{box-sizing:border-box}html,body{margin:0;width:432px;height:432px;background:transparent}main{width:432px;height:432px;display:grid;place-items:center}svg{display:block;width:290px;height:auto}</style></head><body><main>${mark}</main></body></html>`);
  await page.screenshot({ path: path.join(root, 'android/app/src/main/res/drawable/zedbury_splash_icon.png'), omitBackground: true });
  await page.close();
  console.log('Generated exact Zedbury native splash resources.');
} finally {
  await browser.close();
}
