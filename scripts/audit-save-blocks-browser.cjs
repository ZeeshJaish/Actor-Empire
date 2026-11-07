const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {buildSync}=require('esbuild');
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=path.resolve(process.env.SAVE_BLOCK_OUTPUT||'output/playwright/save-blocks');fs.mkdirSync(out,{recursive:true});
if(process.env.SAVE_BLOCK_FIXTURE_BUNDLE)fs.copyFileSync(process.env.SAVE_BLOCK_FIXTURE_BUNDLE,path.join(out,'fixture.bundle'));
else buildSync({entryPoints:['scripts/fixtures/saveBlocksBrowserFixture.ts'],bundle:true,platform:'browser',format:'esm',loader:{'.csv':'text','.css':'empty'},define:{'import.meta.env':'{}'},outfile:path.join(out,'fixture.bundle'),logLevel:'error'});
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?fs.readFileSync(path.join(out,'fixture.bundle')):'<!doctype html><script type="module" src="/fixture.js"></script>');});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));
if(process.env.SAVE_BLOCK_ENGINE==='system-webkit'){
 const {spawn}=require('node:child_process');const child=spawn('xcrun',['swift','-module-cache-path','/private/tmp/actor-save-storage-20261030/swift-cache','scripts/audit-save-blocks-webkit.swift','http://127.0.0.1:'+server.address().port+(process.env.SAVE_BLOCK_MODE==='production'?'':'/?blocks=1')],{stdio:['ignore','pipe','inherit']});let stdout='';child.stdout.on('data',part=>stdout+=part);const code=await new Promise(r=>child.on('close',r));server.close();if(code)throw Error('System WebKit audit exited '+code);const result=JSON.parse(stdout.trim());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(stdout);return;
}
const engine=process.env.SAVE_BLOCK_ENGINE==='webkit'?webkit:chromium;
const browser=await engine.launch({headless:true});try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+(process.env.SAVE_BLOCK_MODE==='production'?'':'/?blocks=1'));await page.waitForFunction(()=>!!window.saveBlocksQA);
const results=await page.evaluate(()=>window.saveBlocksQA.runChecks());assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({engine:process.env.SAVE_BLOCK_ENGINE||'chromium',results,pageErrors:errors},null,2));console.log(JSON.stringify({results,pageErrors:errors}));
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
