const { chromium } = require('/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const out = __dirname;
const source = 'views/mobile/components/StudioAcquisitionDealRoom.tsx';
const hash = () => crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
const before = hash();
const report = { kind: 'PRODUCTION_UI_SYNTHETIC_SAVE_WITH_BROWSER_ONLY_ANNOTATIONS', sourceBefore: before, errors: [], clips: [], screenshots: [] };

async function marks(page, items) {
  await page.evaluate(items => {
    document.querySelector('#warning-markers')?.remove();
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.id = 'warning-markers';
    svg.setAttribute('width', '448'); svg.setAttribute('height', '956');
    svg.setAttribute('viewBox', '0 0 448 956');
    Object.assign(svg.style, { position: 'fixed', inset: '0', zIndex: '10000', pointerEvents: 'none' });
    const node = (type, attrs, text) => { const el = document.createElementNS(ns, type); for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, String(v)); if (text) el.textContent = text; svg.appendChild(el); return el; };
    const defs = document.createElementNS(ns, 'defs');
    defs.innerHTML = '<marker id="warning-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="#4ee1ff"/></marker>';
    svg.appendChild(defs);
    for (const item of items) {
      const el = document.querySelector(item.selector);
      if (!el) throw new Error('Missing annotation target: ' + item.selector);
      const b = el.getBoundingClientRect();
      const box = item.strip ? { x: b.x-4, y: b.y+8, width: 12, height: b.height-16 } : { x:b.x-5,y:b.y-5,width:b.width+10,height:b.height+10 };
      node('rect', { ...box, rx: item.strip ? 3 : 9, fill:'none', stroke:'#4ee1ff', 'stroke-width':3 });
      const cx = item.cx, cy = Math.max(34, Math.min(870, item.cy ?? b.y-36));
      const fill = item.point === 'fill' ? el.firstElementChild.getBoundingClientRect() : null;
      const tx = item.strip ? b.x+2 : fill ? fill.x+fill.width*.5 : item.point === 'envelope' ? b.x+b.width*.2 : item.point === 'needle' ? b.x+b.width*.5 : b.x+b.width*.6;
      const ty = item.strip ? b.y+b.height*.5 : fill ? fill.y+fill.height*.5 : item.point === 'envelope' ? b.y+b.height*.25 : item.point === 'needle' ? b.y+b.height*.86 : b.y+b.height*.5;
      node('path', { d:`M${cx} ${cy+21} L${tx} ${ty}`, fill:'none', stroke:'#4ee1ff', 'stroke-width':3, 'marker-end':'url(#warning-arrow)' });
      node('circle', {cx,cy,r:23,fill:'#4ee1ff',stroke:'#061a24','stroke-width':3});
      node('text',{x:cx,y:cy+8,'text-anchor':'middle',fill:'#061a24','font-family':'Arial,sans-serif','font-size':25,'font-weight':900},String(item.n));
    }
    node('rect',{x:0,y:906,width:448,height:50,fill:'#092936'});
    node('text',{x:224,y:927,'text-anchor':'middle',fill:'#a5f3fc','font-family':'Arial,sans-serif','font-size':11,'font-weight':700},'CURRENT UI · DEMO SAVE · CYAN MARKERS ADDED');
    node('text',{x:224,y:945,'text-anchor':'middle',fill:'#ffffff','font-family':'Arial,sans-serif','font-size':10},'Original game styling and animations are unchanged');
    document.body.appendChild(svg);
  }, items);
}
const clear = page => page.evaluate(() => document.querySelector('#warning-markers')?.remove());
async function shot(page, name, clip) { const file=path.join(out,name); await page.screenshot({path:file,...clip?{clip}:{}}); report.screenshots.push(file); console.log('SCREENSHOT',name); }

(async()=>{
  const browser = await chromium.launch({headless:true});
  const started=Date.now();
  const context = await browser.newContext({viewport:{width:448,height:956},recordVideo:{dir:path.join(out,'raw-video'),size:{width:448,height:956}}});
  const page=await context.newPage(); page.setDefaultTimeout(60000); page.on('pageerror',e=>report.errors.push(e.message));
  const t=()=> (Date.now()-started)/1000;
  const b=name=>page.getByRole('button',{name,exact:true});
  try {
    await page.goto('http://127.0.0.1:5198/stockForbesRoutes.html?scenario=tender&studio=PARAMOUNT');
    await page.waitForLoadState('networkidle');
    await page.getByText('Forbes',{exact:true}).click(); await b('Studios').click();
    await page.getByText('Paramount Pictures',{exact:true}).first().click();
    await b('Open Public Tender').click();
    await page.getByRole('button',{name:/Run Due Diligence/}).click();
    await page.locator('.sa-sheet').getByRole('button').filter({hasText:/Personal Wealth/}).click();
    await page.getByRole('button',{name:/Open the War Room/}).click();
    await page.locator('.sa-gauge').scrollIntoViewIfNeeded();
    const gaugeBox=await page.locator('.sa-gauge svg').boundingBox();
    await marks(page,[{n:2,selector:'.sa-gauge svg',point:'needle',cx:374,cy:gaugeBox.y+15}]);
    const gaugeStart=t();
    await page.getByRole('button',{name:/Conservative.*88%/}).click(); await page.waitForTimeout(900);
    await page.getByRole('button',{name:/Aggressive.*115%/}).click(); await page.waitForTimeout(900);
    await shot(page,'02-gauge-needle.png'); await shot(page,'02-gauge-focus.png',{x:24,y:395,width:400,height:410});report.clips.push({name:'2 · Gauge needle bounce',start:gaugeStart,end:t()});
    await clear(page);
    await page.locator('.sa-vault').filter({hasText:/Personal Wealth/}).click();
    await page.getByRole('button',{name:/File the Offer with the Board/}).click();
    await page.locator('.sa-env-stage').waitFor();
    const envelopeStart=t();
    await marks(page,[{n:3,selector:'.sa-env-envelope',point:'envelope',cx:374,cy:300}]);
    await page.locator('.sa-env-envelope.up').waitFor(); await page.waitForTimeout(620);
    await marks(page,[{n:3,selector:'.sa-env-envelope',point:'envelope',cx:374,cy:300}]);
    await shot(page,'03-envelope.png');await shot(page,'03-envelope-focus.png',{x:0,y:260,width:448,height:380});report.clips.push({name:'3 · Envelope entrance bounce',start:envelopeStart,end:t()});
    await page.waitForTimeout(1000); await clear(page);
    await b('Advance Real Week').click();
    await page.getByRole('button',{name:'Review the Board Decision',exact:true}).waitFor();
    const feedStart=t();
    await marks(page,[{n:1,selector:'.sa-feed-card.press',strip:true,cx:50,cy:206},{n:4,selector:'.sa-feed-card.x',cx:386,cy:400}]);
    await page.waitForTimeout(3800);
    const card=await page.locator('.sa-feed-card.x').first().boundingBox();
    await marks(page,[{n:1,selector:'.sa-feed-card.press',strip:true,cx:48,cy:202},{n:4,selector:'.sa-feed-card.x',cx:386,cy:card.y+card.height+32}]);
    await shot(page,'01-and-04-news-cards.png');await shot(page,'01-and-04-news-focus.png',{x:16,y:165,width:416,height:605});report.clips.push({name:'1 + 4 · Red border and card bounce',start:feedStart,end:t()});
    await clear(page); await b('Review the Board Decision').click();
    await page.getByRole('button',{name:/Proceed to Closing/}).click();
    for(const doc of await page.locator('.sa-closedoc').all())await doc.click();
    await page.getByRole('button',{name:/Enter the Signing Room/}).click();
    const meter=await page.locator('.sa-meter-track').boundingBox();
    await marks(page,[{n:5,selector:'.sa-meter-track',point:'fill',cx:380,cy:meter.y+94}]);
    const meterStart=t(); await page.waitForTimeout(800);
    await page.getByRole('button',{name:/Confirm Clause.*Next/}).click(); await page.waitForTimeout(800);
    await shot(page,'05-progress-bar.png');await shot(page,'05-progress-focus.png',{x:8,y:70,width:432,height:390});
    await page.getByRole('button',{name:/Confirm Clause.*Next/}).click();await page.waitForTimeout(800);
    report.clips.push({name:'5 · Progress width animation',start:meterStart,end:t()});
    report.status='PASSED';
  } catch(error) { report.status='FAILED'; report.failure=String(error);report.body=(await page.locator('body').innerText()).slice(-5000);await page.screenshot({path:path.join(out,'capture-failure.png')});throw error; }
  finally {
    const video=page.video(); await context.close(); if(video)await video.saveAs(path.join(out,'current-ui-animations.webm'));
    await browser.close();report.sourceAfter=hash();report.productionSourceUnchanged=report.sourceAfter===before;
    fs.writeFileSync(path.join(out,'capture-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,images:report.screenshots.length,sourceUnchanged:report.productionSourceUnchanged,errors:report.errors}));
  }
})().catch(e=>{console.error(e);process.exitCode=1});
